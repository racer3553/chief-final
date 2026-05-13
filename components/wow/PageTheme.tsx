'use client'
// PageTheme — paints a contextual gradient + watermark per dashboard section.
// Auto-detects section from pathname (real/sim/coach/strategy/lights/admin).
// Drop into the dashboard layout once, every page inherits its identity.

import { usePathname } from 'next/navigation'
import { useMemo } from 'react'

interface ThemeDef {
  name: string
  accent: string   // primary accent color
  glow: string     // soft glow color
  emoji?: string   // watermark glyph
}

const THEMES: Record<string, ThemeDef> = {
  real:     { name: 'Real Racecar', accent: '#ef4444', glow: 'rgba(239,68,68,0.18)', emoji: '🏁' },
  sim:      { name: 'Sim',          accent: '#3b82f6', glow: 'rgba(59,130,246,0.18)', emoji: '🎮' },
  sessions: { name: 'Sessions',     accent: '#00e5ff', glow: 'rgba(0,229,255,0.18)', emoji: '📊' },
  coach:    { name: 'Coach',        accent: '#a855f7', glow: 'rgba(168,85,247,0.18)', emoji: '🎙' },
  brakes:   { name: 'Brakes',       accent: '#a855f7', glow: 'rgba(168,85,247,0.16)', emoji: '🛑' },
  steering: { name: 'Steering',     accent: '#3b82f6', glow: 'rgba(59,130,246,0.18)', emoji: '🎚' },
  lights:   { name: 'Lights',       accent: '#a3ff00', glow: 'rgba(163,255,0,0.16)', emoji: '💡' },
  admin:    { name: 'Admin',        accent: '#f472b6', glow: 'rgba(244,114,182,0.18)', emoji: '🛡' },
  default:  { name: 'Chief',        accent: '#00e5ff', glow: 'rgba(0,229,255,0.12)', emoji: '⚡' },
}

function detectTheme(path: string): ThemeDef {
  if (path.startsWith('/dashboard/race-chief') || path.includes('aero-ai') || path.includes('engine-tuner')) return THEMES.real
  if (path.startsWith('/dashboard/admin')) return THEMES.admin
  if (path.includes('settings') || path.includes('ai-chat') || path.includes('voice')) return THEMES.coach
  if (path.includes('brakes')) return THEMES.brakes
  if (path.includes('steering')) return THEMES.steering
  if (path.includes('lights')) return THEMES.lights
  if (path.includes('sessions') || path.includes('telemetry')) return THEMES.sessions
  if (path.startsWith('/dashboard/sim')) return THEMES.sim
  return THEMES.default
}

export default function PageTheme() {
  const path = usePathname()
  const theme = useMemo(() => detectTheme(path || ''), [path])

  return (
    <>
      {/* Contextual color gradient — sits behind everything, very low opacity */}
      <div
        key={theme.name}    // force re-mount on theme change for crossfade
        className="fixed inset-0 pointer-events-none z-0 animate-theme-fade"
        style={{
          background: `
            radial-gradient(ellipse 1400px 700px at 90% -10%, ${theme.glow} 0%, transparent 55%),
            radial-gradient(ellipse 1000px 600px at 10% 110%, ${theme.glow} 0%, transparent 55%),
            radial-gradient(ellipse 600px 600px at 50% 50%, ${theme.glow.replace('0.1', '0.05')} 0%, transparent 70%)
          `,
        }}
      />
      {/* Watermark glyph in lower-right — barely visible, ambient identity cue */}
      {theme.emoji && (
        <div className="fixed bottom-3 right-3 pointer-events-none z-0 select-none"
             style={{ fontSize: 180, opacity: 0.025, lineHeight: 1, filter: 'blur(0.5px)' }}>
          {theme.emoji}
        </div>
      )}
      {/* Accent stripe at the bottom of the topbar — color shifts per section */}
      <div className="fixed top-[64px] left-0 lg:left-60 right-0 h-[2px] z-30 pointer-events-none animate-theme-fade"
           style={{
             background: `linear-gradient(90deg, transparent, ${theme.accent}, transparent)`,
             boxShadow: `0 0 12px ${theme.accent}`,
           }} />
      <style jsx>{`
        @keyframes themeFade { from { opacity: 0 } to { opacity: 1 } }
        .animate-theme-fade { animation: themeFade 350ms ease-out; }
      `}</style>
    </>
  )
}
