'use client'
// FloatingAskChief — bottom-right floating bubble on every signed-in page.
// Click → expands into a compact chat with Chief. Calls /api/ai/ask-chief.
// History persists in localStorage so refresh doesn't blow it away.

import { useState, useEffect, useRef } from 'react'
import { MessageSquare, X, Send, Loader2, Sparkles } from 'lucide-react'

interface Msg { role: 'user' | 'chief'; text: string; ts: number }

const STORAGE_KEY = 'chief.floating.history.v1'
const QUICK_PROMPTS = [
  'Where am I losing time?',
  'Recap my last session',
  'How do I fix understeer?',
  'What setup changes for hotter track?',
]

export default function FloatingAskChief() {
  const [open, setOpen] = useState(false)
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const [msgs, setMsgs] = useState<Msg[]>([])
  const scrollRef = useRef<HTMLDivElement | null>(null)

  // Hydrate history
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) setMsgs(JSON.parse(raw))
    } catch {}
  }, [])

  // Persist history
  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(msgs.slice(-30))) } catch {}
  }, [msgs])

  // Autoscroll on new message
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight
  }, [msgs, busy])

  const send = async (text: string) => {
    const q = text.trim()
    if (!q || busy) return
    const userMsg: Msg = { role: 'user', text: q, ts: Date.now() }
    setMsgs(m => [...m, userMsg])
    setInput('')
    setBusy(true)
    try {
      const r = await fetch('/api/ai/ask-chief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question: q }),
      })
      const j = await r.json()
      const ans = j.answer || j.error || 'No response from Chief.'
      setMsgs(m => [...m, { role: 'chief', text: ans, ts: Date.now() }])
    } catch (e: any) {
      setMsgs(m => [...m, { role: 'chief', text: `Connection error: ${e.message}`, ts: Date.now() }])
    } finally {
      setBusy(false)
    }
  }

  const clear = () => {
    setMsgs([])
    try { localStorage.removeItem(STORAGE_KEY) } catch {}
  }

  return (
    <>
      {/* Floating bubble (closed state) */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-5 right-5 z-50 group"
          aria-label="Ask Chief"
        >
          <div className="absolute inset-0 rounded-full animate-ping opacity-30"
               style={{ background: '#a3ff00' }} />
          <div className="relative w-14 h-14 rounded-full flex items-center justify-center transition-all group-hover:scale-110"
            style={{
              background: 'linear-gradient(135deg,#a3ff00,#00e5ff)',
              boxShadow: '0 0 24px rgba(163,255,0,0.55), 0 6px 20px rgba(0,0,0,0.40)',
            }}>
            <Sparkles size={22} className="text-black" />
          </div>
          <span className="absolute -top-1 -right-1 w-3.5 h-3.5 rounded-full border-2 border-black"
                style={{ background: '#39ff14' }} />
        </button>
      )}

      {/* Expanded panel */}
      {open && (
        <div className="fixed bottom-5 right-5 z-50 w-[360px] max-w-[92vw] h-[520px] max-h-[80vh] rounded-2xl flex flex-col overflow-hidden shadow-2xl"
          style={{
            background: 'rgba(12,12,20,0.97)',
            border: '1px solid rgba(163,255,0,0.30)',
            boxShadow: '0 0 40px rgba(0,229,255,0.20), 0 12px 40px rgba(0,0,0,0.55)',
            backdropFilter: 'blur(12px)',
          }}>
          {/* Header */}
          <div className="px-3.5 py-3 flex items-center gap-2.5 border-b"
               style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <div className="w-8 h-8 rounded-full flex items-center justify-center"
                 style={{ background: 'linear-gradient(135deg,#a3ff00,#00e5ff)' }}>
              <Sparkles size={15} className="text-black" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-[13.5px] font-bold text-white tracking-wide">Ask Chief</div>
              <div className="text-[10px] text-slate-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#39ff14' }} /> Live · sees your last 8 sessions
              </div>
            </div>
            {msgs.length > 0 && (
              <button onClick={clear}
                className="text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded text-slate-400 hover:text-white transition">
                Clear
              </button>
            )}
            <button onClick={() => setOpen(false)}
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition">
              <X size={16} />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {msgs.length === 0 && (
              <div className="space-y-3">
                <div className="text-[12.5px] text-slate-300">
                  Hey — ask me anything about your driving, setup, or race plan. I see your live telemetry,
                  setups, hardware, and last 8 sessions.
                </div>
                <div className="space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wider text-slate-500">Quick prompts</div>
                  {QUICK_PROMPTS.map(p => (
                    <button key={p} onClick={() => send(p)}
                      className="block w-full text-left px-3 py-2 rounded-lg text-[12.5px] border transition-all hover:scale-[1.01]"
                      style={{
                        background: 'rgba(0,229,255,0.06)',
                        borderColor: 'rgba(0,229,255,0.25)',
                        color: '#c0e8ff',
                      }}>
                      → {p}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {msgs.map((m, i) => (
              <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className="max-w-[85%] px-3 py-2 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap"
                  style={{
                    background: m.role === 'user' ? 'rgba(0,229,255,0.15)' : 'rgba(255,255,255,0.04)',
                    border: `1px solid ${m.role === 'user' ? 'rgba(0,229,255,0.30)' : 'rgba(255,255,255,0.06)'}`,
                    color: m.role === 'user' ? '#e0f7ff' : '#e8e8f0',
                    borderTopRightRadius: m.role === 'user' ? 4 : undefined,
                    borderTopLeftRadius: m.role === 'chief' ? 4 : undefined,
                  }}>
                  {m.text}
                </div>
              </div>
            ))}

            {busy && (
              <div className="flex justify-start">
                <div className="px-3 py-2 rounded-2xl text-[13px] flex items-center gap-2"
                     style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(163,255,0,0.20)', color: '#a3ff00' }}>
                  <Loader2 size={13} className="animate-spin" /> Chief is thinking…
                </div>
              </div>
            )}
          </div>

          {/* Input */}
          <form onSubmit={e => { e.preventDefault(); send(input) }}
            className="p-2.5 border-t flex items-center gap-2"
            style={{ borderColor: 'rgba(255,255,255,0.08)' }}>
            <input
              value={input}
              onChange={e => setInput(e.target.value)}
              placeholder="Ask Chief…"
              disabled={busy}
              className="flex-1 px-3 py-2 rounded-lg text-[13px] outline-none text-white placeholder:text-slate-500"
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
              }}
            />
            <button
              type="submit"
              disabled={busy || !input.trim()}
              className="px-3 py-2 rounded-lg flex items-center justify-center transition-all disabled:opacity-40 disabled:cursor-not-allowed"
              style={{
                background: input.trim() ? 'linear-gradient(135deg,#a3ff00,#00e5ff)' : 'rgba(255,255,255,0.06)',
                color: '#000',
              }}>
              <Send size={14} />
            </button>
          </form>
        </div>
      )}
    </>
  )
}
