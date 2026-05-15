// /api/lights/scan
//   POST  — dashboard sets scan_request_at = now(), clears prior results.
//           Desktop daemon polls /api/lights/me, sees scan_request_at > last_scan_at,
//           performs LAN UDP scan, posts results to PUT below.
//   PUT   — desktop daemon posts {devices:[{ip,sku,mac,name}]} after a LAN scan.
//   GET   — dashboard polls for results.
import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createClient as createSvc } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

async function resolveUserId(req: Request, sb: any): Promise<string | null> {
  try {
    const { data: { user } } = await sb.auth.getUser()
    if (user?.id) return user.id
  } catch {}
  const email = req.headers.get('x-chief-email') || ''
  if (email) {
    const svc = createSvc(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
    const { data } = await svc.from('profiles').select('id').ilike('email', email).maybeSingle()
    if (data?.id) return data.id
  }
  return null
}

export async function POST(req: Request) {
  const sb = createClient()
  const userId = await resolveUserId(req, sb)
  if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const svc = createSvc(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  await svc.from('user_lights').upsert({
    user_id: userId,
    scan_request_at: new Date().toISOString(),
    scan_results: null,
  }, { onConflict: 'user_id' })
  return NextResponse.json({ ok: true, message: 'Scan requested — desktop daemon will respond within 30s' })
}

export async function PUT(req: Request) {
  const sb = createClient()
  const userId = await resolveUserId(req, sb)
  if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const body = await req.json()
  const devices = Array.isArray(body.devices) ? body.devices : []
  const svc = createSvc(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  await svc.from('user_lights').upsert({
    user_id: userId,
    scan_results: devices,
    last_scan_at: new Date().toISOString(),
  }, { onConflict: 'user_id' })
  return NextResponse.json({ ok: true, deviceCount: devices.length })
}

export async function GET(req: Request) {
  const sb = createClient()
  const userId = await resolveUserId(req, sb)
  if (!userId) return NextResponse.json({ error: 'unauthenticated' }, { status: 401 })

  const svc = createSvc(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!)
  const { data } = await svc.from('user_lights')
    .select('scan_request_at, last_scan_at, scan_results')
    .eq('user_id', userId).maybeSingle()
  return NextResponse.json({
    ok: true,
    scanRequestedAt: data?.scan_request_at || null,
    lastScanAt: data?.last_scan_at || null,
    devices: data?.scan_results || [],
  })
}
