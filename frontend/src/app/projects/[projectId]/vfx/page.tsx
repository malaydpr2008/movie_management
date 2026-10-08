"use client";

import React from 'react';
import { Wand2 } from 'lucide-react';
import VFXPipelineBoard from '@/components/studio/VFXPipelineBoard';

export default function VFXPage({ params }: { params: { projectId: string } }) {
  const { projectId } = params;

  return (
    <div className="p-8 max-w-[1600px] mx-auto space-y-8 animate-fade-in">
      {/* Studio Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-purple-400">
              Post-Production
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-purple-400 animate-pulse" />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight mt-1 flex items-center gap-3">
            <Wand2 className="w-8 h-8 text-purple-400" />
            <span>VFX Pipeline Tracking</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Visual Effects kanban board for tracking shot progression from Pre-Vis through Final Render.
          </p>
        </div>
      </div>

      <div className="w-full">
        <VFXPipelineBoard projectId={projectId} />
      </div>
    </div>
  );
}
