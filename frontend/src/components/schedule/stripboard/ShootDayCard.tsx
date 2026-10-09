"use client";

import React from 'react';
import {
  Clock,
  MapPin,
  FileDown,
  ClipboardList,
} from 'lucide-react';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { ShootDayDetail, StripboardItemDetail } from '@/lib/types';
import { SortableStripItem } from './SortableStripItem';

interface ShootDayCardProps {
  day: ShootDayDetail;
  projectId: string;
  filteredItems: StripboardItemDetail[];
  onOpenAddBanner: (dayId: string, dayNum: number) => void;
  onGenerateCallSheet: (dayId: string) => void;
  onOpenLogDpr: (dayId: string, dayNum: number) => void;
  onDeleteStrip: (stripId: string) => void;
}

export function ShootDayCard({
  day,
  projectId,
  filteredItems,
  onOpenAddBanner,
  onGenerateCallSheet,
  onOpenLogDpr,
  onDeleteStrip,
}: ShootDayCardProps) {
  return (
    <div className="rounded-2xl bg-studio-900 border border-white/10 shadow-2xl overflow-hidden">
      {/* Shoot Day Header Banner */}
      <div className="p-4 bg-studio-950/80 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-sky-500 text-black font-black font-mono flex items-center justify-center text-sm shadow-md">
            D{day.day_number}
          </span>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="font-black text-sm text-white tracking-wide uppercase">
                Day {day.day_number} &bull; {day.calendar_date}
              </h3>
              <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                {day.unit_name}
              </span>
            </div>
            {day.hospital_address && (
              <p className="text-[11px] text-rose-400/80 flex items-center gap-1 mt-0.5 font-mono">
                <MapPin className="w-3 h-3 shrink-0" /> {day.hospital_address}
              </p>
            )}
          </div>
        </div>

        {/* Production Math & Call Badges */}
        <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
          <span className="px-3 py-1 rounded-xl bg-studio-900 border border-white/10 text-sky-300 font-bold">
            {day.total_pages_display} &bull; {day.total_estimated_shoot_minutes} mins ({day.scene_count} scenes)
          </span>

          {day.general_crew_call && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-studio-900 border border-white/10 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-sky-400" />
              <span>Crew: {day.general_crew_call}</span>
            </span>
          )}

          {day.shooting_call && (
            <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-studio-900 border border-white/10 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span>Shoot: {day.shooting_call}</span>
            </span>
          )}

          <button
            onClick={() => onOpenAddBanner(day.id, day.day_number)}
            className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 transition-all text-xs font-bold"
          >
            + Banner
          </button>

          <button
            onClick={() => onGenerateCallSheet(day.id)}
            title="Generate Call Sheet"
            className="px-2.5 py-1 flex items-center gap-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:bg-purple-500/25 transition-all text-xs font-bold"
          >
            <FileDown className="w-3.5 h-3.5" />
            Call Sheet
          </button>

          <button
            onClick={() => onOpenLogDpr(day.id, day.day_number)}
            title="Log Daily Production Report"
            className="px-2.5 py-1 flex items-center gap-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/25 transition-all text-xs font-bold"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            Log DPR
          </button>
        </div>
      </div>

      {/* Sortable Strips List */}
      <SortableContext
        id={day.id}
        items={filteredItems.map((it) => it.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="p-3.5 space-y-2 min-h-[90px] bg-studio-950/30">
          {filteredItems.length === 0 ? (
            <div className="p-6 text-center text-xs font-mono text-slate-500 border border-dashed border-white/5 rounded-xl">
              No scenes or banners scheduled for Day {day.day_number}. Drag strips here or schedule from unscheduled pool.
            </div>
          ) : (
            filteredItems.map((item) => (
              <SortableStripItem
                key={item.id}
                item={item}
                dayId={day.id}
                projectId={projectId}
                onDelete={onDeleteStrip}
              />
            ))
          )}
        </div>
      </SortableContext>
    </div>
  );
}
