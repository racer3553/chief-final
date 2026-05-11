'use client'
// Standalone CHIEF wordmark — for marketing/landing/login screens.

export default function Wordmark({
  size = 48,
  primary = '#a3ff00',
  secondary = '#06b6d4',
  tagline = 'AI · Crew · Chief',
}: {
  size?: number
  primary?: string
  secondary?: string
  tagline?: string
}) {
  return (
    <div className="inline-flex flex-col items-start leading-none">
      <div
        className="font-black tracking-[0.18em]"
        style={{
          fontSize: size,
          backgroundImage: `linear-gradient(135deg, ${primary}, ${secondary})`,
          WebkitBackgroundClip: 'text',
          backgroundClip: 'text',
          color: 'transparent',
          textShadow: `0 0 30px ${primary}40`,
          filter: `drop-shadow(0 4px 12px ${secondary}30)`,
        }}
      >
        CHIEF
      </div>
      {tagline && (
        <div
          className="font-bold tracking-[0.32em] uppercase mt-2"
          style={{ fontSize: size * 0.18, color: secondary }}
        >
          {tagline}
        </div>
      )}
    </div>
  )
}
