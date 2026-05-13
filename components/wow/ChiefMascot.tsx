'use client'
// Floating helmet indicator in bottom-right corner. Pulses when the daemon
// has activity in the last 5 min (iRacing running, sessions/traces being pushed).
// Click to expand into a mini status card. Makes Chief feel like a companion,
// not a database.

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'

interface DaemonStatus {
  online: boolean
  lastSeen: string | null
  iracing: boolean
  car?: string | null
  track?: string | null
  lap?: number | null
}

export default function ChiefMascot() {
  const [status, setStatus] = useState<DaemonStatus>({ online: false, lastSeen: null, iracing: false })
  const [open, setOpen] = useState(false)
  const [hidden, setHidden] = useState(false)

  useEffect(() => {
    const fetchStatus = async () => {
      try {
        const r = await fetch('/api/daemon/status')
        if (!r.ok) return
        const j = await r.json()
        setStatus(j)
      } catch (_) {}
    }
    fetchStatus()
    const t = setInterval(fetchStatus, 20_000)
    return () => clearInterval(t)
  }, [])

  // Hide on mobile — not enough screen
  if (hidden) return null

  return (
    <div className="fixed bottom-4 right-4 z-40 hidden lg:block">
      {!open ? (
        <button
          onClick={() => setOpen(true)}
          aria-label="Chief status"
          className="relative w-12 h-12 rounded-full flex items-center justify-center transition-all hover:scale-110"
          style={{
            background: status.online ? 'linear-gradient(135deg,#a3ff00,#00e5ff)' : 'rgba(60,60,80,0.6)',
            border: `2px solid ${status.online ? '#a3ff00' : 'rgba(255,255,255,0.1)'}`,
            boxShadow: status.online ? '0 0 24px rgba(163,255,0,0.5)' : 'none',
          }}>
          <svg width="22" height="22" viewBox="0 0 80 80" fill="none">
            <path d="M40 12 C58 12 68 24 68 40 L68 56 L60 56 L60 64 L48 64 L48 56 L40 56 L40 64 L28 64 L28 56 L20 56 L20 40 C20 24 28 12 40 12 Z"
                  fill="#000" stroke="#000" strokeWidth="2" strokeLinejoin="round" />
            <rect x="24" y="34" width="32" height="8" fill="repeating-linear-gradient(90deg,#000,#000 4px,#fff 4px,#fff 8px)" />
          </svg>
          {status.online && (
            <span className="absolute -top-0.5 -right-0.5 w-3 h-3 rounded-full bg-[#39ff14] border-2 border-black animate-pulse" />
          )}
        </button>
      ) : (
        <div className="rounded-xl p-3 border w-64 shadow-2xl"
             style={{
               background: 'rgba(10,11,16,0.96)',
               borderColor: status.online ? 'rgba(163,255,0,0.4)' : 'rgba(255,255,255,0.1)',
               boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
             }}>
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-2">
              <span className={`w-2 h-2 rounded-full ${status.online ? 'bg-[#39ff14] animate-pulse' : 'bg-slate-600'}`} />
              <span className="text-[11px] font-bold tracking-widest uppercase text-white">
                {status.online ? 'Chief is listening' : 'Chief is offline'}
              </span>
            </div>
            <button onClick={() => setOpen(false)} className="text-slate-500 hover:text-white">
              <X size={14} />
            </button>
          </div>
          {status.online && status.iracing ? (
            <div className="space-y-1 text-[12px]">
              <div className="text-slate-400">In race: <span className="text-white font-bold">{status.car || '—'}</span></div>
              <div className="text-slate-400">Track: <span className="text-white font-bold">{status.track || '—'}</span></div>
              {status.lap != null && <div className="text-slate-400">Lap: <span className="text-white font-bold font-mono">{status.lap}</span></div>}
            </div>
          ) : status.online ? (
            <div className="text-[12px] text-slate-400">Daemon connected. iRacing not running.</div>
          ) : (
            <div className="text-[12px] text-slate-500">No activity in 5 min. Launch Chief on your sim PC.</div>
          )}
          {status.lastSeen && (
            <div className="text-[10px] text-slate-600 mt-2">Last beat: {new Date(status.lastSeen).toLocaleTimeString()}</div>
          )}
          <button onClick={() => { setOpen(false); setHidden(true) }}
                  className="mt-2 text-[10px] text-slate-600 hover:text-slate-400">
            Hide for this session
          </button>
        </div>
      )}
    </div>
  )
}
