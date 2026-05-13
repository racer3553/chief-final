'use client'
// /dashboard/debrief/[sessionId] — post-session AI debrief page.
// Renders the structured response from /api/insights/race-debrief.
// Designed to feel like a printed crew-chief report: headline, win, mistake,
// setup note, consistency, action checklist, grade.

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { Loader2, Trophy, AlertTriangle, Wrench, Target, ListChecks, ArrowLeft, Sparkles, Activity } from 'lucide-react'

interface DebriefResp {
  ok: boolean
  sessionId: string
  session: {
    car: string | null
    track: string | null
    layout: string | null
    type: string | null
    started_at: string | null
    total_laps: number | null
    best_lap_time: number | null
    incidents: number | null
  }
  debrief: {
    headline?: string
    top_win?: string
    top_mistake?: string
    setup_observation?: string
    consistency_note?: string
    next_session_actions?: string[]
    grade?: string
    raw?: string
    parse_error?: boolean
  }
  analytics: {
    consistency_pct: number
    laps_analyzed: number
    sector_loss_top3: string
  }
  error?: string
}

const fmtTime = (s: number | null) => {
  if (!s || s <= 0) return '—'
  const m = Math.floor(s / 60)
  const sec = s - m * 60
  return m > 0 ? `${m}:${sec.toFixed(3).padStart(6, '0')}` : sec.toFixed(3)
}

const GRADE_COLOR: Record<string, string> = {
  'A+': '#39ff14', 'A': '#a3ff00', 'B': '#f5c518', 'C': '#ff9a3c', 'D': '#ff5050',
}

