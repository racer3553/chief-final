'use client'
// PersonalBestBanner — fires when a captured lap beats the user's previous PB
// for that car+track combo. Confetti burst + ascending tone + 3-sec banner.
// Drop into the dashboard home page; reads from /api/sessions/last-pb.

import { useEffect, useState } from 'react'
import { Trophy, X } from 'lucide-react'

interface PBEvent {
  car: string
  track: string
  lapTime: number
  improvementSec: number  // positive = better than previous
  sessionId: string
}

export default function PersonalBestBanner() {
  const [event, setEvent] = useState<PBEvent | null>(null)
  const [dismissed, setDismissed] = useState(false)

  useEffect(() => {
    // Poll for the most recent PB event. Server only returns one if it's
    // unseen + recent (<1 hour).
    const check = async () => {
      try {
        const r = await fetch('/api/sessions/last-pb')
        if (!r.ok) return
        const j = await r.json()
        if (j?.event && j.event.sessionId !== sessionStorage.getItem('chief.lastPB')) {
          sessionStorage.setItem('chief.lastPB', j.event.sessionId)
          setEvent(j.event)
          fireConfetti()
          playTone()
        }
      } catch (_) {}
    }
    check()
    const t = setInterval(check, 30_000)
    return () => clearInterval(t)
  }, [])

  if (!event || dismissed) return null

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-50 animate-pb-drop max-w-md w-[92%]">
      <div className="relative rounded-xl p-4 border-2 shadow-2xl"
        style={{
          background: 'linear-gradient(135deg, rgba(163,255,0,0.95), rgba(0,229,255,0.85))',
          borderColor: '#a3ff00',
          boxShadow: '0 0 60px rgba(163,255,0,0.7), 0 0 120px rgba(0,229,255,0.4)',
        }}>
        <button onClick={() => setDismissed(true)} className="absolute top-2 right-2 text-black/60 hover:text-black">
          <X size={16} />
        </button>
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full flex items-center justify-center shrink-0" style={{ background: '#000' }}>
            <Trophy size={24} style={{ color: '#a3ff00' }} />
          </div>
          <div className="text-black min-w-0">
            <div className="text-[10px] font-black tracking-[0.2em] uppercase">NEW PERSONAL BEST</div>
            <div className="text-lg font-extrabold leading-tight font-mono truncate">{fmtTime(event.lapTime)}</div>
            <div className="text-[11px] font-bold">
              {event.car} · {event.track} · <span className="font-mono">-{event.improvementSec.toFixed(3)}s</span>
            </div>
          </div>
        </div>
      </div>

      <style jsx>{`
        @keyframes pbDrop {
          0%   { transform: translate(-50%, -100px); opacity: 0; }
          12%  { transform: translate(-50%, 0); opacity: 1; }
          88%  { transform: translate(-50%, 0); opacity: 1; }
          100% { transform: translate(-50%, -100px); opacity: 0; }
        }
        .animate-pb-drop { animation: pbDrop 8s ease-out forwards; }
      `}</style>
    </div>
  )
}

function fmtTime(s: number): string {
  if (!s || s <= 0) return '—'
  const m = Math.floor(s / 60)
  const sec = s - m * 60
  return m > 0 ? `${m}:${sec.toFixed(3).padStart(6, '0')}` : sec.toFixed(3)
}

function fireConfetti() {
  if (typeof window === 'undefined') return
  const canvas = document.createElement('canvas')
  canvas.style.cssText = 'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:9999'
  document.body.appendChild(canvas)
  const ctx = canvas.getContext('2d')!
  const dpr = window.devicePixelRatio || 1
  canvas.width = window.innerWidth * dpr
  canvas.height = window.innerHeight * dpr
  ctx.scale(dpr, dpr)

  const colors = ['#a3ff00', '#00e5ff', '#ff00aa', '#f5c518', '#39ff14']
  const particles = Array.from({ length: 140 }, () => ({
    x: window.innerWidth / 2,
    y: window.innerHeight / 3,
    vx: (Math.random() - 0.5) * 16,
    vy: Math.random() * -16 - 4,
    g: 0.4,
    size: Math.random() * 6 + 4,
    color: colors[Math.floor(Math.random() * colors.length)],
    rot: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.4,
    life: 1,
  }))

  let frame = 0
  function tick() {
    ctx.clearRect(0, 0, window.innerWidth, window.innerHeight)
    particles.forEach(p => {
      p.x += p.vx
      p.y += p.vy
      p.vy += p.g
      p.rot += p.vr
      p.life -= 0.008
      ctx.save()
      ctx.translate(p.x, p.y)
      ctx.rotate(p.rot)
      ctx.fillStyle = p.color
      ctx.globalAlpha = Math.max(0, p.life)
      ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2)
      ctx.restore()
    })
    frame++
    if (frame < 240 && particles.some(p => p.life > 0)) {
      requestAnimationFrame(tick)
    } else {
      try { document.body.removeChild(canvas) } catch (_) {}
    }
  }
  tick()
}

function playTone() {
  try {
    const ctx = new (window.AudioContext || (window as any).webkitAudioContext)()
    const t = ctx.currentTime
    ;[523.25, 659.25, 783.99].forEach((freq, i) => {  // C5 E5 G5 ascending major triad
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.type = 'triangle'
      osc.frequency.value = freq
      gain.gain.setValueAtTime(0, t + i * 0.12)
      gain.gain.linearRampToValueAtTime(0.18, t + i * 0.12 + 0.02)
      gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.12 + 0.3)
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.start(t + i * 0.12)
      osc.stop(t + i * 0.12 + 0.3)
    })
  } catch (_) {}
}
