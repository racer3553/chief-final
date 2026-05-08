import { createServerClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { TrendingUp, TrendingDown, Minus, ChevronRight } from 'lucide-react'

export default async function RaceHistoryPage() {
  const supabase = createServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: setups } = await supabase
    .from('setup_sheets')
    .select('*, cars(name, number, type), tracks(name, surface, state)')
    .eq('user_id', user!.id)
    .not('best_lap_time', 'is', null)
    .order('event_date', { ascending: false })
    .limit(50)

  const { data: changes } = await supabase
    .from('setup_changes')
    .select('*')
    .eq('user_id', user!.id)
    .order('created_at', { ascending: false })
    .limit(30)

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
        <h1 className="font-display text-3xl text-white tracking-wide">RACE HISTORY</h1>
        <p className="text-[#888] text-sm mt-1">Chief's memory — everything that worked and didn't</p>
      </div>

      {/* Change log */}
      {changes && changes.length > 0 && (
        <div className="chief-panel rounded-lg overflow-hidden">
          <div className="p-4 border-b border-[#1a1a1a]">
            <span className="font-display text-sm text-white tracking-widest">RECENT CHANGES LOG</span>
          </div>
          <div className="divide-y divide-[#1a1a1a]">
            {changes.slice(0, 10).map((c: any) => (
              <div key={c.id} className="flex items-center gap-4 p-3">
                <div className={`shrink-0 ${
                  c.outcome === 'improved' ? 'text-[#39ff14]' :
                  c.outcome === 'worse' ? 'text-[#ff2d2d]' : 'text-[#555]'
                }`}>
                  {c.outcome === 'improved' ? <TrendingUp size={14} /> :
                   c.outcome === 'worse' ? <TrendingDown size={14} /> : <Minus size={14} />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-mono text-xs text-[#888]">
                    <span className="text-[#f0f0f0]">{c.field_changed}</span>
                    {c.old_value && <span className="mx-1 text-[#555]">{c.old_value}</span>}
                    {c.old_value && c.new_value && <span className="text-[#555]">→</span>}
                    {c.new_value && <span className="ml-1" style={{ color: c.outcome === 'improved' ? '#39ff14' : c.outcome === 'worse' ? '#ff2d2d' : '#888' }}>{c.new_value}</span>}
                  </div>
                  {c.reason && <div className="text-[#555] text-xs mt-0.5">{c.reason}</div>}
                </div>
                {c.lap_time_delta && (
                  <div className={`font-mono text-xs shrink-0 ${c.lap_time_delta < 0 ? 'text-[#39ff14]' : 'text-[#ff2d2d]'}`}>
                    {c.lap_time_delta > 0 ? '+' : ''}{c.lap_time_delta}s
                  </div>
                )}
                <div className="font-mono text-xs text-[#555] shrink-0">
                  {new Date(c.created_at).toLocaleDateString()}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* By track */}
      {Object.entries(byTrack).map(([track, trackSetups]) => {
        const bestTime = Math.min(...trackSetups.filter(s => s.best_lap_time).map(s => s.best_lap_time))
        const latestSetup = trackSetups[0]
        return (
          <div key={track} className="chief-panel rounded-lg overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-[#1a1a1a]">
              <div>
                <div className="font-display text-base text-white tracking-wide">{track}</div>
                <div className="font-mono text-xs text-[#555] mt-0.5">{trackSetups.length} sessions</div>
              </div>
              <div className="text-right">
                <div className="font-mono text-xs text-[#555]">BEST LAP</div>
                <div className="font-mono text-lg text-[#f5c518]">{bestTime}s</div>
              </div>
            </div>
            <div className="divide-y divide-[#1a1a1a]">
              {trackSetups.map((s: any) => (
                <Link key={s.id} href={`/dashboard/race-chief/setup/${s.id}`}
                  className="flex items-center justify-between p-3 hover:bg-[#161616] transition-colors group">
                  <div>
                    <div className="font-body text-sm text-[#f0f0f0]">{s.name}</div>
                    <div className="font-mono text-xs text-[#555]">
                      {s.event_date} · {s.cars?.name}
                      {s.feature_finish && ` · ${s.feature_finish}`}
                    </div>
                    {s.driver_feel_after && (
                      <div className="text-[#666] text-xs mt-0.5 truncate max-w-md">"{s.driver_feel_after}"</div>
                    )}
                  </div>
                  <div className="flex items-center gap-4">
                    {s.best_lap_time && (
                      <div className="text-right">
                        <div className="font-mono text-sm" style={{ color: s.best_lap_time === bestTime ? '#f5c518' : '#888' }}>
                          {s.best_lap_time}s
                        </div>
                        {s.best_lap_time === bestTime && <div className="text-[9px] font-mono text-[#f5c518]">BEST</div>}
                      </div>
                    )}
                    <ChevronRight size={14} className="text-[#333] group-hover:text-[#f5c518] transition-colors" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )
      })}

      {(!setups || setups.length === 0) && (
        <div className="chief-panel rounded-lg p-12 text-center">
          <p className="text-[#555] text-sm">No history yet. Complete some setup sheets with lap times to build Chief's memory.</p>
        </div>
      )}
    </div>
  )
}
