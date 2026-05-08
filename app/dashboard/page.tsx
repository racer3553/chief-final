import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Trophy, Gamepad2, MessageSquare, Settings, Wrench, ChevronRight, Plus } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [{ data: recentSetups }, { data: recentSim }, { data: pendingMaint }, { data: profile }] = await Promise.all([
    supabase.from('setup_sheets').select('*, cars(name,type), tracks(name)').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('sim_setups').select('*, cars(name), tracks(name)').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('maintenance_logs').select('*, cars(name)').eq('user_id', user!.id).neq('status', 'done').eq('priority', 'critical').limit(3),
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
  ])

  return (
    <div className="space-y-6 animate-in">
      <div className="chief-panel-glow p-6 rounded-lg">
        <div className="chief-accent-line mb-4" />
        <h1 className="font-display text-3xl text-white tracking-wide">
          WELCOME BACK, {profile?.full_name?.split(' ')[0]?.toUpperCase() || 'RACER'}
        </h1>
        <p className="text-[#888] text-sm mt-1">Chief is ready. What are we working on?</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'New Setup Sheet', href: '/dashboard/race-chief/setup/new', icon: Settings, color: '#f5c518', sub: 'Race Chief' },
          { label: 'New Sim Setup', href: '/dashboard/sim-chief/setup/new', icon: Gamepad2, color: '#00e5ff', sub: 'Sim Chief' },
          { label: 'Ask Chief', href: '/dashboard/ai-chat', icon: MessageSquare, color: '#39ff14', sub: 'AI' },
          { label: 'Log Maintenance', href: '/dashboard/race-chief/maintenance', icon: Wrench, color: '#ff2d2d', sub: 'Race Chief' },
        ].map(a => (
          <Link key={a.label} href={a.href} className="chief-panel p-4 hover:border-[#333] transition-all group rounded-lg">
            <div className="p-2 rounded w-fit mb-3" style={{ background: a.color + '22', border: `1px solid ${a.color}33` }}>
              <a.icon size={18} style={{ color: a.color }} />
            </div>
            <div className="font-display text-sm text-white tracking-wide">{a.label}</div>
            <div className="font-mono-chief text-xs mt-1" style={{ color: a.color }}>{a.sub}</div>
          </Link>
        ))}
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div className="chief-panel rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-[#1a1a1a]">
            <div className="flex items-center gap-2">
              <Trophy size={14} className="text-[#f5c518]" />
              <span className="font-display text-sm text-white tracking-widest">RECENT SETUPS</span>
            </div>
            <Link href="/dashboard/race-chief/setup" className="text-xs text-[#888] hover:text-[#f5c518] flex items-center gap-1">View all <ChevronRight size={12} /></Link>
          </div>
          {recentSetups?.length ? (
            <div className="divide-y divide-[#1a1a1a]">
              {recentSetups.map((s: any) => (
                <Link key={s.id} href={`/dashboard/race-chief/setup/${s.id}`} className="flex items-center justify-between p-3 hover:bg-[#161616] transition-colors">
                  <div>
                    <div className="text-sm text-[#f0f0f0]">{s.name}</div>
                    <div className="font-mono-chief text-xs text-[#555]">{s.tracks?.name || 'No track'}</div>
                  </div>
                  {s.best_lap_time && <div className="font-mono-chief text-xs text-[#f5c518]">{s.best_lap_time}s</div>}
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-[#555] text-sm mb-2">No setup sheets yet.</p>
              <Link href="/dashboard/race-chief/setup/new" className="text-[#f5c518] text-sm hover:underline">Create your first setup →</Link>
            </div>
          )}
        </div>

        <div className="chief-panel rounded-lg overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-[#1a1a1a]">
            <div className="flex items-center gap-2">
              <Gamepad2 size={14} className="text-[#00e5ff]" />
              <span className="font-display text-sm text-white tracking-widest">RECENT SIM SETUPS</span>
            </div>
            <Link href="/dashboard/sim-chief/setup" className="text-xs text-[#888] hover:text-[#00e5ff] flex items-center gap-1">View all <ChevronRight size={12} /></Link>
          </div>
          {recentSim?.length ? (
            <div className="divide-y divide-[#1a1a1a]">
              {recentSim.map((s: any) => (
                <Link key={s.id} href={`/dashboard/sim-chief/setup/${s.id}`} className="flex items-center justify-between p-3 hover:bg-[#161616] transition-colors">
                  <div>
                    <div className="text-sm text-[#f0f0f0]">{s.name}</div>
                    <div className="font-mono-chief text-xs text-[#555]">{s.tracks?.name || 'No track'} · {s.sim_platform}</div>
                  </div>
                  {s.best_lap_time && <div className="font-mono-chief text-xs text-[#00e5ff]">{s.best_lap_time}s</div>}
                </Link>
              ))}
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-[#555] text-sm mb-2">No sim setups yet.</p>
              <Link href="/dashboard/sim-chief/setup/new" className="text-[#00e5ff] text-sm hover:underline">Log first sim setup →</Link>
            </div>
          )}
        </div>
      </div>

      {pendingMaint && pendingMaint.length > 0 && (
        <div className="bg-[#ff2d2d08] border border-[#ff2d2d33] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-[#ff2d2d] animate-pulse" />
            <span className="font-display text-sm text-[#ff2d2d] tracking-widest">CRITICAL MAINTENANCE PENDING</span>
          </div>
          {pendingMaint.map((m: any) => (
            <Link key={m.id} href="/dashboard/race-chief/maintenance" className="flex items-center justify-between py-2 hover:opacity-80">
              <div className="text-sm text-[#f0f0f0]">{m.title}</div>
              <div className="badge-red">{m.cars?.name}</div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
