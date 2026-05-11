'use client'
import { useRouter } from 'next/navigation'
import { ReactNode } from 'react'

// Tiny client component that lets a server-rendered table row navigate on click.
// Server components can't use onClick directly; this is the standard escape hatch.
export default function ClickableSetupRow({ href, children }: { href: string; children: ReactNode }) {
  const router = useRouter()
  return (
    <tr
      className="cursor-pointer hover:bg-[#11151c] transition-colors"
      onClick={() => router.push(href)}
    >
      {children}
    </tr>
  )
}
