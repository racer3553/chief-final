'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Database, Lock } from 'lucide-react'
import { useRouter } from 'next/navigation'

export default function LibraryPage() {
  const router = useRouter()
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { (async () => {
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data } = await sb.from('sim_session_captures')
        .select('id,car_name,track_name,started_at,best_lap_time,total_laps,session_type,incidents')
        .eq('user_id', user.id).order('started_at', { ascending: false }).limit(50)
      setSessions(data || [])
    } catch {} setLoading(false)
  })() }, [])
  const fmt = (s) => { if (!s) return '—'; const m=Math.floor(s/60); return `${m}:${(s-m*60).toFixed(3).padStart(6,'0')}` }
  return (
    <div className="p-6 max-w-6xl">
      <div className="flex items-center gap-3 mb-2">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(52,211,153,0.20)' }}>
          <Database size={18} style={{ color: '#34d399' }} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-white">Session Library</h1>
          <p className="text-xs text-slate-500 uppercase tracking-wider">Every iRacing session auto-captured</p>
        </div>
      </div>
      <div className="flex items-center gap-1.5 text-[11px] text-slate-600 mb-6">
        <Lock size={11} /> Private to your account
      </div>
      {loading && <div className="text-sm text-slate-500">Loading...</div>}
      {!loading && sessions.length === 0 && (
        <div className="rounded-xl p-8 border text-center" style={{ background: 'rgba(20,20,32,0.5)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="text-base font-bold text-white mb-1">No sessions yet</div>
          <p className="text-sm text-slate-500">Run the auto-capture daemon and race a session in iRacing.</p>
        </div>
      )}
      {!loading && sessions.length > 0 && (
        <div className="rounded-xl border overflow-hidden" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
          <table className="w-full text-sm">
            <thead className="bg-slate-900/60 text-xs uppercase tracking-wider text-slate-500">
              <tr><th className="text-left px-4 py-2">Date</th><th className="text-left px-4 py-2">Car</th><th className="text-left px-4 py-2">Track</th><th className="text-left px-4 py-2">Type</th><th className="text-right px-4 py-2">Laps</th><th className="text-right px-4 py-2">Best</th><th className="text-right px-4 py-2">Inc.</th></tr>
            </thead>
            <tbody>
              {sessions.map(s => (
                <tr key={s.id} onClick={() => router.push(`/dashboard/sim-racing/session/${s.id}`)}
                  className="border-t cursor-pointer hover:bg-white/5 transition-all"
                  style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  <td className="px-4 py-2 text-slate-400 text-xs">{new Date(s.started_at).toLocaleString()}</td>
                  <td className="px-4 py-2 text-white">{s.car_name}</td>
                  <td className="px-4 py-2 text-slate-300">{s.track_name}</td>
                  <td className="px-4 py-2 text-slate-500 text-xs">{s.session_type}</td>
                  <td className="px-4 py-2 text-right text-slate-300">{s.total_laps}</td>
                  <td className="px-4 py-2 text-right font-mono text-cyan-400">{fmt(s.best_lap_time)}</td>
                  <td className="px-4 py-2 text-right text-slate-400">{s.incidents}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
