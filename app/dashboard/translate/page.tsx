'use client'
// /dashboard/translate — Driver Feedback Translator.
// Driver clicks chips describing what the car was doing. Chief returns
// a ranked, click-count-level adjustment plan.

import { useState } from 'react'
import { Sparkles, Loader2, Zap, AlertTriangle, CheckCircle2, Wrench, Plus, X } from 'lucide-react'

const CHIP_GROUPS: { label: string; accent: string; chips: string[] }[] = [
  {
    label: 'Entry',
    accent: '#00e5ff',
    chips: [
      'Understeer on entry',
      'Locks fronts under braking',
      'Snap rotation off brake',
      'Rear steps out under threshold braking',
      'Won\'t turn in unless I lift',
      'Pitches forward — tucks nose',
    ],
  },
  {
    label: 'Mid-corner',
    accent: '#a3ff00',
    chips: [
      'Mid-corner understeer',
      'Mid-corner oversteer',
      'Pushes wide on the apex',
      'Loose / floats through mid',
      'Front tires giving up first',
      'Rear tires giving up first',
      'Needs me to wait on throttle forever',
    ],
  },
  {
    label: 'Exit',
    accent: '#f5c518',
    chips: [
      'Power-on oversteer',
      'Power-on understeer / push',
      'Wheelspin on exit',
      'Snaps loose when I crack throttle',
      'Won\'t put power down off slow corners',
      'Lazy off the corner',
    ],
  },
  {
    label: 'General',
    accent: '#ff00aa',
    chips: [
      'Tires overheating',
      'Tires falling off after 4-5 laps',
      'Eats the right front',
      'Eats the left rear',
      'Brakes fade late in the run',
      'Inconsistent — bites randomly',
      'Bottoms out on bumps',
      'Bouncy at high speed',
    ],
  },
]

interface Adjustment { change: string; why: string; priority: number }
interface Result {
  summary?: string
  adjustments?: Adjustment[]
  warnings?: string[]
  verify?: string
  raw?: string
  parse_error?: boolean
}

