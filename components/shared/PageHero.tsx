'use client'
// CINEMATIC PageHero — built to make the user say "WOW".
// Animated RPM gauge fill, neon racing slashes, parallax track silhouette,
// big animated helmet logo, tri-color accent (lime / cyan / magenta).
import ChiefLogo from './ChiefLogo'
import { useEffect, useState } from 'react'

export default function PageHero({
  title,
  subtitle,
  accent = '#06b6d4',
  badge,
  icon: Icon,
}: any) {
  const [rpm, setRpm] = useState(0)

  // Animated RPM gauge that revs to ~85% on mount
  useEffect(() => {
    let raf: number
    let v = 0
    const target = 88
    const tick = () => {
      v += (target - v) * 0.06
      setRpm(v)
      if (Math.abs(v - target) > 0.5) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [])

  return (
    <div
      className="relative overflow-hidden rounded-2xl border mb-6"
      style={{
        background: `
          radial-gradient(ellipse at top right, ${accent}33 0%, transparent 50%),
          radial-gradient(ellipse at bottom left, #ff00aa22 0%, transparent 55%),
          linear-gradient(135deg, rgba(0,0,0,0.85) 0%, ${accent}1a 50%, rgba(0,0,0,0.85) 100%)
        `,
        borderColor: accent + '60',
        boxShadow: `0 0 80px ${accent}30, 0 0 120px #ff00aa15, inset 0 0 100px rgba(0,0,0,0.5)`,
      }}
    >
      {/* Diagonal racing slashes */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `repeating-linear-gradient(115deg, transparent 0px, transparent 80px, ${accent}08 80px, ${accent}08 82px, transparent 82px, transparent 90px, #ff00aa08 90px, #ff00aa08 92px)`,
        }}
      />

      {/* Animated speed lines */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none opacity-25" viewBox="0 0 800 240" preserveAspectRatio="none">
        <defs>
          <linearGradient id={`speedline-${accent}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="80%" stopColor={accent} stopOpacity="0.9" />
            <stop offset="100%" stopColor="#fff" />
          </linearGradient>
          <linearGradient id={`speedline-magenta-${accent}`} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="80%" stopColor="#ff00aa" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#fff" />
          </linearGradient>
        </defs>
        <line x1="-100" y1="40" x2="900" y2="40" stroke={`url(#speedline-${accent})`} strokeWidth="1.2">
          <animate attributeName="x1" from="-100" to="900" dur="2.4s" repeatCount="indefinite" />
          <animate attributeName="x2" from="-50" to="950" dur="2.4s" repeatCount="indefinite" />
        </line>
        <line x1="-200" y1="80" x2="800" y2="80" stroke={`url(#speedline-magenta-${accent})`} strokeWidth="0.6">
          <animate attributeName="x1" from="-200" to="800" dur="3.2s" repeatCount="indefinite" />
          <animate attributeName="x2" from="-100" to="900" dur="3.2s" repeatCount="indefinite" />
        </line>
        <line x1="-150" y1="140" x2="850" y2="140" stroke={`url(#speedline-${accent})`} strokeWidth="0.8">
          <animate attributeName="x1" from="-150" to="850" dur="1.8s" repeatCount="indefinite" />
          <animate attributeName="x2" from="-50" to="950" dur="1.8s" repeatCount="indefinite" />
        </line>
        <line x1="-100" y1="200" x2="900" y2="200" stroke={`url(#speedline-magenta-${accent})`} strokeWidth="0.5">
          <animate attributeName="x1" from="-100" to="900" dur="4s" repeatCount="indefinite" />
          <animate attributeName="x2" from="-200" to="800" dur="4s" repeatCount="indefinite" />
        </line>
      </svg>

      {/* Track silhouette */}
      <svg className="absolute right-0 top-0 h-full w-1/2 pointer-events-none opacity-[0.10]" viewBox="0 0 400 240" preserveAspectRatio="xMidYMid meet">
        <path d="M 50,120 C 50,50 110,40 220,40 C 320,40 360,50 380,90 C 380,140 350,180 290,190 C 220,190 160,190 90,170 C 40,150 50,120 50,120 Z"
          fill="none" stroke={accent} strokeWidth="3" strokeLinecap="round" />
        <path d="M 80,120 C 80,70 120,65 220,65 C 300,65 350,70 360,100 C 360,130 340,160 290,165 C 220,165 160,165 110,155 C 70,145 80,120 80,120 Z"
          fill="none" stroke="#ff00aa" strokeWidth="1.5" strokeOpacity="0.6" />
        <line x1="48" y1="112" x2="52" y2="128" stroke={accent} strokeWidth="3" />
      </svg>

      {/* Top checker stripe */}
      <div
        className="absolute top-0 left-0 right-0 h-2"
        style={{
          background: `repeating-linear-gradient(90deg, ${accent} 0px, ${accent} 24px, transparent 24px, transparent 48px)`,
          boxShadow: `0 0 16px ${accent}80`,
        }}
      />

      {/* Pulsing glow blobs — tri-color */}
      <div
        className="absolute -right-20 -top-20 w-72 h-72 rounded-full pointer-events-none animate-pulse"
        style={{
          background: `radial-gradient(circle, ${accent}55 0%, transparent 70%)`,
          animationDuration: '3.5s',
        }}
      />
      <div
        className="absolute -left-16 -bottom-16 w-56 h-56 rounded-full pointer-events-none animate-pulse"
        style={{
          background: `radial-gradient(circle, #ff00aa44 0%, transparent 70%)`,
          animationDuration: '5s',
        }}
      />

      <div className="relative z-10 px-6 py-8 flex items-center gap-5">
        {Icon && (
          <div
            className="w-20 h-20 rounded-2xl flex items-center justify-center shrink-0 shadow-2xl border-2 relative overflow-hidden"
            style={{
              background: `linear-gradient(135deg, ${accent}, ${accent}AA, #ff00aa66)`,
              borderColor: accent,
              boxShadow: `0 8px 32px ${accent}60, 0 0 16px #ff00aa30, inset 0 1px 0 rgba(255,255,255,0.3)`,
            }}
          >
            {/* Inner shine */}
            <div className="absolute inset-0" style={{
              background: 'linear-gradient(135deg, rgba(255,255,255,0.25) 0%, transparent 50%)',
            }} />
            <Icon size={36} className="text-white drop-shadow-lg relative z-10" />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {badge && (
            <div
              className="inline-flex items-center gap-1.5 mb-3 px-3 py-1.5 rounded-full text-[10px] font-extrabold tracking-[0.25em] uppercase"
              style={{
                background: `linear-gradient(90deg, ${accent}30, #ff00aa20)`,
                color: accent,
                boxShadow: `inset 0 0 0 1px ${accent}60, 0 0 12px ${accent}30`,
              }}
            >
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: accent, boxShadow: `0 0 8px ${accent}` }} />
              {badge}
              <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#ff00aa', boxShadow: `0 0 8px #ff00aa` }} />
            </div>
          )}
          <h1
            className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-none"
            style={{
              textShadow: `0 0 30px ${accent}80, 0 2px 8px rgba(0,0,0,0.8), 0 0 60px #ff00aa30`,
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </h1>
          {subtitle && (
            <p className="text-sm text-slate-300 mt-3 font-medium tracking-wide">{subtitle}</p>
          )}

          {/* RPM gauge bar — animates on mount */}
          <div className="mt-4 flex items-center gap-3 max-w-md">
            <div className="text-[9px] font-bold tracking-[0.22em] text-slate-500 uppercase shrink-0">RPM</div>
            <div className="flex-1 h-1.5 rounded-full overflow-hidden relative" style={{ background: 'rgba(255,255,255,0.08)' }}>
              <div
                className="h-full rounded-full relative transition-all"
                style={{
                  width: `${rpm}%`,
                  background: `linear-gradient(90deg, ${accent} 0%, #f5c518 65%, #ff00aa 90%, #ff2d2d 100%)`,
                  boxShadow: `0 0 12px ${accent}80`,
                }}
              >
                <div
                  className="absolute right-0 top-0 bottom-0 w-2"
                  style={{
                    background: 'rgba(255,255,255,0.6)',
                    animation: 'chief-flicker 0.6s ease-in-out infinite',
                  }}
                />
              </div>
            </div>
            <div className="text-[10px] font-mono font-bold tabular-nums shrink-0" style={{ color: accent }}>
              {Math.round(rpm * 90)}
            </div>
          </div>
        </div>

        {/* CHIEF watermark stack — big animated helmet */}
        <div className="hidden md:flex flex-col items-end shrink-0 pl-4 relative">
          <div className="text-[8px] font-bold tracking-[0.32em] text-slate-500 uppercase mb-2">By Walker Sports</div>
          <div style={{ animation: 'chief-rev 2.4s ease-in-out infinite' }}>
            <ChiefLogo size={70} variant="mark" primary={accent} secondary="#a3ff00" tertiary="#ff00aa" animate />
          </div>
          <div
            className="text-[24px] font-black tracking-[0.22em] leading-none mt-3"
            style={{
              color: accent,
              textShadow: `0 0 24px ${accent}99, 0 2px 4px rgba(0,0,0,0.8), 0 0 40px #ff00aa40`,
            }}
          >
            CHIEF
          </div>
          <div className="text-[8px] font-bold tracking-[0.32em] text-slate-600 uppercase mt-2">AI · Crew · Chief</div>
        </div>
      </div>

      {/* Bottom checker */}
      <div
        className="h-1.5"
        style={{
          background: `repeating-linear-gradient(90deg, ${accent}80 0px, ${accent}80 16px, #ff00aa60 16px, #ff00aa60 32px)`,
        }}
      />
    </div>
  )
}
