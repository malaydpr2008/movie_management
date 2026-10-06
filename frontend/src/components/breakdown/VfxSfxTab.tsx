"use client";

import React, { useState } from 'react';
import {
  Wand2,
  Flame,
  AlertTriangle,
  ExternalLink,
  Film
} from 'lucide-react';
import Link from 'next/link';
import { VFXSFXItem } from '@/lib/api';

interface VfxSfxTabProps {
  projectId: string;
  items: VFXSFXItem[];
}

export default function VfxSfxTab({ projectId, items }: VfxSfxTabProps) {
  const [filterType, setFilterType] = useState<'ALL' | 'VFX' | 'SFX'>('ALL');

  const filteredItems = items.filter((it) => {
    if (filterType === 'VFX') return it.element_type === 'VFX';
    if (filterType === 'SFX') return it.element_type === 'SFX';
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h3 className="text-lg font-bold text-white">Visual & Special Effects Tracker (VFX / SFX)</h3>
          <p className="text-xs text-slate-400">Practical pyrotechnics, atmospheric rigs, stunts, and CGI plates</p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setFilterType('ALL')}
            className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all ${
              filterType === 'ALL'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'bg-studio-900 border border-white/5 text-slate-400 hover:text-white'
            }`}
          >
            All Effects ({items.length})
          </button>
          <button
            onClick={() => setFilterType('VFX')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all ${
              filterType === 'VFX'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'bg-studio-900 border border-white/5 text-slate-400 hover:text-white'
            }`}
          >
            <Wand2 className="w-3.5 h-3.5" />
            <span>VFX Plates ({items.filter((i) => i.element_type === 'VFX').length})</span>
          </button>
          <button
            onClick={() => setFilterType('SFX')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all ${
              filterType === 'SFX'
                ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                : 'bg-studio-900 border border-white/5 text-slate-400 hover:text-white'
            }`}
          >
            <Flame className="w-3.5 h-3.5 text-rose-400" />
            <span>SFX / Stunts ({items.filter((i) => i.element_type === 'SFX').length})</span>
          </button>
        </div>
      </div>

      {/* Effects Table */}
      <div className="rounded-2xl bg-studio-900 border border-white/10 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-studio-950 border-b border-white/10 font-mono uppercase text-slate-400 text-[11px]">
                <th className="px-5 py-4 font-bold text-center w-24">Type</th>
                <th className="px-4 py-4 font-bold text-center w-28">Scene #</th>
                <th className="px-5 py-4 font-bold">Effect Description / Rigging Notes</th>
                <th className="px-4 py-4 font-bold text-center w-36">Continuity</th>
                <th className="px-4 py-4 font-bold text-right w-24">Studio</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-mono">
                    No VFX or SFX elements tagged matching the current filter.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Element Type */}
                    <td className="px-5 py-3.5 text-center">
                      <span
                        className={`inline-flex items-center gap-1 font-mono font-bold text-[10px] px-2.5 py-1 rounded-full uppercase border ${
                          item.element_type === 'VFX'
                            ? 'bg-purple-500/20 text-purple-300 border-purple-500/40 shadow-sm shadow-purple-500/10'
                            : 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-sm shadow-rose-500/10'
                        }`}
                      >
                        {item.element_type === 'VFX' ? (
                          <Wand2 className="w-3 h-3" />
                        ) : (
                          <Flame className="w-3 h-3" />
                        )}
                        <span>{item.element_type}</span>
                      </span>
                    </td>

                    {/* Scene # */}
                    <td className="px-4 py-3.5 text-center font-mono font-black text-sm text-white">
                      #{item.scene_number}
                    </td>

                    {/* Description */}
                    <td className="px-5 py-3.5">
                      <p className="text-xs text-slate-200 leading-relaxed font-sans font-medium">
                        {item.custom_notes || 'Standard practical/digital effect pass'}
                      </p>
                    </td>

                    {/* Continuity Critical Badge */}
                    <td className="px-4 py-3.5 text-center">
                      {item.is_continuity_critical ? (
                        <span className="inline-flex items-center gap-1 font-mono font-bold text-[10px] px-2 py-0.5 rounded bg-rose-950/60 text-rose-400 border border-rose-500/40">
                          <AlertTriangle className="w-3 h-3" /> CRITICAL
                        </span>
                      ) : (
                        <span className="inline-block font-mono text-[10px] px-2 py-0.5 rounded bg-white/5 text-slate-500">
                          Standard
                        </span>
                      )}
                    </td>

                    {/* Studio Jump Link */}
                    <td className="px-4 py-3.5 text-right">
                      <Link
                        href={`/projects/${projectId}/scenes/${item.scene_id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-studio-950 border border-white/10 text-xs font-mono text-sky-400 hover:text-sky-300 hover:border-sky-500/30 transition-colors"
                      >
                        <span>Studio</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
