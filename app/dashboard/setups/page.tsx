'use client'
import { useEffect, useMemo, useState } from 'react'
import { Search, Download, Cloud, CloudOff, Loader2, FileText, Trophy } from 'lucide-react'

type Setup = {
  id: string
  filename: string
  source: string | null
  season: string | null
  car_code: string | null
  car_name: string | null
  track_code: string | null
  track_name: string | null
  session_type: string | null
  version: number | null
  params: Record<string, any> | null
  parse_score: number | null
  storage_path: string | null
  file_size: number | null
  ts: string
}

type ListResponse = {
  ok: boolean
  setups: Setup[]
  total: number
  facets: { carCodes: string[]; trackCodes: string[]; sTypes: string[] }
  stats: { totalOnPage: number; archived: number; parsed: number }
}

const fmtSize = (n: number | null) => {
  if (!n) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1024 / 1024).toFixed(2)} MB`
}

const typeBadge = (t: string | null) => {
  const map: Record<string, { bg: string; color: string; short: string }> = {
    Race:        { bg: '#ef444433', color: '#ff8080', short: 'R' },
    Practice:    { bg: '#39ff1422', color: '#39ff14', short: 'P' },
    Qualifying:  { bg: '#f5c51833', color: '#f5c518', short: 'Q' },
  }
  const def = { bg: '#444', color: '#aaa', short: t?.[0] || '?' }
  const s = map[t || ''] || def
  return (
    <span className="inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold"
          style={{ background: s.bg, color: s.color }}>{s.short}</span>
  )
}

export default function SetupsLibraryPage() {
  const [data, setData] = useState<ListResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [q, setQ] = useState('')
  const [car, setCar] = useState('')
  const [track, setTrack] = useState('')
  const [stype, setSType] = useState('')
  const [page, setPage] = useState(0)
  const [downloading, setDownloading] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const params = new URLSearchParams()
    if (q)     params.set('q', q)
    if (car)   params.set('car', car)
    if (track) params.set('track', track)
    if (stype) params.set('type', stype)
    if (page)  params.set('page', String(page))
    fetch('/api/setups/list?' + params.toString())
      .then(r => r.json())
      .then(j => { if (!cancelled) { setData(j); setLoading(false) } })
      .catch(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [q, car, track, stype, page])

  const stats = useMemo(() => {
    if (!data) return null
    return data.stats
  }, [data])

  async function downloadOne(filename: string) {
    setDownloading(filename)
    try {
      const r = await fetch('/api/setups/download-url?filename=' + encodeURIComponent(filename))
      const j = await r.json()
      if (j.ok && j.url) {
        const a = document.createElement('a')
        a.href = j.url; a.download = j.filename || filename
        document.body.appendChild(a); a.click(); a.remove()
      } else {
        alert(j.error || 'Download failed')
      }
    } finally {
      setDownloading(null)
    }
  }

  return (
    <div className="space-y-4 animate-in">

      <div className="chief-panel-glow p-6 rounded-lg">
        <div className="chief-accent-line mb-4" />
        <h1 className="font-display text-3xl text-white tracking-wide">SETUP LIBRARY</h1>
        <p className="text-[#888] text-sm mt-1">
          Every Coach Dave / Maconi / PRS / RKM .sto file CHIEF has archived from your machine — backed up to the cloud so you keep them forever, even if you cancel CDA.
        </p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <div className="chief-panel p-4 rounded-lg">
          <div className="text-[10px] uppercase tracking-wide text-[#888]">Total Setups</div>
          <div className="font-display text-2xl text-white mt-1">{data?.total ?? '—'}</div>
        </div>
        <div className="chief-panel p-4 rounded-lg">
          <div className="text-[10px] uppercase tracking-wide text-[#888]">Cloud-backed</div>
          <div className="font-display text-2xl text-[#00e5ff] mt-1">{stats?.archived ?? '—'}</div>
          <div className="text-[10px] text-[#666] mt-1">on this page</div>
        </div>
        <div className="chief-panel p-4 rounded-lg">
          <div className="text-[10px] uppercase tracking-wide text-[#888]">Cars</div>
          <div className="font-display text-2xl text-[#f5c518] mt-1">{data?.facets?.carCodes?.length ?? '—'}</div>
        </div>
        <div className="chief-panel p-4 rounded-lg">
          <div className="text-[10px] uppercase tracking-wide text-[#888]">Tracks</div>
          <div className="font-display text-2xl text-[#39ff14] mt-1">{data?.facets?.trackCodes?.length ?? '—'}</div>
        </div>
      </div>

      <div className="chief-panel p-3 rounded-lg flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-2 bg-[#0f1218] rounded px-3 py-2 flex-1 min-w-[200px]">
          <Search size={14} className="text-[#666]" />
          <input value={q} onChange={e => { setPage(0); setQ(e.target.value) }}
                 placeholder="Search filename…"
                 className="bg-transparent outline-none text-sm text-white w-full" />
        </div>
        <select value={car} onChange={e => { setPage(0); setCar(e.target.value) }}
                className="bg-[#0f1218] text-sm text-white rounded px-3 py-2 border border-[#1f2733]">
          <option value="">All Cars</option>
          {(data?.facets?.carCodes || []).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <select value={track} onChange={e => { setPage(0); setTrack(e.target.value) }}
                className="bg-[#0f1218] text-sm text-white rounded px-3 py-2 border border-[#1f2733]">
          <option value="">All Tracks</option>
          {(data?.facets?.trackCodes || []).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={stype} onChange={e => { setPage(0); setSType(e.target.value) }}
                className="bg-[#0f1218] text-sm text-white rounded px-3 py-2 border border-[#1f2733]">
          <option value="">All Types</option>
          {(data?.facets?.sTypes || []).map(t => <option key={t} value={t}>{t}</option>)}
        </select>
        {(q || car || track || stype) && (
          <button onClick={() => { setQ(''); setCar(''); setTrack(''); setSType(''); setPage(0) }}
                  className="text-xs text-[#888] hover:text-white px-2">Clear</button>
        )}
      </div>

      <div className="chief-panel rounded-lg overflow-hidden">
        <div className="grid grid-cols-12 gap-2 px-4 py-2 text-[10px] uppercase tracking-wider text-[#666] border-b border-[#1f2733]">
          <div className="col-span-5">Filename</div>
          <div className="col-span-1 text-center">Type</div>
          <div className="col-span-2">Car</div>
          <div className="col-span-2">Track</div>
          <div className="col-span-1">Season</div>
          <div className="col-span-1 text-right">Size</div>
        </div>
        {loading && (
          <div className="flex items-center justify-center gap-2 p-10 text-[#666]">
            <Loader2 size={16} className="animate-spin" /> Loading library…
          </div>
        )}
        {!loading && (data?.setups || []).length === 0 && (
          <div className="p-10 text-center text-[#666] text-sm">
            No setups yet. Run <code className="bg-[#0f1218] px-1.5 py-0.5 rounded text-[#aaa]">CHIEF-DO-SETUPS.bat</code> on your PC to archive and upload your Coach Dave library.
          </div>
        )}
        {!loading && (data?.setups || []).map(s => (
          <div key={s.id} className="grid grid-cols-12 gap-2 px-4 py-2 text-sm border-b border-[#1f2733] hover:bg-[#11151c] transition items-center">
            <div className="col-span-5 truncate flex items-center gap-2" title={s.filename}>
              {s.storage_path
                ? <Cloud size={14} className="text-[#00e5ff] flex-shrink-0" />
                : <CloudOff size={14} className="text-[#444] flex-shrink-0" />}
              <span className="text-white truncate">{s.filename}</span>
            </div>
            <div className="col-span-1 flex justify-center">{typeBadge(s.session_type)}</div>
            <div className="col-span-2 text-[#ccc] truncate" title={s.car_name || s.car_code || ''}>
              {s.car_code || '—'}
            </div>
            <div className="col-span-2 text-[#ccc] truncate" title={s.track_name || s.track_code || ''}>
              {s.track_name || s.track_code || '—'}
            </div>
            <div className="col-span-1 text-[#888]">{s.season || '—'}</div>
            <div className="col-span-1 text-right flex items-center justify-end gap-2">
              <span className="font-mono-chief text-[10px] text-[#888]">{fmtSize(s.file_size)}</span>
              {s.storage_path && (
                <button onClick={() => downloadOne(s.filename)} disabled={downloading === s.filename}
                        className="p-1 rounded bg-[#0f1218] border border-[#1f2733] hover:bg-[#1f2733] disabled:opacity-50"
                        title="Download">
                  {downloading === s.filename
                    ? <Loader2 size={12} className="animate-spin" />
                    : <Download size={12} />}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {data && data.total > (data.pageSize || 100) && (
        <div className="flex items-center justify-between text-xs text-[#888]">
          <div>Showing {page * (data.pageSize || 100) + 1}–{Math.min(data.total, (page + 1) * (data.pageSize || 100))} of {data.total}</div>
          <div className="flex gap-2">
            <button disabled={page === 0} onClick={() => setPage(p => Math.max(0, p - 1))}
                    className="px-3 py-1 rounded bg-[#0f1218] border border-[#1f2733] disabled:opacity-40">Prev</button>
            <button disabled={(page + 1) * (data.pageSize || 100) >= data.total} onClick={() => setPage(p => p + 1)}
                    className="px-3 py-1 rounded bg-[#0f1218] border border-[#1f2733] disabled:opacity-40">Next</button>
          </div>
        </div>
      )}
    </div>
  )
}
