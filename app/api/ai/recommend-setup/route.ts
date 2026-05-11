// chief-final/app/api/ai/recommend-setup/route.ts
// "Find the best setup for current conditions" — finds matching past sessions
// and asks Claude which one to try based on weather/track/car similarity.
import Anthropic from '@anthropic-ai/sdk'
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! })

export async function POST(req: Request) {
  try {
    const { car, track, conditions } = await req.json()
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    let q = sb.from('sim_session_captures')
      .select('id, car_name, track_name, started_at, best_lap_time, weather_json, hardware_scan, coach_dave_data, iracing_settings_json')
      .eq('user_id', user.id)
      .not('best_lap_time', 'is', null)
      .order('best_lap_time', { ascending: true })
      .limit(15)
    if (car) q = q.ilike('car_name', `%${car}%`)
    if (track) q = q.ilike('track_name', `%${track}%`)
    const { data: sessions } = await q
    if (!sessions || sessions.length === 0) {
      return NextResponse.json({ answer: `No prior sessions found for ${car || 'any car'} at ${track || 'any track'}. Race once to build setup history.` })
    }

    const ctx = sessions.map((s: any) => ({
      id: s.id,
      date: s.started_at,
      best_lap: s.best_lap_time,
      conditions: s.weather_json,
      iracing_setups: (s.iracing_settings_json?.setup_files || []).map((f: any) => f.name),
      coach_dave_setups: (s.coach_dave_data?.cdd_setup_files || s.coach_dave_data?.setups || []).map((f: any) => f.name),
      simucube_active: s.hardware_scan?.wheels?.simucube?.active_profile?.name,
      simucube_values: s.hardware_scan?.wheels?.simucube?.active_profile_values,
    }))

    const completion = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 800,
      system: `You are Chief, an elite race engineer. The driver is about to race ${car || 'a car'} at ${track || 'a track'} with these conditions: ${JSON.stringify(conditions || {})}. Look at their past sessions below, find the one with the BEST lap time + most similar conditions, and recommend it. Be specific: name the exact setup file and the wheel profile. If conditions differ (e.g. track temp), recommend ONE adjustment to the closest setup. Be direct, under 100 words.`,
      messages: [{ role: 'user', content: `Past sessions (sorted by lap time):\n${JSON.stringify(ctx, null, 2)}\n\nWhich setup should I try? What should I adjust?` }],
    })

    const answer = completion.content[0].type === 'text' ? completion.content[0].text : ''
    return NextResponse.json({ answer, considered: ctx.length })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
