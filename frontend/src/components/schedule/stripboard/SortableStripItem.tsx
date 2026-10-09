"use client";

import React from 'react';
import Link from 'next/link';
import {
  GripVertical,
  Coffee,
  Truck,
  Trash2,
  ExternalLink,
  Wand2,
} from 'lucide-react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { StripboardItemDetail } from '@/lib/types';

// Strip color styles matching Hollywood call sheet conventions
function getStripColorClass(intExt?: string, timeOfDay?: string) {
  const isInt = intExt?.toUpperCase().includes('INT');
  const isNight = timeOfDay?.toUpperCase().includes('NIGHT');

  if (isInt && !isNight) {
    // INT DAY: Warm Golden Yellow
    return 'bg-amber-950/25 border-amber-500/30 text-amber-200 hover:border-amber-400/50';
  } else if (isInt && isNight) {
    // INT NIGHT: Rich Cobalt Blue
    return 'bg-blue-950/25 border-blue-500/30 text-blue-200 hover:border-blue-400/50';
  } else if (!isInt && !isNight) {
    // EXT DAY: Forest Green
    return 'bg-emerald-950/25 border-emerald-500/30 text-emerald-200 hover:border-emerald-400/50';
  } else {
    // EXT NIGHT: Midnight Navy / Obsidian
    return 'bg-slate-900 border-indigo-500/40 text-indigo-200 hover:border-indigo-400/60';
  }
}

interface SortableStripItemProps {
  item: StripboardItemDetail;
  dayId: string;
  projectId: string;
  onDelete: (stripId: string) => void;
}

export function SortableStripItem({
  item,
  dayId,
  projectId,
  onDelete,
}: SortableStripItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    data: { item, dayId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  if (item.item_type === 'BANNER') {
    const isLunch = item.banner_label.toLowerCase().includes('lunch');
    const isMove = item.banner_label.toLowerCase().includes('move');

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`group p-2.5 rounded-xl border text-xs font-mono font-bold tracking-wider uppercase flex items-center justify-between gap-3 shadow-md ${
          isLunch
            ? 'bg-amber-950/40 border-amber-500/30 text-amber-300'
            : isMove
            ? 'bg-purple-950/40 border-purple-500/30 text-purple-300'
            : 'bg-studio-850 border-white/10 text-slate-300'
        }`}
      >
        <div className="flex items-center gap-2">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-white p-0.5">
            <GripVertical className="w-3.5 h-3.5" />
          </div>
          {isLunch && <Coffee className="w-3.5 h-3.5 text-amber-400" />}
          {isMove && <Truck className="w-3.5 h-3.5 text-purple-400" />}
          <span>{item.banner_label}</span>
        </div>

        <button
          onClick={() => onDelete(item.id)}
          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 transition-opacity"
          title="Remove Banner"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Scene Strip
  const stripColor = getStripColorClass(item.int_ext, item.time_of_day);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group p-3 rounded-xl border shadow-sm transition-all flex items-center justify-between gap-3 ${stripColor}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-white p-0.5 shrink-0">
          <GripVertical className="w-4 h-4" />
        </div>

        <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-black/40 border border-white/10 shrink-0 text-white">
          #{item.scene_number}
        </span>

        <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-white/10 uppercase shrink-0">
          {item.int_ext}
        </span>

        <span className="font-bold text-xs truncate text-white">{item.set_name}</span>

        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/30 uppercase text-slate-300 shrink-0">
          {item.time_of_day}
        </span>

        {/* Cast ID Pills */}
        {item.cast_ids && item.cast_ids.length > 0 && (
          <div className="hidden sm:flex items-center gap-1 shrink-0">
            <span className="text-[10px] font-mono text-slate-400">Cast:</span>
            {item.cast_ids.map((cid) => (
              <span
                key={cid}
                className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-300 font-mono text-[10px] font-bold flex items-center justify-center border border-sky-500/30"
              >
                {cid}
              </span>
            ))}
          </div>
        )}

        {/* Badges */}
        <div className="hidden md:flex items-center gap-1.5 shrink-0">
          {item.setup_count && item.setup_count > 0 ? (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-white/5 text-slate-300 border border-white/5">
              {item.setup_count} setups
            </span>
          ) : null}
          {item.has_vfx && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-0.5">
              <Wand2 className="w-2.5 h-2.5" /> VFX
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="font-mono font-bold text-xs text-slate-300">
          {item.pages_display} pgs
        </span>

        {item.scene_id && (
          <Link
            href={`/projects/${projectId}/scenes/${item.scene_id}`}
            className="p-1 rounded text-slate-400 hover:text-sky-400 hover:bg-white/5 transition-colors"
            title="Open Scene Studio"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        )}

        <button
          onClick={() => onDelete(item.id)}
          className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity"
          title="Unschedule Scene"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
