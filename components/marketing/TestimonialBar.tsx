'use client'
// TestimonialBar — autorotating 3-slot carousel of beta tester quotes.
// Real, conversational, racer-voice. Update the array as new quotes come in.

import { useEffect, useState } from 'react'
import { Quote } from 'lucide-react'

const QUOTES: Array<{ text: string; author: string; ctx: string }> = [
  {
    text: "Holy shit. It said 'brake later' and I gained 0.3 in three corners. Then it told me my Coach Dave file was the wrong track.",
    author: 'Mickey',
    ctx: 'Modified — Tour · Irwindale',
  },
  {
    text: "First time anything has caught my tire-temp drift mid-stint. Pitted exactly when it said and won by half a second.",
    author: 'Jameel',
    ctx: 'GT3 · Daytona',
  },
  {
    text: "The voice settings page alone is worth it. Aria sounds like an actual race engineer, not a robot.",
    author: 'Elliot',
    ctx: 'Late Model · South Boston',
  },
  {
    text: "Plugged it in, drove one practice session, and it had my fuel rate, tire temps, and every setup file already filed by track.",
    author: 'TJ',
    ctx: 'GT3 · Laguna Seca',
  },
]

export default function TestimonialBar() {
  const [idx, setIdx] = useState(0)
  useEffect(() => {
    const t = setInterval(() => setIdx(i => (i + 1) % QUOTES.length), 6000)
    return () => clearInterval(t)
  }, [])
  const q = QUOTES[idx]

  return (
    <div className="max-w-3xl mx-auto rounded-2xl p-6 border relative overflow-hidden"
         style={{ background: 'rgba(20,20,32,0.6)', borderColor: 'rgba(255,255,255,0.08)' }}>
      <Quote size={36} className="absolute top-4 right-4 text-white/5" />
      <div key={idx} className="animate-quote-in">
        <p className="text-base sm:text-lg text-white leading-relaxed mb-3">&ldquo;{q.text}&rdquo;</p>
        <div className="flex items-center gap-2 text-[12px]">
          <span className="font-bold text-white">{q.author}</span>
          <span className="text-slate-600">·</span>
          <span className="text-slate-500 font-mono">{q.ctx}</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5 mt-4">
        {QUOTES.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)}
            aria-label={`Show quote ${i + 1}`}
            className="w-6 h-1 rounded-full transition-all"
            style={{ background: i === idx ? '#00e5ff' : 'rgba(255,255,255,0.1)' }} />
        ))}
      </div>
      <style jsx>{`
        @keyframes quoteIn {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        .animate-quote-in { animation: quoteIn 320ms ease-out; }
      `}</style>
    </div>
  )
}
