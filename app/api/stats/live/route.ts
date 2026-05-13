// /api/stats/live — returns the count of distinct users with daemon activity
// in the last 5 minutes. Drives the "Chief is coaching N drivers right now"
// counter on the landing page.

import { NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'
export const revalidate = 30

export async function GET() {
  try {
    const svc = createServiceClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const fiveMinAgo = new Date(Date.now() - 5 * 60_000).toISOString()
    const { data, error } = await svc.from('sim_lap_traces')
      .select('user_id', { count: 'exact' })
      .gte('ts', fiveMinAgo)
    if (error) return NextResponse.json({ active: 0 })
    const unique = new Set((data || []).map((r: any) => r.user_id))
    return NextResponse.json({ active: unique.size })
  } catch (e: any) {
    return NextResponse.json({ active: 0 })
  }
}
