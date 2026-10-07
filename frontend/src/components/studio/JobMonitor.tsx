"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Activity, X, CheckCircle, Loader2, AlertCircle } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

export function JobMonitor() {
  const [isOpen, setIsOpen] = useState(false);

  const { data, isLoading, refetch } = useQuery({
    queryKey: ["backgroundJobs"],
    queryFn: () => api.getBackgroundJobs(),
    refetchInterval: isOpen ? 3000 : 0, // Poll every 3 seconds when open
  });

  const jobs = data?.jobs || [];

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-24 right-6 p-4 rounded-full bg-slate-800 hover:bg-slate-700 text-white shadow-xl shadow-black/30 transition-all hover:scale-105 z-40 flex items-center justify-center border border-white/10 group"
      >
        <Activity className="w-5 h-5 text-sky-400 group-hover:animate-pulse" />
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-20 w-[450px] max-h-[60vh] bg-studio-900 border border-white/10 shadow-2xl rounded-2xl flex flex-col z-50 overflow-hidden">
          <div className="flex items-center justify-between p-4 bg-studio-950 border-b border-white/10">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-sky-500/20 rounded-lg text-sky-400">
                <Activity className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-bold text-white text-sm">Background Jobs</h3>
                <p className="text-xs text-slate-400 flex items-center gap-1">
                  Live Monitor
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => refetch()}
                className="text-slate-400 hover:text-white transition-colors text-xs font-medium px-2 py-1 bg-white/5 hover:bg-white/10 rounded"
              >
                Refresh
              </button>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-white transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-studio-900/50">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-10 text-slate-400">
                <Loader2 className="w-6 h-6 animate-spin mb-3 text-sky-500" />
                <p className="text-sm">Loading jobs...</p>
              </div>
            ) : jobs.length === 0 ? (
              <div className="text-center py-10 text-slate-400 text-sm">
                <p>No background jobs found.</p>
              </div>
            ) : (
              jobs.map((job: any) => (
                <div
                  key={job.id}
                  className="bg-studio-800 rounded-xl p-4 border border-white/5 shadow-inner flex flex-col gap-2 text-sm"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-semibold text-slate-200">{job.task_name}</h4>
                      <p className="text-xs text-slate-500">
                        {formatDistanceToNow(new Date(job.created_at), { addSuffix: true })}
                      </p>
                    </div>
                    <div>
                      {job.status === "RUNNING" && (
                        <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-sky-500/10 text-sky-400 text-xs font-bold uppercase">
                          <Loader2 className="w-3 h-3 animate-spin" />
                          Running
                        </span>
                      )}
                      {job.status === "SUCCESS" && (
                        <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-emerald-500/10 text-emerald-400 text-xs font-bold uppercase">
                          <CheckCircle className="w-3 h-3" />
                          Success
                        </span>
                      )}
                      {job.status === "FAILED" && (
                        <span className="flex items-center gap-1.5 px-2 py-1 rounded bg-rose-500/10 text-rose-400 text-xs font-bold uppercase">
                          <AlertCircle className="w-3 h-3" />
                          Failed
                        </span>
                      )}
                    </div>
                  </div>

                  {job.status === "FAILED" && job.error_message && (
                    <div className="mt-2 p-2 rounded bg-rose-500/5 border border-rose-500/10 text-rose-400/80 text-xs font-mono overflow-x-auto">
                      {job.error_message}
                    </div>
                  )}
                  {job.status === "SUCCESS" && job.result && (
                    <div className="mt-2 text-xs text-slate-400 break-words">
                      {typeof job.result === "string" ? job.result : JSON.stringify(job.result)}
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
