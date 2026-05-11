'use client'
// Reusable vendor section that pulls auto-captured data for a specific vendor.
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Headphones, Gauge, Database, Shield, Lock, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import PageHero from './PageHero'
import ScreenshotUpload from './ScreenshotUpload'

export default function VendorSection({
  title,
  subtitle,
  vendor,           // 'simucube' | 'fanatec' | 'iracing' | 'coach_dave' | 'sim_magic'
  category,         // 'wheels' | 'sim' | 'coach' | 'motion'
  accent = '#06b6d4',
  icon: Icon = Gauge,
  description,
}) {
  const [sessions, setSessions] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      try {
        const sb = createClient()
        const { data: { user } } = await sb.auth.getUser()
        if (!user) { setLoading(false); return }
        const { data } = await sb
          .from('sim_session_captures')
          .select('id,car_name,track_name,started_at,best_lap_time,total_laps,hardware_scan,detected_vendors')
          .eq('user_id', user.id)
          .order('started_at', { ascending: false })
          .limit(30)
        const filtered = (data || []).filter(s =>
          (s.detected_vendors || []).includes(vendor) ||
          s.hardware_scan?.[category]?.[vendor]?.detected
        )
        setSessions(filtered)
      } catch {}
      setLoading(false)
    })()
  }, [vendor, category])

  return (
    <div className="max-w-5xl">
      <PageHero title={title} subtitle={subtitle} badge="SIM · AUTO-CAPTURE" accent={accent} icon={Icon} />
      <p className="text-sm text-slate-400 mb-4 max-w-2xl px-1">{description}</p>

      {/* Screenshot upload - works for any vendor */}
      <div className="mb-6">
        <ScreenshotUpload vendor={vendor} accent={accent}
          label={`Snap a screenshot of ${title} → Chief reads every value`} />
      </div>

      {/* Auto-capture status banner */}
      <div className="rounded-xl p-4 border mb-6 flex items-center gap-3" style={{ background: 'rgba(163,255,0,0.05)', borderColor: 'rgba(163,255,0,0.20)' }}>
        <div className="w-8 h-8 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(163,255,0,0.15)' }}>
          <Headphones size={14} style={{ color: '#a3ff00' }} />
        </div>
        <div className="text-xs text-slate-400">
          <span className="font-bold text-white">Chief is listening.</span> Your {title} data auto-captures every session.
          {' '}Just race — ask Chief later "what was my setup?"
        </div>
      </div>

      {/* Privacy note */}
      <div className="flex items-center gap-1.5 text-[11px] text-slate-600 mb-4">
        <Lock size={11} /> Private to your account · Encrypted in transit · Never shared
      </div>

      {loading && <div className="text-sm text-slate-500">Loading captured sessions...</div>}

      {!loading && sessions.length === 0 && (
        <div className="rounded-xl p-8 border text-center" style={{ background: 'rgba(20,20,32,0.5)', borderColor: 'rgba(255,255,255,0.06)' }}>
          <Database size={28} className="mx-auto mb-3 text-slate-600" />
          <div className="text-base font-bold text-white mb-1">No sessions captured yet</div>
          <p className="text-sm text-slate-500 mb-4 max-w-md mx-auto">
            Run the Chief Auto-Capture daemon on your sim PC. Race once. Come back here and your {title} data appears automatically.
          </p>
          <a href="/dashboard/download" className="inline-block px-4 py-2 rounded-md text-xs font-semibold" style={{ background: accent, color: 'white' }}>
            Get the Auto-Capture Daemon
          </a>
        </div>
      )}

      {!loading && sessions.length > 0 && (
        <div className="space-y-3">
          <div className="text-xs font-bold tracking-wider uppercase text-slate-500 mb-2">
            {sessions.length} sessions captured with {title}
          </div>
          {sessions.map(s => {
            const vd = s.hardware_scan?.[category]?.[vendor] || {}
            return (
              <Link key={s.id} href={`/dashboard/sim-racing/session/${s.id}`}
                className="block rounded-xl p-4 border transition-all hover:border-white/20 cursor-pointer"
                style={{ background: 'rgba(20,20,32,0.6)', borderColor: 'rgba(255,255,255,0.06)' }}>
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <div className="font-bold text-white flex items-center gap-2">{s.car_name || 'Unknown car'} <ChevronRight size={14} className="text-slate-600" /></div>
                    <div className="text-xs text-slate-500">{s.track_name} · {new Date(s.started_at).toLocaleString()}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-xs text-slate-500">Best lap</div>
                    <div className="font-mono text-sm text-white">{s.best_lap_time ? formatTime(s.best_lap_time) : '—'}</div>
                  </div>
                </div>
                {vd.profiles && vd.profiles.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs cursor-pointer text-slate-400 hover:text-white">{vd.profiles.length} profile file(s) captured</summary>
                    <ul className="mt-2 space-y-1 text-[11px] font-mono text-slate-500 pl-4">
                      {vd.profiles.slice(0, 5).map((p, i) => <li key={i}>· {p.name}</li>)}
                    </ul>
                  </details>
                )}
                {vd.setups && vd.setups.length > 0 && (
                  <details className="mt-2">
                    <summary className="text-xs cursor-pointer text-slate-400 hover:text-white">{vd.setups.length} setup file(s) captured</summary>
                    <ul className="mt-2 space-y-1 text-[11px] font-mono text-slate-500 pl-4">
                      {vd.setups.slice(0, 5).map((p, i) => <li key={i}>· {p.name}</li>)}
                    </ul>
                  </details>
                )}
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}

function formatTime(s) {
  if (!s) return '—'
  const m = Math.floor(s / 60)
  const sec = (s - m * 60).toFixed(3)
  return `${m}:${sec.padStart(6, '0')}`
}
