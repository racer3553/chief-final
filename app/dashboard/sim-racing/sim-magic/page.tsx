'use client'
import VendorSection from '@/components/shared/VendorSection'
import { Wind } from 'lucide-react'

export default function SimMagicPage() {
  return <VendorSection
    title="Sim Magic / SimPro Manager"
    subtitle="Pedals + wheel base"
    vendor="sim_magic"
    category="motion"
    accent="#a855f7"
    icon={Wind}
    description="Sim Magic hardware (configured via SimPro Manager) — pedal calibration, brake force curves, throttle response. Captured per session so you know which settings ran at each track."
  />
}
