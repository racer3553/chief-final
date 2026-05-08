import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Gamepad2 } from 'lucide-react'

export default async function SimSetupListPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: setups } = await supabase
    .from('sim_setups')
    .select('*, cars(name), tracks(name)')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const FEEL_COLOR: Record<string, string> = {
    very_loose: '#39ff14', loose: '#a0ff50', neutral: '#00e5ff', tight: '#f5c518', very_tight: '#ff2d2d'
  }

  return (
    <div className="space-y-5 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-white tracking-wide">SIM SETUPS</h1>
          <p className="text-[#888] text-sm mt-1">{setups?.length || 0} sessions logged</p>
        </div>
        <Link href="/dashboard/sim-chief/setup/new" className="btn-chief">
          <Plus size={16} /> NEW SIM SETUP
        </Link>
      </div>

      {setups && setups.length > 0 ? (
        <div className="chief-panel rounded-lg overflow-hidden">
          <table className="chief-table">
            <thead>
              <tr>
                <th>SETUP NAME</th>
                <th>PLATFORM</th>
                <th>CAR</th>
                <th>TRACK</th>
                <th>ENTRY</th>
                <th>CENTER</th>
                <th>EXIT</th>
                <th>BEST LAP</th>
                <th>DATE</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {setups.map((s: any) => (
                <tr key={s.id}>
                  <td>
                    <div className="flex items-center gap-2">
                      {s.is_baseline && <span className="badge-yellow text-[9px]">BASE</span>}
                      <span className="text-[#f0f0f0]">{s.name}</span>
                    </div>
                  </td>
                  <td><span className="badge-cyan text-[10px]">{s.sim_platform?.replace('_', ' ').toUpperCase()}</span></td>
                  <td className="text-[#888]">{s.cars?.name || '—'}</td>
                  <td className="text-[#888]">{s.tracks?.name || '—'}</td>
                  {(['loose_tight_entry', 'loose_tight_center', 'loose_tight_exit'] as const).map(k => (
                    <td key={k}>
                      {s[k] ? (
                        <span className="font-mono text-xs" style={{ color: FEEL_COLOR[s[k]] }}>
                          {s[k].replace('_', ' ')}
                        </span>
                      ) : '—'}
                    </td>
                  ))}
                  <td className="text-[#00e5ff] font-mono">{s.best_lap_time ? `${s.best_lap_time}s` : '—'}</td>
                  <td className="text-[#555]">{new Date(s.created_at).toLocaleDateString()}</td>
                  <td>
                    <Link href={`/dashboard/sim-chief/setup/${s.id}`} className="text-[#00e5ff] hover:underline text-xs font-mono">
                      OPEN →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="chief-panel rounded-lg p-16 text-center">
          <Gamepad2 size={40} className="text-[#333] mx-auto mb-4" />
          <h3 className="font-display text-xl text-[#555] tracking-wide mb-2">NO SIM SETUPS YET</h3>
          <p className="text-[#444] text-sm mb-6">Log your first sim session and build Chief's memory.</p>
          <Link href="/dashboard/sim-chief/setup/new" className="btn-chief">
            <Plus size={16} /> CREATE SIM SETUP
          </Link>
        </div>
      )}
    </div>
  )
}
