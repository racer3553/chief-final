'use client'

import { useState, useRef, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Brain, Send, Loader2, Upload, Trophy, Gamepad2 } from 'lucide-react'
import { useDropzone } from 'react-dropzone'

interface Message { role: 'user' | 'assistant'; content: string }

const QUICK_PROMPTS = {
  race: [
    'My car is loose going into the corner — what do I adjust?',
    'Tight center. What chassis changes help?',
    "What worked last time I ran at this type of track?",
    'My RR temp is way hotter than LR — what does that mean?',
    'I need more rear bite without killing forward drive',
    'Explain how stagger affects handling on a 1/2 mile dirt track',
  ],
  sim: [
    'My FFB feels vague and numb — how do I fix it?',
    'iRacing dirt — car is snapping loose on exit',
    'What ARB changes fix tight understeer in slow corners?',
    'My rear is stepping out under braking',
    'How do I get more rotation without losing rear grip?',
    'Brake bias recommendations for a dirt oval',
  ],
}

export default function AskChiefPage() {
  const supabase = createClient()
  const [mode, setMode] = useState<'race' | 'sim'>('race')
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': [] }, maxFiles: 1,
    onDrop: async (files) => {
      if (!files[0]) return
      setAnalyzing(true)
      const fd = new FormData()
      fd.append('image', files[0])
      fd.append('context', JSON.stringify({ mode: mode === 'sim' ? 'sim_chief' : 'race_chief' }))
      const res = await fetch('/api/ai/analyze-image', { method: 'POST', body: fd })
      const { analysis } = await res.json()
      if (analysis) setMessages(prev => [...prev, { role: 'assistant', content: analysis }])
      setAnalyzing(false)
    },
  })

  const sendMessage = async (text?: string) => {
    const msg = text || input.trim()
    if (!msg) return
    const userMsg: Message = { role: 'user', content: msg }
    setMessages(prev => [...prev, userMsg])
    setInput('')
    setLoading(true)
    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMsg],
          context: { mode: mode === 'sim' ? 'sim_chief' : 'race_chief' },
          mode: mode === 'sim' ? 'sim_chief' : 'race_chief',
        }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, { role: 'assistant', content: data.response }])
    } catch {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Chief offline. Try again.' }])
    }
    setLoading(false)
  }

  return (
    <div className="h-[calc(100vh-3.5rem-1.5rem)] flex flex-col animate-in">
      {/* Mode switch */}
      <div className="flex items-center justify-between mb-4 shrink-0">
        <div>
          <h1 className="font-display text-3xl text-white tracking-wide">ASK CHIEF</h1>
          <p className="text-[#888] text-sm">Your AI crew chief — sim or real world</p>
        </div>
        <div className="bg-[#111] border border-[#222] rounded p-1 flex gap-1">
          <button onClick={() => setMode('race')}
            className={`flex items-center gap-2 px-4 py-2 rounded font-display text-sm tracking-wide transition-all ${mode === 'race' ? 'bg-[#f5c518] text-black' : 'text-[#888]'}`}>
            <Trophy size={14} /> RACE CHIEF
          </button>
          <button onClick={() => setMode('sim')}
            className={`flex items-center gap-2 px-4 py-2 rounded font-display text-sm tracking-wide transition-all ${mode === 'sim' ? 'bg-[#00e5ff] text-black' : 'text-[#888]'}`}>
            <Gamepad2 size={14} /> SIM CHIEF
          </button>
        </div>
      </div>

      {/* Chat window */}
      <div className="flex-1 chief-panel rounded-lg flex flex-col overflow-hidden">
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {messages.length === 0 && (
            <div>
              <div className="text-center mb-8">
                <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center ${mode === 'race' ? 'bg-[#f5c51822] border border-[#f5c51833]' : 'bg-[#00e5ff22] border border-[#00e5ff33]'}`}>
                  <Brain size={28} style={{ color: mode === 'race' ? '#f5c518' : '#00e5ff' }} />
                </div>
                <div className="font-display text-lg text-white tracking-widest">
                  {mode === 'race' ? 'RACE CHIEF READY' : 'SIM CHIEF READY'}
                </div>
                <p className="text-[#555] text-sm mt-1">
                  {mode === 'race' ? 'Real-world setup, maintenance, and race strategy.' : 'Sim setup, FFB, iRating growth, and screenshot analysis.'}
                </p>
              </div>
              <div className="grid sm:grid-cols-2 gap-2 max-w-2xl mx-auto">
                {QUICK_PROMPTS[mode].map(q => (
                  <button key={q} onClick={() => sendMessage(q)}
                    className="bg-[#0d0d0d] border border-[#1a1a1a] hover:border-[#333] text-[#888] hover:text-[#f0f0f0] text-sm p-3 rounded text-left transition-all">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'} gap-3`}>
              {m.role === 'assistant' && (
                <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center mt-0.5 ${mode === 'race' ? 'bg-[#f5c51822] border border-[#f5c51833]' : 'bg-[#00e5ff22] border border-[#00e5ff33]'}`}>
                  <Brain size={14} style={{ color: mode === 'race' ? '#f5c518' : '#00e5ff' }} />
                </div>
              )}
              <div className={`max-w-[80%] rounded p-4 text-sm leading-relaxed ${
                m.role === 'user'
                  ? 'bg-[#1a1a1a] text-[#f0f0f0]'
                  : `${mode === 'race' ? 'bg-[#f5c51808] border border-[#f5c51822]' : 'bg-[#00e5ff08] border border-[#00e5ff22]'} text-[#ddd]`
              }`}>
                <p className="whitespace-pre-line">{m.content}</p>
              </div>
            </div>
          ))}

          {(loading || analyzing) && (
            <div className="flex items-center gap-3">
              <div className={`w-8 h-8 rounded shrink-0 flex items-center justify-center ${mode === 'race' ? 'bg-[#f5c51822]' : 'bg-[#00e5ff22]'}`}>
                <Brain size={14} style={{ color: mode === 'race' ? '#f5c518' : '#00e5ff' }} />
              </div>
              <div className={`rounded p-4 text-sm ${mode === 'race' ? 'bg-[#f5c51808] border border-[#f5c51822]' : 'bg-[#00e5ff08] border border-[#00e5ff22]'}`}>
                <div className="flex items-center gap-2" style={{ color: mode === 'race' ? '#f5c518' : '#00e5ff' }}>
                  <Loader2 size={14} className="animate-spin" />
                  <span className="font-mono text-xs typing-cursor">
                    {analyzing ? 'Analyzing image...' : 'Chief is thinking...'}
                  </span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Image upload */}
        <div {...getRootProps()} className={`mx-4 mb-2 border border-dashed rounded p-2 text-center cursor-pointer transition-colors ${
          isDragActive ? `border-${mode === 'race' ? '[#f5c518]' : '[#00e5ff]'} bg-opacity-10` : 'border-[#1a1a1a] hover:border-[#333]'
        }`}>
          <input {...getInputProps()} />
          <div className="flex items-center justify-center gap-2 text-[#555] text-xs">
            <Upload size={12} />
            <span>Drop a setup screenshot for Chief to analyze</span>
          </div>
        </div>

        {/* Input */}
        <div className="p-4 border-t border-[#1a1a1a]">
          <div className="flex gap-2">
            <input ref={inputRef} className="chief-input flex-1"
              placeholder={`Ask Chief anything about ${mode === 'race' ? 'your race car setup...' : 'your sim setup...'}`}
              value={input} onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); sendMessage() } }} />
            <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
              className="btn-chief !px-4 disabled:opacity-40">
              <Send size={16} />
            </button>
          </div>
          {messages.length > 0 && (
            <button onClick={() => setMessages([])} className="text-[#444] text-xs mt-2 hover:text-[#666] transition-colors">
              Clear conversation
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
