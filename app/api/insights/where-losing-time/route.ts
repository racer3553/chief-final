// /api/insights/where-losing-time — the most important question Chief answers.
// Aggregates per-sector loss across the user's MOST RECENT 5 sessions, ranks
// the top 3 corners across all of them, and generates a one-line "next lap fix"
// for each by comparing input averages on losing laps vs the user's best lap.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 30

const SECTORS = 30
const MIN_DELTA_MS = 40

type Sample = { pct?: number; speed?: number; throttle?: number; brake?: number; steer?: number; t?: number; gear?: number; rpm?: number }

export async function GET() {
  try {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    // Pull last 5 valid sessions with at least one trace
    const { data: sessions } = await sb
      .from('sim_session_captures')
      .select('id, car_name, track_name, layout_name, started_at, best_lap_time')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(5)

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ ready: false, note: 'No sessions yet — drive your first session to unlock loss analysis.' })
    }

    const aggregated: Array<{ sector: number; loss: number; sessionId: string; track: string; car: string; tip: string; why: string }> = []
    let totalOpportunity = 0
    let totalDriveSec = 0

    for (const s of sessions) {
      const { data: traces } = await sb
        .from('sim_lap_traces')
        .select('id, lap_time, samples')
        .eq('session_id', s.id)
        .eq('user_id', user.id)
        .gt('lap_time', 0)
      if (!traces || traces.length < 2) continue

      const valid = traces.filter(t => Array.isArray(t.samples) && t.samples.length > 30)
      if (valid.length < 2) continue

      const best = valid.reduce((a, b) => (a.lap_time! < b.lap_time! ? a : b))
      const bestSec = sectorTimes(best.samples as Sample[])
      if (!bestSec) continue

      // For each non-best lap, compute per-sector loss and find biggest
      const losses: number[][] = Array.from({ length: SECTORS }, () => [])
      for (const t of valid) {
        if (t.id === best.id) continue
        const st = sectorTimes(t.samples as Sample[])
        if (!st) continue
        for (let i = 0; i < SECTORS; i++) {
          if (st[i] === null || bestSec[i] === null) continue
          const d = (st[i] as number) - (bestSec[i] as number)
          if (d > 0) losses[i].push(d)
        }
      }

      const avgLoss = losses.map(arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)
      const sessionOpp = avgLoss.reduce((a, b) => a + b, 0)
      totalOpportunity += sessionOpp
      totalDriveSec += valid.reduce((acc, t) => acc + (t.lap_time || 0), 0)

      // Worst 3 sectors in this session
      const ranked = avgLoss.map((d, i) => ({ idx: i, loss: d })).sort((a, b) => b.loss - a.loss).slice(0, 3)
      for (const r of ranked) {
        if (r.loss * 1000 < MIN_DELTA_MS) continue
        const { tip, why } = sectorTip(best.samples as Sample[], valid, r.idx)
        aggregated.push({
          sector: r.idx,
          loss: r.loss,
          sessionId: s.id,
          track: s.track_name || '?',
          car:   s.car_name   || '?',
          tip, why,
        })
      }
    }

    if (aggregated.length === 0) {
      return NextResponse.json({
        ready: false,
        sessionCount: sessions.length,
        note: 'Not enough lap-vs-lap data yet — drive at least 3 timed laps in a session.',
      })
    }

    // Sort all aggregated points by loss, dedupe by track+sector (so one corner doesn't dominate
    // when it appears across multiple sessions — keep its highest loss), return top N.
    const seen = new Map<string, typeof aggregated[number]>()
    for (const a of aggregated.sort((x, y) => y.loss - x.loss)) {
      const k = `${a.track}::${a.sector}`
      if (!seen.has(k)) seen.set(k, a)
    }
    const top = Array.from(seen.values()).slice(0, 5)

    return NextResponse.json({
      ready: true,
      sessionCount: sessions.length,
      totalOpportunityS: +totalOpportunity.toFixed(2),
      totalDriveMin: Math.round(totalDriveSec / 60),
      topCorners: top.map((c, i) => ({
        rank: i + 1,
        sectorIndex: c.sector,
        sectorLabel: sectorLabel(c.sector),
        track: c.track,
        car: c.car,
        sessionId: c.sessionId,
        lossSeconds: +c.loss.toFixed(3),
        tip: c.tip,
        why: c.why,
      })),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
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
  if (pct < 0.10) return 'T1 entry'
  if (pct < 0.20) return 'T1 exit'
  if (pct < 0.30) return 'Sector 1 mid'
  if (pct < 0.40) return 'Sector 1 exit'
  if (pct < 0.50) return 'Sector 2 entry'
  if (pct < 0.60) return 'Sector 2 mid'
  if (pct < 0.70) return 'Sector 2 exit'
  if (pct < 0.80) return 'Sector 3 entry'
  if (pct < 0.90) return 'Sector 3 mid'
  return 'Final corner'
}

function sectorTip(bestSamples: Sample[], otherTraces: any[], sectorIdx: number) {
  const lo = sectorIdx / SECTORS, hi = (sectorIdx + 1) / SECTORS
  const inRange = (s: Sample) => (s.pct ?? 0) >= lo && (s.pct ?? 0) < hi
  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0

  const bestInSec = bestSamples.filter(inRange)
  const restInSec = otherTraces.flatMap(t => (t.samples || []).filter(inRange))
  if (bestInSec.length === 0 || restInSec.length === 0) {
    return { tip: 'Match your best-lap line through here', why: 'Insufficient telemetry' }
  }
  const bestAvg = {
    speed: avg(bestInSec.map(s => s.speed || 0)),
    brake: avg(bestInSec.map(s => s.brake || 0)),
    throttle: avg(bestInSec.map(s => s.throttle || 0)),
  }
  const restAvg = {
    speed: avg(restInSec.map((s: Sample) => s.speed || 0)),
    brake: avg(restInSec.map((s: Sample) => s.brake || 0)),
    throttle: avg(restInSec.map((s: Sample) => s.throttle || 0)),
  }
  const minSpeedDelta = bestAvg.speed - restAvg.speed
  const brakeDelta = restAvg.brake - bestAvg.brake
  const throttleDelta = bestAvg.throttle - restAvg.throttle

  if (brakeDelta > 8) return { tip: `Brake ${Math.round(brakeDelta)}% lighter — you're over-slowing`, why: 'Over-braking' }
  if (throttleDelta > 8) return { tip: `Pick up throttle earlier — open the wheel`, why: 'Late throttle pickup' }
  if (minSpeedDelta > 4) return { tip: `Carry ${Math.round(minSpeedDelta)} mph more apex speed`, why: 'Min speed too low' }
  return { tip: 'Match your fastest lap line through here', why: 'Line / smoothness issue' }
}
