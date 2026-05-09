// chief-final/app/api/sessions/auto-capture/route.ts
// Universal session capture - accepts any vendor hardware data
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

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
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()

    const detected = detectedVendors(session.hardware_scan)

    // Pull active wheel/pedal settings from the hardware scan to populate
    // the existing typed columns (wheelbase_settings_json, etc.)
    const hw = session.hardware_scan || {}
    const activeWheel = Object.entries(hw.wheels || {}).find(([_, v]: any) => v?.detected)
    const activePedals = Object.entries(hw.pedals || {}).find(([_, v]: any) => v?.detected)

    const { data, error } = await supabase
      .from('sim_session_captures')
      .insert({
        user_id: user?.id || null,
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

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, sessionId: data?.id, detected })
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
