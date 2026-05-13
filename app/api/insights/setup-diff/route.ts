// /api/insights/setup-diff — compare two sessions' setup snapshots side-by-side.
// Accepts ?a=<sessionId>&b=<sessionId>. Pulls setup_snapshot_json from both,
// flattens nested keys, and returns a diff with delta + best-lap info.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

function flatten(obj: any, prefix = '', out: Record<string, any> = {}): Record<string, any> {
  if (!obj || typeof obj !== 'object') return out
  for (const [k, v] of Object.entries(obj)) {
    if (k === 'UpdateCount') continue
    const path = prefix ? `${prefix}.${k}` : k
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      flatten(v, path, out)
    } else {
      out[path] = v
    }
  }
  return out
}

function num(v: any): number | null {
  if (v == null) return null
  if (typeof v === 'number') return v
  const s = String(v).trim()
  const m = s.match(/-?[\d.]+/)
  return m ? parseFloat(m[0]) : null
}

export async function GET(req: Request) {
  try {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

    const url = new URL(req.url)
    const aId = url.searchParams.get('a')
    const bId = url.searchParams.get('b')
    if (!aId || !bId) return NextResponse.json({ error: 'a and b session IDs required' }, { status: 400 })

    const [aRes, bRes] = await Promise.all([
      sb.from('sim_session_captures').select('id, car_name, track_name, started_at, best_lap_time, setup_snapshot_json, setup_name, total_laps').eq('id', aId).eq('user_id', user.id).single(),
      sb.from('sim_session_captures').select('id, car_name, track_name, started_at, best_lap_time, setup_snapshot_json, setup_name, total_laps').eq('id', bId).eq('user_id', user.id).single(),
    ])

    const a = aRes.data, b = bRes.data
    if (!a || !b) return NextResponse.json({ error: 'one or both sessions not found' }, { status: 404 })

    const flatA = flatten(a.setup_snapshot_json || {})
    const flatB = flatten(b.setup_snapshot_json || {})
    const allKeys = Array.from(new Set([...Object.keys(flatA), ...Object.keys(flatB)])).sort()

    interface Row { key: string; group: string; a: any; b: any; aNum: number | null; bNum: number | null; delta: number | null; same: boolean }
    const rows: Row[] = allKeys.map(k => {
      const av = flatA[k], bv = flatB[k]
      const aN = num(av), bN = num(bv)
      const delta = (aN != null && bN != null) ? bN - aN : null
      const same = String(av) === String(bv)
      const group = k.split('.')[0] || 'Misc'
      return { key: k, group, a: av, b: bv, aNum: aN, bNum: bN, delta, same }
    })

    // Group + sort: changed rows first inside each group
    const groups: Record<string, Row[]> = {}
    for (const r of rows) {
      if (!groups[r.group]) groups[r.group] = []
      groups[r.group].push(r)
    }
    for (const g of Object.values(groups)) {
      g.sort((x, y) => (x.same === y.same ? x.key.localeCompare(y.key) : x.same ? 1 : -1))
    }

    const lapDelta = (a.best_lap_time && b.best_lap_time) ? (b.best_lap_time - a.best_lap_time) : null

    return NextResponse.json({
      ok: true,
      a: { id: a.id, car: a.car_name, track: a.track_name, started_at: a.started_at, best_lap_time: a.best_lap_time, setup_name: a.setup_name, total_laps: a.total_laps },
      b: { id: b.id, car: b.car_name, track: b.track_name, started_at: b.started_at, best_lap_time: b.best_lap_time, setup_name: b.setup_name, total_laps: b.total_laps },
      lapDelta,
      groups: Object.entries(groups).map(([name, items]) => ({
        name,
        items,
        changedCount: items.filter(r => !r.same).length,
      })),
      changedTotal: rows.filter(r => !r.same).length,
      totalKeys: rows.length,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
