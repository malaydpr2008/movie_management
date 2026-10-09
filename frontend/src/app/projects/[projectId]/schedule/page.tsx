"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  CalendarDays,
  FileSpreadsheet,
  Layers,
  Sparkles,
  RefreshCw
} from 'lucide-react';
import { ScheduleData } from '@/lib/api';
import { useSchedule } from '@/hooks/useProduction';
import StripboardView from '@/components/schedule/StripboardView';
import DoodMatrixView from '@/components/schedule/DoodMatrixView';

export default function SchedulePage({ params }: { params: { projectId: string } }) {
  const { projectId } = params;
  const [activeTab, setActiveTab] = useState<'stripboard' | 'dood'>('stripboard');

  const {
    data: schedule,
    isLoading,
    refetch,
    isFetching,
  } = useSchedule(projectId);

  if (isLoading || !schedule) {
    return (
      <div className="h-full min-h-[500px] flex flex-col items-center justify-center p-12 text-slate-400 gap-3">
        <CalendarDays className="w-10 h-10 animate-bounce text-sky-400" />
        <span className="font-mono text-sm">Loading Stripboard Engine & Shoot Days...</span>
      </div>
    );
  }

  const totalScheduledScenes = schedule.shoot_days.reduce((acc, d) => acc + d.scene_count, 0);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Studio Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-sky-400">
              1st Assistant Director Production Logistics
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight mt-1 flex items-center gap-3">
            <span>Stripboard & Production Graph</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Reorder shooting strips across shoot days, plan company moves and meal breaks, and track SAG-AFTRA Day-out-of-Days talent payroll.
          </p>
        </div>

        {/* View Switcher Tabs */}
        <div className="flex items-center gap-3">
          <div className="p-1 rounded-xl bg-studio-900 border border-white/10 flex items-center gap-1 shadow-lg">
            <button
              onClick={() => setActiveTab('stripboard')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs font-bold transition-all ${
                activeTab === 'stripboard'
                  ? 'bg-sky-500 text-black shadow-md shadow-sky-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Interactive Stripboard</span>
            </button>

            <button
              onClick={() => setActiveTab('dood')}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg font-mono text-xs font-bold transition-all ${
                activeTab === 'dood'
                  ? 'bg-sky-500 text-black shadow-md shadow-sky-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>DooD Cast Matrix</span>
            </button>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2.5 rounded-xl bg-studio-900 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all disabled:opacity-50"
            title="Refresh Schedule"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-sky-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* High-Level Schedule KPIs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-studio-900/60 border border-white/5 space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-400">Total Shoot Days</span>
          <div className="text-xl font-black text-white font-mono">{schedule.shoot_days.length} Days</div>
        </div>

        <div className="p-4 rounded-2xl bg-studio-900/60 border border-white/5 space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-400">Scheduled Scenes</span>
          <div className="text-xl font-black text-sky-400 font-mono">{totalScheduledScenes} Scenes</div>
        </div>

        <div className="p-4 rounded-2xl bg-studio-900/60 border border-white/5 space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-400">Unscheduled Pool</span>
          <div className="text-xl font-black text-amber-400 font-mono">{schedule.unassigned_scenes.length} Scenes</div>
        </div>

        <div className="p-4 rounded-2xl bg-studio-900/60 border border-white/5 space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-400">Production Unit</span>
          <div className="text-xl font-black text-emerald-400 font-mono truncate">
            {schedule.units[0]?.name || 'Main Unit'}
          </div>
        </div>
      </div>

      {/* Active Tabbed View */}
      {activeTab === 'stripboard' ? (
        <StripboardView
          projectId={projectId}
          schedule={schedule}
          onRefresh={() => refetch()}
        />
      ) : (
        <DoodMatrixView projectId={projectId} />
      )}
    </div>
  );
}
