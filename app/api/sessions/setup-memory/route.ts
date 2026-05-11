// Setup Memory Recall — "what setup did I run last time at this car/track and what was my best lap?"
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

export async function POST(req: Request) {
  try {
    const { car, track, layout } = await req.json()
    const sb = createServerClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    let q = sb.from('sim_session_captures')
      .select('id, car_name, track_name, layout_name, started_at, best_lap_time, total_laps, incidents, iracing_settings_json, wheelbase_settings_json, pedal_settings_json, hardware_scan')
      .eq('user_id', user.id)
      .order('best_lap_time', { ascending: true })
      .limit(20)
    if (car) q = q.ilike('car_name', `%${car}%`)
    if (track) q = q.ilike('track_name', `%${track}%`)
    if (layout) q = q.ilike('layout_name', `%${layout}%`)

    const { data: sessions, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!sessions || sessions.length === 0) {
      return NextResponse.json({
        ok: true,
        found: 0,
        message: 'No prior sessions found for this combination.',
      })
    }

    const personal_best = sessions[0]
    return NextResponse.json({
      ok: true,
      found: sessions.length,
      personal_best: {
        id: personal_best.id,
        when: personal_best.started_at,
        best_lap: personal_best.best_lap_time,
        laps: personal_best.total_laps,
        incidents: personal_best.incidents,
        iracing_setup: personal_best.iracing_settings_json,
        simucube: personal_best.wheelbase_settings_json,
        pedals: personal_best.pedal_settings_json,
      },
      history: sessions.slice(0, 10).map((s: any) => ({
        id: s.id,
        when: s.started_at,
        best_lap: s.best_lap_time,
      })),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
