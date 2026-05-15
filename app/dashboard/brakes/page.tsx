'use client'
import MultiVendorSection from '@/components/shared/MultiVendorSection'
import { Gauge } from 'lucide-react'

// Every pedal/brake vendor Chief can auto-detect. Same picker UX as Steering.
// User picks brand → live screenshots of their pedal-tuning app, captured per
// session so Chief AI can answer "what brake curve was I on last time?"
const VENDORS = [
  { vendor: 'sim_magic',    label: 'Simagic SimPro',   accent: '#a855f7', category: 'motion',
    description: 'Simagic P-1000 / P-2000 Haptic via SimPro Manager — brake force curves, deadzone, linearity, haptic intensity, force calibration.' },
  { vendor: 'moza',         label: 'Moza Pit House',   accent: '#ff6a00', category: 'pedals',
    description: 'Moza CRP / SR-P / SR-P Lite pedals via Pit House — brake bite point, throttle curve, clutch travel, force curve shaping.' },
  { vendor: 'heusinkveld',  label: 'Heusinkveld',      accent: '#39ff14', category: 'pedals',
    description: 'Heusinkveld Sprint / Ultimate+ pedals via SmartControl — brake load curve, ABS feel, throttle response.' },
  { vendor: 'fanatec',      label: 'Fanatec',          accent: '#ef4444', category: 'pedals',
    description: 'Fanatec ClubSport V3 / Podium pedals via Fanalab — brake performance map, throttle response, clutch.' },
  { vendor: 'asetek',       label: 'Asetek Invicta',   accent: '#06b6d4', category: 'pedals',
    description: 'Asetek Invicta pedal profile via RaceHub — brake pressure, hydraulic feel, throttle ramp.' },
  { vendor: 'simucube',     label: 'Simucube ActivePedal', accent: '#fa6b1f', category: 'pedals',
    description: 'Simucube ActivePedal via True Drive — force feedback brake profile, travel, peak force, vibration zones.' },
  { vendor: 'thrustmaster', label: 'Thrustmaster',     accent: '#fbbf24', category: 'pedals',
    description: 'Thrustmaster T-LCM / T3PM / T-PEDALS PRO via Control Panel — load cell curve, deadzone, sensitivity.' },
  { vendor: 'logitech',     label: 'Logitech G HUB',   accent: '#3b82f6', category: 'pedals',
    description: 'Logitech G29 / G923 / G Pro Racing pedals via G HUB — deadzone, sensitivity, calibration.' },
  { vendor: 'vrs',          label: 'VRS',              accent: '#10b981', category: 'pedals',
    description: 'VRS load-cell pedal profiles — brake force curve, throttle ramp, calibration.' },
  { vendor: 'cammus',       label: 'Cammus',           accent: '#8b5cf6', category: 'pedals',
    description: 'Cammus pedal profiles via Cammus app — load cell curves, deadzone.' },
]

export default function BrakesPage() {
  return <MultiVendorSection
    title="Brakes"
    subtitle="Pedal hardware profiles, captured every session"
    accent="#a855f7"
    icon={Gauge}
    vendors={VENDORS}
    description="Click your brand. Chief auto-captures your pedal-tuning app every iRacing session so you know exactly what brake curve, force, and deadzone ran during your best laps."
  />
}
