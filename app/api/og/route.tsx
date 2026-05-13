// Dynamic OG image generation — produces beautiful share cards for any URL.
// Used by every dashboard page + landing + pricing so Discord/X embed previews
// look like an actual product, not a generic Next.js 404.
//
//   /api/og?title=Best Lap&value=1:48.748&sub=Daytona · GT3
//   /api/og?title=Chief - AI Crew Chief&sub=Auto-captures every session

import { ImageResponse } from 'next/og'

export const runtime = 'edge'

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const title = (searchParams.get('title') || 'Chief').slice(0, 80)
  const value = (searchParams.get('value') || '').slice(0, 32)
  const sub   = (searchParams.get('sub')   || 'AI Crew Chief by Walker Sports').slice(0, 120)

  return new ImageResponse(
    (
      <div style={{
        width: '100%', height: '100%', display: 'flex', flexDirection: 'column',
        background: 'linear-gradient(135deg, #0a0a14 0%, #11141c 50%, #1d2230 100%)',
        position: 'relative', padding: 60, color: '#fff',
        fontFamily: 'Inter, system-ui, sans-serif',
      }}>
        {/* Top gradient stripe — CHIEF brand bar */}
        <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 6,
          background: 'linear-gradient(90deg, #a3ff00 0%, #00e5ff 33%, #ff00aa 66%, #f5c518 100%)' }} />
        {/* Glow blobs */}
        <div style={{ position: 'absolute', top: -100, right: -100, width: 500, height: 500,
          background: 'radial-gradient(circle, rgba(0,229,255,0.25) 0%, transparent 70%)', display: 'flex' }} />
        <div style={{ position: 'absolute', bottom: -150, left: -100, width: 400, height: 400,
          background: 'radial-gradient(circle, rgba(163,255,0,0.18) 0%, transparent 70%)', display: 'flex' }} />

        {/* Brand mark */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 40 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 14,
            background: 'linear-gradient(135deg, #a3ff00, #00e5ff)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 900, fontSize: 28, color: '#000',
          }}>C</div>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <div style={{ fontSize: 28, fontWeight: 900, letterSpacing: '0.18em' }}>CHIEF</div>
            <div style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.18em',
                          color: '#94a3b8', textTransform: 'uppercase', marginTop: 2 }}>
              By Walker Sports
            </div>
          </div>
        </div>

        {/* Big value (lap time / metric) — only render if provided */}
        {value && (
          <div style={{
            display: 'flex', flexDirection: 'column', marginBottom: 24,
          }}>
            <div style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.2em',
                          color: '#00e5ff', textTransform: 'uppercase', marginBottom: 8 }}>
              {title}
            </div>
            <div style={{ fontSize: 128, fontWeight: 900, fontFamily: 'monospace',
                          lineHeight: 1, letterSpacing: '-0.02em',
                          background: 'linear-gradient(90deg, #a3ff00, #00e5ff)',
                          backgroundClip: 'text', color: 'transparent' }}>
              {value}
            </div>
          </div>
        )}

        {/* If no value, title becomes the hero text */}
        {!value && (
          <div style={{ display: 'flex', fontSize: 72, fontWeight: 900, lineHeight: 1.05,
                        maxWidth: 900, marginTop: 'auto', marginBottom: 16 }}>
            {title}
          </div>
        )}

        {/* Subtitle */}
        <div style={{ display: 'flex', fontSize: 24, color: '#94a3b8', marginTop: value ? 0 : 0 }}>
          {sub}
        </div>

        {/* Bottom URL */}
        <div style={{ display: 'flex', position: 'absolute', bottom: 40, right: 60,
                      fontSize: 16, fontWeight: 700, letterSpacing: '0.16em',
                      color: '#a3ff00', textTransform: 'uppercase' }}>
          chiefracing.com
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
