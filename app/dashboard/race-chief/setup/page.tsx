import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Plus, Clock, Trophy, Filter, Search } from 'lucide-react'

export default async function RaceChiefSetupPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: setups } = await supabase
    .from('setup_sheets')
    .select('*, cars(name, number, type), tracks(name, surface)')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })

  const CAR_TYPE_LABELS: Record<string, string> = {
    dirt_late_model: 'Dirt Late Model',
    pavement_late_model: 'Pavement Late Model',
    wing_sprint: 'Wing Sprint',
    non_wing_sprint: 'Non-Wing Sprint',
    wing_micro: 'Wing Micro',
    non_wing_micro: 'Non-Wing Micro',
    dirt_modified: 'Dirt Modified',
    street_stock: 'Street Stock',
  }

  return (
    <div className="space-y-5 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-white tracking-wide">SETUP SHEETS</h1>
          <p className="text-[#888] text-sm mt-1">{setups?.length || 0} setups logged</p>
        </div>
        <Link href="/dashboard/race-chief/setup/new" className="btn-chief">
          <Plus size={16} /> NEW SETUP
        </Link>
      </div>

      {/* Setups table */}
      {setups && setups.length > 0 ? (
        <div className="chief-panel rounded-lg overflow-hidden">
          <table className="chief-table">
            <thead>
              <tr>
                <th>SETUP NAME</th>
                <th>CAR</th>
                <th>TRACK</th>
                <th>CAR TYPE</th>
                <th>BEST LAP</th>
                <th>FINISH</th>
                <th>DATE</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {setups.map((s: any) => (
                <tr key={s.id} className="cursor-pointer" onClick={() => window.location.href = `/dashboard/race-chief/setup/${s.id}`}>
                  <td>
                    <div className="flex items-center gap-2">
                      {s.is_baseline && <span className="badge-yellow text-[9px]">BASE</span>}
                      <span className="text-[#f0f0f0] font-body">{s.name}</span>
                    </div>
                  </td>
                  <td className="text-[#888]">{s.cars?.name ? `${s.cars.name} #${s.cars.number || '—'}` : '—'}</td>
                  <td className="text-[#888]">{s.tracks?.name || '—'}</td>
                  <td>
                    <span className="badge-cyan text-[10px]">{CAR_TYPE_LABELS[s.car_type] || s.car_type}</span>
                  </td>
                  <td className="text-[#f5c518]">{s.best_lap_time ? `${s.best_lap_time}s` : '—'}</td>
                  <td className="text-[#888]">{s.feature_finish || '—'}</td>
                  <td className="text-[#555]">{new Date(s.created_at).toLocaleDateString()}</td>
                  <td>
                    <Link href={`/dashboard/race-chief/setup/${s.id}`}
                      className="text-[#f5c518] hover:underline text-xs font-mono"
                      onClick={e => e.stopPropagation()}>
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
          <Trophy size={40} className="text-[#333] mx-auto mb-4" />
          <h3 className="font-display text-xl text-[#555] tracking-wide mb-2">NO SETUPS YET</h3>
          <p className="text-[#444] text-sm mb-6">Create your first setup sheet and start building Chief's memory.</p>
          <Link href="/dashboard/race-chief/setup/new" className="btn-chief">
            <Plus size={16} /> CREATE FIRST SETUP
          </Link>
        </div>
      )}
    </div>
  )
}
