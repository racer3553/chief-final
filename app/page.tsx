'use client'
import Link from 'next/link'
import { useState, useEffect } from 'react'
import { CheckCircle, ArrowRight, Brain, Settings, TrendingUp, Database, Zap, Headphones, Shield, Lock, Mic, Radio, Flag, Wrench, Gauge } from 'lucide-react'
import ChiefLogo from '@/components/shared/ChiefLogo'

export default function HomePage() {
  const [scrollY, setScrollY] = useState(0)
  useEffect(() => {
    const h = () => setScrollY(window.scrollY)
    window.addEventListener('scroll', h, { passive: true })
    return () => window.removeEventListener('scroll', h)
  }, [])

  return (
    <div className="min-h-screen overflow-x-hidden" style={{ background: '#0a0a14' }}>
      <nav className={`fixed top-0 left-0 right-0 z-50 transition-all duration-300 ${scrollY > 60 ? 'bg-black/95 shadow-lg border-b border-slate-800' : 'bg-transparent'}`}>
        <div className="max-w-7xl mx-auto px-4 flex items-center justify-between h-16">
          <Link href="/" className="flex items-center gap-2.5 group">
            <div className="group-hover:scale-105 transition-transform">
              <ChiefLogo size={34} variant="mark" />
            </div>
            <div className="leading-none hidden sm:block">
              <div className="text-[15px] font-black tracking-[0.2em] text-white">CHIEF</div>
              <div className="text-[8px] font-bold tracking-[0.22em] text-slate-500 uppercase mt-1">By Walker Sports</div>
            </div>
          </Link>
          <div className="flex items-center gap-3">
            <Link href="/install" className="hidden sm:inline-flex items-center gap-1.5 text-sm font-bold px-3 py-2 rounded-md border-2"
              style={{ borderColor: '#00e5ff', color: '#00e5ff', background: 'rgba(0,229,255,0.06)' }}>
              ⬇ Download
            </Link>
            <Link href="/login" className="text-sm font-semibold text-slate-300 hover:text-white transition-colors px-4 py-2">Sign In</Link>
            <Link href="/signup" className="btn-chief !text-sm !py-2 !px-5">Start Free Trial</Link>
          </div>
        </div>
      </nav>

      <section className="relative min-h-screen flex flex-col items-center justify-center pt-16 bg-black overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] bg-gradient-to-r from-green-500/8 via-transparent to-yellow-500/8 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 right-0 h-48 bg-gradient-to-t from-[#0a0a14] to-transparent pointer-events-none" />

        <div className="relative z-10 max-w-5xl mx-auto px-4 text-center">
          <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 rounded-full px-4 py-1.5 mb-10 backdrop-blur-sm">
            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-xs font-semibold text-slate-400 tracking-wide">AI CREW CHIEF — NOW LIVE</span>
          </div>

          <div className="flex flex-col items-center gap-4 mb-8">
            <ChiefLogo size={120} variant="mark" />
            <img src="/images/logo-chief-banner.png" alt="CHIEF AI" className="w-full max-w-2xl h-auto object-contain"
              style={{ filter: 'drop-shadow(0 0 40px rgba(163,255,0,0.3))' }} />
          </div>

          <h2 className="text-2xl sm:text-4xl font-bold text-white mb-4">
            Your Chief.<br />
            <span style={{ color: '#a3ff00' }}>Every Lap. Every Race.</span>
          </h2>
          <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-6">
            The only AI crew chief that remembers every setup change, every lap time, every driver feeling — and tells you exactly what to do next to go faster.
          </p>

          <div className="flex flex-wrap items-center justify-center gap-2 mb-8 text-xs text-slate-500">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-800 bg-slate-900/40"><Headphones size={12} className="text-cyan-400" /> Live coaching</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-800 bg-slate-900/40"><Brain size={12} className="text-yellow-400" /> Setup memory</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-800 bg-slate-900/40"><Radio size={12} className="text-red-400" /> Spotter intel</span>
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border border-slate-800 bg-slate-900/40"><Lock size={12} className="text-green-400" /> Private to you</span>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link href="/signup" className="btn-chief text-lg py-3.5 px-8">
              Start Free 30-Day Trial <ArrowRight size={18} />
            </Link>
            <Link href="#pricing" className="text-lg py-3.5 px-8 font-semibold text-slate-300 hover:text-white border border-slate-700 rounded-md hover:border-slate-500 transition-all">View Pricing</Link>
          </div>
          <p className="text-slate-600 text-sm mt-4">Card required · Billed after trial · Cancel anytime</p>
        </div>
      </section>

      <section className="py-20 px-4 border-y border-white/[0.06]" style={{ background: 'linear-gradient(180deg, #050510 0%, #08080f 100%)' }}>
        <div className="max-w-5xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 mb-4">
            <Mic size={14} className="text-cyan-400" />
            <span className="text-xs font-bold tracking-widest uppercase" style={{ color: '#06b6d4' }}>Voice + AI</span>
          </div>
          <h2 className="text-3xl sm:text-5xl font-extrabold text-white mb-4">Talk to your Chief.</h2>
          <p className="text-lg text-slate-400 max-w-2xl mx-auto mb-10">
            Press the mic. Ask anything. Chief listens, remembers, and answers in your headset.
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { q: '"Chief, what was my setup last time at Eldora?"', a: 'Pulls your last session, gives you the exact .sto file.' },
              { q: '"Track temp is up 15. What do I change?"', a: 'Cross-references your history. Tells you tire pressure + camber adjustments.' },
              { q: '"How do I gain a tenth in turn 3?"', a: 'Compares your line vs your fast laps. Specific brake + throttle advice.' },
            ].map((item, i) => (
              <div key={i} className="text-left rounded-xl p-5 border" style={{ background: 'rgba(20,20,32,0.6)', borderColor: 'rgba(6,182,212,0.18)' }}>
                <div className="flex items-start gap-3 mb-3">
                  <div className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center" style={{ background: 'rgba(6,182,212,0.15)' }}>
                    <Headphones size={14} className="text-cyan-400" />
                  </div>
                  <p className="text-sm text-slate-200 italic">{item.q}</p>
                </div>
                <div className="pl-11 text-xs text-slate-500 leading-relaxed">{item.a}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-14 px-4" style={{ background: '#0a0a14' }}>
        <div className="max-w-4xl mx-auto rounded-2xl p-8 border" style={{ background: 'linear-gradient(135deg, rgba(163,255,0,0.06), rgba(6,182,212,0.06))', borderColor: 'rgba(163,255,0,0.25)' }}>
          <div className="flex flex-col md:flex-row items-center gap-6 text-center md:text-left">
            <div className="shrink-0 w-16 h-16 rounded-2xl flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #a3ff00, #06b6d4)' }}>
              <Flag size={28} className="text-black" />
            </div>
            <div className="flex-1">
              <div className="text-xs font-bold tracking-wider uppercase mb-1" style={{ color: '#a3ff00' }}>Auto-Capture Active</div>
              <div className="text-xl font-bold text-white mb-2">Every iRacing session saves to Chief automatically.</div>
              <p className="text-sm text-slate-400">Just drive. Chief captures the car, track, every lap, fuel use, weather, your wheel/pedal settings — all of it. Ask later, it remembers.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="py-12 border-y border-white/[0.04]" style={{ background: '#080810' }}>
        <div className="max-w-5xl mx-auto px-4 grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { val: 'RACE CHIEF', label: 'Real World Racing', color: '#ef4444', icon: Flag },
            { val: 'SIM CHIEF', label: 'Sim Racing', color: '#3b82f6', icon: Gauge },
            { val: 'GROWING LIBRARY', label: 'Vehicle & Setup Templates', color: '#f5c518', icon: Database },
            { val: '24/7', label: 'Chief On Duty', color: '#00e5c8', icon: Headphones },
          ].map((item) => {
            const Icon = item.icon
            return (
              <div key={item.label} className="text-center py-5 px-3 rounded-xl border border-white/[0.04]" style={{ background: item.color + '12' }}>
                <Icon size={18} style={{ color: item.color }} className="mx-auto mb-2" />
                <div className="text-xl sm:text-2xl font-extrabold tracking-wide" style={{ color: item.color }}>{item.val}</div>
                <div className="text-[11px] text-slate-500 font-semibold mt-1.5 uppercase tracking-wider">{item.label}</div>
              </div>
            )
          })}
        </div>
      </section>

      <section className="py-24 px-4" style={{ background: 'linear-gradient(180deg, #0c0c16 0%, #10101a 100%)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="h-[3px] w-12 rounded mb-3" style={{ background: '#dc2626' }} />
          <span className="text-xs font-bold tracking-wider" style={{ color: '#dc2626' }}>RACE CHIEF</span>
          <h2 className="text-4xl sm:text-5xl font-extrabold mt-2 mb-4" style={{ color: '#f1f5f9' }}>For <span style={{ color: '#dc2626' }}>Real</span> Racers</h2>
          <p className="text-lg max-w-2xl mb-12" style={{ color: '#64748b' }}>Professional setup sheets for every car type. Chief remembers what worked — at every track, in every condition.</p>
          <div className="grid lg:grid-cols-2 gap-4">
            {[
              { icon: Settings, title: 'Dynamic Setup Sheets', desc: 'Dirt late model, sprint car, micro, pavement — every car type has its own complete sheet with every field that matters.' },
              { icon: Brain, title: 'Chief Memory', desc: 'Chief remembers every setup at every track. If stagger plus rear bite got you a win at Eldora last spring, Chief reminds you.' },
              { icon: TrendingUp, title: 'Lap Time Intelligence', desc: 'Log every change and its outcome. Chief builds a picture of what makes your car fast.' },
              { icon: Wrench, title: 'Maintenance Tracker', desc: 'Full maintenance logs with parts, cost, intervals, and alerts. Never miss a service before a big race.' },
            ].map(f => {
              const Icon = f.icon
              return (
                <div key={f.title} className="p-6 rounded-xl border border-white/[0.06] hover:border-white/[0.10] transition-all" style={{ background: 'rgba(20,20,32,0.8)' }}>
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg shrink-0" style={{ background: 'rgba(220,38,38,0.10)' }}>
                      <Icon size={20} style={{ color: '#f87171' }} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold mb-1" style={{ color: '#f1f5f9' }}>{f.title}</h3>
                      <p className="text-sm leading-relaxed" style={{ color: '#8892a4' }}>{f.desc}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="py-24 px-4" style={{ background: 'linear-gradient(180deg, #10101a 0%, #0c0c16 100%)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="h-[3px] w-12 rounded mb-3" style={{ background: '#3b82f6' }} />
          <span className="text-xs font-bold tracking-wider" style={{ color: '#3b82f6' }}>SIM CHIEF</span>
          <h2 className="text-4xl sm:text-5xl font-extrabold mt-2 mb-4" style={{ color: '#f1f5f9' }}>For <span style={{ color: '#3b82f6' }}>Sim</span> Racers</h2>
          <p className="text-lg max-w-2xl mb-12" style={{ color: '#64748b' }}>iRating growth. Setup mastery. FFB optimization. Chief tracks every change so you never lose a winning setup again.</p>
          <div className="grid lg:grid-cols-2 gap-4">
            {[
              { icon: Zap, title: 'FFB and Hardware Profiles', desc: 'Auto-captures Simucube, Fanatec, Moza, Thrustmaster, Asetek — whichever wheel you use, Chief remembers it per car/track.' },
              { icon: Settings, title: 'Full Garage Setup Log', desc: 'Stores iRacing, AC, rFactor 2, AMS2 setups by car and track. Know exactly what worked and why.' },
              { icon: Brain, title: 'Coach Dave Integration', desc: 'Pulls your Coach Dave Delta setup files in alongside your Chief sessions. Two coaches, one brain.' },
              { icon: TrendingUp, title: 'iRating Growth Mode', desc: 'Chief tracks your iRating and incidents alongside setup changes to find the correlation to speed.' },
            ].map(f => {
              const Icon = f.icon
              return (
                <div key={f.title} className="p-6 rounded-xl border border-white/[0.06] hover:border-white/[0.10] transition-all" style={{ background: 'rgba(20,20,32,0.8)' }}>
                  <div className="flex items-start gap-4">
                    <div className="p-3 rounded-lg shrink-0" style={{ background: 'rgba(59,130,246,0.10)' }}>
                      <Icon size={20} style={{ color: '#60a5fa' }} />
                    </div>
                    <div>
                      <h3 className="text-lg font-bold mb-1" style={{ color: '#f1f5f9' }}>{f.title}</h3>
                      <p className="text-sm leading-relaxed" style={{ color: '#8892a4' }}>{f.desc}</p>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section className="py-20 px-4" style={{ background: '#08080f' }}>
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center gap-2 mb-3">
              <Shield size={14} style={{ color: '#a3ff00' }} />
              <span className="text-xs font-bold tracking-widest uppercase" style={{ color: '#a3ff00' }}>Private and Secure</span>
            </div>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-3">Your data. Your account. Period.</h2>
            <p className="text-slate-400 max-w-2xl mx-auto">Every session, setup, lap time, and AI conversation is locked to your account. Nothing is shared, sold, or shown to anyone — including other Chief users.</p>
          </div>
          <div className="grid sm:grid-cols-3 gap-4">
            {[
              { icon: Lock, title: 'Encrypted in transit', desc: 'TLS 1.3 on every request. Same standard banks use.' },
              { icon: Shield, title: 'Per-user data isolation', desc: 'Row-level security in our database. Your data is invisible to other accounts.' },
              { icon: Database, title: 'Yours to export', desc: 'Download every session and setup as JSON anytime. Your work, your IP.' },
            ].map(s => {
              const Icon = s.icon
              return (
                <div key={s.title} className="rounded-xl p-5 border text-center" style={{ background: 'rgba(20,20,32,0.5)', borderColor: 'rgba(163,255,0,0.15)' }}>
                  <div className="w-10 h-10 rounded-full mx-auto mb-3 flex items-center justify-center" style={{ background: 'rgba(163,255,0,0.10)' }}>
                    <Icon size={18} style={{ color: '#a3ff00' }} />
                  </div>
                  <div className="text-sm font-bold text-white mb-1.5">{s.title}</div>
                  <div className="text-xs text-slate-500 leading-relaxed">{s.desc}</div>
                </div>
              )
            })}
          </div>
        </div>
      </section>

      <section id="pricing" className="py-24 px-4" style={{ background: 'linear-gradient(180deg, #0c0c16 0%, #0e0e18 100%)' }}>
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-extrabold mb-4" style={{ color: '#f1f5f9' }}>Pricing</h2>
            <p className="mb-3" style={{ color: '#64748b' }}>Two products. Three tiers. Pick your game.</p>
          </div>
          <div className="grid lg:grid-cols-2 gap-8">
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="h-[3px] w-8 rounded" style={{ background: '#3b82f6' }} />
                <span className="text-xl font-bold" style={{ color: '#3b82f6' }}>Sim Chief</span>
              </div>
              <div className="space-y-3">
                {[
                  { tier: 'Single Track', price: 3, plan: 'single_track', features: ['1 track', '1 car', 'Setup history', 'Basic AI asks'] },
                  { tier: 'Five Tracks', price: 7, plan: 'five_tracks', features: ['5 tracks', '3 cars', 'Setup history', '100 AI asks/mo', 'Screenshot analysis'] },
                  { tier: 'Unlimited', price: 12, plan: 'unlimited', features: ['Unlimited tracks and cars', 'Full setup history', 'Unlimited AI asks', 'Screenshot analysis', 'iRating tracking'], highlight: true },
                ].map(p => (
                  <div key={p.tier} className="p-5 rounded-xl border transition-all"
                    style={{ background: 'rgba(20,20,32,0.8)', borderColor: p.highlight ? '#3b82f6' : 'rgba(255,255,255,0.06)', boxShadow: p.highlight ? '0 0 20px rgba(59,130,246,0.10)' : 'none' }}>
                    <div className="flex items-baseline justify-between mb-3">
                      <div className="font-bold" style={{ color: '#e2e8f0' }}>{p.tier}</div>
                      <div className="text-3xl font-extrabold" style={{ color: '#3b82f6' }}>${p.price}<span className="text-sm font-medium" style={{ color: '#64748b' }}>/mo</span></div>
                    </div>
                    <ul className="space-y-1.5 mb-4">
                      {p.features.map(f => (
                        <li key={f} className="flex items-center gap-2 text-sm" style={{ color: '#94a3b8' }}>
                          <CheckCircle size={14} style={{ color: '#3b82f6' }} className="shrink-0" />{f}
                        </li>
                      ))}
                    </ul>
                    <Link href={`/signup?product=sim&plan=${p.plan}`}
                      className="block w-full text-center py-2.5 rounded-md text-sm font-semibold transition-all"
                      style={p.highlight ? { background: '#3b82f6', color: 'white' } : { border: '1px solid rgba(255,255,255,0.10)', color: '#94a3b8' }}>
                      Start Free Trial
                    </Link>
                  </div>
                ))}
              </div>
            </div>
            <div>
              <div className="flex items-center gap-2 mb-6">
                <div className="h-[3px] w-8 rounded" style={{ background: '#dc2626' }} />
                <span className="text-xl font-bold" style={{ color: '#dc2626' }}>Race Chief</span>
              </div>
              <div className="space-y-3">
                {[
                  { tier: 'Single Track', price: 5, plan: 'single_track', features: ['1 track', '1 car', 'Setup sheets', 'Basic AI asks'] },
                  { tier: 'Five Tracks', price: 10, plan: 'five_tracks', features: ['5 tracks', '5 cars', 'Setup sheets', '100 AI asks/mo', 'Maintenance tracker'] },
                  { tier: 'Unlimited', price: 20, plan: 'unlimited', features: ['Unlimited tracks and cars', 'Full setup sheets', 'Unlimited AI asks', 'Maintenance tracking', 'Chief memory', 'Team (3 members)'], highlight: true },
                ].map(p => (
                  <div key={p.tier} className="p-5 rounded-xl border transition-all"
                    style={{ background: 'rgba(20,20,32,0.8)', borderColor: p.highlight ? '#dc2626' : 'rgba(255,255,255,0.06)', boxShadow: p.highlight ? '0 0 20px rgba(220,38,38,0.10)' : 'none' }}>
                    <div className="flex items-baseline justify-between mb-3">
                      <div className="font-bold" style={{ color: '#e2e8f0' }}>{p.tier}</div>
                      <div className="text-3xl font-extrabold" style={{ color: '#dc2626' }}>${p.price}<span className="text-sm font-medium" style={{ color: '#64748b' }}>/mo</span></div>
                    </div>
                    <ul className="space-y-1.5 mb-4">
                      {p.features.map(f => (
                        <li key={f} className="flex items-center gap-2 text-sm" style={{ color: '#94a3b8' }}>
                          <CheckCircle size={14} style={{ color: '#dc2626' }} className="shrink-0" />{f}
                        </li>
                      ))}
                    </ul>
                    <Link href={`/signup?product=real&plan=${p.plan}`}
                      className="block w-full text-center py-2.5 rounded-md text-sm font-semibold transition-all"
                      style={p.highlight ? { background: '#dc2626', color: 'white' } : { border: '1px solid rgba(255,255,255,0.10)', color: '#94a3b8' }}>
                      Start Free Trial
                    </Link>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-800 py-10 px-4 text-center bg-black">
        <div className="flex flex-col items-center gap-2 mb-4">
          <ChiefLogo size={48} variant="mark" />
          <div className="text-[18px] font-black tracking-[0.22em] text-white">CHIEF</div>
          <div className="text-[9px] font-bold tracking-[0.32em] text-slate-500 uppercase">AI · Crew · Chief · By Walker Sports</div>
        </div>
        <div className="text-xs text-slate-600 font-medium">© 2026 Walker Sports LLC · All Rights Reserved</div>
        <div className="flex items-center justify-center gap-4 mt-3">
          <Link href="/login" className="text-xs text-slate-500 hover:text-white transition-colors">Sign In</Link>
          <Link href="/signup" className="text-xs text-slate-500 hover:text-white transition-colors">Free Trial</Link>
          <a href="https://walkerperformancefiltration.com" target="_blank" rel="noopener noreferrer" className="text-xs text-slate-500 hover:text-red-500 transition-colors">Walker Performance</a>
        </div>
      </footer>
    </div>
  )
}
