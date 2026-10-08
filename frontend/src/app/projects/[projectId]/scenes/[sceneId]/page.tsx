"use client";

import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Camera,
  Layers,
  Calculator,
  ChevronLeft,
  ChevronRight,
  ListTree,
  Film,
  Sparkles,
  PanelRightClose,
  PanelRightOpen,
  Clapperboard,
  Clock,
  FileSpreadsheet
} from 'lucide-react';
import Link from 'next/link';
import { api, SceneDetail, SceneCoverage, SceneBreakdownItem } from '@/lib/api';
import { LinedScriptEditor } from '@/components/studio/LinedScriptEditor';
import { ShotsSetupsDrawer } from '@/components/studio/ShotsSetupsDrawer';
import { DepartmentBreakdownDrawer } from '@/components/studio/DepartmentBreakdownDrawer';
import { LogisticsPageMathDrawer } from '@/components/studio/LogisticsPageMathDrawer';
import ElementTaggingPanel from '@/components/breakdown/ElementTaggingPanel';
import { useProjectStore } from '@/stores/useProjectStore';

export default function SceneBuilderPage({
  params,
}: {
  params: { projectId: string; sceneId: string };
}) {
  const { projectId, sceneId } = params;
  const {
    setSelectedSceneId,
    rightDrawerTab,
    setRightDrawerTab,
    rightDrawerCollapsed,
    toggleRightDrawer,
  } = useProjectStore();

  useEffect(() => {
    setSelectedSceneId(sceneId);
  }, [sceneId, setSelectedSceneId]);

  // Fetch Scene Details
  const {
    data: scene,
    isLoading: isLoadingScene,
    refetch: refetchScene,
  } = useQuery<SceneDetail>({
    queryKey: ['sceneDetail', sceneId],
    queryFn: () => api.getSceneDetail(sceneId),
    enabled: Boolean(sceneId),
  });

  // Fetch Scene Coverage (Setups, Shots, Takes)
  const {
    data: coverage,
    isLoading: isLoadingCoverage,
    refetch: refetchCoverage,
  } = useQuery<SceneCoverage>({
    queryKey: ['sceneCoverage', sceneId],
    queryFn: () => api.getSceneCoverage(sceneId),
    enabled: Boolean(sceneId),
  });

  // Fetch Scene Breakdown Items
  const {
    data: breakdownItems = [],
    isLoading: isLoadingBreakdown,
    refetch: refetchBreakdown,
  } = useQuery<SceneBreakdownItem[]>({
    queryKey: ['sceneBreakdown', sceneId],
    queryFn: () => api.getSceneBreakdownItems(sceneId),
    enabled: Boolean(sceneId),
  });

  const setups = coverage?.setups || [];
  const allShots = setups.flatMap((s) => s.shots);

  if (isLoadingScene || !scene) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-12 text-slate-400 gap-3">
        <Clapperboard className="w-10 h-10 animate-bounce text-sky-400" />
        <span className="text-sm font-semibold tracking-wide">Loading Scene Builder Studio...</span>
      </div>
    );
  }

  const scriptBlocks = scene.script_data?.blocks || [];

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col overflow-hidden bg-studio-950">
      {/* Studio Top Control Banner */}
      <div className="px-6 py-3 bg-studio-900/80 border-b border-white/5 flex items-center justify-between gap-4 shrink-0">
        <div className="flex items-center gap-3">
          <Link
            href={`/projects/${projectId}/outliner`}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-studio-800 hover:bg-studio-700 text-xs font-semibold text-slate-300 hover:text-white transition-colors border border-white/5"
          >
            <ListTree className="w-3.5 h-3.5 text-sky-400" />
            <span>Outliner</span>
          </Link>

          <span className="text-slate-600">/</span>

          <div className="flex items-center gap-2">
            <span className="font-mono text-xs font-bold text-white bg-studio-800 px-2.5 py-1 rounded border border-white/10">
              SCENE #{scene.scene_number}
            </span>
            <span className="text-xs font-bold text-slate-200">
              {scene.int_ext}. {scene.set_name} - {scene.time_of_day}
            </span>
          </div>

          {scene.sequence_title && (
            <span className="text-[11px] font-mono text-slate-400 bg-studio-950 px-2 py-0.5 rounded hidden md:inline-block border border-white/5">
              {scene.sequence_title}
            </span>
          )}
        </div>

        {/* Action badges and drawer toggle */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
            <span className="flex items-center gap-1 px-2.5 py-1 rounded bg-studio-900 border border-white/5 text-slate-300">
              <Camera className="w-3.5 h-3.5 text-sky-400" />
              <span>{allShots.length} Shots</span>
            </span>
            <span className="flex items-center gap-1 px-2.5 py-1 rounded bg-studio-900 border border-white/5 text-slate-300">
              <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
              <span>{scene.pages_display} pgs</span>
            </span>
            <span className="flex items-center gap-1 px-2.5 py-1 rounded bg-studio-900 border border-white/5 text-slate-300">
              <Clock className="w-3.5 h-3.5 text-emerald-400" />
              <span>{scene.estimated_shoot_minutes}m</span>
            </span>
          </div>

          <button
            onClick={toggleRightDrawer}
            title={rightDrawerCollapsed ? 'Expand Drawers' : 'Collapse Drawers'}
            className="p-1.5 rounded-lg bg-studio-850 hover:bg-studio-800 text-slate-400 hover:text-white border border-white/5 transition-colors"
          >
            {rightDrawerCollapsed ? <PanelRightOpen className="w-4 h-4" /> : <PanelRightClose className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Split-Screen Studio Workspace */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Panel: Screenplay Editor & Lined Script View */}
        <div className="flex-1 p-4 md:p-6 overflow-y-auto flex flex-col gap-6">
          <div className="flex-1 min-h-[500px]">
            <LinedScriptEditor
              scene={scene}
              shots={allShots}
              onSceneUpdated={() => {
                refetchScene();
                refetchCoverage();
              }}
            />
          </div>
          <ElementTaggingPanel projectId={projectId} sceneId={sceneId} />
        </div>

        {/* Right Panel: Modular Tabbed Drawers */}
        {!rightDrawerCollapsed && (
          <aside className="w-96 lg:w-[480px] shrink-0 border-l border-white/5 bg-studio-900 flex flex-col overflow-hidden transition-all duration-300">
            {/* Tab Bar */}
            <div className="p-2 border-b border-white/5 bg-studio-950 flex items-center gap-1 shrink-0">
              <button
                onClick={() => setRightDrawerTab('shots')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  rightDrawerTab === 'shots'
                    ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-studio-850'
                }`}
              >
                <Camera className="w-3.5 h-3.5" />
                <span>Shots & Setups</span>
                <span className="font-mono text-[10px] bg-studio-950/80 px-1.5 py-0.2 rounded">
                  {allShots.length}
                </span>
              </button>

              <button
                onClick={() => setRightDrawerTab('breakdown')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  rightDrawerTab === 'breakdown'
                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-studio-850'
                }`}
              >
                <Layers className="w-3.5 h-3.5" />
                <span>Breakdown</span>
                <span className="font-mono text-[10px] bg-studio-950/80 px-1.5 py-0.2 rounded">
                  {breakdownItems.length}
                </span>
              </button>

              <button
                onClick={() => setRightDrawerTab('logistics')}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl text-xs font-bold transition-all ${
                  rightDrawerTab === 'logistics'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-white hover:bg-studio-850'
                }`}
              >
                <Calculator className="w-3.5 h-3.5" />
                <span>Logistics</span>
              </button>
            </div>

            {/* Tab Content Drawer Area */}
            <div className="flex-1 overflow-y-auto p-5">
              {rightDrawerTab === 'shots' && (
                <ShotsSetupsDrawer
                  sceneId={scene.id}
                  setups={setups}
                  scriptBlocks={scriptBlocks}
                  onCoverageUpdated={() => {
                    refetchCoverage();
                    refetchScene();
                  }}
                />
              )}

              {rightDrawerTab === 'breakdown' && (
                <DepartmentBreakdownDrawer
                  sceneId={scene.id}
                  projectId={projectId}
                  items={breakdownItems}
                  onItemsUpdated={() => refetchBreakdown()}
                />
              )}

              {rightDrawerTab === 'logistics' && (
                <LogisticsPageMathDrawer
                  scene={scene}
                  onSceneUpdated={() => refetchScene()}
                />
              )}
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}
