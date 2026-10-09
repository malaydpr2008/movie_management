"use client";

import React, { useMemo } from 'react';
import { ProjectTree, ScheduleData } from '@/lib/api';
import { useProjectTree } from '@/hooks/useNarrative';
import { useSchedule } from '@/hooks/useProduction';
import { Loader2, GripVertical, AlertCircle } from 'lucide-react';

export default function SequenceBoardPage({ params }: { params: { projectId: string } }) {
  const { projectId } = params;

  const { data: tree, isLoading: isLoadingTree } = useProjectTree(projectId);
  const { data: schedule, isLoading: isLoadingSchedule } = useSchedule(projectId);

  const isLoading = isLoadingTree || isLoadingSchedule;

  const unassignedSceneIds = useMemo(() => {
    if (!schedule) return new Set<string>();
    return new Set(schedule.unassigned_scenes.map(s => s.id));
  }, [schedule]);

  if (isLoading) {
    return (
      <div className="flex-1 h-full flex items-center justify-center text-slate-400 gap-3">
        <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
        <span>Loading Board...</span>
      </div>
    );
  }

  if (!tree) return null;

  return (
    <div className="min-h-full bg-studio-950 p-6 overflow-x-auto">
      <div className="mb-6">
        <h1 className="text-2xl font-black text-white uppercase tracking-tight">Sequence Board</h1>
        <p className="text-slate-400 text-sm">Visual corkboard of narrative sequences.</p>
      </div>

      <div className="flex flex-col gap-8 min-w-[800px]">
        {tree.acts.map(act => (
          <div key={act.id} className="bg-studio-900/50 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-bold text-white mb-4 uppercase tracking-wider flex items-center gap-2">
              <span className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-mono">
                {act.title.charAt(0)}
              </span>
              {act.title}
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {act.sequences.map(seq => {
                const totalScenes = seq.scenes.length;
                const scheduledScenes = seq.scenes.filter(s => !unassignedSceneIds.has(s.id)).length;
                const progressPct = totalScenes === 0 ? 0 : Math.round((scheduledScenes / totalScenes) * 100);

                return (
                  <div
                    key={seq.id}
                    className="bg-studio-800 rounded-xl p-4 border shadow-xl relative group flex flex-col min-h-[160px]"
                    style={{ borderColor: seq.color_tag || '#ffffff33' }}
                  >
                    <div className="absolute top-0 left-0 w-full h-1.5 opacity-50 rounded-t-xl" style={{ backgroundColor: seq.color_tag || '#3b82f6' }} />
                    
                    <div className="flex items-start justify-between mb-2 mt-1">
                      <h3 className="font-bold text-white text-sm line-clamp-2">{seq.title}</h3>
                      <GripVertical className="w-4 h-4 text-slate-500 cursor-grab shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </div>

                    <p className="text-xs text-slate-400 italic mb-4 flex-1 line-clamp-3">
                      {seq.dramatic_question || "No dramatic question defined."}
                    </p>

                    {seq.continuity_notes && (
                      <div className="mb-3 text-[10px] bg-rose-500/10 text-rose-300 p-1.5 rounded border border-rose-500/20 flex items-start gap-1.5">
                        <AlertCircle className="w-3 h-3 shrink-0 mt-0.5" />
                        <span className="line-clamp-2">{seq.continuity_notes}</span>
                      </div>
                    )}

                    <div className="mt-auto pt-3 border-t border-white/5">
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-400 mb-1.5">
                        <span>Scheduling</span>
                        <span>{scheduledScenes} / {totalScenes} ({progressPct}%)</span>
                      </div>
                      <div className="w-full h-1.5 bg-studio-950 rounded-full overflow-hidden">
                        <div 
                          className="h-full rounded-full transition-all duration-500"
                          style={{ 
                            width: `${progressPct}%`, 
                            backgroundColor: progressPct === 100 ? '#10b981' : '#0ea5e9' 
                          }} 
                        />
                      </div>
                    </div>
                  </div>
                );
              })}

              {act.sequences.length === 0 && (
                <div className="col-span-full py-8 text-center border-2 border-dashed border-white/5 rounded-xl text-slate-500 text-sm">
                  No sequences in {act.title}.
                </div>
              )}
            </div>
          </div>
        ))}

        {tree.acts.length === 0 && (
          <div className="text-center py-20 text-slate-500">
            No Acts available. Create one in the Outliner.
          </div>
        )}
      </div>
    </div>
  );
}
