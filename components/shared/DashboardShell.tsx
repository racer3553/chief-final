'use client'
// Wraps Sidebar + Topbar + content with a mobile-first drawer pattern.
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import DashboardSidebar from './DashboardSidebar'
import DashboardTopbar from './DashboardTopbar'
import PageTheme from '@/components/wow/PageTheme'
import WalkerSportsFooter from '@/components/wow/WalkerSportsFooter'
import PersonalBestBanner from '@/components/wow/PersonalBestBanner'
import ChiefMascot from '@/components/wow/ChiefMascot'

export default function DashboardShell({
  profile,
  children,
}: {
  profile: any
  children: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const pathname = usePathname()

  // Auto-close drawer on route change (mobile)
  useEffect(() => { setOpen(false) }, [pathname])

  // Lock body scroll while drawer is open on mobile
  useEffect(() => {
    if (typeof document === 'undefined') return
    if (open) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => { document.body.style.overflow = '' }
  }, [open])

  return (
    <>
      <PageTheme />
      <PersonalBestBanner />
      <ChiefMascot />

      <DashboardSidebar profile={profile} open={open} onClose={() => setOpen(false)} />

      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-30 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      <div className="flex-1 flex flex-col min-w-0 lg:ml-60 relative z-10 w-full max-w-full">
        <DashboardTopbar profile={profile} onMenuClick={() => setOpen(o => !o)} />
        <main key={pathname} className="flex-1 p-4 md:p-6 overflow-x-hidden overflow-y-auto relative min-w-0 w-full max-w-full animate-page-fade">
          {children}
          <WalkerSportsFooter />
        </main>
      </div>

      <style jsx global>{`
        @keyframes pageFade {
          from { opacity: 0; transform: translateY(4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-page-fade { animation: pageFade 220ms ease-out; }
      `}</style>
    </>
  )
}
