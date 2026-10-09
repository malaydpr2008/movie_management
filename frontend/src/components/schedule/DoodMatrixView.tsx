"use client";

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { api, DoodData } from '@/lib/api';
import { Users, AlertCircle, HelpCircle } from 'lucide-react';

interface DoodMatrixViewProps {
  projectId: string;
}

function getStatusBadge(code?: string) {
  if (!code) {
    return <span className="text-slate-700 font-mono text-xs">&bull;</span>;
  }

  switch (code) {
    case 'SW':
      return (
        <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-mono font-black bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/10">
          SW
        </span>
      );
    case 'W':
      return (
        <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-mono font-black bg-sky-500/20 text-sky-400 border border-sky-500/40 shadow-sm shadow-sky-500/10">
          W
        </span>
      );
    case 'WF':
      return (
        <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-mono font-black bg-amber-500/20 text-amber-400 border border-amber-500/40 shadow-sm shadow-amber-500/10">
          WF
        </span>
      );
    case 'SWF':
      return (
        <span className="inline-block px-2 py-1 rounded-md text-[11px] font-mono font-black bg-purple-500/25 text-purple-300 border border-purple-500/50 shadow-sm shadow-purple-500/10">
          SWF
        </span>
      );
    case 'H':
      return (
        <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-mono font-black bg-slate-800 text-slate-400 border border-slate-700">
          H
        </span>
      );
    case 'T':
      return (
        <span className="inline-block px-2.5 py-1 rounded-md text-[11px] font-mono font-black bg-rose-500/20 text-rose-300 border border-rose-500/40">
          T
        </span>
      );
    default:
      return (
        <span className="inline-block px-2 py-1 rounded-md text-[11px] font-mono font-bold bg-white/5 text-slate-300">
          {code}
        </span>
      );
  }
}

