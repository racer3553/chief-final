// app/api/setups/list/route.ts
// Paginated/filterable list of the signed-in user's archived setup files.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(req: Request) {
  try {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const url   = new URL(req.url)
    const q     = (url.searchParams.get('q') || '').trim()
    const car   = (url.searchParams.get('car') || '').trim()
    const track = (url.searchParams.get('track') || '').trim()
    const stype = (url.searchParams.get('type') || '').trim()
    const page  = Math.max(0, parseInt(url.searchParams.get('page') || '0', 10))
    const ps    = Math.min(200, parseInt(url.searchParams.get('pageSize') || '100', 10))
    const from  = page * ps
    const to    = from + ps - 1

    let query = sb.from('sim_setups_parsed')
      .select('id, filename, source, season, car_code, car_name, track_code, track_name, session_type, version, params, parse_score, storage_path, file_size, ts',
              { count: 'exact' })
      .eq('user_id', user.id)
      .order('ts', { ascending: false })
      .range(from, to)
    if (q)     query = query.ilike('filename', `%${q}%`)
    if (car)   query = query.eq('car_code', car)
    if (track) query = query.eq('track_code', track)
    if (stype) query = query.eq('session_type', stype)
    const { data, count, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    // Facets for the filter dropdowns
    const { data: facets } = await sb.from('sim_setups_parsed')
      .select('car_code, car_name, track_code, track_name, session_type')
      .eq('user_id', user.id)
      .limit(2000)
    const carCodes   = Array.from(new Set((facets || []).map(r => r.car_code).filter(Boolean))).sort()
    const trackCodes = Array.from(new Set((facets || []).map(r => r.track_code).filter(Boolean))).sort()
    const sTypes     = Array.from(new Set((facets || []).map(r => r.session_type).filter(Boolean))).sort()

    // Aggregate stats
    const archived = (data || []).filter(r => r.storage_path).length
    const parsed   = (data || []).filter(r => (r.parse_score ?? 0) > 0.05).length

    return NextResponse.json({
      ok: true,
      setups: data || [],
      total: count || 0,
      page, pageSize: ps,
      facets: { carCodes, trackCodes, sTypes },
      stats: { totalOnPage: data?.length || 0, archived, parsed },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
