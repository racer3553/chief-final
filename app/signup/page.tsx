'use client'
import { useState, Suspense } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { CheckCircle, Loader2 } from 'lucide-react'
import ChiefLogo from '@/components/shared/ChiefLogo'

const PLANS = [
  { id: 'starter', label: 'Starter', price: '$19/mo' },
  { id: 'pro', label: 'Pro', price: '$39/mo', popular: true },
  { id: 'elite', label: 'Elite', price: '$79/mo' },
]

function SignupForm() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const supabase = createClient()
  const [form, setForm] = useState({ name: '', email: '', password: '' })
  const [plan, setPlan] = useState(searchParams.get('plan') || 'pro')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const { data, error: signupError } = await supabase.auth.signUp({
      email: form.email, password: form.password,
      options: { data: { full_name: form.name } },
    })
    if (signupError) { setError(signupError.message); setLoading(false); return }
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, userId: data.user?.id, email: form.email }),
    })
    const { url } = await res.json()
    if (url) window.location.href = url
    else router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] checker-bg flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-lg">
        <Link href="/" className="flex flex-col items-center gap-3 mb-8">
          <ChiefLogo size={72} variant="mark" />
          <div className="text-center">
            <div className="font-display text-4xl text-[#f5c518] tracking-[0.2em]">CHIEF</div>
            <div className="font-mono-chief text-xs text-[#555] tracking-[0.22em] mt-1">BY WALKER SPORTS</div>
          </div>
        </Link>
        <div className="chief-panel-glow p-8 rounded-lg">
          <div className="chief-accent-line mb-6" />
          <h1 className="font-display text-3xl text-white tracking-wide mb-1">START FREE TRIAL</h1>
          <p className="text-[#888] text-sm mb-6">7 days free. Card charged after trial. Cancel anytime.</p>
          <div className="grid grid-cols-3 gap-2 mb-6">
            {PLANS.map(p => (
              <button key={p.id} type="button" onClick={() => setPlan(p.id)}
                className={`relative p-3 rounded border text-left transition-all ${plan === p.id ? 'border-[#f5c518] bg-[#f5c51811]' : 'border-[#222] bg-[#0d0d0d] hover:border-[#333]'}`}>
                {p.popular && <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-[#f5c518] text-black text-[9px] font-display px-2 py-0.5 rounded-full tracking-widest">HOT</div>}
                <div className="font-display text-sm text-white">{p.label}</div>
                <div className="font-mono-chief text-xs text-[#f5c518]">{p.price}</div>
                {plan === p.id && <CheckCircle size={13} className="absolute top-2 right-2 text-[#f5c518]" />}
              </button>
            ))}
          </div>
          <form onSubmit={handleSignup} className="space-y-4">
            <div>
              <label className="chief-label">FULL NAME</label>
              <input className="chief-input" type="text" placeholder="Your Name" value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} required />
            </div>
            <div>
              <label className="chief-label">EMAIL</label>
              <input className="chief-input" type="email" placeholder="you@team.com" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} required />
            </div>
            <div>
              <label className="chief-label">PASSWORD</label>
              <input className="chief-input" type="password" placeholder="Min 8 characters" value={form.password} onChange={e => setForm({ ...form, password: e.target.value })} minLength={8} required />
            </div>
            {error && <div className="bg-[#ff2d2d11] border border-[#ff2d2d33] rounded p-3 text-[#ff2d2d] text-sm">{error}</div>}
            <button type="submit" disabled={loading} className="btn-chief w-full justify-center text-xl py-3">
              {loading ? <Loader2 size={20} className="animate-spin" /> : 'START FREE TRIAL →'}
            </button>
          </form>
          <div className="mt-4 pt-4 border-t border-[#1a1a1a] text-center">
            <span className="text-[#888] text-sm">Already racing? </span>
            <Link href="/login" className="text-[#f5c518] text-sm hover:underline">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function SignupPage() {
  return <Suspense><SignupForm /></Suspense>
}
