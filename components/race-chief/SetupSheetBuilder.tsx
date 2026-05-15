'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CAR_TEMPLATES, CarType } from '@/lib/setup-templates'
import AskChiefModal from '@/components/shared/AskChiefModal'
import { Save, Brain, ChevronDown, ChevronUp, Loader2, CheckCircle } from 'lucide-react'

interface Props {
  setupId?: string
}

const CAR_TYPE_OPTIONS: { value: CarType; label: string }[] = [
  { value: 'dirt_late_model', label: 'Dirt Late Model' },
  { value: 'pavement_late_model', label: 'Pavement Late Model' },
  { value: 'wing_sprint', label: 'Wing Sprint Car' },
  { value: 'non_wing_sprint', label: 'Non-Wing Sprint Car' },
  { value: 'wing_micro', label: 'Wing Micro Sprint' },
  { value: 'non_wing_micro', label: 'Non-Wing Micro Sprint' },
  { value: 'dirt_modified', label: 'Dirt Modified' },
  { value: 'street_stock', label: 'Street Stock / IMCA' },
]

export default function SetupSheetBuilder({ setupId }: Props) {
  const router = useRouter()
  const supabase = createClient()

  const [carType, setCarType] = useState<CarType>('dirt_late_model')
  const [formData, setFormData] = useState<Record<string, any>>({})
  const [meta, setMeta] = useState({
    name: '',
    event_date: new Date().toISOString().split('T')[0],
    driver_feel_before: '',
    driver_feel_after: '',
    notes: '',
    is_baseline: false,
  })
  const [cars, setCars] = useState<any[]>([])
  const [tracks, setTracks] = useState<any[]>([])
  const [selectedCar, setSelectedCar] = useState('')
  const [selectedTrack, setSelectedTrack] = useState('')
  const [conditions, setConditions] = useState({ temp_f: '', humidity: '', track_condition: '' })
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set())
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [askChiefOpen, setAskChiefOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    const fetchData = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const [{ data: carsData }, { data: tracksData }] = await Promise.all([
        supabase.from('cars').select('*').eq('user_id', user.id).eq('active', true),
        supabase.from('tracks').select('*').or(`is_global.eq.true,created_by.eq.${user.id}`).order('name'),
      ])
      setCars(carsData || [])
      setTracks(tracksData || [])

      if (setupId) {
        const { data: existing } = await supabase.from('setup_sheets').select('*').eq('id', setupId).single()
        if (existing) {
          setCarType(existing.car_type as CarType)
          setMeta({ name: existing.name, event_date: existing.event_date, driver_feel_before: existing.driver_feel_before || '', driver_feel_after: existing.driver_feel_after || '', notes: existing.notes || '', is_baseline: existing.is_baseline })
          setSelectedCar(existing.car_id || '')
          setSelectedTrack(existing.track_id || '')
          setConditions(existing.conditions || {})
          setFormData(existing)
        }
      }
    }
    fetchData()
  }, [setupId])

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const payload = {
      ...formData,
      user_id: user.id,
      car_type: carType,
      car_id: selectedCar || null,
      track_id: selectedTrack || null,
      name: meta.name || `${CAR_TEMPLATES[carType].label} â€” ${new Date().toLocaleDateString()}`,
      event_date: meta.event_date,
      driver_feel_before: meta.driver_feel_before,
      driver_feel_after: meta.driver_feel_after,
      notes: meta.notes,
      is_baseline: meta.is_baseline,
      conditions,
      updated_at: new Date().toISOString(),
    }

    if (setupId) {
      await supabase.from('setup_sheets').update(payload).eq('id', setupId)
    } else {
      const { data } = await supabase.from('setup_sheets').insert(payload).select().single()
      if (data) router.replace(`/dashboard/race-chief/setup/${data.id}`)
    }

    setSaving(false)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const template = CAR_TEMPLATES[carType]

  const toggleSection = (title: string) => {
    setCollapsedSections(prev => {
      const next = new Set(prev)
      next.has(title) ? next.delete(title) : next.add(title)
      return next
    })
  }

  const handleField = (key: string, value: any) => {
    setFormData(prev => ({ ...prev, [key]: value }))
  }

  const chiefContext = {
    carType: CAR_TEMPLATES[carType].label,
    trackName: tracks.find(t => t.id === selectedTrack)?.name,
    carName: cars.find(c => c.id === selectedCar)?.name,
    setupData: formData,
    conditions,
    driverFeelBefore: meta.driver_feel_before,
    mode: 'race_chief',
    setupId,
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-20 animate-in">
      {/* Header */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex-1">
          <input
            className="chief-input text-lg font-display tracking-wide bg-transparent border-0 border-b border-[#2a2a2a] rounded-none px-0 focus:border-[#f5c518] mb-2"
            placeholder="Setup name (e.g. Eldora Hot Laps Baseline)"
            value={meta.name}
            onChange={e => setMeta({ ...meta, name: e.target.value })}
          />
          <div className="flex flex-wrap gap-3">
            <input type="date" className="chief-input w-auto text-sm"
              value={meta.event_date} onChange={e => setMeta({ ...meta, event_date: e.target.value })} />
            <select className="chief-select w-auto text-sm" value={selectedCar} onChange={e => setSelectedCar(e.target.value)}>
              <option value="">Select Car...</option>
              {cars.map(c => <option key={c.id} value={c.id}>{c.name} #{c.number}</option>)}
            </select>
            <select className="chief-select w-auto text-sm" value={selectedTrack} onChange={e => setSelectedTrack(e.target.value)}>
              <option value="">Select Track...</option>
              {tracks.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => setAskChiefOpen(true)}
            className="flex items-center gap-2 bg-[#f5c51811] border border-[#f5c51833] text-[#f5c518] px-4 py-2 rounded font-display text-sm tracking-widest hover:bg-[#f5c51822] transition-colors">
            <Brain size={15} />
            ASK CHIEF
          </button>
          <button onClick={handleSave} disabled={saving}
            className="btn-chief !text-sm !py-2 !px-5">
            {saving ? <Loader2 size={15} className="animate-spin" /> : saved ? <CheckCircle size={15} /> : <Save size={15} />}
            {saved ? 'SAVED' : 'SAVE'}
          </button>
        </div>
      </div>

      {/* Car type selector */}
      <div className="chief-panel p-4 rounded-lg">
        <label className="chief-label mb-2">CAR TYPE</label>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {CAR_TYPE_OPTIONS.map(opt => (
            <button key={opt.value} onClick={() => setCarType(opt.value)}
              className={`px-3 py-2 rounded text-sm font-body transition-all text-left ${
                carType === opt.value ? 'bg-[#f5c518] text-black' : 'bg-[#0d0d0d] border border-[#222] text-[#888] hover:border-[#333] hover:text-white'
              }`}>
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Conditions */}
      <div className="chief-panel p-4 rounded-lg">
        <div className="font-display text-xs text-[#888] tracking-widest mb-3">CONDITIONS</div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="chief-label">TEMP (Â°F)</label>
            <input className="chief-input" type="number" placeholder="52" 
              value={conditions.temp_f} onChange={e => setConditions({ ...conditions, temp_f: e.target.value })} />
          </div>
          <div>
            <label className="chief-label">HUMIDITY (%)</label>
            <input className="chief-input" type="number" placeholder="65"
              value={conditions.humidity} onChange={e => setConditions({ ...conditions, humidity: e.target.value })} />
          </div>
          <div>
            <label className="chief-label">TRACK CONDITION</label>
            <select className="chief-select"
              value={conditions.track_condition} onChange={e => setConditions({ ...conditions, track_condition: e.target.value })}>
              <option value="">Select...</option>
              <option>Tacky</option><option>Slick</option><option>Wet-Slick</option>
              <option>Heavy</option><option>Dry-Slick</option><option>Cushion</option>
              <option>Grooved</option><option>Bone Dry</option><option>Sealed</option>
            </select>
          </div>
        </div>
      </div>

      {/* Driver feel before */}
      <div className="chief-panel p-4 rounded-lg">
        <label className="chief-label mb-2">DRIVER FEEL â€” BEFORE CHANGES</label>
        <textarea className="chief-input resize-none h-20 text-sm"
          placeholder="Describe how the car feels (loose in, tight center, loose off, etc.)"
          value={meta.driver_feel_before}
          onChange={e => setMeta({ ...meta, driver_feel_before: e.target.value })} />
      </div>

      {/* Dynamic sections from template */}
      {template.sections.map(section => (
        <div key={section.title} className="chief-panel rounded-lg overflow-hidden">
          <button onClick={() => toggleSection(section.title)}
            className="w-full flex items-center justify-between p-4 hover:bg-[#161616] transition-colors">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full" style={{ background: section.color }} />
              <span className="font-display text-sm tracking-widest" style={{ color: section.color }}>{section.title}</span>
            </div>
            {collapsedSections.has(section.title) 
              ? <ChevronDown size={14} className="text-[#555]" /> 
              : <ChevronUp size={14} className="text-[#555]" />}
          </button>
          {!collapsedSections.has(section.title) && (
            <div className="px-4 pb-4 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 border-t border-[#1a1a1a] pt-4">
              {section.fields.map(field => (
                <div key={field.key}>
                  <label className="chief-label">
                    {field.label}{field.unit && <span className="text-[#444] ml-1">({field.unit})</span>}
                  </label>
                  {field.type === 'select' ? (
                    <select className="chief-select text-sm"
                      value={formData[field.key] || ''}
                      onChange={e => handleField(field.key, e.target.value)}>
                      <option value="">Select...</option>
                      {field.options?.map(o => <option key={o}>{o}</option>)}
                    </select>
                  ) : (
                    <input
                      type={field.type}
                      className="chief-input text-sm font-mono"
                      placeholder={(field as any).placeholder || 'â€”'}
                      step={field.step}
                      value={formData[field.key] || ''}
                      onChange={e => handleField(field.key, e.target.type === 'number' ? parseFloat(e.target.value) || '' : e.target.value)}
                    />
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      ))}

      {/* Driver feel after */}
      <div className="chief-panel p-4 rounded-lg">
        <label className="chief-label mb-2">DRIVER FEEL â€” AFTER CHANGES</label>
        <textarea className="chief-input resize-none h-20 text-sm"
          placeholder="How did the car respond? Did it improve?"
          value={meta.driver_feel_after}
          onChange={e => setMeta({ ...meta, driver_feel_after: e.target.value })} />
      </div>

      {/* Notes + baseline */}
      <div className="chief-panel p-4 rounded-lg">
        <label className="chief-label mb-2">CREW NOTES</label>
        <textarea className="chief-input resize-none h-24 text-sm mb-3"
          placeholder="Anything else worth noting for Chief to remember..."
          value={meta.notes}
          onChange={e => setMeta({ ...meta, notes: e.target.value })} />
        <label className="flex items-center gap-2 cursor-pointer">
          <input type="checkbox" checked={meta.is_baseline} onChange={e => setMeta({ ...meta, is_baseline: e.target.checked })} />
          <span className="text-sm text-[#888]">Mark as baseline setup</span>
        </label>
      </div>

      {/* Chief recommendation display */}
      {formData.chief_recommendation && (
        <div className="bg-[#f5c51808] border border-[#f5c51833] rounded-lg p-4">
          <div className="flex items-center gap-2 mb-2">
            <Brain size={14} className="text-[#f5c518]" />
            <span className="font-display text-sm text-[#f5c518] tracking-widest">CHIEF RECOMMENDATION</span>
          </div>
          <p className="text-sm text-[#ccc] leading-relaxed">{formData.chief_recommendation}</p>
        </div>
      )}

      {/* Bottom save bar */}
      <div className="fixed bottom-0 left-64 right-0 bg-[#0d0d0d]/95 backdrop-blur border-t border-[#1a1a1a] p-4 flex justify-between items-center z-20">
        <button onClick={() => router.push('/dashboard/race-chief/setup')} className="btn-ghost">
          â† Back to Setups
        </button>
        <div className="flex items-center gap-3">
          <button onClick={() => setAskChiefOpen(true)}
            className="flex items-center gap-2 bg-[#f5c51811] border border-[#f5c51833] text-[#f5c518] px-4 py-2 rounded font-display text-sm tracking-widest hover:bg-[#f5c51822] transition-colors">
            <Brain size={14} />
            ASK CHIEF
          </button>
          <button onClick={handleSave} disabled={saving} className="btn-chief">
            {saving ? <Loader2 size={16} className="animate-spin" /> : saved ? <CheckCircle size={16} /> : <Save size={16} />}
            {saved ? 'SAVED!' : 'SAVE SETUP'}
          </button>
        </div>
      </div>

      <AskChiefModal
        isOpen={askChiefOpen}
        onClose={() => setAskChiefOpen(false)}
        context={chiefContext}
        onRecommendation={(rec) => setFormData(prev => ({ ...prev, chief_recommendation: rec }))}
      />
    </div>
  )
}
