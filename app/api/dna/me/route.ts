// /api/dna/me — server-side analyzer that builds the driver's "DNA" profile
// from accumulated trace data across all sessions.
//
// Returns:
//   tendencies:   normalized 0-100 scores per behavior (overslow, late_throttle,
//                 early_brake, tire_abuse, hesitation, aggression)
//   consistency:  lap-time variance metric
//   weakCorners:  ranked list of pct-bins where user loses the most time
//   strongCorners: corners user consistently nails
//   trackPersona: pattern across multiple tracks
//
// Computed live from sim_lap_traces samples — no daemon push needed.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const SECTORS = 20

type Sample = { pct?: number; speed?: number; throttle?: number; brake?: number; steer?: number; t?: number; rpm?: number }

export async function GET() {
  try {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    // Pull last 200 valid laps across all sessions
    const { data: traces } = await sb
      .from('sim_lap_traces')
      .select('id, lap_number, lap_time, samples, track, car')
      .eq('user_id', user.id)
      .gt('lap_time', 0)
      .order('ts', { ascending: false })
      .limit(200)

    if (!traces || traces.length === 0) {
      return NextResponse.json({ ready: false, note: 'Drive at least one session to unlock your DNA.' })
    }

    const valid = traces.filter(t => Array.isArray(t.samples) && t.samples.length > 30)
    if (valid.length < 3) {
      return NextResponse.json({ ready: false, note: `Drive ${3 - valid.length} more lap(s) with telemetry to unlock your DNA.`, lapsCaptured: valid.length })
    }

    // --- 1. TENDENCY SCORES ---
    // Compute behavior scores by analyzing every sample's input pattern.
    // overslow         = % of corner samples where throttle was 0 AND brake released > 0.3s ago
    // late_throttle    = avg gap (m or pct) between brake release and full throttle pickup
    // early_brake      = % of braking events that started before optimal (heuristic: speed > 0.85 of max)
    // tire_abuse       = avg steering rate * lateral G proxy
    // hesitation       = mid-corner throttle dips after initial application
    // aggression       = avg throttle pickup rate (0→100%)

    const buckets = { coastInCorner: 0, total: 0, lateThrottleEvents: [] as number[], earlyBrakeEvents: 0, steeringSpikes: 0, hesitations: 0, throttleRamps: [] as number[] }

    for (const tr of valid) {
      const s = tr.samples as Sample[]
      let prevBrake = 0, prevThrottle = 0, brakeReleasedAt: number | null = null
      let throttleStart: number | null = null
      let maxSpeed = 0
      for (const sm of s) {
        const speed = sm.speed || 0
        const brake = sm.brake || 0
        const throttle = sm.throttle || 0
        const steer = Math.abs(sm.steer || 0)
        maxSpeed = Math.max(maxSpeed, speed)

        // coast: low speed, no brake, no throttle
        if (speed < maxSpeed * 0.85 && brake < 5 && throttle < 5) buckets.coastInCorner++
        buckets.total++

        // brake-release → throttle gap (late throttle)
        if (prevBrake > 10 && brake < 5) brakeReleasedAt = sm.t || 0
        if (brakeReleasedAt !== null && throttle > 20 && prevThrottle < 20) {
          buckets.lateThrottleEvents.push(Math.max(0, (sm.t || 0) - brakeReleasedAt))
          brakeReleasedAt = null
        }

        // early brake: braking applied while still > 0.9 maxSpeed
        if (prevBrake < 5 && brake > 15 && speed > maxSpeed * 0.9) buckets.earlyBrakeEvents++

        // hesitation: throttle dip during corner
        if (throttle > 30 && prevThrottle > throttle + 15 && brake < 5) buckets.hesitations++

        // steering "spike" — abrupt steering correction
        if (steer > 0.3 && Math.abs(steer - (prevThrottle ? steer : 0)) > 0.15) buckets.steeringSpikes++

        // throttle ramp rate
        if (throttle > prevThrottle + 10) buckets.throttleRamps.push(throttle - prevThrottle)

        prevBrake = brake; prevThrottle = throttle
      }
    }

    const totalSamples = Math.max(1, buckets.total)
    const tendencies = {
      overslow:      Math.min(100, Math.round((buckets.coastInCorner / totalSamples) * 100 * 4)),
      lateThrottle:  Math.min(100, Math.round(((avg(buckets.lateThrottleEvents) || 0) * 100))),
      earlyBrake:    Math.min(100, Math.round((buckets.earlyBrakeEvents / valid.length) * 8)),
      hesitation:    Math.min(100, Math.round((buckets.hesitations / valid.length) * 5)),
      aggression:    Math.min(100, Math.round((avg(buckets.throttleRamps) || 0) * 2)),
      smoothness:    Math.max(0, 100 - Math.min(100, Math.round((buckets.steeringSpikes / valid.length) * 4))),
    }

    // --- 2. CONSISTENCY ---
    const lapTimes = valid.map(t => t.lap_time as number).filter(t => t > 0)
    const meanLap = lapTimes.reduce((a, b) => a + b, 0) / lapTimes.length
    const stddev = Math.sqrt(lapTimes.reduce((a, t) => a + (t - meanLap) ** 2, 0) / lapTimes.length)
    const consistencyPct = Math.max(0, Math.min(100, Math.round((1 - stddev / meanLap) * 100)))

    // --- 3. WEAK / STRONG CORNERS ---
    // Group laps by track, compute per-sector avg-time vs personal-best at each track,
    // then average the deltas across tracks to find systematic weak zones.
    const byTrack: Record<string, any[]> = {}
    for (const t of valid) {
      const key = t.track || 'unknown'
      if (!byTrack[key]) byTrack[key] = []
      byTrack[key].push(t)
    }

    const allSectorDeltas: number[][] = Array.from({ length: SECTORS }, () => [])
    for (const [_, tracks] of Object.entries(byTrack)) {
      const trackTraces = tracks.filter(t => Array.isArray(t.samples) && t.samples.length > 30)
      if (trackTraces.length < 2) continue
      const best = trackTraces.reduce((a, b) => a.lap_time < b.lap_time ? a : b)
      const bestSec = sectorTimes(best.samples)
      if (!bestSec) continue
      for (const t of trackTraces) {
        if (t.id === best.id) continue
        const st = sectorTimes(t.samples)
        if (!st) continue
        for (let i = 0; i < SECTORS; i++) {
          if (st[i] === null || bestSec[i] === null) continue
          const d = (st[i] as number) - (bestSec[i] as number)
          if (d > 0) allSectorDeltas[i].push(d)
        }
      }
    }
    const sectorAvg = allSectorDeltas.map(arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)
    const ranked = sectorAvg.map((d, i) => ({ index: i, avgLoss: d })).filter(x => x.avgLoss > 0.01)
    const weakCorners = ranked.slice().sort((a, b) => b.avgLoss - a.avgLoss).slice(0, 5).map(x => ({
      label: sectorLabel(x.index),
      avgLossMs: Math.round(x.avgLoss * 1000),
    }))
    const strongCorners = ranked.slice().sort((a, b) => a.avgLoss - b.avgLoss).slice(0, 5).map(x => ({
      label: sectorLabel(x.index),
      avgLossMs: Math.round(x.avgLoss * 1000),
    }))

    // --- 4. STATS ---
    const totalLaps = valid.length
    const totalDriveSec = lapTimes.reduce((a, b) => a + b, 0)
    const tracks = Object.keys(byTrack).length
    const cars = new Set(valid.map(t => t.car)).size

    return NextResponse.json({
      ready: true,
      tendencies,
      consistency: consistencyPct,
      weakCorners,
      strongCorners,
      stats: { totalLaps, totalDriveSec: Math.round(totalDriveSec), tracks, cars, sessions: new Set(valid.map(t => (t as any).session_id)).size || 0 },
      updatedAt: new Date().toISOString(),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

function avg(arr: number[]): number {
  if (!arr.length) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function sectorTimes(samples: Sample[]): (number | null)[] | null {
  if (!samples || samples.length === 0) return null
  const buckets: number[][] = Array.from({ length: SECTORS }, () => [])
  for (const s of samples) {
    const idx = Math.min(SECTORS - 1, Math.max(0, Math.floor((s.pct ?? 0) * SECTORS)))
    buckets[idx].push(s.t || 0)
  }
  return buckets.map(b => b.length >= 2 ? b[b.length - 1] - b[0] : null)
}

function sectorLabel(idx: number): string {
  const pct = (idx + 0.5) / SECTORS
  if (pct < 0.20) return 'T1 zone'
  if (pct < 0.40) return 'Sector 1 mid'
  if (pct < 0.60) return 'Sector 2'
  if (pct < 0.80) return 'Sector 3'
  return 'Final corner'
}
