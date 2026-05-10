'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Gauge, TrendingUp, Activity } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine
} from 'recharts'

type TraceMeta = {
  id: string
  lap_number: number | null
  lap_time: number | null
  track: string | null
  track_config: string | null
  car: string | null
  sample_count: number | null
  ts: string
  session_id: string | null
}
type TraceFull = TraceMeta & {
  samples: Array<{
    pct: number; speed: number; throttle: number; brake: number; steer: number;
    gear?: number; rpm?: number; lat?: number; lon?: number; yaw?: number; t?: number;
  }>
}
type SessionMeta = {
  id: string
  car_name: string | null
  track_name: string | null
  layout_name: string | null
  started_at: string | null
  ended_at: string | null
  best_lap_time: number | null
}

const fmtTime = (s: number | null | undefined) => {
  if (!s || s <= 0) return '—'
  const m = Math.floor(s / 60)
  const sec = s - m * 60
  return m > 0 ? `${m}:${sec.toFixed(3).padStart(6, '0')}` : sec.toFixed(3)
}
const fmtSigned = (n: number, dp = 3) =>
  (n >= 0 ? '+' : '') + n.toFixed(dp)

// Resample a trace onto an even pct grid so we can compare lap-vs-lap at the same track location
function resample(samples: TraceFull['samples'] | undefined, N = 400) {
  const out = {
    pct: new Array<number>(N).fill(0),
    speed: new Array<number>(N).fill(0),
    throttle: new Array<number>(N).fill(0),
    brake: new Array<number>(N).fill(0),
    steer: new Array<number>(N).fill(0),
    gear: new Array<number>(N).fill(0),
    rpm: new Array<number>(N).fill(0),
    t: new Array<number>(N).fill(0),
    lat: new Array<number>(N).fill(0),
    lon: new Array<number>(N).fill(0),
  }
  if (!samples || samples.length === 0) return out
  const sorted = [...samples].filter(s => typeof s.pct === 'number').sort((a, b) => a.pct - b.pct)
  if (!sorted.length) return out
  let j = 0
  for (let i = 0; i < N; i++) {
    const p = i / (N - 1)
    while (j < sorted.length - 1 && sorted[j + 1].pct < p) j++
    const s = sorted[j]
    out.pct[i] = p
    out.speed[i]    = s.speed ?? 0
    out.throttle[i] = (s.throttle ?? 0) * 100
    out.brake[i]    = (s.brake ?? 0) * 100
    out.steer[i]    = s.steer ?? 0
    out.gear[i]     = s.gear ?? 0
    out.rpm[i]      = s.rpm ?? 0
    out.t[i]        = s.t ?? 0
    out.lat[i]      = s.lat ?? 0
    out.lon[i]      = s.lon ?? 0
  }
  return out
}

function computeDelta(mine: ReturnType<typeof resample>, ref: ReturnType<typeof resample>) {
  const N = mine.pct.length
  const out: number[] = new Array(N).fill(0)
  if (!mine.t.length || !ref.t.length) return out
  const t0m = mine.t[0], t0r = ref.t[0]
  for (let i = 0; i < N; i++) {
    out[i] = (mine.t[i] - t0m) - (ref.t[i] - t0r)
  }
  return out
}

function projectTrack(latArr: number[], lonArr: number[], w = 600, h = 280, pad = 16) {
  const pts = latArr.map((la, i) => ({ lat: la, lon: lonArr[i] }))
    .filter(p => p.lat !== 0 || p.lon !== 0)
  if (!pts.length) return [] as { x: number; y: number }[]
  const minLat = Math.min(...pts.map(p => p.lat))
  const maxLat = Math.max(...pts.map(p => p.lat))
  const minLon = Math.min(...pts.map(p => p.lon))
  const maxLon = Math.max(...pts.map(p => p.lon))
  const meanLat = (minLat + maxLat) / 2
  const lonScale = Math.cos(meanLat * Math.PI / 180)
  const dLat = (maxLat - minLat) || 1e-6
  const dLon = (maxLon - minLon) * lonScale || 1e-6
  const ratioPts = dLon / dLat
  const ratioBox = (w - 2 * pad) / (h - 2 * pad)
  let scale: number
  if (ratioPts > ratioBox) scale = (w - 2 * pad) / dLon
  else                     scale = (h - 2 * pad) / dLat
  const usedW = dLon * scale, usedH = dLat * scale
  const offX = (w - usedW) / 2, offY = (h - usedH) / 2
  return pts.map(p => ({
    x: offX + (p.lon - minLon) * lonScale * scale,
    y: h - (offY + (p.lat - minLat) * scale),
  }))
}

