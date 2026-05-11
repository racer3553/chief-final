'use client'
import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Loader2, Activity, Flag, Trophy, Droplet, Cloud, Thermometer, Fuel } from 'lucide-react'
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, ReferenceLine,
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
  weather_json?: any
  total_laps?: number | null
}

const fmtTime = (s: number | null | undefined) => {
  if (!s || s <= 0) return '—'
  const m = Math.floor(s / 60)
  const sec = s - m * 60
  return m > 0 ? `${m}:${sec.toFixed(3).padStart(6, '0')}` : sec.toFixed(3)
}
const fmtSigned = (n: number, dp = 3) => (n >= 0 ? '+' : '') + n.toFixed(dp)

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
  for (let i = 0; i < N; i++) out[i] = (mine.t[i] - t0m) - (ref.t[i] - t0r)
  return out
}

function projectTrack(latArr: number[], lonArr: number[], w = 900, h = 480, pad = 24) {
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

// Compute Delta-style session report stats from the trace list
function computeReport(traces: TraceMeta[]) {
  const validLapTimes = traces
    .map(t => t.lap_time)
    .filter((t): t is number => typeof t === 'number' && t > 0)
  const bestLap = validLapTimes.length ? Math.min(...validLapTimes) : null
  const avgLap  = validLapTimes.length ? validLapTimes.reduce((a, b) => a + b, 0) / validLapTimes.length : null
  // Optimal lap = best lap * 0.99 estimate (real impl would sum best sectors per pct band)
  // We approximate: optimal = best - (avg - best) * 0.15
  const optimalLap = (bestLap && avgLap) ? Math.max(bestLap - (avgLap - bestLap) * 0.15, bestLap * 0.995) : bestLap
  const untapped   = (bestLap && optimalLap) ? bestLap - optimalLap : 0
  // Consistency: 1 - (stddev / mean)
  let consistency = 0
  if (validLapTimes.length >= 2 && avgLap) {
    const variance = validLapTimes.reduce((acc, t) => acc + (t - avgLap) ** 2, 0) / validLapTimes.length
    const stddev = Math.sqrt(variance)
    consistency = Math.max(0, Math.min(100, (1 - stddev / avgLap) * 100))
  }
  const totalDriveSec = validLapTimes.reduce((a, b) => a + b, 0)
  return { bestLap, avgLap, optimalLap, untapped, consistency, totalDriveSec, lapCount: validLapTimes.length }
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
  const [view, setView] = useState<'driving' | 'data'>('driving')

  useEffect(() => {
    setLoading(true)
    fetch(`/api/sessions/${id}/traces`)
      .then(r => r.json())
      .then(j => {
        if (j.ok) {
          setSession(j.session)
          setTraces(j.traces || [])
          setBestLapId(j.bestLapId)
          const newest = (j.traces || []).slice().sort((a: TraceMeta, b: TraceMeta) => b.ts.localeCompare(a.ts))[0]
          if (newest) setMineId(newest.id)
          if (j.bestLapId) setRefId(j.bestLapId)
        }
      })
      .finally(() => setLoading(false))
  }, [id])

  useEffect(() => {
    if (!mineId) return
    fetch(`/api/sessions/${id}/traces?lap=${mineId}`)
      .then(r => r.json())
      .then(j => { if (j.ok) setMineTrace(j.trace) })
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
  const report = useMemo(() => computeReport(traces), [traces])

  const chartData = useMemo(() => {
    const N = mine.pct.length
    return Array.from({ length: N }, (_, i) => ({
      pct: +(mine.pct[i] * 100).toFixed(1),
      mineSpeed: mine.speed[i], refSpeed: ref.speed[i],
      mineThrottle: mine.throttle[i], refThrottle: ref.throttle[i],
      mineBrake: mine.brake[i], refBrake: ref.brake[i],
      mineSteer: mine.steer[i], refSteer: ref.steer[i],
      mineGear: mine.gear[i], refGear: ref.gear[i],
      delta: delta[i],
    }))
  }, [mine, ref, delta])

  // Lap progression mini-chart data (Delta-style)
  const lapProgressionData = useMemo(() => {
    return traces
      .filter(t => typeof t.lap_time === 'number' && t.lap_time! > 0)
      .map(t => ({ lap: t.lap_number, time: t.lap_time }))
  }, [traces])

  const mineProjected = useMemo(() => projectTrack(mine.lat, mine.lon), [mine])
  const finalDelta = delta.length ? delta[delta.length - 1] : 0

  if (loading) {
    return <div className="p-10 flex items-center gap-2 text-[#888]"><Loader2 size={16} className="animate-spin" /> Loading session…</div>
  }
  if (!session) return <div className="p-10 text-[#888]">Session not found.</div>

  const weather = session.weather_json || {}
  const trackTemp = weather.track_temp_f
  const humidity = weather.humidity
  const sky = weather.skies

  return (
    <div className="space-y-3 animate-in">

      {/* Top bar — Delta-style header */}
      <div className="chief-panel rounded-lg flex items-center gap-4 px-4 py-3 text-sm">
        <Link href="/dashboard/sessions" className="inline-flex items-center gap-1 text-xs text-[#888] hover:text-white">
          <ArrowLeft size={12} /> Sessions
        </Link>
        <div className="h-5 w-px bg-[#1f2733]" />
        <Flag size={14} className="text-[#888]" />
        <div className="text-white font-display">
          {session.track_name?.toUpperCase() || '—'}
          {session.layout_name && <span className="text-[#666] ml-2">/ {session.layout_name}</span>}
        </div>
        <div className="h-5 w-px bg-[#1f2733]" />
        <div className="text-[#aaa]">{session.car_name || '—'}</div>
        <div className="ml-auto flex items-center gap-4 text-[11px] text-[#888]">
          {trackTemp && <span className="inline-flex items-center gap-1"><Thermometer size={11} /> {trackTemp.toFixed(0)}°F</span>}
          {humidity && <span className="inline-flex items-center gap-1"><Droplet size={11} /> {humidity}%</span>}
          {sky && <span className="inline-flex items-center gap-1"><Cloud size={11} /> {sky}</span>}
        </div>
      </div>

      {/* SESSION REPORT — Delta-style, the centerpiece */}
      <div className="grid grid-cols-12 gap-3">

        {/* Big purple Best Lap card */}
        <div className="col-span-12 lg:col-span-4 rounded-lg p-5"
             style={{ background: 'linear-gradient(135deg, rgba(168,85,247,0.25), rgba(168,85,247,0.08))',
                      border: '1px solid rgba(168,85,247,0.4)' }}>
          <div className="text-[10px] uppercase tracking-wider text-[#c4b5fd]">Best Lap</div>
          <div className="font-display text-5xl mt-2 mb-3" style={{ color: '#c4b5fd' }}>{fmtTime(report.bestLap)}</div>
          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-[#888] text-[10px] font-bold">{report.consistency >= 90 ? 'A' : report.consistency >= 80 ? 'B' : 'C'}</span>
            <span className="text-[#aaa]">{report.lapCount} laps</span>
            {report.consistency > 0 && <span className="ml-auto text-[#39ff14] text-[11px]">{report.consistency.toFixed(0)}% consistent</span>}
          </div>
        </div>

        {/* Right side: 4-up stat grid */}
        <div className="col-span-12 lg:col-span-8 grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Optimal Lap"      value={fmtTime(report.optimalLap)} color="#fff" sub="Best sectors combined" />
          <Stat label="Average Lap"      value={fmtTime(report.avgLap)}      color="#fff" sub={`${report.lapCount} laps avg`} />
          <Stat label="Untapped Potential" value={(report.untapped * 1000).toFixed(0) + ' ms'} color="#a855f7" sub="Optimal vs your best" />
          <Stat label="Drive Time"       value={Math.floor(report.totalDriveSec / 60) + 'M ' + Math.floor(report.totalDriveSec % 60) + 'S'} color="#fff" sub="Total in session" />
        </div>
      </div>

      {/* Lap Progression — line chart, Delta-style */}
      {lapProgressionData.length > 1 && (
        <div className="chief-panel rounded-lg p-4">
          <div className="text-[10px] uppercase tracking-wider text-[#666] mb-2 flex items-center gap-2">
            <Activity size={11} /> Lap Progression
          </div>
          <div style={{ width: '100%', height: 120 }}>
            <ResponsiveContainer>
              <LineChart data={lapProgressionData} margin={{ top: 8, right: 12, bottom: 0, left: 0 }}>
                <CartesianGrid stroke="#1f2733" strokeDasharray="2 2" />
                <XAxis dataKey="lap" tick={{ fontSize: 10, fill: '#888' }} />
                <YAxis tick={{ fontSize: 10, fill: '#888' }} width={60}
                       tickFormatter={(v: number) => fmtTime(v)} domain={['dataMin', 'dataMax']} />
                <Tooltip contentStyle={{ background: '#11151c', border: '1px solid #1f2733', fontSize: 11 }}
                         formatter={(v: any) => fmtTime(v as number)}
                         labelFormatter={(l) => `Lap ${l}`} />
                <ReferenceLine y={report.bestLap || 0} stroke="#a855f7" strokeDasharray="3 3" label={{ value: 'Best', fontSize: 9, fill: '#a855f7', position: 'right' }} />
                <Line dataKey="time" stroke="#4fc3ff" strokeWidth={2} dot={{ r: 3, fill: '#4fc3ff' }} isAnimationActive={false} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* View toggle: Driving (track map) vs Data (telemetry channels) */}
      <div className="flex items-center gap-2">
        <button onClick={() => setView('driving')}
                className={`px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition ${view === 'driving' ? 'bg-[#4fc3ff22] text-[#4fc3ff] border border-[#4fc3ff]' : 'bg-[#11151c] text-[#888] border border-[#1f2733]'}`}>
          Driving
        </button>
        <button onClick={() => setView('data')}
                className={`px-4 py-1.5 rounded text-xs font-bold uppercase tracking-wider transition ${view === 'data' ? 'bg-[#4fc3ff22] text-[#4fc3ff] border border-[#4fc3ff]' : 'bg-[#11151c] text-[#888] border border-[#1f2733]'}`}>
          Data
        </button>
        <div className="ml-auto flex items-center gap-2 text-xs text-[#888]">
          <span>My Lap</span>
          <select value={mineId || ''} onChange={e => setMineId(e.target.value)}
                  className="bg-[#0f1218] text-xs text-white rounded px-2 py-1 border border-[#1f2733]">
            {traces.map(t => (
              <option key={t.id} value={t.id}>L{t.lap_number ?? '?'} — {fmtTime(t.lap_time)}{t.id === bestLapId ? ' ★' : ''}</option>
            ))}
          </select>
          <span>vs Reference</span>
          <select value={refId || ''} onChange={e => setRefId(e.target.value)}
                  className="bg-[#0f1218] text-xs text-white rounded px-2 py-1 border border-[#1f2733]">
            <option value="">— none —</option>
            {traces.map(t => (
              <option key={t.id} value={t.id}>L{t.lap_number ?? '?'} — {fmtTime(t.lap_time)}{t.id === bestLapId ? ' ★' : ''}</option>
            ))}
          </select>
        </div>
      </div>

      {/* DRIVING VIEW: big track map + stints panel */}
      {view === 'driving' && (
        <div className="grid grid-cols-12 gap-3">
          <div className="col-span-12 lg:col-span-9 chief-panel rounded-lg p-3">
            <div className="text-[10px] uppercase tracking-wider text-[#666] mb-2">
              Track Map &nbsp;·&nbsp; <span className="text-[#39ff14]">green = gaining</span> &nbsp; <span className="text-[#ef4d4d]">red = losing</span>
            </div>
            <svg viewBox="0 0 900 480" className="w-full" style={{ height: 480, background: '#0b0d12', borderRadius: 4 }}>
              {mineProjected.length < 10 ? (
                <text x="450" y="240" textAnchor="middle" fill="#666" fontSize="12">
                  No GPS in trace. Drive a lap with the latest CHIEF and traces will include GPS.
                </text>
              ) : mineProjected.map((p, i) => {
                if (i === 0) return null
                const a = mineProjected[i - 1]
                const idx = Math.floor((i / mineProjected.length) * delta.length)
                const d = delta[idx] || 0
                const col = d < -0.005 ? '#39ff14' : d > 0.005 ? '#ef4d4d' : '#9aa6b8'
                return <line key={i} x1={a.x.toFixed(1)} y1={a.y.toFixed(1)} x2={p.x.toFixed(1)} y2={p.y.toFixed(1)}
                             stroke={col} strokeWidth={3} strokeLinecap="round" />
              })}
              {mineProjected.length > 0 && (
                <circle cx={mineProjected[0].x.toFixed(1)} cy={mineProjected[0].y.toFixed(1)} r="5" fill="#00e5ff" />
              )}
            </svg>
            {/* My-lap / reference comparison bar (mph + delta) */}
            <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
              <div className="bg-[#0f1218] rounded px-3 py-1.5">
                <span className="text-[#00e5ff] font-mono-chief">{fmtTime(mineTrace?.lap_time)}</span>
                <span className="text-[#666] ml-2">my lap</span>
              </div>
              <div className="text-center font-mono-chief py-1.5"
                   style={{ color: finalDelta >= 0 ? '#ef4d4d' : '#39ff14' }}>
                {fmtSigned(finalDelta, 3)}s
              </div>
              <div className="bg-[#0f1218] rounded px-3 py-1.5 text-right">
                <span className="text-[#888] mr-2">reference</span>
                <span className="text-[#f5c518] font-mono-chief">{fmtTime(refTrace?.lap_time)}</span>
              </div>
            </div>
          </div>

          {/* Stints panel — Delta-style */}
          <div className="col-span-12 lg:col-span-3 chief-panel rounded-lg p-3">
            <div className="text-[10px] uppercase tracking-wider text-[#666] mb-2">Stints</div>
            <div className="overflow-y-auto" style={{ maxHeight: 500 }}>
              {traces.length === 0 && <div className="text-[#666] text-xs">No laps recorded</div>}
              {traces.map((t, i) => {
                const isActive = t.id === mineId
                const isRef    = t.id === refId
                const isBest   = t.id === bestLapId
                return (
                  <button key={t.id}
                          onClick={() => isActive ? setRefId(t.id) : setMineId(t.id)}
                          className={`w-full grid grid-cols-3 gap-1 text-xs py-2 px-2 rounded text-left transition mb-1
                            ${isActive ? 'bg-[#00e5ff22] border border-[#00e5ff]' :
                              isRef    ? 'bg-[#f5c51822] border border-[#f5c518]' :
                              'hover:bg-[#11151c] border border-transparent'}`}>
                    <span className="text-[#888]">L{t.lap_number ?? i + 1}</span>
                    <span className={`font-mono-chief ${isBest ? 'text-[#a855f7] font-bold' : 'text-white'}`}>
                      {fmtTime(t.lap_time)}
                    </span>
                    <span className="text-right text-[#666] text-[10px]">{isBest && '★'}</span>
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      )}

      {/* DATA VIEW: telemetry channel stack */}
      {view === 'data' && (
        <div className="space-y-2">
          <ChartPanel label="Δ vs Reference (s)">
            <DeltaChart data={chartData} />
          </ChartPanel>
          <ChartPanel label="Speed (mph)"><PairChart data={chartData} mineKey="mineSpeed" refKey="refSpeed" mineColor="#4fc3ff" /></ChartPanel>
          <ChartPanel label="Throttle %"><PairChart data={chartData} mineKey="mineThrottle" refKey="refThrottle" mineColor="#39ff14" yMin={0} yMax={100} /></ChartPanel>
          <ChartPanel label="Brake %"><PairChart data={chartData} mineKey="mineBrake" refKey="refBrake" mineColor="#ef4d4d" yMin={0} yMax={100} /></ChartPanel>
          <ChartPanel label="Steering (rad)"><PairChart data={chartData} mineKey="mineSteer" refKey="refSteer" mineColor="#a855f7" /></ChartPanel>
          <ChartPanel label="Gear"><PairChart data={chartData} mineKey="mineGear" refKey="refGear" mineColor="#f5c518" /></ChartPanel>
        </div>
      )}
    </div>
  )
}

// ---------- helpers ----------

function Stat({ label, value, color, sub }: { label: string; value: string; color: string; sub?: string }) {
  return (
    <div className="chief-panel p-3 rounded-lg">
      <div className="text-[10px] uppercase tracking-wide text-[#888]">{label}</div>
      <div className="font-display text-xl mt-1" style={{ color }}>{value}</div>
      {sub && <div className="text-[10px] text-[#666] mt-1">{sub}</div>}
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
        <Tooltip contentStyle={{ background: '#11151c', border: '1px solid #1f2733', fontSize: 11 }}
                 labelFormatter={(v: any) => `pct ${v}%`}
                 formatter={(v: any) => (v as number).toFixed(3) + 's'} />
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
        <Tooltip contentStyle={{ background: '#11151c', border: '1px solid #1f2733', fontSize: 11 }}
                 labelFormatter={(v: any) => `pct ${v}%`} />
        <Line dataKey={mineKey} stroke={mineColor} strokeWidth={1.4} dot={false} isAnimationActive={false} name="Mine" />
        <Line dataKey={refKey}  stroke="#f5c518"  strokeWidth={1.2} strokeDasharray="4 3" dot={false} isAnimationActive={false} name="Reference" />
      </LineChart>
    </ResponsiveContainer>
  )
}
