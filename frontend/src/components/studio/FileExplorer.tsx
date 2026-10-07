"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { File, AlertCircle, Loader2 } from "lucide-react";

export function FileExplorer() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["s3Assets"],
    queryFn: () => api.getAssets(),
  });

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin mb-4 text-sky-500" />
        <p>Loading Object Storage...</p>
      </div>
    );
  }

  const apiError = error?.message || data?.error;

  return (
    <div className="p-6">
      <h2 className="text-2xl font-bold text-white mb-6 flex items-center gap-2">
        <File className="w-6 h-6 text-sky-400" />
        Studio Media Storage
      </h2>

      {apiError && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-start gap-3 text-rose-400 mb-6">
          <AlertCircle className="w-5 h-5 mt-0.5 shrink-0" />
          <div>
            <h3 className="font-bold">Storage Connection Error</h3>
            <p className="text-sm mt-1">{apiError}</p>
          </div>
        </div>
      )}

      {data?.files && data.files.length === 0 && !apiError && (
        <div className="bg-studio-800/50 rounded-xl p-12 text-center text-slate-400 border border-white/5">
          <p>The bucket is currently empty.</p>
        </div>
      )}

      {data?.files && data.files.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {data.files.map((file: any) => (
            <a
              key={file.key}
              href={file.url}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-studio-800 border border-white/10 rounded-xl p-4 flex flex-col items-center justify-center gap-3 hover:bg-studio-700 hover:border-sky-500/50 transition-all group"
            >
              <div className="w-12 h-12 bg-studio-900 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                <File className="w-6 h-6 text-slate-300 group-hover:text-sky-400" />
              </div>
              <div className="text-center w-full">
                <p className="text-sm font-semibold text-slate-200 truncate" title={file.key}>
                  {file.key}
                </p>
                <p className="text-xs text-slate-500 mt-1">
                  {(file.size / 1024).toFixed(2)} KB
                </p>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
