"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Camera, Video, Film, CircleDot, Clapperboard, ChevronRight, Layers } from 'lucide-react';
import Link from 'next/link';
import { api, ProjectTree } from '@/lib/api';

export default function ShotListPage({ params }: { params: { projectId: string } }) {
  const { projectId } = params;

  const { data: projectTree, isLoading } = useQuery<ProjectTree>({
    queryKey: ['projectTree', projectId],
    queryFn: () => api.getProjectTree(projectId),
    enabled: Boolean(projectId),
  });

  if (isLoading || !projectTree) {
    return (
      <div className="h-full flex items-center justify-center p-12 text-slate-400">
        <Camera className="w-8 h-8 animate-bounce text-sky-400" />
      </div>
    );
  }

  const allScenes = projectTree.acts.flatMap((a) => a.sequences.flatMap((s) => s.scenes));
  const totalPlannedSetups = allScenes.reduce((acc, s) => acc + (s.setup_count || 0), 0);
  const totalPlannedShots = allScenes.reduce((acc, s) => acc + s.shot_count, 0);
  const totalRecordedTakes = allScenes.reduce((acc, s) => acc + s.take_count, 0);
  const totalCircleTakes = allScenes.reduce((acc, s) => acc + s.circle_take_count, 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/5">
        <div>
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-sky-400">
            Director & DP Coverage Registry
          </span>
          <h2 className="text-2xl font-black text-white tracking-tight mt-1">
            Global Shot List & Take Telemetry
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Unified camera setups, lens packages, movements, and circle take ratios across all narrative sequences.
          </p>
        </div>

        {/* Telemetry stats */}
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-xl bg-studio-900 border border-white/5 flex items-center gap-4 text-xs font-mono">
            <div>
              <span className="text-slate-400 block text-[10px]">TOTAL SETUPS</span>
              <span className="text-base font-bold text-indigo-400">{totalPlannedSetups}</span>
            </div>
            <span className="text-slate-700">|</span>
            <div>
              <span className="text-slate-400 block text-[10px]">TOTAL SHOTS</span>
              <span className="text-base font-bold text-white">{totalPlannedShots}</span>
            </div>
            <span className="text-slate-700">|</span>
            <div>
              <span className="text-slate-400 block text-[10px]">TOTAL TAKES</span>
              <span className="text-base font-bold text-amber-400">{totalRecordedTakes}</span>
            </div>
            <span className="text-slate-700">|</span>
            <div>
              <span className="text-slate-400 block text-[10px]">CIRCLE TAKES</span>
              <span className="text-base font-bold text-emerald-400">{totalCircleTakes}○</span>
            </div>
          </div>
        </div>
      </div>

      {/* Scenes Coverage Matrix */}
      <div className="space-y-4">
        {allScenes.map((scene) => (
          <div
            key={scene.id}
            className="p-5 rounded-2xl bg-studio-900/60 border border-white/5 hover:border-white/10 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4 group"
          >
            <div className="flex items-start md:items-center gap-4 min-w-0">
              <span className="w-12 h-12 rounded-xl bg-studio-800 border border-white/10 flex flex-col items-center justify-center shrink-0">
                <span className="text-[10px] font-mono text-slate-400 uppercase">SCENE</span>
                <span className="font-mono font-black text-sm text-white">#{scene.scene_number}</span>
              </span>

              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                      scene.int_ext === 'INT'
                        ? 'bg-sky-500/20 text-sky-300'
                        : 'bg-amber-500/20 text-amber-300'
                    }`}
                  >
                    {scene.int_ext}
                  </span>
                  <h4 className="font-bold text-sm text-white truncate">{scene.set_name}</h4>
                  <span className="text-xs text-slate-400 font-mono">- {scene.time_of_day}</span>
                </div>
                {scene.synopsis && (
                  <p className="text-xs text-slate-400 line-clamp-1 mt-1">{scene.synopsis}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="flex items-center gap-3 text-xs font-mono">
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-studio-800 text-slate-300">
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span>{scene.setup_count || 0} setups</span>
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-studio-800 text-slate-300">
                  <Video className="w-3.5 h-3.5 text-sky-400" />
                  <span>{scene.shot_count} shots</span>
                </span>
                <span className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-studio-800 text-slate-300">
                  <Clapperboard className="w-3.5 h-3.5 text-amber-400" />
                  <span>{scene.take_count} takes</span>
                </span>
                {scene.circle_take_count > 0 && (
                  <span className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-950/60 border border-emerald-800/40 text-emerald-300 font-bold">
                    <CircleDot className="w-3.5 h-3.5 text-emerald-400" />
                    <span>{scene.circle_take_count}○</span>
                  </span>
                )}
              </div>

              <Link
                href={`/projects/${projectId}/scenes/${scene.id}`}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white shadow-sm transition-colors group-hover:translate-x-0.5"
              >
                <span>Studio</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
