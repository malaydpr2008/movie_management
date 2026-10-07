"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { X, CheckCircle, Loader2 } from "lucide-react";
import { useToastStore } from "@/stores/useToastStore";

export function BreakdownReviewModal({ projectId }: { projectId: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { addToast } = useToastStore();

  useEffect(() => {
    const handleOpen = () => setIsOpen(true);
    window.addEventListener("open-breakdown-review", handleOpen);
    return () => window.removeEventListener("open-breakdown-review", handleOpen);
  }, []);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["pendingBreakdown", projectId],
    queryFn: () => api.getPendingBreakdown(projectId),
    enabled: isOpen,
  });

  const approveMutation = useMutation({
    mutationFn: (scenes: any[]) => api.approveBreakdown(projectId, scenes),
    onSuccess: () => {
      addToast({ title: "Breakdown approved and saved to database!", type: "success" });
      setIsOpen(false);
      queryClient.invalidateQueries({ queryKey: ["projectTree", projectId] });
    },
    onError: (error: any) => {
      addToast({ title: error.message || "Failed to approve breakdown", type: "error" });
    },
  });

  if (!isOpen) return null;

  const scenes = data?.data?.scenes || [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="bg-studio-900 border border-white/10 rounded-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        <div className="px-6 py-4 border-b border-white/10 flex items-center justify-between bg-studio-950">
          <div>
            <h2 className="text-lg font-semibold text-white">Pending Script Breakdown</h2>
            <p className="text-sm text-slate-400">Review the AI extracted scenes before saving to database</p>
          </div>
          <button
            onClick={() => setIsOpen(false)}
            className="p-2 hover:bg-white/5 rounded-full text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-6 bg-studio-900 space-y-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-20 text-slate-400">
              <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
              <p>Fetching pending breakdown...</p>
            </div>
          ) : scenes.length === 0 ? (
            <div className="text-center py-20 text-slate-400">
              <p>No pending breakdown found.</p>
            </div>
          ) : (
            scenes.map((scene: any, idx: number) => (
              <div key={idx} className="bg-studio-800 rounded-xl p-4 border border-white/5 shadow-inner">
                <div className="flex items-center gap-3 mb-2">
                  <span className="bg-indigo-500/20 text-indigo-400 px-2 py-1 rounded text-xs font-bold">
                    SCENE {idx + 1}
                  </span>
                  <h3 className="text-slate-200 font-medium">{scene.heading}</h3>
                </div>
                <p className="text-sm text-slate-400 mb-3 pl-2 border-l-2 border-white/10">
                  {scene.synopsis}
                </p>
                {scene.characters && scene.characters.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2">
                    {scene.characters.map((char: string, cidx: number) => (
                      <span key={cidx} className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-1 rounded-md text-xs font-medium">
                        {char}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        <div className="p-5 border-t border-white/10 bg-studio-950 flex justify-end gap-3">
          <button
            onClick={() => setIsOpen(false)}
            className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white bg-studio-800 hover:bg-studio-700 border border-white/10 rounded-lg transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => approveMutation.mutate(scenes)}
            disabled={scenes.length === 0 || approveMutation.isPending}
            className="flex items-center gap-2 px-5 py-2 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg shadow-lg shadow-indigo-500/20 transition-all"
          >
            {approveMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <CheckCircle className="w-4 h-4" />
            )}
            Confirm & Write to Database
          </button>
        </div>
      </div>
    </div>
  );
}
