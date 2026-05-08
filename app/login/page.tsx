'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true); setError('')
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) { setError(error.message); setLoading(false); return }
    router.push('/dashboard')
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] checker-bg flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="block text-center mb-8">
          <div className="font-display text-4xl text-[#f5c518] tracking-widest">CHIEF</div>
          <div className="font-mono-chief text-xs text-[#555] tracking-widest">BY WALKER SPORTS</div>
        </Link>
        <div className="chief-panel-glow p-8 rounded-lg">
          <div className="chief-accent-line mb-6" />
          <h1 className="font-display text-3xl text-white tracking-wide mb-6">SIGN IN</h1>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label className="chief-label">EMAIL</label>
              <input type="email" className="chief-input" placeholder="you@team.com" value={email} onChange={e => setEmail(e.target.value)} required />
            </div>
            <div>
              <label className="chief-label">PASSWORD</label>
              <input type="password" className="chief-input" placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)} required />
            </div>
            {error && <div className="bg-[#ff2d2d11] border border-[#ff2d2d33] rounded p-3 text-[#ff2d2d] text-sm">{error}</div>}
            <button type="submit" disabled={loading} className="btn-chief w-full justify-center text-xl py-3">
              {loading ? <Loader2 size={20} className="animate-spin" /> : 'SIGN IN'}
            </button>
          </form>
          <div className="mt-6 pt-4 border-t border-[#1a1a1a] text-center">
            <span className="text-[#888] text-sm">No account? </span>
            <Link href="/signup" className="text-[#f5c518] text-sm hover:underline">Start free trial</Link>
          </div>
        </div>
      </div>
    </div>
  )
}
