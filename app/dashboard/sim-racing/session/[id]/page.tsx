'use client'
import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import {
  ArrowLeft, Sparkles, Loader2, Lock, Settings, Cpu, Wind,
  FileInput, Gauge, ChevronDown, ChevronRight, Save, TrendingUp, Download, Zap
} from 'lucide-react'
import Link from 'next/link'
import MoreSpeedPanel from '@/components/shared/MoreSpeedPanel'

export default function SessionDetailPage() {
  const { id } = useParams() as { id: string }
  const [session, setSession] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState<Record<string, boolean>>({ wheel: true, sim: true, coach: true })
  const [aiAdvice, setAiAdvice] = useState('')
  const [aiLoading, setAiLoading] = useState(false)
  const [otherSessions, setOtherSessions] = useState<any[]>([])
  const [compareId, setCompareId] = useState('')

  useEffect(() => {
    (async () => {
      const sb = createClient()
      const { data } = await sb.from('sim_session_captures').select('*').eq('id', id).single()
      setSession(data)
      // Pull other sessions of same car for comparison
      if (data) {
        const { data: { user } } = await sb.auth.getUser()
        if (user) {
          const { data: others } = await sb.from('sim_session_captures')
            .select('id, car_name, track_name, started_at, best_lap_time')
            .eq('user_id', user.id)
            .eq('car_name', data.car_name)
            .neq('id', id)
            .order('started_at', { ascending: false })
            .limit(10)
          setOtherSessions(others || [])
        }
      }
      setLoading(false)
    })()
  }, [id])

  async function compareSessions() {
    if (!compareId) return
    setAiLoading(true); setAiAdvice('')
    try {
      const sb = createClient()
      const { data: other } = await sb.from('sim_session_captures').select('*').eq('id', compareId).single()
      const r = await fetch('/api/ai/ask-chief', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: `Compare these two sessions. THIS session: ${JSON.stringify({ car: session.car_name, track: session.track_name, best: session.best_lap_time, hardware: session.hardware_scan }).slice(0,3000)}. PREVIOUS session: ${JSON.stringify({ best: other.best_lap_time, hardware: other.hardware_scan }).slice(0,3000)}. Tell me: 1) what setting changed between them, 2) was it faster, 3) what to try next. Be specific with values.`,
          car: session.car_name,
          track: session.track_name,
        }),
      })
      const j = await r.json()
      setAiAdvice(j.answer || j.error || 'No answer')
    } catch (e: any) { setAiAdvice('Error: ' + e.message) }
    setAiLoading(false)
  }

  // ---- Screenshot fetching + AI analysis ----
  const [screenshots, setScreenshots] = useState<any[]>([])
  const [shotLoading, setShotLoading] = useState(false)
  const [activeShot, setActiveShot] = useState<any | null>(null)
  const [shotAnalysis, setShotAnalysis] = useState<Record<string, string>>({})
  const [analyzingId, setAnalyzingId] = useState<string | null>(null)

  useEffect(() => {
    if (!id) return
    setShotLoading(true)
    fetch(`/api/sessions/${id}/screenshots`)
      .then(r => r.json())
      .then(j => { if (j.ok) setScreenshots(j.screenshots || []) })
      .finally(() => setShotLoading(false))
  }, [id])

  async function analyzeShot(shot: any) {
    if (!shot?.signed_url) return
    setAnalyzingId(shot.id)
    try {
      // Fetch the image as base64 to send to Claude Vision
      const blob = await (await fetch(shot.signed_url)).blob()
      const b64 = await new Promise<string>((resolve) => {
        const r = new FileReader()
        r.onloadend = () => resolve(String(r.result).split(',')[1] || '')
        r.readAsDataURL(blob)
      })
      const r = await fetch('/api/ai/parse-screenshot', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image_b64: b64,
          image_type: 'image/png',
          vendor: shot.vendor || 'generic',
          session_id: id,
        }),
      })
      const j = await r.json()
      const txt = j.parsed
        ? JSON.stringify(j.parsed, null, 2)
        : (j.raw || j.error || 'No structured data extracted')
      setShotAnalysis(prev => ({ ...prev, [shot.id]: txt }))
    } catch (e: any) {
      setShotAnalysis(prev => ({ ...prev, [shot.id]: 'Error: ' + e.message }))
    } finally {
      setAnalyzingId(null)
    }
  }

  async function askChief() {
    if (!session) return
    setAiLoading(true); setAiAdvice('')
    try {
      const r = await fetch('/api/ai/ask-chief', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: `Analyze this session and tell me 3 specific changes to make me faster. Reference the actual settings/values where possible. Car: ${session.car_name}, Track: ${session.track_name}, Best lap: ${session.best_lap_time}. Settings: ${JSON.stringify(session.hardware_scan).slice(0, 4000)}`,
          car: session.car_name,
          track: session.track_name,
        }),
      })
      const j = await r.json()
      setAiAdvice(j.answer || j.error || 'No answer')
    } catch (e: any) { setAiAdvice('Error: ' + e.message) }
    setAiLoading(false)
  }

  const fmt = (s: number) => { if (!s) return '—'; const m = Math.floor(s/60); return `${m}:${(s-m*60).toFixed(3).padStart(6,'0')}` }
  const toggle = (k: string) => setOpen({ ...open, [k]: !open[k] })

  if (loading) return <div className="p-6 text-slate-400">Loading session...</div>
  if (!session) return <div className="p-6 text-slate-400">Session not found.</div>

  const hw = session.hardware_scan || {}
  const wheel = Object.entries(hw.wheels || {}).find(([_, v]: any) => v?.detected) as any
  const sim = hw.sim?.iracing
  const coach = hw.coach?.coach_dave
  const motion = Object.entries(hw.motion || {}).find(([_, v]: any) => v?.detected) as any

  return (
    <div className="p-6 max-w-5xl">
      <Link href="/dashboard/sim-setup/library" className="inline-flex items-center gap-1.5 text-xs text-slate-500 hover:text-white mb-4">
        <ArrowLeft size={12} /> Back to Library
      </Link>

      {/* Header */}
      <div className="rounded-2xl p-6 border mb-4" style={{ background: 'linear-gradient(135deg, rgba(6,182,212,0.06), rgba(163,255,0,0.04))', borderColor: 'rgba(6,182,212,0.20)' }}>
        <div className="flex items-start justify-between flex-wrap gap-4">
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-cyan-400">{session.session_type || 'session'} · {new Date(session.started_at || session.created_at).toLocaleString()}</div>
            <h1 className="text-3xl font-extrabold text-white mt-1">{session.car_name}</h1>
            <div className="text-lg text-slate-400">{session.track_name}{session.layout_name ? ` · ${session.layout_name}` : ''}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-500 uppercase">Best Lap</div>
            <div className="text-3xl font-mono font-extrabold text-cyan-300">{fmt(session.best_lap_time)}</div>
            <div className="text-xs text-slate-500 mt-1">{session.total_laps} laps · {session.incidents || 0} inc</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5 mt-4">
          {(session.detected_vendors || []).map((v: string) => (
            <span key={v} className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-cyan-300 uppercase tracking-wider font-bold">{v}</span>
          ))}
        </div>
      </div>

      {/* MORE SPEED — runs every AI analysis at once */}
      <MoreSpeedPanel sessionId={id} />

      {/* Ask Chief — full-width */}
      <div className="rounded-xl p-5 border mb-4" style={{ background: 'rgba(6,182,212,0.08)', borderColor: 'rgba(6,182,212,0.30)' }}>
        <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
          <div>
            <div className="font-bold text-white text-base flex items-center gap-2"><Sparkles size={16} className="text-cyan-400" /> Ask Chief about this session</div>
            <div className="text-xs text-slate-400 mt-1">Get 3 specific changes to make you faster, based on your actual settings.</div>
          </div>
          <button onClick={askChief} disabled={aiLoading}
            className="px-5 py-2.5 rounded-lg font-bold text-white disabled:opacity-40 flex items-center gap-2"
            style={{ background: '#06b6d4' }}>
            {aiLoading ? <Loader2 size={16} className="animate-spin" /> : <TrendingUp size={16} />}
            How do I get faster?
          </button>
        </div>
        {/* Compare to previous session */}
        {otherSessions.length > 0 && (
          <div className="flex items-center gap-2 pt-3 border-t" style={{ borderColor: 'rgba(6,182,212,0.18)' }}>
            <span className="text-xs text-slate-400">Compare to:</span>
            <select value={compareId} onChange={e => setCompareId(e.target.value)}
              className="px-3 py-1.5 rounded-md bg-black/40 text-sm text-white border" style={{ borderColor: 'rgba(255,255,255,0.10)' }}>
              <option value="">Pick another session of this car...</option>
              {otherSessions.map(s => (
                <option key={s.id} value={s.id}>{new Date(s.started_at).toLocaleDateString()} @ {s.track_name} — {fmt(s.best_lap_time)}</option>
              ))}
            </select>
            <button onClick={compareSessions} disabled={!compareId || aiLoading}
              className="px-4 py-1.5 rounded-md text-sm font-bold text-white disabled:opacity-40"
              style={{ background: '#a3ff00', color: '#000' }}>
              Compare with AI
            </button>
          </div>
        )}
        {aiAdvice && (
          <div className="mt-4 rounded-lg p-4 border whitespace-pre-wrap text-white leading-relaxed" style={{ background: 'rgba(0,0,0,0.4)', borderColor: 'rgba(6,182,212,0.20)' }}>
            {aiAdvice}
          </div>
        )}
      </div>

      {/* Auto-captured screenshots from Simucube / SimPro / iRacing / Coach Dave */}
      {(screenshots.length > 0 || shotLoading) && (
        <Section title={`Auto-Captured Screenshots (${screenshots.length})`}
                 icon={Settings} accent="#06b6d4"
                 open={open.shots ?? true} onToggle={() => toggle('shots')}>
          {shotLoading && <div className="text-xs text-slate-500">Loading captures…</div>}
          {!shotLoading && screenshots.length === 0 && (
            <div className="text-xs text-slate-500">
              No screenshots captured for this session yet. The desktop daemon takes them automatically when Simucube Tuner / SimPro Manager / iRacing are open during a race.
            </div>
          )}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {screenshots.map((s) => (
              <div key={s.id} className="rounded-lg overflow-hidden border" style={{ background: 'rgba(20,20,32,0.5)', borderColor: 'rgba(6,182,212,0.20)' }}>
                <button onClick={() => setActiveShot(s)} className="block w-full">
                  <img src={s.signed_url} alt={s.vendor}
                       className="w-full h-auto block hover:opacity-90 transition cursor-zoom-in"
                       style={{ maxHeight: 240, objectFit: 'cover' }} />
                </button>
                <div className="px-3 py-2 flex items-center gap-2 text-xs">
                  <span className="font-bold uppercase tracking-wider" style={{ color: '#06b6d4' }}>
                    {s.vendor}
                  </span>
                  <span className="text-slate-500 truncate flex-1">
                    {new Date(s.taken_at).toLocaleString()}
                  </span>
                  <button
                    onClick={() => analyzeShot(s)}
                    disabled={analyzingId === s.id}
                    className="ml-auto px-2 py-1 rounded text-[11px] font-bold disabled:opacity-40 inline-flex items-center gap-1"
                    style={{ background: '#06b6d4', color: 'white' }}
                    title="Send to Claude Vision for setting extraction">
                    {analyzingId === s.id ? <Loader2 size={10} className="animate-spin" /> : <Sparkles size={10} />}
                    Analyze
                  </button>
                </div>
                {shotAnalysis[s.id] && (
                  <pre className="px-3 py-2 text-[11px] text-emerald-200 bg-black/40 max-h-[200px] overflow-auto whitespace-pre-wrap border-t border-cyan-500/10">
                    {shotAnalysis[s.id]}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </Section>
      )}

      {/* Fullscreen modal viewer when a screenshot is clicked */}
      {activeShot && (
        <div onClick={() => setActiveShot(null)}
             className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-6 cursor-zoom-out">
          <img src={activeShot.signed_url} alt={activeShot.vendor}
               className="max-w-full max-h-full rounded-lg shadow-2xl"
               onClick={(e) => e.stopPropagation()} />
          <button onClick={() => setActiveShot(null)}
                  className="absolute top-4 right-4 px-3 py-1 rounded bg-white/10 text-white text-sm">
            Close ✕
          </button>
        </div>
      )}

      {/* Lap-by-lap */}
      {Array.isArray(session.laps_data) && session.laps_data.length > 0 && (
        <Section title="Lap by Lap" icon={Gauge} accent="#a3ff00" open={open.laps} onToggle={() => toggle('laps')}>
          <div className="rounded-lg overflow-hidden border" style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
            <table className="w-full text-sm">
              <thead className="bg-slate-900/60 text-xs uppercase tracking-wider text-slate-500">
                <tr><th className="text-left px-3 py-2">Lap</th><th className="text-right px-3 py-2">Time</th><th className="text-right px-3 py-2">Fuel</th><th className="text-right px-3 py-2">Track Temp</th></tr>
              </thead>
              <tbody>
                {session.laps_data.map((l: any, i: number) => (
                  <tr key={i} className="border-t" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    <td className="px-3 py-2 text-slate-400">{l.lap}</td>
                    <td className="px-3 py-2 text-right font-mono text-cyan-300">{fmt(l.time)}</td>
                    <td className="px-3 py-2 text-right text-slate-400">{l.fuel_pct}%</td>
                    <td className="px-3 py-2 text-right text-slate-400">{l.track_temp}°F</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>
      )}

      {/* Wheel base */}
      {wheel && (
        <Section title={`Wheel Base — ${wheel[0]}`} icon={Settings} accent="#3b82f6" open={open.wheel} onToggle={() => toggle('wheel')}>
          {wheel[1].active_profile && (
            <div className="mb-3 rounded-lg p-3 border" style={{ background: 'rgba(59,130,246,0.06)', borderColor: 'rgba(59,130,246,0.20)' }}>
              <div className="text-xs text-slate-500 uppercase tracking-wider">Active Profile</div>
              <div className="font-mono text-blue-300 text-sm">{wheel[1].active_profile.name || wheel[1].active_profile.path}</div>
            </div>
          )}
          {wheel[1].active_profile_values && (
            <div className="mb-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">Actual Settings Captured</div>
              <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
                {Object.entries(wheel[1].active_profile_values).slice(0, 30).map(([k, v]: any) => (
                  <div key={k} className="flex justify-between border-b py-1" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                    <span className="text-slate-400 truncate">{k}</span>
                    <span className="text-blue-300 font-mono">{String(v)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {wheel[1].profiles && wheel[1].profiles.length > 0 && (
            <div className="text-sm">
              <div className="text-xs text-slate-500 mb-2 font-bold uppercase">All Profile Files ({wheel[1].profiles.length})</div>
              {wheel[1].profiles.slice(0, 10).map((p: any, i: number) => (
                <div key={i} className="font-mono text-[12px] text-slate-400 py-0.5">· {p.name}</div>
              ))}
            </div>
          )}
        </Section>
      )}

      {/* iRacing */}
      {sim && (
        <Section title="iRacing Settings" icon={Cpu} accent="#06b6d4" open={open.sim} onToggle={() => toggle('sim')}>
          <KV label="Cars with setups">{sim.all_cars_with_setups?.length || 0}</KV>
          {sim.setup_files && sim.setup_files.length > 0 && (
            <div className="mt-3">
              <div className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2">
                Stored .sto Setup Files (downloadable, drop into iRacing setups folder)
              </div>
              <div className="space-y-1">
                {sim.setup_files.map((f: any, i: number) => (
                  <a key={i}
                    href={`/api/setup-files/${id}/${encodeURIComponent(f.name)}`}
                    download={f.name}
                    className="flex items-center gap-2 px-3 py-2 rounded-lg border hover:bg-cyan-500/10 transition-all"
                    style={{ background: 'rgba(20,20,32,0.4)', borderColor: 'rgba(6,182,212,0.20)' }}>
                    <Download size={13} className="text-cyan-400 shrink-0" />
                    <span className="font-mono text-[12.5px] text-cyan-200 flex-1 truncate">{f.name}</span>
                    <span className="text-[10px] text-slate-500">{(f.size/1024).toFixed(1)} KB</span>
                  </a>
                ))}
              </div>
            </div>
          )}
          {!sim.setup_files?.length && sim.setups_for_car && (
            <KV label="Setups for this car">
              {sim.setups_for_car.slice(0, 8).map((s: any) => s.name).join(', ') || '—'}
            </KV>
          )}
        </Section>
      )}

      {/* Coach Dave — actionable setup list (no more raw filename dumps) */}
      {coach && (
        <Section title="Coach Dave Setups Available" icon={FileInput} accent="#10b981" open={open.coach} onToggle={() => toggle('coach')}>
          {(() => {
            // Filter out internal noise like artifacts.json / vk_swiftshader_icd.json
            const raw = coach.cdd_setup_files?.length ? coach.cdd_setup_files : (coach.setups || [])
            const real = raw.filter((f: any) => /\.sto$|\.cdd$/i.test(f.name) && !/swiftshader|artifacts/i.test(f.name))
            const matchesCar = real.filter((f: any) => {
              const car = (session.car_name || '').toLowerCase()
              if (car.includes('late model')) return /lms|lmod|lmst/i.test(f.name)
              if (car.includes('gt3')) return /gt3/i.test(f.name)
              return true
            })
            return (
              <>
                <div className="text-sm text-slate-300 mb-3">
                  You own <span className="text-emerald-300 font-bold">{real.length}</span> Coach Dave .sto setup files.{' '}
                  <span className="text-emerald-300 font-bold">{matchesCar.length}</span> match this car class.
                </div>
                <div className="space-y-1.5 max-h-[280px] overflow-y-auto">
                  {matchesCar.length === 0 && <div className="text-xs text-slate-500">No CDA setups match this car class.</div>}
                  {matchesCar.slice(0, 12).map((f: any, i: number) => (
                    <div key={i}
                      className="flex items-center gap-2 px-3 py-2 rounded-lg border"
                      style={{ background: 'rgba(20,20,32,0.4)', borderColor: 'rgba(16,185,129,0.20)' }}>
                      <span className="font-mono text-[12.5px] text-emerald-200 flex-1 truncate" title={f.name}>{f.name}</span>
                      <button
                        onClick={async () => {
                          setAiLoading(true); setAiAdvice('')
                          try {
                            const r = await fetch('/api/ai/ask-chief', {
                              method: 'POST', headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                question: `Should I use the Coach Dave setup "${f.name}" for this session at ${session.track_name} in the ${session.car_name}? My best lap is ${session.best_lap_time ? session.best_lap_time.toFixed(3) : 'unknown'}s. Pull the actual parameters from this setup file if you have them parsed, compare to what I should be running here, and give me 3 specific changes to try.`,
                                car: session.car_name, track: session.track_name,
                              }),
                            })
                            const j = await r.json()
                            setAiAdvice(j.answer || j.hint || j.error || 'No answer')
                          } finally { setAiLoading(false) }
                        }}
                        disabled={aiLoading}
                        className="px-2.5 py-1 rounded text-[11px] font-bold disabled:opacity-40"
                        style={{ background: '#10b981', color: 'white' }}>
                        Analyze
                      </button>
                    </div>
                  ))}
                </div>
                <div className="mt-3">
                  <Link href="/dashboard/setups" className="text-xs text-emerald-300 hover:underline">
                    → View full Setup Library (search, filter, download)
                  </Link>
                </div>
              </>
            )
          })()}
        </Section>
      )}

      {/* Motion — show summary count + AI button, not raw filenames */}
      {motion && (
        <Section title={`Motion Rig — ${motion[0]}`} icon={Wind} accent="#a855f7" open={open.motion} onToggle={() => toggle('motion')}>
          <div className="text-sm text-slate-300 mb-3">
            CHIEF detected <span className="text-purple-300 font-bold">{motion[1].profiles?.length || 0}</span> motion profile files on your rig.
          </div>
          <button
            onClick={async () => {
              setAiLoading(true); setAiAdvice('')
              try {
                const r = await fetch('/api/ai/ask-chief', {
                  method: 'POST', headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    question: `I'm running a ${motion[0]} motion rig. For this car (${session.car_name}) at ${session.track_name}, what motion profile settings should I dial in? Specifically gain, damping, intensity, low-speed bumps. Give me starting values and what to adjust if it feels off.`,
                    car: session.car_name, track: session.track_name,
                  }),
                })
                const j = await r.json()
                setAiAdvice(j.answer || j.hint || j.error || 'No answer')
              } finally { setAiLoading(false) }
            }}
            disabled={aiLoading}
            className="px-3 py-1.5 rounded text-xs font-bold disabled:opacity-40 flex items-center gap-1.5"
            style={{ background: '#a855f7', color: 'white' }}>
            <Sparkles size={12} /> Recommend motion settings for this car/track
          </button>
          <div className="mt-3 text-[11px] text-slate-500">
            CHIEF reads each motion profile JSON during capture. To see actual values per session, take a screenshot of your motion control panel during racing — Chief Vision will parse it automatically.
          </div>
        </Section>
      )}

      {/* Weather */}
      {session.weather_json && (
        <Section title="Weather Conditions" icon={Wind} accent="#f5c518" open={open.weather} onToggle={() => toggle('weather')}>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-sm">
            <KV label="Track Temp">{session.weather_json.track_temp_f}°F</KV>
            <KV label="Skies">{session.weather_json.skies}</KV>
            <KV label="Humidity">{session.weather_json.humidity}%</KV>
            <KV label="Wind">{session.weather_json.wind_mph} mph</KV>
          </div>
        </Section>
      )}

      <div className="flex items-center gap-1.5 text-[11px] text-slate-600 mt-6"><Lock size={11}/> Private to your account</div>
    </div>
  )
}

function Section({ title, icon: Icon, accent, open, onToggle, children }: any) {
  return (
    <div className="rounded-xl border mb-3 overflow-hidden" style={{ background: 'rgba(20,20,32,0.5)', borderColor: 'rgba(255,255,255,0.06)' }}>
      <button onClick={onToggle} className="w-full flex items-center gap-3 px-5 py-4 hover:bg-white/5 transition-all">
        <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: accent + '20' }}>
          <Icon size={15} style={{ color: accent }} />
        </div>
        <div className="flex-1 text-left text-white font-bold">{title}</div>
        {open ? <ChevronDown size={16} className="text-slate-500" /> : <ChevronRight size={16} className="text-slate-500" />}
      </button>
      {open && <div className="px-5 pb-4 pt-0">{children}</div>}
    </div>
  )
}

function KV({ label, children }: any) {
  return (
    <div className="py-1.5 flex items-baseline gap-3">
      <div className="text-[11px] uppercase tracking-wider text-slate-500 min-w-[160px]">{label}</div>
      <div className="text-sm text-white font-mono">{children}</div>
    </div>
  )
}
