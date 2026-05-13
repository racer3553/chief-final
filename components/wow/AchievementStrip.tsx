'use client'
// AchievementStrip — visual milestone badges on the dashboard. Calculates which
// achievements the user has unlocked from their session/trace count, fastest
// laps by combo, etc. Drives retention + makes progress visible.

import { useEffect, useState } from 'react'
import { Trophy, Flame, Zap, Award, Target, Star, Flag } from 'lucide-react'

const ICON_MAP: Record<string, any> = { flag: Flag, flame: Flame, zap: Zap, award: Award, target: Target, star: Star, trophy: Trophy }

interface Achievement {
  id: string
  label: string
  detail: string
  unlocked: boolean
  date?: string
  icon: string
  color: string
}

export default function AchievementStrip() {
  const [items, setItems] = useState<Achievement[]>([])

  useEffect(() => {
    fetch('/api/stats/achievements').then(r => r.json()).then(j => setItems(j.items || [])).catch(() => {})
  }, [])

  if (items.length === 0) return null

  return (
    <div className="rounded-xl p-4 border" style={{ background: 'rgba(20,20,32,0.6)', borderColor: 'rgba(255,255,255,0.08)' }}>
      <div className="flex items-center justify-between mb-3">
        <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-500">Milestones</div>
        <div className="text-[11px] text-slate-500">{items.filter(i => i.unlocked).length} / {items.length} unlocked</div>
      </div>
      <div className="grid grid-cols-3 md:grid-cols-6 gap-2">
        {items.map(a => {
          const Icon = ICON_MAP[a.icon] || Trophy
          return (
            <div key={a.id} className={`rounded-lg p-3 border text-center transition-all ${a.unlocked ? 'hover:scale-105' : 'opacity-30'}`}
                 style={{
                   background: a.unlocked ? a.color + '15' : 'rgba(20,20,32,0.4)',
                   borderColor: a.unlocked ? a.color + '50' : 'rgba(255,255,255,0.04)',
                 }}
                 title={a.detail}>
              <Icon size={22} style={{ color: a.unlocked ? a.color : '#374151' }} className="mx-auto mb-1.5" />
              <div className={`text-[10.5px] font-bold leading-tight ${a.unlocked ? 'text-white' : 'text-slate-600'}`}>
                {a.label}
              </div>
              <div className="text-[9px] text-slate-600 mt-0.5 truncate">{a.detail}</div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
