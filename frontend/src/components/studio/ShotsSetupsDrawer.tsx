"use client";

import React, { useState } from 'react';
import { Camera, Plus } from 'lucide-react';
import { CameraSetup, Shot, ScriptBlock } from '@/lib/types';
import { useProjectStore } from '@/stores/useProjectStore';
import { toast } from '@/stores/useToastStore';
import {
  useCreateSetup,
  useCreateShot,
  useDeleteShot,
  useCreateTake,
  useToggleCircleTake,
} from '@/hooks/useShots';
import { CameraSetupCard } from './shots/CameraSetupCard';
import { AddShotModal } from './shots/AddShotModal';
import { TakeLoggerModal } from './shots/TakeLoggerModal';

interface ShotsSetupsDrawerProps {
  sceneId: string;
  setups: CameraSetup[];
  scriptBlocks: ScriptBlock[];
  onCoverageUpdated: () => void;
}

export function ShotsSetupsDrawer({
  sceneId,
  setups,
  scriptBlocks,
  onCoverageUpdated,
}: ShotsSetupsDrawerProps) {
  const { activeShotId } = useProjectStore();
  const [expandedShotId, setExpandedShotId] = useState<string | null>(null);

  // Modal / form states
  const [isAddingSetup, setIsAddingSetup] = useState(false);
  const [setupCode, setSetupCode] = useState('A');
  const [setupNotes, setSetupNotes] = useState('');

  const [addingShotSetupId, setAddingShotSetupId] = useState<string | null>(null);
  const [loggingTakeShotId, setLoggingTakeShotId] = useState<string | null>(null);
  const [initialTakeNum, setInitialTakeNum] = useState(1);

  // Mutations via feature hooks
  const createSetupMutation = useCreateSetup(sceneId);
  const createShotMutation = useCreateShot(sceneId);
  const deleteShotMutation = useDeleteShot(sceneId);
  const createTakeMutation = useCreateTake(sceneId);
  const toggleCircleMutation = useToggleCircleTake(sceneId);

  const handleCreateSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await createSetupMutation.mutateAsync({
        setup_code: setupCode.toUpperCase(),
        lighting_package_notes: setupNotes,
      });
      toast.success('Setup Created', `Camera Setup ${setupCode.toUpperCase()} created.`);
      setIsAddingSetup(false);
      setSetupNotes('');
      onCoverageUpdated();
    } catch (err: any) {
      toast.error('Failed to create setup', err.message);
    }
  };

  const handleOpenAddShot = (setup: CameraSetup) => {
    setAddingShotSetupId(setup.id);
  };

  const handleCreateShot = async (payload: {
    setup_id: string;
    shot_code: string;
    shot_size: string;
    focal_length?: string;
    camera_movement?: string;
    framing_description?: string;
    storyboard_frame_url?: string;
    covered_script_blocks?: string[];
  }) => {
    try {
      await createShotMutation.mutateAsync(payload);
      toast.success('Shot Added', `Shot ${payload.shot_code} logged under setup.`);
      setAddingShotSetupId(null);
      onCoverageUpdated();
    } catch (err: any) {
      toast.error('Failed to create shot', err.message);
    }
  };

  const handleOpenTakeLogger = (shot: Shot) => {
    setLoggingTakeShotId(shot.id);
    setInitialTakeNum(shot.takes.length + 1);
  };

  const handleLogTake = async (payload: {
    shot_id: string;
    take_number: number;
    is_circle_take?: boolean;
    camera_card?: string;
    sound_roll?: string;
    timecode_in?: string;
    timecode_out?: string;
    script_supervisor_notes?: string;
  }) => {
    try {
      await createTakeMutation.mutateAsync(payload);
      toast.success('Take Recorded', `Take ${payload.take_number} logged.`);
      setLoggingTakeShotId(null);
      onCoverageUpdated();
    } catch (err: any) {
      toast.error('Failed to log take', err.message);
    }
  };

  const handleToggleCircle = async (takeId: string) => {
    try {
      const updated = await toggleCircleMutation.mutateAsync(takeId);
      toast.info(
        updated.is_circle_take ? 'Circle Take Flagged' : 'Circle Take Removed',
        `Take #${updated.take_number}`
      );
      onCoverageUpdated();
    } catch (err: any) {
      toast.error('Failed to toggle circle take', err.message);
    }
  };

  const handleDeleteShot = async (shotId: string) => {
    try {
      await deleteShotMutation.mutateAsync(shotId);
      toast.info('Shot Deleted', 'Coverage updated.');
      onCoverageUpdated();
    } catch (err: any) {
      toast.error('Failed to delete shot', err.message);
    }
  };

  // Compute selected setup for modal
  const targetSetupForAddShot = setups.find((s) => s.id === addingShotSetupId);
  const nextShotCode = targetSetupForAddShot ? String(targetSetupForAddShot.shots.length + 1) : '1';

  return (
    <div className="space-y-6">
      {/* Header and Add Setup Action */}
      <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/5">
        <div>
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Camera className="w-4 h-4 text-sky-400" />
            Setups & Shot Coverage
          </h3>
          <p className="text-xs text-slate-400">
            {setups.reduce((acc, s) => acc + s.shots.length, 0)} total planned shots
          </p>
        </div>

        <button
          onClick={() => {
            const nextCode = String.fromCharCode(65 + setups.length);
            setSetupCode(nextCode);
            setIsAddingSetup(true);
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white shadow-sm transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Setup</span>
        </button>
      </div>

      {/* Add Setup Inline Form */}
      {isAddingSetup && (
        <form onSubmit={handleCreateSetup} className="p-4 bg-studio-950 border border-sky-500/40 rounded-xl space-y-3 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs text-white">Create Camera Setup</h4>
            <button
              type="button"
              onClick={() => setIsAddingSetup(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>
          <div className="grid grid-cols-3 gap-2">
            <div>
              <label className="text-[11px] text-slate-300 block mb-1">Code</label>
              <input
                type="text"
                value={setupCode}
                onChange={(e) => setSetupCode(e.target.value.toUpperCase())}
                className="w-full px-2 py-1.5 bg-studio-900 border border-white/10 rounded font-mono text-sm text-white"
                maxLength={2}
              />
            </div>
            <div className="col-span-2">
              <label className="text-[11px] text-slate-300 block mb-1">Lighting Package Notes</label>
              <input
                type="text"
                placeholder="e.g. Master Key on high boom, rim warm sodium..."
                value={setupNotes}
                onChange={(e) => setSetupNotes(e.target.value)}
                className="w-full px-2 py-1.5 bg-studio-900 border border-white/10 rounded text-xs text-white"
              />
            </div>
          </div>
          <button
            type="submit"
            disabled={createSetupMutation.isPending}
            className="w-full py-1.5 bg-sky-600 hover:bg-sky-500 rounded text-xs font-bold text-white shadow-sm disabled:opacity-50"
          >
            {createSetupMutation.isPending ? 'Saving...' : `Save Setup ${setupCode}`}
          </button>
        </form>
      )}

      {/* Setup Groups */}
      <div className="space-y-5">
        {setups.map((setup) => (
          <CameraSetupCard
            key={setup.id}
            setup={setup}
            activeShotId={activeShotId}
            expandedShotId={expandedShotId}
            onToggleExpand={(shotId) => setExpandedShotId(expandedShotId === shotId ? null : shotId)}
            onOpenAddShot={handleOpenAddShot}
            onOpenTakeLogger={handleOpenTakeLogger}
            onToggleCircle={handleToggleCircle}
            onDeleteShot={handleDeleteShot}
          />
        ))}

        {setups.length === 0 && (
          <div className="p-8 border-2 border-dashed border-white/10 rounded-2xl text-center space-y-3">
            <Camera className="w-8 h-8 text-slate-600 mx-auto" />
            <h4 className="font-bold text-sm text-slate-300">No Camera Setups Created</h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Add your first camera setup (e.g. Setup A) to start planning coverage and logging takes.
            </p>
            <button
              onClick={() => {
                setSetupCode('A');
                setIsAddingSetup(true);
              }}
              className="px-4 py-2 bg-sky-600 hover:bg-sky-500 rounded-lg text-xs font-bold text-white shadow-sm"
            >
              Add Setup A
            </button>
          </div>
        )}
      </div>

      {/* Add Shot Modal */}
      <AddShotModal
        setupId={addingShotSetupId}
        scriptBlocks={scriptBlocks}
        initialShotCode={nextShotCode}
        onClose={() => setAddingShotSetupId(null)}
        onSubmit={handleCreateShot}
      />

      {/* Take Logger Modal */}
      <TakeLoggerModal
        shotId={loggingTakeShotId}
        initialTakeNumber={initialTakeNum}
        onClose={() => setLoggingTakeShotId(null)}
        onSubmit={handleLogTake}
      />
    </div>
  );
}
