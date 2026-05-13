'use client'
// /dashboard/setup-diff — side-by-side comparison of two sessions' setup snapshots.
// User picks two sessions from dropdowns; we render every changed parameter
// with delta and a colored arrow. Helps answer: "what did I change and did it work?"

import { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, ArrowLeftRight, ChevronRight, Equal, ArrowDown, ArrowUp, Filter, AlertTriangle } from 'lucide-react'

type Session = {
  id: string
  car_name: string | null
  track_name: string | null
  started_at: string | null
  best_lap_time: number | null
  setup_name?: string | null
}

interface DiffRow {
  key: string
  group: string
  a: any
  b: any
  aNum: number | null
  bNum: number | null
  delta: number | null
  same: boolean
}

interface DiffGroup { name: string; items: DiffRow[]; changedCount: number }

interface DiffResp {
  ok: boolean
  a: Session
  b: Session
  lapDelta: number | null
  groups: DiffGroup[]
  changedTotal: number
  totalKeys: number
  error?: string
}

const fmtTime = (s: number | null | undefined) => {
  if (!s || s <= 0) return '—'
  const m = Math.floor(s / 60)
  const sec = s - m * 60
  return m > 0 ? `${m}:${sec.toFixed(3).padStart(6, '0')}` : sec.toFixed(3)
}

