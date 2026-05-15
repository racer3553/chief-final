'use client'
// /dashboard/lights — Chief Lights setup for every user.
// 1. Scan button → desktop daemon does LAN UDP discovery → results stream back
// 2. Assign each device to a zone (ceiling / monitor / chassis / front / other)
// 3. Test button per device → daemon flashes that one CHIEF green
// 4. Effect toggles + master brightness
// 5. Save → daemon picks up new config on next poll and drives lights live

import { useEffect, useState, useRef } from 'react'
import { Lightbulb, RefreshCw, TestTube, Save, Loader2, CheckCircle2, AlertCircle, Trash2, Zap } from 'lucide-react'

type Device = { ip: string; sku?: string; mac?: string; name?: string }
type Zones = Record<string, Device[]>
type Prefs = {
  rpm: boolean; brake: boolean; sun: boolean; lightning: boolean;
  flag: boolean; crash: boolean; pit: boolean; offtrack: boolean;
  brightness: number;
}

const ZONES = [
  { key: 'ceiling', label: 'Ceiling / Roof Bars', desc: 'Sun position, lightning, ambient sky', accent: '#a3ff00' },
  { key: 'monitor', label: 'Monitor Stand',       desc: 'Screen-edge ambient + flag flashes',  accent: '#00e5ff' },
  { key: 'chassis', label: 'Chassis / Cockpit',   desc: 'RPM redline, brake red, off-track',    accent: '#ff00aa' },
  { key: 'front',   label: 'Front / Dash',        desc: 'Speed gauge color, gear-shift flash',  accent: '#f5c518' },
  { key: 'other',   label: 'Other',               desc: 'Default ambient',                       accent: '#a855f7' },
]

const EFFECTS = [
  { key: 'sun',       label: 'Sun position (sunrise / midday / sunset / night)' },
  { key: 'lightning', label: 'Lightning flashes during rain' },
  { key: 'rpm',       label: 'RPM redline gradient (yellow → red → white)' },
  { key: 'brake',     label: 'Brake-on-red flash' },
  { key: 'flag',      label: 'Flag colors (green / yellow / red / blue)' },
  { key: 'crash',     label: 'Incident red strobe' },
  { key: 'pit',       label: 'Pit lane white' },
  { key: 'offtrack',  label: 'Off-track gravel tint' },
]

const DEFAULT_PREFS: Prefs = {
  rpm: true, brake: true, sun: true, lightning: true,
  flag: true, crash: true, pit: true, offtrack: true, brightness: 85,
}

