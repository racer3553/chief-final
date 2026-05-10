// app/api/sessions/auto-capture-trace/route.ts
// Receives a single lap's full telemetry trace from the desktop daemon and
// stores it in public.sim_lap_traces. Mirrors the auth pattern of
// /api/sessions/auto-capture: cookie auth first, then email lookup, then
// auth.users fallback, then single-admin fallback.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function sanitize(obj: any): any {
  // Strip null bytes / control chars that Postgres jsonb rejects.
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
    const body = await req.json()
    const trace = sanitize(body)
    let userId: string | null = null

    // 1. Cookie auth (browser-originated requests)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (user?.id) userId = user.id
    } catch {}

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const svc = createServiceClient(url, serviceKey)

    // 2. Daemon path: email lookup → auth.users fallback → single admin
    const lookupEmail = (trace.email || trace.daemon_email || '').toLowerCase().trim()
    const attempts: string[] = []
    if (!userId) {
      if (lookupEmail) {
        const { data, error } = await svc.from('profiles').select('id').eq('email', lookupEmail).maybeSingle()
        if (error) attempts.push(`profiles.email: ${error.message}`)
        if (data?.id) { userId = data.id; attempts.push(`profiles.email matched ${data.id}`) }
      }
      if (!userId && lookupEmail) {
        try {
          const { data: lu } = await (svc as any).auth.admin.listUsers({ page: 1, perPage: 1000 })
          const u = (lu?.users || []).find((u: any) => (u.email || '').toLowerCase() === lookupEmail)
          if (u?.id) { userId = u.id; attempts.push(`auth.users matched ${u.id}`) }
        } catch (e: any) {
          attempts.push(`auth.listUsers: ${e.message}`)
        }
      }
      if (!userId) {
        const { data } = await svc.from('profiles').select('id').eq('access_level', 'admin').limit(2)
        if (data?.length === 1) { userId = data[0].id; attempts.push(`single-admin matched ${data[0].id}`) }
      }
    }

    if (!userId) {
      return NextResponse.json({ error: 'no user resolved', lookupEmail, attempts }, { status: 400 })
    }

    // 3. Try to attach to an existing session by matching car+track+time window.
    // The desktop daemon writes session captures first; traces follow within
    // a few seconds. We look for the most recent session for this user where
    // car/track match and ts is within 8 hours.
    let sessionId: string | null = null
    if (trace.track && trace.car) {
      const eightHoursAgo = new Date(Date.now() - 8 * 60 * 60 * 1000).toISOString()
      const { data: sess } = await svc
        .from('sim_session_captures')
        .select('id')
        .eq('user_id', userId)
        .eq('car_name', trace.car)
        .eq('track_name', trace.track)
        .gte('started_at', eightHoursAgo)
        .order('started_at', { ascending: false })
        .limit(1)
        .maybeSingle()
      if (sess?.id) sessionId = sess.id
    }

    const { data, error } = await svc
      .from('sim_lap_traces')
      .insert({
        user_id: userId,
        session_id: sessionId,
        lap_number: trace.lap ?? null,
        lap_time: trace.lap_time ?? null,
        track: trace.track ?? null,
        track_config: trace.track_config ?? null,
        car: trace.car ?? null,
        samples: trace.samples || [],
        ts: trace.ts ? new Date(trace.ts).toISOString() : new Date().toISOString(),
        source: 'auto-capture-desktop',
      })
      .select('id, session_id')
      .single()

    if (error) {
      return NextResponse.json({ error: error.message, attempts }, { status: 500 })
    }

    return NextResponse.json({
      ok: true,
      traceId: data?.id,
      sessionId: data?.session_id,
      userId,
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