export default function TranslatePage() {
  const [selected, setSelected] = useState<string[]>([])
  const [free, setFree] = useState('')
  const [car, setCar] = useState('')
  const [track, setTrack] = useState('')
  const [busy, setBusy] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [err, setErr] = useState<string | null>(null)

  const toggle = (c: string) => {
    setSelected(s => s.includes(c) ? s.filter(x => x !== c) : [...s, c])
  }

  const submit = async () => {
    if (selected.length === 0 && !free.trim()) {
      setErr('Pick at least one chip or describe the problem.')
      return
    }
    setBusy(true); setErr(null); setResult(null)
    try {
      const r = await fetch('/api/insights/translate-feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chips: selected, freeText: free, car, track }),
      })
      const j = await r.json()
      if (j.error) setErr(j.error)
      else setResult(j.result)
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setBusy(false)
    }
  }

  const reset = () => { setSelected([]); setFree(''); setResult(null); setErr(null) }

  return (
    <div className="max-w-4xl mx-auto space-y-4">
      <header>
        <div className="text-[10px] font-bold tracking-[0.22em] uppercase mb-1" style={{ color: '#ff00aa' }}>
          Feedback Translator
        </div>
        <h1 className="font-display text-3xl text-white tracking-wide">Tell Chief what the car is doing.</h1>
        <p className="text-sm text-slate-400 mt-1">
          Tap the chips that match how the car feels. Chief returns a ranked, click-by-click plan to fix it.
        </p>
      </header>

      {/* Optional context */}
      <div className="grid md:grid-cols-2 gap-2">
        <input value={car} onChange={e => setCar(e.target.value)}
          placeholder="Car (optional)" className="px-3 py-2 rounded-lg bg-[#0f1218] text-sm text-white border outline-none"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
        <input value={track} onChange={e => setTrack(e.target.value)}
          placeholder="Track (optional)" className="px-3 py-2 rounded-lg bg-[#0f1218] text-sm text-white border outline-none"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
      </div>

      {/* Chip groups */}
      <div className="space-y-3">
        {CHIP_GROUPS.map(g => (
          <div key={g.label} className="rounded-xl p-4 border"
               style={{ background: 'rgba(20,20,32,0.6)', borderColor: g.accent + '30' }}>
            <div className="text-[11px] font-bold tracking-[0.20em] uppercase mb-2" style={{ color: g.accent }}>
              {g.label}
            </div>
            <div className="flex flex-wrap gap-2">
              {g.chips.map(c => {
                const on = selected.includes(c)
                return (
                  <button key={c} onClick={() => toggle(c)}
                    className="px-3 py-1.5 rounded-full text-[12.5px] font-bold transition-all"
                    style={{
                      background: on ? g.accent : 'rgba(255,255,255,0.04)',
                      color: on ? '#000' : '#c0c8d4',
                      border: `1px solid ${on ? g.accent : 'rgba(255,255,255,0.10)'}`,
                      transform: on ? 'scale(1.04)' : 'scale(1)',
                    }}>
                    {on ? <span>✓ </span> : null}{c}
                  </button>
                )
              })}
            </div>
          </div>
        ))}
      </div>

      {/* Free text + selected pills */}
      <div className="rounded-xl p-4 border" style={{ background: 'rgba(20,20,32,0.6)', borderColor: 'rgba(255,255,255,0.08)' }}>
        {selected.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mb-3">
            {selected.map(c => (
              <span key={c} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-bold"
                    style={{ background: 'rgba(255,0,170,0.15)', color: '#ff00aa', border: '1px solid rgba(255,0,170,0.30)' }}>
                {c}
                <button onClick={() => toggle(c)} className="hover:text-white"><X size={10} /></button>
              </span>
            ))}
          </div>
        )}
        <textarea value={free} onChange={e => setFree(e.target.value)}
          placeholder="Anything weird that's not on a chip? (e.g. 'Brakes are fine cold but get long after lap 6')"
          rows={3}
          className="w-full px-3 py-2 rounded-lg bg-[#0f1218] text-sm text-white border outline-none resize-none"
          style={{ borderColor: 'rgba(255,255,255,0.08)' }} />
        <div className="flex items-center gap-2 mt-3">
          <button onClick={submit} disabled={busy}
            className="px-5 py-2.5 rounded-lg font-bold text-sm inline-flex items-center gap-2 transition disabled:opacity-50"
            style={{ background: 'linear-gradient(135deg,#ff00aa,#a3ff00)', color: '#000' }}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {busy ? 'Translating…' : 'Translate to Setup Plan'}
          </button>
          {(selected.length > 0 || free || result) && (
            <button onClick={reset}
              className="px-4 py-2.5 rounded-lg font-bold text-sm border text-slate-300 hover:text-white transition"
              style={{ borderColor: 'rgba(255,255,255,0.10)' }}>
              Reset
            </button>
          )}
        </div>
        {err && (
          <div className="mt-3 text-[12px] text-red-300 flex items-center gap-1.5">
            <AlertTriangle size={12} /> {err}
          </div>
        )}
      </div>

      {/* Result */}
      {result && (
        <div className="space-y-3">
          {result.summary && (
            <div className="rounded-xl p-5 border"
                 style={{ background: 'linear-gradient(135deg, rgba(255,0,170,0.06), rgba(163,255,0,0.04))', borderColor: 'rgba(255,0,170,0.30)' }}>
              <div className="text-[10px] font-bold tracking-[0.22em] uppercase mb-1" style={{ color: '#ff00aa' }}>Diagnosis</div>
              <div className="text-[15px] text-white leading-relaxed">{result.summary}</div>
            </div>
          )}

          {result.parse_error && (
            <div className="rounded-xl p-4 border" style={{ background: 'rgba(255,200,0,0.08)', borderColor: 'rgba(255,200,0,0.25)' }}>
              <div className="text-[12px] text-amber-200">Chief returned an unstructured reply:</div>
              <pre className="text-[12px] text-slate-200 whitespace-pre-wrap mt-2">{result.raw}</pre>
            </div>
          )}

          {result.adjustments && result.adjustments.length > 0 && (
            <div className="space-y-2">
              <div className="text-[11px] font-bold tracking-[0.20em] uppercase text-[#a3ff00] flex items-center gap-1.5">
                <Wrench size={12} /> Adjustments to try (in order)
              </div>
              {result.adjustments
                .sort((a, b) => (a.priority || 99) - (b.priority || 99))
                .map((a, i) => (
                <div key={i} className="rounded-xl p-4 border flex items-start gap-3"
                     style={{ background: 'rgba(20,20,32,0.6)', borderColor: i === 0 ? 'rgba(163,255,0,0.30)' : 'rgba(255,255,255,0.08)' }}>
                  <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center font-display text-base font-extrabold"
                       style={{ background: i === 0 ? '#a3ff0030' : 'rgba(255,255,255,0.05)', color: i === 0 ? '#a3ff00' : '#c0c8d4', border: `1px solid ${i === 0 ? '#a3ff0060' : 'rgba(255,255,255,0.10)'}` }}>
                    {i + 1}
                  </div>
                  <div className="flex-1">
                    <div className="text-[14px] text-white font-bold leading-tight">
                      <Zap size={12} className="inline mr-1" style={{ color: i === 0 ? '#a3ff00' : '#aaa' }} />
                      {a.change}
                    </div>
                    <div className="text-[12px] text-slate-400 mt-1">{a.why}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {result.warnings && result.warnings.length > 0 && (
            <div className="rounded-xl p-4 border" style={{ background: 'rgba(255,154,60,0.05)', borderColor: 'rgba(255,154,60,0.25)' }}>
              <div className="text-[10px] font-bold tracking-[0.20em] uppercase mb-2" style={{ color: '#ff9a3c' }}>
                Watch out for
              </div>
              <ul className="space-y-1">
                {result.warnings.map((w, i) => (
                  <li key={i} className="text-[12.5px] text-slate-300 flex items-start gap-2">
                    <AlertTriangle size={11} className="mt-1 shrink-0" style={{ color: '#ff9a3c' }} />
                    {w}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {result.verify && (
            <div className="rounded-xl p-4 border flex items-start gap-3"
                 style={{ background: 'rgba(57,255,20,0.04)', borderColor: 'rgba(57,255,20,0.20)' }}>
              <CheckCircle2 size={16} style={{ color: '#39ff14' }} className="shrink-0 mt-0.5" />
              <div className="text-[13px] text-slate-200">
                <span className="font-bold text-white">If it worked: </span>{result.verify}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
