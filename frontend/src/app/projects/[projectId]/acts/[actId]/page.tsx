"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Target,
  Clock,
  Camera,
  FileSpreadsheet,
  Plus,
  ChevronRight,
  Edit2,
  Check,
  X,
  Compass,
  Sparkles,
  HelpCircle,
  Clapperboard,
  Layers,
  ArrowRight
} from 'lucide-react';
import Link from 'next/link';
import { api, ActDetail } from '@/lib/api';
import { toast } from '@/stores/useToastStore';

export default function ActWorkspacePage({
  params,
}: {
  params: { projectId: string; actId: string };
}) {
  const { projectId, actId } = params;
  const queryClient = useQueryClient();

  // Act inline edit state
  const [isEditing, setIsEditing] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editMilestone, setEditMilestone] = useState('');
  const [editTargetPages, setEditTargetPages] = useState(30);

  // Add Sequence modal state
  const [isAddingSeq, setIsAddingSeq] = useState(false);
  const [newSeqTitle, setNewSeqTitle] = useState('');
  const [newSeqColor, setNewSeqColor] = useState('#3B82F6');
  const [newSeqQuestion, setNewSeqQuestion] = useState('');
  const [newSeqScore, setNewSeqScore] = useState('');
  const [isSubmittingSeq, setIsSubmittingSeq] = useState(false);

  const {
    data: act,
    isLoading,
    isError,
    refetch,
  } = useQuery<ActDetail>({
    queryKey: ['actDetail', actId],
    queryFn: () => api.getActDetail(actId),
    enabled: Boolean(actId),
  });

  useEffect(() => {
    if (act) {
      setEditTitle(act.title);
      setEditMilestone(act.dramatic_milestone);
      setEditTargetPages(act.target_page_length);
    }
  }, [act]);

  const updateActMutation = useMutation({
    mutationFn: (variables: { title?: string; dramatic_milestone?: string; target_page_length?: number }) =>
      api.updateAct(actId, variables),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['actDetail', actId] });
      queryClient.invalidateQueries({ queryKey: ['projectTree', projectId] });
      toast.success('Act Updated', `"${data.title}" saved.`);
      setIsEditing(false);
    },
    onError: (err: any) => {
      toast.error('Failed to update Act', err.message);
    },
  });

  const handleSaveAct = (e: React.FormEvent) => {
    e.preventDefault();
    updateActMutation.mutate({
      title: editTitle.trim(),
      dramatic_milestone: editMilestone.trim(),
      target_page_length: Number(editTargetPages),
    });
  };

  const handleAddSequence = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSeqTitle.trim()) return;

    try {
      setIsSubmittingSeq(true);
      await api.createSequence({
        act_id: actId,
        title: newSeqTitle.trim(),
        color_tag: newSeqColor,
        dramatic_question: newSeqQuestion.trim(),
        temp_score_reference: newSeqScore.trim(),
      });
      toast.success('Sequence Created', `Sequence "${newSeqTitle}" added.`);
      setIsAddingSeq(false);
      setNewSeqTitle('');
      setNewSeqQuestion('');
      setNewSeqScore('');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['projectTree', projectId] });
    } catch (err: any) {
      toast.error('Failed to create sequence', err.message);
    } finally {
      setIsSubmittingSeq(false);
    }
  };

  if (isLoading || !act) {
    return (
      <div className="h-full flex items-center justify-center p-12 text-slate-400">
        <Target className="w-8 h-8 animate-bounce text-sky-400" />
      </div>
    );
  }

  const progressPct = Math.min(
    100,
    (act.actual_pages_sum / act.target_page_length) * 100
  );

  const totalScenes = act.total_scenes_count;
  const totalHours = (act.total_shoot_minutes / 60).toFixed(1);

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* 1. Act Header & Macro Milestones */}
      <div className="p-6 rounded-3xl bg-studio-900/80 border border-white/5 space-y-5">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono font-bold uppercase tracking-widest text-sky-400">
                ACT WORKSPACE & PACING
              </span>
              <span className="text-slate-600">•</span>
              <span className="text-xs font-mono text-slate-400">
                {act.sequences.length} Sequences • {totalScenes} Scenes
              </span>
            </div>

            {isEditing ? (
              <form onSubmit={handleSaveAct} className="mt-3 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                  <div className="md:col-span-2">
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Act Title</label>
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      required
                      className="w-full px-3 py-1.5 bg-studio-950 border border-white/10 rounded-lg text-sm text-white font-mono uppercase"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Target Pages</label>
                    <input
                      type="number"
                      step="0.5"
                      value={editTargetPages}
                      onChange={(e) => setEditTargetPages(Number(e.target.value))}
                      required
                      className="w-full px-3 py-1.5 bg-studio-950 border border-white/10 rounded-lg text-sm text-white font-mono"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Dramatic Milestone</label>
                  <input
                    type="text"
                    value={editMilestone}
                    onChange={(e) => setEditMilestone(e.target.value)}
                    placeholder="e.g. Inciting Incident or Climax..."
                    className="w-full px-3 py-1.5 bg-studio-950 border border-white/10 rounded-lg text-xs text-white"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={updateActMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Act</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditing(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-studio-800 text-xs font-semibold text-slate-300 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Cancel</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-2 space-y-1.5">
                <div className="flex items-center gap-3">
                  <h2 className="text-2xl font-black text-white uppercase font-mono tracking-tight">
                    {act.title}
                  </h2>
                  <button
                    onClick={() => setIsEditing(true)}
                    className="p-1 rounded-lg text-slate-500 hover:text-sky-400 hover:bg-studio-800 transition-colors"
                    title="Edit Act metadata"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {act.dramatic_milestone && (
                  <p className="text-xs text-sky-400 font-medium flex items-center gap-2">
                    <Target className="w-4 h-4 text-sky-400 shrink-0" />
                    <span>{act.dramatic_milestone}</span>
                  </p>
                )}
              </div>
            )}
          </div>

          <button
            onClick={() => setIsAddingSeq(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white shadow-lg shadow-sky-600/20 transition-all shrink-0"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>+ Add Sequence</span>
          </button>
        </div>

        {/* Pacing Progress Bar */}
        <div className="space-y-1.5 pt-2">
          <div className="flex justify-between items-center text-xs font-mono">
            <span className="text-slate-300 font-semibold">
              Actual Page Length: <span className="text-white font-bold">{act.actual_pages_sum} pgs</span> ({act.actual_pages_eighths} 1/8ths)
            </span>
            <span className="text-slate-400">
              Target Allocation: <span className="text-amber-400 font-bold">{act.target_page_length} pgs</span> ({progressPct.toFixed(0)}%)
            </span>
          </div>
          <div className="w-full h-3 bg-studio-950 rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-sky-500 via-indigo-500 to-amber-500 rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* 2. Pacing & Production Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* INT vs EXT */}
        <div className="p-4 rounded-2xl bg-studio-900/60 border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-400">INT / EXT Ratio</span>
            <span className="font-mono text-white">{act.int_count} INT • {act.ext_count} EXT</span>
          </div>
          <div className="w-full h-2 bg-studio-950 rounded-full overflow-hidden flex">
            <div
              className="bg-sky-500 h-full"
              style={{ width: `${totalScenes > 0 ? (act.int_count / totalScenes) * 100 : 50}%` }}
            />
            <div
              className="bg-amber-500 h-full"
              style={{ width: `${totalScenes > 0 ? (act.ext_count / totalScenes) * 100 : 50}%` }}
            />
          </div>
          <span className="text-[11px] text-slate-500 font-mono block">
            {totalScenes > 0 ? ((act.int_count / totalScenes) * 100).toFixed(0) : 0}% interior staging
          </span>
        </div>

        {/* DAY vs NIGHT */}
        <div className="p-4 rounded-2xl bg-studio-900/60 border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold">
            <span className="text-slate-400">Day / Night Balance</span>
            <span className="font-mono text-white">{act.day_count} DAY • {act.night_count} NIGHT</span>
          </div>
          <div className="w-full h-2 bg-studio-950 rounded-full overflow-hidden flex">
            <div
              className="bg-yellow-500 h-full"
              style={{ width: `${totalScenes > 0 ? (act.day_count / totalScenes) * 100 : 50}%` }}
            />
            <div
              className="bg-indigo-600 h-full"
              style={{ width: `${totalScenes > 0 ? (act.night_count / totalScenes) * 100 : 50}%` }}
            />
          </div>
          <span className="text-[11px] text-slate-500 font-mono block">
            {totalScenes > 0 ? ((act.night_count / totalScenes) * 100).toFixed(0) : 0}% night shoots
          </span>
        </div>

        {/* Shoot Hours */}
        <div className="p-4 rounded-2xl bg-studio-900/60 border border-white/5 space-y-1">
          <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
            <Clock className="w-4 h-4 text-purple-400" /> Shoot Duration
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">{totalHours}h</span>
            <span className="text-xs text-slate-500 font-mono">({act.total_shoot_minutes}m)</span>
          </div>
          <span className="text-[11px] text-slate-500 block">
            ~{(act.total_shoot_minutes / 60 / 12).toFixed(1)} twelve-hour production days
          </span>
        </div>

        {/* Shots planned */}
        <div className="p-4 rounded-2xl bg-studio-900/60 border border-white/5 space-y-1">
          <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
            <Camera className="w-4 h-4 text-emerald-400" /> Camera Setups
          </span>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white font-mono">{act.total_planned_shots}</span>
            <span className="text-xs text-slate-500 font-mono">planned setups</span>
          </div>
          <span className="text-[11px] text-slate-500 block">
            Coverage across {totalScenes} scenes
          </span>
        </div>
      </div>

      {/* 3. Sequence Pipeline */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
            <Compass className="w-4 h-4 text-amber-400" />
            Sequence Pipeline in this Act
          </h3>
          <span className="font-mono text-xs text-slate-400">
            {act.sequences.length} Sequences Active
          </span>
        </div>

        <div className="space-y-4">
          {act.sequences.map((seq) => (
            <div
              key={seq.id}
              className="p-5 rounded-2xl bg-studio-900/60 border border-white/5 hover:border-white/10 transition-all space-y-4 group"
            >
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <span
                    className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                    style={{ backgroundColor: seq.color_tag }}
                  />
                  <div>
                    <h4 className="font-bold text-base text-white group-hover:text-sky-300 transition-colors">
                      {seq.title}
                    </h4>
                    {seq.dramatic_question && (
                      <p className="text-xs text-slate-400 italic mt-0.5 flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                        <span>&ldquo;{seq.dramatic_question}&rdquo;</span>
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex items-center gap-4 shrink-0">
                  <div className="flex items-center gap-3 font-mono text-xs text-slate-400">
                    <span className="bg-studio-800 px-2.5 py-1 rounded">
                      {seq.scenes_count} scenes
                    </span>
                    <span className="bg-studio-800 px-2.5 py-1 rounded text-sky-300">
                      {seq.pages_sum} pgs
                    </span>
                    <span className="bg-studio-800 px-2.5 py-1 rounded text-emerald-300">
                      {seq.shot_count} shots
                    </span>
                  </div>

                  <Link
                    href={`/projects/${projectId}/sequences/${seq.id}`}
                    className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-studio-800 hover:bg-studio-700 text-xs font-bold text-white border border-white/5 transition-colors group-hover:border-sky-500/30"
                  >
                    <span>Open Sequence Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5 text-sky-400" />
                  </Link>
                </div>
              </div>

              {/* Compact scene pills inside this sequence */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2 pt-2 border-t border-white/5">
                {seq.scenes.map((sc) => (
                  <Link
                    key={sc.id}
                    href={`/projects/${projectId}/scenes/${sc.id}`}
                    className="p-2 rounded-xl bg-studio-950/70 border border-white/5 hover:border-sky-500/40 hover:bg-studio-850 flex items-center justify-between gap-2 text-xs transition-colors"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="font-mono font-bold text-[10px] text-white bg-studio-900 px-1.5 py-0.5 rounded border border-white/10 shrink-0">
                        #{sc.scene_number}
                      </span>
                      <span className="text-[9px] font-bold px-1 rounded uppercase bg-studio-800 text-slate-300 shrink-0">
                        {sc.int_ext}
                      </span>
                      <span className="text-slate-200 truncate">{sc.set_name}</span>
                    </div>
                    <span className="font-mono text-[10px] text-slate-500 shrink-0">
                      {sc.pages_display}p
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          ))}

          {act.sequences.length === 0 && (
            <div className="p-8 border-2 border-dashed border-white/10 rounded-2xl text-center space-y-3">
              <Compass className="w-8 h-8 text-slate-600 mx-auto" />
              <h4 className="font-bold text-sm text-slate-300">No Sequences in this Act</h4>
              <p className="text-xs text-slate-500 max-w-xs mx-auto">
                Add sequences to break this act into dramatic beats and emotional turns.
              </p>
              <button
                onClick={() => setIsAddingSeq(true)}
                className="px-4 py-2 bg-sky-600 hover:bg-sky-500 rounded-lg text-xs font-bold text-white shadow-sm"
              >
                Create First Sequence
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Add Sequence Modal */}
      {isAddingSeq && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-md bg-studio-900 border border-white/10 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h3 className="font-bold text-sm text-white flex items-center gap-2">
                <Compass className="w-4 h-4 text-sky-400" />
                Add Sequence to {act.title}
              </h3>
              <button
                onClick={() => setIsAddingSeq(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                Close
              </button>
            </div>

            <form onSubmit={handleAddSequence} className="space-y-3">
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
                <label className="text-xs text-slate-300 block mb-1">Color Script Tag</label>
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

              <div>
                <label className="text-xs text-slate-300 block mb-1">Temp Score Reference</label>
                <input
                  type="text"
                  placeholder="e.g. Hans Zimmer - Time"
                  value={newSeqScore}
                  onChange={(e) => setNewSeqScore(e.target.value)}
                  className="w-full px-3 py-2 bg-studio-950 border border-white/10 rounded-lg text-xs text-white"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsAddingSeq(false)}
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
    </div>
  );
}
