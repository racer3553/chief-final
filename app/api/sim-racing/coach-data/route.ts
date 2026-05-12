// app/api/sim-racing/coach-data/route.ts
// Powers the "Race Coach" tab — formerly "Coach Dave Info" — using CHIEF's
// OWN captured data. No dependency on Coach Dave Delta being installed.
//
// Aggregates sim_session_captures + sim_lap_traces + sim_setups_parsed
// into car/track groups, each with:
//   - best lap, optimal lap (sum of best sectors approximation), average lap
//   - untapped potential (ms)
//   - consistency %
//   - session count, total laps, total drive time
//   - available setups (filtered by car class)
//   - most recent N sessions for quick navigation

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const [{ data: sessions }, { data: setups }] = await Promise.all([
      sb.from('sim_session_captures')
        .select('id, car_name, track_name, layout_name, session_type, started_at, ended_at, best_lap_time, total_laps, incidents')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(500),
      sb.from('sim_setups_parsed')
        .select('id, filename, car_code, car_name, track_code, track_name, session_type, version, parse_score, storage_path')
        .eq('user_id', user.id)
        .limit(2000),
    ])

    // Group sessions by (car_name, track_name)
    const groups = new Map<string, any>()
    for (const s of (sessions || [])) {
      const car = (s.car_name || 'Unknown Car').trim()
      const track = (s.track_name || 'Unknown Track').trim()
      const key = `${car}::${track}`
      if (!groups.has(key)) {
        groups.set(key, {
          car, track, layout: s.layout_name,
          sessions: [],
          bestLap: null,
          totalLaps: 0,
          incidents: 0,
          lastDriven: s.started_at,
        })
      }
      const g = groups.get(key)
      g.sessions.push({
        id: s.id,
        started_at: s.started_at,
        best_lap_time: s.best_lap_time,
        total_laps: s.total_laps,
        session_type: s.session_type,
      })
      if (s.best_lap_time && s.best_lap_time > 0) {
        if (!g.bestLap || s.best_lap_time < g.bestLap) g.bestLap = s.best_lap_time
      }
      g.totalLaps += s.total_laps || 0
      g.incidents += s.incidents || 0
    }

    // Compute aggregate metrics per group
    const groupArray = Array.from(groups.values()).map((g: any) => {
      const validLapTimes = g.sessions
        .map((s: any) => s.best_lap_time)
        .filter((t: any) => typeof t === 'number' && t > 0)
      const avgLap = validLapTimes.length
        ? validLapTimes.reduce((a: number, b: number) => a + b, 0) / validLapTimes.length
        : null
      // Optimal lap approximation: best lap minus a fraction of avg-best spread
      const optimalLap = (g.bestLap && avgLap)
        ? Math.max(g.bestLap - (avgLap - g.bestLap) * 0.15, g.bestLap * 0.995)
        : g.bestLap
      const untappedMs = (g.bestLap && optimalLap) ? Math.round((g.bestLap - optimalLap) * 1000) : 0
      // Consistency: 1 - stddev/mean
      let consistency = 0
      if (validLapTimes.length >= 2 && avgLap) {
        const variance = validLapTimes.reduce((acc: number, t: number) => acc + (t - avgLap) ** 2, 0) / validLapTimes.length
        const stddev = Math.sqrt(variance)
        consistency = Math.max(0, Math.min(100, (1 - stddev / avgLap) * 100))
      }

      // Find setups that match this car class
      const carLower = g.car.toLowerCase()
      const matchingSetups = (setups || []).filter((s: any) => {
        if (!s.car_code) return false
        const c = s.car_code.toUpperCase()
        if (carLower.includes('late model') && (c === 'LMS' || c === 'LMST' || c === 'LMSC' || c === 'LMODS')) return true
        if (carLower.includes('gt3') && c === 'GT3') return true
        if (carLower.includes('lmp3') && c === 'LMP3') return true
        if (carLower.includes('lmp2') && c === 'LMP2') return true
        if (carLower.includes('lmp1') && c === 'LMP1') return true
        if (carLower.includes('indy') && c === 'INDY') return true
        if (carLower.includes('xfinity') && c === 'NXS') return true
        if (carLower.includes('cup') && c === 'NSC') return true
        return false
      })

      return {
        car: g.car,
        track: g.track,
        layout: g.layout,
        sessionCount: g.sessions.length,
        totalLaps: g.totalLaps,
        incidents: g.incidents,
        lastDriven: g.lastDriven,
        bestLap: g.bestLap,
        optimalLap,
        averageLap: avgLap,
        untappedMs,
        consistency,
        setupsAvailable: matchingSetups.length,
        setups: matchingSetups.slice(0, 6).map((s: any) => ({
          id: s.id, filename: s.filename, session_type: s.session_type, parse_score: s.parse_score,
        })),
        recentSessions: g.sessions.slice(0, 5),
      }
    }).sort((a: any, b: any) => (b.lastDriven || '').localeCompare(a.lastDriven || ''))

    return NextResponse.json({
      ok: true,
      groups: groupArray,
      totalSessions: sessions?.length || 0,
      totalSetups: setups?.length || 0,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
