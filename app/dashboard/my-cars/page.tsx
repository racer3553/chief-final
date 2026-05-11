'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { ListChecks, Lock } from 'lucide-react'

export default function MyCarsPage() {
  const [cars, setCars] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  useEffect(() => {
    (async () => {
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) { setLoading(false); return }
        const { data } = await sb
          .from('sim_session_captures')
          .select('car_name, track_name, started_at, best_lap_time, total_laps')
          .eq('user_id', user.id)
          .not('car_name', 'is', null)
          .order('started_at', { ascending: false })
          .limit(100)
        // Group by car
        const byCar: Record<string, any> = {}
        for (const s of data || []) {
          if (!s.car_name) continue
          if (!byCar[s.car_name]) byCar[s.car_name] = { name: s.car_name, sessions: 0, tracks: new Set(), best: null }
          byCar[s.car_name].sessions++
          if (s.track_name) byCar[s.car_name].tracks.add(s.track_name)
          if (s.best_lap_time && (!byCar[s.car_name].best || s.best_lap_time < byCar[s.car_name].best)) {
            byCar[s.car_name].best = s.best_lap_time
          }
        }
        setCars(Object.values(byCar).map((c: any) => ({ ...c, tracks: Array.from(c.tracks) })))
      } catch {} setLoading(false)
    })()
  }, [])
  const fmt = (s: number) => { if (!s) return '—'; const m = Math.floor(s/60); return `${m}:${(s-m*60).toFixed(3).padStart(6,'0')}` }
  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(245,197,24,0.20)' }}>
          <ListChecks size={18} style={{ color: '#f5c518' }} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-white">My Cars</h1>
          <p className="text-xs text-slate-500 uppercase tracking-wider">Auto-tracked from your sessions</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-slate-600 mb-6"><Lock size={11}/> Private</div>
      {loading && <div className="text-sm text-slate-500">Loading...</div>}
      {!loading && cars.length === 0 && <div className="text-sm text-slate-500 rounded-xl p-6 border" style={{ background: 'rgba(20,20,32,0.5)', borderColor: 'rgba(255,255,255,0.06)' }}>No cars logged yet. Race a session and Chief auto-tracks them here.</div>}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {cars.map((c: any) => (
          <div key={c.name} className="rounded-xl p-4 border" style={{ background: 'rgba(20,20,32,0.6)', borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="font-bold text-white text-sm mb-1">{c.name}</div>
            <div className="text-xs text-slate-500">{c.sessions} sessions · {c.tracks.length} tracks</div>
            <div className="mt-2 text-xs text-cyan-400 font-mono">Best: {fmt(c.best)}</div>
          </div>
        ))}
      </div>
    </div>
  )
}