export default function DebriefPage() {
  const params = useParams<{ sessionId: string }>()
  const sessionId = params?.sessionId
  const [data, setData] = useState<DebriefResp | null>(null)
  const [err, setErr] = useState<string | null>(null)

  useEffect(() => {
    if (!sessionId) return
    setErr(null)
    setData(null)
    fetch(`/api/insights/race-debrief?sessionId=${sessionId}`)
      .then(r => r.json())
      .then(j => {
        if (j.error) { setErr(j.error); return }
        setData(j)
      })
      .catch(e => setErr(e.message))
  }, [sessionId])

  if (err) return (
    <div className="max-w-2xl mx-auto p-10 text-center">
      <AlertTriangle size={42} className="mx-auto mb-3 text-red-400" />
      <h1 className="font-display text-xl text-white">DEBRIEF FAILED</h1>
      <p className="text-slate-400 text-sm mt-2">{err}</p>
      <Link href="/dashboard/sessions" className="inline-block mt-4 text-cyan-300 underline">← Back to sessions</Link>
    </div>
  )

  if (!data) return (
    <div className="flex items-center gap-2 text-[#a3ff00] p-10">
      <Loader2 size={18} className="animate-spin" />
      <div>
        <div className="font-display text-lg text-white tracking-wide">Generating debrief…</div>
        <div className="text-[12px] text-slate-400">Chief is reading every lap of this session.</div>
      </div>
    </div>
  )

  const d = data.debrief
  const gradeColor = GRADE_COLOR[d.grade || ''] || '#00e5ff'

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      {/* Top bar */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <Link href={`/dashboard/sessions/${data.sessionId}`}
          className="inline-flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-white">
          <ArrowLeft size={13} /> Back to session
        </Link>
        <div className="text-[11px] text-slate-500">
          {data.session.started_at ? new Date(data.session.started_at).toLocaleString() : ''}
        </div>
      </div>

      {/* Headline card */}
      <div className="rounded-2xl p-6 border relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, rgba(163,255,0,0.08), rgba(0,229,255,0.04))', borderColor: 'rgba(163,255,0,0.30)' }}>
        <div className="text-[10px] font-bold tracking-[0.22em] uppercase mb-2" style={{ color: '#a3ff00' }}>
          Race Debrief
        </div>
        <h1 className="font-display text-2xl md:text-3xl text-white tracking-wide mb-1">
          {data.session.track || '?'} · {data.session.car || '?'}
        </h1>
        <div className="text-[12px] text-slate-400">
          {data.session.type || 'Session'} · {data.session.total_laps || 0} laps
          {data.session.best_lap_time ? <> · best {fmtTime(data.session.best_lap_time)}</> : null}
          {(data.session.incidents || 0) > 0 ? <> · {data.session.incidents} incidents</> : null}
        </div>

        {d.grade && (
          <div className="absolute top-4 right-4 w-16 h-16 rounded-2xl flex items-center justify-center font-display text-3xl font-extrabold"
               style={{ background: gradeColor + '20', border: `2px solid ${gradeColor}` , color: gradeColor }}>
            {d.grade}
          </div>
        )}

        {d.headline && (
          <div className="mt-4 text-[15px] text-white leading-relaxed">
            <Sparkles size={14} className="inline mr-1.5" style={{ color: '#a3ff00' }} />
            {d.headline}
          </div>
        )}
      </div>

      {d.parse_error && (
        <div className="rounded-xl p-4 border" style={{ background: 'rgba(255,200,0,0.08)', borderColor: 'rgba(255,200,0,0.25)' }}>
          <div className="text-[12px] text-amber-200">Chief returned an unstructured reply — showing raw:</div>
          <pre className="text-[12px] text-slate-200 whitespace-pre-wrap mt-2">{d.raw}</pre>
        </div>
      )}

      {/* Win / Mistake / Setup three-up */}
      <div className="grid md:grid-cols-3 gap-3">
        <Card icon={Trophy} accent="#39ff14" title="Top Win">
          {d.top_win || '—'}
        </Card>
        <Card icon={AlertTriangle} accent="#ff8080" title="Biggest Time Loss">
          {d.top_mistake || '—'}
        </Card>
        <Card icon={Wrench} accent="#f5c518" title="Setup Observation">
          {d.setup_observation || '—'}
        </Card>
      </div>

      {/* Consistency + Sector data */}
      <div className="grid md:grid-cols-2 gap-3">
        <div className="rounded-xl p-5 border" style={{ background: 'rgba(0,229,255,0.04)', borderColor: 'rgba(0,229,255,0.20)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Activity size={14} style={{ color: '#00e5ff' }} />
            <div className="text-[11px] font-bold tracking-[0.18em] uppercase" style={{ color: '#00e5ff' }}>Consistency</div>
          </div>
          <div className="font-mono text-3xl font-extrabold" style={{ color: '#00e5ff' }}>
            {data.analytics.consistency_pct}%
          </div>
          <div className="text-[12px] text-slate-300 mt-2">{d.consistency_note || `Across ${data.analytics.laps_analyzed} timed laps.`}</div>
        </div>

        <div className="rounded-xl p-5 border" style={{ background: 'rgba(255,154,60,0.04)', borderColor: 'rgba(255,154,60,0.20)' }}>
          <div className="flex items-center gap-2 mb-2">
            <Target size={14} style={{ color: '#ff9a3c' }} />
            <div className="text-[11px] font-bold tracking-[0.18em] uppercase" style={{ color: '#ff9a3c' }}>Top Sector Losses</div>
          </div>
          <div className="text-[12px] text-slate-300 whitespace-pre-wrap leading-relaxed">
            {data.analytics.sector_loss_top3 || 'Insufficient telemetry'}
          </div>
        </div>
      </div>

      {/* Action checklist */}
      {d.next_session_actions && d.next_session_actions.length > 0 && (
        <div className="rounded-2xl p-5 border" style={{ background: 'rgba(163,255,0,0.04)', borderColor: 'rgba(163,255,0,0.25)' }}>
          <div className="flex items-center gap-2 mb-3">
            <ListChecks size={16} style={{ color: '#a3ff00' }} />
            <div className="text-[11px] font-bold tracking-[0.20em] uppercase" style={{ color: '#a3ff00' }}>Next Session — Action Checklist</div>
          </div>
          <div className="space-y-2">
            {d.next_session_actions.map((a, i) => (
              <div key={i} className="flex items-start gap-3 p-3 rounded-lg border"
                   style={{ background: 'rgba(0,0,0,0.30)', borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="shrink-0 w-7 h-7 rounded-full flex items-center justify-center font-display text-sm font-extrabold"
                     style={{ background: '#a3ff0020', color: '#a3ff00', border: '1px solid #a3ff0060' }}>
                  {i + 1}
                </div>
                <div className="text-[13.5px] text-white leading-relaxed flex-1">{a}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-[11px] text-slate-600 text-center pt-2">
        Chief Debrief · session {data.sessionId.slice(0, 8)}
      </div>
    </div>
  )
}

function Card({ icon: Icon, accent, title, children }: any) {
  return (
    <div className="rounded-xl p-5 border h-full" style={{ background: 'rgba(20,20,32,0.6)', borderColor: accent + '40' }}>
      <div className="flex items-center gap-2 mb-2">
        <Icon size={14} style={{ color: accent }} />
        <div className="text-[11px] font-bold tracking-[0.18em] uppercase" style={{ color: accent }}>{title}</div>
      </div>
      <div className="text-[13.5px] text-slate-200 leading-relaxed">{children}</div>
    </div>
  )
}
