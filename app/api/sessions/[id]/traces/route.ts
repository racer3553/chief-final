// app/api/sessions/[id]/traces/route.ts
// Returns metadata for every lap trace belonging to a session.
// Two modes:
//   GET  /api/sessions/[id]/traces           → list of laps (no samples)
//   GET  /api/sessions/[id]/traces?lap=<id>  → full samples for that lap trace
//
// Samples can be 5-50 KB each so we lazy-load them — list is cheap, detail
// fetches one trace at a time.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request, ctx: { params: { id: string } }) {
  try {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const sessionId = ctx.params.id
    const url = new URL(req.url)
    const specificLap = url.searchParams.get('lap')

    // Load the session itself so we know car/track for the time-window fallback
    const { data: session, error: sErr } = await sb
      .from('sim_session_captures')
      .select('id, user_id, car_name, track_name, layout_name, started_at, ended_at, best_lap_time')
      .eq('id', sessionId)
      .eq('user_id', user.id)
      .maybeSingle()
    if (sErr) return NextResponse.json({ error: sErr.message }, { status: 500 })
    if (!session) return NextResponse.json({ error: 'session not found' }, { status: 404 })

    if (specificLap) {
      // Full samples for one trace
      const { data, error } = await sb
        .from('sim_lap_traces')
        .select('*')
        .eq('id', specificLap)
        .eq('user_id', user.id)
        .maybeSingle()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (!data) return NextResponse.json({ error: 'trace not found' }, { status: 404 })
      return NextResponse.json({ ok: true, trace: data })
    }

    // List mode — match by session_id first; fall back to car+track+time-window
    // for backward compat with traces pushed before the FK linker existed.
    // Widen the session window — many captured sessions have a missing ended_at
    // or the laps were driven over a long stint. Use a generous +/- 4 hour window
    // from started_at so we don't miss laps that should belong to this session.
    const startBase  = session.started_at ? new Date(session.started_at) : null
    const sessionStart = startBase ? new Date(startBase.getTime() - 30 * 60 * 1000).toISOString() : null
    const sessionEnd   = session.ended_at
      ? new Date(new Date(session.ended_at).getTime() + 30 * 60 * 1000).toISOString()
      : (startBase ? new Date(startBase.getTime() + 4 * 60 * 60 * 1000).toISOString() : new Date().toISOString())

    let { data: traces } = await sb
      .from('sim_lap_traces')
      .select('id, lap_number, lap_time, track, track_config, car, sample_count, ts, session_id')
      .eq('user_id', user.id)
      .eq('session_id', sessionId)
      .order('lap_number', { ascending: true })

    // Fallback 1: car+track exact match within the session time window
    if ((traces || []).length === 0 && sessionStart) {
      const { data: fb1 } = await sb
        .from('sim_lap_traces')
        .select('id, lap_number, lap_time, track, track_config, car, sample_count, ts, session_id')
        .eq('user_id', user.id)
        .eq('car', session.car_name)
        .eq('track', session.track_name)
        .gte('ts', sessionStart)
        .lte('ts', sessionEnd)
        .order('lap_number', { ascending: true })
      traces = fb1 || []
    }

    // Fallback 2: same track within the time window (any car) — handles traces
    // captured before we wired up car_name properly
    if ((traces || []).length === 0 && sessionStart && session.track_name) {
      const { data: fb2 } = await sb
        .from('sim_lap_traces')
        .select('id, lap_number, lap_time, track, track_config, car, sample_count, ts, session_id')
        .eq('user_id', user.id)
        .eq('track', session.track_name)
        .gte('ts', sessionStart)
        .lte('ts', sessionEnd)
        .order('lap_number', { ascending: true })
      traces = fb2 || []
    }

    // Fallback 3: user + time window only (handles traces with missing car/track)
    if ((traces || []).length === 0 && sessionStart) {
      const { data: fb3 } = await sb
        .from('sim_lap_traces')
        .select('id, lap_number, lap_time, track, track_config, car, sample_count, ts, session_id')
        .eq('user_id', user.id)
        .gte('ts', sessionStart)
        .lte('ts', sessionEnd)
        .order('lap_number', { ascending: true })
      traces = fb3 || []
    }

    // Compute a derived "best lap" and a sane default reference lap
    let bestLapId: string | null = null
    let bestLapTime = Infinity
    for (const t of (traces || [])) {
      if (t.lap_time && t.lap_time > 0 && t.lap_time < bestLapTime) {
        bestLapTime = t.lap_time
        bestLapId = t.id
      }
    }

    return NextResponse.json({
      ok: true,
      session,
      traces: traces || [],
      bestLapId,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
