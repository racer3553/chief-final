'use client'
import Link from 'next/link'
import { useState } from 'react'
import { Headphones, Gauge, Cpu, Wind, FileInput, Settings, Database, HardDrive, Sparkles, Loader2, TrendingUp } from 'lucide-react'

export default function SimDashboard() {
  const [car, setCar] = useState('')
  const [track, setTrack] = useState('')
  const [tempF, setTempF] = useState('')
  const [advice, setAdvice] = useState('')
  const [loading, setLoading] = useState(false)
  async function recommend() {
    if (!car && !track) return
    setLoading(true); setAdvice('')
    try {
      const r = await fetch('/api/ai/recommend-setup', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ car, track, conditions: { track_temp_f: tempF ? parseFloat(tempF) : undefined } }),
      })
      const j = await r.json()
      setAdvice(j.answer || j.error || 'No answer')
    } catch (e: any) { setAdvice('Error: ' + e.message) }
    setLoading(false)
  }
  const tiles = [
    { href: '/dashboard/sim-racing/coach-dave',  icon: FileInput, label: 'Coach Dave', desc: 'Setup files + telemetry', accent: '#10b981' },
    { href: '/dashboard/sim-racing/simucube',    icon: Settings,  label: 'Simucube',   desc: 'Wheel base profiles', accent: '#3b82f6' },
    { href: '/dashboard/sim-racing/iracing',     icon: Cpu,       label: 'iRacing',    desc: 'Per-car setups + controls', accent: '#06b6d4' },
    { href: '/dashboard/sim-racing/sim-magic',   icon: Wind,      label: 'Sim Magic',  desc: 'Motion profiles', accent: '#a855f7' },
    { href: '/dashboard/sim-setup/library',      icon: Database,  label: 'Session Library', desc: 'All auto-captured sessions', accent: '#34d399' },
    { href: '/dashboard/sim-setup/hardware',     icon: HardDrive, label: 'FFB & Hardware', desc: 'All detected vendors', accent: '#f5c518' },
    { href: '/dashboard/ai-chat?ctx=sim',        icon: Sparkles,  label: 'Ask Chief',  desc: 'Voice + text queries', accent: '#06b6d4' },
  ]
  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,158,11,0.20)' }}>
          <Gauge size={18} style={{ color: '#f59e0b' }} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-white">Sim Dashboard</h1>
          <p className="text-xs text-slate-500 uppercase tracking-wider">Your sim racing hub</p>
        </div>
      </div>
      <p className="text-sm text-slate-400 mb-6 max-w-2xl flex items-center gap-2">
        <Headphones size={14} className="text-cyan-400" />
        Chief's listening to every session. Tap any vendor to see what was captured.
      </p>
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {tiles.map(t => {
          const Icon = t.icon
          return (
            <Link key={t.href} href={t.href}
              className="rounded-xl p-5 border transition-all hover:scale-[1.02]"
              style={{ background: 'rgba(20,20,32,0.6)', borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="w-10 h-10 rounded-lg mb-3 flex items-center justify-center" style={{ background: t.accent + '20' }}>
                <Icon size={18} style={{ color: t.accent }} />
              </div>
              <div className="font-bold text-white">{t.label}</div>
              <div className="text-xs text-slate-500 mt-1">{t.desc}</div>
            </Link>
          )
        })}
      </div>
    </div>
  )
}
