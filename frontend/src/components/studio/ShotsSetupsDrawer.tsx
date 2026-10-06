"use client";

import React, { useState } from 'react';
import {
  Camera,
  Plus,
  CircleDot,
  CheckCircle,
  Video,
  ChevronDown,
  ChevronRight,
  Eye,
  Trash2,
  Sliders,
  Image as ImageIcon
} from 'lucide-react';
import { CameraSetup, Shot, Take, ScriptBlock, api } from '@/lib/api';
import { useProjectStore } from '@/stores/useProjectStore';
import { toast } from '@/stores/useToastStore';

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
  const { activeShotId, setActiveShotId } = useProjectStore();
  const [expandedShotId, setExpandedShotId] = useState<string | null>(null);

  // Modals / forms
  const [isAddingSetup, setIsAddingSetup] = useState(false);
  const [setupCode, setSetupCode] = useState('A');
  const [setupNotes, setSetupNotes] = useState('');

  const [addingShotSetupId, setAddingShotSetupId] = useState<string | null>(null);
  const [shotCode, setShotCode] = useState('1');
  const [shotSize, setShotSize] = useState('MCU');
  const [focalLength, setFocalLength] = useState('35mm');
  const [movement, setMovement] = useState('Static');
  const [framingDesc, setFramingDesc] = useState('');
  const [storyboardUrl, setStoryboardUrl] = useState('');
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>([]);

  // Take Logger Modal state
  const [loggingTakeShotId, setLoggingTakeShotId] = useState<string | null>(null);
  const [takeNum, setTakeNum] = useState(1);
  const [isCircle, setIsCircle] = useState(false);
  const [cardNo, setCardNo] = useState('A001');
  const [soundRoll, setSoundRoll] = useState('SR01');
  const [tcIn, setTcIn] = useState('01:00:00:00');
  const [tcOut, setTcOut] = useState('01:01:15:00');
  const [supNotes, setSupNotes] = useState('');

  const handleCreateSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.createSetup({
        scene_id: sceneId,
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
    const nextShotNum = setup.shots.length + 1;
    setShotCode(String(nextShotNum));
    setSelectedBlocks(scriptBlocks.map((b) => b.id)); // default cover all or empty
  };

  const handleCreateShot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingShotSetupId) return;

    try {
      await api.createShot({
        setup_id: addingShotSetupId,
        shot_code: shotCode,
        shot_size: shotSize,
        focal_length: focalLength,
        camera_movement: movement,
        framing_description: framingDesc,
        storyboard_frame_url: storyboardUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600',
        covered_script_blocks: selectedBlocks,
      });
      toast.success('Shot Added', `Shot ${shotCode} logged under setup.`);
      setAddingShotSetupId(null);
      setFramingDesc('');
      setStoryboardUrl('');
      onCoverageUpdated();
    } catch (err: any) {
      toast.error('Failed to create shot', err.message);
    }
  };

  const handleOpenTakeLogger = (shot: Shot) => {
    setLoggingTakeShotId(shot.id);
    const nextTake = shot.takes.length + 1;
    setTakeNum(nextTake);
    setIsCircle(false);
    setSupNotes('');
  };

  const handleLogTake = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!loggingTakeShotId) return;

    try {
      await api.createTake({
        shot_id: loggingTakeShotId,
        take_number: takeNum,
        is_circle_take: isCircle,
        camera_card: cardNo,
        sound_roll: soundRoll,
        timecode_in: tcIn,
        timecode_out: tcOut,
        script_supervisor_notes: supNotes,
      });
      toast.success('Take Recorded', `Take ${takeNum} logged.`);
      setLoggingTakeShotId(null);
      onCoverageUpdated();
    } catch (err: any) {
      toast.error('Failed to log take', err.message);
    }
  };

  const handleToggleCircle = async (takeId: string) => {
    try {
      const updated = await api.toggleCircleTake(takeId);
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
      await api.deleteShot(shotId);
      toast.info('Shot Deleted', 'Coverage updated.');
      onCoverageUpdated();
    } catch (err: any) {
      toast.error('Failed to delete shot', err.message);
    }
  };

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
            className="w-full py-1.5 bg-sky-600 hover:bg-sky-500 rounded text-xs font-bold text-white shadow-sm"
          >
            Save Setup {setupCode}
          </button>
        </form>
      )}

      {/* Setup Groups */}
      <div className="space-y-5">
        {setups.map((setup) => (
          <div
            key={setup.id}
            className="rounded-xl bg-studio-950/60 border border-white/5 overflow-hidden"
          >
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
                onClick={() => handleOpenAddShot(setup)}
                className="flex items-center gap-1 px-2.5 py-1 rounded bg-studio-800 hover:bg-studio-700 text-[11px] font-semibold text-slate-200 hover:text-white transition-colors"
              >
                <Plus className="w-3 h-3 text-sky-400" />
                <span>Add Shot</span>
              </button>
            </div>

            {/* Shots list inside this setup */}
            <div className="divide-y divide-white/5">
              {setup.shots.map((shot) => {
                const isExpanded = expandedShotId === shot.id;
                const isSelected = activeShotId === shot.id;
                const circleTakesCount = shot.takes.filter((t) => t.is_circle_take).length;

                return (
                  <div
                    key={shot.id}
                    className={`transition-colors ${
                      isSelected ? 'bg-sky-950/30 ring-1 ring-sky-500/30' : 'hover:bg-studio-900/50'
                    }`}
                  >
                    {/* Shot Row Header */}
                    <div className="p-3 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <button
                          onClick={() => setExpandedShotId(isExpanded ? null : shot.id)}
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
                              {setup.setup_code}{shot.shot_code}
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
                          onClick={() => setExpandedShotId(isExpanded ? null : shot.id)}
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
                          onClick={() => handleOpenTakeLogger(shot)}
                          className="px-2 py-1 rounded bg-studio-800 hover:bg-studio-700 text-[10px] font-bold text-slate-200 hover:text-white"
                          title="Record new take"
                        >
                          + Take
                        </button>

                        <button
                          onClick={() => handleDeleteShot(shot.id)}
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
                            onClick={() => handleOpenTakeLogger(shot)}
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
                                    onClick={() => handleToggleCircle(take.id)}
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
              })}

              {setup.shots.length === 0 && (
                <div className="p-4 text-center text-xs text-slate-500 italic">
                  No shots planned for this setup yet.
                </div>
              )}
            </div>
          </div>
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
      {addingShotSetupId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-studio-900 border border-white/10 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <Camera className="w-4 h-4 text-sky-400" />
                Add Shot to Setup
              </h3>
              <button
                onClick={() => setAddingShotSetupId(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleCreateShot} className="space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Shot Code</label>
                  <input
                    type="text"
                    value={shotCode}
                    onChange={(e) => setShotCode(e.target.value)}
                    required
                    className="w-full px-3 py-2 bg-studio-950 border border-white/10 rounded-lg text-sm text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Framing / Size</label>
                  <select
                    value={shotSize}
                    onChange={(e) => setShotSize(e.target.value)}
                    className="w-full px-3 py-2 bg-studio-950 border border-white/10 rounded-lg text-sm text-white"
                  >
                    <option value="Wide">Wide (Master)</option>
                    <option value="Full Shot">Full Shot</option>
                    <option value="Medium">Medium</option>
                    <option value="MCU">MCU (Med Close-Up)</option>
                    <option value="Close-Up">Close-Up</option>
                    <option value="ECU">Extreme Close-Up</option>
                    <option value="Insert">Insert / Detail</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Focal Length</label>
                  <input
                    type="text"
                    placeholder="e.g. 35mm"
                    value={focalLength}
                    onChange={(e) => setFocalLength(e.target.value)}
                    className="w-full px-3 py-2 bg-studio-950 border border-white/10 rounded-lg text-sm text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Camera Movement</label>
                  <select
                    value={movement}
                    onChange={(e) => setMovement(e.target.value)}
                    className="w-full px-3 py-2 bg-studio-950 border border-white/10 rounded-lg text-sm text-white"
                  >
                    <option value="Static">Static / Locked-off</option>
                    <option value="Handheld">Handheld</option>
                    <option value="Steadicam">Steadicam / Ronin</option>
                    <option value="Dolly">Dolly Track</option>
                    <option value="Pan / Tilt">Pan / Tilt</option>
                    <option value="Crane">Crane / Jib</option>
                    <option value="Drone">Drone Aerial</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Storyboard Thumbnail URL</label>
                  <input
                    type="url"
                    placeholder="https://..."
                    value={storyboardUrl}
                    onChange={(e) => setStoryboardUrl(e.target.value)}
                    className="w-full px-3 py-2 bg-studio-950 border border-white/10 rounded-lg text-xs text-white"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Framing Description</label>
                <textarea
                  rows={2}
                  placeholder="e.g. OTS on Karen typing, shallow depth of field on console..."
                  value={framingDesc}
                  onChange={(e) => setFramingDesc(e.target.value)}
                  className="w-full px-3 py-2 bg-studio-950 border border-white/10 rounded-lg text-xs text-white"
                />
              </div>

              {/* Covered Script Blocks Selector */}
              <div>
                <label className="text-xs text-slate-300 block mb-1.5 font-semibold">
                  Covered Script Blocks ({selectedBlocks.length}/{scriptBlocks.length})
                </label>
                <div className="max-h-36 overflow-y-auto p-2 bg-studio-950 rounded-lg border border-white/5 space-y-1">
                  {scriptBlocks.map((b) => {
                    const isChecked = selectedBlocks.includes(b.id);
                    return (
                      <label
                        key={b.id}
                        className="flex items-center gap-2 p-1 rounded hover:bg-studio-900 cursor-pointer text-xs text-slate-300"
                      >
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedBlocks([...selectedBlocks, b.id]);
                            } else {
                              setSelectedBlocks(selectedBlocks.filter((id) => id !== b.id));
                            }
                          }}
                          className="rounded text-sky-500"
                        />
                        <span className="font-mono text-[10px] text-slate-400 uppercase">[{b.type}]</span>
                        <span className="truncate">{b.content}</span>
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setAddingShotSetupId(null)}
                  className="px-4 py-2 rounded-lg bg-studio-800 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white shadow-sm"
                >
                  Save Shot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Take Logger Modal */}
      {loggingTakeShotId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-studio-900 border border-white/10 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="font-bold text-base text-white flex items-center gap-2">
                <CircleDot className="w-4 h-4 text-emerald-400" />
                Record Take #{takeNum}
              </h3>
              <button
                onClick={() => setLoggingTakeShotId(null)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleLogTake} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Take Number</label>
                  <input
                    type="number"
                    min="1"
                    value={takeNum}
                    onChange={(e) => setTakeNum(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-studio-950 border border-white/10 rounded-lg text-sm text-white font-mono"
                  />
                </div>
                <div className="flex items-center pt-5">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-400">
                    <input
                      type="checkbox"
                      checked={isCircle}
                      onChange={(e) => setIsCircle(e.target.checked)}
                      className="w-4 h-4 rounded text-emerald-500"
                    />
                    <span>Circle Take (Preferred)</span>
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Camera Card</label>
                  <input
                    type="text"
                    value={cardNo}
                    onChange={(e) => setCardNo(e.target.value)}
                    className="w-full px-3 py-2 bg-studio-950 border border-white/10 rounded-lg text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Sound Roll</label>
                  <input
                    type="text"
                    value={soundRoll}
                    onChange={(e) => setSoundRoll(e.target.value)}
                    className="w-full px-3 py-2 bg-studio-950 border border-white/10 rounded-lg text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Timecode In</label>
                  <input
                    type="text"
                    value={tcIn}
                    onChange={(e) => setTcIn(e.target.value)}
                    className="w-full px-3 py-2 bg-studio-950 border border-white/10 rounded-lg text-xs text-white font-mono"
                  />
                </div>
                <div>
                  <label className="text-xs text-slate-300 block mb-1">Timecode Out</label>
                  <input
                    type="text"
                    value={tcOut}
                    onChange={(e) => setTcOut(e.target.value)}
                    className="w-full px-3 py-2 bg-studio-950 border border-white/10 rounded-lg text-xs text-white font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Script Supervisor Notes</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Good delivery, lens flare on entrance, clean audio..."
                  value={supNotes}
                  onChange={(e) => setSupNotes(e.target.value)}
                  className="w-full px-3 py-2 bg-studio-950 border border-white/10 rounded-lg text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setLoggingTakeShotId(null)}
                  className="px-4 py-2 rounded-lg bg-studio-800 text-xs font-semibold text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-sm"
                >
                  Log Take
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
