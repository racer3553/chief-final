'use client'
// /dashboard/dna — the driver's "DNA" page. Shows their tendencies, weak corners,
// strong corners, consistency. Computed live from all their telemetry traces.
// Becomes the page they check first every morning to know what to work on.

import { useEffect, useState } from 'react'
import { Activity, AlertTriangle, CheckCircle2, Loader2, Brain, Award } from 'lucide-react'

interface DnaResp {
  ready: boolean
  note?: string
  lapsCaptured?: number
  tendencies?: {
    overslow: number
    lateThrottle: number
    earlyBrake: number
    hesitation: number
    aggression: number
    smoothness: number
  }
  consistency?: number
  weakCorners?: Array<{ label: string; avgLossMs: number }>
  strongCorners?: Array<{ label: string; avgLossMs: number }>
  stats?: { totalLaps: number; totalDriveSec: number; tracks: number; cars: number }
  updatedAt?: string
}

const TENDENCY_META: Record<string, { label: string; bad: string; good: string }> = {
  overslow:      { label: 'Over-slowing',     bad: 'You bleed mid-corner speed',           good: 'You carry good apex speed' },
  lateThrottle:  { label: 'Late throttle',    bad: 'You delay throttle pickup off corner', good: 'You roll back to power early' },
  earlyBrake:    { label: 'Early braking',    bad: 'You brake before you need to',          good: 'You commit to late braking' },
  hesitation:    { label: 'Mid-corner lift',  bad: 'You lift off throttle mid-corner',     good: 'You hold throttle through' },
  aggression:    { label: 'Throttle aggro',   bad: 'You snap throttle — wheelspin risk',   good: 'You modulate throttle smoothly' },
  smoothness:    { label: 'Smoothness',       bad: 'Choppy steering — costs tire life',    good: 'Smooth hands — saves tires' },
}

