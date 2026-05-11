'use client'
import VendorSection from '@/components/shared/VendorSection'
import { Settings } from 'lucide-react'

export default function SimucubePage() {
  return <VendorSection
    title="Simucube Info"
    subtitle="Wheel base profiles"
    vendor="simucube"
    category="wheels"
    accent="#3b82f6"
    icon={Settings}
    description="Your Simucube True Drive / Tuner profiles captured per session. Know exactly which damping/smoothing/min force settings you ran for each car at each track."
  />
}