export default function SessionDetailPage() {
  const { id } = useParams() as { id: string }
  const [session, setSession] = useState<SessionMeta | null>(null)
  const [traces, setTraces] = useState<TraceMeta[]>([])
  const [bestLapId, setBestLapId] = useState<string | null>(null)
  const [mineId, setMineId] = useState<string | null>(null)
  const [refId, setRefId] = useState<string | null>(null)
  const [mineTrace, setMineTrace] = useState<TraceFull | null>(null)
  const [refTrace, setRefTrace] = useState<TraceFull | null>(null)
  const [loading, setLoading] = useState(true)
  const [tracesLoading, setTracesLoading] = useState(false)

  // Load list of traces for this session
  useEffect(() => {
    setLoading(true)
    fetch(`/api/sessions/${id}/traces`)
      .then(r => r.json())
      .then(j => {
        if (j.ok) {
          setSession(j.session)
          setTraces(j.traces || [])
          setBestLapId(j.bestLapId)
          // Default: newest lap = mine, best lap = reference
          const newest = (j.traces || []).slice().sort((a: TraceMeta, b: TraceMeta) => b.ts.localeCompare(a.ts))[0]
          if (newest) setMineId(newest.id)
          if (j.bestLapId) setRefId(j.bestLapId)
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  // Load full samples for the selected mine/ref laps
  useEffect(() => {
    if (!mineId) return
    setTracesLoading(true)
    fetch(`/api/sessions/${id}/traces?lap=${mineId}`)
      .then(r => r.json())
      .then(j => { if (j.ok) setMineTrace(j.trace) })
      .finally(() => setTracesLoading(false))
  }, [id, mineId])

  useEffect(() => {
    if (!refId) { setRefTrace(null); return }
    fetch(`/api/sessions/${id}/traces?lap=${refId}`)
      .then(r => r.json())
      .then(j => { if (j.ok) setRefTrace(j.trace) })
  }, [id, refId])

  const mine = useMemo(() => resample(mineTrace?.samples), [mineTrace])
  const ref  = useMemo(() => resample(refTrace?.samples),  [refTrace])
  const delta = useMemo(() => computeDelta(mine, ref), [mine, ref])

  // Combined data for recharts
  const chartData = useMemo(() => {
    const N = mine.pct.length
    return Array.from({ length: N }, (_, i) => ({
      pct: +(mine.pct[i] * 100).toFixed(1),
      mineSpeed: mine.speed[i],
      refSpeed:  ref.speed[i],
      mineThrottle: mine.throttle[i],
      refThrottle:  ref.throttle[i],
      mineBrake: mine.brake[i],
      refBrake:  ref.brake[i],
      mineSteer: mine.steer[i],
      refSteer:  ref.steer[i],
      mineGear: mine.gear[i],
      refGear:  ref.gear[i],
      delta:    delta[i],
    }))
  }, [mine, ref, delta])

  const sectorDeltas = useMemo(() => {
    const N = delta.length
    if (!N) return []
    const out: { label: string; v: number }[] = []
    const sectors = 8
    for (let s = 0; s < sectors; s++) {
      const lo = Math.floor(s * N / sectors)
      const hi = Math.floor((s + 1) * N / sectors) - 1
      out.push({ label: `SQ${s + 1}`, v: delta[hi] - delta[lo] })
    }
    return out
  }, [delta])

  const finalDelta = delta.length ? delta[delta.length - 1] : 0
  const topSpeedMine = Math.max(...mine.speed)
  const topSpeedRef  = Math.max(...ref.speed)
  const mineProjected = useMemo(() => projectTrack(mine.lat, mine.lon), [mine])

  if (loading) {
    return (
      <div className="p-10 flex items-center gap-2 text-[#888]">
        <Loader2 size={16} className="animate-spin" /> Loading session…
      </div>
    )
  }
  if (!session) {
    return <div className="p-10 text-[#888]">Session not found.</div>
  }

  return (
    <div className="space-y-4 animate-in">
      {/* Header */}
      <div className="chief-panel-glow p-6 rounded-lg">
        <Link href="/dashboard/sessions" className="inline-flex items-center gap-1 text-xs text-[#888] hover:text-white mb-3">
          <ArrowLeft size={12} /> All Sessions
        </Link>
        <div className="chief-accent-line mb-3" />
        <h1 className="font-display text-2xl text-white tracking-wide">
          {session.track_name?.toUpperCase() || 'UNKNOWN TRACK'}
          {session.layout_name && <span className="text-[#888] text-base ml-2">/ {session.layout_name}</span>}
        </h1>
        <div className="text-[#aaa] text-sm mt-1">{session.car_name || 'Unknown car'} · {session.started_at ? new Date(session.started_at).toLocaleString() : ''}</div>
      </div>

      {/* Top stat row */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3">
        <Stat label="My Lap"        value={fmtTime(mineTrace?.lap_time)} color="#00e5ff" />
        <Stat label="Reference"     value={fmtTime(refTrace?.lap_time)}  color="#f5c518" />
        <Stat label="Δ vs Ref"      value={fmtSigned(finalDelta, 3) + 's'} color={finalDelta >= 0 ? '#ff2d2d' : '#39ff14'} />
        <Stat label="Top Speed Mine" value={topSpeedMine ? topSpeedMine.toFixed(1) + ' mph' : '—'} color="#00e5ff" />
        <Stat label="Top Speed Ref"  value={topSpeedRef  ? topSpeedRef.toFixed(1)  + ' mph' : '—'} color="#f5c518" />
        <Stat label="Laps Captured" value={String(traces.length)} color="#39ff14" />
      </div>

      {/* Lap pickers */}
      <div className="chief-panel p-3 rounded-lg flex flex-wrap items-center gap-2">
        <label className="text-[10px] uppercase tracking-wide text-[#888]">My Lap</label>
        <select value={mineId || ''} onChange={e => setMineId(e.target.value)}
                className="bg-[#0f1218] text-sm text-white rounded px-3 py-2 border border-[#1f2733] min-w-[260px]">
          {traces.map(t => (
            <option key={t.id} value={t.id}>L{t.lap_number ?? '?'} — {fmtTime(t.lap_time)} {t.id === bestLapId ? '★ best' : ''}</option>
          ))}
        </select>
        <label className="text-[10px] uppercase tracking-wide text-[#888] ml-4">Reference</label>
        <select value={refId || ''} onChange={e => setRefId(e.target.value)}
                className="bg-[#0f1218] text-sm text-white rounded px-3 py-2 border border-[#1f2733] min-w-[260px]">
          <option value="">— none —</option>
          {traces.map(t => (
            <option key={t.id} value={t.id}>L{t.lap_number ?? '?'} — {fmtTime(t.lap_time)} {t.id === bestLapId ? '★ best' : ''}</option>
          ))}
        </select>
        {tracesLoading && <Loader2 size={14} className="animate-spin text-[#666]" />}
      </div>

      {/* Track map + lap table */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="chief-panel p-3 rounded-lg lg:col-span-2">
          <div className="text-[10px] uppercase tracking-wider text-[#666] mb-2 flex items-center gap-2">
            <Activity size={11} /> Track Map &nbsp;·&nbsp;
            <span className="text-[#39ff14]">green = gaining</span> &nbsp;
            <span className="text-[#ff2d2d]">red = losing</span>
          </div>
          <svg viewBox="0 0 600 280" className="w-full" style={{ height: 280, background: '#0b0d12', borderRadius: 4 }}>
            {mineProjected.length < 10 ? (
              <text x="300" y="140" textAnchor="middle" fill="#666" fontSize="12">No GPS in trace — drive a lap with the latest CHIEF update.</text>
            ) : mineProjected.map((p, i) => {
              if (i === 0) return null
              const a = mineProjected[i - 1]
              const idx = Math.floor((i / mineProjected.length) * delta.length)
              const d = delta[idx] || 0
              const col = d < -0.005 ? '#39ff14' : d > 0.005 ? '#ff2d2d' : '#9aa6b8'
              return <line key={i} x1={a.x.toFixed(1)} y1={a.y.toFixed(1)} x2={p.x.toFixed(1)} y2={p.y.toFixed(1)}
                           stroke={col} strokeWidth={3} strokeLinecap="round" />
            })}
            {mineProjected.length > 0 && (
              <circle cx={mineProjected[0].x.toFixed(1)} cy={mineProjected[0].y.toFixed(1)} r="4" fill="#00e5ff" />
            )}
          </svg>
        </div>
        <div className="chief-panel p-3 rounded-lg">
          <div className="text-[10px] uppercase tracking-wider text-[#666] mb-2">Laps in this Session</div>
          <div className="overflow-y-auto" style={{ maxHeight: 280 }}>
            {traces.map(t => (
              <button key={t.id}
                      onClick={() => mineId === t.id ? setRefId(t.id) : setMineId(t.id)}
                      className={`w-full grid grid-cols-3 gap-1 text-xs py-1.5 px-2 rounded text-left transition
                        ${t.id === mineId ? 'bg-[#00e5ff22] border border-[#00e5ff]' :
                          t.id === refId  ? 'bg-[#f5c51822] border border-[#f5c518]' :
                          'hover:bg-[#11151c]'}`}>
                <span className="text-[#888]">L{t.lap_number ?? '?'}</span>
                <span className={`font-mono-chief ${t.id === bestLapId ? 'text-[#a855f7]' : 'text-white'}`}>{fmtTime(t.lap_time)}</span>
                <span className="text-right text-[#666] text-[10px]">{t.sample_count ?? 0}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Delta line */}
      <ChartPanel label="Δ vs Reference (seconds)">
        <DeltaChart data={chartData} />
      </ChartPanel>
      <ChartPanel label="Speed (mph)">
        <PairChart data={chartData} mineKey="mineSpeed" refKey="refSpeed" mineColor="#00e5ff" />
      </ChartPanel>
      <ChartPanel label="Throttle %">
        <PairChart data={chartData} mineKey="mineThrottle" refKey="refThrottle" mineColor="#39ff14" yMin={0} yMax={100} />
      </ChartPanel>
      <ChartPanel label="Brake %">
        <PairChart data={chartData} mineKey="mineBrake" refKey="refBrake" mineColor="#ff2d2d" yMin={0} yMax={100} />
      </ChartPanel>
      <ChartPanel label="Steering (rad)">
        <PairChart data={chartData} mineKey="mineSteer" refKey="refSteer" mineColor="#a855f7" />
      </ChartPanel>
      <ChartPanel label="Gear">
        <PairChart data={chartData} mineKey="mineGear" refKey="refGear" mineColor="#f5c518" />
      </ChartPanel>

      {/* Sector deltas */}
      <div className="chief-panel p-3 rounded-lg">
        <div className="text-[10px] uppercase tracking-wider text-[#666] mb-2">Sector Deltas</div>
        <div className="flex flex-wrap gap-1.5">
          {sectorDeltas.map(s => {
            const good = s.v < -0.02
            const bad  = s.v > 0.02
            return (
              <span key={s.label}
                    className={`px-2.5 py-1 rounded text-[11px] font-mono-chief border
                      ${good ? 'bg-[#39ff1422] border-[#39ff1455] text-[#39ff14]' :
                        bad  ? 'bg-[#ff2d2d22] border-[#ff2d2d55] text-[#ff2d2d]' :
                               'bg-[#1f2733] border-[#333] text-[#aaa]'}`}>
                {s.label} {fmtSigned(s.v, 2)}s
              </span>
            )
          })}
        </div>
      </div>
    </div>
  )
}

// ---------- helpers ----------

function Stat({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div className="chief-panel p-3 rounded-lg">
      <div className="text-[10px] uppercase tracking-wide text-[#888]">{label}</div>
      <div className="font-display text-xl mt-1" style={{ color }}>{value}</div>
    </div>
  )
}

function ChartPanel({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="chief-panel rounded-lg px-3 py-2">
      <div className="text-[10px] uppercase tracking-wider text-[#666] mb-1">{label}</div>
      <div style={{ width: '100%', height: 120 }}>{children}</div>
    </div>
  )
}

function DeltaChart({ data }: { data: any[] }) {
  return (
    <ResponsiveContainer>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="#1f2733" strokeDasharray="2 2" />
        <XAxis dataKey="pct" hide />
        <YAxis tick={{ fontSize: 10, fill: '#888' }} width={50}
               tickFormatter={(v: number) => (v >= 0 ? '+' : '') + v.toFixed(2)} />
        <Tooltip
          contentStyle={{ background: '#11151c', border: '1px solid #1f2733', fontSize: 11 }}
          labelFormatter={(v: any) => `pct ${v}%`}
          formatter={(v: any) => (v as number).toFixed(3) + 's'}
        />
        <ReferenceLine y={0} stroke="#444" />
        <Line dataKey="delta" stroke="#a855f7" strokeWidth={1.5} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

function PairChart({
  data, mineKey, refKey, mineColor, yMin, yMax,
}: {
  data: any[]; mineKey: string; refKey: string; mineColor: string; yMin?: number; yMax?: number;
}) {
  return (
    <ResponsiveContainer>
      <LineChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid stroke="#1f2733" strokeDasharray="2 2" />
        <XAxis dataKey="pct" hide />
        <YAxis tick={{ fontSize: 10, fill: '#888' }} width={50}
               domain={[yMin ?? 'auto' as any, yMax ?? 'auto' as any]} />
        <Tooltip
          contentStyle={{ background: '#11151c', border: '1px solid #1f2733', fontSize: 11 }}
          labelFormatter={(v: any) => `pct ${v}%`}
        />
        <Line dataKey={mineKey} stroke={mineColor} strokeWidth={1.4} dot={false} isAnimationActive={false} name="Mine" />
        <Line dataKey={refKey}  stroke="#f5c518"  strokeWidth={1.2} strokeDasharray="4 3" dot={false} isAnimationActive={false} name="Reference" />
      </LineChart>
    </ResponsiveContainer>
  )
}
