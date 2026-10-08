"use client";

import React from 'react';
import { Users } from 'lucide-react';
import CrewRosterBoard from '@/components/logistics/CrewRosterBoard';

export default function CrewPage({ params }: { params: { projectId: string } }) {
  const { projectId } = params;

  return (
    <div className="p-8 max-w-5xl mx-auto space-y-8 animate-fade-in">
      {/* Studio Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-emerald-400">
              Logistics & Crew
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight mt-1 flex items-center gap-3">
            <Users className="w-8 h-8 text-emerald-400" />
            <span>Crew Roster</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Manage your production team, departments, day rates, and union affiliations.
          </p>
        </div>
      </div>

      <div className="w-full">
        <CrewRosterBoard projectId={projectId} />
      </div>
    </div>
  );
}