export default function SetupDiffPage() {
  const sp = useSearchParams()
  const [sessions, setSessions] = useState<Session[]>([])
  const [a, setA] = useState<string>(sp?.get('a') || '')
  const [b, setB] = useState<string>(sp?.get('b') || '')
  const [diff, setDiff] = useState<DiffResp | null>(null)
  const [loading, setLoading] = useState(false)
  const [onlyChanged, setOnlyChanged] = useState(true)
  const [err, setErr] = useState<string | null>(null)

  // Load session list
  useEffect(() => {
    fetch('/api/sessions/list?pageSize=200')
      .then(r => r.json())
      .then(j => setSessions((j.sessions || []).filter((s: any) => s.best_lap_time)))
      .catch(() => {})
  }, [])

  // Run diff when both picked
  useEffect(() => {
    if (!a || !b || a === b) { setDiff(null); return }
    setLoading(true); setErr(null)
    fetch(`/api/insights/setup-diff?a=${a}&b=${b}`)
      .then(r => r.json())
      .then(j => {
        if (j.error) { setErr(j.error); setDiff(null) }
        else setDiff(j)
      })
      .catch(e => setErr(e.message))
      .finally(() => setLoading(false))
  }, [a, b])

  const lapDeltaColor = diff?.lapDelta == null ? '#888' : diff.lapDelta < 0 ? '#39ff14' : '#ff8080'

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <header>
        <div className="text-[10px] font-bold tracking-[0.22em] uppercase mb-1" style={{ color: '#f5c518' }}>Setup Diff</div>
        <h1 className="font-display text-3xl text-white tracking-wide">What changed between sessions?</h1>
        <p className="text-sm text-slate-400 mt-1">Pick two sessions to see every setup parameter that moved — and whether it made you faster.</p>
      </header>

      {/* Session pickers */}
      <div className="grid md:grid-cols-2 gap-3">
        <SessionPicker label="Session A (baseline)" value={a} onChange={setA} sessions={sessions} accent="#00e5ff" exclude={b} />
        <SessionPicker label="Session B (compare)"  value={b} onChange={setB} sessions={sessions} accent="#a3ff00" exclude={a} />
      </div>

      {err && (
        <div className="rounded-xl p-4 border flex items-center gap-2"
             style={{ background: 'rgba(255,100,100,0.08)', borderColor: 'rgba(255,100,100,0.25)' }}>
          <AlertTriangle size={16} className="text-red-400" />
          <div className="text-[13px] text-red-300">{err}</div>
        </div>
      )}

      {!a || !b ? (
        <div className="rounded-xl p-8 text-center border" style={{ background: 'rgba(20,20,32,0.6)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <ArrowLeftRight size={28} className="mx-auto mb-2 text-slate-500" />
          <div className="text-slate-400 text-sm">Pick two sessions above to compare setups.</div>
        </div>
      ) : loading ? (
        <div className="flex items-center gap-2 text-[#a3ff00] p-10">
          <Loader2 size={16} className="animate-spin" /> Diffing setups…
        </div>
      ) : diff ? (
        <>
          {/* Headline strip */}
          <div className="rounded-xl p-5 border flex flex-wrap items-center justify-between gap-4"
               style={{ background: 'linear-gradient(135deg, rgba(0,229,255,0.06), rgba(163,255,0,0.04))', borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="flex items-center gap-4 flex-wrap">
              <SessionCell sess={diff.a} accent="#00e5ff" label="A" />
              <ArrowLeftRight size={18} className="text-slate-500" />
              <SessionCell sess={diff.b} accent="#a3ff00" label="B" />
            </div>
            <div className="text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Lap Δ (B − A)</div>
              <div className="font-mono text-2xl font-extrabold" style={{ color: lapDeltaColor }}>
                {diff.lapDelta == null ? '—' : (diff.lapDelta >= 0 ? '+' : '') + diff.lapDelta.toFixed(3) + 's'}
              </div>
              <div className="text-[11px] text-slate-400">
                {diff.changedTotal} of {diff.totalKeys} params changed
              </div>
            </div>
          </div>

          {/* Filter toggle */}
          <div className="flex items-center gap-3">
            <button onClick={() => setOnlyChanged(!onlyChanged)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-bold uppercase tracking-wider border transition"
              style={{
                background: onlyChanged ? '#a3ff0020' : 'transparent',
                borderColor: onlyChanged ? '#a3ff0060' : 'rgba(255,255,255,0.10)',
                color: onlyChanged ? '#a3ff00' : '#c0c8d4',
              }}>
              <Filter size={11} /> {onlyChanged ? 'Showing changes only' : 'Showing all params'}
            </button>
          </div>

          {/* Diff groups */}
          {diff.groups.map(g => {
            const visible = onlyChanged ? g.items.filter(r => !r.same) : g.items
            if (visible.length === 0) return null
            return (
              <div key={g.name} className="rounded-xl border overflow-hidden"
                   style={{ background: 'rgba(20,20,32,0.6)', borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="px-4 py-2 flex items-center justify-between border-b"
                     style={{ background: 'rgba(0,0,0,0.20)', borderColor: 'rgba(255,255,255,0.05)' }}>
                  <div className="text-[12px] font-bold tracking-[0.18em] uppercase text-slate-200">{g.name}</div>
                  <div className="text-[10px] text-slate-500">{g.changedCount} changed · {g.items.length} total</div>
                </div>
                <div>
                  {visible.map(r => <DiffLine key={r.key} row={r} />)}
                </div>
              </div>
            )
          })}

          {diff.changedTotal === 0 && (
            <div className="rounded-xl p-6 text-center border text-slate-400"
                 style={{ background: 'rgba(20,20,32,0.6)', borderColor: 'rgba(255,255,255,0.06)' }}>
              Nothing changed between these two setups.
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Link href={`/dashboard/sessions/${a}`} className="text-[12px] text-cyan-300 hover:underline">View Session A →</Link>
            <span className="text-slate-600">·</span>
            <Link href={`/dashboard/sessions/${b}`} className="text-[12px] text-[#a3ff00] hover:underline">View Session B →</Link>
          </div>
        </>
      ) : null}
    </div>
  )
}

function SessionPicker({ label, value, onChange, sessions, accent, exclude }: { label: string; value: string; onChange: (v: string) => void; sessions: Session[]; accent: string; exclude: string }) {
  return (
    <div className="rounded-xl p-3 border" style={{ background: 'rgba(20,20,32,0.6)', borderColor: accent + '40' }}>
      <div className="text-[10px] font-bold tracking-[0.18em] uppercase mb-2" style={{ color: accent }}>{label}</div>
      <select value={value} onChange={e => onChange(e.target.value)}
        className="w-full bg-[#0f1218] text-sm text-white rounded px-3 py-2 border outline-none"
        style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
        <option value="">— pick a session —</option>
        {sessions.filter(s => s.id !== exclude).map(s => (
          <option key={s.id} value={s.id}>
            {(s.started_at ? new Date(s.started_at).toLocaleDateString() : '?')} · {s.track_name || '?'} · {s.car_name || '?'} · best {fmtTime(s.best_lap_time)}
          </option>
        ))}
      </select>
    </div>
  )
}

function SessionCell({ sess, accent, label }: { sess: Session; accent: string; label: string }) {
  return (
    <div>
      <div className="text-[10px] font-bold tracking-[0.18em] uppercase" style={{ color: accent }}>{label}</div>
      <div className="text-[13px] font-bold text-white">{sess.track_name || '?'} · {sess.car_name || '?'}</div>
      <div className="text-[11px] text-slate-400">
        {sess.started_at ? new Date(sess.started_at).toLocaleDateString() : '?'} · best <span className="font-mono" style={{ color: accent }}>{fmtTime(sess.best_lap_time)}</span>
        {sess.setup_name ? <> · {sess.setup_name}</> : null}
      </div>
    </div>
  )
}

function DiffLine({ row }: { row: DiffRow }) {
  const changed = !row.same
  const arrow = !changed ? null : (row.delta == null ? Equal : row.delta > 0 ? ArrowUp : ArrowDown)
  const arrowColor = row.delta == null ? '#888' : row.delta > 0 ? '#a3ff00' : '#00e5ff'
  return (
    <div className="grid grid-cols-[1fr_120px_24px_120px_90px] gap-2 items-center px-4 py-2 border-b text-[12.5px]"
         style={{ borderColor: 'rgba(255,255,255,0.04)', background: changed ? 'rgba(245,197,24,0.02)' : 'transparent' }}>
      <div className="truncate text-slate-300" title={row.key}>{row.key.split('.').slice(-2).join(' · ')}</div>
      <div className="font-mono text-right" style={{ color: changed ? '#888' : '#aaa' }}>{row.a ?? '—'}</div>
      <div className="flex justify-center">
        {arrow ? (() => { const Arrow = arrow; return <Arrow size={13} style={{ color: arrowColor }} /> })() : <span className="text-slate-700">·</span>}
      </div>
      <div className="font-mono text-right font-bold" style={{ color: changed ? '#fff' : '#888' }}>{row.b ?? '—'}</div>
      <div className="font-mono text-right text-[11px]" style={{ color: row.delta == null ? '#666' : (row.delta > 0 ? '#a3ff00' : '#00e5ff') }}>
        {row.delta == null ? '' : (row.delta > 0 ? '+' : '') + row.delta.toFixed(3)}
      </div>
    </div>
  )
}
