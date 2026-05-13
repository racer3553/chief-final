import { NextRequest, NextResponse } from 'next/server'
import { createServerClient } from '@/lib/supabase/server'
import { anthropic, getRaceChiefSystemPrompt, getSimChiefSystemPrompt } from '@/lib/anthropic'

export async function POST(req: NextRequest) {
  try {
    const supabase = createServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check plan / AI asks limit
    const { data: profile } = await supabase
      .from('profiles')
      .select('plan, trial_ends_at, subscription_status')
      .eq('id', user.id)
      .single()

    if (profile?.plan === 'trial' && profile?.trial_ends_at && new Date(profile.trial_ends_at) < new Date()) {
      return NextResponse.json({ error: 'Trial expired. Please upgrade to continue.' }, { status: 402 })
    }

    const { messages, context, mode } = await req.json()

    // Fetch Chief memory: track history + recent changes for this car/track
    let trackHistory = null
    let recentChanges = null

    if (context.setupId || (context.carId && context.trackId)) {
      const carId = context.carId
      const trackId = context.trackId

      const [historyRes, changesRes] = await Promise.all([
        trackId ? supabase
          .from('track_history')
          .select('*, tracks(name)')
          .eq('user_id', user.id)
          .eq('track_id', trackId)
          .order('event_date', { ascending: false })
          .limit(5) : Promise.resolve({ data: null }),

        carId ? supabase
          .from('setup_changes')
          .select('*')
          .eq('user_id', user.id)
          .eq('car_id', carId)
          .order('created_at', { ascending: false })
          .limit(20) : Promise.resolve({ data: null }),
      ])

      trackHistory = historyRes.data
      recentChanges = changesRes.data
    }

    // Build enriched context with memory
    const enrichedContext = {
      ...context,
      trackHistory,
      recentChanges,
    }

    const systemPrompt = mode === 'sim_chief'
      ? getSimChiefSystemPrompt(enrichedContext)
      : getRaceChiefSystemPrompt(enrichedContext)

    // Format messages for Anthropic
    const formattedMessages = messages.map((m: { role: string; content: string }) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }))

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-6',
      max_tokens: 1024,
      system: systemPrompt,
      messages: formattedMessages,
    })

    const responseText = response.content[0].type === 'text' ? response.content[0].text : ''

    // Log conversation for memory
    await supabase.from('ai_conversations').insert({
      user_id: user.id,
      mode,
      context_car_id: context.carId || null,
      context_track_id: context.trackId || null,
      messages: [...messages, { role: 'assistant', content: responseText }],
      updated_at: new Date().toISOString(),
    })

    return NextResponse.json({ response: responseText })
  } catch (error: any) {
    console.error('Chief AI error:', error)
    return NextResponse.json({ error: error.message || 'Chief is offline' }, { status: 500 })
  }
}
