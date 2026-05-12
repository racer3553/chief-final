'use client'
import MultiVendorSection from '@/components/shared/MultiVendorSection'
import { Gauge } from 'lucide-react'

const VENDORS = [
  { vendor: 'sim_magic',    label: 'SimPro / Simagic',  accent: '#a855f7', category: 'motion',
    description: 'Sim Magic pedals configured through SimPro Manager — brake force curves, deadzone, linearity, force calibration. Captured every session.' },
  { vendor: 'moza',         label: 'Moza',              accent: '#ff6a00', category: 'pedals',
    description: 'Moza pedal calibration from Pit House — brake bite point, throttle curve, clutch travel.' },
  { vendor: 'heusinkveld',  label: 'Heusinkveld',       accent: '#39ff14', category: 'pedals',
    description: 'Heusinkveld Sprint / Ultimate pedal profiles from SmartControl — brake load, curve shape, ABS feel.' },
  { vendor: 'fanatec',      label: 'Fanatec',           accent: '#ef4444', category: 'pedals',
    description: 'Fanatec ClubSport / Podium pedals — brake performance, throttle response, clutch.' },
  { vendor: 'asetek',       label: 'Asetek / Invicta',  accent: '#06b6d4', category: 'pedals',
    description: 'Asetek Invicta pedal profile — brake pressure, hydraulic feel, throttle ramp.' },
  { vendor: 'thrustmaster', label: 'Thrustmaster',      accent: '#fbbf24', category: 'pedals',
    description: 'Thrustmaster pedal profiles (T-LCM, T3PM, T-PEDALS PRO).' },
  { vendor: 'logitech',     label: 'Logitech',          accent: '#3b82f6', category: 'pedals',
    description: 'Logitech G29 / G923 / Pro Racing pedals — deadzone, sensitivity, calibration.' },
]

export default function BrakesPage() {
  return <MultiVendorSection
    title="Brakes"
    subtitle="Pedal hardware profiles, captured per session"
    accent="#a855f7"
    icon={Gauge}
    vendors={VENDORS}
    description="Brake bite point, throttle curve, deadzone, force calibration — captured live from your pedal app every session so you know exactly what setup you ran."
  />
}
