// app/api/setups/download-url/route.ts
// Returns a short-lived signed download URL for a setup file the user owns.
// Browser calls this from the /dashboard/setups page when the user clicks Download.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export async function GET(req: Request) {
  try {
    const url = new URL(req.url)
    const filename = url.searchParams.get('filename') || ''
    if (!filename) return NextResponse.json({ error: 'missing filename' }, { status: 400 })

    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    // Look up the storage_path for this user+filename
    const { data: row } = await sb.from('sim_setups_parsed')
      .select('storage_path, filename')
      .eq('user_id', user.id)
      .eq('filename', filename)
      .maybeSingle()
    if (!row?.storage_path) return NextResponse.json({ error: 'not found' }, { status: 404 })

    // Use service role to sign — RLS on storage.objects already restricts to the user
    const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const svc = createServiceClient(supaUrl, serviceKey)

    // Sanity: only sign paths that start with the user's id (defense in depth)
    if (!row.storage_path.startsWith(user.id + '/')) {
      return NextResponse.json({ error: 'forbidden' }, { status: 403 })
    }

    const { data, error } = await svc.storage
      .from('setup-files')
      .createSignedUrl(row.storage_path, 60 * 5)   // 5-minute signed URL
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, url: data?.signedUrl, filename: row.filename })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
