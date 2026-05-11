// AI Lap/Session Comparison — find where time was won/lost.
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: Request) {
  try {
    const { session_a_id, session_b_id } = await req.json()
    const sb = createServerClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const [{ data: a }, { data: b }] = await Promise.all([
      sb.from('sim_session_captures').select('*').eq('id', session_a_id).eq('user_id', user.id).single(),
      sb.from('sim_session_captures').select('*').eq('id', session_b_id).eq('user_id', user.id).single(),
    ])
    if (!a || !b) return NextResponse.json({ error: 'sessions not found' }, { status: 404 })

    const prompt = `Compare these two sessions and explain where time was won or lost.

SESSION A (${a.car_name} @ ${a.track_name})
Best Lap: ${a.best_lap_time}
Setup: ${JSON.stringify(a.iracing_settings_json || {}, null, 2)}
FFB: ${JSON.stringify(a.wheelbase_settings_json || {}, null, 2)}
Laps: ${JSON.stringify(a.laps_data?.slice?.(0, 5) || [])}

SESSION B (${b.car_name} @ ${b.track_name})
Best Lap: ${b.best_lap_time}
Setup: ${JSON.stringify(b.iracing_settings_json || {}, null, 2)}
FFB: ${JSON.stringify(b.wheelbase_settings_json || {}, null, 2)}
Laps: ${JSON.stringify(b.laps_data?.slice?.(0, 5) || [])}

Return STRICT JSON:
{
  "headline": "one sentence — which was faster and by how much",
  "what_changed": ["specific list of differences in setup/FFB/pedals"],
  "why_it_mattered": ["each difference mapped to lap-time impact"],
  "recommendation": "which setup to keep, what to merge from the other"
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
      parsed = { headline: text }
    }
    return NextResponse.json({ ok: true, ...parsed })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
