'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Plus, Cpu, Flag } from 'lucide-react'
import ChiefLogo from './ChiefLogo'

const TITLES: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/race-chief/setup': 'Setup Sheets',
  '/dashboard/race-chief/setup/new': 'New Setup Sheet',
  '/dashboard/race-chief/maintenance': 'Maintenance',
  '/dashboard/race-chief/history': 'Race History',
  '/dashboard/sim-chief/setup': 'Sim Setups',
  '/dashboard/sim-chief/history': 'Sim History',
  '/dashboard/sim-racing': 'Sim Dashboard',
  '/dashboard/sim-racing/coach-dave': 'Coach Dave Info',
  '/dashboard/sim-racing/simucube': 'Simucube Info',
  '/dashboard/sim-racing/iracing': 'iRacing Settings',
  '/dashboard/sim-racing/sim-magic': 'SimPro Manager',
  '/dashboard/sim-setup/library': 'Session Library',
  '/dashboard/sim-setup/hardware': 'FFB & Hardware',
  '/dashboard/ai-chat': 'Ask Chief',
  '/dashboard/aero-ai': 'Aero AI',
  '/dashboard/engine-tuner': 'Engine Tuner AI',
  '/dashboard/my-cars': 'My Cars',
  '/dashboard/tracks': 'Track Database',
  '/dashboard/team': 'Team',
  '/dashboard/billing': 'Billing',
  '/dashboard/admin': 'Admin Panel',
  '/dashboard/admin/rewards': 'Rewards Controller',
  '/dashboard/admin/auditor': 'App Auditor',
  '/dashboard/account': 'Account',
}

export default function DashboardTopbar({ profile }: { profile: any }) {
  const pathname = usePathname()
  const title = TITLES[pathname] || 'Chief'

  return (
    <header
      className="h-16 sticky top-0 z-30 flex items-center justify-between px-6 border-b backdrop-blur-md"
      style={{
        background: 'linear-gradient(90deg, rgba(10,10,10,0.95) 0%, rgba(15,15,25,0.95) 50%, rgba(10,10,10,0.95) 100%)',
        borderColor: 'rgba(255,255,255,0.08)',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
      }}
    >
      {/* Racing checkered stripe at top edge — tri-color */}
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background: `repeating-linear-gradient(90deg, #a3ff00 0px, #a3ff00 12px, #06b6d4 12px, #06b6d4 24px, #ff00aa 24px, #ff00aa 36px, transparent 36px, transparent 48px)`,
          boxShadow: '0 0 12px rgba(163,255,0,0.6)',
        }}
      />

      <div className="flex items-center gap-3">
        {/* CHIEF brand mark - always visible */}
        <Link href="/dashboard" className="flex items-center gap-2.5 mr-2 group">
          <div className="group-hover:scale-105 transition-transform">
            <ChiefLogo size={38} variant="mark" />
          </div>
          <div className="hidden md:block leading-none">
            <div className="text-[17px] font-black tracking-[0.2em] text-white">CHIEF</div>
            <div className="text-[8px] font-bold tracking-[0.22em] text-slate-500 uppercase mt-1">By Walker Sports</div>
          </div>
        </Link>
        <div className="h-7 w-px bg-white/10 mx-1 hidden md:block" />
        <span className="text-[15px] font-bold text-white tracking-wide">{title}</span>
      </div>

      <div className="flex items-center gap-2">
        {/* Status pill */}
        <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider"
          style={{ background: 'rgba(34,197,94,0.10)', color: '#22c55e', border: '1px solid rgba(34,197,94,0.25)' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" />
          AI Online
        </div>
        <Link href="/dashboard/race-chief/setup/new"
          className="flex items-center gap-1.5 px-4 py-1.5 rounded-md text-sm font-bold transition-all hover:scale-[1.03]"
          style={{ background: '#f5c518', color: '#000' }}>
          <Plus size={14} /> New Setup
        </Link>
      </div>
    </header>
  )
}
