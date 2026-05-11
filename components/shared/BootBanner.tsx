'use client'
// First-load brand reveal. 1.2s flash with engine-rev feel. Fires once per session.
import { useEffect, useState } from 'react'
import ChiefLogo from './ChiefLogo'

export default function BootBanner() {
  const [show, setShow] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (sessionStorage.getItem('chief_boot_shown') === '1') return
    sessionStorage.setItem('chief_boot_shown', '1')
    setShow(true)
    const t = setTimeout(() => setShow(false), 1300)
    return () => clearTimeout(t)
  }, [])

  if (!show) return null

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center"
      style={{
        background:
          'radial-gradient(ellipse at center, rgba(0,0,0,0.85) 0%, rgba(0,0,0,1) 100%)',
        animation: 'chief-boot-fade 1.3s ease-in-out forwards',
      }}
    >
      {/* Center helmet pulses big */}
      <div
        className="flex flex-col items-center gap-4"
        style={{ animation: 'chief-boot-zoom 1.3s cubic-bezier(0.2, 0.9, 0.4, 1) forwards' }}
      >
        <ChiefLogo size={220} variant="mark" animate primary="#a3ff00" secondary="#06b6d4" tertiary="#ff00aa" />
        <div
          className="text-[40px] font-black tracking-[0.32em] text-white"
          style={{
            textShadow: '0 0 40px #a3ff00, 0 0 80px #06b6d4',
            animation: 'chief-boot-letter 1.3s ease-out forwards',
          }}
        >
          CHIEF
        </div>
        <div className="text-[11px] font-bold tracking-[0.5em] text-cyan-400 uppercase">
          ENGINE · STARTED
        </div>
      </div>

      {/* Sweeping racing flag stripe */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            'linear-gradient(115deg, transparent 35%, rgba(163,255,0,0.15) 50%, transparent 65%)',
          animation: 'chief-boot-sweep 1.3s ease-out forwards',
        }}
      />

      <style jsx>{`
        @keyframes chief-boot-fade {
          0%   { opacity: 1; }
          75%  { opacity: 1; }
          100% { opacity: 0; pointer-events: none; }
        }
        @keyframes chief-boot-zoom {
          0%   { transform: scale(0.4); opacity: 0; filter: blur(12px); }
          25%  { transform: scale(1.05); opacity: 1; filter: blur(0); }
          80%  { transform: scale(1); opacity: 1; }
          100% { transform: scale(1.4); opacity: 0; }
        }
        @keyframes chief-boot-sweep {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes chief-boot-letter {
          0%   { letter-spacing: 1em; opacity: 0; }
          50%  { letter-spacing: 0.32em; opacity: 1; }
          100% { letter-spacing: 0.32em; opacity: 1; }
        }
      `}</style>
    </div>
  )
}
