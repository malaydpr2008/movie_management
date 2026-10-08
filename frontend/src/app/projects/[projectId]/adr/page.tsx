"use client";

import React from 'react';
import ADRPanel from '@/components/studio/ADRPanel';
import { Mic2 } from 'lucide-react';

export default function ADRPage({ params }: { params: { projectId: string } }) {
  const { projectId } = params;

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Studio Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-indigo-400">
              Audio Post-Production
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight mt-1 flex items-center gap-3">
            <Mic2 className="w-8 h-8 text-indigo-400" />
            <span>ADR & Sound</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Dedicated audio hub to flag and manage ruined dialogue, loop groups, and wild lines for re-recording.
          </p>
        </div>
      </div>

      <div className="max-w-4xl">
        <ADRPanel projectId={projectId} />
      </div>
    </div>
  );
}
