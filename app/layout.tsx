import type { Metadata } from 'next'
import '../styles/globals.css'

export const metadata: Metadata = {
  title: 'CHIEF — AI Crew Chief by Walker Sports',
  description: 'The AI Crew Chief for sim and real-world racers. Auto-captures every session, reads every setup, and coaches you live in your ear.',
  applicationName: 'CHIEF',
  authors: [{ name: 'Walker Sports' }],
  keywords: ['iRacing', 'sim racing', 'AI crew chief', 'Simucube', 'Coach Dave', 'race engineer', 'telemetry'],
  themeColor: '#0c0c14',
  openGraph: {
    title: 'CHIEF — AI Crew Chief by Walker Sports',
    description: 'Auto-captures every session. Reads every setup. Coaches you live.',
    siteName: 'CHIEF',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CHIEF — AI Crew Chief by Walker Sports',
    description: 'Auto-captures every session. Reads every setup. Coaches you live.',
  },
}

// CRITICAL — without this, iOS Safari renders at ~980px desktop viewport then
// scales down to fit, so Tailwind's `lg:` (1024px) matches and the FULL desktop
// sidebar appears on phones. Setting device-width tells Safari to render at
// the real phone width (e.g. 390px on iPhone 14/15) so responsive breakpoints work.
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  themeColor: '#0c0c14',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
