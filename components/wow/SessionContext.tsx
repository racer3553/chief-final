'use client'
// SessionContext — the "everything that matters about this session" card.
// Surfaces, in one panel per session:
//   - .sto setup file used (name + key parsed values from sim_setups_parsed)
//   - Wheel base settings (last captured screenshot for that vendor in this session)
//   - Pedal settings (same, for pedals vendor)
//   - Coach Dave Delta setup if referenced
//   - iRacing app context (FFB strength, wheel range, etc.) when available
//
// Drop into /dashboard/sessions/[id]/page.tsx so AI Ask Chief gets full
// per-event context: "what setup did I run at Daytona?" → answers from THIS panel.

import { useEffect, useState } from 'react'
import { Settings, Wrench, Wind, Gauge, Image as ImageIcon, FileText, Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'

interface SessionContextProps {
  sessionId: string
}

interface ContextResp {
  loading?: boolean
  setup?: {
    name: string | null
    fileName: string | null
    values?: Record<string, any>
  }
  screenshots?: Array<{
    id: string
    vendor: string
    url: string | null
    title: string | null
    capturedAt: string
  }>
  iracing?: {
    car?: string
    track?: string
    layout?: string
    setupName?: string
    weather?: any
    bestLap?: number
    totalLaps?: number
  }
}

const VENDOR_LABEL: Record<string, { label: string; icon: any; color: string }> = {
  simucube:     { label: 'Simucube',   icon: Settings, color: '#fa6b1f' },
  fanatec:      { label: 'Fanatec',    icon: Settings, color: '#ef4444' },
  moza:         { label: 'Moza',       icon: Settings, color: '#8b5cf6' },
  sim_magic:    { label: 'SimPro',     icon: Gauge,    color: '#a855f7' },
  asetek:       { label: 'Asetek',     icon: Settings, color: '#06b6d4' },
  thrustmaster: { label: 'Thrustmaster', icon: Settings, color: '#fbbf24' },
  logitech:     { label: 'Logitech',   icon: Settings, color: '#3b82f6' },
  heusinkveld:  { label: 'Heusinkveld', icon: Gauge,   color: '#10b981' },
  coach_dave:   { label: 'Coach Dave', icon: FileText, color: '#f5c518' },
  iracing:      { label: 'iRacing',    icon: Settings, color: '#ef4444' },
}

export default function SessionContext({ sessionId }: SessionContextProps) {
  const [data, setData] = useState<ContextResp>({ loading: true })

  useEffect(() => {
    (async () => {
      try {
        const sb = createClient()

        // 1. Session metadata (car/track/setup name)
        const { data: session } = await sb
          .from('sim_session_captures')
          .select('car_name, track_name, layout_name, best_lap_time, total_laps, weather_json, hardware_scan, started_at')
          .eq('id', sessionId)
          .maybeSingle()

        // 2. .sto setup file (most recent parsed setup before/at session start)
        const startedAt = (session as any)?.started_at
        let setup: any = null
        if (startedAt) {
          const oneDayBefore = new Date(new Date(startedAt).getTime() - 24 * 60 * 60_000).toISOString()
          const { data: setupRow } = await sb
            .from('sim_setups_parsed')
            .select('setup_name, file_name, parsed_values, updated_at')
            .gte('updated_at', oneDayBefore)
            .lte('updated_at', new Date(new Date(startedAt).getTime() + 4 * 60 * 60_000).toISOString())
            .order('updated_at', { ascending: false })
            .limit(1)
            .maybeSingle()
          if (setupRow) {
            setup = {
              name: setupRow.setup_name,
              fileName: setupRow.file_name,
              values: setupRow.parsed_values,
            }
          }
        }

        // 3. Hardware screenshots linked to this session
        const { data: shots } = await sb
          .from('sim_session_screenshots')
          .select('id, vendor, storage_path, window_title, created_at')
          .eq('session_id', sessionId)
          .order('created_at', { ascending: false })

        // Sign each screenshot URL (so private bucket works)
        const signed = await Promise.all((shots || []).map(async (s: any) => {
          const { data: u } = await sb.storage.from('session-screenshots').createSignedUrl(s.storage_path, 3600)
          return {
            id: s.id,
            vendor: s.vendor,
            url: u?.signedUrl || null,
            title: s.window_title,
            capturedAt: s.created_at,
          }
        }))

        setData({
          loading: false,
          setup,
          screenshots: signed,
          iracing: session ? {
            car: session.car_name || undefined,
            track: session.track_name || undefined,
            layout: session.layout_name || undefined,
            weather: session.weather_json,
            bestLap: session.best_lap_time || undefined,
            totalLaps: session.total_laps || undefined,
          } : undefined,
        })
      } catch (e) {
        setData({ loading: false })
      }
    })()
  }, [sessionId])

  if (data.loading) {
    return (
      <div className="rounded-xl p-5 border" style={{ background: 'rgba(20,20,32,0.6)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="flex items-center gap-2 text-cyan-300">
          <Loader2 size={16} className="animate-spin" /> Loading session context…
        </div>
      </div>
    )
  }

  const hasAnything = data.setup || (data.screenshots && data.screenshots.length > 0)

  if (!hasAnything) {
    return (
      <div className="rounded-xl p-5 border" style={{ background: 'rgba(20,20,32,0.6)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="text-[11px] font-bold tracking-widest uppercase text-slate-500 mb-2">Session Settings</div>
        <div className="text-sm text-slate-400">
          No hardware settings or setup file captured for this session yet. Make sure SimPro / Simucube / etc. windows are open
          when you start your next iRacing session — Chief auto-captures them.
        </div>
      </div>
    )
  }

  return (
    <div className="rounded-xl border" style={{ background: 'rgba(20,20,32,0.6)', borderColor: 'rgba(255,255,255,0.08)' }}>
      <div className="p-4 border-b" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
        <div className="text-[11px] font-bold tracking-[0.2em] uppercase mb-1" style={{ color: '#00e5ff' }}>
          Settings & Setup for this event
        </div>
        <div className="text-[12px] text-slate-400">
          Everything Chief captured at the start of this session. Ask Chief any question and it has all of this as context.
        </div>
      </div>

      <div className="p-4 grid grid-cols-1 lg:grid-cols-2 gap-4">

        {/* iRacing setup file */}
        {data.setup && (
          <div className="rounded-lg p-3 border" style={{ background: 'rgba(245,197,24,0.05)', borderColor: 'rgba(245,197,24,0.25)' }}>
            <div className="flex items-center gap-2 mb-2">
              <FileText size={13} style={{ color: '#f5c518' }} />
              <div className="text-[10px] font-bold tracking-widest uppercase" style={{ color: '#f5c518' }}>iRacing Setup (.sto)</div>
            </div>
            <div className="text-[13px] font-bold text-white mb-1 break-words">{data.setup.name || '—'}</div>
            <div className="text-[10px] font-mono text-slate-500 mb-2 break-words">{data.setup.fileName || '—'}</div>
            {data.setup.values && Object.keys(data.setup.values).length > 0 && (
              <details className="mt-2">
                <summary className="text-[11px] cursor-pointer text-slate-300 hover:text-white font-bold uppercase tracking-wider">
                  Key values ({Object.keys(data.setup.values).length})
                </summary>
                <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
                  {Object.entries(data.setup.values).slice(0, 20).map(([k, v]) => (
                    <div key={k} className="flex justify-between border-b border-white/5 py-0.5">
                      <span className="text-slate-500 truncate pr-1">{k}</span>
                      <span className="font-mono text-white text-right">{String(v)}</span>
                    </div>
                  ))}
                </div>
              </details>
            )}
          </div>
        )}

        {/* Hardware screenshots — one per vendor */}
        {(data.screenshots || []).map(s => {
          const meta = VENDOR_LABEL[s.vendor] || { label: s.vendor, icon: ImageIcon, color: '#888' }
          const Icon = meta.icon
          return (
            <div key={s.id} className="rounded-lg p-3 border"
                 style={{ background: meta.color + '08', borderColor: meta.color + '33' }}>
              <div className="flex items-center gap-2 mb-2">
                <Icon size={13} style={{ color: meta.color }} />
                <div className="text-[10px] font-bold tracking-widest uppercase" style={{ color: meta.color }}>
                  {meta.label} settings
                </div>
                <span className="ml-auto text-[10px] text-slate-500">{new Date(s.capturedAt).toLocaleTimeString()}</span>
              </div>
              {s.url ? (
                <a href={s.url} target="_blank" rel="noreferrer">
                  <img src={s.url} alt={`${meta.label} settings`}
                       className="w-full rounded border"
                       style={{ borderColor: 'rgba(255,255,255,0.06)', maxHeight: 280, objectFit: 'contain' }} />
                </a>
              ) : (
                <div className="text-[11px] text-slate-500">Image not loaded</div>
              )}
              {s.title && <div className="text-[10px] font-mono text-slate-500 mt-1.5 truncate">{s.title}</div>}
            </div>
          )
        })}

        {(data.screenshots?.length || 0) === 0 && !data.setup && (
          <div className="lg:col-span-2 text-[12px] text-slate-500 italic">
            Hardware screenshots for this event will appear once your wheel/pedal app is open at session start.
          </div>
        )}
      </div>
    </div>
  )
}
