'use client'
import { useEffect, useRef, useState } from 'react'
import { Volume2, Mic, Activity, Save, CheckCircle2, Loader2, Play } from 'lucide-react'

const VOICE_OPTIONS = [
  { value: '',                              label: '(auto — picks best available)' },
  { value: 'en-US-AriaNeural',              label: 'Aria — warm female, default' },
  { value: 'en-US-JennyNeural',             label: 'Jenny — conversational female' },
  { value: 'en-US-AvaMultilingualNeural',   label: 'Ava — newest female, natural' },
  { value: 'en-US-EmmaMultilingualNeural',  label: 'Emma — expressive female' },
  { value: 'en-US-MichelleNeural',          label: 'Michelle — newscaster, clear' },
  { value: 'en-US-DavisNeural',             label: 'Davis — male, energetic' },
  { value: 'en-US-GuyNeural',               label: 'Guy — male, calm' },
  { value: 'en-GB-RyanNeural',              label: 'Ryan — British male' },
  { value: 'en-AU-WilliamNeural',           label: 'William — Aussie male' },
]

const FREQ_OPTIONS = [
  { value: 'all',        label: 'Every corner — most coaching', desc: 'Pre-corner cue on every braking zone' },
  { value: 'important',  label: 'Important corners only',       desc: 'Only corners feeding long straights (where exit matters)' },
  { value: 'losing',     label: 'Only when losing time',        desc: 'Speaks only at corners where you are slower than your reference lap' },
  { value: 'minimal',    label: 'Big events only',              desc: 'Lap times, flag changes, fuel/tire warnings. No corner cues.' },
  { value: 'off',        label: 'Voice off',                    desc: 'Silent. Telemetry capture continues.' },
]

const RATE_OPTIONS = [
  { value: '-15%',  label: 'Slow' },
  { value: '-5%',   label: 'Default' },
  { value: '+0%',   label: 'Normal' },
  { value: '+10%',  label: 'Fast' },
  { value: '+20%',  label: 'Very Fast' },
]

