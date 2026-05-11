'use client'
import VendorSection from '@/components/shared/VendorSection'
import { FileInput } from 'lucide-react'

export default function CoachDavePage() {
  return <VendorSection
    title="Coach Dave Info"
    subtitle="Setup files + telemetry"
    vendor="coach_dave"
    category="coach"
    accent="#10b981"
    icon={FileInput}
    description="Every Coach Dave Delta setup file Chief auto-captures alongside your iRacing sessions. Tagged by car and track."
  />
}
