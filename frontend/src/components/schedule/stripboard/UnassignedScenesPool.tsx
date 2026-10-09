"use client";

import React from 'react';
import { ShootDayDetail, UnassignedScene } from '@/lib/types';

interface UnassignedScenesPoolProps {
  unassigned: UnassignedScene[];
  days: ShootDayDetail[];
  isOpen: boolean;
  onScheduleScene: (sceneId: string, shootDayId: string) => void;
}

export function UnassignedScenesPool({
  unassigned,
  days,
  isOpen,
  onScheduleScene,
}: UnassignedScenesPoolProps) {
  if (!isOpen || unassigned.length === 0) return null;

  return (
    <div className="p-5 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-3 animate-fade-in">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
          <h4 className="text-xs font-mono font-black uppercase tracking-wider text-amber-300">
            Unassigned Scenes Waiting For Call Scheduling ({unassigned.length})
          </h4>
        </div>
        <span className="text-[11px] text-slate-400">
          Select target shoot day to schedule strip
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
        {unassigned.map((sc) => (
          <div
            key={sc.id}
            className="p-3 rounded-xl bg-studio-950 border border-white/5 hover:border-amber-500/30 transition-all flex items-center justify-between gap-3"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <span className="font-mono font-black text-xs text-white">#{sc.scene_number}</span>
                <span className="text-[10px] font-mono px-1 rounded bg-white/10 text-slate-300">{sc.int_ext}</span>
                <span className="text-[10px] font-mono text-slate-400">{sc.time_of_day}</span>
              </div>
              <p className="text-xs font-bold text-slate-200 truncate mt-0.5">{sc.set_name}</p>
              <p className="text-[11px] font-mono text-slate-400">{sc.pages_display} pgs • {sc.estimated_shoot_minutes}m</p>
            </div>

            <div className="shrink-0 flex items-center gap-1.5">
              <select
                defaultValue=""
                onChange={(e) => {
                  if (e.target.value) {
                    onScheduleScene(sc.id, e.target.value);
                  }
                }}
                className="bg-studio-900 border border-white/15 rounded-lg px-2 py-1 text-[11px] font-mono text-sky-400 focus:outline-none"
              >
                <option value="" disabled>+ Day...</option>
                {days.map((d) => (
                  <option key={d.id} value={d.id}>
                    Day {d.day_number}
                  </option>
                ))}
              </select>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
