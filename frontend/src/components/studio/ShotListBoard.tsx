"use client";

import React, { useState, useEffect } from 'react';
import { Video, Move, Eye, Clock, Plus, Trash2, Wand2, CheckCircle2, ChevronDown, ChevronRight, Camera } from 'lucide-react';

interface Take {
  id: string;
  shot_id: string;
  take_number: number;
  is_circle_take: boolean;
  duration_seconds: number | null;
  director_notes: string;
}

interface Shot {
  id: string;
  setup_id: string;
  shot_code: string;
  shot_size: string;
  lens: string | null;
  description: string;
  vfx_required: boolean;
  takes: Take[];
}

interface CameraSetup {
  id: string;
  scene_id: string;
  setup_code: string;
  camera_movement: string;
  equipment_notes: string;
  shots: Shot[];
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
  { value: 'CRANE', label: 'Crane / Jib' },
  { value: 'DRONE', label: 'Drone / Aerial' }
];

export default function ShotListBoard({ projectId, sceneId }: { projectId: string; sceneId: string }) {
  const [setups, setSetups] = useState<CameraSetup[]>([]);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    fetchSetups();
  }, [sceneId]);

  const fetchSetups = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/narrative/scenes/${sceneId}/setups`);
      if (res.ok) {
        const data = await res.json();
        setSetups(data.setups || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleAddSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/narrative/setups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          scene_id: sceneId,
          setup_code: newSetupCode,
          camera_movement: newCameraMovement,
          equipment_notes: newEquipmentNotes
        })
      });
      if (res.ok) {
        await fetchSetups();
        setNewSetupCode(String.fromCharCode(newSetupCode.charCodeAt(0) + 1));
        setNewEquipmentNotes('');
      }
    } catch (err) { console.error(err); }
  };

  const handleAddShot = async (setupId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/narrative/shots`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          setup_id: setupId,
          shot_code: newShotCode,
          shot_size: newShotSize,
          lens: newLens || null,
          description: newShotDesc,
          vfx_required: newVfx
        })
      });
      if (res.ok) {
        await fetchSetups();
        setActiveSetupIdForShot(null);
        setNewShotCode('');
        setNewShotDesc('');
        setNewLens('');
        setNewVfx(false);
      }
    } catch (err) { console.error(err); }
  };

  const handleAddTake = async (shotId: string, currentTakes: number) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/narrative/takes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          shot_id: shotId,
          take_number: currentTakes + 1,
          is_circle_take: false
        })
      });
      if (res.ok) await fetchSetups();
    } catch (err) { console.error(err); }
  };

  const handleToggleCircle = async (takeId: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/narrative/takes/${takeId}/toggle-circle`, {
        method: 'PATCH'
      });
      if (res.ok) await fetchSetups();
    } catch (err) { console.error(err); }
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
        {loading ? (
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
                  <div className="p-4 bg-emerald-900/20 border-b border-emerald-500/20 flex flex-wrap gap-3 items-end">
                    <input type="text" placeholder="Shot (e.g. A1)" value={newShotCode} onChange={e=>setNewShotCode(e.target.value)} className="w-24 bg-studio-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
                    <select value={newShotSize} onChange={e=>setNewShotSize(e.target.value)} className="bg-studio-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white">
                      {SHOT_SIZES.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
                    </select>
                    <input type="text" placeholder="Lens" value={newLens} onChange={e=>setNewLens(e.target.value)} className="w-24 bg-studio-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
                    <input type="text" placeholder="Desc" value={newShotDesc} onChange={e=>setNewShotDesc(e.target.value)} className="flex-1 bg-studio-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white" />
                    <div className="flex items-center gap-2 px-3 py-2 bg-studio-950 border border-white/10 rounded-lg cursor-pointer" onClick={() => setNewVfx(!newVfx)}>
                      <div className={`w-4 h-4 rounded border flex items-center justify-center ${newVfx ? 'bg-purple-500 border-purple-500' : 'border-slate-600'}`}>
                        {newVfx && <Wand2 className="w-3 h-3 text-white" />}
                      </div>
                      <span className="text-xs font-bold text-purple-400">VFX</span>
                    </div>
                    <button onClick={() => handleAddShot(setup.id)} className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-lg">Save</button>
                    <button onClick={() => setActiveSetupIdForShot(null)} className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-lg">Cancel</button>
                  </div>
                )}

                <div className="p-2 space-y-2">
                  {setup.shots.length === 0 && (
                    <div className="p-4 text-center text-slate-500 text-xs font-mono">No shots in this setup.</div>
                  )}
                  {setup.shots.map(shot => (
                    <div key={shot.id} className="bg-studio-950 border border-white/5 rounded-lg p-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          <span className="font-mono font-bold text-slate-300 bg-white/5 px-2 py-1 rounded">
                            {shot.shot_code}
                          </span>
                          <span className="text-xs font-bold px-2 py-1 bg-sky-500/20 text-sky-400 rounded">
                            {getLabel(SHOT_SIZES, shot.shot_size)}
                          </span>
                          {shot.lens && (
                            <span className="text-xs font-mono text-slate-400">
                              {shot.lens}
                            </span>
                          )}
                          {shot.vfx_required && (
                            <span className="px-2 py-1 rounded text-[10px] font-bold uppercase tracking-widest bg-purple-500/20 text-purple-400 border border-purple-500/20 shadow-[0_0_10px_rgba(168,85,247,0.3)] animate-pulse">
                              VFX
                            </span>
                          )}
                        </div>
                        <button 
                          onClick={() => handleAddTake(shot.id, shot.takes.length)}
                          className="text-[10px] font-bold uppercase bg-white/5 hover:bg-white/10 px-2 py-1 rounded text-slate-400 hover:text-white transition-colors"
                        >
                          + Add Take
                        </button>
                      </div>
                      <p className="text-sm text-slate-400 mt-2 pl-12">{shot.description}</p>
                      
                      {/* Takes Row */}
                      {shot.takes.length > 0 && (
                        <div className="mt-3 pl-12 flex flex-wrap gap-2">
                          {shot.takes.map(take => (
                            <button
                              key={take.id}
                              onClick={() => handleToggleCircle(take.id)}
                              className={`px-3 py-1.5 rounded-full text-xs font-bold font-mono transition-all border ${
                                take.is_circle_take 
                                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50 shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                                  : 'bg-white/5 text-slate-500 border-white/10 hover:bg-white/10 hover:text-slate-300'
                              }`}
                            >
                              Take {take.take_number}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
            
            {/* Add New Setup Form */}
            <div className="bg-white/5 border border-dashed border-white/20 rounded-xl p-4">
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Add New Camera Setup</h4>
              <form onSubmit={handleAddSetup} className="flex gap-3">
                <input 
                  type="text" 
                  value={newSetupCode} 
                  onChange={e => setNewSetupCode(e.target.value)} 
                  placeholder="Setup Code"
                  className="w-16 bg-studio-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono"
                />
                <select
                  value={newCameraMovement}
                  onChange={e => setNewCameraMovement(e.target.value)}
                  className="bg-studio-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                >
                  {CAMERA_MOVEMENTS.map(m => <option key={m.value} value={m.value}>{m.label}</option>)}
                </select>
                <input 
                  type="text" 
                  value={newEquipmentNotes} 
                  onChange={e => setNewEquipmentNotes(e.target.value)} 
                  placeholder="Equipment Notes (e.g. 50ft Track)"
                  className="flex-1 bg-studio-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                />
                <button type="submit" className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white font-bold text-sm rounded-lg">
                  Create Setup
                </button>
              </form>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
