'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home, Cpu, Gauge, Flag, Monitor, ChevronDown, ChevronRight, LogOut,
  Wrench, Wind, Zap, Sparkles, FileText, BookOpen, FileInput, Settings,
  HardDrive, Database, ListChecks, Shield, Gift, ScanSearch, User,
  Activity, Library
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import ChiefLogo from './ChiefLogo'

const ENTRIES = [
  { id: 'home', label: 'Home', icon: Home, accent: '#a3ff00', href: '/dashboard' },
  { id: 'ask-chief', label: 'Ask Chief', icon: Sparkles, accent: '#06b6d4', href: '/dashboard/ai-chat' },
  { id: 'voice-settings', label: 'Voice Settings', icon: Settings, accent: '#a855f7', href: '/dashboard/settings' },
  { id: 'sim-dashboard', label: 'Sim Dashboard', icon: Gauge, accent: '#f59e0b', href: '/dashboard/sim-racing' },
  {
    id: 'real', label: 'Real Racecar', icon: Flag, accent: '#ef4444',
    items: [
      { href: '/dashboard/race-chief/setup/new',   icon: FileText,    label: 'Setup Sheets' },
      { href: '/dashboard/race-chief/maintenance', icon: Wrench,      label: 'Maintenance Sheets' },
      { href: '/dashboard/ai-chat?ctx=real',       icon: Sparkles,    label: 'Ask AI' },
      { href: '/dashboard/aero-ai',                icon: Wind,        label: 'Aero AI' },
      { href: '/dashboard/engine-tuner',           icon: Zap,         label: 'Engine Tuner AI' },
      { href: '/dashboard/race-chief/history',     icon: BookOpen,    label: 'Race History' },
      { href: '/dashboard/my-cars',                icon: ListChecks,  label: 'My Cars' },
    ],
  },
  {
    id: 'sim', label: 'Sim', icon: Monitor, accent: '#3b82f6',
    items: [
      // ---- NEW (telemetry overlay + permanent setup backup) ----
      { href: '/dashboard/sessions',               icon: Activity,    label: 'Sessions + Telemetry' },
      { href: '/dashboard/setups',                 icon: Library,     label: 'Setup Library' },
      // ---- existing ----
      { href: '/dashboard/steering',               icon: Settings,    label: 'Steering' },
      { href: '/dashboard/brakes',                 icon: Wind,        label: 'Brakes' },
      { href: '/dashboard/sim-racing/coach-dave',  icon: FileInput,   label: 'Coach Dave Info' },
      { href: '/dashboard/sim-racing/iracing',     icon: Cpu,         label: 'iRacing Settings' },
      { href: '/dashboard/sim-setup/library',      icon: Database,    label: 'Session Library (old)' },
      { href: '/dashboard/sim-setup/hardware',     icon: HardDrive,   label: 'FFB & Hardware' },
      { href: '/dashboard/ai-chat?ctx=sim',        icon: Sparkles,    label: 'Ask AI' },
    ],
  },
]

const ADMIN_ITEMS = [
  { href: '/dashboard/admin',           icon: Shield,     label: 'Admin Panel' },
  { href: '/dashboard/admin/rewards',   icon: Gift,       label: 'Rewards Controller' },
  { href: '/dashboard/admin/auditor',   icon: ScanSearch, label: 'App Auditor' },
  { href: '/dashboard/account',         icon: User,       label: 'Account' },
]

const ADMIN_EMAILS = [
  'racer3553@gmail.com',
  'ben@walkerperformancefiltration.com',
]

