'use client'
import MultiVendorSection from '@/components/shared/MultiVendorSection'
import { Settings } from 'lucide-react'

const VENDORS = [
  { vendor: 'simucube',     label: 'Simucube',     accent: '#fa6b1f', category: 'wheels',
    description: 'Simucube True Drive / Tuner profiles — max torque, damping, friction, inertia, reconstruction filter, slew rate. Captured per session.' },
  { vendor: 'fanatec',      label: 'Fanatec',      accent: '#ef4444', category: 'wheels',
    description: 'Fanatec wheel base (CSL DD / DD Pro / Podium) settings — FFB, drift mode, damper, force shaper.' },
  { vendor: 'moza',         label: 'Moza',         accent: '#ff6a00', category: 'wheels',
    description: 'Moza R5/R9/R12/R16/R21/R23 from Pit House — max torque, FFB curve, damper, friction, road sensitivity.' },
  { vendor: 'sim_magic',    label: 'Simagic',      accent: '#a855f7', category: 'wheels',
    description: 'Simagic Alpha / Alpha U / Mini / Neo bases via SimPro Manager — torque, damping, response.' },
  { vendor: 'asetek',       label: 'Asetek',       accent: '#06b6d4', category: 'wheels',
    description: 'Asetek La Prima / Invicta / Forte wheel base profiles via RaceHub.' },
  { vendor: 'thrustmaster', label: 'Thrustmaster', accent: '#fbbf24', category: 'wheels',
    description: 'Thrustmaster T-GT / TS-XW / T818 base FFB settings.' },
  { vendor: 'logitech',     label: 'Logitech',     accent: '#3b82f6', category: 'wheels',
    description: 'Logitech G Pro Racing / G923 / G29 — FFB strength, centering, sensitivity.' },
]

export default function SteeringPage() {
  return <MultiVendorSection
    title="Steering"
    subtitle="Wheel base profiles, captured per session"
    accent="#3b82f6"
    icon={Settings}
    vendors={VENDORS}
    description="FFB strength, damping, friction, inertia, reconstruction filter — every value from your wheel base app, captured per session so you can match your best laps to the exact settings."
  />
}
