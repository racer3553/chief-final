'use client'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { Plus } from 'lucide-react'

const TITLES: Record<string, string> = {
  '/dashboard': 'Overview',
  '/dashboard/race-chief/setup': 'Setup Sheets',
  '/dashboard/race-chief/maintenance': 'Maintenance',
  '/dashboard/race-chief/history': 'Race History',
  '/dashboard/sim-chief/setup': 'Sim Setups',
  '/dashboard/sim-chief/history': 'Sim History',
  '/dashboard/ai-chat': 'Ask Chief',
  '/dashboard/tracks': 'Track Database',
  '/dashboard/team': 'Team',
  '/dashboard/billing': 'Billing',
}

export default function DashboardTopbar({ profile }: { profile: any }) {
  const pathname = usePathname()
  const title = TITLES[pathname] || 'Chief'
  return (
    <header className="h-14 bg-[#0d0d0d] border-b border-[#1a1a1a] flex items-center justify-between px-6 sticky top-0 z-30">
      <span className="font-display text-lg text-white tracking-wide">{title}</span>
      <Link href="/dashboard/race-chief/setup/new" className="btn-chief !text-sm !py-1.5 !px-4">
        <Plus size={14} /> New Setup
      </Link>
    </header>
  )
}