export default function LightsPage() {
  const [loading, setLoading] = useState(true)
  const [scanning, setScanning] = useState(false)
  const [saving, setSaving] = useState(false)
  const [foundDevices, setFoundDevices] = useState<Device[]>([])
  const [zones, setZones] = useState<Zones>({})
  const [prefs, setPrefs] = useState<Prefs>(DEFAULT_PREFS)
  const [lastSavedAt, setLastSavedAt] = useState<string | null>(null)
  const [lastScanAt, setLastScanAt] = useState<string | null>(null)
  const [err, setErr] = useState<string | null>(null)
  const pollRef = useRef<any>(null)

  // ---- initial load ----
  useEffect(() => { loadConfig() }, [])

  async function loadConfig() {
    setLoading(true); setErr(null)
    try {
      const r = await fetch('/api/lights/me')
      const j = await r.json()
      if (j.error) throw new Error(j.error)
      const c = j.config
      const known: Device[] = []
      // Merge known devices (already in zones) + scan_results not yet zoned
      Object.values(c.zones || {}).forEach((arr: any) => Array.isArray(arr) && arr.forEach(d => known.push(d)))
      const scanned = Array.isArray(c.scan_results) ? c.scan_results : []
      const merged = dedupeByIp([...known, ...scanned])
      setFoundDevices(merged)
      setZones(c.zones || {})
      setPrefs({ ...DEFAULT_PREFS, ...(c.effect_prefs || {}) })
      setLastScanAt(c.last_scan_at || null)
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setLoading(false)
    }
  }

  function dedupeByIp(arr: Device[]): Device[] {
    const seen = new Map<string, Device>()
    for (const d of arr) {
      if (!d?.ip) continue
      const existing = seen.get(d.ip)
      // prefer entry with most info
      if (!existing || (d.name && !existing.name) || (d.sku && !existing.sku)) {
        seen.set(d.ip, { ...existing, ...d })
      }
    }
    return Array.from(seen.values())
  }

  // ---- scan ----
  async function triggerScan() {
    setScanning(true); setErr(null)
    try {
      await fetch('/api/lights/scan', { method: 'POST' })
      // poll for results every 2s, max 45s
      let attempts = 0
      pollRef.current = setInterval(async () => {
        attempts++
        const r = await fetch('/api/lights/scan')
        const j = await r.json()
        if (j.devices?.length || attempts > 22) {
          clearInterval(pollRef.current)
          pollRef.current = null
          if (j.devices?.length) {
            setFoundDevices(prev => dedupeByIp([...prev, ...j.devices]))
            setLastScanAt(j.lastScanAt)
          }
          setScanning(false)
        }
      }, 2000)
    } catch (e: any) {
      setErr(e.message)
      setScanning(false)
    }
  }

  // ---- zone assignment ----
  function assignZone(device: Device, zoneKey: string) {
    setZones(prev => {
      const next: Zones = {}
      for (const [k, arr] of Object.entries(prev)) {
        next[k] = (arr || []).filter(d => d.ip !== device.ip)
      }
      if (zoneKey && zoneKey !== '__none__') {
        next[zoneKey] = [...(next[zoneKey] || []), device]
      }
      return next
    })
  }

  function getZone(device: Device): string {
    for (const [k, arr] of Object.entries(zones)) {
      if ((arr || []).find(d => d.ip === device.ip)) return k
    }
    return '__none__'
  }

  // ---- test individual light ----
  async function testLight(ip: string) {
    // Mark a one-off "test" request. The daemon picks it up via its prefs poll.
    // Quickest impl: stuff into effect_prefs as a transient _testIp field.
    await fetch('/api/lights/me', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ effect_prefs: { ...prefs, _testIp: ip, _testAt: Date.now() } }),
    })
  }

  // ---- save ----
  async function save() {
    setSaving(true); setErr(null)
    try {
      // Devices = union of all zoned devices
      const devices = foundDevices
      const r = await fetch('/api/lights/me', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ devices, zones, effect_prefs: prefs }),
      })
      const j = await r.json()
      if (j.error) throw new Error(j.error)
      setLastSavedAt(new Date().toISOString())
    } catch (e: any) {
      setErr(e.message)
    } finally {
      setSaving(false)
    }
  }

  function removeDevice(ip: string) {
    setFoundDevices(prev => prev.filter(d => d.ip !== ip))
    setZones(prev => {
      const next: Zones = {}
      for (const [k, arr] of Object.entries(prev)) next[k] = (arr || []).filter(d => d.ip !== ip)
      return next
    })
  }

  if (loading) return (
    <div className="flex items-center gap-2 text-[#a3ff00] p-10">
      <Loader2 size={16} className="animate-spin" /> Loading lights config…
    </div>
  )

  return (
    <div className="max-w-5xl mx-auto space-y-5">
      <header>
        <div className="text-[10px] font-bold tracking-[0.22em] uppercase mb-1" style={{ color: '#a3ff00' }}>
          Chief Lights
        </div>
        <h1 className="font-display text-3xl text-white tracking-wide">Sim Rig Immersion</h1>
        <p className="text-sm text-slate-400 mt-1">
          Govee LAN lights driven by your live iRacing telemetry. Sun position, lightning flashes,
          RPM redline, brake red, flag colors, crash strobe — all wired to the action.
        </p>
      </header>

      {err && (
        <div className="rounded-xl p-3 border flex items-center gap-2"
             style={{ background: 'rgba(255,100,100,0.08)', borderColor: 'rgba(255,100,100,0.25)' }}>
          <AlertCircle size={14} className="text-red-400" />
          <div className="text-[12px] text-red-300">{err}</div>
        </div>
      )}

      {/* ---- Scan + saved status ---- */}
      <div className="rounded-xl p-4 border flex items-center gap-3 flex-wrap"
           style={{ background: 'rgba(20,20,32,0.6)', borderColor: 'rgba(255,255,255,0.08)' }}>
        <button onClick={triggerScan} disabled={scanning}
          className="px-4 py-2 rounded-lg font-bold text-sm flex items-center gap-2 transition disabled:opacity-50"
          style={{ background: '#a3ff00', color: '#000' }}>
          {scanning ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
          {scanning ? 'Scanning your network…' : 'Scan for Govee lights'}
        </button>
        <div className="text-[12px] text-slate-400">
          Requires Chief Desktop running on your sim PC. Last scan:{' '}
          <span className="text-white">{lastScanAt ? new Date(lastScanAt).toLocaleString() : 'never'}</span>
        </div>
      </div>

      {/* ---- Device list with zone selectors ---- */}
      <div className="rounded-xl p-4 border" style={{ background: 'rgba(20,20,32,0.6)', borderColor: 'rgba(255,255,255,0.08)' }}>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-[11px] font-bold tracking-[0.18em] uppercase" style={{ color: '#a3ff00' }}>
            Found Devices ({foundDevices.length})
          </h3>
          {foundDevices.length === 0 && (
            <span className="text-[12px] text-slate-500">Click Scan to discover your Govee lights</span>
          )}
        </div>
        <div className="space-y-2">
          {foundDevices.map(d => (
            <div key={d.ip} className="grid grid-cols-[1fr_140px_160px_36px_36px] gap-2 items-center p-3 rounded-lg border"
                 style={{ background: 'rgba(0,0,0,0.30)', borderColor: 'rgba(255,255,255,0.06)' }}>
              <div>
                <div className="text-[13px] font-bold text-white">{d.name || d.sku || 'Govee Device'}</div>
                <div className="text-[10px] font-mono text-slate-500">{d.ip}  ·  {d.sku || '?'}  {d.mac ? `· ${d.mac}` : ''}</div>
              </div>
              <input
                value={d.name || ''}
                onChange={e => {
                  const v = e.target.value
                  setFoundDevices(prev => prev.map(x => x.ip === d.ip ? { ...x, name: v } : x))
                  // also update in zones
                  setZones(prev => {
                    const next: Zones = {}
                    for (const [k, arr] of Object.entries(prev)) next[k] = (arr || []).map(x => x.ip === d.ip ? { ...x, name: v } : x)
                    return next
                  })
                }}
                placeholder="Custom name"
                className="px-2 py-1.5 bg-[#0f1218] rounded text-[12px] text-white border outline-none"
                style={{ borderColor: 'rgba(255,255,255,0.06)' }}
              />
              <select value={getZone(d)} onChange={e => assignZone(d, e.target.value)}
                className="px-2 py-1.5 bg-[#0f1218] rounded text-[12px] text-white border outline-none"
                style={{ borderColor: 'rgba(255,255,255,0.06)' }}>
                <option value="__none__">— unassigned —</option>
                {ZONES.map(z => <option key={z.key} value={z.key}>{z.label}</option>)}
              </select>
              <button onClick={() => testLight(d.ip)}
                title="Flash this light CHIEF green"
                className="w-9 h-9 rounded flex items-center justify-center transition"
                style={{ background: 'rgba(163,255,0,0.15)', color: '#a3ff00', border: '1px solid rgba(163,255,0,0.30)' }}>
                <Zap size={14} />
              </button>
              <button onClick={() => removeDevice(d.ip)}
                title="Remove from config"
                className="w-9 h-9 rounded flex items-center justify-center transition"
                style={{ background: 'rgba(255,100,100,0.10)', color: '#ff8080', border: '1px solid rgba(255,100,100,0.20)' }}>
                <Trash2 size={13} />
              </button>
            </div>
          ))}
        </div>
      </div>

      {/* ---- Zone descriptions ---- */}
      <div className="rounded-xl p-4 border" style={{ background: 'rgba(20,20,32,0.6)', borderColor: 'rgba(255,255,255,0.08)' }}>
        <h3 className="text-[11px] font-bold tracking-[0.18em] uppercase mb-3" style={{ color: '#00e5ff' }}>
          Zones &amp; What They Do
        </h3>
        <div className="grid md:grid-cols-2 gap-2">
          {ZONES.map(z => (
            <div key={z.key} className="px-3 py-2 rounded border"
                 style={{ background: 'rgba(0,0,0,0.30)', borderColor: z.accent + '30' }}>
              <div className="flex items-center justify-between">
                <span className="text-[13px] font-bold" style={{ color: z.accent }}>{z.label}</span>
                <span className="text-[10px] text-slate-500">{(zones[z.key] || []).length} device(s)</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">{z.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ---- Effect toggles ---- */}
      <div className="rounded-xl p-4 border" style={{ background: 'rgba(20,20,32,0.6)', borderColor: 'rgba(255,255,255,0.08)' }}>
        <h3 className="text-[11px] font-bold tracking-[0.18em] uppercase mb-3" style={{ color: '#ff00aa' }}>
          Effects
        </h3>
        <div className="grid md:grid-cols-2 gap-2">
          {EFFECTS.map(fx => (
            <label key={fx.key} className="flex items-center gap-2 px-3 py-2 rounded border cursor-pointer hover:bg-white/5"
                   style={{ background: 'rgba(0,0,0,0.30)', borderColor: 'rgba(255,255,255,0.06)' }}>
              <input type="checkbox"
                checked={(prefs as any)[fx.key]}
                onChange={e => setPrefs(p => ({ ...p, [fx.key]: e.target.checked }))}
                className="w-4 h-4 accent-[#a3ff00]" />
              <span className="text-[12.5px] text-slate-200">{fx.label}</span>
            </label>
          ))}
        </div>
        <div className="mt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[12px] font-bold text-slate-300">Master Brightness</span>
            <span className="font-mono text-[12px]" style={{ color: '#a3ff00' }}>{prefs.brightness}%</span>
          </div>
          <input type="range" min="10" max="100"
            value={prefs.brightness}
            onChange={e => setPrefs(p => ({ ...p, brightness: parseInt(e.target.value) }))}
            className="w-full accent-[#a3ff00]" />
        </div>
      </div>

      {/* ---- Save ---- */}
      <div className="rounded-xl p-4 border flex items-center justify-between flex-wrap gap-3"
           style={{ background: 'linear-gradient(135deg, rgba(163,255,0,0.06), rgba(0,229,255,0.04))', borderColor: 'rgba(163,255,0,0.30)' }}>
        <div className="text-[12.5px] text-slate-300">
          Click <span className="text-[#a3ff00] font-bold">Save</span> and Chief Desktop picks up your new config within 5 seconds.
          The daemon drives lights live whenever iRacing is running.
        </div>
        <button onClick={save} disabled={saving}
          className="px-5 py-2.5 rounded-lg font-bold text-sm flex items-center gap-2 transition disabled:opacity-50"
          style={{ background: '#a3ff00', color: '#000' }}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          {saving ? 'Saving…' : 'Save Lights Config'}
        </button>
      </div>

      {lastSavedAt && (
        <div className="flex items-center gap-2 text-[12px] text-slate-400">
          <CheckCircle2 size={12} className="text-[#39ff14]" />
          Saved {new Date(lastSavedAt).toLocaleTimeString()}
        </div>
      )}
    </div>
  )
}
