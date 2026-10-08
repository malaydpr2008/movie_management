"use client";

import React, { useState, useEffect } from 'react';
import { Wand2, Layers, Film, CheckCircle } from 'lucide-react';

interface VfxShot {
  id: string;
  scene_id: string;
  scene_number: string;
  vfx_id: string;
  status: string;
  description: string;
  frame_count: number;
  vendor_name: string;
}

const STAGES = [
  { id: 'PRE_VIS', label: 'Pre-Vis', icon: Layers, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  { id: 'ROTO', label: 'Roto & Prep', icon: Film, color: 'text-sky-400', bg: 'bg-sky-400/10' },
  { id: 'COMPOSITING', label: 'Compositing', icon: Wand2, color: 'text-purple-400', bg: 'bg-purple-400/10' },
  { id: 'FINAL', label: 'Final Render', icon: CheckCircle, color: 'text-emerald-400', bg: 'bg-emerald-400/10' }
];

export default function VFXPipelineBoard({ projectId }: { projectId: string }) {
  const [shots, setShots] = useState<VfxShot[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchShots();
  }, [projectId]);

  const fetchShots = async () => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/studio/projects/${projectId}/vfx`);
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

  const updateStatus = async (shotId: string, newStatus: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/studio/projects/${projectId}/vfx/${shotId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus })
      });
      if (res.ok) {
        const updated = await res.json();
        setShots(shots.map(s => s.id === shotId ? updated : s));
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return (
      <div className="h-64 flex items-center justify-center text-slate-400">
        <Wand2 className="w-8 h-8 animate-spin text-purple-400" />
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
      {STAGES.map(stage => {
        const Icon = stage.icon;
        const stageShots = shots.filter(s => s.status === stage.id || (!s.status && stage.id === 'PRE_VIS'));

        return (
          <div key={stage.id} className="flex flex-col bg-studio-900/60 border border-white/5 rounded-2xl overflow-hidden h-full min-h-[600px]">
            {/* Header */}
            <div className={`p-4 flex items-center justify-between border-b border-white/5 ${stage.bg}`}>
              <div className="flex items-center gap-2">
                <Icon className={`w-4 h-4 ${stage.color}`} />
                <h3 className="font-bold text-white text-sm tracking-wide">{stage.label}</h3>
              </div>
              <span className="bg-black/40 text-xs font-mono font-bold px-2 py-0.5 rounded-full text-white/70">
                {stageShots.length}
              </span>
            </div>

            {/* Cards */}
            <div className="flex-1 p-3 space-y-3 overflow-y-auto">
              {stageShots.map(shot => (
                <div key={shot.id} className="bg-white/5 border border-white/10 hover:border-white/20 transition-all rounded-xl p-3 flex flex-col group relative">
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold bg-studio-950 text-slate-300 px-1.5 py-0.5 rounded border border-white/5">
                        Sc {shot.scene_number}
                      </span>
                      <span className="text-xs font-bold text-white">{shot.vfx_id}</span>
                    </div>
                    {/* Advance Status Dropdown */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                      <select 
                        className="text-[10px] bg-studio-950 border border-white/10 rounded px-1 py-0.5 text-slate-300 outline-none focus:ring-1 focus:ring-purple-500 font-bold"
                        value={shot.status || 'PRE_VIS'}
                        onChange={(e) => updateStatus(shot.id, e.target.value)}
                      >
                        {STAGES.map(s => (
                          <option key={s.id} value={s.id}>{s.label}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                  
                  <p className="text-xs text-slate-400 line-clamp-4 leading-relaxed mb-3">
                    {shot.description}
                  </p>

                  <div className="mt-auto flex items-center justify-between text-[10px] text-slate-500 font-mono">
                    <span className="flex items-center gap-1.5">
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-600"></div>
                      {shot.vendor_name || 'In-House'}
                    </span>
                    <span>{shot.frame_count} fr</span>
                  </div>
                </div>
              ))}
              
              {stageShots.length === 0 && (
                <div className="h-24 flex items-center justify-center border border-dashed border-white/10 rounded-xl m-2 bg-studio-950/30">
                  <span className="text-xs text-slate-500 font-mono">Empty</span>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
