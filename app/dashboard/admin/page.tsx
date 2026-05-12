'use client'
import { useEffect, useState } from 'react'
import { Shield, Users, Database, DollarSign, Loader2, AlertTriangle, ChevronRight, Gift, Clock, X, Star, Ban, RotateCcw, Crown } from 'lucide-react'
import PageHero from '@/components/shared/PageHero'

export default function AdminPanelPage() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string>('')
  const [editUser, setEditUser] = useState<any | null>(null)
  const [acting, setActing] = useState(false)
  const [actionMsg, setActionMsg] = useState<string>('')

  async function refresh() {
    try {
      const r = await fetch('/api/admin/stats', { cache: 'no-store' })
      const j = await r.json()
      if (j.error) setError(j.error); else { setData(j); setError('') }
    } catch (e: any) { setError(e.message) }
  }
  useEffect(() => { (async () => { await refresh(); setLoading(false) })() }, [])

  async function applyAction(action: string, opts: any = {}) {
    if (!editUser) return
    setActing(true); setActionMsg('')
    try {
      const r = await fetch('/api/admin/update-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: editUser.id, action, ...opts }),
      })
      const j = await r.json()
      if (j.ok) {
        setActionMsg(`✓ Applied "${action}" to ${editUser.email}`)
        await refresh()
        // Update the open modal's state to reflect the new plan
        const fresh = (data?.users || []).find((u: any) => u.id === editUser.id)
        if (fresh) setEditUser(fresh)
      } else {
        setActionMsg(`✗ ${j.error || 'failed'}`)
      }
    } catch (e: any) {
      setActionMsg(`✗ ${e.message}`)
    } finally {
      setActing(false)
    }
  }

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
                <button key={u.id}
                        onClick={() => { setEditUser(u); setActionMsg('') }}
                        className="w-full text-left px-5 py-3 flex items-center gap-3 hover:bg-white/[0.04] cursor-pointer transition-colors">
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
                      {u.access_level === 'tester' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider" style={{ background: 'rgba(34,197,94,0.2)', color: '#22c55e' }}>TESTER</span>
                      )}
                      {u.subscription_plan === 'free_lifetime' && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded font-bold tracking-wider" style={{ background: 'rgba(168,85,247,0.2)', color: '#a855f7' }}>FREE LIFETIME</span>
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
                </button>
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

      {/* USER ACTIONS MODAL */}
      {editUser && (
        <div onClick={() => setEditUser(null)}
             className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div onClick={(e) => e.stopPropagation()}
               className="w-full max-w-lg rounded-2xl border shadow-2xl"
               style={{ background: '#0c0c14', borderColor: 'rgba(244,114,182,0.3)' }}>
            <div className="px-5 py-4 border-b flex items-center justify-between" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
              <div>
                <div className="text-[10px] uppercase tracking-widest" style={{ color: '#f472b6' }}>Manage Tester</div>
                <div className="text-lg font-extrabold text-white">{editUser.team_name || editUser.email?.split('@')[0]}</div>
                <div className="text-xs text-slate-500">{editUser.email}</div>
              </div>
              <button onClick={() => setEditUser(null)} className="p-1 text-slate-500 hover:text-white"><X size={16} /></button>
            </div>
            <div className="px-5 py-4 space-y-2">
              <div className="grid grid-cols-2 gap-2 mb-3 text-xs">
                <div className="rounded-lg p-2 border" style={{ background: 'rgba(20,20,32,0.6)', borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="text-[9px] uppercase tracking-wider text-slate-500">Current Plan</div>
                  <div className="font-bold text-white capitalize">{(editUser.subscription_plan || 'trial').replace(/_/g, ' ')}</div>
                </div>
                <div className="rounded-lg p-2 border" style={{ background: 'rgba(20,20,32,0.6)', borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="text-[9px] uppercase tracking-wider text-slate-500">Access Level</div>
                  <div className="font-bold text-white capitalize">{editUser.access_level || 'user'}</div>
                </div>
                <div className="rounded-lg p-2 border" style={{ background: 'rgba(20,20,32,0.6)', borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="text-[9px] uppercase tracking-wider text-slate-500">Sessions</div>
                  <div className="font-bold" style={{ color: '#a3ff00' }}>{editUser.session_count || 0}</div>
                </div>
                <div className="rounded-lg p-2 border" style={{ background: 'rgba(20,20,32,0.6)', borderColor: 'rgba(255,255,255,0.06)' }}>
                  <div className="text-[9px] uppercase tracking-wider text-slate-500">Joined</div>
                  <div className="font-bold text-white">{editUser.created_at ? new Date(editUser.created_at).toLocaleDateString() : '—'}</div>
                </div>
              </div>

              <button disabled={acting} onClick={() => applyAction('grant_free_access')}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left disabled:opacity-40 transition"
                      style={{ background: 'rgba(168,85,247,0.18)', border: '1px solid rgba(168,85,247,0.45)' }}>
                <Gift size={16} style={{ color: '#a855f7' }} />
                <div className="flex-1">
                  <div className="text-sm font-bold text-white">Grant Free Lifetime Access</div>
                  <div className="text-[11px] text-slate-400">No expiry. For VIP testers and early adopters.</div>
                </div>
              </button>

              <button disabled={acting} onClick={() => applyAction('grant_full_trial', { days: 30 })}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left disabled:opacity-40 transition"
                      style={{ background: 'rgba(34,197,94,0.15)', border: '1px solid rgba(34,197,94,0.40)' }}>
                <Star size={16} style={{ color: '#22c55e' }} />
                <div className="flex-1">
                  <div className="text-sm font-bold text-white">Grant Full Trial (30 days)</div>
                  <div className="text-[11px] text-slate-400">All features unlocked. Auto-expires in 30 days.</div>
                </div>
              </button>

              <button disabled={acting} onClick={() => applyAction('extend_trial', { days: 14 })}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left disabled:opacity-40 transition"
                      style={{ background: 'rgba(6,182,212,0.15)', border: '1px solid rgba(6,182,212,0.40)' }}>
                <Clock size={16} style={{ color: '#06b6d4' }} />
                <div className="flex-1">
                  <div className="text-sm font-bold text-white">Extend Trial by 14 days</div>
                  <div className="text-[11px] text-slate-400">For testers still evaluating.</div>
                </div>
              </button>

              <button disabled={acting} onClick={() => applyAction('make_admin')}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left disabled:opacity-40 transition"
                      style={{ background: 'rgba(244,114,182,0.15)', border: '1px solid rgba(244,114,182,0.40)' }}>
                <Crown size={16} style={{ color: '#f472b6' }} />
                <div className="flex-1">
                  <div className="text-sm font-bold text-white">Promote to Admin</div>
                  <div className="text-[11px] text-slate-400">Full access to this panel + admin features.</div>
                </div>
              </button>

              <button disabled={acting} onClick={() => applyAction('reset_to_trial', { days: 7 })}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left disabled:opacity-40 transition"
                      style={{ background: 'rgba(245,197,24,0.12)', border: '1px solid rgba(245,197,24,0.35)' }}>
                <RotateCcw size={16} style={{ color: '#f5c518' }} />
                <div className="flex-1">
                  <div className="text-sm font-bold text-white">Reset to 7-Day Trial</div>
                  <div className="text-[11px] text-slate-400">Reverts any prior grant.</div>
                </div>
              </button>

              <button disabled={acting} onClick={() => applyAction('revoke_access')}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left disabled:opacity-40 transition"
                      style={{ background: 'rgba(239,68,68,0.12)', border: '1px solid rgba(239,68,68,0.35)' }}>
                <Ban size={16} style={{ color: '#ef4444' }} />
                <div className="flex-1">
                  <div className="text-sm font-bold text-white">Revoke Access</div>
                  <div className="text-[11px] text-slate-400">Marks as canceled. They lose all features.</div>
                </div>
              </button>

              {actionMsg && (
                <div className="mt-3 rounded-lg p-3 text-xs"
                     style={{
                       background: actionMsg.startsWith('✓') ? 'rgba(34,197,94,0.10)' : 'rgba(239,68,68,0.10)',
                       border: '1px solid ' + (actionMsg.startsWith('✓') ? 'rgba(34,197,94,0.40)' : 'rgba(239,68,68,0.40)'),
                       color: actionMsg.startsWith('✓') ? '#22c55e' : '#ef4444',
                     }}>
                  {actionMsg}
                </div>
              )}
              {acting && (
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-2">
                  <Loader2 size={12} className="animate-spin" /> Applying...
                </div>
              )}
            </div>
          </div>
        </div>
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
