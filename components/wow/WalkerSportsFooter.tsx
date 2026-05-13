'use client'
// Walker Sports footer — sits at the bottom of every signed-in dashboard page.
// Surfaces the family-business cred (WPF, Ventus) that Ben built CHIEF on top of.
// Tiny, restrained, but always there.

import Link from 'next/link'

export default function WalkerSportsFooter() {
  return (
    <footer className="mt-12 pt-6 pb-8 border-t" style={{ borderColor: 'rgba(255,255,255,0.05)' }}>
      <div className="max-w-5xl mx-auto px-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <div className="text-[10px] font-bold tracking-[0.22em] text-slate-500 uppercase">
            By Walker Sports
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[10px] text-slate-600">
            <span className="w-1 h-1 rounded-full bg-slate-700" />
            <a href="https://walkerperformancefiltration.com" target="_blank" rel="noreferrer"
               className="hover:text-cyan-300 transition-colors uppercase tracking-wider">
              Walker Performance Filtration
            </a>
            <span className="w-1 h-1 rounded-full bg-slate-700" />
            <a href="https://ventusfiltration.com" target="_blank" rel="noreferrer"
               className="hover:text-cyan-300 transition-colors uppercase tracking-wider">
              Ventus Filtration
            </a>
          </div>
        </div>
        <div className="flex items-center gap-4 text-[10px] tracking-wider uppercase text-slate-500">
          <Link href="/pricing"  className="hover:text-white">Pricing</Link>
          <Link href="/dashboard/account" className="hover:text-white">Account</Link>
          <a href="https://discord.gg/" target="_blank" rel="noreferrer" className="hover:text-white">Discord</a>
        </div>
      </div>
      <div className="mt-4 text-center text-[9.5px] text-slate-700 tracking-[0.2em] uppercase">
        © {new Date().getFullYear()} Walker Sports · Chief — AI Crew Chief · Built for racers
      </div>
    </footer>
  )
}
