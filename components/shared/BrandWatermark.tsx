'use client'
// Giant ghost CHIEF helmet behind dashboard content. Subliminal, atmospheric, on every page.

export default function BrandWatermark() {
  return (
    <>
      {/* Top-right giant helmet ghost */}
      <div
        className="fixed top-[-120px] right-[-160px] pointer-events-none z-0"
        style={{
          width: 700,
          height: 700,
          opacity: 0.06,
          animation: 'chief-watermark-spin 90s linear infinite',
        }}
      >
        <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <defs>
            <linearGradient id="wm-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#a3ff00" />
              <stop offset="55%" stopColor="#06b6d4" />
              <stop offset="100%" stopColor="#ff00aa" />
            </linearGradient>
          </defs>
          <path
            d="M 16,42 C 16,25 26,14 40,14 C 54,14 64,25 64,42 L 64,52 C 64,57 60,61 55,61 L 47,61 L 47,55 L 33,55 L 33,61 L 25,61 C 20,61 16,57 16,52 Z"
            fill="url(#wm-grad)"
          />
          <path
            d="M 21,36 C 21,30 28,26 40,26 C 52,26 59,30 59,36 L 59,46 L 21,46 Z"
            fill="#000"
            opacity="0.7"
          />
        </svg>
      </div>

      {/* Bottom-left small helmet glow */}
      <div
        className="fixed bottom-[-80px] left-[180px] pointer-events-none z-0"
        style={{
          width: 360,
          height: 360,
          opacity: 0.05,
          transform: 'rotate(-15deg)',
        }}
      >
        <svg viewBox="0 0 80 80" xmlns="http://www.w3.org/2000/svg" width="100%" height="100%">
          <defs>
            <linearGradient id="wm-grad-2" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#ff00aa" />
              <stop offset="100%" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
          <path
            d="M 16,42 C 16,25 26,14 40,14 C 54,14 64,25 64,42 L 64,52 C 64,57 60,61 55,61 L 47,61 L 47,55 L 33,55 L 33,61 L 25,61 C 20,61 16,57 16,52 Z"
            fill="url(#wm-grad-2)"
          />
        </svg>
      </div>

      {/* Neon scan lines (CRT effect) */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            'repeating-linear-gradient(0deg, transparent 0px, transparent 2px, rgba(163,255,0,0.015) 2px, rgba(163,255,0,0.015) 3px)',
        }}
      />

      {/* Vignette to focus content */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background:
            'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.45) 100%)',
        }}
      />

      <style jsx global>{`
        @keyframes chief-watermark-spin {
          0%   { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes chief-rev {
          0%, 100% { transform: scale(1); filter: brightness(1); }
          50%      { transform: scale(1.04); filter: brightness(1.25); }
        }
        @keyframes chief-scan {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes chief-flicker {
          0%, 100% { opacity: 1; }
          50%      { opacity: 0.85; }
        }
      `}</style>
    </>
  )
}