export default function VoiceSettingsPage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [savedAt, setSavedAt] = useState<Date | null>(null)
  const [error, setError] = useState('')

  const [volume, setVolume] = useState(80)
  const [voice, setVoice] = useState('')
  const [freq, setFreq] = useState('all')
  const [rate, setRate] = useState('-5%')
  const [testing, setTesting] = useState(false)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const abortRef = useRef<AbortController | null>(null)

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch('/api/profile/voice-settings', { cache: 'no-store' })
        const j = await r.json()
        if (j.settings) {
          setVolume(Number(j.settings.volume ?? 80))
          setVoice(String(j.settings.voice || ''))
          setFreq(String(j.settings.coach_freq || 'all'))
          setRate(String(j.settings.rate || '-5%'))
        }
      } catch (e: any) { setError(e.message) }
      setLoading(false)
    })()
  }, [])

  async function save() {
    setSaving(true); setError('')
    try {
      const r = await fetch('/api/profile/voice-settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ volume, voice, coach_freq: freq, rate }),
      })
      const j = await r.json()
      if (j.error) setError(j.error)
      else setSavedAt(new Date())
    } catch (e: any) { setError(e.message) }
    setSaving(false)
  }

  // Stop any currently playing test
  function stopTest() {
    try { audioRef.current?.pause() } catch (_) {}
    try { abortRef.current?.abort() } catch (_) {}
    audioRef.current = null
    setTesting(false)
  }

  // Server-side voice test using Microsoft Edge read-aloud (same as daemon's edge-tts).
  // Cancels any in-flight test before starting a new one, so clicking "Test" repeatedly
  // with different voice picks swaps the voice instantly.
  async function testVoice() {
    setError('')
    stopTest()
    setTesting(true)
    const ac = new AbortController()
    abortRef.current = ac
    try {
      const r = await fetch('/api/voice/preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          voice: voice || 'en-US-AriaNeural',
          rate,
          text: `Chief here. Voice check at ${volume} percent. Hit the apex and ride the throttle out of three.`,
        }),
        signal: ac.signal,
      })
      if (!r.ok) {
        const j = await r.json().catch(() => ({}))
        throw new Error(j.error || `HTTP ${r.status}`)
      }
      const blob = await r.blob()
      const url  = URL.createObjectURL(blob)
      const audio = new Audio(url)
      audio.volume = Math.max(0, Math.min(1, volume / 100))
      audio.onended = () => setTesting(false)
      audio.onerror = () => setTesting(false)
      audioRef.current = audio
      await audio.play()
    } catch (e: any) {
      if (e?.name === 'AbortError') return
      setError('Voice test failed: ' + (e?.message || 'unknown') + ' — using browser fallback')
      try {
        const utter = new SpeechSynthesisUtterance(`Chief here. Voice test at ${volume} percent.`)
        utter.volume = volume / 100
        utter.rate = rate.includes('-') ? 0.85 : rate.includes('+') ? 1.15 : 1.0
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(utter)
      } catch (_) {}
      setTesting(false)
    }
  }

  // Live volume — if a test is currently playing, update its volume in real time.
  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = Math.max(0, Math.min(1, volume / 100))
  }, [volume])

  // When the user picks a different voice while a test is playing, re-trigger
  // the test with the new voice immediately. Same for rate.
  useEffect(() => {
    if (audioRef.current && !audioRef.current.paused) {
      stopTest()
      testVoice()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voice, rate])

  if (loading) {
    return <div className="p-10 flex items-center gap-2 text-[#888]"><Loader2 size={16} className="animate-spin" /> Loading settings…</div>
  }

  return (
    <div className="max-w-3xl space-y-5 animate-in">

      <div className="chief-panel-glow p-6 rounded-lg">
        <div className="chief-accent-line mb-4" />
        <h1 className="font-display text-3xl text-white tracking-wide">VOICE COACH SETTINGS</h1>
        <p className="text-[#888] text-sm mt-1">
          Tune Chief's voice to your preference. Changes save to your account and the desktop daemon picks them up within 60 seconds — no restart needed.
        </p>
      </div>

      {/* VOLUME */}
      <div className="chief-panel p-5 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Volume2 size={16} className="text-[#00e5ff]" />
          <h2 className="font-display text-sm tracking-wider text-white uppercase">Volume</h2>
          <span className="ml-auto font-mono-chief text-2xl text-[#00e5ff]">{volume}</span>
        </div>
        <input type="range" min={0} max={100} step={5} value={volume}
               onChange={e => setVolume(Number(e.target.value))}
               className="w-full" style={{ accentColor: '#00e5ff' }} />
        <div className="flex justify-between text-[10px] text-[#666] mt-1">
          <span>Silent</span><span>Quiet</span><span>Default</span><span>Loud</span><span>Max</span>
        </div>
        <button onClick={testVoice}
                className="mt-3 inline-flex items-center gap-2 px-4 py-2 rounded text-sm font-bold transition"
                style={{ background: '#00e5ff', color: '#000' }}>
          <Play size={12} /> Test Voice Now
        </button>
        <span className="ml-2 text-xs text-[#888]">
          (browser preview — desktop daemon will match this volume)
        </span>
      </div>

      {/* VOICE */}
      <div className="chief-panel p-5 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Mic size={16} className="text-[#f5c518]" />
          <h2 className="font-display text-sm tracking-wider text-white uppercase">Voice</h2>
        </div>
        <select value={voice} onChange={e => setVoice(e.target.value)}
                className="w-full bg-[#0f1218] text-sm text-white rounded px-3 py-3 border border-[#1f2733]">
          {VOICE_OPTIONS.map(v => <option key={v.value} value={v.value}>{v.label}</option>)}
        </select>
        <div className="text-[11px] text-[#666] mt-2">
          All voices are Microsoft Edge Neural — natural, not robotic. If the chosen voice is rate-limited, Chief automatically falls back to the next working one.
        </div>
      </div>

      {/* SPEED */}
      <div className="chief-panel p-5 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={16} className="text-[#39ff14]" />
          <h2 className="font-display text-sm tracking-wider text-white uppercase">Speech Speed</h2>
        </div>
        <div className="flex gap-2 flex-wrap">
          {RATE_OPTIONS.map(r => (
            <button key={r.value} onClick={() => setRate(r.value)}
                    className="px-4 py-2 rounded text-xs font-bold transition"
                    style={{
                      background: rate === r.value ? '#39ff14' : '#0f1218',
                      color: rate === r.value ? '#000' : '#aaa',
                      border: '1px solid ' + (rate === r.value ? '#39ff14' : '#1f2733'),
                    }}>
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* COACH FREQUENCY */}
      <div className="chief-panel p-5 rounded-lg">
        <div className="flex items-center gap-2 mb-3">
          <Activity size={16} className="text-[#a855f7]" />
          <h2 className="font-display text-sm tracking-wider text-white uppercase">How often Chief talks</h2>
        </div>
        <div className="space-y-2">
          {FREQ_OPTIONS.map(f => (
            <button key={f.value} onClick={() => setFreq(f.value)}
                    className="w-full text-left px-4 py-3 rounded-lg transition"
                    style={{
                      background: freq === f.value ? 'rgba(168,85,247,0.18)' : 'rgba(20,20,32,0.5)',
                      border: '1px solid ' + (freq === f.value ? '#a855f7' : 'rgba(255,255,255,0.06)'),
                    }}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-4 h-4 rounded-full flex items-center justify-center"
                     style={{ background: freq === f.value ? '#a855f7' : 'transparent', border: '1.5px solid ' + (freq === f.value ? '#a855f7' : '#444') }}>
                  {freq === f.value && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div className="text-sm font-bold text-white">{f.label}</div>
              </div>
              <div className="text-[11px] text-[#888] ml-6">{f.desc}</div>
            </button>
          ))}
        </div>
      </div>

      {/* SAVE BAR */}
      <div className="sticky bottom-4 chief-panel-glow p-4 rounded-lg flex items-center gap-3"
           style={{ background: 'rgba(0,229,255,0.08)', borderColor: '#00e5ff' }}>
        <button onClick={save} disabled={saving}
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded font-display tracking-wide disabled:opacity-40"
                style={{ background: '#00e5ff', color: '#000' }}>
          {saving ? <Loader2 size={14} className="animate-spin" /> : <Save size={14} />}
          Save Settings
        </button>
        {savedAt && (
          <div className="inline-flex items-center gap-1 text-xs text-[#39ff14]">
            <CheckCircle2 size={12} /> Saved at {savedAt.toLocaleTimeString()} — desktop daemon will pick up within 60s
          </div>
        )}
        {error && <div className="text-xs text-[#ff8080]">{error}</div>}
      </div>

      {/* Hotkeys reference */}
      <div className="rounded-lg p-5 mt-6"
           style={{ background: '#0f0f18', border: '1px solid #2a2a3a' }}>
        <div className="flex items-center gap-2 mb-3">
          <Activity size={14} style={{ color: '#a3ff00' }} />
          <h3 className="font-display tracking-wider text-sm" style={{ color: '#a3ff00' }}>LIVE HOTKEYS (no alt-tab)</h3>
        </div>
        <div className="text-xs text-[#888] mb-3">
          These work globally — keep racing, just tap. Volume changes are instant (~2s) and persist across restarts.
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
          <div className="flex items-center justify-between p-2 rounded" style={{ background: '#161622' }}>
            <span className="text-[#ccc]">Volume +10</span>
            <kbd className="px-2 py-0.5 rounded font-mono" style={{ background: '#000', color: '#a3ff00', border: '1px solid #2a2a3a' }}>Ctrl+Shift+↑</kbd>
          </div>
          <div className="flex items-center justify-between p-2 rounded" style={{ background: '#161622' }}>
            <span className="text-[#ccc]">Volume -10</span>
            <kbd className="px-2 py-0.5 rounded font-mono" style={{ background: '#000', color: '#a3ff00', border: '1px solid #2a2a3a' }}>Ctrl+Shift+↓</kbd>
          </div>
          <div className="flex items-center justify-between p-2 rounded" style={{ background: '#161622' }}>
            <span className="text-[#ccc]">Mute toggle</span>
            <kbd className="px-2 py-0.5 rounded font-mono" style={{ background: '#000', color: '#a3ff00', border: '1px solid #2a2a3a' }}>Ctrl+Shift+M</kbd>
          </div>
          <div className="flex items-center justify-between p-2 rounded" style={{ background: '#161622' }}>
            <span className="text-[#ccc]">Silence (0%)</span>
            <kbd className="px-2 py-0.5 rounded font-mono" style={{ background: '#000', color: '#a3ff00', border: '1px solid #2a2a3a' }}>Ctrl+Shift+0</kbd>
          </div>
          <div className="flex items-center justify-between p-2 rounded" style={{ background: '#161622' }}>
            <span className="text-[#ccc]">50%</span>
            <kbd className="px-2 py-0.5 rounded font-mono" style={{ background: '#000', color: '#a3ff00', border: '1px solid #2a2a3a' }}>Ctrl+Shift+5</kbd>
          </div>
          <div className="flex items-center justify-between p-2 rounded" style={{ background: '#161622' }}>
            <span className="text-[#ccc]">Max (100%)</span>
            <kbd className="px-2 py-0.5 rounded font-mono" style={{ background: '#000', color: '#a3ff00', border: '1px solid #2a2a3a' }}>Ctrl+Shift+9</kbd>
          </div>
        </div>
      </div>
    </div>
  )
}
