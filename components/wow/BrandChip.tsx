'use client'
// BrandChip — pure SVG vendor logo chip, no external image deps.
// Used in Steering/Brakes/Lights pages to make hardware vendors instantly identifiable.
// Each chip is a uniform 24x24 with brand-correct color + glyph.

interface Props {
  vendor: string
  size?: number
  label?: boolean
}

const BRANDS: Record<string, { bg: string; fg: string; letter: string; name: string }> = {
  simucube:     { bg: '#fa6b1f', fg: '#fff', letter: 'S', name: 'Simucube' },
  fanatec:      { bg: '#dc2626', fg: '#fff', letter: 'F', name: 'Fanatec' },
  moza:         { bg: '#8b5cf6', fg: '#fff', letter: 'M', name: 'Moza' },
  sim_magic:    { bg: '#a855f7', fg: '#fff', letter: 'S', name: 'Simagic' },
  asetek:       { bg: '#06b6d4', fg: '#000', letter: 'A', name: 'Asetek' },
  thrustmaster: { bg: '#fbbf24', fg: '#000', letter: 'T', name: 'Thrustmaster' },
  logitech:     { bg: '#3b82f6', fg: '#fff', letter: 'L', name: 'Logitech' },
  heusinkveld:  { bg: '#10b981', fg: '#000', letter: 'H', name: 'Heusinkveld' },
  coach_dave:   { bg: '#f5c518', fg: '#000', letter: 'CD', name: 'Coach Dave' },
  iracing:      { bg: '#ef4444', fg: '#fff', letter: 'i', name: 'iRacing' },
}

export default function BrandChip({ vendor, size = 24, label }: Props) {
  const b = BRANDS[vendor?.toLowerCase()] || { bg: '#374151', fg: '#fff', letter: '?', name: vendor }
  const fontSize = Math.round(size * (b.letter.length > 1 ? 0.42 : 0.5))
  return (
    <span className="inline-flex items-center gap-2">
      <span
        className="inline-flex items-center justify-center rounded-md font-black tracking-tight shrink-0"
        style={{
          width: size,
          height: size,
          background: b.bg,
          color: b.fg,
          fontSize,
          fontFamily: 'system-ui, -apple-system, sans-serif',
          boxShadow: `0 0 12px ${b.bg}55, inset 0 -2px 0 rgba(0,0,0,0.25)`,
        }}
        title={b.name}
      >
        {b.letter}
      </span>
      {label && <span className="text-[12px] font-semibold text-slate-200">{b.name}</span>}
    </span>
  )
}
