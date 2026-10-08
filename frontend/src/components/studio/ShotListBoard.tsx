"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Video, Plus, Wand2, CheckCircle2, Camera } from 'lucide-react';
import { api, SceneCoverage } from '@/lib/api';

const SHOT_SIZES = [
  { value: 'WS', label: 'Wide Shot' },
  { value: 'MS', label: 'Medium Shot' },
  { value: 'CU', label: 'Close Up' },
  { value: 'ECU', label: 'Extreme Close Up' },
  { value: 'INS', label: 'Insert' },
  { value: 'POV', label: 'Point of View' }
];

const CAMERA_MOVEMENTS = [
  { value: 'STATIC', label: 'Static / Locked-off' },
  { value: 'PAN', label: 'Pan / Tilt' },
  { value: 'TRACK', label: 'Tracking / Dolly' },
  { value: 'STEADI', label: 'Steadicam / Gimbal' },
  { value: 'CRANE', label: 'Crane / Jib' },
  { value: 'DRONE', label: 'Drone / Aerial' }
];

export default function ShotListBoard({ projectId, sceneId }: { projectId: string; sceneId: string }) {
  const queryClient = useQueryClient();

  const { data: coverage, isLoading } = useQuery<SceneCoverage>({
    queryKey: ['cameraTree', projectId, sceneId],
    queryFn: () => api.getCameraTree(projectId, sceneId),
    enabled: Boolean(projectId && sceneId),
  });

  const setups = coverage?.setups || [];

  // Form states
  const [newSetupCode, setNewSetupCode] = useState('A');
  const [newCameraMovement, setNewCameraMovement] = useState('STATIC');
  const [newEquipmentNotes, setNewEquipmentNotes] = useState('');
  
  const [activeSetupIdForShot, setActiveSetupIdForShot] = useState<string | null>(null);
  const [newShotCode, setNewShotCode] = useState('');
  const [newShotSize, setNewShotSize] = useState('MS');
  const [newLens, setNewLens] = useState('');
  const [newShotDesc, setNewShotDesc] = useState('');
  const [newVfx, setNewVfx] = useState(false);

  // Mutations
  const createSetupMut = useMutation({
    mutationFn: (payload: any) => api.createCameraSetup(projectId, sceneId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cameraTree', projectId, sceneId] });
      setNewSetupCode(String.fromCharCode(newSetupCode.charCodeAt(0) + 1));
      setNewEquipmentNotes('');
    }
  });

  const createShotMut = useMutation({
    mutationFn: (payload: any) => api.createShot(projectId, sceneId, payload.setupId, payload.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cameraTree', projectId, sceneId] });
      setActiveSetupIdForShot(null);
      setNewShotCode('');
      setNewShotDesc('');
      setNewLens('');
      setNewVfx(false);
    }
  });

  const createTakeMut = useMutation({
    mutationFn: (payload: any) => api.createTake(projectId, sceneId, payload.shotId, payload.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cameraTree', projectId, sceneId] });
    }
  });

  const toggleCircleMut = useMutation({
    mutationFn: (takeId: string) => api.toggleCircleTake(takeId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['cameraTree', projectId, sceneId] });
    }
  });

  const handleAddSetup = (e: React.FormEvent) => {
    e.preventDefault();
    createSetupMut.mutate({
      setup_code: newSetupCode,
      camera_movement: newCameraMovement,
      equipment_notes: newEquipmentNotes
    });
  };

  const handleAddShot = (setupId: string) => {
    createShotMut.mutate({
      setupId,
      data: {
        shot_code: newShotCode,
        shot_size: newShotSize,
        lens: newLens || undefined,
        description: newShotDesc,
        vfx_required: newVfx
      }
    });
  };

  const handleAddTake = (shotId: string, currentTakes: number) => {
    createTakeMut.mutate({
      shotId,
      data: {
        take_number: currentTakes + 1,
        is_circle_take: false
      }
    });
  };

  const getLabel = (options: {value: string, label: string}[], val: string) => {
    return options.find(o => o.value === val)?.label || val;
  };

  return (
    <div className="flex flex-col h-full bg-studio-950 border border-white/5 rounded-2xl overflow-hidden shadow-2xl relative">
      <div className="sticky top-0 z-20 p-5 bg-studio-900/90 backdrop-blur-md border-b border-white/10 shadow-lg flex items-center justify-between">
        <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
          <Camera className="w-4 h-4 text-emerald-400" />
          Camera Coverage
        </h3>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6">
        {isLoading ? (
          <div className="h-32 flex items-center justify-center">
            <span className="font-mono text-xs text-slate-500 animate-pulse">Loading coverage...</span>
          </div>
        ) : (
          <>
            {setups.map((setup) => (
              <div key={setup.id} className="bg-white/5 border border-white/10 rounded-xl overflow-hidden shadow-lg">
                <div className="p-4 bg-white/[0.02] border-b border-white/10 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center font-bold text-emerald-400 font-mono text-lg">
                      {setup.setup_code}
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        {getLabel(CAMERA_MOVEMENTS, setup.camera_movement)}
                      </h4>
                      {setup.equipment_notes && (
                        <p className="text-xs text-slate-400 mt-1">{setup.equipment_notes}</p>
                      )}
                    </div>
                  </div>
                  <button 
                    onClick={() => setActiveSetupIdForShot(setup.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 rounded-lg text-xs font-bold text-slate-300 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Shot
                  </button>
                </div>

                {activeSetupIdForShot === setup.id && (
                  <div className="p-4 bg-black/40 border-b border-white/10 animate-in slide-in-from-top-2">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                      <input 
                        type="text" 
                        placeholder="Shot (e.g. A1)" 
                        value={newShotCode} 
                        onChange={(e) => setNewShotCode(e.target.value)}
                        className="bg-studio-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                      />
                      <select 
                        value={newShotSize}
                        onChange={(e) => setNewShotSize(e.target.value)}
                        className="bg-studio-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                      >
                        {SHOT_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                      </select>
                      <input 
                        type="text" 
                        placeholder="Lens (e.g. 50mm)" 
                        value={newLens} 
                        onChange={(e) => setNewLens(e.target.value)}
                        className="bg-studio-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white"
                      />
                      <label className="flex items-center gap-2 text-xs text-slate-300">
                        <input 
                          type="checkbox" 
                          checked={newVfx}
                          onChange={(e) => setNewVfx(e.target.checked)}
                          className="rounded bg-studio-900 border-white/10"
                        />
                        VFX Required
                      </label>
                    </div>
                    <input 
                      type="text" 
                      placeholder="Shot Description..." 
                      value={newShotDesc} 
                      onChange={(e) => setNewShotDesc(e.target.value)}
                      className="w-full bg-studio-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-white mb-3"
                    />
                    <div className="flex justify-end gap-2">
                      <button 
                        onClick={() => setActiveSetupIdForShot(null)}
                        className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={() => handleAddShot(setup.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-bold transition-colors"
                      >
                        Save Shot
                      </button>
                    </div>
                  </div>
                )}

                <div className="divide-y divide-white/5">
                  {setup.shots.map((shot) => (
                    <div key={shot.id} className="p-4 pl-6 bg-studio-900/40 hover:bg-studio-900/60 transition-colors">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-mono text-sm font-black text-sky-400">
                              {shot.shot_code}
                            </span>
                            <span className="px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 text-[10px] font-bold">
                              {getLabel(SHOT_SIZES, shot.shot_size)}
                            </span>
                            {shot.lens && (
                              <span className="text-[10px] font-mono text-slate-400 border border-white/10 px-1.5 py-0.5 rounded">
                                {shot.lens}
                              </span>
                            )}
                            {shot.vfx_required && (
                              <span className="flex items-center gap-1 px-1.5 py-0.5 rounded bg-fuchsia-500/20 text-fuchsia-300 text-[10px] font-bold animate-pulse">
                                <Wand2 className="w-3 h-3" /> VFX
                              </span>
                            )}
                          </div>
                          {shot.description && (
                            <p className="text-xs text-slate-300 leading-relaxed">{shot.description}</p>
                          )}
                          
                          {/* Takes Row */}
                          <div className="mt-3 flex items-center gap-2 flex-wrap">
                            <span className="text-[10px] font-mono text-slate-500 uppercase mr-1">Takes:</span>
                            {shot.takes.map((take) => (
                              <button
                                key={take.id}
                                onClick={() => toggleCircleMut.mutate(take.id)}
                                className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition-all shadow-sm ${
                                  take.is_circle_take 
                                    ? 'bg-emerald-500 text-white shadow-emerald-500/20 scale-110 ring-2 ring-emerald-400 ring-offset-2 ring-offset-studio-900' 
                                    : 'bg-studio-800 text-slate-400 hover:bg-studio-700 border border-white/5 hover:text-white'
                                }`}
                              >
                                {take.take_number}
                              </button>
                            ))}
                            <button 
                              onClick={() => handleAddTake(shot.id, shot.takes.length)}
                              className="w-8 h-8 rounded-full flex items-center justify-center text-slate-500 hover:text-white hover:bg-white/10 border border-dashed border-white/20 transition-colors"
                            >
                              <Plus className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                  {setup.shots.length === 0 && activeSetupIdForShot !== setup.id && (
                    <div className="p-6 text-center text-xs text-slate-500 font-mono">
                      No shots defined. Add your first angle.
                    </div>
                  )}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="p-4 bg-studio-900/90 backdrop-blur-md border-t border-white/10">
        <form onSubmit={handleAddSetup} className="flex gap-2">
          <input 
            type="text" 
            placeholder="Setup (A)" 
            value={newSetupCode} 
            onChange={(e) => setNewSetupCode(e.target.value)}
            className="w-20 bg-studio-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white font-mono"
            required
          />
          <select 
            value={newCameraMovement}
            onChange={(e) => setNewCameraMovement(e.target.value)}
            className="flex-1 bg-studio-950 border border-white/10 rounded-xl px-3 py-2 text-sm text-white"
          >
            {CAMERA_MOVEMENTS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
          </select>
          <button 
            type="submit"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-sm font-bold shadow-sm transition-colors shrink-0"
          >
            Add Setup
          </button>
        </form>
        <input 
          type="text" 
          placeholder="Equipment Notes (e.g. 50ft Technocrane, 3-Axis Head)" 
          value={newEquipmentNotes} 
          onChange={(e) => setNewEquipmentNotes(e.target.value)}
          className="w-full mt-2 bg-studio-950 border border-white/10 rounded-xl px-3 py-2 text-xs text-white"
        />
      </div>
    </div>
  );
}
