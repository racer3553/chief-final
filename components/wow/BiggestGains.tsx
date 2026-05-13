'use client'
// BiggestGains — the most important card on a session page. Tells the driver
// exactly the top 3-5 corners where they lost time vs their own best lap and
// the single most-actionable fix per corner.
//
// Drop on /dashboard/sessions/[id].

import { useEffect, useState } from 'react'
import { TrendingUp, Loader2, Target, Zap } from 'lucide-react'

interface Gain {
  sectorIndex: number
  sectorLabel: string
  lossSeconds: number
  opportunity: number
  tip: string
  why: string
  details: { minSpeedDelta: number; brakeOverpressedPct: number; throttleLatePct: number }
}

interface Resp {
  gains: Gain[]
  bestLap?: number
  bestLapNumber?: number
  totalLaps?: number
  optimalLap?: number
  optimalDeltaSeconds?: number
  note?: string
}

export default function BiggestGains({ sessionId }: { sessionId: string }) {
  const [data, setData] = useState<Resp | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch(`/api/sessions/${sessionId}/biggest-gains`)
      .then(r => r.json())
      .then(d => { setData(d); setLoading(false) })
      .catch(() => setLoading(false))
  }, [sessionId])

  if (loading) {
    return (
      <div className="rounded-xl p-5 border" style={{ background: 'rgba(20,20,32,0.6)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2 text-cyan-300"><Loader2 size={16} className="animate-spin" /> Chief is analyzing your laps…</div>
      </div>
    )
  }

  if (!data || !data.gains || data.gains.length === 0) {
    return (
      <div className="rounded-xl p-5 border" style={{ background: 'rgba(20,20,32,0.6)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="text-[11px] font-bold tracking-widest uppercase text-slate-500 mb-2">Biggest gains</div>
        <div className="text-sm text-slate-400">
          {data?.note || 'Drive at least 3 laps with telemetry to unlock per-sector gain analysis.'}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {/* Header: optimal lap + how much you could gain */}
      <div className="rounded-xl p-5 border"
           style={{
             background: 'linear-gradient(135deg, rgba(0,229,255,0.10), rgba(163,255,0,0.06))',
             borderColor: 'rgba(0,229,255,0.30)',
           }}>
        <div className="flex items-start justify-between gap-4 flex-wrap">
          <div>
            <div className="text-[10px] font-bold tracking-[0.2em] uppercase mb-1" style={{ color: '#00e5ff' }}>
              Biggest Gains
            </div>
            <h3 className="font-display text-xl text-white tracking-wide">
              {data.optimalDeltaSeconds && data.optimalDeltaSeconds > 0
                ? <>You leave <span className="font-mono text-[#a3ff00]">{data.optimalDeltaSeconds.toFixed(3)}s</span> on the table.</>
                : <>You're matching your best in every sector. Nice.</>}
            </h3>
            <p className="text-[12px] text-slate-400 mt-1">
              Best lap <span className="font-mono text-white">{fmtTime(data.bestLap || 0)}</span> · Optimal lap{' '}
              <span className="font-mono text-[#a3ff00]">{fmtTime(data.optimalLap || 0)}</span>
              {' '}· <span className="text-slate-500">match your best in every sector</span>
            </p>
          </div>
          <div className="hidden md:block">
            <TrendingUp size={48} style={{ color: '#00e5ff' }} className="opacity-60" />
          </div>
        </div>
      </div>

      {/* Ranked sector cards */}
      <div className="space-y-2.5">
        {data.gains.map((g, i) => (
          <div key={g.sectorIndex} className="rounded-xl p-4 border flex items-stretch gap-4"
               style={{
                 background: 'rgba(20,20,32,0.65)',
                 borderColor: i === 0 ? 'rgba(255,58,58,0.30)' : 'rgba(255,255,255,0.07)',
               }}>
            <div className="flex flex-col items-center justify-center min-w-[68px] py-1 rounded-lg"
                 style={{ background: 'rgba(0,0,0,0.4)' }}>
              <div className="text-[9px] font-bold tracking-[0.18em] uppercase text-slate-500">Lose</div>
              <div className="font-mono text-xl font-extrabold text-[#ff3a3a]">-{g.lossSeconds.toFixed(2)}</div>
              <div className="text-[9px] text-slate-600">sec/lap</div>
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-slate-500">#{i + 1}</div>
                <div className="text-[13px] font-bold text-white">{g.sectorLabel}</div>
                {i === 0 && (
                  <span className="text-[9px] font-bold tracking-wider uppercase px-2 py-0.5 rounded"
                        style={{ background: 'rgba(255,58,58,0.18)', color: '#ff8080' }}>
                    biggest opportunity
                  </span>
                )}
              </div>
              <div className="flex items-start gap-2">
                <Target size={14} style={{ color: '#a3ff00' }} className="mt-0.5 shrink-0" />
                <div className="text-[13px] text-white font-semibold leading-snug">{g.tip}</div>
              </div>
              <div className="text-[11px] text-slate-500 mt-1.5 leading-snug">{g.why}</div>

              {/* Detail chips: only show non-zero deltas */}
              <div className="flex flex-wrap gap-1.5 mt-2">
                {g.details.minSpeedDelta > 0 && (
                  <Chip label="min speed" value={`-${g.details.minSpeedDelta.toFixed(1)} mph`} color="#ff8080" />
                )}
                {g.details.brakeOverpressedPct > 4 && (
                  <Chip label="over-braking" value={`+${g.details.brakeOverpressedPct.toFixed(0)}%`} color="#ffd83a" />
                )}
                {g.details.throttleLatePct > 4 && (
                  <Chip label="late throttle" value={`-${g.details.throttleLatePct.toFixed(0)}%`} color="#3a8aff" />
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 text-[11px] text-slate-500 pl-1">
        <Zap size={11} style={{ color: '#a3ff00' }} />
        Run the next session with these 1-2 fixes in mind. Chief re-analyzes every lap.
      </div>
    </div>
  )
}

function Chip({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-mono px-1.5 py-0.5 rounded"
          style={{ background: color + '15', color, border: `1px solid ${color}30` }}>
      <span className="opacity-70">{label}</span>
      <span className="font-bold">{value}</span>
    </span>
  )
}

function fmtTime(s: number): string {
  if (!s || s <= 0) return '—'
  const m = Math.floor(s / 60)
  const sec = s - m * 60
  return m > 0 ? `${m}:${sec.toFixed(3).padStart(6, '0')}` : sec.toFixed(3)
}
