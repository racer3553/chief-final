// /api/lights/me — GET reads the user's lights config; POST upserts it.
// Used by the dashboard /dashboard/lights page AND by the desktop daemon
// (chief-lights.py) to pull the latest device map + effect prefs on boot.

import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSvc } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

const DEFAULT_PREFS = {
  rpm: true, brake: true, sun: true, lightning: true,
  flag: true, crash: true, pit: true, offtrack: true, brightness: 85,
}

async function resolveUserId(req: Request, sb: any): Promise<string | null> {
  // Try cookie auth first
  try {
    const { data: { user } } = await sb.auth.getUser()
    if (user?.id) return user.id
  } catch {}
  // Daemon path — email header + service role
  const email = (new URL(req.url)).searchParams.get('email')
              || req.headers.get('x-chief-email')
              || ''
  if (email) {
    const svc = createSvc(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data } = await svc.from('profiles').select('id').ilike('email', email).maybeSingle()
    if (data?.id) return data.id
    try {
      const { data: lu } = await (svc as any).auth.admin.listUsers({ page: 1, perPage: 1000 })
      const u = (lu?.users || []).find((u: any) => (u.email || '').toLowerCase() === email.toLowerCase())
      if (u?.id) return u.id
    } catch {}
  }
  return null
}

export async function GET(req: Request) {
  const sb = createClient()
  const userId = await resolveUserId(req, sb)
  if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const svc = createSvc(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data, error } = await svc.from('user_lights').select('*').eq('user_id', userId).maybeSingle()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ok: true,
    config: data || {
      user_id: userId,
      devices: [],
      zones: {},
      effect_prefs: DEFAULT_PREFS,
      last_scan_at: null,
      scan_request_at: null,
      scan_results: null,
    },
  })
}

export async function POST(req: Request) {
  const sb = createClient()
  const userId = await resolveUserId(req, sb)
  if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json()
  const svc = createSvc(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)

  const update: any = { user_id: userId }
  if (Array.isArray(body.devices))       update.devices = body.devices
  if (body.zones && typeof body.zones === 'object') update.zones = body.zones
  if (body.effect_prefs && typeof body.effect_prefs === 'object') {
    update.effect_prefs = { ...DEFAULT_PREFS, ...body.effect_prefs }
  }

  const { data, error } = await svc.from('user_lights').upsert(update, { onConflict: 'user_id' }).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true, config: data })
}
