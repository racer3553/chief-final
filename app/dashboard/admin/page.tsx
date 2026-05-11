'use client'
import { useEffect, useState } from 'react'
import { Shield, Users, Database, DollarSign, Loader2, AlertTriangle, ChevronRight } from 'lucide-react'
import PageHero from '@/components/shared/PageHero'

export default function AdminPanelPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/admin/stats', { cache: 'no-store' })
        const j = await r.json()
        if (j.error) setError(j.error)
        else setData(j)
      } catch (e: any) {
        setError(e.message)
      }
      setLoading(false)
    })()
  }, [])

  const stats = data?.stats || { users: 0, sessions: 0, paid: 0, mrr: 0 }
  const users = data?.users || []
  const recentSessions = data?.recentSessions || []

  return (
    <div className="max-w-6xl">
      <PageHero
        title="Admin Panel"
        subtitle="Operator console — every user, every session, every dollar."
        accent="#f472b6"
        icon={Shield}
        badge="ADMIN · LIVE"
      />

      {loading && (
        <div className="rounded-xl p-6 border flex items-center gap-2 text-sm text-slate-400" style={{ background: 'rgba(20,20,32,0.6)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <Loader2 size={14} className="animate-spin" /> Loading admin stats from service role...
        </div>
      )}

      {error && (
        <div className="rounded-xl p-4 border flex items-center gap-2 text-sm text-red-300 mb-4" style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.30)' }}>
          <AlertTriangle size={14} /> {error}
        </div>
      )}

      {!loading && (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
            {[
              { icon: Users,      label: 'Users',          value: stats.users,    color: '#06b6d4' },
              { icon: Database,   label: 'Total Sessions', value: stats.sessions, color: '#a3ff00' },
              { icon: Shield,     label: 'Paid Subs',      value: stats.paid,     color: '#f5c518' },
              { icon: DollarSign, label: 'MRR Estimate',   value: `$${stats.mrr}`, color: '#22c55e' },
            ].map(s => {
              const Icon = s.icon
              return (
                <div key={s.label} className="rounded-xl p-4 border relative overflow-hidden" style={{ background: 'rgba(20,20,32,0.6)', borderColor: s.color + '40', boxShadow: `0 0 24px ${s.color}15` }}>
                  <div className="absolute -top-6 -right-6 w-20 h-20 rounded-full" style={{ background: `radial-gradient(circle, ${s.color}30 0%, transparent 70%)` }} />
                  <Icon size={18} style={{ color: s.color }} className="mb-2 relative z-10" />
                  <div className="text-3xl font-black text-white relative z-10">{s.value}</div>
                  <div className="text-[11px] font-bold text-slate-500 uppercase tracking-wider relative z-10 mt-1">{s.label}</div>
                </div>
              )
            })}
          </div>

          {/* USER LIST */}
          <div className="rounded-xl border mb-6 overflow-hidden" style={{ background: 'rgba(20,20,32,0.6)', borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="px-5 py-3 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2">
                <Users size={14} style={{ color: '#06b6d4' }} />
                <h3 className="font-bold text-white text-sm tracking-wide">All Users <span className="text-slate-500 font-normal">({users.length})</span></h3>
              </div>
            </div>
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              {users.length === 0 && (
                <div className="px-5 py-8 text-center text-sm text-slate-500">No users found. Check service-role key in Vercel env.</div>
              )}
              {users.map((u: any) => (
                <div key={u.id} className="px-5 py-3 flex items-center gap-3 hover:bg-white/[0.02]">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center font-extrabold text-[12px] text-white shrink-0"
                    style={{ background: u.access_level === 'admin' ? 'linear-gradient(135deg,#f472b6,#a3ff00)' : 'linear-gradient(135deg,#06b6d4,#3b82f6)' }}>
                    {(u.team_name?.[0] || u.email?.[0] || '?').toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white truncate flex items-center gap-2">
                      {u.team_name || u.email?.split('@')[0] || 'Anonymous'}
                      {u.access_level === 'admin' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider" style={{ background: 'rgba(244,114,182,0.2)', color: '#f472b6' }}>ADMIN</span>
                      )}
                    </div>
                    <div className="text-[11px] text-slate-500 truncate">{u.email}</div>
                  </div>
                  <div className="text-right hidden sm:block">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">Plan</div>
                    <div className="text-xs font-bold text-white capitalize">{u.subscription_plan?.replace(/_/g, ' ') || 'trial'}</div>
                  </div>
                  <div className="text-right hidden md:block">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">Sessions</div>
                    <div className="text-xs font-bold" style={{ color: '#a3ff00' }}>{u.session_count}</div>
                  </div>
                  <div className="text-right hidden md:block">
                    <div className="text-[10px] text-slate-500 uppercase tracking-wider">Joined</div>
                    <div className="text-xs text-slate-400">{u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}</div>
                  </div>
                  <ChevronRight size={14} className="text-slate-600" />
                </div>
              ))}
            </div>
          </div>

          {/* RECENT SESSIONS */}
          <div className="rounded-xl border mb-6 overflow-hidden" style={{ background: 'rgba(20,20,32,0.6)', borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="px-5 py-3 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div className="flex items-center gap-2">
                <Database size={14} style={{ color: '#a3ff00' }} />
                <h3 className="font-bold text-white text-sm tracking-wide">Recent Sessions <span className="text-slate-500 font-normal">({recentSessions.length})</span></h3>
              </div>
            </div>
            <div className="divide-y" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
              {recentSessions.length === 0 && (
                <div className="px-5 py-6 text-center text-sm text-slate-500">No sessions captured yet.</div>
              )}
              {recentSessions.map((s: any) => (
                <a key={s.id} href={`/dashboard/sim-racing/session/${s.id}`} className="px-5 py-3 flex items-center gap-3 hover:bg-white/[0.02]">
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-bold text-white truncate">{s.car_name || '—'}</div>
                    <div className="text-[11px] text-slate-500 truncate">{s.track_name} · {s.started_at ? new Date(s.started_at).toLocaleString() : '—'}</div>
                  </div>
                  <div className="font-mono text-xs font-bold" style={{ color: '#06b6d4' }}>
                    {s.best_lap_time ? formatTime(s.best_lap_time) : '—'}
                  </div>
                  <ChevronRight size={14} className="text-slate-600" />
                </a>
              ))}
            </div>
          </div>

          {/* QUICK ACTIONS */}
          <div className="rounded-xl p-5 border" style={{ background: 'rgba(20,20,32,0.6)', borderColor: 'rgba(255,255,255,0.06)' }}>
            <h3 className="font-bold text-white mb-3 text-sm">Quick Actions</h3>
            <div className="space-y-2 text-sm text-slate-400">
              <a href="/dashboard/admin/rewards" className="block hover:text-white">→ Rewards Controller</a>
              <a href="/dashboard/admin/auditor" className="block hover:text-white">→ App Auditor (system health)</a>
              <a href="https://supabase.com/dashboard/project/gsxmzhvalmlzgyfbcnih" target="_blank" rel="noopener noreferrer" className="block hover:text-white">→ Supabase Dashboard ↗</a>
              <a href="https://vercel.com/racer3553-9850s-projects/chief-final" target="_blank" rel="noopener noreferrer" className="block hover:text-white">→ Vercel Dashboard ↗</a>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

function formatTime(s: number) {
  if (!s) return '—'
  const m = Math.floor(s / 60)
  const sec = (s - m * 60).toFixed(3)
  return `${m}:${sec.padStart(6, '0')}`
}
