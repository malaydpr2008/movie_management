"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Compass,
  HelpCircle,
  Music,
  ClipboardList,
  Plus,
  ChevronRight,
  ExternalLink,
  Edit2,
  Check,
  X,
  Clapperboard,
  Video,
  FileSpreadsheet,
  Clock,
  Sparkles,
  ArrowRight,
  Save,
  AlertTriangle
} from 'lucide-react';
import Link from 'next/link';
import { api, SequenceDetail } from '@/lib/api';
import { toast } from '@/stores/useToastStore';
import { NewSceneModal } from '@/components/outliner/NewSceneModal';

export default function SequenceWorkspacePage({
  params,
}: {
  params: { projectId: string; sequenceId: string };
}) {
  const { projectId, sequenceId } = params;
  const queryClient = useQueryClient();

  // Core metadata state
  const [isEditingCore, setIsEditingCore] = useState(false);
  const [title, setTitle] = useState('');
  const [colorTag, setColorTag] = useState('#3B82F6');
  const [dramaticQuestion, setDramaticQuestion] = useState('');
  const [tempScore, setTempScore] = useState('');

  // Continuity notes state
  const [continuityNotes, setContinuityNotes] = useState('');
  const [isSavingContinuity, setIsSavingContinuity] = useState(false);

  // New Scene modal state
  const [isAddingScene, setIsAddingScene] = useState(false);

  const {
    data: sequence,
    isLoading,
    refetch,
  } = useQuery<SequenceDetail>({
    queryKey: ['sequenceDetail', sequenceId],
    queryFn: () => api.getSequenceDetail(sequenceId),
    enabled: Boolean(sequenceId),
  });

  useEffect(() => {
    if (sequence) {
      setTitle(sequence.title);
      setColorTag(sequence.color_tag);
      setDramaticQuestion(sequence.dramatic_question);
      setTempScore(sequence.temp_score_reference);
      setContinuityNotes(sequence.continuity_notes || '');
    }
  }, [sequence]);

  const updateSequenceMutation = useMutation({
    mutationFn: (variables: {
      title?: string;
      color_tag?: string;
      dramatic_question?: string;
      temp_score_reference?: string;
      continuity_notes?: string;
    }) => api.updateSequence(sequenceId, variables),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['sequenceDetail', sequenceId] });
      queryClient.invalidateQueries({ queryKey: ['projectTree', projectId] });
      toast.success('Sequence Updated', `"${data.title}" saved.`);
      setIsEditingCore(false);
    },
    onError: (err: any) => {
      toast.error('Failed to update Sequence', err.message);
    },
  });

  const handleSaveCore = (e: React.FormEvent) => {
    e.preventDefault();
    updateSequenceMutation.mutate({
      title: title.trim(),
      color_tag: colorTag,
      dramatic_question: dramaticQuestion.trim(),
      temp_score_reference: tempScore.trim(),
    });
  };

  const handleSaveContinuity = async () => {
    try {
      setIsSavingContinuity(true);
      await api.updateSequence(sequenceId, {
        continuity_notes: continuityNotes.trim(),
      });
      toast.success('Continuity Saved', 'Sequence continuity state updated.');
      refetch();
    } catch (err: any) {
      toast.error('Failed to save continuity', err.message);
    } finally {
      setIsSavingContinuity(false);
    }
  };

  if (isLoading || !sequence) {
    return (
      <div className="h-full flex items-center justify-center p-12 text-slate-400">
        <Compass className="w-8 h-8 animate-bounce text-amber-400" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-7xl mx-auto space-y-8">
      {/* 1. Header & Dramatic Core */}
      <div className="p-6 rounded-3xl bg-studio-900/80 border border-white/5 space-y-6">
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <Link
                href={`/projects/${projectId}/acts/${sequence.act_id}`}
                className="text-xs font-mono font-bold uppercase tracking-widest text-sky-400 hover:underline flex items-center gap-1"
              >
                <span>{sequence.act_title}</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
              <span className="text-xs font-mono text-slate-400">
                SEQUENCE WORKSPACE
              </span>
            </div>

            {isEditingCore ? (
              <form onSubmit={handleSaveCore} className="mt-3 space-y-3">
                <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                  <div className="md:col-span-3">
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Sequence Title</label>
                    <input
                      type="text"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                      className="w-full px-3 py-1.5 bg-studio-950 border border-white/10 rounded-lg text-sm text-white"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-semibold text-slate-400 block mb-1">Color Script Tag</label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={colorTag}
                        onChange={(e) => setColorTag(e.target.value)}
                        className="w-8 h-8 rounded border border-white/10 bg-transparent cursor-pointer"
                      />
                      <span className="font-mono text-xs text-slate-400">{colorTag}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Dramatic Question</label>
                  <textarea
                    rows={2}
                    value={dramaticQuestion}
                    onChange={(e) => setDramaticQuestion(e.target.value)}
                    placeholder="What is the central tension of this sequence?"
                    className="w-full px-3 py-1.5 bg-studio-950 border border-white/10 rounded-lg text-xs text-white"
                  />
                </div>

                <div>
                  <label className="text-[11px] font-semibold text-slate-400 block mb-1">Temp Score Reference</label>
                  <input
                    type="text"
                    value={tempScore}
                    onChange={(e) => setTempScore(e.target.value)}
                    placeholder="e.g. Hans Zimmer - Time"
                    className="w-full px-3 py-1.5 bg-studio-950 border border-white/10 rounded-lg text-xs text-white font-mono"
                  />
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="submit"
                    disabled={updateSequenceMutation.isPending}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white shadow-sm"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Save Core</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setIsEditingCore(false)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-studio-800 text-xs font-semibold text-slate-300 hover:text-white"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Cancel</span>
                  </button>
                </div>
              </form>
            ) : (
              <div className="mt-2 space-y-3">
                <div className="flex items-center gap-3">
                  <span
                    className="w-4 h-4 rounded-full shrink-0 shadow-md"
                    style={{ backgroundColor: sequence.color_tag }}
                  />
                  <h2 className="text-2xl font-black text-white tracking-tight">
                    {sequence.title}
                  </h2>
                  <button
                    onClick={() => setIsEditingCore(true)}
                    className="p-1 rounded-lg text-slate-500 hover:text-sky-400 hover:bg-studio-800 transition-colors"
                    title="Edit Sequence Core"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                </div>

                {/* Dramatic Question Block */}
                {sequence.dramatic_question && (
                  <div className="p-3.5 rounded-2xl bg-studio-950/80 border border-sky-500/20 text-xs text-sky-200 flex items-start gap-2.5 max-w-3xl leading-relaxed shadow-sm">
                    <HelpCircle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-sky-400 block text-[10px] uppercase tracking-wider mb-0.5">
                        Central Dramatic Question
                      </span>
                      &ldquo;{sequence.dramatic_question}&rdquo;
                    </div>
                  </div>
                )}

                {/* Temp Score Audio Motif */}
                {sequence.temp_score_reference && (
                  <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
                    <Music className="w-4 h-4 text-amber-400 shrink-0" />
                    <span className="text-slate-300 font-semibold">Audio Motif / Temp Score:</span>
                    <span className="text-amber-300 bg-studio-950 px-2 py-0.5 rounded border border-white/5">
                      {sequence.temp_score_reference}
                    </span>
                    <a
                      href={`https://www.youtube.com/results?search_query=${encodeURIComponent(sequence.temp_score_reference)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-slate-500 hover:text-white ml-1 flex items-center gap-0.5 text-[10px]"
                    >
                      <ExternalLink className="w-3 h-3" />
                      <span>Search</span>
                    </a>
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="font-mono text-xs px-3 py-1.5 rounded-xl bg-studio-950 border border-white/5 text-slate-300">
              {sequence.scenes.length} Scenes • {sequence.pages_sum} pgs • {sequence.total_planned_shots} shots
            </span>
            <button
              onClick={() => setIsAddingScene(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white shadow-lg shadow-sky-600/20 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Add Scene</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. Sequence Continuity & State Tracker Ledger */}
      <div className="p-6 rounded-3xl bg-studio-900/80 border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-emerald-400" />
              Continuity State Ledger & Physical Turns
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Record global state changes introduced in this sequence that must persist across scenes (wardrobe damage, props acquired, character injuries).
            </p>
          </div>

          <button
            onClick={handleSaveContinuity}
            disabled={isSavingContinuity}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-bold text-white shadow-sm transition-colors"
          >
            <Save className="w-3.5 h-3.5" />
            <span>{isSavingContinuity ? 'Saving...' : 'Save Continuity Notes'}</span>
          </button>
        </div>

        <textarea
          rows={3}
          value={continuityNotes}
          onChange={(e) => setContinuityNotes(e.target.value)}
          placeholder="e.g. Karen sustains fractal burns on right forearm in Scene 4; subsequent scenes require prosthetic blood and torn sleeve. Vance acquires encrypted briefcase."
          className="w-full p-3 bg-studio-950 border border-white/10 rounded-xl text-xs text-white focus:outline-none focus:border-emerald-500 transition-colors leading-relaxed"
        />
      </div>

      {/* 3. Scene Flow Table */}
      <div className="p-6 rounded-3xl bg-studio-900/80 border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm text-white uppercase tracking-wider flex items-center gap-2">
            <Clapperboard className="w-4 h-4 text-sky-400" />
            Scene Sequence Flow Timeline
          </h3>
          <span className="font-mono text-xs text-slate-400">
            {sequence.scenes.length} Scenes in order
          </span>
        </div>

        <div className="rounded-2xl border border-white/5 overflow-hidden bg-studio-950">
          <table className="w-full text-left text-xs">
            <thead className="bg-studio-900/90 border-b border-white/5 text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Scene #</th>
                <th className="py-3 px-4">Int / Ext</th>
                <th className="py-3 px-4">Set Name / Slugline</th>
                <th className="py-3 px-4">Time of Day</th>
                <th className="py-3 px-4">Page Length</th>
                <th className="py-3 px-4">Coverage</th>
                <th className="py-3 px-4 text-right">Studio Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {sequence.scenes.map((scene) => {
                const isInt = scene.int_ext === 'INT';
                const isNight = scene.time_of_day.toLowerCase().includes('night');

                return (
                  <tr
                    key={scene.id}
                    className="hover:bg-studio-900/60 transition-colors group"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-white">
                      #{scene.scene_number}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                          isInt ? 'bg-sky-500/20 text-sky-300' : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {scene.int_ext}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-semibold text-slate-100 group-hover:text-sky-300 transition-colors">
                        {scene.set_name}
                      </div>
                      {scene.synopsis && (
                        <p className="text-[11px] text-slate-400 line-clamp-1 mt-0.5">
                          {scene.synopsis}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`text-[10px] font-mono px-2 py-0.5 rounded uppercase ${
                          isNight ? 'bg-indigo-950 text-indigo-300' : 'bg-yellow-950/60 text-yellow-300'
                        }`}
                      >
                        {scene.time_of_day}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {scene.pages_display} pgs
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Video className="w-3.5 h-3.5 text-sky-400" />
                        <span>{scene.shot_count} shots</span>
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/projects/${projectId}/scenes/${scene.id}`}
                        className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-studio-800 hover:bg-sky-600 text-slate-300 hover:text-white text-xs font-semibold transition-colors"
                      >
                        <span>Studio</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </td>
                  </tr>
                );
              })}

              {sequence.scenes.length === 0 && (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-xs text-slate-500 italic">
                    No scenes in this sequence yet. Click &ldquo;+ Add Scene&rdquo; above.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* New Scene Modal */}
      {isAddingScene && (
        <NewSceneModal
          isOpen={isAddingScene}
          sequenceId={sequenceId}
          onClose={() => setIsAddingScene(false)}
          onCreated={() => {
            refetch();
            queryClient.invalidateQueries({ queryKey: ['projectTree', projectId] });
          }}
        />
      )}
    </div>
  );
}
