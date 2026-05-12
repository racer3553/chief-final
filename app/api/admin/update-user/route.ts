// app/api/admin/update-user/route.ts
// Admin-only endpoint to grant access tiers / extend trials / make admins.
// Only callable by emails in ADMIN_EMAILS.

import { NextResponse } from 'next/server'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'

const ADMIN_EMAILS = ['racer3553@gmail.com', 'ben@walkerperformancefiltration.com']

export async function POST(req: Request) {
  try {
    const body = await req.json()
    const { user_id, action, plan, days } = body
    if (!user_id || !action) return NextResponse.json({ error: 'missing user_id or action' }, { status: 400 })

    const sb = createServerClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    // Verify caller is admin
    const { data: me } = await sb.from('profiles').select('access_level, email').eq('id', user.id).single()
    const isAdmin =
      me?.access_level === 'admin' ||
      ADMIN_EMAILS.includes((user.email || '').toLowerCase()) ||
      ADMIN_EMAILS.includes((me?.email || '').toLowerCase())
    if (!isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    const svc = createServiceClient()

    // Load (or auto-create) the target profile row from auth.users
    const { data: existing } = await svc.from('profiles').select('*').eq('id', user_id).maybeSingle()
    let targetEmail = existing?.email || null
    if (!existing) {
      try {
        const { data: lu } = await (svc as any).auth.admin.listUsers({ page: 1, perPage: 1000 })
        const au = (lu?.users || []).find((u: any) => u.id === user_id)
        targetEmail = au?.email || null
        // Create the profile shell so future updates have somewhere to write
        if (targetEmail) {
          await svc.from('profiles').insert({ id: user_id, email: targetEmail })
        }
      } catch {}
    }

    const update: any = {}
    const trialEnd = new Date(Date.now() + (days || 30) * 86400000).toISOString()

    switch (action) {
      case 'grant_free_access':
        update.subscription_plan = 'free_lifetime'
        update.subscription_status = 'active'
        update.access_level = 'tester'
        break
      case 'grant_full_trial':
        update.subscription_plan = 'trial'
        update.subscription_status = 'trialing'
        update.trial_ends_at = trialEnd
        update.access_level = 'tester'
        break
      case 'set_plan':
        update.subscription_plan = plan || 'starter'
        update.subscription_status = 'active'
        break
      case 'extend_trial':
        update.subscription_plan = 'trial'
        update.subscription_status = 'trialing'
        update.trial_ends_at = trialEnd
        break
      case 'make_admin':
        update.access_level = 'admin'
        break
      case 'revoke_access':
        update.subscription_plan = 'revoked'
        update.subscription_status = 'canceled'
        break
      case 'reset_to_trial':
        update.subscription_plan = 'trial'
        update.subscription_status = 'trialing'
        update.access_level = 'user'
        update.trial_ends_at = trialEnd
        break
      default:
        return NextResponse.json({ error: `unknown action: ${action}` }, { status: 400 })
    }

    // Some columns may not exist in your profiles table — tolerate that gracefully
    // by trying full update first, then falling back to the safe subset.
    let { data, error } = await svc.from('profiles').update(update).eq('id', user_id).select().single()
    if (error && /column.*does not exist/i.test(error.message)) {
      const safe: any = {}
      if ('subscription_plan' in update) safe.subscription_plan = update.subscription_plan
      if ('access_level' in update)      safe.access_level      = update.access_level
      const r2 = await svc.from('profiles').update(safe).eq('id', user_id).select().single()
      data = r2.data; error = r2.error
    }
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true, user: data, action, email: targetEmail })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
