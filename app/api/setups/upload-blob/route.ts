// app/api/setups/upload-blob/route.ts
// Receives a raw .sto file from the desktop daemon (multipart upload),
// resolves the user, writes the bytes to the setup-files bucket at
//   setup-files/<user_id>/<filename>
// and updates sim_setups_parsed.storage_path on the matching row.
//
// Accepts:
//   multipart/form-data with fields:
//     file:     the .sto binary
//     filename: original filename (e.g. "CDA 26S1 LMST KERN R01.sto")
//     email:    user lookup email
//     sha1:     optional client-side hash for dedupe
//
// Returns: { ok, storagePath, signedUrl }

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
    const filename = (form.get('filename') as string | null) || ''
    const email = ((form.get('email') as string | null) || '').toLowerCase().trim()
    const claimedSha1 = (form.get('sha1') as string | null) || ''
    if (!file)     return NextResponse.json({ error: 'missing file' }, { status: 400 })
    if (!filename) return NextResponse.json({ error: 'missing filename' }, { status: 400 })

    // Resolve user (cookie / email / single-admin) — same pattern as other routes
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

    const bytes = Buffer.from(await file.arrayBuffer())
    const sha1 = crypto.createHash('sha1').update(bytes).digest('hex')
    if (claimedSha1 && claimedSha1 !== sha1) {
      // Client-side hash mismatch — non-fatal, just note it
    }
    const storagePath = `${userId}/${filename}`

    const { error: upErr } = await svc.storage
      .from('setup-files')
      .upload(storagePath, bytes, {
        contentType: 'application/octet-stream',
        upsert: true,
      })
    if (upErr) return NextResponse.json({ error: `storage upload: ${upErr.message}` }, { status: 500 })

    // Update the parsed row (if it exists) with the storage path / size / sha1
    await svc.from('sim_setups_parsed')
      .update({ storage_path: storagePath, file_size: bytes.length, file_sha1: sha1 })
      .eq('user_id', userId)
      .eq('filename', filename)

    // Signed URL (7 days) so the dashboard can render a download link
    const { data: signed } = await svc.storage
      .from('setup-files')
      .createSignedUrl(storagePath, 60 * 60 * 24 * 7)

    return NextResponse.json({
      ok: true,
      storagePath,
      size: bytes.length,
      sha1,
      signedUrl: signed?.signedUrl || null,
    })
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
