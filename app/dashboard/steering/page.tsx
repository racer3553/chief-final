'use client'
import MultiVendorSection from '@/components/shared/MultiVendorSection'
import { Settings } from 'lucide-react'

// Every wheel-base brand Chief can auto-detect via the screenshot daemon.
// User clicks their brand at the top of the page → settings preview + screenshots
// load below. If no screenshot captured yet for that vendor, the empty state
// shows them how to enable auto-capture for it.
const VENDORS = [
  { vendor: 'moza',         label: 'Moza Pit House',   accent: '#ff6a00', category: 'wheels',
    description: 'Moza R5 / R9 / R12 / R16 / R21 / R23 base profiles via Pit House — max torque, FFB curve, damper, friction, road sensitivity. Captured per session.' },
  { vendor: 'simucube',     label: 'Simucube Tuner',   accent: '#fa6b1f', category: 'wheels',
    description: 'Simucube 1 / 2 Sport / 2 Pro / Ultimate via True Drive — max strength, damping, friction, inertia, reconstruction filter, slew rate.' },
  { vendor: 'fanatec',      label: 'Fanatec',          accent: '#ef4444', category: 'wheels',
    description: 'Fanatec CSL DD / DD Pro / Podium DD1 / DD2 via Fanalab — FFB, drift mode, damper, force shaper.' },
  { vendor: 'sim_magic',    label: 'Simagic SimPro',   accent: '#a855f7', category: 'wheels',
    description: 'Simagic Alpha / Alpha U / Mini / Neo via SimPro Manager — torque, damping, FFB response.' },
  { vendor: 'asetek',       label: 'Asetek RaceHub',   accent: '#06b6d4', category: 'wheels',
    description: 'Asetek La Prima / Invicta / Forte via Asetek RaceHub — wheel-base profiles per car.' },
  { vendor: 'thrustmaster', label: 'Thrustmaster',     accent: '#fbbf24', category: 'wheels',
    description: 'Thrustmaster T-GT / TS-XW / T818 via Control Panel — base FFB strength, damper, spring.' },
  { vendor: 'logitech',     label: 'Logitech G HUB',   accent: '#3b82f6', category: 'wheels',
    description: 'Logitech G Pro Racing / G923 / G29 via G HUB — FFB strength, centering, sensitivity.' },
  { vendor: 'vrs',          label: 'VRS DirectForce',  accent: '#10b981', category: 'wheels',
    description: 'VRS DirectForce Pro wheel base via VRS Direct — FFB tuning, damping, road feel.' },
  { vendor: 'cammus',       label: 'Cammus',           accent: '#8b5cf6', category: 'wheels',
    description: 'Cammus C5 / C12 wheel base via Cammus app — torque, damping, response curves.' },
  { vendor: 'accuforce',    label: 'Accuforce',        accent: '#f97316', category: 'wheels',
    description: 'Accuforce Pro V2 wheel base settings — FFB strength, spring, damper, friction.' },
]

export default function SteeringPage() {
  return <MultiVendorSection
    title="Steering"
    subtitle="Wheel base + tuner settings, every session"
    accent="#3b82f6"
    icon={Settings}
    vendors={VENDORS}
    description="Click your brand. Chief auto-captures your wheel base app every iRacing session so you can match best laps to exact FFB strength, damping, friction, inertia, and reconstruction filter values."
  />
}
