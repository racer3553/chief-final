'use client'
import { useEffect, useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, Filter, Trophy, Clock, AlertTriangle, ChevronRight, Loader2 } from 'lucide-react'

type Session = {
  id: string
  car_name: string | null
  track_name: string | null
  layout_name: string | null
  session_type: string | null
  started_at: string | null
  ended_at: string | null
  best_lap_time: number | null
  best_lap_number: number | null
  total_laps: number | null
  incidents: number | null
  sim_name: string | null
}

type ListResponse = {
  ok: boolean
  sessions: Session[]
  total: number
  facets: { tracks: string[]; cars: string[]; types: string[] }
}

const fmtTime = (s: number | null) => {
  if (!s || s <= 0) return '—'
  const m = Math.floor(s / 60)
  const sec = s - m * 60
  return m > 0 ? `${m}:${sec.toFixed(3).padStart(6, '0')}` : sec.toFixed(3)
}

const fmtDate = (iso: string | null) => {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

const typeBadge = (t: string | null) => {
  const map: Record<string, { bg: string; color: string; short: string }> = {
    'Race':           { bg: '#ef444433', color: '#ff8080', short: 'R' },
    'Practice':       { bg: '#39ff1422', color: '#39ff14', short: 'P' },
    'Lone Qualify':   { bg: '#f5c51833', color: '#f5c518', short: 'Q' },
    'Open Qualify':   { bg: '#f5c51833', color: '#f5c518', short: 'Q' },
    'Warmup':         { bg: '#888', color: '#ccc', short: 'W' },
    'Heat Race':      { bg: '#ef444433', color: '#ff8080', short: 'H' },
  }
  const def = { bg: '#444', color: '#aaa', short: t?.[0] || '?' }
  const s = map[t || ''] || def
  return (
    <span className="inline-flex items-center justify-center w-7 h-7 rounded-full text-xs font-bold"
          style={{ background: s.bg, color: s.color }}>{s.short}</span>
  )
}

export default function SessionsPage() {
  const [data, setData] = useState<ListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [track, setTrack] = useState('')
  const [car, setCar] = useState('')
  const [type, setType] = useState('')
  const [page, setPage] = useState(0)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const params = new URLSearchParams()
    if (q)     params.set('q', q)
    if (track) params.set('track', track)
    if (car)   params.set('car', car)
    if (type)  params.set('type', type)
    if (page)  params.set('page', String(page))
    fetch('/api/sessions/list?' + params.toString())
      .then(r => r.json())
      .then(j => { if (!cancelled) { setData(j); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [q, track, car, type, page])

  const stats = useMemo(() => {
    if (!data?.sessions) return { totalLaps: 0, totalIncidents: 0, bestLap: null as number | null, byTrack: 0 }
    let lap = 0, inc = 0, best: number | null = null
    for (const s of data.sessions) {
      lap += s.total_laps || 0
      inc += s.incidents || 0
      if (s.best_lap_time && s.best_lap_time > 0 && (best === null || s.best_lap_time < best)) best = s.best_lap_time
    }
    return { totalLaps: lap, totalIncidents: inc, bestLap: best, byTrack: data.facets?.tracks?.length || 0 }
  }, [data])

  return (
    <div className="space-y-4 animate-in">

      <div className="chief-panel-glow p-6 rounded-lg">
        <div className="chief-accent-line mb-4" />
        <h1 className="font-display text-3xl text-white tracking-wide">SESSIONS</h1>
        <p className="text-[#888] text-sm mt-1">Every lap CHIEF has captured. Click any row to open the telemetry overlay.</p>
      </div>

      {/* Summary chips */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="chief-panel p-4 rounded-lg">
          <div className="text-[10px] uppercase tracking-wide text-[#888]">Total Sessions</div>
          <div className="font-display text-2xl text-white mt-1">{data?.total ?? '—'}</div>
        </div>
        <div className="chief-panel p-4 rounded-lg">
          <div className="text-[10px] uppercase tracking-wide text-[#888]">Total Laps</div>
          <div className="font-display text-2xl text-[#00e5ff] mt-1">{stats.totalLaps}</div>
        </div>
        <div className="chief-panel p-4 rounded-lg">
          <div className="text-[10px] uppercase tracking-wide text-[#888]">Tracks Run</div>
          <div className="font-display text-2xl text-[#f5c518] mt-1">{stats.byTrack}</div>
        </div>
        <div className="chief-panel p-4 rounded-lg">
          <div className="text-[10px] uppercase tracking-wide text-[#888]">Incidents</div>
          <div className="font-display text-2xl text-[#ff2d2d] mt-1">{stats.totalIncidents}</div>
        </div>
      </div>

      {/* Filters */}
      <div className="chief-panel p-3 rounded-lg flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 bg-[#0f1218] rounded px-3 py-2 flex-1 min-w-[200px]">
          <Search size={14} className="text-[#666]" />
          <input
            value={q}
            onChange={e => { setPage(0); setQ(e.target.value) }}
            placeholder="Search car, track, layout…"
            className="bg-transparent outline-none text-sm text-white w-full"
          />
        </div>
        <select value={track} onChange={e => { setPage(0); setTrack(e.target.value) }}
                className="bg-[#0f1218] text-sm text-white rounded px-3 py-2 border border-[#1f2733]">
          <option value="">All Tracks</option>
          {(data?.facets?.tracks || []).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={car} onChange={e => { setPage(0); setCar(e.target.value) }}
                className="bg-[#0f1218] text-sm text-white rounded px-3 py-2 border border-[#1f2733]">
          <option value="">All Cars</option>
          {(data?.facets?.cars || []).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={type} onChange={e => { setPage(0); setType(e.target.value) }}
                className="bg-[#0f1218] text-sm text-white rounded px-3 py-2 border border-[#1f2733]">
          <option value="">All Types</option>
          {(data?.facets?.types || []).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {(q || track || car || type) && (
          <button onClick={() => { setQ(''); setTrack(''); setCar(''); setType(''); setPage(0) }}
                  className="text-xs text-[#888] hover:text-white px-2">Clear</button>
        )}
      </div>

      {/* Table */}
      <div className="chief-panel rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] uppercase tracking-wider text-[#666] border-b border-[#1f2733]">
          <div className="col-span-2">Date</div>
          <div className="col-span-1 text-center">Type</div>
          <div className="col-span-3">Track</div>
          <div className="col-span-3">Car</div>
          <div className="col-span-1 text-center">Laps</div>
          <div className="col-span-1 text-right">Best</div>
          <div className="col-span-1 text-right">Inc.</div>
        </div>
        {loading && (
          <div className="flex items-center justify-center gap-2 p-10 text-[#666]">
            <Loader2 size={16} className="animate-spin" />
            Loading sessions…
          </div>
        )}
        {!loading && (data?.sessions || []).length === 0 && (
          <div className="p-10 text-center text-[#666] text-sm">
            No sessions yet. Run a race with CHIEF capturing — your sessions will appear here.
          </div>
        )}
        {!loading && (data?.sessions || []).map(s => (
          <Link key={s.id} href={`/dashboard/sessions/${s.id}`}
                className="grid grid-cols-12 gap-2 px-4 py-3 text-sm border-b border-[#1f2733] hover:bg-[#11151c] transition group">
            <div className="col-span-2 text-[#aaa]">{fmtDate(s.started_at)}</div>
            <div className="col-span-1 flex justify-center">{typeBadge(s.session_type)}</div>
            <div className="col-span-3 text-white truncate" title={s.track_name || ''}>
              {s.track_name || '—'}
              {s.layout_name && <span className="text-[#666] text-xs ml-1">/ {s.layout_name}</span>}
            </div>
            <div className="col-span-3 text-[#ccc] truncate" title={s.car_name || ''}>{s.car_name || '—'}</div>
            <div className="col-span-1 text-center text-[#00e5ff] font-mono-chief">{s.total_laps ?? 0}</div>
            <div className="col-span-1 text-right text-[#f5c518] font-mono-chief">{fmtTime(s.best_lap_time)}</div>
            <div className="col-span-1 text-right">
              {s.incidents ? (
                <span className="inline-flex items-center gap-1 text-[#ff8080]">
                  <AlertTriangle size={12} />{s.incidents}
                </span>
              ) : <span className="text-[#444]">—</span>}
            </div>
          </Link>
        ))}
      </div>

      {/* Pagination */}
      {data && data.total > (data.pageSize || 50) && (
        <div className="flex items-center justify-between text-xs text-[#888]">
          <div>Showing {page * (data.pageSize || 50) + 1}–{Math.min(data.total, (page + 1) * (data.pageSize || 50))} of {data.total}</div>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}
                    className="px-3 py-1 rounded bg-[#0f1218] border border-[#1f2733] disabled:opacity-40">Prev</button>
            <button disabled={(page + 1) * (data.pageSize || 50) >= data.total} onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1 rounded bg-[#0f1218] border border-[#1f2733] disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  )
}
