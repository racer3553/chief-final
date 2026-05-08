'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { Plus, Wrench, AlertTriangle, CheckCircle, Clock, X, Save, Loader2 } from 'lucide-react'

const MAINTENANCE_TYPES = [
  'engine', 'transmission', 'rear_end', 'brakes', 'suspension',
  'body', 'safety', 'tires', 'fuel_system', 'electrical',
  'pre_race', 'post_race', 'inspection', 'other'
]

const PRIORITY_COLORS: Record<string, string> = {
  low: '#39ff14',
  medium: '#00e5ff',
  high: '#f5c518',
  critical: '#ff2d2d',
}

interface MaintenanceLog {
  id: string
  title: string
  maintenance_type: string
  priority: string
  status: string
  cars: { name: string; number: string } | null
  description: string
  completed_at: string | null
  created_at: string
  next_service_date: string | null
  cost: number | null
}

export default function MaintenancePage() {
  const supabase = createClient()
  const [logs, setLogs] = useState<MaintenanceLog[]>([])
  const [cars, setCars] = useState<any[]>([])
  const [showModal, setShowModal] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [filter, setFilter] = useState<'all' | 'pending' | 'done'>('pending')

  const [form, setForm] = useState({
    car_id: '', maintenance_type: 'engine', title: '', description: '',
    priority: 'medium', status: 'pending', labor_hours: '',
    cost: '', next_service_laps: '', next_service_date: '',
    completed_by: '', notes: '',
  })

  useEffect(() => {
    fetchData()
  }, [filter])

  const fetchData = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const [logsRes, carsRes] = await Promise.all([
      supabase.from('maintenance_logs')
        .select('*, cars(name, number)')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .then(({ data }) => {
          if (filter === 'all') return { data }
          return { data: (data || []).filter((l: any) => filter === 'pending' ? l.status !== 'done' : l.status === 'done') }
        }),
      supabase.from('cars').select('*').eq('user_id', user.id).eq('active', true),
    ])

    setLogs(logsRes.data || [])
    setCars(carsRes.data || [])
    setLoading(false)
  }

  const handleSave = async () => {
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    await supabase.from('maintenance_logs').insert({
      ...form,
      user_id: user.id,
      car_id: form.car_id || null,
      labor_hours: form.labor_hours ? parseFloat(form.labor_hours) : null,
      cost: form.cost ? parseFloat(form.cost) : null,
      next_service_laps: form.next_service_laps ? parseInt(form.next_service_laps) : null,
      next_service_date: form.next_service_date || null,
      completed_at: form.status === 'done' ? new Date().toISOString() : null,
    })

    setSaving(false)
    setShowModal(false)
    setForm({ car_id: '', maintenance_type: 'engine', title: '', description: '', priority: 'medium', status: 'pending', labor_hours: '', cost: '', next_service_laps: '', next_service_date: '', completed_by: '', notes: '' })
    fetchData()
  }

  const updateStatus = async (id: string, status: string) => {
    await supabase.from('maintenance_logs').update({
      status,
      completed_at: status === 'done' ? new Date().toISOString() : null,
    }).eq('id', id)
    fetchData()
  }

  const criticalCount = logs.filter(l => l.priority === 'critical' && l.status !== 'done').length

  return (
    <div className="space-y-5 animate-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-white tracking-wide">MAINTENANCE</h1>
          <p className="text-[#888] text-sm mt-1">
            {criticalCount > 0 && <span className="text-[#ff2d2d] mr-2">⚠ {criticalCount} CRITICAL</span>}
            {logs.filter(l => l.status !== 'done').length} open items
          </p>
        </div>
        <button onClick={() => setShowModal(true)} className="btn-chief">
          <Plus size={16} /> LOG MAINTENANCE
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2">
        {(['pending', 'all', 'done'] as const).map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-4 py-1.5 rounded text-sm font-display tracking-wide transition-all ${
              filter === f ? 'bg-[#f5c518] text-black' : 'bg-[#111] border border-[#222] text-[#888] hover:text-white'
            }`}>
            {f.toUpperCase()}
          </button>
        ))}
      </div>

      {/* Logs */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-[#555]" /></div>
      ) : logs.length > 0 ? (
        <div className="space-y-3">
          {logs.map(log => (
            <div key={log.id} className={`chief-panel rounded-lg p-4 border-l-2 ${
              log.priority === 'critical' ? 'border-l-[#ff2d2d]' :
              log.priority === 'high' ? 'border-l-[#f5c518]' :
              log.priority === 'medium' ? 'border-l-[#00e5ff]' : 'border-l-[#39ff14]'
            }`}>
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-display text-sm text-white tracking-wide">{log.title}</span>
                    <span className="font-mono text-[10px] px-1.5 py-0.5 rounded border"
                      style={{ color: PRIORITY_COLORS[log.priority], borderColor: PRIORITY_COLORS[log.priority] + '44', background: PRIORITY_COLORS[log.priority] + '11' }}>
                      {log.priority.toUpperCase()}
                    </span>
                    <span className="badge-cyan text-[10px]">{log.maintenance_type.replace(/_/g, ' ').toUpperCase()}</span>
                  </div>
                  <div className="text-[#888] text-xs font-mono">
                    {log.cars?.name} #{log.cars?.number || '—'}
                    {log.cost && <span className="ml-3">${log.cost.toFixed(2)}</span>}
                    {log.next_service_date && <span className="ml-3">Next: {new Date(log.next_service_date).toLocaleDateString()}</span>}
                  </div>
                  {log.description && <p className="text-[#666] text-sm mt-2">{log.description}</p>}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {log.status !== 'done' ? (
                    <button onClick={() => updateStatus(log.id, 'done')}
                      className="flex items-center gap-1 bg-[#39ff1411] border border-[#39ff1433] text-[#39ff14] px-3 py-1.5 rounded text-xs font-display tracking-wide hover:bg-[#39ff1422] transition-colors">
                      <CheckCircle size={12} /> MARK DONE
                    </button>
                  ) : (
                    <span className="badge-green">DONE</span>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="chief-panel rounded-lg p-12 text-center">
          <Wrench size={36} className="text-[#333] mx-auto mb-3" />
          <p className="text-[#555] text-sm">No maintenance items. Keep it clean.</p>
        </div>
      )}

      {/* New Maintenance Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowModal(false)} />
          <div className="relative bg-[#111] border border-[#222] rounded-lg w-full max-w-xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between p-5 border-b border-[#1a1a1a]">
              <span className="font-display text-lg text-white tracking-wide">LOG MAINTENANCE</span>
              <button onClick={() => setShowModal(false)}><X size={18} className="text-[#555]" /></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="chief-label">CAR</label>
                  <select className="chief-select" value={form.car_id} onChange={e => setForm({ ...form, car_id: e.target.value })}>
                    <option value="">Select car...</option>
                    {cars.map(c => <option key={c.id} value={c.id}>{c.name} #{c.number}</option>)}
                  </select>
                </div>
                <div>
                  <label className="chief-label">TYPE</label>
                  <select className="chief-select" value={form.maintenance_type} onChange={e => setForm({ ...form, maintenance_type: e.target.value })}>
                    {MAINTENANCE_TYPES.map(t => <option key={t} value={t}>{t.replace(/_/g, ' ').toUpperCase()}</option>)}
                  </select>
                </div>
              </div>
              <div>
                <label className="chief-label">TITLE</label>
                <input className="chief-input" placeholder="e.g. Replace LR shock, Rebuild engine, Pre-race inspection"
                  value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} />
              </div>
              <div>
                <label className="chief-label">DESCRIPTION</label>
                <textarea className="chief-input resize-none h-20 text-sm" placeholder="Details, parts used, notes..."
                  value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="chief-label">PRIORITY</label>
                  <select className="chief-select" value={form.priority} onChange={e => setForm({ ...form, priority: e.target.value })}>
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="chief-label">STATUS</label>
                  <select className="chief-select" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}>
                    <option value="pending">Pending</option>
                    <option value="in_progress">In Progress</option>
                    <option value="done">Done</option>
                    <option value="deferred">Deferred</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="chief-label">COST ($)</label>
                  <input className="chief-input" type="number" placeholder="0.00"
                    value={form.cost} onChange={e => setForm({ ...form, cost: e.target.value })} />
                </div>
                <div>
                  <label className="chief-label">LABOR HRS</label>
                  <input className="chief-input" type="number" step="0.5" placeholder="2.5"
                    value={form.labor_hours} onChange={e => setForm({ ...form, labor_hours: e.target.value })} />
                </div>
                <div>
                  <label className="chief-label">NEXT SVC DATE</label>
                  <input className="chief-input" type="date"
                    value={form.next_service_date} onChange={e => setForm({ ...form, next_service_date: e.target.value })} />
                </div>
              </div>
              <div>
                <label className="chief-label">COMPLETED BY</label>
                <input className="chief-input" placeholder="Name or initials"
                  value={form.completed_by} onChange={e => setForm({ ...form, completed_by: e.target.value })} />
              </div>
            </div>
            <div className="p-5 border-t border-[#1a1a1a] flex justify-end gap-3">
              <button onClick={() => setShowModal(false)} className="btn-ghost">Cancel</button>
              <button onClick={handleSave} disabled={saving || !form.title} className="btn-chief">
                {saving ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
                SAVE
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
