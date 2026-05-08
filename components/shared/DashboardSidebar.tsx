"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, Settings, Wrench, History, MessageSquare, MapPin,
  Users, CreditCard, LogOut, ChevronDown, ChevronRight, Wind, Flame,
  SlidersHorizontal, Activity, Camera
} from "lucide-react";
import { createBrowserClient } from "@supabase/ssr";

const GROUPS = [
  {
    id: "sim", label: "Sim Racing", defaultOpen: true,
    links: [
      { href: "/dashboard", icon: LayoutDashboard, label: "Overview" },
      { href: "/dashboard/sim-racing/live-status", icon: Activity, label: "Live Status" },
      { href: "/dashboard/sim-chief/setup", icon: Settings, label: "Sim Setups" },
      { href: "/dashboard/sim-chief/history", icon: History, label: "Sim History" },
      { href: "/dashboard/tracks", icon: MapPin, label: "Tracks" },
    ],
  },
  {
    id: "real", label: "Real Racing", defaultOpen: true,
    links: [
      { href: "/dashboard/race-chief/setup", icon: Settings, label: "Setup Sheets" },
      { href: "/dashboard/race-chief/maintenance", icon: Wrench, label: "Maintenance" },
      { href: "/dashboard/race-chief/history", icon: History, label: "History" },
    ],
  },
  {
    id: "ai", label: "AI Tools", defaultOpen: true,
    links: [
      { href: "/dashboard/ai-chat", icon: MessageSquare, label: "Ask Chief" },
      { href: "#", icon: SlidersHorizontal, label: "Setup Chief AI", soon: true },
      { href: "#", icon: Wind, label: "Aero AI", soon: true },
      { href: "#", icon: Flame, label: "Engine Tuner", soon: true },
      { href: "#", icon: Camera, label: "Screenshot Coach", soon: true },
    ],
  },
  {
    id: "account", label: "Account", defaultOpen: false,
    links: [
      { href: "/dashboard/team", icon: Users, label: "Team" },
      { href: "/dashboard/billing", icon: CreditCard, label: "Billing" },
    ],
  },
];

export default function DashboardSidebar({ profile }: { profile?: any }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState<Record<string, boolean>>(
    GROUPS.reduce((a: any, g: any) => ({ ...a, [g.id]: g.defaultOpen ?? false }), {})
  );

  const isActive = (href: string) =>
    href === "/dashboard" ? pathname === "/dashboard" : pathname?.startsWith(href);

  const handleLogout = async () => {
    const supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <aside className="w-64 h-screen bg-[#0a0a0a] border-r border-[#1a1a1a] flex flex-col overflow-y-auto">
      <div className="p-4 border-b border-[#1a1a1a]">
        <div className="font-display text-lg text-[#f5c518]">CHIEF</div>
        <div className="font-mono-chief text-[10px] text-[#555]">AI CREW CHIEF</div>
      </div>
      <nav className="flex-1 p-2 space-y-1">
        {GROUPS.map((group: any) => (
          <div key={group.id} className="mb-2">
            <button
              onClick={() => setOpen({ ...open, [group.id]: !open[group.id] })}
              className="w-full flex items-center justify-between px-3 py-1.5 text-[10px] font-mono-chief uppercase tracking-wider text-[#666] hover:text-[#f5c518] transition-colors"
            >
              <span>{group.label}</span>
              {open[group.id] ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
            </button>
            {open[group.id] && (
              <div className="space-y-0.5 mt-1">
                {group.links.map((link: any) => {
                  const Icon = link.icon;
                  const active = isActive(link.href);
                  return (
                    <Link
                      key={link.label}
                      href={link.href}
                      onClick={(e) => link.soon && e.preventDefault()}
                      className={`flex items-center gap-3 px-3 py-2 rounded text-sm transition-all ${
                        active
                          ? "bg-[#f5c51811] text-[#f5c518] border-l-2 border-[#f5c518]"
                          : link.soon
                            ? "text-[#444] cursor-not-allowed"
                            : "text-[#888] hover:text-[#f0f0f0] hover:bg-[#161616]"
                      }`}
                    >
                      <Icon size={16} />
                      <span className="flex-1">{link.label}</span>
                      {link.soon && (
                        <span className="text-[9px] px-1.5 py-0.5 bg-[#222] text-[#666] rounded font-mono-chief">SOON</span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>
        ))}
      </nav>
      <div className="p-3 border-t border-[#1a1a1a]">
        {profile?.plan === "trial" && (
          <div className="bg-[#f5c51811] border border-[#f5c51833] rounded p-2 mb-3">
            <div className="font-mono-chief text-xs text-[#f5c518]">TRIAL ACTIVE</div>
            <Link href="/dashboard/billing" className="text-xs text-[#888] hover:text-[#f5c518]">Upgrade to keep access</Link>
          </div>
        )}
        <div className="flex items-center gap-2 px-2 mb-2">
          <div className="w-7 h-7 rounded-full bg-[#f5c518] flex items-center justify-center">
            <span className="font-display text-xs text-black">{profile?.full_name?.[0] || profile?.email?.[0] || "?"}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs text-[#f0f0f0] truncate">{profile?.full_name || "Racer"}</div>
            <div className="font-mono-chief text-[10px] text-[#555] capitalize">{profile?.plan || "trial"}</div>
          </div>
        </div>
        <button onClick={handleLogout} className="flex items-center gap-2 w-full px-3 py-2 text-[#555] hover:text-[#ff2d2d] text-xs rounded hover:bg-[#161616] transition-colors">
          <LogOut size={13} /> Sign out
        </button>
      </div>
    </aside>
  );
}