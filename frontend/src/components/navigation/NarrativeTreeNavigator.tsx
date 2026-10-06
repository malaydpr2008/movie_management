"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  ChevronDown,
  ChevronRight,
  Plus,
  Clapperboard,
  Video,
  FileSpreadsheet,
  Layers,
  ChevronLeft,
  ChevronsUpDown,
  Compass,
  Sparkles,
  Target,
  FileText
} from 'lucide-react';
import { ProjectTree, ActTreeNode, SequenceTreeNode, SceneTreeNode, api } from '@/lib/api';
import { useProjectStore } from '@/stores/useProjectStore';
import { toast } from '@/stores/useToastStore';
import { NewSceneModal } from '@/components/outliner/NewSceneModal';

interface NarrativeTreeNavigatorProps {
  projectId: string;
  projectTree?: ProjectTree;
  onRefresh?: () => void;
}

export function NarrativeTreeNavigator({
  projectId,
  projectTree,
  onRefresh,
}: NarrativeTreeNavigatorProps) {
  const pathname = usePathname();
  const { sidebarCollapsed, toggleSidebar, searchQuery, filterIntExt } = useProjectStore();

  // Accordion state
  const [collapsedActs, setCollapsedActs] = useState<Record<string, boolean>>({});
  const [collapsedSequences, setCollapsedSequences] = useState<Record<string, boolean>>({});

  // Modals
  const [addingSequenceActId, setAddingSequenceActId] = useState<string | null>(null);
  const [newSeqTitle, setNewSeqTitle] = useState('');
  const [newSeqColor, setNewSeqColor] = useState('#3B82F6');
  const [newSeqQuestion, setNewSeqQuestion] = useState('');
  const [isSubmittingSeq, setIsSubmittingSeq] = useState(false);

  const [addingSceneSequenceId, setAddingSceneSequenceId] = useState<string | null>(null);

  const [isImportModalOpen, setIsImportModalOpen] = useState(false);
  const [scriptText, setScriptText] = useState('');
  const [isImporting, setIsImporting] = useState(false);

  const toggleAct = (actId: string) => {
    setCollapsedActs((prev) => ({ ...prev, [actId]: !prev[actId] }));
  };

  const toggleSeq = (seqId: string) => {
    setCollapsedSequences((prev) => ({ ...prev, [seqId]: !prev[seqId] }));
  };

  const handleExpandAll = () => {
    setCollapsedActs({});
    setCollapsedSequences({});
  };

  const handleCollapseAll = () => {
    if (!projectTree) return;
    const actsMap: Record<string, boolean> = {};
    const seqsMap: Record<string, boolean> = {};
    projectTree.acts.forEach((a) => {
      actsMap[a.id] = true;
      a.sequences.forEach((s) => {
        seqsMap[s.id] = true;
      });
    });
    setCollapsedActs(actsMap);
    setCollapsedSequences(seqsMap);
  };

  const handleCreateSequence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addingSequenceActId || !newSeqTitle.trim()) return;

    try {
      setIsSubmittingSeq(true);
      await api.createSequence({
        act_id: addingSequenceActId,
        title: newSeqTitle.trim(),
        color_tag: newSeqColor,
        dramatic_question: newSeqQuestion.trim(),
      });
      toast.success('Sequence Created', `Added "${newSeqTitle}" to act.`);
      setAddingSequenceActId(null);
      setNewSeqTitle('');
      setNewSeqQuestion('');
      onRefresh?.();
    } catch (err: any) {
      toast.error('Failed to create sequence', err.message);
    } finally {
      setIsSubmittingSeq(false);
    }
  };

  const handleImportScript = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!scriptText.trim()) return;

    try {
      setIsImporting(true);
      const res = await api.importScript(projectId, { script_text: scriptText.trim() });
      toast.success('Script Imported', `Parsed ${res.scene_count} scenes successfully.`);
      setIsImportModalOpen(false);
      setScriptText('');
      onRefresh?.();
    } catch (err: any) {
      toast.error('Failed to import script', err.message);
    } finally {
      setIsImporting(false);
    }
  };

  // Filter scenes if search active
  const q = searchQuery.toLowerCase().trim();

  return (
    <aside
      className={`h-[calc(100vh-3.5rem)] sticky top-14 flex flex-col bg-studio-900 border-r border-white/5 transition-all duration-300 z-30 select-none ${
        sidebarCollapsed ? 'w-14' : 'w-80'
      }`}
    >
      {/* Top Header of Tree */}
      <div className="h-10 px-3 flex items-center justify-between border-b border-white/5 bg-studio-950/60 shrink-0">
        {!sidebarCollapsed && (
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400">
              Narrative Outliner Tree
            </span>
          </div>
        )}

        <div className="flex items-center gap-1 ml-auto">
          {!sidebarCollapsed && (
            <>
              <button
                onClick={() => setIsImportModalOpen(true)}
                title="Import Script (.txt/.fountain)"
                className="p-1 rounded text-sky-400 hover:text-sky-300 hover:bg-studio-800 transition-colors mr-1"
              >
                <FileText className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={handleExpandAll}
                title="Expand All Nodes"
                className="p-1 rounded text-slate-400 hover:text-white hover:bg-studio-800 text-[10px] font-mono"
              >
                Exp
              </button>
            </>
          )}
          {!sidebarCollapsed && (
            <button
              onClick={handleCollapseAll}
              title="Collapse All Nodes"
              className="p-1 rounded text-slate-400 hover:text-white hover:bg-studio-800 text-[10px] font-mono"
            >
              Col
            </button>
          )}
          <button
            onClick={toggleSidebar}
            aria-label="Toggle Sidebar"
            className="p-1 rounded text-slate-400 hover:text-white hover:bg-studio-800 transition-colors"
          >
            {sidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Tree View Content Area */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
        {projectTree?.acts.map((act) => {
          const isActCollapsed = collapsedActs[act.id];
          const isActActive = pathname === `/projects/${projectId}/acts/${act.id}`;
          const actScenesCount = act.sequences.reduce((acc, s) => acc + s.scenes.length, 0);
          const actPages = (
            act.sequences.reduce(
              (acc, s) => acc + s.scenes.reduce((pAcc, sc) => pAcc + sc.pages_eighths, 0),
              0
            ) / 8
          ).toFixed(1);

          return (
            <div key={act.id} className="rounded-xl overflow-hidden border border-white/5 bg-studio-950/40">
              {/* ACT NODE ROW */}
              <div
                className={`group/act flex items-center justify-between px-2 py-1.5 rounded-lg transition-all ${
                  isActActive
                    ? 'bg-sky-500/20 border border-sky-500/40 shadow-sm text-white'
                    : 'hover:bg-studio-850/80 text-slate-200'
                }`}
              >
                <div className="flex items-center gap-1.5 min-w-0 flex-1">
                  <button
                    onClick={() => toggleAct(act.id)}
                    className="p-0.5 rounded text-slate-400 hover:text-white shrink-0"
                  >
                    {isActCollapsed ? (
                      <ChevronRight className="w-3.5 h-3.5" />
                    ) : (
                      <ChevronDown className="w-3.5 h-3.5" />
                    )}
                  </button>

                  <Link
                    href={`/projects/${projectId}/acts/${act.id}`}
                    className="flex-1 min-w-0 flex items-center justify-between gap-1.5 group-hover/act:text-sky-300"
                  >
                    <span className="text-xs font-bold uppercase tracking-tight truncate font-mono">
                      {act.title}
                    </span>
                    {!sidebarCollapsed && (
                      <span className="text-[10px] font-mono text-slate-400 bg-studio-900 px-1.5 py-0.2 rounded shrink-0">
                        {actPages}p
                      </span>
                    )}
                  </Link>
                </div>

                {!sidebarCollapsed && (
                  <button
                    onClick={() => setAddingSequenceActId(act.id)}
                    title="Add Sequence to this Act"
                    className="opacity-0 group-hover/act:opacity-100 p-1 rounded hover:bg-studio-800 text-sky-400 hover:text-sky-300 transition-opacity ml-1 shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              {/* SEQUENCES INSIDE ACT */}
              {!isActCollapsed && (
                <div className="pl-3 pr-1 py-1 space-y-1">
                  {act.sequences.map((seq) => {
                    const isSeqCollapsed = collapsedSequences[seq.id];
                    const isSeqActive = pathname === `/projects/${projectId}/sequences/${seq.id}`;
                    const seqPages = (
                      seq.scenes.reduce((acc, sc) => acc + sc.pages_eighths, 0) / 8
                    ).toFixed(1);

                    return (
                      <div key={seq.id} className="rounded-lg overflow-hidden border border-white/5 bg-studio-900/40">
                        {/* SEQUENCE NODE ROW */}
                        <div
                          className={`group/seq flex items-center justify-between px-2 py-1 rounded-md transition-all ${
                            isSeqActive
                              ? 'bg-amber-500/20 border border-amber-500/40 text-amber-100'
                              : 'hover:bg-studio-850/60 text-slate-300'
                          }`}
                        >
                          <div className="flex items-center gap-1.5 min-w-0 flex-1">
                            <button
                              onClick={() => toggleSeq(seq.id)}
                              className="p-0.5 rounded text-slate-500 hover:text-slate-300 shrink-0"
                            >
                              {isSeqCollapsed ? (
                                <ChevronRight className="w-3 h-3" />
                              ) : (
                                <ChevronDown className="w-3 h-3" />
                              )}
                            </button>

                            <span
                              className="w-2 h-2 rounded-full shrink-0 shadow-sm"
                              style={{ backgroundColor: seq.color_tag }}
                            />

                            <Link
                              href={`/projects/${projectId}/sequences/${seq.id}`}
                              className="flex-1 min-w-0 flex items-center justify-between gap-1 group-hover/seq:text-amber-300"
                            >
                              <span className="text-[11px] font-semibold truncate tracking-tight">
                                {seq.title}
                              </span>
                              {!sidebarCollapsed && (
                                <span className="text-[9px] font-mono text-slate-500 shrink-0">
                                  {seq.scenes.length}sc
                                </span>
                              )}
                            </Link>
                          </div>

                          {!sidebarCollapsed && (
                            <button
                              onClick={() => setAddingSceneSequenceId(seq.id)}
                              title="Add Scene to Sequence"
                              className="opacity-0 group-hover/seq:opacity-100 p-0.5 rounded hover:bg-studio-800 text-amber-400 hover:text-amber-300 transition-opacity ml-1 shrink-0"
                            >
                              <Plus className="w-3 h-3" />
                            </button>
                          )}
                        </div>

                        {/* SCENES LIST */}
                        {!isSeqCollapsed && (
                          <div className="pl-4 pr-1 py-1 space-y-0.5">
                            {seq.scenes
                              .filter((sc) => {
                                const matchesQ =
                                  !q ||
                                  sc.scene_number.toLowerCase().includes(q) ||
                                  sc.set_name.toLowerCase().includes(q) ||
                                  sc.synopsis.toLowerCase().includes(q);
                                const matchesFilter =
                                  !filterIntExt || sc.int_ext === filterIntExt;
                                return matchesQ && matchesFilter;
                              })
                              .map((sc) => {
                                const isSceneActive = pathname === `/projects/${projectId}/scenes/${sc.id}`;
                                const isInt = sc.int_ext === 'INT';

                                return (
                                  <Link
                                    key={sc.id}
                                    href={`/projects/${projectId}/scenes/${sc.id}`}
                                    className={`flex items-center justify-between px-2 py-1 rounded-md text-[11px] transition-all group/sc ${
                                      isSceneActive
                                        ? 'bg-sky-500/25 border border-sky-400 text-white font-bold shadow-sm'
                                        : 'hover:bg-studio-850 text-slate-400 hover:text-slate-100'
                                    }`}
                                  >
                                    <div className="flex items-center gap-1.5 min-w-0">
                                      <span className="font-mono font-bold text-[10px] text-white bg-studio-950 px-1 rounded border border-white/5 shrink-0">
                                        #{sc.scene_number}
                                      </span>
                                      <span
                                        className={`text-[8px] font-bold px-1 py-0.2 rounded uppercase ${
                                          isInt ? 'bg-sky-950 text-sky-300' : 'bg-amber-950 text-amber-300'
                                        }`}
                                      >
                                        {sc.int_ext}
                                      </span>
                                      <span className="truncate tracking-tight">{sc.set_name}</span>
                                    </div>

                                    {!sidebarCollapsed && (
                                      <div className="flex items-center gap-1 font-mono text-[9px] text-slate-500 shrink-0">
                                        <span>{sc.pages_display}p</span>
                                        {sc.shot_count > 0 && (
                                          <span className="text-sky-400">({sc.shot_count})</span>
                                        )}
                                      </div>
                                    )}
                                  </Link>
                                );
                              })}

                            {seq.scenes.length === 0 && (
                              <div className="py-1 text-center text-[10px] text-slate-600 italic">
                                Empty sequence
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Add Sequence Modal */}
      {addingSequenceActId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-studio-900 border border-white/10 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <Compass className="w-4 h-4 text-sky-400" />
              Add Sequence to Act
            </h3>

            <form onSubmit={handleCreateSequence} className="space-y-3">
              <div>
                <label className="text-xs text-slate-300 block mb-1">Sequence Title</label>
                <input
                  type="text"
                  placeholder="e.g. Sequence 3: The Heist Extraction"
                  value={newSeqTitle}
                  onChange={(e) => setNewSeqTitle(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-studio-950 border border-white/10 rounded-lg text-xs text-white"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Color Tag</label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={newSeqColor}
                    onChange={(e) => setNewSeqColor(e.target.value)}
                    className="w-8 h-8 rounded border border-white/10 bg-transparent cursor-pointer"
                  />
                  <span className="font-mono text-xs text-slate-400">{newSeqColor}</span>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">Dramatic Question</label>
                <textarea
                  rows={2}
                  placeholder="What is the central tension of this sequence?"
                  value={newSeqQuestion}
                  onChange={(e) => setNewSeqQuestion(e.target.value)}
                  className="w-full px-3 py-2 bg-studio-950 border border-white/10 rounded-lg text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setAddingSequenceActId(null)}
                  className="px-3 py-1.5 rounded-lg bg-studio-800 text-xs text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingSeq}
                  className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-xs font-bold text-white shadow-sm"
                >
                  {isSubmittingSeq ? 'Creating...' : 'Create Sequence'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Scene Modal */}
      {addingSceneSequenceId && (
        <NewSceneModal
          isOpen={Boolean(addingSceneSequenceId)}
          sequenceId={addingSceneSequenceId}
          onClose={() => setAddingSceneSequenceId(null)}
          onCreated={() => onRefresh?.()}
        />
      )}

      {/* Script Import Modal */}
      {isImportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-2xl bg-studio-900 border border-white/10 rounded-2xl shadow-2xl p-6 space-y-4">
            <h3 className="font-bold text-sm text-white flex items-center gap-2">
              <FileText className="w-4 h-4 text-sky-400" />
              Import Script (.txt / .fountain)
            </h3>
            
            <form onSubmit={handleImportScript} className="space-y-3">
              <div>
                <p className="text-xs text-slate-400 mb-2">Paste your plain text or Fountain formatted screenplay below. The engine will automatically parse sluglines and build the narrative tree.</p>
                <textarea
                  rows={15}
                  placeholder="INT. WAREHOUSE - NIGHT\n\nThe heist begins..."
                  value={scriptText}
                  onChange={(e) => setScriptText(e.target.value)}
                  required
                  className="w-full px-3 py-2 bg-studio-950 border border-white/10 rounded-lg text-xs text-slate-300 font-mono whitespace-pre text-wrap"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsImportModalOpen(false)}
                  className="px-3 py-1.5 rounded-lg bg-studio-800 text-xs text-slate-300 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isImporting}
                  className="px-4 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-xs font-bold text-white shadow-sm flex items-center gap-2"
                >
                  {isImporting && <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />}
                  {isImporting ? 'Parsing Script...' : 'Import Script'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  );
}
