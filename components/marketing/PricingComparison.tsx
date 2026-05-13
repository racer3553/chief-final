'use client'
// Coach Dave Delta vs Chief — the side-by-side everyone is already making in
// their head. Own the comparison.

import { Check, X, Sparkles } from 'lucide-react'

const ROWS: Array<{ label: string; chief: string | boolean; cd: string | boolean }> = [
  { label: 'Pre-made setups',                     chief: true,                          cd: true },
  { label: 'Auto-captures every session',         chief: true,                          cd: false },
  { label: 'In-ear voice coach during racing',    chief: true,                          cd: false },
  { label: 'Reads YOUR Coach Dave setups',        chief: true,                          cd: 'You upload manually' },
  { label: 'Learns YOUR weak corners',            chief: true,                          cd: false },
  { label: 'Tells you what to change to go faster', chief: 'AI — every lap',           cd: 'Generic guide' },
  { label: 'Fuel + tire strategy live',           chief: true,                          cd: false },
  { label: 'Race-day setup recommendations',      chief: 'AI, weather-aware',          cd: 'PDFs' },
  { label: 'Reads your hardware (Simucube, Moza)', chief: true,                         cd: false },
  { label: 'Auto-saves screenshots of your apps', chief: true,                          cd: false },
  { label: 'Ambient cockpit lights sync',         chief: 'Govee LAN built-in',         cd: false },
  { label: 'Per-car / per-track profiles',        chief: true,                          cd: true },
  { label: 'Setup file library',                  chief: 'Auto + cloud backup',        cd: 'Local only' },
  { label: 'Memory of every session forever',     chief: true,                          cd: false },
  { label: 'Works offline',                       chief: 'Local-first daemon',         cd: true },
]

export default function PricingComparison() {
  return (
    <div className="max-w-5xl mx-auto">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 rounded-full px-3 py-1 mb-3 border" style={{ background: 'rgba(163,255,0,0.06)', borderColor: 'rgba(163,255,0,0.25)' }}>
          <Sparkles size={12} style={{ color: '#a3ff00' }} />
          <span className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#a3ff00' }}>Honest comparison</span>
        </div>
        <h2 className="font-display text-3xl text-white tracking-wide mb-1">Chief vs Coach Dave Delta</h2>
        <p className="text-slate-400 text-sm">Both are great. They do different things. Here&apos;s the split.</p>
      </div>

      <div className="rounded-xl border overflow-hidden" style={{ background: 'rgba(20,20,32,0.6)', borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="grid grid-cols-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="p-4 text-[10px] font-bold tracking-widest uppercase text-slate-500">Feature</div>
          <div className="p-4 text-center" style={{ background: 'rgba(0,229,255,0.08)' }}>
            <div className="text-[10px] font-bold tracking-widest uppercase mb-1" style={{ color: '#00e5ff' }}>Chief</div>
            <div className="text-[11px] text-slate-400">AI Crew Chief · live · auto-everything</div>
          </div>
          <div className="p-4 text-center">
            <div className="text-[10px] font-bold tracking-widest uppercase mb-1 text-slate-400">Coach Dave Delta</div>
            <div className="text-[11px] text-slate-500">Setup database · manual</div>
          </div>
        </div>
        {ROWS.map((r, i) => (
          <div key={i} className="grid grid-cols-3 border-b last:border-0 hover:bg-white/[0.02]" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
            <div className="p-3 text-[12.5px] text-slate-300">{r.label}</div>
            <Cell value={r.chief} accent="#00e5ff" highlight />
            <Cell value={r.cd}    accent="#94a3b8" />
          </div>
        ))}
      </div>

      <div className="mt-4 text-center text-[11px] text-slate-500">
        Coach Dave is great if you want pre-made setups for tracks you&apos;ve never seen.
        Chief is what you want when you&apos;re trying to get faster IN YOUR car AT YOUR track WITH YOUR style.
      </div>
    </div>
  )
}

function Cell({ value, accent, highlight }: { value: string | boolean; accent: string; highlight?: boolean }) {
  if (value === true) return (
    <div className="p-3 text-center" style={highlight ? { background: 'rgba(0,229,255,0.04)' } : {}}>
      <Check size={16} className="mx-auto" style={{ color: accent }} />
    </div>
  )
  if (value === false) return (
    <div className="p-3 text-center">
      <X size={16} className="mx-auto text-slate-700" />
    </div>
  )
  return (
    <div className="p-3 text-center text-[11.5px] font-semibold" style={highlight ? { background: 'rgba(0,229,255,0.04)', color: accent } : { color: '#94a3b8' }}>
      {value}
    </div>
  )
}
