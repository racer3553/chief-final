'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { CreditCard, CheckCircle, ArrowRight, Loader2, ExternalLink } from 'lucide-react'
import Link from 'next/link'

const PLANS = [
  { id: 'starter', name: 'Starter', price: 19, features: ['3 cars', '5 tracks', '50 AI asks/mo', 'Race or Sim Chief'] },
  { id: 'pro', name: 'Pro', price: 39, features: ['10 cars', 'Unlimited tracks', '500 AI asks/mo', 'Race + Sim Chief', 'Image analysis', 'Team (3 members)'], popular: true },
  { id: 'elite', name: 'Elite', price: 79, features: ['Unlimited everything', 'Unlimited AI asks', 'Team (10 members)', 'API access'] },
]

export default function BillingPage() {
  const supabase = createClient()
  const [profile, setProfile] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [portalLoading, setPortalLoading] = useState(false)

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data)
      setLoading(false)
    }
    fetchProfile()
  }, [])

  const handlePortal = async () => {
    setPortalLoading(true)
    const res = await fetch('/api/stripe/portal', { method: 'POST' })
    const { url } = await res.json()
    if (url) window.location.href = url
    setPortalLoading(false)
  }

  const handleUpgrade = async (plan: string) => {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const res = await fetch('/api/stripe/checkout', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ plan, userId: user.id, email: profile?.email }),
    })
    const { url } = await res.json()
    if (url) window.location.href = url
  }

  if (loading) return (
    <div className="flex justify-center items-center py-20">
      <Loader2 size={24} className="animate-spin text-[#555]" />
    </div>
  )

  const isTrialing = profile?.plan === 'trial'
  const trialDaysLeft = profile?.trial_ends_at
    ? Math.max(0, Math.ceil((new Date(profile.trial_ends_at).getTime() - Date.now()) / 86400000))
    : 0

  return (
    <div className="max-w-4xl space-y-6 animate-in">
      <div>
        <h1 className="font-display text-3xl text-white tracking-wide">BILLING</h1>
        <p className="text-[#888] text-sm mt-1">Manage your Chief subscription</p>
      </div>

      {/* Current status */}
      <div className="chief-panel-glow p-6 rounded-lg">
        <div className="chief-accent-line mb-4" />
        <div className="flex items-start justify-between">
          <div>
            <div className="font-display text-xl text-white tracking-wide mb-1">
              CURRENT PLAN: <span className="text-[#f5c518]">{(profile?.plan || 'TRIAL').toUpperCase()}</span>
            </div>
            <div className="font-mono text-sm text-[#888]">
              Status: <span className={profile?.subscription_status === 'active' ? 'text-[#39ff14]' : profile?.subscription_status === 'trialing' ? 'text-[#f5c518]' : 'text-[#ff2d2d]'}>
                {profile?.subscription_status || 'trial'}
              </span>
            </div>
            {isTrialing && (
              <div className="mt-2 text-sm text-[#f5c518]">
                {trialDaysLeft > 0 ? `${trialDaysLeft} days left in trial` : 'Trial expired — upgrade to continue'}
              </div>
            )}
          </div>
          {profile?.stripe_subscription_id && (
            <button onClick={handlePortal} disabled={portalLoading}
              className="flex items-center gap-2 btn-ghost">
              {portalLoading ? <Loader2 size={14} className="animate-spin" /> : <ExternalLink size={14} />}
              Manage Billing
            </button>
          )}
        </div>
      </div>

      {/* Plans */}
      <div>
        <h2 className="font-display text-xl text-white tracking-wide mb-4">
          {isTrialing || !profile?.stripe_subscription_id ? 'CHOOSE YOUR PLAN' : 'CHANGE PLAN'}
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          {PLANS.map(plan => {
            const isCurrent = profile?.plan === plan.id
            return (
              <div key={plan.id} className={`relative rounded-lg p-5 ${
                plan.popular ? 'bg-[#111] border-2 border-[#f5c518]' : 'chief-panel'
              }`}>
                {plan.popular && (
                  <div className="absolute -top-2.5 left-1/2 -translate-x-1/2 bg-[#f5c518] text-black font-display text-xs tracking-widest px-3 py-0.5 rounded-full">
                    POPULAR
                  </div>
                )}
                <div className="font-display text-2xl text-white tracking-wider mb-1">{plan.name}</div>
                <div className="flex items-end gap-1 mb-4">
                  <span className="font-display text-4xl" style={{ color: plan.popular ? '#f5c518' : '#f0f0f0' }}>${plan.price}</span>
                  <span className="text-[#555] font-mono mb-1">/mo</span>
                </div>
                <ul className="space-y-1.5 mb-5">
                  {plan.features.map(f => (
                    <li key={f} className="flex items-center gap-2 text-sm text-[#888]">
                      <CheckCircle size={12} className="text-[#39ff14] shrink-0" />
                      {f}
                    </li>
                  ))}
                </ul>
                {isCurrent ? (
                  <div className="badge-green w-full text-center py-2 text-sm">CURRENT PLAN</div>
                ) : (
                  <button onClick={() => handleUpgrade(plan.id)}
                    className={`w-full py-2.5 rounded font-display text-sm tracking-wide transition-all ${
                      plan.popular ? 'bg-[#f5c518] text-black hover:bg-[#ffd700]' : 'btn-chief-outline text-sm'
                    }`}>
                    {isTrialing ? 'Start Trial on This Plan' : 'Switch to This Plan'} <ArrowRight size={13} className="inline ml-1" />
                  </button>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Limits */}
      <div className="chief-panel p-5 rounded-lg">
        <div className="font-display text-sm text-white tracking-widest mb-4">YOUR LIMITS</div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {[
            { label: 'Cars', used: 0, limit: profile?.cars_limit },
            { label: 'Tracks', used: 0, limit: profile?.tracks_limit },
            { label: 'Plan', used: null, limit: null, value: (profile?.plan || 'trial').toUpperCase() },
          ].map(item => (
            <div key={item.label} className="bg-[#0d0d0d] border border-[#1a1a1a] rounded p-3">
              <div className="chief-label">{item.label}</div>
              {item.value ? (
                <div className="font-mono text-sm text-[#f5c518]">{item.value}</div>
              ) : (
                <div className="font-mono text-sm text-[#f0f0f0]">
                  {item.used} / {item.limit === 999 ? '∞' : item.limit}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <p className="text-[#444] text-xs font-mono text-center">
        Questions? Email support@chiefbywalkersports.com
      </p>
    </div>
  )
}
