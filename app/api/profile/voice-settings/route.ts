// GET — returns the user's voice settings (or defaults).
//        Used by both the dashboard slider page AND the desktop daemon polling.
// POST — saves the user's voice settings.
//        Used by the dashboard slider page.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'

const DEFAULTS = { volume: 80, voice: '', coach_freq: 'all', rate: '-5%' }

async function resolveUser(req: Request) {
  // Cookie path first (browser)
  try {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (user) return { user, svc: null as any }
  } catch {}
  // Email path (desktop daemon via ?email=...)
  const url = new URL(req.url)
  const email = (url.searchParams.get('email') || '').toLowerCase().trim()
  if (!email) return { user: null, svc: null }
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  const svc = createServiceClient(supaUrl, serviceKey)
  try {
    const { data: prof } = await svc.from('profiles').select('id, email').eq('email', email).maybeSingle()
    if (prof?.id) return { user: { id: prof.id, email: prof.email }, svc }
    const { data: lu } = await (svc as any).auth.admin.listUsers({ page: 1, perPage: 1000 })
    const au = (lu?.users || []).find((u: any) => (u.email || '').toLowerCase() === email)
    if (au?.id) return { user: { id: au.id, email: au.email }, svc }
  } catch {}
  return { user: null, svc: null }
}

export async function GET(req: Request) {
  const { user, svc } = await resolveUser(req)
  if (!user) return NextResponse.json({ ok: true, settings: DEFAULTS, note: 'no user — defaults' })
  const sb = svc || createClient()
  const { data } = await sb.from('profiles').select('voice_settings').eq('id', user.id).maybeSingle()
  return NextResponse.json({ ok: true, settings: { ...DEFAULTS, ...(data?.voice_settings || {}) } })
}

export async function POST(req: Request) {
  try {
    const sb = createClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })
    const body = await req.json()
    const settings = {
      volume: Math.max(0, Math.min(100, Number(body.volume ?? DEFAULTS.volume))),
      voice: String(body.voice || DEFAULTS.voice).slice(0, 80),
      coach_freq: String(body.coach_freq || DEFAULTS.coach_freq).slice(0, 30),
      rate: String(body.rate || DEFAULTS.rate).slice(0, 10),
    }
    const { error } = await sb.from('profiles').update({ voice_settings: settings }).eq('id', user.id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, settings })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
