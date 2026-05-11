'use client'
import { useState } from 'react'
import { Zap, Sparkles, Loader2, Headphones, Lock } from 'lucide-react'
import PageHero from '@/components/shared/PageHero'

export default function EngineTunerPage() {
  const [q, setQ] = useState(''); const [a, setA] = useState(''); const [loading, setLoading] = useState(false)
  const ask = async () => {
    if (!q.trim()) return
    setLoading(true); setA('')
    try {
      const r = await fetch('/api/ai/ask-chief', { method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: `[ENGINE/POWERTRAIN context] ${q}` }) })
      const j = await r.json(); setA(j.answer || j.error || 'No answer')
    } catch (e: any) { setA('Error: ' + e.message) } setLoading(false)
  }
  return (
    <div className="max-w-4xl">
      <PageHero title="Engine Tuner AI" subtitle="Powertrain coach — gear ratios, fuel maps, throttle, shift points" badge="REAL RACECAR · AI" accent="#f97316" icon={Zap} />
      <div className="rounded-xl p-4 border mb-4 flex items-center gap-3" style={{ background: 'rgba(249,115,22,0.06)', borderColor: 'rgba(249,115,22,0.20)' }}>
        <Headphones size={14} style={{ color: '#f97316' }} />
        <div className="text-xs text-slate-400">Ask about gear ratios, fuel maps, throttle curves, shift points, traction control — Chief uses your session data.</div>
      </div>
      <div className="flex gap-2 mb-4">
        <input value={q} onChange={e => setQ(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') ask() }}
          placeholder='e.g. "Optimal final drive for Watkins Glen long course?"'
          className="flex-1 px-4 py-3 rounded-lg bg-black/40 border text-white text-sm" style={{ borderColor: 'rgba(255,255,255,0.1)' }} />
        <button onClick={ask} disabled={!q.trim() || loading}
          className="px-5 rounded-lg font-semibold text-white transition-all disabled:opacity-40 flex items-center gap-2"
          style={{ background: '#f97316' }}>
          {loading ? <Loader2 size={16} className="animate-spin" /> : <Sparkles size={16} />} Ask
        </button>
      </div>
      {a && <div className="rounded-lg p-4 border" style={{ background: 'rgba(0,0,0,0.4)', borderColor: 'rgba(249,115,22,0.20)' }}>
        <div className="text-white whitespace-pre-wrap leading-relaxed">{a}</div>
      </div>}
      <div className="flex items-center gap-1.5 text-[11px] text-slate-600 mt-6"><Lock size={11}/> Conversations private to your account.</div>
    </div>
  )
}
