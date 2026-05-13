// Practice Plan Generator — looks at recent sessions, builds a personalized practice plan.
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: Request) {
  try {
    const sb = createServerClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const { car, track } = await req.json().catch(() => ({}))

    let q = sb.from('sim_session_captures')
      .select('*')
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .limit(15)
    if (car) q = q.eq('car_name', car)
    if (track) q = q.eq('track_name', track)

    const { data: sessions } = await q

    if (!sessions || sessions.length === 0) {
      return NextResponse.json({
        ok: true,
        headline: 'Need at least one session to build a plan.',
        drills: [],
      })
    }

    const ctx = sessions.slice(0, 8).map((s: any) => ({
      car: s.car_name,
      track: s.track_name,
      best_lap: s.best_lap_time,
      laps: s.total_laps,
      incidents: s.incidents,
      sectors: s.laps_data?.slice?.(0, 3),
    }))

    const prompt = `You are CHIEF, an elite driver coach. Look at this driver's recent sessions and build a personalized practice plan focused on the highest-impact weaknesses.

RECENT SESSIONS (newest first):
${JSON.stringify(ctx, null, 2)}

Return STRICT JSON:
{
  "headline": "one sentence — the single biggest weakness to fix",
  "drills": [
    {
      "name": "Brake-release smoothness drill",
      "duration_min": 20,
      "objective": "what you should be able to do after the drill",
      "instructions": ["step 1", "step 2", "step 3"],
      "focus_metric": "what to watch in telemetry"
    }
  ],
  "next_session_target": "specific lap-time or behavior goal for next outing"
}

Build 3-5 drills, ranked by impact. Be specific — use this driver's actual data.

Output ONLY the JSON.`

    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 2000,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = completion.content[0].type === 'text' ? completion.content[0].text : ''
    let parsed: any
    try {
      parsed = JSON.parse(text.replace(/^```(?:json)?\n?/, '').replace(/\n?```\s*$/, '').trim())
    } catch {
      parsed = { headline: text, drills: [] }
    }
    return NextResponse.json({ ok: true, ...parsed })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
