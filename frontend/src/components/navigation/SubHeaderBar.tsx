"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Camera,
  CalendarDays,
  Layers,
  Sparkles,
  Users,
  Wand2,
  DollarSign
} from 'lucide-react';

interface SubHeaderBarProps {
  projectId: string;
}

export function SubHeaderBar({ projectId }: SubHeaderBarProps) {
  const pathname = usePathname();

  const tabs = [
    {
      label: "Overview / Dashboard",
      href: `/projects/${projectId}`,
      exact: true,
      icon: LayoutDashboard,
    },
    {
      label: "Shot List & Coverage",
      href: `/projects/${projectId}/shots`,
      exact: false,
      icon: Camera,
    },
    {
      label: "Stripboard & Schedule",
      href: `/projects/${projectId}/schedule`,
      exact: false,
      icon: CalendarDays,
    },
    {
      label: "Breakdown Catalogs",
      href: `/projects/${projectId}/breakdown`,
      exact: false,
      icon: Layers,
    },
    {
      label: "Crew Roster",
      href: `/projects/${projectId}/crew`,
      exact: false,
      icon: Users,
    },
    {
      label: "VFX Pipeline",
      href: `/projects/${projectId}/vfx`,
      exact: false,
      icon: Wand2,
    },
    {
      label: "Budget & Financials",
      href: `/projects/${projectId}/budget`,
      exact: false,
      icon: DollarSign,
    },
  ];

  return (
    <div className="h-10 px-5 bg-studio-950/80 border-b border-white/5 flex items-center gap-1 overflow-x-auto shrink-0 z-20">
      {tabs.map((tab) => {
        const isActive = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href);
        const Icon = tab.icon;

        return (
          <Link
            key={tab.label}
            href={tab.href}
            className={`flex items-center gap-2 px-3 py-1 rounded-lg text-xs font-semibold transition-all relative shrink-0 ${
              isActive
                ? 'bg-sky-500/15 text-sky-300 border border-sky-500/30'
                : 'text-slate-400 hover:text-slate-200 hover:bg-studio-900/60'
            }`}
          >
            <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-sky-400' : 'text-slate-400'}`} />
            <span>{tab.label}</span>
            {isActive && (
              <span className="w-1.5 h-1.5 rounded-full bg-sky-400" />
            )}
          </Link>
        );
      })}
    </div>
  );
}
