// AI Setup Tuner — analyzes iRacing setup and suggests changes for more speed.
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: Request) {
  try {
    const { session_id } = await req.json()
    const sb = createServerClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const { data: s } = await sb.from('sim_session_captures')
      .select('*').eq('id', session_id).eq('user_id', user.id).single()
    if (!s) return NextResponse.json({ error: 'session not found' }, { status: 404 })

    // Look up parsed Coach Dave setups for this user matching the same car
    // and track — they give the AI actual numeric reference values to compare
    // the current setup against.
    const car  = s.car_name  || ''
    const track = s.track_name || ''
    let referenceSetups: any[] = []
    try {
      const { data } = await sb.from('sim_setups_parsed')
        .select('filename, season, car_name, track_name, session_type, version, params, parse_score')
        .eq('user_id', user.id)
        .or(`car_name.ilike.%${car.split(' ')[0]}%,track_name.ilike.%${track.split(' ')[0]}%`)
        .order('ts', { ascending: false })
        .limit(6)
      referenceSetups = data || []
    } catch {}

    // Also pull lap traces for telemetry context (best lap min/max speed etc.)
    let traceSummary: any = null
    try {
      const { data: traces } = await sb.from('sim_lap_traces')
        .select('lap_number, lap_time, sample_count')
        .eq('user_id', user.id)
        .eq('car', car)
        .eq('track', track)
        .order('lap_time', { ascending: true })
        .limit(5)
      if (traces && traces.length) {
        traceSummary = {
          fastest_laps: traces.map(t => ({ lap: t.lap_number, time: t.lap_time })),
        }
      }
    } catch {}

    const prompt = `You are CHIEF, an elite race engineer. Analyze this iRacing session + setup and recommend SPECIFIC numeric changes for more speed. You have access to the actual parsed values from the driver's Coach Dave Delta library — USE THEM as reference points.

==== SESSION ====
CAR: ${s.car_name}
TRACK: ${s.track_name} ${s.layout_name || ''}
BEST LAP: ${s.best_lap_time || 'unknown'}
INCIDENTS: ${s.incidents || 0}
WEATHER: ${JSON.stringify(s.weather_json || {})}

==== TRACE SUMMARY ====
${JSON.stringify(traceSummary, null, 2)}

==== CURRENT SETUP (in-game iRacing settings if captured) ====
${JSON.stringify(s.iracing_settings_json || {}, null, 2)}

==== REFERENCE: Coach Dave Delta setups the driver owns ====
${
  referenceSetups.length
    ? referenceSetups.map((r, i) =>
        `${i+1}. ${r.filename}  (${r.car_name || '?'} @ ${r.track_name || '?'} · ${r.session_type || ''}, parse_score=${r.parse_score})\n` +
        `   params: ${JSON.stringify(r.params)}`
      ).join('\n\n')
    : '(none — driver has no parsed Coach Dave setups yet for this car/track)'
}

==== LAP TIMES ====
${JSON.stringify(s.laps_data?.slice?.(0, 10) || [], null, 2)}

Compare the CURRENT setup to the REFERENCE setups, identify the biggest deltas, and recommend specific numeric changes. If the driver has a Coach Dave setup for this exact car/track that they aren't using, RECOMMEND IT BY FILENAME first.

Return STRICT JSON:
{
  "diagnosis": "one sentence — what the data + setup tell you about car behavior",
  "use_existing_setup": "filename of a Coach Dave file in the driver's library that's a better starting point, or null if none applies",
  "top_changes": [
    { "area": "Front camber LF", "current": "-3.0", "suggested": "-3.4", "reason": "Coach Dave Kern R01 runs -3.4° here. Adds front bite for the heavy-braking entries.", "expected_gain": "1-2 tenths" },
    { "area": "...", "current": "...", "suggested": "...", "reason": "...", "expected_gain": "..." }
  ],
  "warnings": ["any safety/durability concerns"],
  "summary": "one paragraph driver-friendly explanation, referencing specific Coach Dave files when relevant"
}

Output ONLY the JSON.`

    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = completion.content[0].type === 'text' ? completion.content[0].text : ''
    let parsed: any
    try {
      parsed = JSON.parse(text.replace(/^```(?:json)?\n?/, '').replace(/\n?```\s*$/, '').trim())
    } catch {
      parsed = { diagnosis: text }
    }
    return NextResponse.json({ ok: true, ...parsed })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
