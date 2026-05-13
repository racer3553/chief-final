// /api/sessions/last-pb — returns the user's most recent personal best (if any)
// captured in the last hour, so the dashboard can fire the celebration banner.
// "Personal best" = a session whose best_lap_time is faster than every previous
// session for the same user+car+track combo.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ event: null })

    const hourAgo = new Date(Date.now() - 60 * 60_000).toISOString()
    const { data: recent } = await sb
      .from('sim_session_captures')
      .select('id, car_name, track_name, best_lap_time, started_at')
      .eq('user_id', user.id)
      .gte('started_at', hourAgo)
      .gt('best_lap_time', 0)
      .order('started_at', { ascending: false })
      .limit(5)

    for (const s of recent || []) {
      // Find best lap at same car+track BEFORE this session
      const { data: prev } = await sb
        .from('sim_session_captures')
        .select('best_lap_time')
        .eq('user_id', user.id)
        .eq('car_name', s.car_name)
        .eq('track_name', s.track_name)
        .lt('started_at', s.started_at)
        .gt('best_lap_time', 0)
        .order('best_lap_time', { ascending: true })
        .limit(1)
      const previousBest = prev?.[0]?.best_lap_time
      if (!previousBest) continue   // first session at this combo — no PB to beat
      if (s.best_lap_time && s.best_lap_time < previousBest) {
        return NextResponse.json({
          event: {
            sessionId: s.id,
            car: s.car_name,
            track: s.track_name,
            lapTime: s.best_lap_time,
            improvementSec: previousBest - s.best_lap_time,
          }
        })
      }
    }
    return NextResponse.json({ event: null })
  } catch (e: any) {
    return NextResponse.json({ event: null, error: e.message })
  }
}
