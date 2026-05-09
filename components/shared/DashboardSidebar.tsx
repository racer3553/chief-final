'use client'
import Link from 'next/link'
import { useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import {
  Home, Cpu, Gauge, Flag, Monitor, ChevronDown, ChevronRight, LogOut,
  Wrench, Wind, Zap, Sparkles, FileText, BookOpen, FileInput, Settings,
  HardDrive, Database, ListChecks, Shield, Gift, ScanSearch, User
} from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

// CHIEF — Final Sidebar
// 5 top-level entries. Real Racecar + Sim are expandable hubs.

type Item = { href: string; icon: any; label: string }
type TopEntry = {
  id: string; label: string; icon: any; accent: string
  href?: string; items?: Item[]
}

const ENTRIES: TopEntry[] = [
  { id: 'home', label: 'Home', icon: Home, accent: '#a3ff00', href: '/dashboard' },
  { id: 'ask-chief', label: 'Ask Chief', icon: Sparkles, accent: '#06b6d4', href: '/dashboard/ai-chat' },
  { id: 'sim-dashboard', label: 'Sim Dashboard', icon: Gauge, accent: '#f59e0b', href: '/dashboard/sim-racing' },
  {
    id: 'real', label: 'Real Racecar', icon: Flag, accent: '#ef4444',
    items: [
      { href: '/dashboard/race-chief/setup/new',  icon: FileText,    label: 'Setup Sheets' },
      { href: '/dashboard/race-chief/maintenance', icon: Wrench,     label: 'Maintenance Sheets' },
      { href: '/dashboard/ai-chat?ctx=real',       icon: Sparkles,   label: 'Ask AI' },
      { href: '/dashboard/aero-ai',                icon: Wind,       label: 'Aero AI' },
      { href: '/dashboard/engine-tuner',           icon: Zap,        label: 'Engine Tuner AI' },
      { href: '/dashboard/race-chief/history',     icon: BookOpen,   label: 'Race History' },
      { href: '/dashboard/my-cars',                icon: ListChecks, label: 'My Cars' },
    ],
  },
  {
    id: 'sim', label: 'Sim', icon: Monitor, accent: '#3b82f6',
    items: [
      { href: '/dashboard/sim-racing/coach-dave',  icon: FileInput,  label: 'Coach Dave Info' },
      { href: '/dashboard/sim-racing/simucube',    icon: Settings,   label: 'Simucube Info' },
      { href: '/dashboard/sim-racing/iracing',     icon: Cpu,        label: 'iRacing Settings' },
      { href: '/dashboard/sim-racing/sim-magic',   icon: Wind,       label: 'Sim Magic Settings' },
      { href: '/dashboard/sim-setup/library',      icon: Database,   label: 'Session Library' },
      { href: '/dashboard/sim-setup/hardware',     icon: HardDrive,  label: 'FFB & Hardware' },
      { href: '/dashboard/ai-chat?ctx=sim',        icon: Sparkles,   label: 'Ask AI' },
    ],
  },
]

export default function DashboardSidebar({ profile }: { profile: any }) {
  const pathname = usePathname()
  const router = useRouter()
  const supabase = createClient()
  const isActive = (href: string) =>
    pathname === href.split('?')[0] || (href !== '/dashboard' && pathname.startsWith(href.split('?')[0]))

  const initialOpen = new Set<string>()
  for (const e of ENTRIES) {
    if (e.items?.some(it => isActive(it.href))) initialOpen.add(e.id)
  }
  const [open, setOpen] = useState<Set<string>>(initialOpen)
  const toggle = (id: string) => {
    const n = new Set(open); n.has(id) ? n.delete(id) : n.add(id); setOpen(n)
  }
  const handleLogout = async () => { await supabase.auth.signOut(); router.push('/') }

  // Admin gate - shows admin section only to admin users (or you specifically)
  const isAdmin =
    profile?.access_level === 'admin' ||
    profile?.email === 'racer3553@gmail.com' ||
    profile?.email === 'ben@walkerperformancefiltration.com'

  const ADMIN_ITEMS: Item[] = [
    { href: '/dashboard/admin',           icon: Shield,     label: 'Admin Panel' },
    { href: '/dashboard/admin/rewards',   icon: Gift,       label: 'Rewards Controller' },
    { href: '/dashboard/admin/auditor',   icon: ScanSearch, label: 'App Auditor' },
    { href: '/dashboard/account',         icon: User,       label: 'Account' },
  ]

  return (
    <aside className="w-60 fixed top-0 left-0 bottom-0 flex flex-col z-40"
      style={{ background: '#0c0c14', borderRight: '1px solid rgba(255,255,255,0.08)' }}>
      <div className="px-4 pt-4 pb-3 flex items-center gap-2.5 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'linear-gradient(135deg,#a3ff00,#06b6d4)' }}>
          <Cpu size={18} className="text-black" />
        </div>
        <div>
          <div className="text-[15px] font-extrabold text-white tracking-wide leading-none">CHIEF</div>
          <div className="text-[9.5px] font-bold text-slate-500 tracking-wider uppercase mt-0.5">AI Crew Chief</div>
        </div>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-1">
        {ENTRIES.map(entry => {
          const Icon = entry.icon
          const isOpen = open.has(entry.id)
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
              {isOpen && (
                <div className="ml-4 mt-1 mb-1.5 pl-3 border-l space-y-0.5"
                  style={{ borderColor: entry.accent + '40' }}>
                  {entry.items!.map(it => {
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

        {/* ADMIN-ONLY SECTION */}
        {isAdmin && (
          <div className="mt-4 pt-3 border-t" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <div className="px-3 pb-2 text-[10px] font-bold tracking-wider uppercase text-slate-600 flex items-center gap-1.5">
              <Shield size={10} /> Admin
            </div>
            {ADMIN_ITEMS.map(it => {
              const ItemIcon = it.icon
              const active = isActive(it.href)
              return (
                <Link key={it.href} href={it.href}
                  classNa