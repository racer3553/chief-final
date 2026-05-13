'use client'
// Wraps Sidebar + Topbar + content with a mobile-first drawer pattern.
// - Mobile (<1024px): sidebar slides off-screen by default, hamburger in topbar opens it
// - Desktop (≥1024px): sidebar always visible, content offset by sidebar width
// - Body has overflow-x-hidden to kill any horizontal scroll
import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import DashboardSidebar from './DashboardSidebar'
import DashboardTopbar from './DashboardTopbar'

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
      {/* Sidebar */}
      <DashboardSidebar
        profile={profile}
        open={open}
        onClose={() => setOpen(false)}
      />

      {/* Mobile backdrop when drawer is open */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 bg-black/60 z-30 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          aria-hidden
        />
      )}

      {/* Content column — full width on mobile, offset by sidebar on desktop */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-60 relative z-10 w-full max-w-full">
        <DashboardTopbar
          profile={profile}
          onMenuClick={() => setOpen(o => !o)}
        />
        <main className="flex-1 p-4 md:p-6 overflow-x-hidden overflow-y-auto relative min-w-0 w-full max-w-full">
          {children}
        </main>
      </div>
    </>
  )
}