export default function DoodMatrixView({ projectId }: DoodMatrixViewProps) {
  const { data: dood, isLoading, error } = useQuery<DoodData>({
    queryKey: ['doodMatrix', projectId],
    queryFn: () => api.getDoodMatrix(projectId),
    enabled: Boolean(projectId),
  });

  if (isLoading) {
    return (
      <div className="p-16 flex flex-col items-center justify-center gap-3 text-slate-400">
        <Users className="w-8 h-8 animate-pulse text-sky-400" />
        <span className="font-mono text-xs">Computing SAG-AFTRA Day-out-of-Days Matrix...</span>
      </div>
    );
  }

  if (error || !dood) {
    return (
      <div className="p-12 text-center text-rose-400 flex items-center justify-center gap-2">
        <AlertCircle className="w-5 h-5" />
        <span>Failed to load Day-out-of-Days matrix</span>
      </div>
    );
  }

  const { shoot_days, characters, daily_working_summary } = dood;

  return (
    <div className="space-y-6">
      {/* Legend & Guide Banner */}
      <div className="p-4 rounded-2xl bg-studio-900 border border-white/5 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-sky-400" />
          <span className="text-xs font-mono font-bold text-white uppercase tracking-wider">
            Industry Standard DooD Legend:
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 font-bold text-[10px]">
              SW
            </span>
            <span className="text-slate-300">Start Work</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-400 border border-sky-500/40 font-bold text-[10px]">
              W
            </span>
            <span className="text-slate-300">Work</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 font-bold text-[10px]">
              H
            </span>
            <span className="text-slate-300">Hold (Paid Idle)</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 font-bold text-[10px]">
              WF
            </span>
            <span className="text-slate-300">Work Finish</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="px-1.5 py-0.5 rounded bg-purple-500/25 text-purple-300 border border-purple-500/50 font-bold text-[10px]">
              SWF
            </span>
            <span className="text-slate-300">Single Day (SWF)</span>
          </div>
        </div>
      </div>

      {/* Spreadsheet Matrix Table */}
      <div className="rounded-2xl bg-studio-900 border border-white/10 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-studio-950 border-b border-white/10">
                {/* Sticky Left Headers */}
                <th className="sticky left-0 z-20 bg-studio-950 px-4 py-3.5 font-mono font-bold text-slate-400 uppercase tracking-wider text-[11px] w-12 text-center border-r border-white/5">
                  ID #
                </th>
                <th className="sticky left-12 z-20 bg-studio-950 px-4 py-3.5 font-bold text-white uppercase tracking-wider text-[11px] min-w-[180px] border-r border-white/5">
                  Character & Actor
                </th>
                <th className="px-3 py-3.5 font-mono font-bold text-sky-400 uppercase tracking-wider text-[11px] text-center border-r border-white/5 whitespace-nowrap">
                  Work
                </th>
                <th className="px-3 py-3.5 font-mono font-bold text-slate-400 uppercase tracking-wider text-[11px] text-center border-r border-white/5 whitespace-nowrap">
                  Hold
                </th>
                <th className="px-3 py-3.5 font-mono font-bold text-slate-400 uppercase tracking-wider text-[11px] text-center border-r border-white/10 whitespace-nowrap">
                  Idle %
                </th>

                {/* Shoot Day Columns */}
                {shoot_days.map((day) => (
                  <th
                    key={day.id}
                    className="px-4 py-3 font-mono text-center border-r border-white/5 last:border-r-0 min-w-[90px]"
                  >
                    <div className="font-black text-white text-xs">
                      DAY {day.day_number}
                    </div>
                    <div className="text-[10px] text-slate-400 font-normal">
                      {day.calendar_date}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {characters.length === 0 ? (
                <tr>
                  <td colSpan={5 + shoot_days.length} className="px-6 py-12 text-center text-slate-500 font-mono">
                    No characters created in this project. Add characters in Breakdown Catalogs.
                  </td>
                </tr>
              ) : (
                characters.map((char) => (
                  <tr
                    key={char.id}
                    className="hover:bg-white/[0.02] transition-colors group"
                  >
                    {/* Sticky ID */}
                    <td className="sticky left-0 z-10 bg-studio-900 group-hover:bg-studio-850 px-4 py-3 text-center font-mono font-black text-sky-400 border-r border-white/5">
                      {char.cast_id_number}
                    </td>

                    {/* Sticky Character & Actor */}
                    <td className="sticky left-12 z-10 bg-studio-900 group-hover:bg-studio-850 px-4 py-3 border-r border-white/5">
                      <div className="font-bold text-white text-xs">{char.name}</div>
                      {char.actor_name && (
                        <div className="text-[11px] text-slate-400">{char.actor_name}</div>
                      )}
                    </td>

                    {/* Total Work Days */}
                    <td className="px-3 py-3 text-center font-mono font-bold text-sky-300 border-r border-white/5">
                      {char.total_work_days}d
                    </td>

                    {/* Total Hold Days */}
                    <td className="px-3 py-3 text-center font-mono font-bold text-slate-400 border-r border-white/5">
                      {char.total_hold_days}d
                    </td>

                    {/* Idle Ratio */}
                    <td className="px-3 py-3 text-center font-mono text-[11px] text-slate-500 border-r border-white/10">
                      {Math.round((char.idle_ratio ?? 0) * 100)}%
                    </td>

                    {/* Daily Status Cells */}
                    {shoot_days.map((day) => (
                      <td
                        key={day.id}
                        className="px-4 py-3 text-center border-r border-white/5 last:border-r-0"
                      >
                        {getStatusBadge(char.daily_status[day.id])}
                      </td>
                    ))}
                  </tr>
                ))
              )}
            </tbody>

            {/* Total Working Actors Payroll Summary Row */}
            <tfoot>
              <tr className="bg-studio-950 border-t-2 border-white/10 font-mono font-bold">
                <td colSpan={2} className="sticky left-0 z-10 bg-studio-950 px-4 py-3.5 text-xs uppercase tracking-wider text-amber-300 border-r border-white/5">
                  Active On-Set Talent Count
                </td>
                <td className="px-3 py-3.5 text-center text-sky-400 border-r border-white/5">
                  -
                </td>
                <td className="px-3 py-3.5 text-center text-slate-400 border-r border-white/5">
                  -
                </td>
                <td className="px-3 py-3.5 text-center text-slate-500 border-r border-white/10">
                  -
                </td>

                {shoot_days.map((day) => {
                  const activeCount = daily_working_summary[day.id] || 0;
                  return (
                    <td
                      key={day.id}
                      className="px-4 py-3.5 text-center border-r border-white/5 last:border-r-0"
                    >
                      <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-black bg-amber-500/15 text-amber-300 border border-amber-500/30">
                        {activeCount} cast
                      </span>
                    </td>
                  );
                })}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </div>
  );
}
