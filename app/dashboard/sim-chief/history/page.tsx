import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { TrendingUp, TrendingDown, ChevronRight } from 'lucide-react'

export default async function SimHistoryPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: setups } = await supabase
    .from('sim_setups')
    .select('*, cars(name), tracks(name)')
    .eq('user_id', user!.id)
    .order('event_date', { ascending: false })
    .limit(100)

  const FEEL_COLOR: Record<string, string> = {
    very_loose: '#39ff14', loose: '#a0ff50', neutral: '#00e5ff', tight: '#f5c518', very_tight: '#ff2d2d'
  }

  // Group by track
  const byTrack = (setups || []).reduce((acc: Record<string, any[]>, s: any) => {
    const key = s.tracks?.name || 'Unknown Track'
    if (!acc[key]) acc[key] = []
    acc[key].push(s)
    return acc
  }, {})

  return (
    <div className="space-y-6 animate-in">
      <div>
        <h1 className="font-display text-3xl text-white tracking-wide">SIM HISTORY</h1>
        <p className="text-[#888] text-sm mt-1">Chief's sim memory — every setup, every lap</p>
      </div>

      {Object.entries(byTrack).map(([track, trackSetups]) => {
        const bestTime = Math.min(...trackSetups.filter((s: any) => s.best_lap_time).map((s: any) => s.best_lap_time))
        return (
          <div key={track} className="chief-panel rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#1a1a1a]">
              <div>
                <div className="font-display text-base text-white tracking-wide">{track}</div>
                <div className="font-mono text-xs text-[#555] mt-0.5">{trackSetups.length} sessions</div>
              </div>
              {bestTime && (
                <div className="text-right">
                  <div className="font-mono text-xs text-[#555]">BEST LAP</div>
                  <div className="font-mono text-lg text-[#00e5ff]">{bestTime}s</div>
                </div>
              )}
            </div>
            <div className="divide-y divide-[#1a1a1a]">
              {trackSetups.map((s: any) => (
                <Link key={s.id} href={`/dashboard/sim-chief/setup/${s.id}`}
                  className="flex items-center justify-between p-3 hover:bg-[#161616] transition-colors group">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="font-body text-sm text-[#f0f0f0]">{s.name}</span>
                      {s.is_baseline && <span className="badge-cyan text-[9px]">BASE</span>}
                    </div>
                    <div className="font-mono text-xs text-[#555]">
                      {s.sim_platform} · {s.cars?.name || '—'}
                      {s.irating_change != null && (
                        <span className={`ml-3 ${s.irating_change >= 0 ? 'text-[#39ff14]' : 'text-[#ff2d2d]'}`}>
                          iR: {s.irating_change > 0 ? '+' : ''}{s.irating_change}
                        </span>
                      )}
                    </div>
                    {s.driver_feel && (
                      <div className="text-[#555] text-xs mt-0.5 truncate max-w-md">"{s.driver_feel}"</div>
                    )}
                  </div>
                  <div className="flex items-center gap-6 shrink-0">
                    {s.loose_tight_center && (
                      <div className="text-right">
                        <div className="font-mono text-[10px] text-[#555]">CENTER</div>
                        <div className="font-mono text-xs" style={{ color: FEEL_COLOR[s.loose_tight_center] }}>
                          {s.loose_tight_center.replace('_', ' ')}
                        </div>
                      </div>
                    )}
                    {s.best_lap_time && (
                      <div className="text-right">
                        <div className="font-mono text-sm" style={{ color: s.best_lap_time === bestTime ? '#00e5ff' : '#888' }}>
                          {s.best_lap_time}s
                        </div>
                        {s.best_lap_time === bestTime && <div className="text-[9px] font-mono text-[#00e5ff]">BEST</div>}
                      </div>
                    )}
                    <ChevronRight size={14} className="text-[#333] group-hover:text-[#00e5ff] transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )
      })}

      {(!setups || setups.length === 0) && (
        <div className="chief-panel rounded-lg p-12 text-center">
          <p className="text-[#555] text-sm">No sim history yet. Log your first session to build Chief's memory.</p>
          <Link href="/dashboard/sim-chief/setup/new" className="text-[#00e5ff] text-sm hover:underline mt-2 block">
            Create first sim setup →
          </Link>
        </div>
      )}
    </div>
  )
}
