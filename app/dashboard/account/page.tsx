import { createClient } from '@/lib/supabase/server'
import { User, Lock, Shield } from 'lucide-react'

export default async function AccountPage() {
  const sb = createClient()
  const { data: { user } } = await sb.auth.getUser()
  const { data: profile } = user ? await sb.from('profiles').select('*').eq('id', user.id).single() : { data: null }
  return (
    <div className="p-6 max-w-3xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(160,168,184,0.20)' }}>
          <User size={18} style={{ color: '#a0a8b8' }} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-white">Account</h1>
          <p className="text-xs text-slate-500 uppercase tracking-wider">Your profile + plan</p>
        </div>
      </div>
      <div className="rounded-xl p-5 border space-y-3" style={{ background: 'rgba(20,20,32,0.6)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex justify-between"><span className="text-sm text-slate-500">Email</span><span className="text-sm text-white">{user?.email || '—'}</span></div>
        <div className="flex justify-between"><span className="text-sm text-slate-500">Team name</span><span className="text-sm text-white">{profile?.team_name || '—'}</span></div>
        <div className="flex justify-between"><span className="text-sm text-slate-500">Plan</span><span className="text-sm text-white capitalize">{profile?.subscription_plan || 'trial'}</span></div>
        <div className="flex justify-between"><span className="text-sm text-slate-500">Access</span><span className="text-sm text-white capitalize">{profile?.access_level || 'standard'}</span></div>
      </div>
      <div className="mt-6 rounded-xl p-5 border" style={{ background: 'rgba(163,255,0,0.05)', borderColor: 'rgba(163,255,0,0.20)' }}>
        <div className="flex items-center gap-2 mb-2">
          <Shield size={14} style={{ color: '#a3ff00' }} />
          <span className="text-xs font-bold tracking-wider uppercase" style={{ color: '#a3ff00' }}>Your data is yours</span>
        </div>
        <p className="text-sm text-slate-400">All sessions, setups, and AI conversations are encrypted in transit and isolated to your account via row-level security. Nothing shared, nothing sold.</p>
      </div>
    </div>
  )
}
