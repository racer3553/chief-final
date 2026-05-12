'use client'
// Multi-vendor category page. Tab strip of vendors at the top; clicking a vendor
// swaps the VendorSection underneath. Used by Brakes + Steering pages so the
// sidebar stays minimal but every brand is one click away.
import { useState } from 'react'
import VendorSection from './VendorSection'

export default function MultiVendorSection({ title, subtitle, accent, icon, vendors, description }) {
  const [active, setActive] = useState(vendors[0])

  return (
    <div>
      {/* Vendor tab strip */}
      <div className="mb-4">
        <div className="text-[10px] font-bold tracking-[0.2em] uppercase text-slate-500 mb-2 px-1">
          Pick your hardware
        </div>
        <div className="flex flex-wrap gap-2">
          {vendors.map(v => {
            const isActive = v.vendor === active.vendor
            return (
              <button key={v.vendor}
                onClick={() => setActive(v)}
                className="px-4 py-2 rounded-lg text-[12.5px] font-bold tracking-wide transition-all border"
                style={{
                  background: isActive ? (v.accent || accent) + '22' : 'rgba(20,20,32,0.6)',
                  borderColor:  isActive ? (v.accent || accent) : 'rgba(255,255,255,0.08)',
                  color:        isActive ? (v.accent || accent) : '#aaa',
                }}>
                {v.label}
              </button>
            )
          })}
        </div>
      </div>

      <VendorSection
        title={active.label}
        subtitle={active.subtitle || subtitle}
        vendor={active.vendor}
        category={active.category || (active.vendor.includes('wheel') ? 'wheels' : 'motion')}
        accent={active.accent || accent}
        icon={icon}
        description={active.description || description}
      />
    </div>
  )
}
