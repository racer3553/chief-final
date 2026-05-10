// chief-final/app/api/sessions/auto-capture/route.ts
// Daemon has NO browser cookies. Must look up user via email + service role.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

function detectedVendors(hwScan: any): string[] {
  if (!hwScan) return []
  const found: string[] = []
  for (const cat of ['wheels', 'pedals', 'motion', 'sim', 'coach']) {
    const c = hwScan[cat] || {}
    for (const [vendor, info] of Object.entries(c)) {
      if ((info as any)?.detected) found.push(vendor)
    }
  }
  return found
}

export async function POST(req: Request) {
  try {
    const session = await req.json()
    let userId: string | null = null

    // Try cookie-based auth first (browser)
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (user?.id) userId = user.id
    } catch {}

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
    const svc = createServiceClient(url, serviceKey)

    // Daemon path: look up user by email or fall back to single admin
    const lookupEmail = (session.email || session.daemon_email || '').toLowerCase().trim()
    const resolveAttempts: string[] = []
    if (!userId) {
      // 1. profiles.email lookup
      if (lookupEmail) {
        const { data, error } = await svc.from('profiles').select('id').eq('email', lookupEmail).maybeSingle()
        if (error) resolveAttempts.push(`profiles.email: ${error.message}`)
        if (data?.id) { userId = data.id; resolveAttempts.push(`profiles.email matched ${data.id}`) }
        else resolveAttempts.push('profiles.email: no row')
      }
      // 2. auth.users lookup via admin API — works even if profiles.email is null
      if (!userId && lookupEmail) {
        try {
          // listUsers paginates; with our scale a single page is fine
          const { data: lu, error: luErr } = await (svc as any).auth.admin.listUsers({ page: 1, perPage: 1000 })
          if (luErr) resolveAttempts.push(`auth.listUsers: ${luErr.message}`)
          const u = (lu?.users || []).find((u: any) => (u.email || '').toLowerCase() === lookupEmail)
          if (u?.id) { userId = u.id; resolveAttempts.push(`auth.users matched ${u.id}`) }
          else resolveAttempts.push('auth.users: no match')
        } catch (e: any) {
          resolveAttempts.push(`auth.listUsers exception: ${e.message}`)
        }
      }
      // 3. single-admin fallback
      if (!userId) {
        const { data, error } = await svc.from('profiles').select('id').eq('access_level', 'admin').limit(2)
        if (error) resolveAttempts.push(`profiles.admin: ${error.message}`)
        if (data?.length === 1) { userId = data[0].id; resolveAttempts.push(`single-admin matched ${data[0].id}`) }
        else resolveAttempts.push(`profiles.admin: ${data?.length || 0} rows`)
      }
    }

    if (!userId) {
      return NextResponse.json({
        error: 'no user resolved',
        lookupEmail,
        attempts: resolveAttempts,
      }, { status: 400 })
    }

    const detected = detectedVendors(session.hardware_scan)
    const hw = session.hardware_scan || {}
    const activeWheel = Object.entries(hw.wheels || {}).find(([_, v]: any) => v?.detected) as any
    const activePedals = Object.entries(hw.pedals || {}).find(([_, v]: any) => v?.detected) as any

    const { data, error } = await svc
      .from('sim_session_captures')
      .insert({
        user_id: userId,
        sim_name: 'iRacing',
        car_name: session.car,
        track_name: session.track,
        layout_name: session.track_layout,
        session_type: session.session_type,
        weather_json: session.weather,
        wheelbase_settings_json: activeWheel ? { vendor: activeWheel[0], data: activeWheel[1] } : null,
        wheel_settings_json: activeWheel ? { vendor: activeWheel[0], profile: (activeWheel[1] as any)?.active_profile } : null,
        pedal_settings_json: activePedals ? { vendor: activePedals[0], data: activePedals[1] } : null,
        iracing_settings_json: hw.sim?.iracing || null,
        coach_dave_data: hw.coach?.coach_dave || null,
        started_at: session.started_at,
        ended_at: session.ended_at,
        best_lap_time: session.best_lap_time,
        best_lap_number: session.best_lap_number,
        total_laps: session.laps?.length || 0,
        incidents: session.incidents || 0,
        laps_data: session.laps,
        hardware_scan: session.hardware_scan,
        hardware_scan_end: session.hardware_scan_end,
        detected_vendors: detected,
        source: 'auto-capture-desktop',
        raw: session,
      })
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
    return NextResponse.json({ ok: true, sessionId: data?.id, userId, detected })
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
