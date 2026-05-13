// /api/insights/race-debrief — post-session AI debrief.
// Given ?sessionId=xxx OR ?latest=1, pulls the session + traces + setup +
// hardware, hands them to Claude, and returns a structured debrief:
// headline, top win, top mistake, setup observation, next-session actions.

import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export const dynamic = 'force-dynamic'
export const maxDuration = 60

const SECTORS = 30

type Sample = { pct?: number; speed?: number; throttle?: number; brake?: number; steer?: number; t?: number }

export async function GET(req: Request) {
  try {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const url = new URL(req.url)
    const sessionId = url.searchParams.get('sessionId')
    const latest = url.searchParams.get('latest')

    let session: any = null
    if (sessionId) {
      const { data } = await sb
        .from('sim_session_captures')
        .select('*')
        .eq('id', sessionId)
        .eq('user_id', user.id)
        .single()
      session = data
    } else if (latest === '1') {
      const { data } = await sb
        .from('sim_session_captures')
        .select('*')
        .eq('user_id', user.id)
        .order('started_at', { ascending: false })
        .limit(1)
        .single()
      session = data
    } else {
      return NextResponse.json({ error: 'sessionId or latest=1 required' }, { status: 400 })
    }

    if (!session) return NextResponse.json({ error: 'session not found' }, { status: 404 })

    // Pull traces for sector analysis
    const { data: traces } = await sb
      .from('sim_lap_traces')
      .select('id, lap_time, samples, lap_number, valid')
      .eq('session_id', session.id)
      .eq('user_id', user.id)
      .order('lap_number', { ascending: true })

    const validTraces = (traces || []).filter(t => Array.isArray(t.samples) && t.samples.length > 30 && (t.lap_time || 0) > 0)
    let bestLap: any = null
    let worstLap: any = null
    let consistencyPct = 0
    let lapsAnalyzed = validTraces.length
    let sectorLossNote = ''

    if (validTraces.length >= 2) {
      bestLap = validTraces.reduce((a, b) => (a.lap_time! < b.lap_time! ? a : b))
      worstLap = validTraces.reduce((a, b) => (a.lap_time! > b.lap_time! ? a : b))
      const times = validTraces.map(t => t.lap_time!)
      const avg = times.reduce((a, b) => a + b, 0) / times.length
      const variance = times.reduce((acc, t) => acc + Math.pow(t - avg, 2), 0) / times.length
      const stddev = Math.sqrt(variance)
      consistencyPct = Math.max(0, Math.round(100 - (stddev / avg) * 100))

      // Sector loss vs best
      const bestSec = sectorTimes(bestLap.samples as Sample[])
      if (bestSec) {
        const losses: number[] = Array(SECTORS).fill(0)
        const counts: number[] = Array(SECTORS).fill(0)
        for (const t of validTraces) {
          if (t.id === bestLap.id) continue
          const st = sectorTimes(t.samples as Sample[])
          if (!st) continue
          for (let i = 0; i < SECTORS; i++) {
            if (st[i] === null || bestSec[i] === null) continue
            const d = (st[i] as number) - (bestSec[i] as number)
            if (d > 0) { losses[i] += d; counts[i]++ }
          }
        }
        const avgLoss = losses.map((s, i) => counts[i] ? s / counts[i] : 0)
        const top3 = avgLoss.map((d, i) => ({ idx: i, d })).sort((a, b) => b.d - a.d).slice(0, 3)
        sectorLossNote = top3.map(s => `Sector ${s.idx + 1}/${SECTORS} (${(s.idx / SECTORS * 100 | 0)}–${((s.idx + 1) / SECTORS * 100 | 0)}% of lap): ${s.d.toFixed(3)}s lost`).join('; ')
      }
    }

    // Build a compact session context
    const hw = session.hardware_scan || {}
    const wheels = hw.wheels || {}
    const activeWheel = Object.entries(wheels).find(([_, v]: any) => v?.detected)?.[0] || null

    const ctx = {
      car: session.car_name,
      track: session.track_name,
      layout: session.layout_name,
      type: session.session_type,
      started_at: session.started_at,
      duration_min: session.started_at && session.ended_at
        ? Math.round((new Date(session.ended_at).getTime() - new Date(session.started_at).getTime()) / 60000)
        : null,
      laps: session.total_laps,
      incidents: session.incidents,
      best_lap: session.best_lap_time,
      best_lap_number: session.best_lap_number,
      best_lap_index_in_traces: bestLap?.lap_number,
      worst_lap_time: worstLap?.lap_time,
      worst_lap_number: worstLap?.lap_number,
      consistency_pct: consistencyPct,
      laps_analyzed: lapsAnalyzed,
      sector_loss_top3: sectorLossNote || 'insufficient data',
      conditions: session.weather_json,
      hardware: { wheel: activeWheel, detected_vendors: session.detected_vendors },
      setup_name: session.setup_name,
      setup_values: session.setup_snapshot_json
        ? Object.entries(session.setup_snapshot_json).slice(0, 50)
        : null,
    }

    const systemPrompt = `You are Chief, an AI crew chief delivering a post-session debrief. Output STRICT JSON ONLY (no markdown, no preface) with this exact schema:

{
  "headline": "one-sentence summary of how the session went",
  "top_win": "the single best thing the driver did this session, specific",
  "top_mistake": "the single biggest time-loss pattern with WHERE it happened",
  "setup_observation": "what the setup tells us, or what to try next session",
  "consistency_note": "what consistency tells us — and how to use it",
  "next_session_actions": ["3-5 short imperative actions, e.g. 'Try 1 click less rear wing'", "..."],
  "grade": "A+ | A | B | C | D — based on improvement potential vs effort"
}

Tone: direct, motorsport veteran, action-oriented. No filler. No "great job". Use track-specific corner phrasing like "T3 entry" when you can infer it. Reference real numbers from the data.`

    const userPrompt = `Session data:
${JSON.stringify(ctx, null, 2)}

Generate the debrief JSON now.`

    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const raw = completion.content[0].type === 'text' ? completion.content[0].text : ''
    let parsed: any = null
    try {
      const jsonMatch = raw.match(/\{[\s\S]*\}/)
      if (jsonMatch) parsed = JSON.parse(jsonMatch[0])
    } catch (e) {}

    return NextResponse.json({
      ok: true,
      sessionId: session.id,
      session: {
        car: session.car_name,
        track: session.track_name,
        layout: session.layout_name,
        type: session.session_type,
        started_at: session.started_at,
        total_laps: session.total_laps,
        best_lap_time: session.best_lap_time,
        incidents: session.incidents,
      },
      debrief: parsed || {
        headline: raw.slice(0, 200),
        raw,
        parse_error: true,
      },
      analytics: {
        consistency_pct: consistencyPct,
        laps_analyzed: lapsAnalyzed,
        sector_loss_top3: sectorLossNote,
      },
    })
  } catch (e: any) {
    console.error('[race-debrief] error', e)
    return NextResponse.json({
      error: e.message,
      hint: e.status === 401 ? 'ANTHROPIC_API_KEY invalid' : e.status === 429 ? 'Anthropic rate limit hit' : 'Server error',
    }, { status: 500 })
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
