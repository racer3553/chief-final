// chief-final/app/api/ai/ask-chief/route.ts
// Universal hardware-aware Ask Chief.
// Knows about Simucube/Fanatec/Moza/Thrustmaster/Asetek/Simagic/iRacing/Coach Dave settings.
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: Request) {
  try {
    const { question, car, track } = await req.json()
    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    let q = supabase.from('sim_session_captures')
      .select('car_name,track_name,layout_name,session_type,started_at,best_lap_time,total_laps,incidents,weather_json,laps_data,hardware_scan,detected_vendors,wheelbase_settings_json,wheel_settings_json,pedal_settings_json,iracing_settings_json,setup_snapshot_json,setup_name')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(8)   // was 20 — keeps context window under control
    if (car) q = q.ilike('car_name', `%${car}%`)
    if (track) q = q.ilike('track_name', `%${track}%`)
    const { data: sessions } = await q

    // Build trim context per session - extract just the active settings, not full file dumps
    const ctx = (sessions || []).map((s: any) => {
      const hw = s.hardware_scan || {}
      const sim = hw.sim?.iracing || {}
      const coach = hw.coach?.coach_dave || {}
      const wheels = hw.wheels || {}
      const activeWheel = Object.entries(wheels).find(([_, v]: any) => v?.detected)?.[0] || null

      return {
        date: s.started_at,
        car: s.car_name, track: s.track_name, layout: s.layout_name,
        type: s.session_type,
        best_lap: s.best_lap_time,
        laps: s.total_laps,
        incidents: s.incidents,
        conditions: s.weather_json,
        last_lap_breakdown: (s.laps_data || []).slice(-10),
        // LIVE setup snapshot from iRacing SDK — the AUTHORITATIVE per-session
        // setup values. Use this to answer "what was my setup at <track>?".
        active_setup_name: s.setup_name,
        active_setup_values: s.setup_snapshot_json,
        hardware: {
          detected: s.detected_vendors,
          wheel: activeWheel,
          wheel_active_profile: activeWheel ? wheels[activeWheel]?.active_profile?.name : null,
          iracing_setups_for_this_car: (sim.setups_for_car || []).slice(0, 5).map((x: any) => x.name),
          iracing_setups_for_this_track: (sim.setups_for_track || []).map((x: any) => x.name),
          coach_dave_setups: (coach.setups || []).slice(0, 5).map((x: any) => x.name),
        },
      }
    })

    const systemPrompt = `You are Chief, an AI Crew Chief for sim racers. You have access to the driver's auto-captured session history including:
- iRacing telemetry (lap times, fuel, incidents, weather)
- iRacing per-car setup files
- Wheel base settings (Simucube, Fanatec, Moza, Thrustmaster, Asetek, Simagic - whichever they have)
- Coach Dave Delta setup files and rankings
- Pedal/motion vendor data

When asked about past sessions or settings:
1. Reference SPECIFIC dates, lap times, setup file names from the data below
2. If conditions changed (track temp delta), call out what to adjust on their specific wheel/pedals
3. Tailor advice to their detected hardware vendor (Simucube settings differ from Fanatec)
4. If they ask "what was my setup last time" - point to the actual .sto / .cdd file name from their iRacing or Coach Dave folder
5. Direct, action-oriented crew chief tone. No fluff.

DRIVER'S SESSION HISTORY (most recent first, ${ctx.length} sessions):
${JSON.stringify(ctx, null, 2)}`

    // Truncate any oversized fields before sending — Anthropic limits per request.
    const compactSystem = systemPrompt.slice(0, 80000)

    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1500,
      system: compactSystem,
      messages: [{ role: 'user', content: String(question).slice(0, 8000) }],
    })

    const answer = completion.content[0].type === 'text' ? completion.content[0].text : ''
    return NextResponse.json({
      answer,
      context_sessions: ctx.length,
      hardware_detected: ctx[0]?.hardware?.detected || [],
    })
  } catch (e: any) {
    console.error('[ask-chief] error', e)
    return NextResponse.json({
      error: e.message,
      hint: e.status === 401
        ? 'ANTHROPIC_API_KEY is missing or invalid on Vercel'
        : e.status === 429
          ? 'Anthropic rate limit hit — wait a minute and retry'
          : e.status === 400
            ? 'Request was malformed (probably too much context). Already trimmed — if you still see this, narrow your question.'
            : 'Server error — check Vercel function logs',
    }, { status: 500 })
  }
}
