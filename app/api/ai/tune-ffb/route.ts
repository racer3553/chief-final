// AI FFB Tuner — analyzes Simucube True Drive settings and suggests changes for feel + speed.
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

    const ffb = settings || s?.wheelbase_settings_json?.screenshot_parsed || s?.wheelbase_settings_json || {}
    const prompt = `You are an elite Simucube True Drive tuner. Analyze these wheelbase settings and recommend specific changes for better feel and faster lap times.

CAR: ${s?.car_name || 'unknown'}
TRACK: ${s?.track_name || 'unknown'}
CURRENT SIMUCUBE SETTINGS:
${JSON.stringify(ffb, null, 2)}

Consider: max_strength, damping, friction, inertia, reconstruction filter, slew rate, torque bandwidth, ultra-low-latency. Different cars want different feel — open-wheelers want sharper, GT3 wants progressive, dirt wants damped.

Return STRICT JSON:
{
  "diagnosis": "what the current settings would feel like and what's wrong",
  "top_changes": [
    { "setting": "Damping", "current": "...", "suggested": "...", "reason": "...", "feel_change": "..." },
    { "setting": "Reconstruction Filter", "current": "...", "suggested": "...", "reason": "...", "feel_change": "..." },
    { "setting": "Min Force", "current": "...", "suggested": "...", "reason": "...", "feel_change": "..." }
  ],
  "summary": "one paragraph explaining what the new feel should give the driver"
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
