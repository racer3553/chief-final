'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { CheckCircle, ArrowRight, Brain, Settings, TrendingUp, Database, Zap, Star } from 'lucide-react'

export default function HomePage() {
  const [scrollY, setScrollY] = useState(0)
  useEffect(() => {
    const h = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  return (
    <div className="min-h-screen bg-[#0a0a0a] overflow-x-hidden">
      {/* NAV */}
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrollY > 60 ? 'bg-[#0a0a0a]/95 backdrop-blur-md border-b border-[#222]' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
          <div className="flex items-center gap-2">
            <span className="font-display text-2xl text-[#f5c518] tracking-widest">CHIEF</span>
            <span className="text-[#555] text-xs font-mono-chief">BY WALKER SPORTS</span>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/login" className="btn-ghost text-sm">Sign In</Link>
            <Link href="/signup" className="btn-chief !text-base !py-2 !px-5">Start Free Trial</Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="relative min-h-screen flex flex-col items-center justify-center pt-16 checker-bg">
        <div className="absolute inset-0" style={{ background: 'radial-gradient(ellipse 80% 50% at 50% 40%, #f5c51808 0%, transparent 70%)' }} />
        <div className="absolute bottom-0 left-0 right-0 h-32 bg-gradient-to-t from-[#0a0a0a] to-transparent" />
        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center animate-in">
          <div className="inline-flex items-center gap-2 bg-[#111] border border-[#333] rounded-full px-4 py-1.5 mb-8">
            <span className="w-2 h-2 rounded-full bg-[#39ff14] animate-pulse" />
            <span className="text-xs font-mono-chief text-[#888] tracking-widest">AI CREW CHIEF — NOW LIVE</span>
          </div>
          <div className="inline-block border-2 border-[#f5c518] bg-[#0d0d0d] px-8 py-4 mb-8 relative">
            <div className="absolute -top-px left-4 right-4 h-px bg-[#f5c518]" />
            <div className="absolute -bottom-px left-4 right-4 h-px bg-[#39ff14]" />
            <h1 className="font-display text-[80px] sm:text-[120px] leading-none tracking-wider text-[#f5c518]" style={{ textShadow: '0 0 40px #f5c51866' }}>
              CHIEF
            </h1>
            <p className="font-mono-chief text-xs tracking-[0.5em] text-[#888] mt-1">BY WALKER SPORTS</p>
          </div>
          <h2 className="font-display text-3xl sm:text-5xl tracking-wide text-white mb-4">
            YOUR AI CREW CHIEF.<br />
            <span className="text-[#f5c518]">EVERY LAP. EVERY RACE.</span>
          </h2>
          <p className="text-[#888] text-lg sm:text-xl max-w-2xl mx-auto mb-10">
            The only platform that remembers every setup change, every lap time, every driver feeling — and tells you what to do next to go faster.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="btn-chief text-xl py-4 px-8">
              Start Free 7-Day Trial <ArrowRight size={20} />
            </Link>
            <Link href="/pricing" className="btn-chief-outline text-xl py-4 px-8">View Pricing</Link>
          </div>
          <p className="text-[#555] text-sm mt-4 font-mono-chief">Card required · Billed after trial · Cancel anytime</p>
        </div>
      </section>

      {/* STATS */}
      <section className="py-12 border-y border-[#1a1a1a] bg-[#0d0d0d]">
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
          {[['RACE CHIEF', 'Real World Racing'], ['SIM CHIEF', 'Sim Racing'], ['8 CAR TYPES', 'Setup Templates'], ['24/7', 'Chief On Duty']].map(([val, label]) => (
            <div key={label}>
              <div className="font-display text-4xl text-[#f5c518]">{val}</div>
              <div className="text-[#888] text-sm font-mono-chief mt-1">{label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* RACE CHIEF */}
      <section className="py-24 px-4">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="chief-accent-line w-12" />
            <span className="font-mono-chief text-xs text-[#f5c518] tracking-widest">RACE CHIEF</span>
          </div>
          <h2 className="font-display text-5xl sm:text-7xl text-white mb-4">FOR <span className="text-[#f5c518]">REAL</span> RACERS</h2>
          <p className="text-[#888] text-xl max-w-2xl mb-12">Professional setup sheets for every car type. Chief remembers what worked — at every track, in every condition.</p>
          <div className="grid lg:grid-cols-2 gap-6">
            {[
              { icon: Settings, title: 'Dynamic Setup Sheets', desc: 'Dirt late model, sprint car, micro, pavement — every car type has its own complete sheet with every field that matters.' },
              { icon: Brain, title: 'Chief Memory', desc: 'Chief remembers every setup at every track. If stagger + rear bite got you a win at Eldora last spring, Chief will remind you.' },
              { icon: TrendingUp, title: 'Lap Time Intelligence', desc: 'Log every change and its outcome. Chief builds a picture of what makes your car fast.' },
              { icon: Database, title: 'Maintenance Tracker', desc: 'Full maintenance logs with parts, cost, intervals, and alerts. Never miss a service before a big race.' },
            ].map(f => (
              <div key={f.title} className="chief-panel p-6 hover:border-[#f5c51844] transition-colors group rounded-lg">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-[#f5c51811] border border-[#f5c51822] rounded group-hover:bg-[#f5c51822] transition-colors">
                    <f.icon size={20} className="text-[#f5c518]" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl text-white tracking-wide mb-2">{f.title}</h3>
                    <p className="text-[#888] text-sm leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* SIM CHIEF */}
      <section className="py-24 px-4 bg-[#0d0d0d]">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center gap-3 mb-3">
            <div className="h-0.5 w-12 bg-gradient-to-r from-[#00e5ff] to-[#39ff14]" />
            <span className="font-mono-chief text-xs text-[#00e5ff] tracking-widest">SIM CHIEF</span>
          </div>
          <h2 className="font-display text-5xl sm:text-7xl text-white mb-4">FOR <span className="text-[#00e5ff]">SIM</span> RACERS</h2>
          <p className="text-[#888] text-xl max-w-2xl mb-12">iRating growth. Setup mastery. FFB optimization. Chief tracks every change so you never lose a winning setup again.</p>
          <div className="grid lg:grid-cols-2 gap-6">
            {[
              { icon: Zap, title: 'FFB & Hardware Profiles', desc: 'Track every force feedback change — damping, smoothing, intensity, min force — and what it did to your feel.' },
              { icon: Settings, title: 'Full Garage Setup Log', desc: 'Store iRacing, AC, rFactor 2, AMS2 setups by car and track. Know exactly what worked and why.' },
              { icon: Brain, title: 'Screenshot Analysis', desc: 'Upload a screenshot of your sim setup. Chief reads it and makes recommendations based on your history.' },
              { icon: TrendingUp, title: 'iRating Growth Mode', desc: 'Chief tracks your iRating and incidents alongside setup changes to find the correlation to speed.' },
            ].map(f => (
              <div key={f.title} className="bg-[#111] border border-[#222] hover:border-[#00e5ff44] transition-colors p-6 rounded-lg group">
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-[#00e5ff11] border border-[#00e5ff22] rounded group-hover:bg-[#00e5ff22] transition-colors">
                    <f.icon size={20} className="text-[#00e5ff]" />
                  </div>
                  <div>
                    <h3 className="font-display text-xl text-white tracking-wide mb-2">{f.title}</h3>
                    <p className="text-[#888] text-sm leading-relaxed">{f.desc}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* PRICING PREVIEW */}
      <section className="py-24 px-4">
        <div className="max-w-5xl mx-auto text-center">
          <h2 className="font-display text-5xl sm:text-7xl text-white mb-4">PRICING</h2>
          <p className="text-[#888] mb-12">7-day free trial. Card required. Cancel anytime.</p>
          <div className="grid md:grid-cols-3 gap-6 mb-8">
            {[
              { name: 'Starter', price: 19, features: ['3 cars', '5 tracks', '50 AI asks/mo'], highlight: false },
              { name: 'Pro', price: 39, features: ['10 cars', 'Unlimited tracks', '500 AI asks/mo', 'Race + Sim Chief', 'Image analysis'], highlight: true },
              { name: 'Elite', price: 79, features: ['Unlimited everything', 'Unlimited AI asks', 'Team (10 members)'], highlight: false },
            ].map(plan => (
              <div key={plan.name} className={`rounded-lg p-6 ${plan.highlight ? 'bg-[#111] border-2 border-[#f5c518]' : 'chief-panel'}`}>
                <div className="font-display text-2xl text-white mb-1">{plan.name}</div>
                <div className="font-display text-5xl text-[#f5c518] mb-4">${plan.price}<span className="text-[#555] text-lg font-mono-chief">/mo</span></div>
                <ul className="space-y-2 mb-6">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-[#888]">
                      <CheckCircle size={13} className="text-[#39ff14]" />{f}
                    </li>
                  ))}
                </ul>
                <Link href={`/signup?plan=${plan.name.toLowerCase()}`}
                  className={`block w-full text-center py-3 rounded font-display text-lg tracking-wide transition-all ${plan.highlight ? 'bg-[#f5c518] text-black hover:bg-[#ffd700]' : 'border border-[#333] text-white hover:border-[#555]'}`}>
                  Start Free Trial
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="border-t border-[#1a1a1a] py-8 px-4 text-center">
        <div className="font-display text-2xl text-[#f5c518] tracking-widest mb-1">CHIEF</div>
        <div className="font-mono-chief text-xs text-[#555]">BY WALKER SPORTS · © 2025 Walker Sports LLC</div>
      </footer>
    </div>
  )
}
