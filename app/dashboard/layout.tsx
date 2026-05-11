import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardSidebar from '@/components/shared/DashboardSidebar'
import DashboardTopbar from '@/components/shared/DashboardTopbar'
import BrandWatermark from '@/components/shared/BrandWatermark'
import BootBanner from '@/components/shared/BootBanner'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  return (
    <div className="min-h-screen flex relative overflow-hidden" style={{ background: '#0a0a0a' }}>
      {/* Boot brand reveal — fires once per session */}
      <BootBanner />

      {/* Big ghost helmet watermarks behind content */}
      <BrandWatermark />

      {/* Global racing-themed backdrop with neon glow zones */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `
            radial-gradient(ellipse 1200px 600px at 80% 20%, rgba(6,182,212,0.10) 0%, transparent 60%),
            radial-gradient(ellipse 900px 500px at 20% 80%, rgba(255,0,170,0.08) 0%, transparent 60%),
            radial-gradient(ellipse 700px 700px at 50% 50%, rgba(163,255,0,0.05) 0%, transparent 70%)
          `,
        }}
      />

      {/* Subtle checkered flag pattern overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.025]"
        style={{
          backgroundImage: `repeating-conic-gradient(#fff 0% 25%, #000 0% 50%)`,
          backgroundSize: '40px 40px',
        }}
      />

      {/* Diagonal racing stripes */}
      <div
        className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `repeating-linear-gradient(135deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 30px)`,
        }}
      />

      {/* Top-edge neon racing stripe */}
      <div
        className="fixed top-0 left-60 right-0 h-[3px] z-20 pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, #a3ff00 0%, #06b6d4 35%, #ff00aa 70%, #f5c518 100%)',
          boxShadow: '0 0 16px rgba(163,255,0,0.5), 0 0 32px rgba(255,0,170,0.3)',
        }}
      />

      <DashboardSidebar profile={profile} />
      <div className="flex-1 flex flex-col min-w-0 ml-60 relative z-10">
        <DashboardTopbar profile={profile} />
        <main className="flex-1 p-6 overflow-auto relative">{children}</main>
      </div>
    </div>
  )
}
