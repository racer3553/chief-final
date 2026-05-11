'use client'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Gauge, Lock } from 'lucide-react'

export default function HardwarePage() {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)
  useEffect(() => { (async () => {
    try {
      const sb = createClient()
      const { data: { user } } = await sb.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data } = await sb.from('sim_session_captures')
        .select('id,car_name,track_name,started_at,detected_vendors,hardware_scan')
        .eq('user_id', user.id).order('started_at', { ascending: false }).limit(20)
      setSessions(data || [])
    } catch {} setLoading(false)
  })() }, [])

  return (
    <div className="p-6 max-w-5xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(168,85,247,0.20)' }}>
          <Gauge size={18} style={{ color: '#a855f7' }} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-white">FFB & Hardware</h1>
          <p className="text-xs text-slate-500 uppercase tracking-wider">All vendors detected per session</p>
        </div>
      </div>

      <div className="flex items-center gap-1.5 text-[11px] text-slate-600 mb-4">
        <Lock size={11} /> Private to your account · Encrypted in transit
      </div>

      {loading && <div className="text-sm text-slate-500">Loading...</div>}
      {!loading && sessions.length === 0 && (
        <div className="rounded-xl p-8 border text-center" style={{ background: 'rgba(20,20,32,0.5)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="text-base font-bold text-white mb-1">No hardware captured yet</div>
          <p className="text-sm text-slate-500">Run the Chief Auto-Capture daemon to detect Simucube/Fanatec/Moza/Asetek/Heusinkveld/Simagic.</p>
        </div>
      )}
      {!loading && sessions.map(s => (
        <div key={s.id} className="rounded-xl p-4 border mb-3" style={{ background: 'rgba(20,20,32,0.6)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <div className="flex items-start justify-between mb-2">
            <div>
              <div className="font-bold text-white">{s.car_name} @ {s.track_name}</div>
              <div className="text-xs text-slate-500">{new Date(s.started_at).toLocaleString()}</div>
            </div>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {(s.detected_vendors || []).map(v => (
              <span key={v} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300">{v}</span>
            ))}
            {(!s.detected_vendors || s.detected_vendors.length === 0) && <span className="text-[11px] text-slate-600">no vendors detected</span>}
          </div>
        </div>
      ))}
    </div>
  )
}
