import { createServerClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import DashboardSidebar from '@/components/shared/DashboardSidebar'
import DashboardTopbar from '@/components/shared/DashboardTopbar'

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('id', user.id).single()

  return (
    <div className="min-h-screen bg-[#0a0a0a] flex">
      <DashboardSidebar profile={profile} />
      <div className="flex-1 flex flex-col min-w-0 ml-64">
        <DashboardTopbar profile={profile} />
        <main className="flex-1 p-6 overflow-auto">{children}</main>
      </div>
    </div>
  )
}
