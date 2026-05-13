// /api/sessions/[id]/biggest-gains
// Server-side telemetry analyzer. For each session, picks the user's best lap,
// then for each other lap in the session computes per-sector deltas. Returns
// the top N sectors where the driver lost the most time, plus a synthesized
// tip per sector derived from braking / throttle / min-speed deltas.
//
// Output is the "biggest lap-time opportunities" — exactly what should drive
// the driver's next session focus.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const maxDuration = 20

const SECTORS = 30   // bin the lap into 30 segments by lap_dist_pct
const MIN_DELTA_MS = 30   // ignore sectors where you lost less than 30ms

type Sample = {
  pct: number
  speed?: number   // mph
  throttle?: number   // 0-100
  brake?: number      // 0-100
  steer?: number
  t?: number          // seconds within lap
}

export async function GET(_req: Request, ctx: { params: { id: string } }) {
  try {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const sessionId = ctx.params.id

    // Pull all lap traces for this session (already linked via session_id)
    const { data: traces, error } = await sb
      .from('sim_lap_traces')
      .select('id, lap_number, lap_time, samples')
      .eq('session_id', sessionId)
      .eq('user_id', user.id)
      .order('lap_number', { ascending: true })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!traces || traces.length === 0) {
      return NextResponse.json({ gains: [], note: 'no traces for this session' })
    }

    // Filter to valid lap times only, find the best lap
    const validTraces = traces.filter(t => t.lap_time && t.lap_time > 0 && Array.isArray(t.samples) && t.samples.length > 30)
    if (validTraces.length === 0) {
      return NextResponse.json({ gains: [], note: 'no valid timed laps with telemetry' })
    }

    const bestTrace = validTraces.reduce((a, b) => (a.lap_time! < b.lap_time! ? a : b))

    // For every non-best lap, bin into sectors and compute time-per-sector
    const bestSectorTimes = computeSectorTimes(bestTrace.samples as Sample[])
    if (!bestSectorTimes) {
      return NextResponse.json({ gains: [], note: 'best lap has no time data' })
    }

    // Accumulate "average loss" per sector across all non-best laps
    const sectorLosses: number[][] = Array.from({ length: SECTORS }, () => [])
    for (const t of validTraces) {
      if (t.id === bestTrace.id) continue
      const st = computeSectorTimes(t.samples as Sample[])
      if (!st) continue
      for (let i = 0; i < SECTORS; i++) {
        if (st[i] === null || bestSectorTimes[i] === null) continue
        const loss = (st[i] as number) - (bestSectorTimes[i] as number)
        if (loss > 0) sectorLosses[i].push(loss)
      }
    }

    // Average loss per sector, then sort descending
    const sectorAvgLoss = sectorLosses.map(arr => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0)
    const ranked = sectorAvgLoss
      .map((avg, idx) => ({ idx, avg }))
      .filter(x => x.avg * 1000 > MIN_DELTA_MS)
      .sort((a, b) => b.avg - a.avg)
      .slice(0, 5)

    // Build tip per sector by comparing input averages
    const gains = ranked.map(r => {
      const tip = sectorTip(bestTrace.samples as Sample[], validTraces, r.idx)
      const totalOpportunity = sectorAvgLoss[r.idx]
      const sectorLabel = sectorName(r.idx)
      return {
        sectorIndex: r.idx,
        sectorLabel,
        lossSeconds: +r.avg.toFixed(3),
        opportunity: +totalOpportunity.toFixed(3),
        tip: tip.text,
        why: tip.why,
        details: tip.details,
      }
    })

    // Total optimal lap if user matched their best in every sector
    const optimalDelta = sectorAvgLoss.reduce((a, b) => a + b, 0)

    return NextResponse.json({
      gains,
      bestLap: bestTrace.lap_time,
      bestLapNumber: bestTrace.lap_number,
      totalLaps: validTraces.length,
      optimalLap: bestTrace.lap_time! - optimalDelta,  // theoretical best if every sector matched their best
      optimalDeltaSeconds: +optimalDelta.toFixed(3),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

function computeSectorTimes(samples: Sample[]): (number | null)[] | null {
  if (!samples || samples.length === 0) return null
  const buckets: number[][] = Array.from({ length: SECTORS }, () => [])
  for (const s of samples) {
    const pct = typeof s.pct === 'number' ? s.pct : 0
    const t = typeof s.t === 'number' ? s.t : 0
    const idx = Math.min(Math.max(0, Math.floor(pct * SECTORS)), SECTORS - 1)
    buckets[idx].push(t)
  }
  return buckets.map(b => b.length >= 2 ? b[b.length - 1] - b[0] : null)
}

function sectorName(idx: number): string {
  // Map 30 sectors into rough track positions for human labels
  const pct = (idx + 0.5) / SECTORS
  if (pct < 0.10) return 'T1 entry'
  if (pct < 0.20) return 'T1 exit'
  if (pct < 0.30) return 'Sector 1'
  if (pct < 0.40) return 'Mid-sector 1'
  if (pct < 0.50) return 'Sector 2 entry'
  if (pct < 0.60) return 'Sector 2'
  if (pct < 0.70) return 'Sector 2 exit'
  if (pct < 0.80) return 'Sector 3 entry'
  if (pct < 0.90) return 'Sector 3'
  return 'Final corner'
}

function sectorTip(bestSamples: Sample[], otherTraces: any[], sectorIdx: number) {
  const lo = sectorIdx / SECTORS
  const hi = (sectorIdx + 1) / SECTORS

  const inRange = (s: Sample) => (s.pct ?? 0) >= lo && (s.pct ?? 0) < hi
  const avg = (arr: number[]) => arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0

  const bestInSec = bestSamples.filter(inRange)
  const restInSec = otherTraces.flatMap(t => (t.samples || []).filter(inRange))

  if (bestInSec.length === 0 || restInSec.length === 0) {
    return { text: 'Match your best lap line here', why: 'Insufficient telemetry to diagnose', details: {} }
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

  const minSpeedDelta = bestAvg.speed - restAvg.speed         // positive = best lap was faster
  const brakeDelta = restAvg.brake - bestAvg.brake             // positive = you over-braked here
  const throttleDelta = bestAvg.throttle - restAvg.throttle    // positive = best lap was on throttle more

  const phrases: string[] = []
  if (brakeDelta > 6) phrases.push(`brake ${Math.round(brakeDelta)}% softer`)
  if (throttleDelta > 6) phrases.push(`pick up throttle earlier`)
  if (minSpeedDelta > 3) phrases.push(`carry ${Math.round(minSpeedDelta)} mph more min-speed`)

  const text = phrases.length > 0
    ? phrases[0].charAt(0).toUpperCase() + phrases[0].slice(1) + (phrases.length > 1 ? ` · ${phrases.slice(1).join(' · ')}` : '')
    : `Match your best lap inputs here — no single dominant cause`

  const why = phrases.length > 0
    ? phrases.length === 1
      ? 'One dominant difference vs your fastest lap'
      : 'Multiple input differences vs your fastest lap'
    : 'Speed loss without clean cause — likely a line / smoothness issue'

  return {
    text,
    why,
    details: {
      minSpeedDelta: +minSpeedDelta.toFixed(1),
      brakeOverpressedPct: +brakeDelta.toFixed(1),
      throttleLatePct: +throttleDelta.toFixed(1),
    },
  }
}
