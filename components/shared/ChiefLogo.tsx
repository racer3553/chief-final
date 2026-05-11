'use client'
// CHIEF brand mark — iconic racing helmet with checker visor band, radio mic boom,
// tachometer arc, and lightning bolt. Built to be unmistakable at any size.

export default function ChiefLogo({
  size = 40,
  variant = 'mark',
  glow = true,
  primary = '#a3ff00',
  secondary = '#06b6d4',
  tertiary = '#ff00aa',
  animate = false,
}: {
  size?: number
  variant?: 'mark' | 'full' | 'stack'
  glow?: boolean
  primary?: string
  secondary?: string
  tertiary?: string
  animate?: boolean
}) {
  const id = `chief-${primary.replace('#','')}-${secondary.replace('#','')}-${tertiary.replace('#','')}`

  const Mark = (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      xmlns="http://www.w3.org/2000/svg"
      style={{
        filter: glow
          ? `drop-shadow(0 0 12px ${primary}aa) drop-shadow(0 0 24px ${secondary}66)`
          : undefined,
      }}
    >
      <defs>
        <linearGradient id={`${id}-helm`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={primary} />
          <stop offset="55%" stopColor={secondary} />
          <stop offset="100%" stopColor={tertiary} />
        </linearGradient>
        <linearGradient id={`${id}-shine`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.55)" />
          <stop offset="60%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>
        <radialGradient id={`${id}-glow`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={primary} stopOpacity="0.3" />
          <stop offset="100%" stopColor="transparent" />
        </radialGradient>
      </defs>

      {/* Outer glow ring */}
      <circle cx="40" cy="40" r="38" fill={`url(#${id}-glow)`} />

      {/* Tachometer arc — a partial dashed ring like an RPM gauge */}
      <circle
        cx="40"
        cy="40"
        r="37"
        fill="none"
        stroke={tertiary}
        strokeWidth="1.5"
        strokeDasharray="2 4"
        strokeOpacity="0.85"
        transform="rotate(135 40 40)"
        strokeLinecap="round"
        pathLength="100"
        strokeDashoffset="0"
      >
        {animate && (
          <animateTransform
            attributeName="transform"
            type="rotate"
            from="135 40 40"
            to="495 40 40"
            dur="6s"
            repeatCount="indefinite"
          />
        )}
      </circle>

      {/* Helmet body */}
      <path
        d="M 16,42 C 16,25 26,14 40,14 C 54,14 64,25 64,42 L 64,52 C 64,57 60,61 55,61 L 47,61 L 47,55 L 33,55 L 33,61 L 25,61 C 20,61 16,57 16,52 Z"
        fill={`url(#${id}-helm)`}
      />

      {/* Checker band over visor brow */}
      <g clipPath={`url(#${id}-clip)`}>
        <rect x="18" y="22" width="44" height="4" fill="#fff" />
        <rect x="18" y="22" width="4" height="4" fill="#000" />
        <rect x="26" y="22" width="4" height="4" fill="#000" />
        <rect x="34" y="22" width="4" height="4" fill="#000" />
        <rect x="42" y="22" width="4" height="4" fill="#000" />
        <rect x="50" y="22" width="4" height="4" fill="#000" />
        <rect x="58" y="22" width="4" height="4" fill="#000" />
      </g>
      <clipPath id={`${id}-clip`}>
        <path d="M 16,42 C 16,25 26,14 40,14 C 54,14 64,25 64,42 L 16,42 Z" />
      </clipPath>

      {/* Visor (dark glass) */}
      <path
        d="M 21,36 C 21,30 28,26 40,26 C 52,26 59,30 59,36 L 59,46 L 21,46 Z"
        fill="#000"
        opacity="0.92"
      />
      {/* Visor shine */}
      <path
        d="M 24,32 C 28,28 33,27 40,27 L 40,38 L 24,38 Z"
        fill={`url(#${id}-shine)`}
      />

      {/* Lightning bolt across visor */}
      <path
        d="M 36,30 L 32,40 L 38,40 L 34,48 L 44,38 L 38,38 L 42,30 Z"
        fill={primary}
        opacity="0.95"
        style={animate ? { transformOrigin: '38px 39px' } : undefined}
      >
        {animate && (
          <animate
            attributeName="opacity"
            values="0.4;1;0.4"
            dur="1.4s"
            repeatCount="indefinite"
          />
        )}
      </path>

      {/* Radio mic boom */}
      <path
        d="M 16,50 L 8,55 L 8,60 L 14,60"
        fill="none"
        stroke={primary}
        strokeWidth="3"
        strokeLinecap="round"
      />
      <circle cx="8" cy="58" r="3" fill={primary}>
        {animate && (
          <animate
            attributeName="r"
            values="2.5;3.5;2.5"
            dur="1.2s"
            repeatCount="indefinite"
          />
        )}
      </circle>
      <circle cx="8" cy="58" r="1.2" fill="#000" />

      {/* Speed lines on the side */}
      <g>
        <line x1="66" y1="32" x2="76" y2="32" stroke={secondary} strokeWidth="1.8" strokeLinecap="round" />
        <line x1="68" y1="40" x2="78" y2="40" stroke={tertiary} strokeWidth="1.8" strokeLinecap="round" />
        <line x1="66" y1="48" x2="74" y2="48" stroke={secondary} strokeWidth="1.8" strokeLinecap="round" />
      </g>
    </svg>
  )

  if (variant === 'mark') return Mark

  if (variant === 'stack') {
    return (
      <div className="flex flex-col items-center gap-1">
        {Mark}
        <div className="text-center leading-none">
          <div className="text-[18px] font-black tracking-[0.22em] text-white">CHIEF</div>
          <div className="text-[7px] font-bold tracking-[0.32em] text-slate-500 uppercase mt-1">By Walker Sports</div>
        </div>
      </div>
    )
  }

  // full
  return (
    <div className="flex items-center gap-3">
      {Mark}
      <div className="leading-none">
        <div className="text-[20px] font-black tracking-[0.22em] text-white">CHIEF</div>
        <div className="text-[8px] font-bold tracking-[0.32em] text-slate-500 uppercase mt-1.5">AI · Crew · Chief</div>
      </div>
    </div>
  )
}
