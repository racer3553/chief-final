'use client'
// ScanReveal — wraps content with a "reading file…" animation before revealing.
// Drop this around screenshot upload results, .sto parsing output, AI replies, etc.
// Makes data feel earned instead of instantly appearing.
//
// Usage:
//   <ScanReveal label="Reading setup file" lines={['Found 47 values', 'Decoded car ID', 'Matched track Daytona']}>
//     <YourActualParsedData />
//   </ScanReveal>

import { ReactNode, useEffect, useState } from 'react'
import { Loader2, CheckCircle2 } from 'lucide-react'

interface Props {
  children: ReactNode
  label?: string
  lines?: string[]
  duration?: number   // ms per line (default 250)
  enabled?: boolean   // pass false to skip animation
}

export default function ScanReveal({
  children,
  label = 'Reading file',
  lines = ['Scanning…', 'Parsing values', 'Validating', 'Ready'],
  duration = 250,
  enabled = true,
}: Props) {
  const [step, setStep] = useState(0)
  const [done, setDone] = useState(!enabled)

  useEffect(() => {
    if (!enabled) { setDone(true); return }
    let s = 0
    const tick = () => {
      s += 1
      setStep(s)
      if (s >= lines.length) {
        setTimeout(() => setDone(true), 200)
      } else {
        setTimeout(tick, duration)
      }
    }
    const t = setTimeout(tick, duration)
    return () => clearTimeout(t)
  }, [enabled, duration, lines.length])

  if (done) return <>{children}</>

  return (
    <div className="rounded-xl p-5 border font-mono text-[12px] space-y-1"
         style={{ background: 'rgba(0,0,0,0.55)', borderColor: 'rgba(0,229,255,0.25)' }}>
      <div className="flex items-center gap-2 mb-2 text-cyan-300">
        <Loader2 size={14} className="animate-spin" />
        <span className="font-bold tracking-wider uppercase text-[11px]">{label}…</span>
      </div>
      {lines.slice(0, step).map((ln, i) => (
        <div key={i} className="flex items-center gap-2 text-slate-300 animate-line-in">
          <CheckCircle2 size={11} className="text-[#39ff14] shrink-0" />
          <span>{ln}</span>
        </div>
      ))}
      <style jsx>{`
        @keyframes lineIn {
          from { opacity: 0; transform: translateX(-6px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .animate-line-in { animation: lineIn 180ms ease-out; }
      `}</style>
    </div>
  )
}
