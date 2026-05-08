'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { MapPin, Plus, Search, X, Save, Loader2 } from 'lucide-react'

interface Track {
  id: string
  name: string
  location: string
  state: string
  surface: string
  type: string
  length_miles: number
  is_global: boolean
}

export default function TracksPage() {
  const supabase = createClient()
  const [tracks, setTracks] = useState<Track[]>([])
  const [search, setSearch] = useState('')
  const [surfaceFilter, setSurfaceFilter] = useState<'all' | 'dirt' | 'pavement'>('all')
  const [showModal, setShowModal] = useState(false)
  const [saving, setSaving] = useState(false)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({
    name: '', location: '', state: '', surface: 'dirt',
    type: 'oval', length_miles: '', banking_degrees: '', notes: '',
  })

  useEffect(() => { fetchTracks() }, [])

  const fetchTracks = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase
      .from('tracks')
      .select('*')
      .or(`is_global.eq.true,created_by.eq.${user?.id}`)
      .order('name')
    setTracks(data || [])
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    await supabase.from('tracks').insert({
      ...form,
      length_miles: form.length_miles ? parseFloat(form.length_miles) : null,
      is_global: false,
      created_by: user?.id,
    })
    setSaving(false)
    setShowModal(false)
    setForm({ name: '', location: '', state: '', surface: 'dirt', type: 'oval', length_miles: '', banking_degrees: '', notes: '' })
    fetchTracks()
  }

  const filtered = tracks.filter(t => {
    const matchSearch = t.name.toLowerCase().includes(search.toLowerCase()) ||
      t.location?.toLowerCase().includes(search.toLowerCase()) ||
      t.state?.toLowerCase().includes(search.toLowerCase())
    const matchSurface = surfaceFilter === 'all' || t.surface === surfaceFilter
    return matchSearch && matchSurface
  })

  const SURFACE_COLORS: Record<string, string> = { dirt: '#f5c518', pavement: '#00e5ff', both: '#39ff14' }

  return (
    <div className="space-y-5 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-white tracking-wide">TRACK DATABASE</h1>
          <p className="text-[#888] text-sm mt-1">{tracks.length} tracks available</p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-chief">
          <Plus size={16} /> ADD TRACK
        </button>
      </div>

      {/* Filters */}
      <div className="flex gap-3 items-center">
        <div className="relative flex-1 max-w-sm">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
          <input className="chief-input pl-8 text-sm" placeholder="Search tracks..."
            value={search} onChange={e => setSearch(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {(['all', 'dirt', 'pavement'] as const).map(s => (
            <button key={s} onClick={() => setSurfaceFilter(s)}
              className={`px-4 py-1.5 rounded text-sm font-display tracking-wide transition-all ${
                surfaceFilter === s ? 'bg-[#f5c518] text-black' : 'bg-[#111] border border-[#222] text-[#888] hover:text-white'
              }`}>
              {s.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Tracks grid */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-[#555]" /></div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {filtered.map(track => (
            <div key={track.id} className="chief-panel rounded-lg p-4 hover:border-[#2a2a2a] transition-colors">
              <div className="flex items-start justify-between mb-2">
                <div className="font-display text-sm text-white tracking-wide leading-tight">{track.name}</div>
                {!track.is_global && (
                  <span className="badge-yellow text-[9px] ml-2 shrink-0">CUSTOM</span>
                )}
              </div>
              <div className="font-mono text-xs text-[#555] mb-3">
                {[track.location, track.state].filter(Boolean).join(', ')}
              </div>
              <div className="flex items-center gap-2 flex-wrap">
                {track.surface && (
                  <span className="font-mono text-[10px] px-1.5 py-0.5 rounded"
                    style={{ color: SURFACE_COLORS[track.surface] || '#888', background: (SURFACE_COLORS[track.surface] || '#888') + '11', border: `1px solid ${(SURFACE_COLORS[track.surface] || '#888')}33` }}>
                    {track.surface.toUpperCase()}
                  </span>
                )}
                {track.type && (
                  <span className="badge-cyan text-[10px]">{track.type.replace('_', ' ').toUpperCase()}</span>
                )}
                {track.length_miles && (
                  <span className="font-mono text-[10px] text-[#555]">{track.length_miles}mi</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {filtered.length === 0 && !loading && (
        <div className="chief-panel rounded-lg p-12 text-center">
          <MapPin size={36} className="text-[#333] mx-auto mb-3" />
          <p className="text-[#555] text-sm">No tracks found. Add your local track.</p>
        </div>
      )}

      {/* Add Track Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-[#111] border border-[#222] rounded-lg w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-[#1a1a1a]">
              <span className="font-display text-lg text-white tracking-wide">ADD TRACK</span>
              <button onClick={() => setShowModal(false)}><X size={18} className="text-[#555]" /></button>
            </div>
            <div className="p-5 space-y-3">
              <div>
                <label className="chief-label">TRACK NAME</label>
                <input className="chief-input" placeholder="e.g. Eldora Speedway"
                  value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="chief-label">LOCATION / CITY</label>
                  <input className="chief-input" placeholder="New Weston"
                    value={form.location} onChange={e => setForm({ ...form, location: e.target.value })} />
                </div>
                <div>
                  <label className="chief-label">STATE</label>
                  <input className="chief-input" placeholder="OH"
                    value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="chief-label">SURFACE</label>
                  <select className="chief-select" value={form.surface} onChange={e => setForm({ ...form, surface: e.target.value })}>
                    <option value="dirt">Dirt</option>
                    <option value="pavement">Pavement</option>
                    <option value="both">Both</option>
                  </select>
                </div>
                <div>
                  <label className="chief-label">TYPE</label>
                  <select className="chief-select" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}>
                    <option value="oval">Oval</option>
                    <option value="road_course">Road Course</option>
                    <option value="karting">Karting</option>
                    <option value="drag">Drag</option>
                  </select>
                </div>
                <div>
                  <label className="chief-label">LENGTH (mi)</label>
                  <input className="chief-input" type="number" step="0.001" placeholder="0.500"
                    value={form.length_miles} onChange={e => setForm({ ...form, length_miles: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="chief-label">NOTES</label>
                <textarea className="chief-input resize-none h-16 text-sm" placeholder="Banking, surface notes, etc."
                  value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <div className="p-5 border-t border-[#1a1a1a] flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.name} className="btn-chief">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                ADD TRACK
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
