import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Trophy, Gamepad2, MessageSquare, Settings, Wrench, ChevronRight, Plus, CheckCircle2, Target, Zap, Sparkles } from 'lucide-react'

export default async function DashboardPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [
    { data: recentSetups },
    { data: recentSim },
    { data: pendingMaint },
    { data: profile },
    sessionCountRes,
    traceCountRes,
  ] = await Promise.all([
    supabase.from('setup_sheets').select('*, cars(name,type), tracks(name)').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('sim_setups').select('*, cars(name), tracks(name)').eq('user_id', user!.id).order('created_at', { ascending: false }).limit(5),
    supabase.from('maintenance_logs').select('*, cars(name)').eq('user_id', user!.id).neq('status', 'done').eq('priority', 'critical').limit(3),
    supabase.from('profiles').select('*').eq('id', user!.id).single(),
    supabase.from('sim_session_captures').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
    supabase.from('sim_lap_traces').select('id', { count: 'exact', head: true }).eq('user_id', user!.id),
  ])

  // Desktop daemon is "connected" once we've ever received either a session OR a lap trace
  // from this user's machine. Hides the giant download banner permanently after first race.
  const desktopConnected =
    (sessionCountRes.count ?? 0) > 0 ||
    (traceCountRes.count ?? 0) > 0 ||
    profile?.desktop_installed === true

  return (
    <div className="space-y-6 animate-in">
      <div className="chief-panel-glow p-6 rounded-lg">
        <div className="chief-accent-line mb-4" />
        <h1 className="font-display text-3xl text-white tracking-wide">
          WELCOME BACK, {profile?.full_name?.split(' ')[0]?.toUpperCase() || 'RACER'}
        </h1>
        <p className="text-[#888] text-sm mt-1">Chief is ready. What are we working on?</p>
      </div>

      {/* HERO: "Where am I losing time?" — the most important question Chief answers.
          Always-present link to the dedicated page that ranks the user's top 3 slow corners. */}
      <Link href="/dashboard/lose-time"
        className="block rounded-2xl p-5 border-2 transition-all hover:scale-[1.005] group"
        style={{
          background: 'linear-gradient(135deg, rgba(163,255,0,0.10), rgba(0,229,255,0.05))',
          borderColor: '#a3ff00',
          boxShadow: '0 0 30px rgba(163,255,0,0.18)',
        }}>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="w-14 h-14 rounded-xl flex items-center justify-center flex-shrink-0"
               style={{ background: 'rgba(163,255,0,0.20)', border: '2px solid #a3ff00' }}>
            <Target size={26} style={{ color: '#a3ff00' }} />
          </div>
          <div className="flex-1 min-w-[240px]">
            <div className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: '#a3ff00' }}>
              Chief's #1 Insight
            </div>
            <div className="font-display text-xl md:text-2xl text-white tracking-wide mb-0.5">
              Where am I losing time?
            </div>
            <p className="text-[12.5px] text-[#aaa]">
              Top 3 slow corners across your last 5 sessions, with a one-line "next-lap fix" for each.
            </p>
          </div>
          <div className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-display text-sm tracking-wide group-hover:scale-105 transition-transform"
               style={{ background: '#a3ff00', color: '#000' }}>
            <Zap size={14} /> SHOW ME
          </div>
        </div>
      </Link>

      {/* Desktop daemon — shows download banner until daemon has ever pushed.
          Once we see ANY session/trace from the user's PC, swap to a compact
          "Connected" confirmation strip. */}
      {!desktopConnected ? (
        <a
          href="/install"
          className="block rounded-2xl p-6 border-2 transition-all hover:scale-[1.01]"
          style={{
            background: 'linear-gradient(135deg, rgba(0,229,255,0.18), rgba(245,197,24,0.12))',
            borderColor: '#00e5ff',
            boxShadow: '0 0 40px rgba(0,229,255,0.25)',
          }}
        >
          <div className="flex items-center gap-5 flex-wrap">
            <div className="w-16 h-16 rounded-2xl flex items-center justify-center flex-shrink-0"
                 style={{ background: 'rgba(0,229,255,0.25)', border: '2px solid #00e5ff' }}>
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#00e5ff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            </div>
            <div className="flex-1 min-w-[260px]">
              <div className="text-[10px] uppercase tracking-widest font-bold mb-1" style={{ color: '#00e5ff' }}>
                Step 1 — required to hear voice coach
              </div>
              <div className="font-display text-2xl text-white tracking-wide mb-1">DOWNLOAD CHIEF FOR DESKTOP</div>
              <p className="text-sm text-[#aaa] max-w-2xl">
                This website is your dashboard. The voice coach + live telemetry capture run on your sim PC.
                Click below, run the installer (3 min), then double-click the Chief icon every time you race.
              </p>
            </div>
            <div className="flex flex-col gap-2">
              <div className="inline-flex items-center gap-2 px-6 py-3 rounded-lg font-display text-base tracking-wide"
                   style={{ background: '#00e5ff', color: '#000' }}>
                DOWNLOAD INSTALLER →
              </div>
              <div className="text-[10px] text-[#666] text-center">Windows · 1 file · ~5 KB</div>
            </div>
          </div>
        </a>
      ) : (
        <div className="flex items-center gap-3 px-4 py-3 rounded-lg border"
             style={{ background: 'rgba(57,255,20,0.06)', borderColor: 'rgba(57,255,20,0.30)' }}>
          <CheckCircle2 size={18} style={{ color: '#39ff14' }} />
          <div className="flex-1">
            <div className="text-[13px] font-bold text-white">
              Chief Desktop is connected · {(sessionCountRes.count ?? 0)} session{(sessionCountRes.count ?? 0) === 1 ? '' : 's'} captured
            </div>
            <div className="text-[11px] text-[#888]">
              Voice coach + auto-capture are active on your sim PC. Need to reinstall on another machine?{' '}
              <Link href="/install" className="underline" style={{ color: '#00e5ff' }}>Get the installer</Link>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Debrief Last Session', href: '/dashboard/sessions', icon: Sparkles, color: '#a3ff00', sub: 'AI Debrief' },
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
