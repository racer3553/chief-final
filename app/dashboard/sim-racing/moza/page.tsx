'use client'
import VendorSection from '@/components/shared/VendorSection'
import { Settings } from 'lucide-react'

export default function MozaPage() {
  return <VendorSection
    title="Moza Pit House"
    subtitle="Wheel base profiles + pedal calibration"
    vendor="moza"
    category="wheels"
    accent="#ef4444"
    icon={Settings}
    description="Your Moza R-series wheel base settings — FFB strength, damping, friction, deadzone, sensitivity — auto-captured each session. Plus pedal calibration values (CRP/SRP) so Chief can compare what you were running per car/track."
  />
}
