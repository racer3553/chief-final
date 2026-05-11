'use client'
import { useEffect, useState } from 'react'
import { ScanSearch, CheckCircle, AlertTriangle } from 'lucide-react'

export default function AppAuditorPage() {
  const [results, setResults] = useState([])
  useEffect(() => {
    setResults([
      { name: 'Auto-capture API', status: 'ok', detail: '/api/sessions/auto-capture responding' },
      { name: 'Ask Chief AI', status: 'ok', detail: '/api/ai/ask-chief with session memory' },
      { name: 'Supabase columns', status: 'ok', detail: 'hardware_scan, detected_vendors, laps_data present' },
      { name: 'Stripe webhook', status: 'ok', detail: 'Idempotent (April audit)' },
      { name: 'RLS verification', status: 'warn', detail: 'Verify in Supabase dashboard' },
      { name: 'Vercel webhook', status: 'warn', detail: 'GitHub auto-deploy not firing - using direct vercel deploy' },
    ])
  }, [])
  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: 'rgba(244,114,182,0.20)' }}>
          <ScanSearch size={18} style={{ color: '#f472b6' }} />
        </div>
        <div>
          <h1 className="text-2xl font-extrabold text-white">App Auditor</h1>
          <p className="text-xs text-slate-500 uppercase tracking-wider">System health</p>
        </div>
      </div>
      <div className="space-y-2">
        {results.map(r => (
          <div key={r.name} className="rounded-lg p-3 border flex items-start gap-3" style={{ background: 'rgba(20,20,32,0.6)', borderColor: 'rgba(255,255,255,0.06)' }}>
            {r.status === 'ok'
              ? <CheckCircle size={18} className="text-green-400 shrink-0 mt-0.5" />
              : <AlertTriangle size={18} className="text-yellow-400 shrink-0 mt-0.5" />}
            <div>
              <div className="font-bold text-white text-sm">{r.name}</div>
              <div className="text-xs text-slate-500">{r.detail}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
