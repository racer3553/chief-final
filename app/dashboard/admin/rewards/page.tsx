'use client'
import { Gift } from 'lucide-react'
export default function RewardsControllerPage() {
  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(244,114,182,0.20)' }}>
          <Gift size={18} style={{ color: '#f472b6' }} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-white">Rewards Controller</h1>
          <p className="text-xs text-slate-500 uppercase tracking-wider">Admin only</p>
        </div>
      </div>
      <div className="rounded-xl p-6 border" style={{ background: 'rgba(20,20,32,0.6)', borderColor: 'rgba(255,255,255,0.06)' }}>
        <p className="text-slate-400">Configure giveaway tiers, monthly raffles, sponsor codes, and partner payouts. Coming online soon.</p>
      </div>
    </div>
  )
}
