// AI Session Breakdown — generates a coaching narrative for a session.
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const sb = createServerClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    const { data: session, error } = await sb
      .from('sim_session_captures')
      .select('*')
      .eq('id', params.id)
      .eq('user_id', user.id)
      .single()
    if (error || !session) return NextResponse.json({ error: 'not found' }, { status: 404 })

    if (!process.env.ANTHROPIC_API_KEY) {
      return NextResponse.json({ error: 'AI unavailable' }, { status: 500 })
    }

    // Build a compact context the model can reason over
    const ctx = {
      car: session.car_name,
      track: session.track_name,
      layout: session.layout_name,
      best_lap: session.best_lap_time,
      total_laps: session.total_laps,
      incidents: session.incidents,
      laps: session.laps_data,
      simucube: session.wheelbase_settings_json,
      iracing_setup: session.iracing_settings_json,
      pedals: session.pedal_settings_json,
      coach_dave: session.coach_dave_data,
      hardware: session.hardware_scan,
    }

    const prompt = `You are CHIEF, the world's best AI race engineer. The driver just ran this session:

${JSON.stringify(ctx, null, 2)}

Give a CONCISE coaching breakdown in this exact format (markdown):

**HEADLINE** — one bold sentence summarizing the session's story.

**WHAT WORKED** — 2-3 specific things from the data that helped speed/consistency.

**WHERE TIME WENT** — 2-3 corners/areas where time was likely lost (use lap data if available).

**3 CHANGES FOR NEXT SESSION** — Numbered, ranked by expected impact in tenths of a second:
1. [biggest impact change] — [what to do, why, expected gain]
2. [second] — [what, why, gain]
3. [third] — [what, why, gain]

**MENTAL CUE** — one short reminder for the next outing.

Be specific to THIS car at THIS track. Reference actual numbers from the data when possible. No fluff.`

    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 1500,
      messages: [{ role: 'user', content: prompt }],
    })
    const text = completion.content[0].type === 'text' ? completion.content[0].text : ''

    return NextResponse.json({ ok: true, breakdown: text })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
