"use client";

import React from 'react';
import {
  ChevronDown,
  ChevronRight,
  CircleDot,
  Trash2,
  Plus,
  Image as ImageIcon,
} from 'lucide-react';
import { Shot } from '@/lib/types';

interface ShotRowItemProps {
  shot: Shot;
  setupCode: string;
  isExpanded: boolean;
  isSelected: boolean;
  onToggleExpand: () => void;
  onOpenTakeLogger: () => void;
  onToggleCircle: (takeId: string) => void;
  onDeleteShot: (shotId: string) => void;
}

export function ShotRowItem({
  shot,
  setupCode,
  isExpanded,
  isSelected,
  onToggleExpand,
  onOpenTakeLogger,
  onToggleCircle,
  onDeleteShot,
}: ShotRowItemProps) {
  const circleTakesCount = shot.takes.filter((t) => t.is_circle_take).length;

  return (
    <div
      className={`transition-colors ${
        isSelected ? 'bg-sky-950/30 ring-1 ring-sky-500/30' : 'hover:bg-studio-900/50'
      }`}
    >
      {/* Shot Row Header */}
      <div className="p-3 flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <button
            onClick={onToggleExpand}
            className="text-slate-400 hover:text-white p-0.5 rounded"
          >
            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          </button>

          {/* Shot Thumbnail */}
          <div className="w-12 h-8 rounded bg-studio-900 border border-white/10 shrink-0 overflow-hidden relative">
            {shot.storyboard_frame_url ? (
              <img
                src={shot.storyboard_frame_url}
                alt="Storyboard"
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-slate-600">
                <ImageIcon className="w-3.5 h-3.5" />
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-mono font-bold text-xs text-white">
                {setupCode}{shot.shot_code}
              </span>
              <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-studio-800 text-sky-300 border border-white/5">
                {shot.shot_size}
              </span>
              <span className="text-[10px] font-mono text-slate-400">
                {shot.focal_length}
              </span>
              <span className="text-[10px] text-slate-500">
                • {shot.camera_movement}
              </span>
            </div>
            {shot.framing_description && (
              <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                {shot.framing_description}
              </p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {/* Coverage blocks count */}
          <span className="text-[10px] font-mono text-slate-400 bg-studio-900 px-2 py-0.5 rounded">
            {shot.covered_script_blocks?.length || 0} blocks
          </span>

          {/* Takes pill */}
          <button
            onClick={onToggleExpand}
            className={`text-[11px] font-mono px-2 py-0.5 rounded flex items-center gap-1 transition-colors ${
              circleTakesCount > 0
                ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800/40'
                : 'bg-studio-800 text-slate-400'
            }`}
          >
            <span>{shot.takes.length} takes</span>
            {circleTakesCount > 0 && <span className="text-emerald-400 font-bold">({circleTakesCount}○)</span>}
          </button>

          <button
            onClick={onOpenTakeLogger}
            className="px-2 py-1 rounded bg-studio-800 hover:bg-studio-700 text-[10px] font-bold text-slate-200 hover:text-white"
            title="Record new take"
          >
            + Take
          </button>

          <button
            onClick={() => onDeleteShot(shot.id)}
            className="text-slate-500 hover:text-rose-400 p-1 rounded"
            title="Delete shot"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Expandable Take Logger Tray */}
      {isExpanded && (
        <div className="px-4 pb-3 pt-1 bg-studio-950/90 border-t border-white/5 space-y-2">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-400">
            <span>Recorded Takes Log</span>
            <button
              onClick={onOpenTakeLogger}
              className="text-sky-400 hover:underline flex items-center gap-1"
            >
              <Plus className="w-3 h-3" /> Log Take #{shot.takes.length + 1}
            </button>
          </div>

          {shot.takes.length === 0 ? (
            <div className="py-3 text-center text-xs text-slate-500 italic">
              No takes recorded yet. Click &ldquo;+ Take&rdquo; to log a roll.
            </div>
          ) : (
            <div className="space-y-1.5">
              {shot.takes.map((take) => (
                <div
                  key={take.id}
                  className={`p-2 rounded-lg border text-xs flex items-center justify-between gap-3 ${
                    take.is_circle_take
                      ? 'bg-emerald-950/30 border-emerald-500/30 text-emerald-100'
                      : 'bg-studio-900 border-white/5 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <button
                      onClick={() => onToggleCircle(take.id)}
                      title={take.is_circle_take ? 'Circle Take (Selected)' : 'Click to flag Circle Take'}
                      className={`p-1 rounded transition-colors ${
                        take.is_circle_take
                          ? 'text-emerald-400 hover:text-emerald-300'
                          : 'text-slate-500 hover:text-slate-300'
                      }`}
                    >
                      <CircleDot className="w-4 h-4" />
                    </button>
                    <span className="font-mono font-bold">Take {take.take_number}</span>
                    <span className="text-[11px] font-mono text-slate-400">
                      Card: {take.camera_card} • Roll: {take.sound_roll}
                    </span>
                    <span className="text-[11px] font-mono text-slate-400">
                      TC: {take.timecode_in} - {take.timecode_out}
                    </span>
                  </div>

                  {take.script_supervisor_notes && (
                    <span className="text-[11px] text-slate-400 italic truncate max-w-xs">
                      &ldquo;{take.script_supervisor_notes}&rdquo;
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
