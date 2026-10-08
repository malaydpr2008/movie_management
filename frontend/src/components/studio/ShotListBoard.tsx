"use client";

import React, { useState, useEffect } from 'react';
import { Video, Move, Eye, Clock, Plus, Trash2, Wand2 } from 'lucide-react';

interface StrictShot {
  id: string;
  scene_id: string;
  shot_size: string;
  camera_movement: string;
  lens: string | null;
  description: string;
  estimated_setup_time: number;
  vfx_required: boolean;
  created_at: string;
}

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
  { value: 'HH', label: 'Handheld' },
  { value: 'CRANE', label: 'Crane / Jib' },
  { value: 'DRONE', label: 'Drone / Aerial' }
];

export default function ShotListBoard({ projectId, sceneId }: { projectId: string; sceneId: string }) {
  const [shots, setShots] = useState<StrictShot[]>([]);
  const [loading, setLoading] = useState(true);

  // Form state
  const [shotSize, setShotSize] = useState('MS');
  const [cameraMovement, setCameraMovement] = useState('STATIC');
  const [lens, setLens] = useState('');
  const [description, setDescription] = useState('');
  const [setupTime, setSetupTime] = useState(15);
  const [vfxRequired, setVfxRequired] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    fetchShots();
  }, [sceneId]);

  const fetchShots = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/narrative/projects/${projectId}/scenes/${sceneId}/shots`);
      if (res.ok) {
        const data = await res.json();
        setShots(data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddShot = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/narrative/projects/${projectId}/scenes/${sceneId}/shots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shot_size: shotSize,
          camera_movement: cameraMovement,
          lens: lens || null,
          description: description,
          estimated_setup_time: setupTime,
          vfx_required: vfxRequired
        })
      });
      if (res.ok) {
        const newShot = await res.json();
        setShots([...shots, newShot]);
        setDescription('');
        setLens('');
        setVfxRequired(false);
        setSetupTime(15);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const getLabel = (options: {value: string, label: string}[], val: string) => {
    return options.find(o => o.value === val)?.label || val;
  };

  return (
    <div className="flex flex-col h-full bg-studio-950 border border-white/5 rounded-2xl overflow-hidden shadow-2xl relative">
      {/* Sticky Header Add Form */}
      <div className="sticky top-0 z-20 p-5 bg-studio-900/90 backdrop-blur-md border-b border-white/10 shadow-lg">
        <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-2 mb-4">
          <Video className="w-4 h-4 text-emerald-400" />
          Add Shot Setup
        </h3>
        <form onSubmit={handleAddShot} className="space-y-3">
          <div className="flex gap-3">
            <select
              value={shotSize}
              onChange={e => setShotSize(e.target.value)}
              className="bg-studio-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
            >
              {SHOT_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
            </select>
            <select
              value={cameraMovement}
              onChange={e => setCameraMovement(e.target.value)}
              className="bg-studio-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
            >
              {CAMERA_MOVEMENTS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
            <input
              type="text"
              placeholder="Lens (e.g. 35mm)"
              value={lens}
              onChange={e => setLens(e.target.value)}
              className="w-32 bg-studio-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-500"
            />
            <div className="flex items-center gap-2 px-3 py-2 bg-studio-950 border border-white/10 rounded-lg cursor-pointer hover:border-purple-500/50 transition-colors" onClick={() => setVfxRequired(!vfxRequired)}>
              <div className={`w-4 h-4 rounded border flex items-center justify-center transition-colors ${vfxRequired ? 'bg-purple-500 border-purple-500' : 'border-slate-600'}`}>
                {vfxRequired && <Wand2 className="w-3 h-3 text-white" />}
              </div>
              <span className={`text-xs font-bold ${vfxRequired ? 'text-purple-400' : 'text-slate-400'}`}>VFX</span>
            </div>
          </div>
          <div className="flex gap-3 items-end">
            <div className="flex-1">
              <input
                required
                type="text"
                placeholder="Shot description (e.g. Dolly in on John's reaction)"
                value={description}
                onChange={e => setDescription(e.target.value)}
                className="w-full bg-studio-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors placeholder:text-slate-500"
              />
            </div>
            <div className="w-24">
              <input
                required
                type="number"
                min="1"
                placeholder="Mins"
                value={setupTime}
                onChange={e => setSetupTime(parseInt(e.target.value) || 0)}
                className="w-full bg-studio-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500 transition-colors"
              />
            </div>
            <button
              type="submit"
              disabled={isSubmitting || !description}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-sm rounded-lg shadow-lg shadow-emerald-500/20 transition-all active:scale-95 whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              {isSubmitting ? 'Adding...' : 'Add Shot'}
            </button>
          </div>
        </form>
      </div>

      {/* Shot List */}
      <div className="flex-1 overflow-y-auto p-5 space-y-4">
        {loading ? (
          <div className="h-32 flex items-center justify-center">
            <span className="font-mono text-xs text-slate-500 animate-pulse">Loading coverage...</span>
          </div>
        ) : shots.length === 0 ? (
          <div className="h-48 flex flex-col items-center justify-center text-slate-500 gap-3 border border-dashed border-white/10 rounded-xl m-2 bg-white/5">
            <Video className="w-8 h-8 opacity-50" />
            <span className="text-sm">No shots planned for this scene yet.</span>
          </div>
        ) : (
          shots.map((shot, idx) => (
            <div key={shot.id} className="group relative bg-white/5 border border-white/10 rounded-xl p-4 hover:border-emerald-500/30 transition-all hover:bg-white/10 flex gap-4">
              <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-black/40 border border-white/10 flex items-center justify-center text-xs font-bold text-slate-400 font-mono">
                {idx + 1}
              </div>
              <div className="flex-1 space-y-2">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-emerald-500/20 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                      <Eye className="w-3 h-3" />
                      {getLabel(SHOT_SIZES, shot.shot_size)}
                    </span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-amber-500/20 text-amber-400 border border-amber-500/20 flex items-center gap-1">
                      <Move className="w-3 h-3" />
                      {getLabel(CAMERA_MOVEMENTS, shot.camera_movement)}
                    </span>
                    {shot.lens && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono text-slate-300 bg-white/10 border border-white/10">
                        {shot.lens}
                      </span>
                    )}
                    {shot.vfx_required && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-widest bg-purple-500/20 text-purple-400 border border-purple-500/20 flex items-center gap-1 shadow-[0_0_10px_rgba(168,85,247,0.3)] animate-pulse">
                        <Wand2 className="w-3 h-3" />
                        VFX Required
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-1 text-[10px] font-mono text-slate-400 bg-black/40 px-2 py-1 rounded border border-white/5">
                    <Clock className="w-3 h-3 text-slate-500" />
                    {shot.estimated_setup_time}m
                  </div>
                </div>
                <p className="text-sm text-slate-300 leading-relaxed">
                  {shot.description}
                </p>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
