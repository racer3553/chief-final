'use client'
import { useState, useRef } from 'react'
import { Camera, Loader2, Check, AlertTriangle, X } from 'lucide-react'

export default function ScreenshotUpload({
  vendor,                  // 'simucube' | 'iracing' | 'simpro' | 'coach_dave'
  sessionId = null,        // optional - if set, parsed values get saved to that session
  accent = '#06b6d4',
  label = 'Upload screenshot',
}: any) {
  const [parsing, setParsing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [err, setErr] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  // Resize huge screenshots client-side so we never blow the 5MB Anthropic image cap
  async function shrinkIfNeeded(file: File): Promise<{ b64: string, type: string }> {
    const dataUrl: string = await new Promise((resolve, reject) => {
      const fr = new FileReader()
      fr.onload = () => resolve(fr.result as string)
      fr.onerror = () => reject(fr.error)
      fr.readAsDataURL(file)
    })
    const origB64 = dataUrl.split(',')[1]
    const origBytes = Math.floor((origB64.length * 3) / 4)
    const detectedType = (dataUrl.match(/^data:([^;]+);/) || [])[1] || file.type || 'image/png'
    if (origBytes < 3_500_000) return { b64: origB64, type: detectedType }

    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = () => reject(new Error('Could not decode image'))
      i.src = dataUrl
    })
    const maxLong = 1920
    const scale = Math.min(1, maxLong / Math.max(img.width, img.height))
    const w = Math.round(img.width * scale)
    const h = Math.round(img.height * scale)
    const canvas = document.createElement('canvas')
    canvas.width = w; canvas.height = h
    const ctx = canvas.getContext('2d')!
    ctx.drawImage(img, 0, 0, w, h)
    const jpgUrl = canvas.toDataURL('image/jpeg', 0.85)
    return { b64: jpgUrl.split(',')[1], type: 'image/jpeg' }
  }

  async function handleFile(f: File) {
    setParsing(true); setErr(''); setResult(null)
    try {
      const { b64, type } = await shrinkIfNeeded(f)
      const r = await fetch('/api/ai/parse-screenshot', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image_b64: b64, image_type: type, vendor, session_id: sessionId }),
      })
      let j: any = null
      try { j = await r.json() } catch { j = { error: `Server error (HTTP ${r.status})` } }
      if (!r.ok || j.error) setErr(j.error || `HTTP ${r.status}`)
      else setResult(j.parsed)
    } catch (e: any) {
      setErr(e?.message || 'Upload failed — check your connection and try again.')
    }
    setParsing(false)
  }

  async function handlePaste() {
    try {
      const items = await navigator.clipboard.read()
      for (const it of items) {
        for (const t of it.types) {
          if (t.startsWith('image/')) {
            const blob = await it.getType(t)
            handleFile(new File([blob], 'paste.png', { type: t }))
            return
          }
        }
      }
      setErr('No image in clipboard. Use Snipping Tool first.')
    } catch (e: any) { setErr('Paste failed: ' + e.message) }
  }

  return (
    <div className="rounded-xl p-4 border" style={{ background: 'rgba(20,20,32,0.6)', borderColor: accent + '30' }}>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-3">
        <div>
          <div className="text-xs font-bold tracking-wider uppercase mb-1" style={{ color: accent }}>Auto-Read Settings</div>
          <div className="text-sm text-white">{label}</div>
          <div className="text-[11px] text-slate-500 mt-0.5">Snap a screenshot of {vendor === 'coach_dave' ? 'Coach Dave Delta' : vendor === 'simpro' ? 'SimPro Manager' : vendor === 'iracing' ? 'an iRacing setup screen' : 'Simucube Tuner'} — Claude reads every value automatically</div>
        </div>
        <div className="flex gap-2">
          <input ref={inputRef} type="file" accept="image/*" onChange={e => e.target.files?.[0] && handleFile(e.target.files[0])} className="hidden" />
          <button onClick={handlePaste} disabled={parsing}
            className="px-3 py-2 rounded-md text-xs font-bold border disabled:opacity-40"
            style={{ borderColor: accent + '40', color: accent }}>
            Paste from clipboard
          </button>
          <button onClick={() => inputRef.current?.click()} disabled={parsing}
            className="px-4 py-2 rounded-md text-sm font-bold text-white disabled:opacity-40 flex items-center gap-2"
            style={{ background: accent }}>
            {parsing ? <Loader2 size={14} className="animate-spin" /> : <Camera size={14} />}
            {parsing ? 'Reading...' : 'Choose image'}
          </button>
        </div>
      </div>

      {err && (
        <div className="rounded-lg p-3 border flex items-center gap-2 text-xs text-red-300" style={{ background: 'rgba(239,68,68,0.08)', borderColor: 'rgba(239,68,68,0.30)' }}>
          <AlertTriangle size={14} /> {err}
          <button onClick={() => setErr('')} className="ml-auto"><X size={12}/></button>
        </div>
      )}

      {result && (
        <div className="rounded-lg p-3 border" style={{ background: 'rgba(0,0,0,0.4)', borderColor: accent + '30' }}>
          <div className="flex items-center gap-2 mb-3 text-xs">
            <Check size={14} className="text-green-400" />
            <span className="text-green-400 font-bold">Parsed {Object.keys(result).length} fields</span>
            {sessionId && <span className="text-slate-500">· saved to session</span>}
          </div>
          {result._raw ? (
            <div className="text-xs text-slate-400 whitespace-pre-wrap font-mono">{result._raw}</div>
          ) : (
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm">
              {Object.entries(result).map(([k, v]: any) => (
                <div key={k} className="flex justify-between border-b py-1" style={{ borderColor: 'rgba(255,255,255,0.04)' }}>
                  <span className="text-slate-400 truncate text-xs">{k.replace(/_/g, ' ')}</span>
                  <span className="font-mono text-xs" style={{ color: accent }}>{
                    typeof v === 'object' ? JSON.stringify(v).slice(0, 40) : String(v ?? '—')
                  }</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
