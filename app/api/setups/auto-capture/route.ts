// app/api/setups/auto-capture/route.ts
// Receives parsed Coach Dave (or any iRacing) setup files from the desktop
// daemon and upserts into sim_setups_parsed. Mirrors the auto-capture auth
// pattern: cookie → profiles.email → auth.users → single-admin.
//
// Expected POST body:
//   {
//     email, daemon_email,
//     filename: "CDA 26S1 LMST KERN R01.sto",
//     season, car_code, car_name, track_code, track_name, session_type, version,
//     params: { camber_lf: -3.2, tire_pressure_lf: 22.5, ... },
//     parse_score: 0.6
//   }

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function sanitize(obj: any): any {
  if (typeof obj === 'string') {
    let out = ''
    for (const ch of obj) {
      const code = ch.charCodeAt(0)
      if (ch === '\t' || ch === '\n' || ch === '\r' || code >= 0x20) out += ch
    }
    return out
  }
  if (Array.isArray(obj)) return obj.map(sanitize)
  if (obj && typeof obj === 'object') {
    const out: any = {}
    for (const k of Object.keys(obj)) out[k] = sanitize(obj[k])
    return out
  }
  return obj
}

export async function POST(req: Request) {
  try {
    const body = sanitize(await req.json())
    let userId: string | null = null

    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (user?.id) userId = user.id
    } catch {}

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const svc = createServiceClient(url, serviceKey)

    const lookupEmail = (body.email || body.daemon_email || '').toLowerCase().trim()
    const attempts: string[] = []
    if (!userId) {
      if (lookupEmail) {
        const { data } = await svc.from('profiles').select('id').eq('email', lookupEmail).maybeSingle()
        if (data?.id) { userId = data.id; attempts.push(`profiles.email matched`) }
      }
      if (!userId && lookupEmail) {
        try {
          const { data: lu } = await (svc as any).auth.admin.listUsers({ page: 1, perPage: 1000 })
          const u = (lu?.users || []).find((u: any) => (u.email || '').toLowerCase() === lookupEmail)
          if (u?.id) { userId = u.id; attempts.push(`auth.users matched`) }
        } catch {}
      }
      if (!userId) {
        const { data } = await svc.from('profiles').select('id').eq('access_level', 'admin').limit(2)
        if (data?.length === 1) { userId = data[0].id; attempts.push(`single-admin matched`) }
      }
    }
    if (!userId) return NextResponse.json({ error: 'no user resolved', attempts }, { status: 400 })

    if (!body.filename) return NextResponse.json({ error: 'missing filename' }, { status: 400 })

    const { data, error } = await svc
      .from('sim_setups_parsed')
      .upsert({
        user_id:      userId,
        filename:     body.filename,
        source:       body.source || 'coach-dave',
        season:       body.season || null,
        car_code:     body.car_code || null,
        car_name:     body.car_name || null,
        track_code:   body.track_code || null,
        track_name:   body.track_name || null,
        session_type: body.session_type || null,
        version:      body.version ?? null,
        params:       body.params || {},
        parse_score:  body.parse_score ?? null,
        ts:           body.ts ? new Date(body.ts).toISOString() : new Date().toISOString(),
      }, { onConflict: 'user_id,filename' })
      .select('id')
      .single()
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, setupId: data?.id, userId })
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
