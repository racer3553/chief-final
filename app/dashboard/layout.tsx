import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardShell from '@/components/shared/DashboardShell'
import BrandWatermark from '@/components/shared/BrandWatermark'
import BootBanner from '@/components/shared/BootBanner'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  return (
    <div className="min-h-screen flex relative overflow-x-hidden w-full max-w-[100vw]" style={{ background: '#0a0a0a' }}>
      <BootBanner />
      <BrandWatermark />

      {/* Global racing-themed backdrop with neon glow zones */}
      <div className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `
            radial-gradient(ellipse 1200px 600px at 80% 20%, rgba(6,182,212,0.10) 0%, transparent 60%),
            radial-gradient(ellipse 900px 500px at 20% 80%, rgba(255,0,170,0.08) 0%, transparent 60%),
            radial-gradient(ellipse 700px 700px at 50% 50%, rgba(163,255,0,0.05) 0%, transparent 70%)`,
        }} />

      <div className="fixed inset-0 pointer-events-none z-0 opacity-[0.025]"
        style={{
          backgroundImage: `repeating-conic-gradient(#fff 0% 25%, #000 0% 50%)`,
          backgroundSize: '40px 40px',
        }} />

      <div className="fixed inset-0 pointer-events-none z-0"
        style={{
          background: `repeating-linear-gradient(135deg, rgba(255,255,255,0.015) 0px, rgba(255,255,255,0.015) 1px, transparent 1px, transparent 30px)`,
        }} />

      {/* Top-edge neon racing stripe — full width on mobile, offset on desktop */}
      <div className="fixed top-0 left-0 lg:left-60 right-0 h-[3px] z-20 pointer-events-none"
        style={{
          background:
            'linear-gradient(90deg, #a3ff00 0%, #06b6d4 35%, #ff00aa 70%, #f5c518 100%)',
          boxShadow: '0 0 16px rgba(163,255,0,0.5), 0 0 32px rgba(255,0,170,0.3)',
        }} />

      <DashboardShell profile={profile}>{children}</DashboardShell>
    </div>
  )
}
