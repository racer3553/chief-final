'use client'
// Footer / empty-state branding tag — drop anywhere we want to remind users this is CHIEF.
import ChiefLogo from './ChiefLogo'

export default function BrandTag({
  size = 'sm',
  align = 'left',
  className = '',
}: {
  size?: 'xs' | 'sm' | 'md'
  align?: 'left' | 'center' | 'right'
  className?: string
}) {
  const dim =
    size === 'xs' ? { logo: 18, label: 9, tag: 7 } :
    size === 'md' ? { logo: 32, label: 13, tag: 9 } :
                    { logo: 24, label: 11, tag: 8 }

  const justify = align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start'

  return (
    <div className={`flex items-center gap-2 ${justify} ${className}`}>
      <ChiefLogo size={dim.logo} variant="mark" glow={false} />
      <div className="leading-none">
        <div className="font-black tracking-[0.18em] text-white" style={{ fontSize: dim.label }}>
          CHIEF
        </div>
        <div
          className="font-bold tracking-[0.22em] uppercase text-slate-500 mt-0.5"
          style={{ fontSize: dim.tag }}
        >
          By Walker Sports
        </div>
      </div>
    </div>
  )
}
