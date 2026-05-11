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

    const [
      { count: userCount, error: ucErr },
      { count: sessionCount, error: scErr },
      { data: subs, error: subErr },
      { data: users, error: uErr },
      { data: recentSessions, error: rsErr },
    ] = await Promise.all([
      svc.from('profiles').select('*', { count: 'exact', head: true }),
      svc.from('sim_session_captures').select('*', { count: 'exact', head: true }),
      svc.from('profiles').select('id, email, subscription_plan'),
      svc.from('profiles').select('id, email, team_name, subscription_plan, access_level, created_at, last_sign_in_at').order('created_at', { ascending: false }).limit(50),
      svc.from('sim_session_captures').select('id, user_id, car_name, track_name, started_at, best_lap_time').order('started_at', { ascending: false }).limit(20),
    ])

    const planPrice: Record<string, number> = {
      single_track: 5,
      five_tracks: 10,
      unlimited: 20,
      sim_single: 3,
      sim_five: 7,
      sim_unlimited: 12,
    }
    const paidSubs = (subs || []).filter((p: any) =>
      p.subscription_plan && !['trial', null, ''].includes(p.subscription_plan)
    )
    const mrr = paidSubs.reduce((s: number, p: any) => s + (planPrice[p.subscription_plan] || 0), 0)

    // Sessions per user breakdown
    const sessionsByUser: Record<string, number> = {}
    const { data: allSessions } = await svc.from('sim_session_captures').select('user_id')
    for (const s of (allSessions || [])) {
      sessionsByUser[s.user_id] = (sessionsByUser[s.user_id] || 0) + 1
    }

    return NextResponse.json({
      ok: true,
      stats: {
        users: userCount || 0,
        sessions: sessionCount || 0,
        paid: paidSubs.length,
        mrr,
      },
      users: (users || []).map((u: any) => ({
        ...u,
        session_count: sessionsByUser[u.id] || 0,
      })),
      recentSessions: recentSessions || [],
      errors: {
        users: ucErr?.message || null,
        sessions: scErr?.message || null,
        subs: subErr?.message || null,
        userList: uErr?.message || null,
        recent: rsErr?.message || null,
      },
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
