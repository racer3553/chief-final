'use client'
import { useState } from 'react'
import { Wind, Sparkles, Loader2, Headphones, Lock } from 'lucide-react'
import PageHero from '@/components/shared/PageHero'

export default function AeroAIPage() {
  const [q, setQ] = useState(''); const [a, setA] = useState(''); const [loading, setLoading] = useState(false)
  const ask = async () => {
    if (!q.trim()) return
    setLoading(true); setA('')
    try {
      const r = await fetch('/api/ai/ask-chief', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: `[AERO context] ${q}` }) })
      const j = await r.json(); setA(j.answer || j.error || 'No answer')
    } catch (e: any) { setA('Error: ' + e.message) } setLoading(false)
  }
  return (
    <div className="max-w-4xl">
      <PageHero title="Aero AI" subtitle="Aerodynamics coach — wing, splitter, downforce vs drag" badge="REAL RACECAR · AI" accent="#22c55e" icon={Wind} />
      <div className="rounded-xl p-4 border mb-4 flex items-center gap-3" style={{ background: 'rgba(34,197,94,0.06)', borderColor: 'rgba(34,197,94,0.20)' }}>
        <Headphones size={14} style={{ color: '#22c55e' }} />
        <div className="text-xs text-slate-400">Ask about wing settings, splitters, downforce vs drag tradeoffs, ride heights — Chief draws from your session history.</div>
      </div>
      <div className="flex gap-2 mb-4">
        <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') ask() }}
          placeholder='e.g. "Reduce drag at Daytona without losing rear grip in 3 and 4"'
          className="flex-1 px-4 py-3 rounded-lg bg-black/40 border text-white text-sm" style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
        <button onClick={ask} disabled={!q.trim() || loading}
          className="px-5 rounded-lg font-semibold text-white transition-all disabled:opacity-40 flex items-center gap-2"
          style={{ background: '#22c55e' }}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Ask Aero AI
        </button>
      </div>
      {a && <div className="rounded-lg p-4 border" style={{ background: 'rgba(0,0,0,0.4)', borderColor: 'rgba(34,197,94,0.20)' }}>
        <div className="text-white whitespace-pre-wrap leading-relaxed">{a}</div>
      </div>}
      <div className="flex items-center gap-1.5 text-[11px] text-slate-600 mt-6"><Lock size={11}/> Conversations private to your account.</div>
    </div>
  )
}
