// /api/daemon/status — returns whether the user's desktop daemon has pushed
// anything recently. Feeds the floating mascot indicator.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ online: false, lastSeen: null, iracing: false })

    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString()
    const { data: trace } = await sb.from('sim_lap_traces')
      .select('ts, car, track, lap_number')
      .eq('user_id', user.id)
      .order('ts', { ascending: false })
      .limit(1)
      .maybeSingle()

    const lastSeen = trace?.ts || null
    const online = !!(lastSeen && lastSeen >= fiveMinAgo)

    return NextResponse.json({
      online,
      lastSeen,
      iracing: online,
      car: trace?.car || null,
      track: trace?.track || null,
      lap: trace?.lap_number ?? null,
    })
  } catch (e: any) {
    return NextResponse.json({ online: false, lastSeen: null, iracing: false, error: e.message })
  }
}
