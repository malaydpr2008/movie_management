"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Film,
  Clapperboard,
  Clock,
  FileSpreadsheet,
  Camera,
  Target,
  ChevronRight,
  Sparkles,
  Layers,
  ArrowRight,
  TrendingUp,
  Compass
} from 'lucide-react';
import Link from 'next/link';
import { ProjectTree } from '@/lib/api';
import { useProjectTree } from '@/hooks/useNarrative';

export default function ProjectOverviewPage({ params }: { params: { projectId: string } }) {
  const { projectId } = params;

  const { data: projectTree, isLoading } = useProjectTree(projectId);

  if (isLoading || !projectTree) {
    return (
      <div className="h-full flex items-center justify-center p-12 text-slate-400">
        <Film className="w-8 h-8 animate-bounce text-sky-400" />
      </div>
    );
  }

  const allScenes = projectTree.acts.flatMap((a) => a.sequences.flatMap((s) => s.scenes));
  const totalScenes = allScenes.length;
  const totalEighths = allScenes.reduce((acc, s) => acc + s.pages_eighths, 0);
  const totalPages = (totalEighths / 8).toFixed(1);
  const totalPlannedShots = allScenes.reduce((acc, s) => acc + s.shot_count, 0);
  const totalShootMinutes = allScenes.reduce((acc, s) => acc + s.estimated_shoot_minutes, 0);
  const totalShootHours = (totalShootMinutes / 60).toFixed(1);

  const intCount = allScenes.filter((s) => s.int_ext === 'INT').length;
  const extCount = allScenes.filter((s) => s.int_ext === 'EXT').length;
  const dayCount = allScenes.filter((s) => !s.time_of_day.toLowerCase().includes('night')).length;
  const nightCount = allScenes.filter((s) => s.time_of_day.toLowerCase().includes('night')).length;

  const firstSceneId = allScenes[0]?.id;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Overview Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/5">
        <div>
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-sky-400">
            Production Management Overview
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight mt-1">
            {projectTree.title}
          </h2>
          <p className="text-xs text-slate-400 mt-1 max-w-2xl">
            Dual-tree narrative outliner, screenplay lined script coverage, and daily production stripboards.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {firstSceneId && (
            <Link
              href={`/projects/${projectId}/scenes/${firstSceneId}`}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white shadow-lg shadow-sky-600/20 transition-all"
            >
              <Clapperboard className="w-4 h-4" />
              <span>Open Scene Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      {/* High-Level Telemetry Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-studio-900/60 border border-white/5 space-y-1">
          <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
            <FileSpreadsheet className="w-4 h-4 text-sky-400" /> Total Pages
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">{totalPages}</span>
            <span className="text-xs text-slate-500 font-mono">({totalEighths} 1/8ths)</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-studio-900/60 border border-white/5 space-y-1">
          <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
            <Clapperboard className="w-4 h-4 text-amber-400" /> Total Scenes
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">{totalScenes}</span>
            <span className="text-xs text-slate-500 font-mono">across {projectTree.acts.length} acts</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-studio-900/60 border border-white/5 space-y-1">
          <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
            <Camera className="w-4 h-4 text-emerald-400" /> Planned Shots
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">{totalPlannedShots}</span>
            <span className="text-xs text-slate-500 font-mono">coverage setups</span>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-studio-900/60 border border-white/5 space-y-1">
          <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
            <Clock className="w-4 h-4 text-purple-400" /> Estimated Shoot Time
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">{totalShootHours}h</span>
            <span className="text-xs text-slate-500 font-mono">({totalShootMinutes}m)</span>
          </div>
        </div>
      </div>

      {/* Pacing & Ratios Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* INT vs EXT */}
        <div className="p-5 rounded-2xl bg-studio-900/60 border border-white/5 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-300">Location Distribution (INT / EXT)</span>
            <span className="font-mono text-slate-400">{intCount} INT / {extCount} EXT</span>
          </div>
          <div className="w-full h-3 bg-studio-950 rounded-full overflow-hidden flex">
            <div
              className="bg-sky-500 h-full transition-all"
              style={{ width: `${totalScenes > 0 ? (intCount / totalScenes) * 100 : 50}%` }}
              title={`INT: ${intCount} scenes`}
            />
            <div
              className="bg-amber-500 h-full transition-all"
              style={{ width: `${totalScenes > 0 ? (extCount / totalScenes) * 100 : 50}%` }}
              title={`EXT: ${extCount} scenes`}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-sky-500" />
              Interior: {totalScenes > 0 ? ((intCount / totalScenes) * 100).toFixed(0) : 0}%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500" />
              Exterior: {totalScenes > 0 ? ((extCount / totalScenes) * 100).toFixed(0) : 0}%
            </span>
          </div>
        </div>

        {/* DAY vs NIGHT */}
        <div className="p-5 rounded-2xl bg-studio-900/60 border border-white/5 space-y-3">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-300">Time of Day Balance (DAY / NIGHT)</span>
            <span className="font-mono text-slate-400">{dayCount} DAY / {nightCount} NIGHT</span>
          </div>
          <div className="w-full h-3 bg-studio-950 rounded-full overflow-hidden flex">
            <div
              className="bg-yellow-500 h-full transition-all"
              style={{ width: `${totalScenes > 0 ? (dayCount / totalScenes) * 100 : 50}%` }}
              title={`DAY: ${dayCount} scenes`}
            />
            <div
              className="bg-indigo-600 h-full transition-all"
              style={{ width: `${totalScenes > 0 ? (nightCount / totalScenes) * 100 : 50}%` }}
              title={`NIGHT: ${nightCount} scenes`}
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-yellow-500" />
              Daylight: {totalScenes > 0 ? ((dayCount / totalScenes) * 100).toFixed(0) : 0}%
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-600" />
              Nighttime: {totalScenes > 0 ? ((nightCount / totalScenes) * 100).toFixed(0) : 0}%
            </span>
          </div>
        </div>
      </div>

      {/* 3-Act Structure Breakdown Cards */}
      <div className="space-y-4">
        <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
          <Target className="w-4 h-4 text-sky-400" />
          Acts & Structural Pipeline
        </h3>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {projectTree.acts.map((act) => {
            const actScenes = act.sequences.flatMap((s) => s.scenes);
            const actEighths = actScenes.reduce((acc, s) => acc + s.pages_eighths, 0);
            const actPages = (actEighths / 8).toFixed(1);
            const progressPct = Math.min(
              100,
              (Number(actPages) / act.target_page_length) * 100
            );

            return (
              <div
                key={act.id}
                className="p-5 rounded-2xl bg-studio-900/80 border border-white/5 flex flex-col justify-between space-y-4 group hover:border-sky-500/30 transition-all"
              >
                <div className="space-y-3">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="font-black text-sm text-white group-hover:text-sky-300 transition-colors uppercase font-mono">
                        {act.title}
                      </h4>
                      <p className="text-xs text-sky-400 mt-0.5 line-clamp-1">
                        {act.dramatic_milestone || "Macro dramatic milestone"}
                      </p>
                    </div>
                    <span className="font-mono text-xs text-slate-400 bg-studio-800 px-2 py-0.5 rounded shrink-0">
                      {act.sequences.length} seqs
                    </span>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1">
                    <div className="flex justify-between text-[11px] font-mono text-slate-400">
                      <span>Pacing: {actPages} pgs</span>
                      <span>Target: {act.target_page_length} pgs</span>
                    </div>
                    <div className="w-full h-2 bg-studio-950 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-sky-500 to-indigo-500 rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      />
                    </div>
                  </div>

                  {/* Sequences preview */}
                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    {act.sequences.map((seq) => (
                      <Link
                        key={seq.id}
                        href={`/projects/${projectId}/sequences/${seq.id}`}
                        className="flex items-center justify-between p-1.5 rounded-lg bg-studio-950/60 hover:bg-studio-850 text-xs transition-colors"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className="w-2 h-2 rounded-full shrink-0"
                            style={{ backgroundColor: seq.color_tag }}
                          />
                          <span className="font-semibold text-slate-300 truncate">{seq.title}</span>
                        </div>
                        <span className="font-mono text-[10px] text-slate-500 shrink-0">
                          {seq.scenes.length} sc
                        </span>
                      </Link>
                    ))}
                  </div>
                </div>

                <Link
                  href={`/projects/${projectId}/acts/${act.id}`}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-studio-800 hover:bg-studio-700 text-xs font-bold text-white transition-colors border border-white/5"
                >
                  <span>Open Act Workspace</span>
                  <ChevronRight className="w-3.5 h-3.5 text-sky-400" />
                </Link>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
