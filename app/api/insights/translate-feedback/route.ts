// /api/insights/translate-feedback — turn driver chip-selections into setup adjustments.
// Body: { car, track, chips: string[], freeText?: string }
// Returns: { summary, adjustments: [{change, why, priority}], warnings }

import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export const dynamic = 'force-dynamic'
export const maxDuration = 45

export async function POST(req: Request) {
  try {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const body = await req.json()
    const chips: string[] = Array.isArray(body.chips) ? body.chips.slice(0, 20) : []
    const freeText = String(body.freeText || '').slice(0, 1000)
    const car = String(body.car || '').slice(0, 80)
    const track = String(body.track || '').slice(0, 80)

    if (chips.length === 0 && !freeText) {
      return NextResponse.json({ error: 'pick at least one symptom chip or add a note' }, { status: 400 })
    }

    // Pull recent setup snapshot for context if available
    let setupCtx: any = null
    try {
      let q = sb.from('sim_session_captures').select('car_name,track_name,setup_snapshot_json,setup_name,best_lap_time,started_at').eq('user_id', user.id).order('started_at', { ascending: false }).limit(1)
      if (car)   q = q.ilike('car_name', `%${car}%`)
      if (track) q = q.ilike('track_name', `%${track}%`)
      const { data } = await q
      if (data && data[0]) setupCtx = data[0]
    } catch {}

    const systemPrompt = `You are Chief, an AI crew chief translating driver feedback into concrete setup adjustments. Output STRICT JSON only (no markdown, no preface):

{
  "summary": "one sentence explaining what the car is doing and the root cause",
  "adjustments": [
    {"change": "imperative adjustment with click count / amount", "why": "physical reason", "priority": 1}
  ],
  "warnings": ["any side-effects to watch for"],
  "verify": "what should happen on track if the fix worked"
}

Rules:
- 3 to 5 adjustments ordered by impact (priority 1 = highest)
- Concrete units: "click", "lb/in", "psi", "deg" — tied to common sim cars
- Pair changes that won't fight each other (e.g. don't both soften FR ARB AND stiffen RR ARB if it's just front grip)
- If the driver describes a corner phase, target that phase: entry → diff preload/brake bias/front bump; mid → ARB/camber/toe; exit → diff coast/throttle/rear toe`

    const userPrompt = `Car: ${car || 'unspecified'}
Track: ${track || 'unspecified'}
Symptoms (chips): ${chips.length ? chips.join(', ') : 'none'}
Driver note: ${freeText || '(none)'}
${setupCtx?.setup_snapshot_json ? 'Most recent setup snapshot keys (for reference, NOT a full dump): ' + Object.keys(setupCtx.setup_snapshot_json).slice(0, 30).join(', ') : ''}

Translate the symptoms into a JSON setup-adjustment plan.`

    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1200,
      system: systemPrompt,
      messages: [{ role: 'user', content: userPrompt }],
    })

    const raw = completion.content[0].type === 'text' ? completion.content[0].text : ''
    let parsed: any = null
    try {
      const m = raw.match(/\{[\s\S]*\}/)
      if (m) parsed = JSON.parse(m[0])
    } catch {}

    return NextResponse.json({
      ok: true,
      input: { chips, freeText, car, track },
      result: parsed || { summary: raw.slice(0, 300), raw, parse_error: true, adjustments: [] },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