export default function DNAPage() {
  const [data, setData] = useState<DnaResp | null>(null)

  useEffect(() => {
    fetch('/api/dna/me').then(r => r.json()).then(setData).catch(() => setData({ ready: false }))
  }, [])

  if (!data) return (
    <div className="flex items-center gap-2 text-cyan-300 p-10">
      <Loader2 size={16} className="animate-spin" /> Analyzing your driving DNA…
    </div>
  )

  if (!data.ready) return (
    <div className="max-w-2xl mx-auto p-10 text-center">
      <Brain size={48} className="mx-auto mb-4" style={{ color: '#a855f7' }} />
      <h1 className="font-display text-2xl text-white mb-2 tracking-wide">DRIVING DNA</h1>
      <p className="text-slate-400">{data.note || 'Drive a few sessions with telemetry running to unlock your DNA.'}</p>
      {data.lapsCaptured != null && (
        <div className="mt-4 text-sm text-slate-500">{data.lapsCaptured} laps captured so far</div>
      )}
    </div>
  )

  const t = data.tendencies!
  const cons = data.consistency || 0

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <header>
        <div className="text-[10px] font-bold tracking-[0.22em] uppercase mb-1" style={{ color: '#a855f7' }}>
          Driving DNA
        </div>
        <h1 className="font-display text-3xl text-white tracking-wide">Your Fingerprint</h1>
        <p className="text-sm text-slate-400 mt-1">
          Computed live from {data.stats?.totalLaps || 0} laps across {data.stats?.tracks || 0} track(s) and {data.stats?.cars || 0} car(s).
          {data.updatedAt && <span className="text-slate-600"> · Updated {new Date(data.updatedAt).toLocaleString()}</span>}
        </p>
      </header>

      {/* Top stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Stat label="Total laps"   value={String(data.stats?.totalLaps || 0)} accent="#00e5ff" />
        <Stat label="Hours driven" value={((data.stats?.totalDriveSec || 0) / 3600).toFixed(1) + 'h'} accent="#a3ff00" />
        <Stat label="Consistency"  value={cons + '%'} accent={cons > 90 ? '#39ff14' : cons > 80 ? '#f5c518' : '#ff8080'} />
        <Stat label="Tracks · Cars" value={`${data.stats?.tracks || 0} · ${data.stats?.cars || 0}`} accent="#a855f7" />
      </div>

      {/* Tendency bars */}
      <div className="rounded-xl p-5 border" style={{ background: 'rgba(20,20,32,0.6)', borderColor: 'rgba(168,85,247,0.20)' }}>
        <h3 className="text-[11px] font-bold tracking-[0.2em] uppercase mb-3" style={{ color: '#a855f7' }}>
          Tendencies
        </h3>
        <div className="space-y-3">
          {Object.entries(t).map(([key, value]) => (
            <Bar key={key} k={key} value={value as number} />
          ))}
        </div>
      </div>

      {/* Weak vs strong corners */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="rounded-xl p-5 border" style={{ background: 'rgba(255,58,58,0.04)', borderColor: 'rgba(255,58,58,0.20)' }}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={14} style={{ color: '#ff8080' }} />
            <h3 className="text-[11px] font-bold tracking-[0.2em] uppercase" style={{ color: '#ff8080' }}>Weak Corners</h3>
          </div>
          {!data.weakCorners?.length ? (
            <div className="text-sm text-slate-500">Not enough lap-vs-lap data yet.</div>
          ) : data.weakCorners.map((c, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b last:border-0"
                 style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              <span className="text-[13px] text-white font-bold">#{i + 1} {c.label}</span>
              <span className="font-mono text-[12px] text-[#ff8080]">-{(c.avgLossMs / 1000).toFixed(3)}s</span>
            </div>
          ))}
        </div>

        <div className="rounded-xl p-5 border" style={{ background: 'rgba(57,255,20,0.04)', borderColor: 'rgba(57,255,20,0.20)' }}>
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 size={14} style={{ color: '#39ff14' }} />
            <h3 className="text-[11px] font-bold tracking-[0.2em] uppercase" style={{ color: '#39ff14' }}>Strong Corners</h3>
          </div>
          {!data.strongCorners?.length ? (
            <div className="text-sm text-slate-500">Not enough lap-vs-lap data yet.</div>
          ) : data.strongCorners.map((c, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b last:border-0"
                 style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              <span className="text-[13px] text-white font-bold">{c.label}</span>
              <span className="font-mono text-[12px] text-[#39ff14]">-{(c.avgLossMs / 1000).toFixed(3)}s</span>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-xl p-4 border flex items-start gap-3"
           style={{ background: 'rgba(0,229,255,0.04)', borderColor: 'rgba(0,229,255,0.20)' }}>
        <Award size={20} style={{ color: '#00e5ff' }} className="mt-0.5 shrink-0" />
        <div className="text-[13px] text-slate-300 leading-relaxed">
          Your DNA updates after every session. Focus your next practice on the <span className="text-[#ff8080] font-bold">weak corners</span> above —
          Chief's voice coach will target them automatically using your{' '}
          <span className="text-white font-bold">{cons}% consistency</span> baseline.
        </div>
      </div>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="rounded-xl p-3 border" style={{ background: 'rgba(20,20,32,0.6)', borderColor: 'rgba(255,255,255,0.06)' }}>
      <div className="text-[10px] font-bold tracking-[0.18em] uppercase text-slate-500 mb-1">{label}</div>
      <div className="font-mono text-xl font-extrabold" style={{ color: accent }}>{value}</div>
    </div>
  )
}

function Bar({ k, value }: { k: string; value: number }) {
  const meta = TENDENCY_META[k]
  if (!meta) return null
  const isInverted = k === 'smoothness'  // for smoothness, high is good
  const isBad = isInverted ? value < 50 : value > 50
  const color = isBad ? '#ff8080' : '#39ff14'
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[13px] text-white font-bold">{meta.label}</span>
        <span className="font-mono text-[11px]" style={{ color }}>{value}/100</span>
      </div>
      <div className="h-2 rounded-full" style={{ background: 'rgba(255,255,255,0.05)' }}>
        <div className="h-full rounded-full transition-all duration-700"
             style={{ width: `${value}%`, background: color, boxShadow: `0 0 8px ${color}40` }} />
      </div>
      <div className="text-[11px] text-slate-500 mt-1">{isBad ? meta.bad : meta.good}</div>
    </div>
  )
}
