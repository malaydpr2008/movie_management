"use client";

import React from 'react';
import { useToastStore } from '@/stores/useToastStore';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

export function ToastContainer() {
  const { toasts, removeToast } = useToastStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`pointer-events-auto flex items-start gap-3 p-4 rounded-xl border backdrop-blur-md shadow-2xl transition-all duration-300 animate-in fade-in slide-in-from-bottom-5 ${
            t.type === 'success'
              ? 'bg-studio-900/90 border-emerald-500/40 text-emerald-100 shadow-emerald-950/40'
              : t.type === 'error'
              ? 'bg-studio-900/90 border-rose-500/40 text-rose-100 shadow-rose-950/40'
              : 'bg-studio-900/90 border-sky-500/40 text-sky-100 shadow-sky-950/40'
          }`}
        >
          {t.type === 'success' && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />}
          {t.type === 'error' && <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />}
          {t.type === 'info' && <Info className="w-5 h-5 text-sky-400 shrink-0 mt-0.5" />}

          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold tracking-tight">{t.title}</h4>
            {t.description && <p className="text-xs text-slate-300 mt-0.5">{t.description}</p>}
          </div>

          <button
            onClick={() => removeToast(t.id)}
            className="text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
