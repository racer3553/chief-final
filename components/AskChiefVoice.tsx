'use client'
// chief-final/components/AskChiefVoice.tsx
// Voice-enabled Ask Chief widget. Tap mic, speak, get answer.
// Uses browser SpeechRecognition (free, no extra deps).
// Drop into /dashboard/ai-chat page or anywhere.

import { useState, useRef, useEffect } from 'react'
import { Mic, MicOff, Send, Loader2, Volume2 } from 'lucide-react'

export default function AskChiefVoice() {
  const [listening, setListening] = useState(false)
  const [text, setText] = useState('')
  const [answer, setAnswer] = useState('')
  const [loading, setLoading] = useState(false)
  const [contextCount, setContextCount] = useState(0)
  const recognitionRef = useRef<any>(null)
  const synthRef = useRef<SpeechSynthesis | null>(null)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
    if (!SR) return
    const r = new SR()
    r.continuous = false
    r.interimResults = true
    r.lang = 'en-US'
    r.onresult = (e: any) => {
      const t = Array.from(e.results).map((r: any) => r[0].transcript).join('')
      setText(t)
      if (e.results[e.results.length - 1].isFinal) {
        setListening(false)
        ask(t)
      }
    }
    r.onerror = () => setListening(false)
    r.onend = () => setListening(false)
    recognitionRef.current = r
    synthRef.current = window.speechSynthesis
  }, [])

  function toggleMic() {
    if (!recognitionRef.current) {
      alert('Voice not supported in this browser. Use Chrome or Edge.')
      return
    }
    if (listening) {
      recognitionRef.current.stop()
      setListening(false)
    } else {
      setText('')
      setAnswer('')
      try { recognitionRef.current.start(); setListening(true) } catch {}
    }
  }

  async function ask(question: string) {
    if (!question.trim()) return
    setLoading(true)
    setAnswer('')
    try {
      const r = await fetch('/api/ai/ask-chief', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question }),
      })
      const j = await r.json()
      setAnswer(j.answer || j.error || 'No answer')
      setContextCount(j.context_sessions || 0)
      if (j.answer && synthRef.current) {
        const u = new SpeechSynthesisUtterance(j.answer)
        u.rate = 1.05
        synthRef.current.speak(u)
      }
    } catch (e: any) {
      setAnswer('Error: ' + e.message)
    }
    setLoading(false)
  }

  function speakAgain() {
    if (!answer || !synthRef.current) return
    synthRef.current.cancel()
    const u = new SpeechSynthesisUtterance(answer)
    u.rate = 1.05
    synthRef.current.speak(u)
  }

  return (
    <div className="rounded-2xl p-6 border" style={{ background: 'rgba(20,20,32,0.95)', borderColor: 'rgba(6,182,212,0.3)' }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-2xl font-extrabold text-white">Ask Chief</h2>
          <p className="text-sm text-slate-400">Tap mic. Ask anything. "What was my setup last time at Eldora?"</p>
        </div>
        <div className="text-xs text-slate-500">{contextCount} sessions in memory</div>
      </div>

      <div className="flex gap-3 mb-4">
        <button onClick={toggleMic}
          className="w-14 h-14 rounded-full flex items-center justify-center transition-all"
          style={{
            background: listening ? '#ef4444' : '#06b6d4',
            boxShadow: listening ? '0 0 20px #ef4444' : '0 0 10px rgba(6,182,212,0.5)',
            animation: listening ? 'pulse 1s infinite' : 'none',
          }}>
          {listening ? <MicOff size={22} className="text-white" /> : <Mic size={22} className="text-white" />}
        </button>
        <input
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter') ask(text) }}
          placeholder='Or type: "compare my best laps at Eldora to Knoxville"'
          className="flex-1 px-4 rounded-lg bg-black/40 border text-white text-sm"
          style={{ borderColor: 'rgba(255,255,255,0.1)' }}
        />
        <button onClick={() => ask(text)} disabled={!text.trim() || loading}
          className="px-5 rounded-lg font-semibold text-white transition-all disabled:opacity-40"
          style={{ background: '#06b6d4' }}>
          {loading ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
        </button>
      </div>

      {(answer || loading) && (
        <div className="rounded-lg p-4 border" style={{ background: 'rgba(0,0,0,0.4)', borderColor: 'rgba(6,182,212,0.2)' }}>
          {loading && <div className="flex items-center gap-2 text-cyan-300"><Loader2 size={16} className="animate-spin" /> Chief is thinking...</div>}
          {answer && (
            <>
              <div className="text-white leading-relaxed whitespace-pre-wrap">{answer}</div>
              <button onClick={speakAgain} className="mt-3 flex items-center gap-1.5 text-xs text-cyan-400 hover:text-cyan-300">
                <Volume2 size={13} /> Replay
              </button>
            </>
          )}
        </div>
      )}

      <style jsx>{`
        @keyframes pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.06); }
        }
      `}</style>
    </div>
  )
}
