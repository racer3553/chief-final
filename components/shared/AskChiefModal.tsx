'use client'

import { useState, useRef, useEffect } from 'react'
import { Brain, X, Send, Loader2, Upload } from 'lucide-react'
import { useDropzone } from 'react-dropzone'

interface Message {
  role: 'user' | 'assistant'
  content: string
}

interface Props {
  isOpen: boolean
  onClose: () => void
  context: Record<string, any>
  onRecommendation?: (rec: string) => void
}

export default function AskChiefModal({ isOpen, onClose, context, onRecommendation }: Props) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploadedImages, setUploadedImages] = useState<string[]>([])
  const [analyzingImage, setAnalyzingImage] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (isOpen) {
      setMessages([])
      inputRef.current?.focus()
      // Auto-greet with context
      if (context.setupData && Object.keys(context.setupData).length > 2) {
        sendMessage('Analyze my current setup and give me your top 3 recommendations to go faster.', true)
      }
    }
  }, [isOpen])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept: { 'image/*': ['.png', '.jpg', '.jpeg', '.webp'] },
    maxFiles: 1,
    onDrop: async (files) => {
      if (!files[0]) return
      setAnalyzingImage(true)
      const formData = new FormData()
      formData.append('image', files[0])
      formData.append('context', JSON.stringify(context))
      
      const res = await fetch('/api/ai/analyze-image', { method: 'POST', body: formData })
      const { analysis, url } = await res.json()
      if (url) setUploadedImages(prev => [...prev, url])
      if (analysis) {
        setMessages(prev => [...prev, { role: 'assistant', content: analysis }])
      }
      setAnalyzingImage(false)
    },
  })

  const sendMessage = async (text?: string, autoSend = false) => {
    const messageText = text || input.trim()
    if (!messageText) return

    const userMessage: Message = { role: 'user', content: messageText }
    setMessages(prev => [...prev, userMessage])
    if (!autoSend) setInput('')
    setLoading(true)

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: [...messages, userMessage],
          context,
          mode: context.mode || 'race_chief',
        }),
      })

      const data = await res.json()
      const assistantMsg: Message = { role: 'assistant', content: data.response }
      setMessages(prev => [...prev, assistantMsg])

      // If this is a recommendation, pass it up
      if (onRecommendation && !autoSend) {
        onRecommendation(data.response)
      }
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Chief is offline right now. Try again.' }])
    }
    setLoading(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" />
      <div className="relative w-full max-w-2xl bg-[#111] border border-[#f5c51833] rounded-lg overflow-hidden flex flex-col shadow-[0_0_60px_#f5c51822]"
        style={{ height: '70vh' }}
        onClick={e => e.stopPropagation()}>
        
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-[#1a1a1a] bg-[#0d0d0d]">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-[#f5c51811] border border-[#f5c51833] rounded">
              <Brain size={16} className="text-[#f5c518]" />
            </div>
            <div>
              <div className="font-display text-sm text-[#f5c518] tracking-widest">ASK CHIEF</div>
              <div className="font-mono text-xs text-[#555]">
                {context.carName && context.trackName 
                  ? `${context.carName} · ${context.trackName}`
                  : context.mode === 'sim_chief' ? 'SIM CHIEF MODE' : 'RACE CHIEF MODE'
                }
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-[#555] hover:text-[#888] p-1"><X size={18} /></button>
        </div>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && !loading && (
            <div className="text-center py-8">
              <div className="font-display text-[#555] text-sm tracking-widest mb-4">CHIEF IS READY</div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'What changes will help me go faster?',
                  'What worked at this track before?',
                  'My car is loose off. What do I adjust?',
                  'Analyze my tire temps',
                ].map(q => (
                  <button key={q} onClick={() => sendMessage(q)}
                    className="bg-[#0d0d0d] border border-[#222] hover:border-[#f5c51844] text-[#888] hover:text-[#f0f0f0] text-xs p-3 rounded text-left transition-all">
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, i) => (
            <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              {m.role === 'assistant' && (
                <div className="w-6 h-6 rounded bg-[#f5c51822] border border-[#f5c51833] flex items-center justify-center mr-2 mt-1 shrink-0">
                  <Brain size={12} className="text-[#f5c518]" />
                </div>
              )}
              <div className={`max-w-[85%] rounded p-3 text-sm leading-relaxed ${
                m.role === 'user' 
                  ? 'bg-[#1a1a1a] text-[#f0f0f0]' 
                  : 'bg-[#f5c51808] border border-[#f5c51822] text-[#ddd]'
              }`}>
                {m.content.split('\n').map((line, j) => (
                  <span key={j}>{line}{j < m.content.split('\n').length - 1 && <br />}</span>
                ))}
              </div>
            </div>
          ))}

          {(loading || analyzingImage) && (
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded bg-[#f5c51822] border border-[#f5c51833] flex items-center justify-center shrink-0">
                <Brain size={12} className="text-[#f5c518]" />
              </div>
              <div className="bg-[#f5c51808] border border-[#f5c51822] rounded p-3">
                <div className="flex items-center gap-2 text-[#f5c518] text-sm">
                  <Loader2 size={14} className="animate-spin" />
                  <span className="typing-cursor font-mono text-xs">
                    {analyzingImage ? 'Analyzing image...' : 'Chief is thinking...'}
                  </span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Image upload zone */}
        <div {...getRootProps()} className={`mx-4 mb-2 border border-dashed rounded p-2 text-center cursor-pointer transition-colors ${
          isDragActive ? 'border-[#f5c518] bg-[#f5c51811]' : 'border-[#222] hover:border-[#333]'
        }`}>
          <input {...getInputProps()} />
          <div className="flex items-center justify-center gap-2 text-[#555] text-xs">
            <Upload size={12} />
            <span>{isDragActive ? 'Drop to analyze' : 'Upload screenshot for Chief to analyze'}</span>
          </div>
        </div>

        {/* Input */}
        <div className="p-4 pt-2 border-t border-[#1a1a1a]">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              className="chief-input flex-1 text-sm"
              placeholder="Ask Chief anything about your setup..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
            />
            <button onClick={() => sendMessage()} disabled={loading || !input.trim()}
              className="btn-chief !px-3 !py-2 disabled:opacity-50">
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
