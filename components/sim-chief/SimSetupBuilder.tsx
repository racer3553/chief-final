'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import AskChiefModal from '@/components/shared/AskChiefModal'
import { Save, Brain, ChevronDown, ChevronUp, Loader2, CheckCircle, Upload, Gamepad2 } from 'lucide-react'
import { useDropzone } from 'react-dropzone'

interface Props { setupId?: string }

const SIM_PLATFORMS = [
  { value: 'iracing', label: 'iRacing' },
  { value: 'dirt_iracing', label: 'iRacing Dirt' },
  { value: 'assetto_corsa', label: 'Assetto Corsa' },
  { value: 'rf2', label: 'rFactor 2' },
  { value: 'ams2', label: 'Automobilista 2' },
  { value: 'gt7', label: 'Gran Turismo 7' },
  { value: 'f1_game', label: 'F1 Game' },
  { value: 'other', label: 'Other' },
]

const HANDLING_OPTIONS = [
  { value: 'very_loose', label: 'Very Loose' },
  { value: 'loose', label: 'Loose' },
  { value: 'neutral', label: 'Neutral' },
  { value: 'tight', label: 'Tight' },
  { value: 'very_tight', label: 'Very Tight' },
]

const HANDLING_POSITION: Record<string, number> = {
  very_loose: 0, loose: 25, neutral: 50, tight: 75, very_tight: 100
}
const HANDLING_COLORS: Record<string, string> = {
  very_loose: '#39ff14', loose: '#a0ff50', neutral: '#00e5ff', tight: '#f5c518', very_tight: '#ff2d2d'
}

