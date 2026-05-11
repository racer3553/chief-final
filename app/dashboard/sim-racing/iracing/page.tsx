'use client'
import VendorSection from '@/components/shared/VendorSection'
import { Cpu } from 'lucide-react'

export default function IracingPage() {
  return <VendorSection
    title="iRacing Settings"
    subtitle="Per-car setups + controls"
    vendor="iracing"
    category="sim"
    accent="#06b6d4"
    icon={Cpu}
    description="Every iRacing .sto setup file you have, organized by car. Plus controls.cfg and app.ini snapshots tagged to each session."
  />
}
