'use client'

import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { Users, Plus, Copy, CheckCircle, Loader2, X } from 'lucide-react'

export default function TeamPage() {
  const supabase = createClient()
  const [team, setTeam] = useState<any>(null)
  const [members, setMembers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [copied, setCopied] = useState(false)

  useEffect(() => { fetchTeam() }, [])

  const fetchTeam = async () => {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const { data: teamData } = await supabase
      .from('teams')
      .select('*')
      .eq('owner_id', user.id)
      .single()

    if (teamData) {
      setTeam(teamData)
      const { data: membersData } = await supabase
        .from('team_members')
        .select('*, profiles(full_name, email, plan)')
        .eq('team_id', teamData.id)
      setMembers(membersData || [])
    }
    setLoading(false)
  }

  const createTeam = async () => {
    if (!teamName.trim()) return
    setCreating(true)
    const { data: { user } } = await supabase.auth.getUser()
    const { data } = await supabase.from('teams').insert({
      name: teamName, owner_id: user?.id,
    }).select().single()
    if (data) {
      await supabase.from('team_members').insert({ team_id: data.id, user_id: user?.id, role: 'owner' })
    }
    setCreating(false)
    setShowCreate(false)
    fetchTeam()
  }

  const copyInviteLink = () => {
    if (!team) return
    const link = `${window.location.origin}/join-team?id=${team.id}`
    navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const ROLE_COLORS: Record<string, string> = {
    owner: '#f5c518', crew_chief: '#00e5ff', mechanic: '#39ff14', driver: '#888', viewer: '#444'
  }

  if (loading) return <div className="flex justify-center py-12"><Loader2 size={24} className="animate-spin text-[#555]" /></div>

  return (
    <div className="max-w-2xl space-y-6 animate-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl text-white tracking-wide">TEAM</h1>
          <p className="text-[#888] text-sm mt-1">Share Chief with your crew</p>
        </div>
        {!team && (
          <button onClick={() => setShowCreate(true)} className="btn-chief">
            <Plus size={16} /> CREATE TEAM
          </button>
        )}
      </div>

      {!team ? (
        <div className="chief-panel rounded-lg p-12 text-center">
          <Users size={36} className="text-[#333] mx-auto mb-3" />
          <h3 className="font-display text-xl text-[#555] tracking-wide mb-2">NO TEAM YET</h3>
          <p className="text-[#444] text-sm mb-6">Create a team to share Chief with your crew chiefs, mechanics, and drivers.</p>
          <button onClick={() => setShowCreate(true)} className="btn-chief">
            <Plus size={16} /> CREATE TEAM
          </button>
        </div>
      ) : (
        <>
          <div className="chief-panel-glow p-5 rounded-lg">
            <div className="chief-accent-line mb-4" />
            <div className="flex items-start justify-between">
              <div>
                <div className="font-display text-2xl text-white tracking-wide">{team.name}</div>
                <div className="font-mono text-xs text-[#555] mt-1">{members.length} member{members.length !== 1 ? 's' : ''}</div>
              </div>
              <button onClick={copyInviteLink}
                className="flex items-center gap-2 bg-[#f5c51811] border border-[#f5c51833] text-[#f5c518] px-3 py-2 rounded font-display text-xs tracking-widest hover:bg-[#f5c51822] transition-colors">
                {copied ? <CheckCircle size={13} /> : <Copy size={13} />}
                {copied ? 'COPIED!' : 'INVITE LINK'}
              </button>
            </div>
          </div>

          <div className="chief-panel rounded-lg overflow-hidden">
            <div className="p-4 border-b border-[#1a1a1a]">
              <span className="font-display text-sm text-white tracking-widest">MEMBERS</span>
            </div>
            {members.length > 0 ? (
              <div className="divide-y divide-[#1a1a1a]">
                {members.map((m: any) => (
                  <div key={m.id} className="flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-[#f5c51822] border border-[#f5c51833] flex items-center justify-center">
                        <span className="font-display text-xs text-[#f5c518]">
                          {m.profiles?.full_name?.[0] || m.profiles?.email?.[0] || '?'}
                        </span>
                      </div>
                      <div>
                        <div className="font-body text-sm text-[#f0f0f0]">{m.profiles?.full_name || m.profiles?.email}</div>
                        <div className="font-mono text-xs text-[#555]">{m.profiles?.email}</div>
                      </div>
                    </div>
                    <span className="font-mono text-xs px-2 py-1 rounded border"
                      style={{ color: ROLE_COLORS[m.role], borderColor: ROLE_COLORS[m.role] + '44', background: ROLE_COLORS[m.role] + '11' }}>
                      {m.role.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center text-[#555] text-sm">
                No members yet. Share the invite link.
              </div>
            )}
          </div>
        </>
      )}

      {/* Create team modal */}
      {showCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setShowCreate(false)} />
          <div className="relative bg-[#111] border border-[#222] rounded-lg w-full max-w-sm p-6">
            <div className="flex items-center justify-between mb-4">
              <span className="font-display text-lg text-white tracking-wide">CREATE TEAM</span>
              <button onClick={() => setShowCreate(false)}><X size={16} className="text-[#555]" /></button>
            </div>
            <label className="chief-label mb-2">TEAM NAME</label>
            <input className="chief-input mb-4" placeholder="Walker Racing"
              value={teamName} onChange={e => setTeamName(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') createTeam() }} />
            <div className="flex gap-2">
              <button onClick={() => setShowCreate(false)} className="btn-ghost flex-1">Cancel</button>
              <button onClick={createTeam} disabled={creating || !teamName.trim()} className="btn-chief flex-1 justify-center">
                {creating ? <Loader2 size={15} className="animate-spin" /> : 'CREATE'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
