'use client'
// EmptyState — empty/no-data screens with personality. Replaces generic
// "No sessions yet" placeholders with on-brand racing voice.

import Link from 'next/link'
import { LucideIcon } from 'lucide-react'

interface Props {
  icon?: LucideIcon
  title: string
  message: string
  ctaLabel?: string
  ctaHref?: string
  ctaOnClick?: () => void
  accent?: string
}

export default function EmptyState({
  icon: Icon,
  title,
  message,
  ctaLabel,
  ctaHref,
  ctaOnClick,
  accent = '#00e5ff',
}: Props) {
  return (
    <div className="rounded-xl p-10 border text-center max-w-lg mx-auto"
         style={{ background: 'rgba(20,20,32,0.5)', borderColor: 'rgba(255,255,255,0.06)' }}>
      {Icon && (
        <div className="mx-auto w-16 h-16 rounded-2xl flex items-center justify-center mb-4"
             style={{ background: accent + '15', border: `1px solid ${accent}33` }}>
          <Icon size={28} style={{ color: accent }} />
        </div>
      )}
      <h3 className="font-display text-lg text-white mb-2 tracking-wide">{title}</h3>
      <p className="text-sm text-slate-400 mb-5 leading-relaxed">{message}</p>
      {(ctaLabel && (ctaHref || ctaOnClick)) && (
        ctaHref ? (
          <Link href={ctaHref} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-bold transition-all hover:scale-[1.03]"
            style={{ background: accent, color: '#000' }}>
            {ctaLabel}
          </Link>
        ) : (
          <button onClick={ctaOnClick} className="inline-flex items-center gap-2 px-5 py-2.5 rounded-md text-sm font-bold transition-all hover:scale-[1.03]"
            style={{ background: accent, color: '#000' }}>
            {ctaLabel}
          </button>
        )
      )}
    </div>
  )
}