export default function SimSetupBuilder({ setupId }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const [form, setForm] = useState<Record<string, any>>({
    name: '', sim_platform: 'iracing', car_class: '', session_type: 'practice',
    ffb_overall: '', ffb_damping: '', ffb_smoothing: '', ffb_intensity: '', ffb_min_force: '',
    steering_ratio: '', steering_lock: '',
    lf_spring_rate: '', rf_spring_rate: '', lr_spring_rate: '', rr_spring_rate: '',
    lf_bump: '', rf_bump: '', lr_bump: '', rr_bump: '',
    lf_rebound: '', rf_rebound: '', lr_rebound: '', rr_rebound: '',
    front_arb: '', rear_arb: '',
    lf_camber: '', rf_camber: '', lr_camber: '', rr_camber: '',
    front_toe: '', rear_toe: '', front_caster: '',
    lf_psi: '', rf_psi: '', lr_psi: '', rr_psi: '', tire_compound: '',
    brake_bias: '', brake_pressure: '', fuel_load: '',
    stagger_front: '', stagger_rear: '', bite_lr: '', bite_rr: '',
    front_downforce: '', rear_downforce: '', ride_height_f: '', ride_height_r: '',
    best_lap_time: '', finish_position: '', irating_change: '', incidents: '',
    driver_feel: '', loose_tight_entry: 'neutral', loose_tight_center: 'neutral', loose_tight_exit: 'neutral',
    notes: '', is_baseline: false,
  })
  const [cars, setCars] = useState<any[]>([])
  const [tracks, setTracks] = useState<any[]>([])
  const [selectedCar, setSelectedCar] = useState('')
  const [selectedTrack, setSelectedTrack] = useState('')
  const [collapsed, setCollapsed] = useState<Set<string>>(new Set(['FFB & HARDWARE']))
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [askChiefOpen, setAskChiefOpen] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [analyzingImage, setAnalyzingImage] = useState(false)

  useEffect(() => {
    const init = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const [{ data: carsData }, { data: tracksData }] = await Promise.all([
        supabase.from('cars').select('*').eq('user_id', user.id).eq('is_sim', true),
        supabase.from('tracks').select('*').or(`is_global.eq.true,created_by.eq.${user.id}`).order('name'),
      ])
      setCars(carsData || [])
      setTracks(tracksData || [])

      if (setupId) {
        const { data: existing } = await supabase.from('sim_setups').select('*').eq('id', setupId).single()
        if (existing) {
          setForm(existing)
          setSelectedCar(existing.car_id || '')
          setSelectedTrack(existing.track_id || '')
          if (existing.screenshot_urls) setUploadedImages(existing.screenshot_urls)
        }
      }
    }
    init()
  }, [setupId])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] },
    maxFiles: 1,
    onDrop: async (files) => {
      if (!files[0]) return
      setAnalyzingImage(true)
      const fd = new FormData()
      fd.append('image', files[0])
      fd.append('context', JSON.stringify({
        mode: 'sim_chief', carName: cars.find(c => c.id === selectedCar)?.name,
        trackName: tracks.find(t => t.id === selectedTrack)?.name,
        setupData: form, simPlatform: form.sim_platform,
      }))
      const res = await fetch('/api/ai/analyze-image', { method: 'POST', body: fd })
      const { analysis, url } = await res.json()
      if (url) setUploadedImages(prev => [...prev, url])
      if (analysis) setForm((prev: any) => ({ ...prev, chief_recommendation: analysis }))
      setAnalyzingImage(false)
    },
  })

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      ...form, user_id: user.id,
      car_id: selectedCar || null, track_id: selectedTrack || null,
      screenshot_urls: uploadedImages,
      name: form.name || `${form.sim_platform} — ${new Date().toLocaleDateString()}`,
      updated_at: new Date().toISOString(),
    }

    if (setupId) {
      await supabase.from('sim_setups').update(payload).eq('id', setupId)
    } else {
      const { data } = await supabase.from('sim_setups').insert(payload).select().single()
      if (data) router.replace(`/dashboard/sim-chief/setup/${data.id}`)
    }
    setSaving(false); setSaved(true); setTimeout(() => setSaved(false), 2000)
  }

  const Field = ({ label, k, unit = '', type = 'number', step = 1 }: any) => (
    <div>
      <label className="chief-label">{label}{unit && <span className="text-[#444] ml-1">({unit})</span>}</label>
      <input type={type} step={step} className="chief-input text-sm font-mono"
        value={form[k] || ''} onChange={e => setForm((p: any) => ({ ...p, [k]: e.target.value }))} />
    </div>
  )

  const Section = ({ title, children }: { title: string; children: React.ReactNode }) => (
    <div className="chief-panel rounded-lg overflow-hidden">
      <button onClick={() => setCollapsed(prev => { const n = new Set(prev); n.has(title) ? n.delete(title) : n.add(title); return n })}
        className="w-full flex items-center justify-between p-4 hover:bg-[#161616] transition-colors">
        <span className="font-display text-sm text-[#00e5ff] tracking-widest">{title}</span>
        {collapsed.has(title) ? <ChevronDown size={14} className="text-[#555]" /> : <ChevronUp size={14} className="text-[#555]" />}
      </button>
      {!collapsed.has(title) && (
        <div className="px-4 pb-4 pt-0 border-t border-[#1a1a1a]">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-4">{children}</div>
        </div>
      )}
    </div>
  )

  const isDirt = form.sim_platform === 'dirt_iracing'
  const chiefCtx = {
    mode: 'sim_chief', simPlatform: form.sim_platform,
    carName: cars.find(c => c.id === selectedCar)?.name,
    trackName: tracks.find(t => t.id === selectedTrack)?.name,
    looseEntry: form.loose_tight_entry, looseCenter: form.loose_tight_center, looseExit: form.loose_tight_exit,
    setupData: form, bestLap: form.best_lap_time,
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-24 animate-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Gamepad2 size={20} className="text-[#00e5ff]" />
          <input className="chief-input text-lg font-display tracking-wide bg-transparent border-0 border-b border-[#2a2a2a] rounded-none px-0 focus:border-[#00e5ff]"
            placeholder="Setup name (e.g. iRacing Eldora Sprint — Baseline)"
            value={form.name} onChange={e => setForm((p: any) => ({ ...p, name: e.target.value }))} />
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setAskChiefOpen(true)}
            className="flex items-center gap-2 bg-[#00e5ff11] border border-[#00e5ff33] text-[#00e5ff] px-4 py-2 rounded font-display text-sm tracking-widest hover:bg-[#00e5ff22] transition-colors">
            <Brain size={15} /> ASK CHIEF
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-chief !text-sm !py-2 !px-5">
            {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <CheckCircle size={15} /> : <Save size={15} />}
            {saved ? 'SAVED' : 'SAVE'}
          </button>
        </div>
      </div>

      {/* Meta */}
      <div className="chief-panel p-4 rounded-lg grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div>
          <label className="chief-label">PLATFORM</label>
          <select className="chief-select" value={form.sim_platform} onChange={e => setForm((p: any) => ({ ...p, sim_platform: e.target.value }))}>
            {SIM_PLATFORMS.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>
        </div>
        <div>
          <label className="chief-label">CAR</label>
          <select className="chief-select" value={selectedCar} onChange={e => setSelectedCar(e.target.value)}>
            <option value="">Select...</option>
            {cars.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </div>
        <div>
          <label className="chief-label">TRACK</label>
          <select className="chief-select" value={selectedTrack} onChange={e => setSelectedTrack(e.target.value)}>
            <option value="">Select...</option>
            {tracks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
          </select>
        </div>
        <div>
          <label className="chief-label">SESSION</label>
          <select className="chief-select" value={form.session_type} onChange={e => setForm((p: any) => ({ ...p, session_type: e.target.value }))}>
            <option value="practice">Practice</option>
            <option value="qualifying">Qualifying</option>
            <option value="race">Race</option>
            <option value="test">Test</option>
          </select>
        </div>
      </div>

      {/* Handling feel */}
      <div className="chief-panel p-4 rounded-lg">
        <div className="font-display text-sm text-[#00e5ff] tracking-widest mb-4">DRIVER FEEL</div>
        <div className="grid sm:grid-cols-3 gap-6 mb-4">
          {(['entry', 'center', 'exit'] as const).map(phase => {
            const key = `loose_tight_${phase}` as const
            const val = form[key] || 'neutral'
            const pos = HANDLING_POSITION[val]
            const color = HANDLING_COLORS[val]
            return (
              <div key={phase}>
                <div className="flex justify-between mb-2">
                  <span className="chief-label">{phase.toUpperCase()}</span>
                  <span className="font-mono text-xs" style={{ color }}>{val.replace('_', ' ').toUpperCase()}</span>
                </div>
                <div className="handling-bar mb-2">
                  <div className="handling-indicator" style={{ left: `${pos}%`, background: color }} />
                </div>
                <div className="flex justify-between text-[9px] font-mono text-[#444] mb-2">
                  <span>LOOSE</span><span>NEUTRAL</span><span>TIGHT</span>
                </div>
                <select className="chief-select text-xs"
                  value={val} onChange={e => setForm((p: any) => ({ ...p, [key]: e.target.value }))}>
                  {HANDLING_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
              </div>
            )
          })}
        </div>
        <textarea className="chief-input resize-none h-16 text-sm"
          placeholder="Driver feel notes (e.g. 'car snaps loose on entry, tight through center, balance is good on exit')"
          value={form.driver_feel} onChange={e => setForm((p: any) => ({ ...p, driver_feel: e.target.value }))} />
      </div>

      {/* FFB */}
      <Section title="FFB & HARDWARE">
        <Field label="Overall Force" k="ffb_overall" unit="%" step={0.5} />
        <Field label="Damping" k="ffb_damping" unit="%" step={0.5} />
        <Field label="Smoothing" k="ffb_smoothing" unit="%" step={0.5} />
        <Field label="Min Force" k="ffb_min_force" unit="%" step={0.5} />
        <Field label="Intensity" k="ffb_intensity" unit="%" step={0.5} />
        <Field label="Steering Ratio" k="steering_ratio" step={0.5} />
        <Field label="Steering Lock" k="steering_lock" unit="°" step={1} />
      </Section>

      {/* Dirt-specific or standard aero */}
      {isDirt ? (
        <Section title="DIRT SETUP">
          <Field label="Front Stagger" k="stagger_front" unit="&quot;" step={0.125} />
          <Field label="Rear Stagger" k="stagger_rear" unit="&quot;" step={0.125} />
          <Field label="LR Bite" k="bite_lr" unit="lbs" />
          <Field label="RR Bite" k="bite_rr" unit="lbs" />
          <Field label="LF Psi" k="lf_psi" unit="psi" step={0.5} />
          <Field label="RF Psi" k="rf_psi" unit="psi" step={0.5} />
          <Field label="LR Psi" k="lr_psi" unit="psi" step={0.5} />
          <Field label="RR Psi" k="rr_psi" unit="psi" step={0.5} />
        </Section>
      ) : (
        <Section title="AERO & RIDE HEIGHT">
          <Field label="Front Downforce" k="front_downforce" />
          <Field label="Rear Downforce" k="rear_downforce" />
          <Field label="Ride Height F" k="ride_height_f" unit="mm" step={0.5} />
          <Field label="Ride Height R" k="ride_height_r" unit="mm" step={0.5} />
          <Field label="LF Psi" k="lf_psi" unit="psi" step={0.5} />
          <Field label="RF Psi" k="rf_psi" unit="psi" step={0.5} />
          <Field label="LR Psi" k="lr_psi" unit="psi" step={0.5} />
          <Field label="RR Psi" k="rr_psi" unit="psi" step={0.5} />
          <div>
            <label className="chief-label">COMPOUND</label>
            <input className="chief-input text-sm" value={form.tire_compound || ''} onChange={e => setForm((p: any) => ({ ...p, tire_compound: e.target.value }))} />
          </div>
        </Section>
      )}

      <Section title="SUSPENSION">
        <Field label="LF Spring" k="lf_spring_rate" unit="N/mm" step={0.5} />
        <Field label="RF Spring" k="rf_spring_rate" unit="N/mm" step={0.5} />
        <Field label="LR Spring" k="lr_spring_rate" unit="N/mm" step={0.5} />
        <Field label="RR Spring" k="rr_spring_rate" unit="N/mm" step={0.5} />
        <Field label="LF Bump" k="lf_bump" />
        <Field label="RF Bump" k="rf_bump" />
        <Field label="LR Bump" k="lr_bump" />
        <Field label="RR Bump" k="rr_bump" />
        <Field label="LF Rebound" k="lf_rebound" />
        <Field label="RF Rebound" k="rf_rebound" />
        <Field label="LR Rebound" k="lr_rebound" />
        <Field label="RR Rebound" k="rr_rebound" />
        <Field label="Front ARB" k="front_arb" />
        <Field label="Rear ARB" k="rear_arb" />
      </Section>

      <Section title="ALIGNMENT">
        <Field label="LF Camber" k="lf_camber" unit="°" step={0.1} />
        <Field label="RF Camber" k="rf_camber" unit="°" step={0.1} />
        <Field label="LR Camber" k="lr_camber" unit="°" step={0.1} />
        <Field label="RR Camber" k="rr_camber" unit="°" step={0.1} />
        <Field label="Front Toe" k="front_toe" unit="°" step={0.01} />
        <Field label="Rear Toe" k="rear_toe" unit="°" step={0.01} />
        <Field label="Front Caster" k="front_caster" unit="°" step={0.25} />
        <Field label="Brake Bias" k="brake_bias" unit="%" step={0.5} />
        <Field label="Fuel Load" k="fuel_load" unit="L" step={1} />
      </Section>

      <Section title="SESSION RESULTS">
        <Field label="Best Lap Time" k="best_lap_time" unit="s" step={0.001} />
        <Field label="Finish Position" k="finish_position" />
        <Field label="iRating Change" k="irating_change" />
        <Field label="Incidents" k="incidents" />
      </Section>

      {/* Screenshot upload */}
      <div className="chief-panel p-4 rounded-lg">
        <div className="font-display text-sm text-[#00e5ff] tracking-widest mb-3">SCREENSHOT ANALYSIS</div>
        <div {...getRootProps()} className={`border-2 border-dashed rounded p-6 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-[#00e5ff] bg-[#00e5ff11]' : 'border-[#222] hover:border-[#333]'
        }`}>
          <input {...getInputProps()} />
          {analyzingImage ? (
            <div className="flex items-center justify-center gap-2 text-[#00e5ff]">
              <Loader2 size={16} className="animate-spin" />
              <span className="font-mono text-sm">Chief is analyzing...</span>
            </div>
          ) : (
            <>
              <Upload size={20} className="text-[#555] mx-auto mb-2" />
              <p className="text-[#555] text-sm">Drop your sim setup screenshot here</p>
              <p className="text-[#444] text-xs mt-1">Chief will read the values and make recommendations</p>
            </>
          )}
        </div>
        {uploadedImages.length > 0 && (
          <div className="flex gap-2 mt-3">
            {uploadedImages.map((url, i) => (
              <img key={i} src={url} alt="Setup screenshot" className="h-16 w-24 object-cover rounded border border-[#222]" />
            ))}
          </div>
        )}
      </div>

      {/* Notes */}
      <div className="chief-panel p-4 rounded-lg">
        <label className="chief-label mb-2">NOTES</label>
        <textarea className="chief-input resize-none h-20 text-sm"
          placeholder="Anything else to remember..."
          value={form.notes} onChange={e => setForm((p: any) => ({ ...p, notes: e.target.value }))} />
        <label className="flex items-center gap-2 mt-3 cursor-pointer">
          <input type="checkbox" checked={form.is_baseline || false} onChange={e => setForm((p: any) => ({ ...p, is_baseline: e.target.checked }))} />
          <span className="text-sm text-[#888]">Mark as baseline setup</span>
        </label>
      </div>

      {/* Chief recommendation */}
      {form.chief_recommendation && (
        <div className="bg-[#00e5ff08] border border-[#00e5ff33] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Brain size={14} className="text-[#00e5ff]" />
            <span className="font-display text-sm text-[#00e5ff] tracking-widest">CHIEF RECOMMENDATION</span>
          </div>
          <p className="text-sm text-[#ccc] leading-relaxed whitespace-pre-line">{form.chief_recommendation}</p>
        </div>
      )}

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-64 right-0 bg-[#0d0d0d]/95 backdrop-blur border-t border-[#1a1a1a] p-4 flex justify-between items-center z-20">
        <button onClick={() => router.push('/dashboard/sim-chief/setup')} className="btn-ghost">← Back</button>
        <div className="flex items-center gap-3">
          <button onClick={() => setAskChiefOpen(true)}
            className="flex items-center gap-2 bg-[#00e5ff11] border border-[#00e5ff33] text-[#00e5ff] px-4 py-2 rounded font-display text-sm tracking-widest hover:bg-[#00e5ff22] transition-colors">
            <Brain size={14} /> ASK CHIEF
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-chief">
            {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <CheckCircle size={16} /> : <Save size={16} />}
            {saved ? 'SAVED!' : 'SAVE SETUP'}
          </button>
        </div>
      </div>

      <AskChiefModal isOpen={askChiefOpen} onClose={() => setAskChiefOpen(false)} context={chiefCtx}
        onRecommendation={rec => setForm((p: any) => ({ ...p, chief_recommendation: rec }))} />
    </div>
  )
}
