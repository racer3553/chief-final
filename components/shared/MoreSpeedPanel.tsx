'use client'
// MORE SPEED — runs every AI analysis in parallel and shows ranked suggestions.
// Drops onto any session detail page.
import { useState } from 'react'
import { Zap, Loader2, AlertTriangle, CheckCircle, TrendingUp } from 'lucide-react'

export default function MoreSpeedPanel({ sessionId }: { sessionId: string }) {
  const [loading, setLoading] = useState(false)
  const [breakdown, setBreakdown] = useState<string>('')
  const [setup, setSetup] = useState<any>(null)
  const [ffb, setFfb] = useState<any>(null)
  const [pedals, setPedals] = useState<any>(null)
  const [err, setErr] = useState('')

  async function runAll() {
    setLoading(true); setErr(''); setBreakdown(''); setSetup(null); setFfb(null); setPedals(null)
    try {
      const [bRes, sRes, fRes, pRes] = await Promise.all([
        fetch(`/api/sessions/${sessionId}/ai-breakdown`).then(r => r.json()).catch(e => ({ error: e.message })),
        fetch('/api/ai/tune-setup', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: sessionId }) }).then(r => r.json()).catch(e => ({ error: e.message })),
        fetch('/api/ai/tune-ffb', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: sessionId }) }).then(r => r.json()).catch(e => ({ error: e.message })),
        fetch('/api/ai/tune-pedals', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ session_id: sessionId }) }).then(r => r.json()).catch(e => ({ error: e.message })),
      ])
      if (bRes.error && sRes.error && fRes.error && pRes.error) {
        setErr(bRes.error); return
      }
      setBreakdown(bRes.breakdown || '')
      setSetup(sRes.error ? null : sRes)
      setFfb(fRes.error ? null : fRes)
      setPedals(pRes.error ? null : pRes)
    } catch (e: any) {
      setErr(e.message)
    }
    setLoading(false)
  }

  return (
    <div className="rounded-2xl border overflow-hidden mb-6"
      style={{
        background: 'linear-gradient(135deg, rgba(163,255,0,0.05), rgba(255,0,170,0.05))',
        borderColor: 'rgba(163,255,0,0.30)',
        boxShadow: '0 0 40px rgba(163,255,0,0.10), 0 0 60px rgba(255,0,170,0.05)',
      }}>
      <div className="px-5 py-4 flex items-center justify-between gap-4 flex-wrap"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ background: 'linear-gradient(135deg, #a3ff00, #ff00aa)' }}>
            <Zap size={18} className="text-black" />
          </div>
          <div>
            <div className="text-[10px] font-bold tracking-[0.25em] uppercase" style={{ color: '#a3ff00' }}>MORE SPEED</div>
            <div className="text-base font-bold text-white">Get every AI suggestion at once</div>
            <div className="text-[11px] text-slate-500 mt-0.5">Setup · FFB · Pedals · Lap breakdown — ranked by lap-time impact</div>
          </div>
        </div>
        <button onClick={runAll} disabled={loading}
          className="px-5 py-2.5 rounded-lg text-sm font-bold disabled:opacity-50 flex items-center gap-2"
          style={{ background: 'linear-gradient(135deg, #a3ff00, #06b6d4)', color: '#000' }}>
          {loading ? <Loader2 size={14} className="animate-spin" /> : <TrendingUp size={14} />}
          {loading ? 'Chief is thinking...' : 'Find me speed'}
        </button>
      </div>

      {err && (
        <div className="px-5 py-3 flex items-center gap-2 text-sm text-red-300" style={{ background: 'rgba(239,68,68,0.06)' }}>
          <AlertTriangle size={14} /> {err}
        </div>
      )}

      {(breakdown || setup || ffb || pedals) && (
        <div className="p-5 space-y-5">
          {breakdown && (
            <Block title="SESSION BREAKDOWN" color="#06b6d4">
              <div className="text-sm text-slate-200 whitespace-pre-wrap leading-relaxed">{breakdown}</div>
            </Block>
          )}
          {setup && setup.top_changes && (
            <Block title="iRACING SETUP CHANGES" color="#f5c518">
              <Diagnosis text={setup.diagnosis} />
              <ChangeList items={setup.top_changes} accent="#f5c518" />
              {setup.summary && <Summary text={setup.summary} />}
            </Block>
          )}
          {ffb && ffb.top_changes && (
            <Block title="SIMUCUBE FFB CHANGES" color="#a3ff00">
              <Diagnosis text={ffb.diagnosis} />
              <ChangeList items={ffb.top_changes} accent="#a3ff00" />
              {ffb.summary && <Summary text={ffb.summary} />}
            </Block>
          )}
          {pedals && pedals.top_changes && (
            <Block title="PEDAL CHANGES" color="#ff00aa">
              <Diagnosis text={pedals.diagnosis} />
              <ChangeList items={pedals.top_changes} accent="#ff00aa" />
              {pedals.summary && <Summary text={pedals.summary} />}
            </Block>
          )}
        </div>
      )}
    </div>
  )
}

function Block({ title, color, children }: any) {
  return (
    <div className="rounded-xl border p-4" style={{ background: 'rgba(0,0,0,0.4)', borderColor: color + '30' }}>
      <div className="text-[10px] font-bold tracking-[0.25em] uppercase mb-3" style={{ color }}>{title}</div>
      {children}
    </div>
  )
}

function Diagnosis({ text }: { text: string }) {
  if (!text) return null
  return <div className="text-sm text-slate-300 italic mb-3 pl-3 border-l" style={{ borderColor: 'rgba(255,255,255,0.1)' }}>{text}</div>
}

function Summary({ text }: { text: string }) {
  return <div className="text-xs text-slate-500 mt-3 pl-3 border-l" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>{text}</div>
}

function ChangeList({ items, accent }: any) {
  return (
    <div className="space-y-2">
      {items.map((c: any, i: number) => (
        <div key={i} className="rounded-lg p-3 flex flex-col sm:flex-row gap-3" style={{ background: 'rgba(255,255,255,0.02)' }}>
          <div className="shrink-0 flex items-start">
            <div className="w-7 h-7 rounded-md flex items-center justify-center text-[11px] font-black" style={{ background: accent + '25', color: accent }}>
              #{i + 1}
            </div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold text-white">{c.area || c.setting}</div>
            <div className="flex flex-wrap gap-2 mt-1 text-[11px] font-mono">
              <span className="text-slate-500">From <span className="text-slate-300">{c.current ?? '—'}</span></span>
              <span style={{ color: accent }}>→ {c.suggested ?? '—'}</span>
            </div>
            <div className="text-xs text-slate-400 mt-1.5">{c.reason}</div>
            {(c.expected_gain || c.feel_change || c.expected_outcome) && (
              <div className="flex items-center gap-1.5 mt-1.5 text-[11px]">
                <CheckCircle size={11} style={{ color: accent }} />
                <span style={{ color: accent }} className="font-semibold">
                  {c.expected_gain || c.feel_change || c.expected_outcome}
                </span>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
