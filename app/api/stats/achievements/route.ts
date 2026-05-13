// /api/stats/achievements — computes which achievements the user has unlocked.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ items: [] })

    const [
      { count: sessionCount },
      { count: traceCount },
      { data: bestLap },
    ] = await Promise.all([
      sb.from('sim_session_captures').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      sb.from('sim_lap_traces').select('id', { count: 'exact', head: true }).eq('user_id', user.id),
      sb.from('sim_session_captures').select('best_lap_time, track_name').eq('user_id', user.id).gt('best_lap_time', 0).order('best_lap_time').limit(1).maybeSingle(),
    ])

    const items = [
      { id: 'first',     label: 'First Lap',      detail: 'Captured your first lap',                                          unlocked: (traceCount  ?? 0) >= 1,   icon: 'flag',    color: '#a3ff00' },
      { id: 'ten',       label: '10 Sessions',    detail: 'Logged 10 sessions',                                               unlocked: (sessionCount?? 0) >= 10,  icon: 'flame',   color: '#ff6a00' },
      { id: 'fifty',     label: '50 Laps',        detail: 'Captured 50 laps of telemetry',                                    unlocked: (traceCount  ?? 0) >= 50,  icon: 'zap',     color: '#f5c518' },
      { id: 'hundred',   label: '100 Laps',       detail: '100 laps logged · serious commitment',                             unlocked: (traceCount  ?? 0) >= 100, icon: 'award',   color: '#00e5ff' },
      { id: 'centurion', label: '500 Laps',       detail: '500 laps · Chief knows your driving DNA',                          unlocked: (traceCount  ?? 0) >= 500, icon: 'target',  color: '#ff00aa' },
      { id: 'pro',       label: 'Sub-1min Lap',   detail: bestLap?.best_lap_time && bestLap.best_lap_time < 60 ? `${bestLap.best_lap_time.toFixed(3)}s @ ${bestLap.track_name}` : 'Set a lap under 1 minute', unlocked: !!(bestLap?.best_lap_time && bestLap.best_lap_time < 60), icon: 'star', color: '#39ff14' },
    ]
    return NextResponse.json({ items })
  } catch (e: any) {
    return NextResponse.json({ items: [], error: e.message })
  }
}
