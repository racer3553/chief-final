// Server-side admin stats — uses service role to bypass RLS so we see ALL users.
import { NextResponse } from 'next/server'
import { createServerClient, createServiceClient } from '@/lib/supabase/server'

const ADMIN_EMAILS = ['racer3553@gmail.com', 'ben@walkerperformancefiltration.com']

export async function GET() {
  try {
    const sb = createServerClient()
    const { data: { user } } = await sb.auth.getUser()
    if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

    // Verify the requester is an admin
    const { data: me } = await sb.from('profiles').select('access_level, role, is_admin, email').eq('id', user.id).single()
    const isAdmin =
      me?.access_level === 'admin' ||
      me?.access_level === 'owner' ||
      me?.role === 'admin' ||
      me?.is_admin === true ||
      ADMIN_EMAILS.includes((user.email || '').toLowerCase()) ||
      ADMIN_EMAILS.includes((me?.email || '').toLowerCase())
    if (!isAdmin) return NextResponse.json({ error: 'forbidden' }, { status: 403 })

    // Service-role client — bypasses RLS
    const svc = createServiceClient()

    // PARALLEL: count sessions, pull all sessions, pull profiles, AND pull auth.users via admin API.
    // auth.users is the source of truth — profiles can lag (signup trigger may not have created rows).
    const [
      { count: sessionCount, error: scErr },
      { data: profilesData, error: pErr },
      { data: recentSessions, error: rsErr },
      authListResult,
      { data: allSessionsRaw },
    ] = await Promise.all([
      svc.from('sim_session_captures').select('*', { count: 'exact', head: true }),
      svc.from('profiles').select('id, email, team_name, subscription_plan, access_level, created_at, last_sign_in_at'),
      svc.from('sim_session_captures').select('id, user_id, car_name, track_name, started_at, best_lap_time').order('started_at', { ascending: false }).limit(20),
      (svc as any).auth.admin.listUsers({ page: 1, perPage: 1000 }).catch((e: any) => ({ error: e })),
      svc.from('sim_session_captures').select('user_id'),
    ])

    // auth.users is the master list
    const authUsers = authListResult?.data?.users || []
    const authError = authListResult?.error?.message || null

    // Build a map of profile data by user_id for merging
    const profileMap = new Map<string, any>()
    for (const p of (profilesData || [])) profileMap.set(p.id, p)

    // Sessions per user count
    const sessionsByUser: Record<string, number> = {}
    for (const s of (allSessionsRaw || [])) {
      sessionsByUser[s.user_id] = (sessionsByUser[s.user_id] || 0) + 1
    }

    // Merge: every auth.user gets a row, enriched with profile data if present
    const mergedUsers = authUsers.map((u: any) => {
      const prof = profileMap.get(u.id) || {}
      return {
        id: u.id,
        email: u.email || prof.email || '—',
        team_name: prof.team_name || null,
        subscription_plan: prof.subscription_plan || 'trial',
        access_level: prof.access_level || 'user',
        created_at: prof.created_at || u.created_at,
        last_sign_in_at: u.last_sign_in_at || prof.last_sign_in_at,
        email_confirmed_at: u.email_confirmed_at || null,
        session_count: sessionsByUser[u.id] || 0,
        has_profile: profileMap.has(u.id),
      }
    }).sort((a: any, b: any) => (b.created_at || '').localeCompare(a.created_at || ''))

    const planPrice: Record<string, number> = {
      single_track: 5, five_tracks: 10, unlimited: 20,
      sim_single: 3, sim_five: 7, sim_unlimited: 12,
      starter: 19, pro: 39, elite: 79,
    }
    const paidSubs = mergedUsers.filter((u: any) =>
      u.subscription_plan && !['trial', '', null].includes(u.subscription_plan)
    )
    const mrr = paidSubs.reduce((s: number, p: any) => s + (planPrice[p.subscription_plan] || 0), 0)

    return NextResponse.json({
      ok: true,
      stats: {
        users: mergedUsers.length,           // total real auth users
        sessions: sessionCount || 0,
        paid: paidSubs.length,
        mrr,
        profiles_missing: mergedUsers.filter((u: any) => !u.has_profile).length,
      },
      users: mergedUsers.slice(0, 100),
      recentSessions: recentSessions || [],
      errors: {
        sessions: scErr?.message || null,
        profiles: pErr?.message || null,
        recent: rsErr?.message || null,
        auth: authError,
      },
    })
  } catch (e: any) {
    console.error('[admin/stats] error', e)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
