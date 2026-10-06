"use client";

import React from 'react';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { GripVertical, Clapperboard, Video, CheckCircle, Clock, ChevronRight } from 'lucide-react';
import Link from 'next/link';
import { SceneTreeNode } from '@/lib/api';
import { useProjectStore } from '@/stores/useProjectStore';

interface SceneCardProps {
  scene: SceneTreeNode;
  projectId: string;
  sequenceId: string;
  isOverlay?: boolean;
}

export function SceneCard({ scene, projectId, sequenceId, isOverlay = false }: SceneCardProps) {
  const { setSelectedSceneId } = useProjectStore();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: scene.id,
    data: {
      type: 'SCENE',
      scene,
      sequenceId,
    },
    disabled: isOverlay,
  });

  const style: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  const isInt = scene.int_ext === 'INT';
  const isNight = scene.time_of_day.toLowerCase().includes('night');

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group relative rounded-xl border transition-all duration-200 ${
        isOverlay
          ? 'bg-studio-850/95 border-sky-500 shadow-2xl scale-105 rotate-1 cursor-grabbing z-50 ring-2 ring-sky-500/50'
          : 'bg-studio-900/90 border-white/5 hover:border-sky-500/30 hover:bg-studio-850 shadow-md hover:shadow-xl'
      }`}
    >
      <div className="p-3.5 space-y-2.5">
        {/* Top Header: Drag handle + Scene # + Int/Ext + Time */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            {!isOverlay && (
              <button
                {...attributes}
                {...listeners}
                aria-label="Drag scene"
                className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-slate-300 p-0.5 rounded transition-colors -ml-1"
              >
                <GripVertical className="w-4 h-4" />
              </button>
            )}
            <span className="font-mono text-xs font-bold text-white bg-studio-800 px-2 py-0.5 rounded border border-white/10 shrink-0">
              #{scene.scene_number}
            </span>
            <span
              className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider ${
                isInt ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              {scene.int_ext}
            </span>
            <span
              className={`text-[10px] font-medium px-2 py-0.5 rounded uppercase tracking-wider ${
                isNight ? 'bg-indigo-950 text-indigo-300 border border-indigo-800/40' : 'bg-yellow-950/60 text-yellow-300 border border-yellow-800/30'
              }`}
            >
              {scene.time_of_day}
            </span>
          </div>

          <span className="font-mono text-[11px] text-slate-400 bg-studio-950/80 px-2 py-0.5 rounded shrink-0">
            {scene.pages_display} pgs
          </span>
        </div>

        {/* Set Name */}
        <h4 className="font-bold text-sm text-slate-100 group-hover:text-sky-300 transition-colors tracking-tight line-clamp-1">
          {scene.set_name}
        </h4>

        {/* Synopsis preview */}
        {scene.synopsis && (
          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
            {scene.synopsis}
          </p>
        )}

        {/* Telemetry & Action Footer */}
        <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs text-slate-400">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1 font-mono text-[11px] text-slate-300" title="Shots planned">
              <Video className="w-3.5 h-3.5 text-sky-400" />
              {scene.shot_count}
            </span>
            <span className="flex items-center gap-1 font-mono text-[11px] text-slate-300" title="Recorded takes">
              <Clapperboard className="w-3.5 h-3.5 text-amber-400" />
              {scene.take_count}
              {scene.circle_take_count > 0 && (
                <span className="text-emerald-400 text-[10px]">({scene.circle_take_count}○)</span>
              )}
            </span>
            <span className="flex items-center gap-1 font-mono text-[11px] text-slate-400" title="Est. shooting time">
              <Clock className="w-3 h-3 text-slate-500" />
              {scene.estimated_shoot_minutes}m
            </span>
          </div>

          {!isOverlay && (
            <Link
              href={`/projects/${projectId}/scenes/${scene.id}`}
              onClick={() => setSelectedSceneId(scene.id)}
              className="flex items-center gap-1 text-[11px] font-semibold text-sky-400 hover:text-sky-300 transition-colors group-hover:translate-x-0.5"
            >
              Studio
              <ChevronRight className="w-3 h-3" />
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
