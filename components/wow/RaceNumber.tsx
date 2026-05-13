'use client'
// RaceNumber — animated digit counter for lap times, deltas, lap counts.
// Drops in anywhere you previously rendered a number. Counts up from 0 in
// 600ms with an ease-out curve and a subtle character roll. Adds zero
// engineering effort to the rest of the app; just import + replace.
//
// Usage:
//   <RaceNumber value={1.487} format="time" />        // 1:487
//   <RaceNumber value={108.748} format="laptime" />   // 1:48.748
//   <RaceNumber value={8} format="int" />             // 8
//   <RaceNumber value={-0.342} format="delta" />      // -0.342 (red/green)

import { useEffect, useRef, useState } from 'react'

type Format = 'int' | 'decimal' | 'laptime' | 'delta' | 'percent'

interface Props {
  value: number | null | undefined
  format?: Format
  duration?: number
  className?: string
  prefix?: string
  suffix?: string
}

export default function RaceNumber({
  value,
  format = 'decimal',
  duration = 600,
  className = '',
  prefix = '',
  suffix = '',
}: Props) {
  const [display, setDisplay] = useState(0)
  const start = useRef(0)
  const from = useRef(0)
  const rafRef = useRef<number>()
  const target = typeof value === 'number' && isFinite(value) ? value : 0

  useEffect(() => {
    cancelAnimationFrame(rafRef.current || 0)
    start.current = performance.now()
    from.current = display
    const animate = (now: number) => {
      const t = Math.min(1, (now - start.current) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      const v = from.current + (target - from.current) * eased
      setDisplay(v)
      if (t < 1) rafRef.current = requestAnimationFrame(animate)
    }
    rafRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(rafRef.current || 0)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target, duration])

  const formatted = formatValue(display, format)
  const deltaClass = format === 'delta' && target !== 0
    ? (target < 0 ? 'text-[#39ff14]' : 'text-[#ff3a3a]')
    : ''

  return (
    <span className={`tabular-nums font-mono-chief ${deltaClass} ${className}`}>
      {prefix}{formatted}{suffix}
    </span>
  )
}

function formatValue(v: number, fmt: Format): string {
  if (!isFinite(v)) return '—'
  switch (fmt) {
    case 'int':
      return Math.round(v).toString()
    case 'decimal':
      return v.toFixed(3)
    case 'laptime': {
      if (v <= 0) return '—'
      const m = Math.floor(v / 60)
      const s = v - m * 60
      return m > 0 ? `${m}:${s.toFixed(3).padStart(6, '0')}` : s.toFixed(3)
    }
    case 'delta':
      return (v >= 0 ? '+' : '') + v.toFixed(3)
    case 'percent':
      return v.toFixed(1) + '%'
    default:
      return v.toFixed(3)
  }
}
