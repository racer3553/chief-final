// app/api/sessions/[id]/screenshots/route.ts
// Returns the screenshots attached to a session, each with a short-lived
// signed URL so the dashboard can render thumbnails directly from Supabase Storage.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function GET(req: Request, ctx: { params: { id: string } }) {
  try {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const sessionId = ctx.params.id

    // Pull screenshots linked to this session OR (fallback) screenshots
    // from the same time window if session linking failed at upload time.
    let { data: shots } = await sb.from('sim_session_screenshots')
      .select('id, vendor, window_title, storage_path, file_size, parsed_data, taken_at')
      .eq('user_id', user.id)
      .eq('session_id', sessionId)
      .order('taken_at', { ascending: false })

    if (!shots || shots.length === 0) {
      // Fallback: any screenshots from a ±2-hour window around the session
      const { data: session } = await sb.from('sim_session_captures')
        .select('started_at, ended_at').eq('id', sessionId).maybeSingle()
      if (session?.started_at) {
        const start = new Date(new Date(session.started_at).getTime() - 2 * 60 * 60 * 1000).toISOString()
        const end = new Date(new Date(session.ended_at || session.started_at).getTime() + 2 * 60 * 60 * 1000).toISOString()
        const { data: fb } = await sb.from('sim_session_screenshots')
          .select('id, vendor, window_title, storage_path, file_size, parsed_data, taken_at')
          .eq('user_id', user.id)
          .gte('taken_at', start).lte('taken_at', end)
          .order('taken_at', { ascending: false })
        shots = fb || []
      }
    }

    // Generate signed URLs (10 min expiry) for each via service role so the
    // browser can <img src=...> them directly.
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const svc = createServiceClient(url, serviceKey)

    const enriched = await Promise.all((shots || []).map(async (s) => {
      // Defense-in-depth: only sign paths under the user's folder
      if (!s.storage_path.startsWith(user.id + '/')) return null
      const { data: signed } = await svc.storage.from('session-screenshots')
        .createSignedUrl(s.storage_path, 60 * 10)
      return { ...s, signed_url: signed?.signedUrl || null }
    }))

    return NextResponse.json({ ok: true, screenshots: enriched.filter(Boolean) })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
