"use client";

import React, { useState } from 'react';
import { useDroppable } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { Plus, HelpCircle, Music, MoreVertical, Sparkles } from 'lucide-react';
import { SequenceTreeNode, SceneTreeNode } from '@/lib/api';
import { SceneCard } from './SceneCard';

interface SequenceColumnProps {
  sequence: SequenceTreeNode;
  projectId: string;
  onAddScene?: (sequenceId: string) => void;
}

export function SequenceColumn({ sequence, projectId, onAddScene }: SequenceColumnProps) {
  const { setNodeRef, isOver } = useDroppable({
    id: `seq-${sequence.id}`,
    data: {
      type: 'SEQUENCE',
      sequence,
    },
  });

  const sceneIds = sequence.scenes.map((s) => s.id);
  const totalSeqPages = (
    sequence.scenes.reduce((acc, s) => acc + s.pages_eighths, 0) / 8
  ).toFixed(1);

  return (
    <div
      ref={setNodeRef}
      className={`flex flex-col w-80 shrink-0 rounded-2xl border transition-all duration-200 ${
        isOver
          ? 'bg-studio-850/90 border-sky-400 ring-2 ring-sky-500/20'
          : 'bg-studio-900/60 border-white/5 hover:border-white/10'
      }`}
    >
      {/* Sequence Header */}
      <div className="p-3.5 border-b border-white/5 space-y-2">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className="w-3 h-3 rounded-full shrink-0 shadow-sm"
              style={{ backgroundColor: sequence.color_tag }}
            />
            <h3 className="font-bold text-xs text-white uppercase tracking-wider truncate">
              {sequence.title}
            </h3>
          </div>
          <span className="font-mono text-[10px] text-slate-400 bg-studio-950 px-2 py-0.5 rounded border border-white/5 shrink-0">
            {sequence.scenes.length} sc • {totalSeqPages}p
          </span>
        </div>

        {sequence.dramatic_question && (
          <div className="text-[11px] text-slate-400 italic bg-studio-950/60 p-2 rounded-lg border border-white/5 flex items-start gap-1.5 leading-snug">
            <HelpCircle className="w-3.5 h-3.5 text-sky-400 shrink-0 mt-0.5" />
            <span>&ldquo;{sequence.dramatic_question}&rdquo;</span>
          </div>
        )}

        {sequence.temp_score_reference && (
          <div className="text-[10px] font-mono text-slate-500 flex items-center gap-1.5 truncate">
            <Music className="w-3 h-3 text-amber-400 shrink-0" />
            <span className="truncate">{sequence.temp_score_reference}</span>
          </div>
        )}
      </div>

      {/* Sortable Scenes Container */}
      <div className="p-3 flex-1 overflow-y-auto space-y-2.5 min-h-[160px]">
        <SortableContext items={sceneIds} strategy={verticalListSortingStrategy}>
          {sequence.scenes.map((scene) => (
            <SceneCard
              key={scene.id}
              scene={scene}
              projectId={projectId}
              sequenceId={sequence.id}
            />
          ))}
        </SortableContext>

        {sequence.scenes.length === 0 && (
          <div className="h-32 border-2 border-dashed border-white/10 rounded-xl flex flex-col items-center justify-center text-xs text-slate-500 p-4 text-center">
            <span>Empty Sequence</span>
            <span className="text-[11px] text-slate-600 mt-1">Drop scenes here to reorder</span>
          </div>
        )}
      </div>

      {/* Footer: Quick Add Scene */}
      <div className="p-2.5 border-t border-white/5">
        <button
          onClick={() => onAddScene?.(sequence.id)}
          className="w-full flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-studio-850 hover:bg-studio-800 text-xs font-semibold text-slate-300 hover:text-white border border-white/5 transition-colors"
        >
          <Plus className="w-3.5 h-3.5 text-sky-400" />
          <span>Add Scene</span>
        </button>
      </div>
    </div>
  );
}
