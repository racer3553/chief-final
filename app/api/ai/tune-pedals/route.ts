// AI Pedal Tuner — analyzes SimPro Manager / Sim Magic pedal settings.
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: Request) {
  try {
    const { session_id, settings } = await req.json()
    const sb = createServerClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    let s: any = null
    if (session_id) {
      const { data } = await sb.from('sim_session_captures').select('*').eq('id', session_id).eq('user_id', user.id).single()
      s = data
    }

    const pedals = settings || s?.pedal_settings_json?.screenshot_parsed || s?.pedal_settings_json || {}
    const prompt = `You are an elite pedal tuner. Analyze these SimPro Manager / Sim Magic pedal settings for trail-braking consistency and throttle modulation.

CAR: ${s?.car_name || 'unknown'}
TRACK: ${s?.track_name || 'unknown'}
CURRENT PEDAL SETTINGS:
${JSON.stringify(pedals, null, 2)}

Return STRICT JSON:
{
  "diagnosis": "What the current curves do to braking/throttle behavior",
  "top_changes": [
    { "setting": "Brake force curve", "current": "...", "suggested": "...", "reason": "...", "expected_outcome": "..." },
    { "setting": "Brake deadzone", "current": "...", "suggested": "...", "reason": "...", "expected_outcome": "..." },
    { "setting": "Throttle response curve", "current": "...", "suggested": "...", "reason": "...", "expected_outcome": "..." }
  ],
  "summary": "what the new curves should give the driver — quoted in lap-time terms"
}

Output ONLY the JSON.`

    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1200,
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
