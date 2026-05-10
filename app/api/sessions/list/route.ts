// app/api/sessions/list/route.ts
// Paginated, filterable list of the signed-in user's captured sessions.
// Supports query params: ?q=<search>&track=<exact>&car=<exact>&type=<Practice|Race|Qualify>&page=0&pageSize=50
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const PAGE_SIZE_DEFAULT = 50
const PAGE_SIZE_MAX = 200

export async function GET(req: Request) {
  try {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const url = new URL(req.url)
    const q     = (url.searchParams.get('q') || '').trim()
    const track = (url.searchParams.get('track') || '').trim()
    const car   = (url.searchParams.get('car') || '').trim()
    const type  = (url.searchParams.get('type') || '').trim()
    const page  = Math.max(0, parseInt(url.searchParams.get('page') || '0', 10))
    const ps    = Math.min(PAGE_SIZE_MAX, Math.max(1, parseInt(url.searchParams.get('pageSize') || `${PAGE_SIZE_DEFAULT}`, 10)))
    const from  = page * ps
    const to    = from + ps - 1

    let query = sb
      .from('sim_session_captures')
      .select('id, car_name, track_name, layout_name, session_type, started_at, ended_at, best_lap_time, best_lap_number, total_laps, incidents, sim_name', { count: 'exact' })
      .eq('user_id', user.id)
      .order('started_at', { ascending: false })
      .range(from, to)

    if (track) query = query.eq('track_name', track)
    if (car)   query = query.eq('car_name', car)
    if (type)  query = query.eq('session_type', type)
    if (q)     query = query.or(`car_name.ilike.%${q}%,track_name.ilike.%${q}%,layout_name.ilike.%${q}%`)

    const { data, error, count } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Pull distinct tracks/cars for filter dropdowns
    const { data: facets } = await sb
      .from('sim_session_captures')
      .select('track_name, car_name, session_type')
      .eq('user_id', user.id)
      .limit(500)
    const tracks = Array.from(new Set((facets || []).map(r => r.track_name).filter(Boolean))).sort()
    const cars   = Array.from(new Set((facets || []).map(r => r.car_name).filter(Boolean))).sort()
    const types  = Array.from(new Set((facets || []).map(r => r.session_type).filter(Boolean))).sort()

    return NextResponse.json({
      ok: true,
      sessions: data || [],
      total: count || 0,
      page, pageSize: ps,
      facets: { tracks, cars, types },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
