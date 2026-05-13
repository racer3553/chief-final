'use client'
// /dashboard/lose-time — Chief's HERO page. Answers the one question every
// sim racer asks: "Where am I losing time, and what do I do next lap?"
// Reads /api/insights/where-losing-time and treats the result like a podium:
// big opportunity number up top, top-3 corner cards with a "next-lap fix" each,
// and a one-tap "Ask Chief" button per corner to explore deeper.

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Loader2, Target, Zap, ArrowRight, MessageSquare, AlertCircle } from 'lucide-react'

interface Corner {
  rank: number
  sectorIndex: number
  sectorLabel: string
  track: string
  car: string
  sessionId: string
  lossSeconds: number
  tip: string
  why: string
}

interface Resp {
  ready: boolean
  note?: string
  sessionCount?: number
  totalOpportunityS?: number
  totalDriveMin?: number
  topCorners?: Corner[]
}

const RANK_ACCENT = ['#a3ff00', '#00e5ff', '#f5c518', '#ff8080', '#a855f7']

export default function LoseTimePage() {
  const [data, setData] = useState<Resp | null>(null)
  const [refreshing, setRefreshing] = useState(false)

  const load = async () => {
    setRefreshing(true)
    try {
      const r = await fetch('/api/insights/where-losing-time', { cache: 'no-store' })
      const j = await r.json()
      setData(j)
    } catch {
      setData({ ready: false, note: 'Could not reach insight engine.' })
    } finally {
      setRefreshing(false)
    }
  }

  useEffect(() => { load() }, [])

  if (!data) return (
    <div className="flex items-center gap-2 text-[#a3ff00] p-10">
      <Loader2 size={16} className="animate-spin" /> Crunching your last 5 sessions…
    </div>
  )

  if (!data.ready) return (
    <div className="max-w-2xl mx-auto p-10 text-center">
      <Target size={48} className="mx-auto mb-4" style={{ color: '#a3ff00' }} />
      <h1 className="font-display text-2xl text-white mb-2 tracking-wide">WHERE AM I LOSING TIME?</h1>
      <p className="text-slate-400">{data.note || 'Drive a few sessions with telemetry to unlock loss analysis.'}</p>
      {data.sessionCount != null && (
        <div className="mt-4 text-sm text-slate-500">{data.sessionCount} session(s) captured</div>
      )}
    </div>
  )

  const opp = data.totalOpportunityS || 0
  const corners = data.topCorners || []

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      {/* HERO */}
      <header className="rounded-2xl p-6 border relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(163,255,0,0.08), rgba(0,229,255,0.04))', borderColor: 'rgba(163,255,0,0.30)' }}>
        <div className="text-[10px] font-bold tracking-[0.22em] uppercase mb-2" style={{ color: '#a3ff00' }}>
          The most important question
        </div>
        <h1 className="font-display text-3xl md:text-4xl text-white tracking-wide mb-2">
          Where am I losing time?
        </h1>
        <div className="flex items-baseline gap-3 flex-wrap">
          <div className="font-mono text-5xl md:text-6xl font-extrabold leading-none" style={{ color: '#a3ff00' }}>
            {opp.toFixed(2)}s
          </div>
          <div className="text-slate-300 text-sm">
            on the table across your last <span className="font-bold text-white">{data.sessionCount}</span> session(s)
            {data.totalDriveMin ? <> ({data.totalDriveMin} min driven)</> : null}
          </div>
        </div>
        <div className="text-[12px] text-slate-400 mt-2">
          Top 3 corners below. Each one shows what Chief saw and what to do on the NEXT lap to take it back.
        </div>
        <button onClick={load} disabled={refreshing}
          className="absolute top-4 right-4 px-3 py-1.5 rounded-lg text-[11px] font-bold tracking-wider uppercase border transition-all"
          style={{ borderColor: 'rgba(163,255,0,0.40)', color: '#a3ff00', background: 'rgba(0,0,0,0.30)' }}>
          {refreshing ? <Loader2 size={11} className="animate-spin inline" /> : 'Refresh'}
        </button>
      </header>

      {/* CORNER CARDS */}
      <div className="space-y-3">
        {corners.length === 0 ? (
          <div className="rounded-xl p-6 border text-center text-slate-400"
               style={{ background: 'rgba(20,20,32,0.6)', borderColor: 'rgba(255,255,255,0.06)' }}>
            <AlertCircle size={20} className="mx-auto mb-2 text-slate-500" />
            No corners exceeded the loss threshold — you're consistent across sectors. Push harder somewhere new.
          </div>
        ) : corners.map(c => {
          const accent = RANK_ACCENT[c.rank - 1] || '#a3ff00'
          return (
            <div key={`${c.sessionId}-${c.sectorIndex}`} className="rounded-2xl p-5 border relative"
              style={{ background: 'rgba(20,20,32,0.6)', borderColor: accent + '40' }}>
              <div className="flex items-start gap-4">
                <div className="shrink-0 w-12 h-12 rounded-xl flex items-center justify-center font-display font-extrabold text-xl"
                     style={{ background: accent + '20', color: accent, border: `1px solid ${accent}60` }}>
                  #{c.rank}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-baseline gap-3 flex-wrap">
                    <div className="font-display text-xl text-white tracking-wide">{c.sectorLabel}</div>
                    <div className="text-[12px] text-slate-500">
                      {c.track} · {c.car}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-3">
                    <Zap size={14} style={{ color: accent }} />
                    <div className="text-[15px] text-white font-bold">{c.tip}</div>
                  </div>
                  <div className="text-[12px] text-slate-400 mt-1">
                    <span className="uppercase font-bold tracking-wider text-slate-500">Why:</span> {c.why}
                  </div>
                </div>
                <div className="shrink-0 text-right">
                  <div className="text-[10px] font-bold tracking-wider uppercase text-slate-500">Loss</div>
                  <div className="font-mono text-2xl font-extrabold" style={{ color: accent }}>
                    -{c.lossSeconds.toFixed(3)}s
                  </div>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t flex flex-wrap gap-2"
                   style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
                <Link href={`/dashboard/sessions/${c.sessionId}`}
                  className="px-3 py-1.5 rounded-md text-[12px] font-bold border flex items-center gap-1.5 transition-all hover:scale-[1.02]"
                  style={{ borderColor: 'rgba(255,255,255,0.10)', color: '#c0c8d4' }}>
                  View source lap <ArrowRight size={12} />
                </Link>
                <Link
                  href={`/dashboard/ai-chat?q=${encodeURIComponent(`How do I fix ${c.sectorLabel} at ${c.track}? My current issue is: ${c.why}`)}`}
                  className="px-3 py-1.5 rounded-md text-[12px] font-bold border flex items-center gap-1.5 transition-all hover:scale-[1.02]"
                  style={{ borderColor: accent + '60', color: accent, background: accent + '10' }}>
                  <MessageSquare size={12} /> Ask Chief about this
                </Link>
              </div>
            </div>
          )
        })}
      </div>

      {/* FOOTER NOTE */}
      <div className="rounded-xl p-4 border flex items-start gap-3"
           style={{ background: 'rgba(0,229,255,0.04)', borderColor: 'rgba(0,229,255,0.20)' }}>
        <Target size={18} style={{ color: '#00e5ff' }} className="mt-0.5 shrink-0" />
        <div className="text-[12.5px] text-slate-300 leading-relaxed">
          Chief watches every session and rebuilds this list automatically. Each corner is ranked by
          AVERAGE loss across your laps vs your own best — so you're benchmarked against your fastest self,
          not some pro. Fix the #1 corner and your next session's opportunity number drops by that much.
        </div>
      </div>
    </div>
  )
}
