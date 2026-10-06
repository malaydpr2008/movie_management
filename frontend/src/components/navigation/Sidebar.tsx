"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ListTree,
  Clapperboard,
  Camera,
  CalendarDays,
  Layers,
  ChevronLeft,
  ChevronRight,
  Film,
  Sparkles,
  Clock,
  FileSpreadsheet
} from 'lucide-react';
import { useProjectStore } from '@/stores/useProjectStore';
import { ProjectTree } from '@/lib/api';

interface SidebarProps {
  projectId: string;
  projectTree?: ProjectTree;
}

export function Sidebar({ projectId, projectTree }: SidebarProps) {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, selectedSceneId } = useProjectStore();

  // Find first scene to link if none selected
  const firstSceneId =
    selectedSceneId ||
    projectTree?.acts?.[0]?.sequences?.[0]?.scenes?.[0]?.id ||
    "";

  const totalScenes = projectTree?.acts?.reduce(
    (acc, act) => acc + act.sequences.reduce((sAcc, seq) => sAcc + seq.scenes.length, 0),
    0
  ) || 0;

  const totalEighths = projectTree?.acts?.reduce(
    (acc, act) => acc + act.sequences.reduce((sAcc, seq) => sAcc + seq.scenes.reduce((pAcc, sc) => pAcc + sc.pages_eighths, 0), 0),
    0
  ) || 0;

  const totalPages = (totalEighths / 8).toFixed(1);

  const navItems = [
    {
      label: "Outliner",
      sublabel: "Acts, Sequences & Scenes",
      href: `/projects/${projectId}/outliner`,
      icon: ListTree,
      badge: `${totalScenes} sc`,
    },
    {
      label: "Scene Builder",
      sublabel: "Screenplay & Shot Engine",
      href: firstSceneId ? `/projects/${projectId}/scenes/${firstSceneId}` : `/projects/${projectId}/outliner`,
      icon: Clapperboard,
      badge: "Studio",
    },
    {
      label: "Shot List & Coverage",
      sublabel: "Setups, Lenses & Takes",
      href: `/projects/${projectId}/shots`,
      icon: Camera,
      badge: "Director",
    },
    {
      label: "Stripboard & Schedule",
      sublabel: "Shoot Days & Banners",
      href: `/projects/${projectId}/schedule`,
      icon: CalendarDays,
      badge: "AD Unit",
    },
    {
      label: "Breakdown Catalogs",
      sublabel: "Props, Costumes & Locations",
      href: `/projects/${projectId}/breakdown`,
      icon: Layers,
      badge: "Art Dept",
    },
  ];

  return (
    <aside
      className={`h-screen sticky top-0 flex flex-col bg-studio-900 border-r border-white/5 transition-all duration-300 z-40 ${
        sidebarCollapsed ? 'w-20' : 'w-72'
      }`}
    >
      {/* Brand Header */}
      <div className="h-16 px-4 flex items-center justify-between border-b border-white/5">
        <Link href={`/projects/${projectId}/outliner`} className="flex items-center gap-3 overflow-hidden">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 via-indigo-600 to-amber-500 p-0.5 shrink-0 shadow-lg shadow-sky-500/20">
            <div className="w-full h-full bg-studio-950 rounded-[10px] flex items-center justify-center">
              <Film className="w-5 h-5 text-sky-400" />
            </div>
          </div>
          {!sidebarCollapsed && (
            <div className="flex flex-col min-w-0">
              <span className="font-extrabold text-sm tracking-wider uppercase text-white truncate flex items-center gap-1.5">
                CineFlow <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">PRO</span>
              </span>
              <span className="text-xs text-slate-400 truncate">
                {projectTree?.title || "Production Studio"}
              </span>
            </div>
          )}
        </Link>

        <button
          onClick={toggleSidebar}
          aria-label="Toggle Sidebar"
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-studio-800 transition-colors"
        >
          {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
        </button>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1.5 overflow-y-auto">
        {!sidebarCollapsed && (
          <div className="px-3 pb-2 text-[10px] font-semibold text-slate-400 uppercase tracking-widest">
            Production Workspace
          </div>
        )}

        {navItems.map((item) => {
          const isActive = pathname.startsWith(item.href) || (item.label === "Scene Builder" && pathname.includes("/scenes/"));
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              href={item.href}
              className={`flex items-center gap-3.5 px-3 py-3 rounded-xl transition-all duration-200 group relative ${
                isActive
                  ? 'bg-gradient-to-r from-sky-500/15 to-indigo-500/10 text-white border border-sky-500/30 shadow-sm'
                  : 'text-slate-400 hover:text-slate-100 hover:bg-studio-800/60'
              }`}
            >
              <div className={`p-2 rounded-lg transition-colors shrink-0 ${
                isActive ? 'bg-sky-500/20 text-sky-400' : 'bg-studio-800/40 text-slate-400 group-hover:text-slate-200 group-hover:bg-studio-700/60'
              }`}>
                <Icon className="w-4 h-4" />
              </div>

              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-semibold truncate tracking-tight">{item.label}</span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded font-mono ${
                      isActive ? 'bg-sky-500/25 text-sky-300' : 'bg-studio-800 text-slate-400'
                    }`}>
                      {item.badge}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">{item.sublabel}</p>
                </div>
              )}

              {isActive && (
                <div className="absolute left-0 top-2 bottom-2 w-1 bg-sky-400 rounded-r-full shadow-glow" />
              )}
            </Link>
          );
        })}
      </nav>

      {/* Production Telemetry Footer */}
      {!sidebarCollapsed && projectTree && (
        <div className="p-3 m-3 rounded-xl bg-studio-850/80 border border-white/5 space-y-2.5">
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" /> Target Runtime
            </span>
            <span className="font-mono text-white font-medium">{projectTree.target_runtime_minutes}m</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <FileSpreadsheet className="w-3.5 h-3.5 text-sky-400" /> Total Script
            </span>
            <span className="font-mono text-white font-medium">{totalPages} pgs</span>
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400">
            <span className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Aspect Ratio
            </span>
            <span className="font-mono text-white font-medium">{projectTree.aspect_ratio}</span>
          </div>
          <div className="w-full bg-studio-950 h-1.5 rounded-full overflow-hidden">
            <div className="bg-gradient-to-r from-sky-500 via-indigo-500 to-amber-500 h-full w-full rounded-full" />
          </div>
        </div>
      )}
    </aside>
  );
}
