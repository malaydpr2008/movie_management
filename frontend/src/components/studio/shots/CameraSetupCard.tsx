"use client";

import React from 'react';
import { Plus } from 'lucide-react';
import { CameraSetup, Shot } from '@/lib/types';
import { ShotRowItem } from './ShotRowItem';

interface CameraSetupCardProps {
  setup: CameraSetup;
  activeShotId: string | null;
  expandedShotId: string | null;
  onToggleExpand: (shotId: string) => void;
  onOpenAddShot: (setup: CameraSetup) => void;
  onOpenTakeLogger: (shot: Shot) => void;
  onToggleCircle: (takeId: string) => void;
  onDeleteShot: (shotId: string) => void;
}

export function CameraSetupCard({
  setup,
  activeShotId,
  expandedShotId,
  onToggleExpand,
  onOpenAddShot,
  onOpenTakeLogger,
  onToggleCircle,
  onDeleteShot,
}: CameraSetupCardProps) {
  return (
    <div className="rounded-xl bg-studio-950/60 border border-white/5 overflow-hidden">
      {/* Setup Group Header */}
      <div className="p-3 bg-studio-900/90 border-b border-white/5 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span className="w-6 h-6 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30 flex items-center justify-center font-mono font-bold text-xs">
            {setup.setup_code}
          </span>
          <div>
            <h4 className="font-bold text-xs text-white">Camera Setup {setup.setup_code}</h4>
            {setup.lighting_package_notes && (
              <p className="text-[11px] text-slate-400 line-clamp-1">{setup.lighting_package_notes}</p>
            )}
          </div>
        </div>

        <button
          onClick={() => onOpenAddShot(setup)}
          className="flex items-center gap-1 px-2.5 py-1 rounded bg-studio-800 hover:bg-studio-700 text-[11px] font-semibold text-slate-200 hover:text-white transition-colors"
        >
          <Plus className="w-3 h-3 text-sky-400" />
          <span>Add Shot</span>
        </button>
      </div>

      {/* Shots list inside this setup */}
      <div className="divide-y divide-white/5">
        {setup.shots.map((shot) => (
          <ShotRowItem
            key={shot.id}
            shot={shot}
            setupCode={setup.setup_code}
            isExpanded={expandedShotId === shot.id}
            isSelected={activeShotId === shot.id}
            onToggleExpand={() => onToggleExpand(shot.id)}
            onOpenTakeLogger={() => onOpenTakeLogger(shot)}
            onToggleCircle={onToggleCircle}
            onDeleteShot={onDeleteShot}
          />
        ))}

        {setup.shots.length === 0 && (
          <div className="p-4 text-center text-xs text-slate-500 italic">
            No shots planned for this setup yet.
          </div>
        )}
      </div>
    </div>
  );
}