export default function DashboardSidebar({ profile }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()

  // Open ALL collapsibles by default so user sees every tab immediately
  const [open, setOpen] = useState({ real: true, sim: true })
  const toggle = (id) => setOpen({ ...open, [id]: !open[id] })

  // Self-fetch user + profile so admin check works even if prop is null
  const [authProfile, setAuthProfile] = useState(profile || null)
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      let p = profile
      if (!p) {
        const r = await supabase.from('profiles').select('*').eq('id', user.id).single()
        p = r.data
      }
      // ALWAYS attach the auth email even if profile fetch fails
      setAuthProfile({ ...(p || {}), email: p?.email || user.email })
    })()
  }, [])

  const isActive = (href) => {
    const base = href.split('?')[0]
    return pathname === base || (base !== '/dashboard' && pathname.startsWith(base))
  }

  const handleLogout = async () => {
    await supabase.auth.signOut()
    router.push('/')
  }

  const p = authProfile || profile || {}
  const isAdmin =
    p.access_level === 'admin' ||
    p.access_level === 'owner' ||
    p.role === 'admin' ||
    p.is_admin === true ||
    (p.email && ADMIN_EMAILS.includes(p.email.toLowerCase()))

  return (
    <aside className="w-60 fixed top-0 left-0 bottom-0 flex flex-col z-40"
      style={{ background: '#0c0c14', borderRight: '1px solid rgba(255,255,255,0.08)' }}>

      <Link href="/dashboard" className="px-4 pt-4 pb-3 flex items-center gap-2.5 border-b group" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="group-hover:scale-105 transition-transform">
          <ChiefLogo size={36} variant="mark" />
        </div>
        <div>
          <div className="text-[15px] font-extrabold text-white tracking-[0.2em] leading-none">CHIEF</div>
          <div className="text-[9.5px] font-bold text-slate-500 tracking-[0.18em] uppercase mt-1">AI Crew Chief</div>
        </div>
      </Link>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {ENTRIES.map(entry => {
          const Icon = entry.icon
          const isOpen = !!open[entry.id]
          const groupActive = entry.href ? isActive(entry.href) : entry.items?.some(it => isActive(it.href))

          if (entry.href) {
            return (
              <Link key={entry.id} href={entry.href}
                className="flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all"
                style={{
                  color: groupActive ? entry.accent : '#c0c8d4',
                  background: groupActive ? entry.accent + '18' : 'transparent',
                  fontWeight: groupActive ? 700 : 600,
                }}>
                <Icon size={17} />
                <span className="text-[14px]">{entry.label}</span>
              </Link>
            )
          }

          return (
            <div key={entry.id}>
              <button onClick={() => toggle(entry.id)}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all"
                style={{
                  color: groupActive || isOpen ? entry.accent : '#c0c8d4',
                  background: groupActive ? entry.accent + '18' : 'transparent',
                  fontWeight: groupActive || isOpen ? 700 : 600,
                }}>
                <Icon size={17} />
                <span className="flex-1 text-left text-[14px]">{entry.label}</span>
                {isOpen ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
              </button>
              {isOpen && entry.items && (
                <div className="ml-4 mt-1 mb-1.5 pl-3 border-l space-y-0.5"
                  style={{ borderColor: entry.accent + '40' }}>
                  {entry.items.map(it => {
                    const ItemIcon = it.icon
                    const active = isActive(it.href)
                    return (
                      <Link key={it.href} href={it.href}
                        className="flex items-center gap-2 px-2.5 py-1.5 rounded-md transition-all"
                        style={{
                          color: active ? entry.accent : '#a0a8b8',
                          background: active ? entry.accent + '20' : 'transparent',
                          fontWeight: active ? 700 : 500,
                          fontSize: '12.5px',
                        }}>
                        <ItemIcon size={13} className="shrink-0" />
                        <span className="truncate">{it.label}</span>
                      </Link>
                    )
                  })}
                </div>
              )}
            </div>
          )
        })}

        {isAdmin && (
          <div className="mt-4 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="px-3 pb-2 text-[10px] font-bold tracking-wider uppercase flex items-center gap-1.5" style={{ color: '#f472b6' }}>
              <Shield size={10} /> Admin
            </div>
            {ADMIN_ITEMS.map(it => {
              const ItemIcon = it.icon
              const active = isActive(it.href)
              return (
                <Link key={it.href} href={it.href}
                  className="flex items-center gap-2.5 px-3 py-2 rounded-lg transition-all"
                  style={{
                    color: active ? '#f472b6' : '#c0a0b0',
                    background: active ? 'rgba(244,114,182,0.15)' : 'transparent',
                    fontWeight: active ? 700 : 500,
                    fontSize: '12.5px',
                  }}>
                  <ItemIcon size={14} className="shrink-0" />
                  <span>{it.label}</span>
                </Link>
              )
            })}
          </div>
        )}
      </nav>

      <div className="border-t p-3" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2 px-2 py-2 rounded-lg" style={{ background: '#161622' }}>
          <div className="w-8 h-8 rounded-full flex items-center justify-center font-extrabold text-[11px] text-white shrink-0"
            style={{ background: 'linear-gradient(135deg,#ef4444,#dc2626)' }}>
            {(p.team_name?.[0] || p.email?.[0] || '?').toUpperCase()}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-[12.5px] font-bold text-white truncate">{p.team_name || 'Racer'}</div>
            <div className="text-[10px] text-slate-500 capitalize">{p.subscription_plan || 'trial'}{isAdmin ? ' · admin' : ''}</div>
          </div>
          <button onClick={handleLogout} className="p-1.5 rounded text-slate-500 hover:text-red-400 hover:bg-red-500/10">
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </aside>
  )
}
