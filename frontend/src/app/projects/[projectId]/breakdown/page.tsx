"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Camera,
  Layers,
  Users,
  Box,
  MapPin,
  Wand2,
  RefreshCw,
  Sparkles,
  Tag
} from 'lucide-react';
import { api, BreakdownSummary } from '@/lib/api';
import LocationsTab from '@/components/breakdown/LocationsTab';
import CharactersTab from '@/components/breakdown/CharactersTab';
import PropsTab from '@/components/breakdown/PropsTab';
import VfxSfxTab from '@/components/breakdown/VfxSfxTab';
import ElementTaggingPanel from '@/components/breakdown/ElementTaggingPanel';
import ContinuityGallery from '@/components/studio/ContinuityGallery';
import { useProjectStore } from '@/stores/useProjectStore';

export default function BreakdownCatalogsPage({ params }: { params: { projectId: string } }) {
  const { projectId } = params;
  const { selectedSceneId } = useProjectStore();
  const [activeTab, setActiveTab] = useState<'locations' | 'characters' | 'props' | 'vfx' | 'tagging' | 'continuity'>('locations');

  const {
    data: summary,
    isLoading,
    refetch,
    isFetching,
  } = useQuery<BreakdownSummary>({
    queryKey: ['breakdownSummary', projectId],
    queryFn: () => api.getBreakdownSummary(projectId),
    enabled: Boolean(projectId),
  });

  if (isLoading || !summary) {
    return (
      <div className="h-full min-h-[500px] flex flex-col items-center justify-center p-12 text-slate-400 gap-3">
        <Layers className="w-10 h-10 animate-bounce text-amber-400" />
        <span className="font-mono text-sm">Loading Central Breakdown Catalogs...</span>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8 animate-fade-in">
      {/* Studio Header Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-white/5">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold uppercase tracking-widest text-amber-400">
              Art Department & Continuity Catalogs
            </span>
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
          </div>
          <h2 className="text-3xl font-black text-white tracking-tight mt-1 flex items-center gap-3">
            <span>Central Breakdown Catalogs</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Global registries for physical master locations, character bibles, wardrobe continuity looks, prop inventory, and VFX/SFX plates.
          </p>
        </div>

        {/* Tab Controls */}
        <div className="flex items-center gap-3">
          <div className="p-1 rounded-xl bg-studio-900 border border-white/10 flex flex-wrap items-center gap-1 shadow-lg">
            <button
              onClick={() => setActiveTab('locations')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-mono text-xs font-bold transition-all ${
                activeTab === 'locations'
                  ? 'bg-sky-500 text-black shadow-md shadow-sky-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <MapPin className="w-3.5 h-3.5" />
              <span>Locations ({summary.total_locations})</span>
            </button>

            <button
              onClick={() => setActiveTab('characters')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-mono text-xs font-bold transition-all ${
                activeTab === 'characters'
                  ? 'bg-purple-600 text-white shadow-md shadow-purple-600/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Cast & Wardrobe ({summary.total_characters})</span>
            </button>

            <button
              onClick={() => setActiveTab('props')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-mono text-xs font-bold transition-all ${
                activeTab === 'props'
                  ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
              <span>Props ({summary.total_props})</span>
            </button>

            <button
              onClick={() => setActiveTab('vfx')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-mono text-xs font-bold transition-all ${
                activeTab === 'vfx'
                  ? 'bg-purple-500 text-white shadow-md shadow-purple-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Wand2 className="w-3.5 h-3.5" />
              <span>VFX / SFX ({summary.total_vfx + summary.total_sfx})</span>
            </button>

            
            <button
              onClick={() => setActiveTab('continuity')}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-mono text-xs font-bold transition-all ${
                activeTab === 'continuity'
                  ? 'bg-sky-500 text-white shadow-md shadow-sky-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>Continuity Vault</span>
            </button>
            <button
              onClick={() => setActiveTab('tagging')}

              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg font-mono text-xs font-bold transition-all ${
                activeTab === 'tagging'
                  ? 'bg-indigo-500 text-white shadow-md shadow-indigo-500/20'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Tag className="w-3.5 h-3.5" />
              <span>Manual Tagging</span>
            </button>
          </div>

          <button
            onClick={() => refetch()}
            disabled={isFetching}
            className="p-2.5 rounded-xl bg-studio-900 border border-white/10 text-slate-400 hover:text-white hover:border-white/20 transition-all disabled:opacity-50"
            title="Refresh Catalogs"
          >
            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin text-amber-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Overview Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <div className="p-4 rounded-2xl bg-studio-900/60 border border-white/5 space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-400">Master Locations</span>
          <div className="text-xl font-black text-sky-400 font-mono">{summary.total_locations} Sets</div>
        </div>

        <div className="p-4 rounded-2xl bg-studio-900/60 border border-white/5 space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-400">Cast Characters</span>
          <div className="text-xl font-black text-purple-400 font-mono">{summary.total_characters} Roles</div>
        </div>

        <div className="p-4 rounded-2xl bg-studio-900/60 border border-white/5 space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-400">Prop Inventory</span>
          <div className="text-xl font-black text-amber-400 font-mono">{summary.total_props} Props</div>
        </div>

        <div className="p-4 rounded-2xl bg-studio-900/60 border border-white/5 space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-400">Special Effects & VFX</span>
          <div className="text-xl font-black text-rose-400 font-mono">
            {summary.total_vfx} VFX &bull; {summary.total_sfx} SFX
          </div>
        </div>
      </div>


      {/* Active Tab Panel */}
      {activeTab === 'continuity' && (
        <div className="mb-6 h-[600px]">
          {selectedSceneId ? (
            <ContinuityGallery projectId={projectId} sceneId={selectedSceneId} />
          ) : (
            <div className="h-full flex flex-col items-center justify-center bg-studio-950 border border-white/5 rounded-2xl p-12 text-slate-400 gap-3">
              <Camera className="w-10 h-10 animate-bounce text-sky-400" />
              <span className="font-mono text-sm">Select a Scene in the Outliner or Scene Builder to view its Continuity Vault.</span>
            </div>
          )}
        </div>
      )}

      {activeTab === 'tagging' && (
        <div className="mb-6">
          <ElementTaggingPanel projectId={projectId} />
        </div>
      )}
      {activeTab === 'locations' && (
        <LocationsTab
          projectId={projectId}
          locations={summary.locations}
          onRefresh={() => refetch()}
        />
      )}

      {activeTab === 'characters' && (
        <CharactersTab
          projectId={projectId}
          characters={summary.characters}
          onRefresh={() => refetch()}
        />
      )}

      {activeTab === 'props' && (
        <PropsTab
          projectId={projectId}
          props={summary.props}
          onRefresh={() => refetch()}
        />
      )}

      {activeTab === 'vfx' && (
        <VfxSfxTab
          projectId={projectId}
          items={summary.vfx_sfx_items}
        />
      )}
    </div>
  );
}
