// app/api/sessions/screenshot-upload/route.ts
// Receives a PNG screenshot from the desktop daemon (chief-screenshot.py),
// uploads it to the "session-screenshots" Supabase Storage bucket, and
// inserts a row in sim_session_screenshots so the session page can render it.
//
// Multipart fields:
//   file:         the PNG binary
//   vendor:       'simucube' | 'simpro' | 'iracing' | 'coach_dave' | 'generic'
//   window_title: original window title (debug only)
//   email:        user identity (daemon path — no cookie auth)
//   session_id:   optional — desktop daemon doesn't always know it,
//                 API will auto-match by user_id + recent session if absent

import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import crypto from 'crypto'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  try {
    const form = await req.formData()
    const file = form.get('file') as File | null
    const vendor = ((form.get('vendor') as string | null) || 'generic').toLowerCase()
    const windowTitle = (form.get('window_title') as string | null) || ''
    const email = ((form.get('email') as string | null) || '').toLowerCase().trim()
    const sessionIdRaw = (form.get('session_id') as string | null) || ''

    if (!file) return NextResponse.json({ error: 'missing file' }, { status: 400 })

    let userId: string | null = null
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (user?.id) userId = user.id
    } catch {}

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const svc = createServiceClient(url, serviceKey)

    if (!userId && email) {
      const { data } = await svc.from('profiles').select('id').eq('email', email).maybeSingle()
      if (data?.id) userId = data.id
    }
    if (!userId && email) {
      try {
        const { data: lu } = await (svc as any).auth.admin.listUsers({ page: 1, perPage: 1000 })
        const u = (lu?.users || []).find((u: any) => (u.email || '').toLowerCase() === email)
        if (u?.id) userId = u.id
      } catch {}
    }
    if (!userId) {
      const { data } = await svc.from('profiles').select('id').eq('access_level', 'admin').limit(2)
      if (data?.length === 1) userId = data[0].id
    }
    if (!userId) return NextResponse.json({ error: 'no user resolved' }, { status: 400 })

    // Find a session to attach to if the daemon didn't provide one
    let sessionId: string | null = sessionIdRaw && sessionIdRaw.length === 36 ? sessionIdRaw : null
    if (!sessionId) {
      const fourHoursAgo = new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString()
      const { data: sess } = await svc.from('sim_session_captures')
        .select('id').eq('user_id', userId).gte('started_at', fourHoursAgo)
        .order('started_at', { ascending: false }).limit(1).maybeSingle()
      if (sess?.id) sessionId = sess.id
    }

    const bytes = Buffer.from(await file.arrayBuffer())
    const sha = crypto.createHash('sha1').update(bytes).digest('hex').slice(0, 12)
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    const filename = `${ts}__${vendor}__${sha}.png`
    const storagePath = `${userId}/${filename}`

    const { error: upErr } = await svc.storage.from('session-screenshots')
      .upload(storagePath, bytes, { contentType: 'image/png', upsert: false })
    if (upErr) return NextResponse.json({ error: `storage upload: ${upErr.message}` }, { status: 500 })

    const { data: row, error: insErr } = await svc.from('sim_session_screenshots').insert({
      user_id: userId,
      session_id: sessionId,
      vendor,
      window_title: windowTitle.slice(0, 200) || null,
      storage_path: storagePath,
      file_size: bytes.length,
    }).select('id').single()
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 })

    return NextResponse.json({ ok: true, screenshotId: row?.id, sessionId, storagePath })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  })
}
