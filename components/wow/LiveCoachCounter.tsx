'use client'
// LiveCoachCounter — pulses with the current count of active Chief sessions.
// Drops onto the landing page below the hero for social proof.
// Polls /api/stats/live every 30s. Falls back gracefully if endpoint is down.

import { useEffect, useState } from 'react'

export default function LiveCoachCounter() {
  const [count, setCount] = useState<number | null>(null)

  useEffect(() => {
    const fetchCount = async () => {
      try {
        const r = await fetch('/api/stats/live')
        const j = await r.json()
        if (typeof j.active === 'number') setCount(j.active)
      } catch (_) {}
    }
    fetchCount()
    const t = setInterval(fetchCount, 30_000)
    return () => clearInterval(t)
  }, [])

  if (count === null || count === 0) return null

  return (
    <div className="inline-flex items-center gap-3 rounded-full px-5 py-2.5 border backdrop-blur-sm"
         style={{
           background: 'rgba(57,255,20,0.06)',
           borderColor: 'rgba(57,255,20,0.30)',
           boxShadow: '0 0 30px rgba(57,255,20,0.15)',
         }}>
      <div className="relative flex">
        <span className="w-2.5 h-2.5 rounded-full bg-[#39ff14] animate-ping absolute" />
        <span className="w-2.5 h-2.5 rounded-full bg-[#39ff14]" />
      </div>
      <span className="text-sm font-bold text-white">
        Chief is coaching <span className="text-[#39ff14] font-mono text-base">{count}</span> driver{count === 1 ? '' : 's'} right now
      </span>
    </div>
  )
}
