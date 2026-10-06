"use client";

import React, { useState } from 'react';
import { Camera, Check, Plus, Trash2, Edit2, Sparkles, Layers } from 'lucide-react';
import { SceneDetail, Shot, ScriptBlock, api } from '@/lib/api';
import { useProjectStore } from '@/stores/useProjectStore';
import { toast } from '@/stores/useToastStore';

interface LinedScriptEditorProps {
  scene: SceneDetail;
  shots: Shot[];
  onSceneUpdated: () => void;
}

const SHOT_COLORS = [
  '#38bdf8', // sky
  '#f43f5e', // rose
  '#f59e0b', // amber
  '#10b981', // emerald
  '#a855f7', // purple
  '#ec4899', // pink
  '#06b6d4', // cyan
];

export function LinedScriptEditor({ scene, shots, onSceneUpdated }: LinedScriptEditorProps) {
  const { activeShotId, setActiveShotId } = useProjectStore();
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [newBlockType, setNewBlockType] = useState<ScriptBlock['type']>('action');
  const [newBlockText, setNewBlockText] = useState('');
  const [isAddingBlock, setIsAddingBlock] = useState(false);

  const blocks: ScriptBlock[] = scene.script_data?.blocks || [
    {
      id: 'default-slug',
      type: 'slugline',
      content: `${scene.int_ext}. ${scene.set_name} - ${scene.time_of_day}`,
    },
    {
      id: 'default-action',
      type: 'action',
      content: scene.synopsis || 'Scene action and staging description goes here.',
    },
  ];

  // Map each shot to a track index & color
  const shotTrackMap = shots.map((shot, idx) => ({
    shot,
    color: SHOT_COLORS[idx % SHOT_COLORS.length],
    trackIndex: idx,
  }));

  const handleStartEdit = (b: ScriptBlock) => {
    setEditingBlockId(b.id);
    setEditText(b.content);
  };

  const handleSaveEdit = async (blockId: string) => {
    const updatedBlocks = blocks.map((b) =>
      b.id === blockId ? { ...b, content: editText } : b
    );
    try {
      await api.updateScene(scene.id, {
        script_data: { ...scene.script_data, blocks: updatedBlocks },
      });
      toast.success('Script Saved', 'Script block updated.');
      setEditingBlockId(null);
      onSceneUpdated();
    } catch (err: any) {
      toast.error('Failed to update script', err.message);
    }
  };

  const handleAddBlock = async () => {
    if (!newBlockText.trim()) return;
    const newId = `b-${Date.now().toString(36)}`;
    const updatedBlocks = [
      ...blocks,
      { id: newId, type: newBlockType, content: newBlockText.trim() },
    ];
    try {
      await api.updateScene(scene.id, {
        script_data: { ...scene.script_data, blocks: updatedBlocks },
      });
      toast.success('Block Added', `Added ${newBlockType} block.`);
      setNewBlockText('');
      setIsAddingBlock(false);
      onSceneUpdated();
    } catch (err: any) {
      toast.error('Failed to add block', err.message);
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    const updatedBlocks = blocks.filter((b) => b.id !== blockId);
    try {
      await api.updateScene(scene.id, {
        script_data: { ...scene.script_data, blocks: updatedBlocks },
      });
      toast.info('Block Removed', 'Script block deleted.');
      onSceneUpdated();
    } catch (err: any) {
      toast.error('Failed to delete block', err.message);
    }
  };

  return (
    <div className="flex flex-col h-full bg-studio-900/60 rounded-2xl border border-white/5 overflow-hidden">
      {/* Script Header Bar */}
      <div className="p-4 bg-studio-900 border-b border-white/5 flex items-center justify-between gap-4">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-widest text-sky-400 font-bold">
            Screenplay & Lined Script View
          </span>
          <h2 className="text-sm font-bold text-white uppercase font-mono tracking-wider mt-0.5">
            SCENE {scene.scene_number} — {scene.int_ext}. {scene.set_name} — {scene.time_of_day}
          </h2>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsAddingBlock(!isAddingBlock)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-studio-800 hover:bg-studio-700 text-xs font-semibold text-white border border-white/10 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-sky-400" />
            <span>Add Script Block</span>
          </button>
        </div>
      </div>

      {/* Coverage Tracks Legend */}
      {shotTrackMap.length > 0 && (
        <div className="px-5 py-2.5 bg-studio-950/70 border-b border-white/5 flex items-center gap-4 overflow-x-auto text-xs">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 flex items-center gap-1.5">
            <Camera className="w-3.5 h-3.5 text-sky-400" /> Shot Coverage:
          </span>
          <div className="flex items-center gap-3 min-w-max">
            {shotTrackMap.map(({ shot, color }) => {
              const isSelected = activeShotId === shot.id;
              return (
                <button
                  key={shot.id}
                  onClick={() => setActiveShotId(isSelected ? null : shot.id)}
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md transition-all font-mono text-[11px] border ${
                    isSelected
                      ? 'bg-studio-800 text-white shadow-sm ring-1'
                      : 'bg-studio-900/60 text-slate-400 hover:text-white border-white/5'
                  }`}
                  style={{ borderColor: isSelected ? color : undefined }}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: color }}
                  />
                  <span className="font-bold">Shot {shot.setup_code}{shot.shot_code}</span>
                  <span className="text-slate-400">({shot.shot_size})</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Screenplay Content Body with Left Lined Indicator Margin */}
      <div className="flex-1 overflow-y-auto p-6 md:p-8 relative">
        <div className="flex items-start max-w-4xl mx-auto">
          {/* Coverage Lines Column (The "Lined Script" track) */}
          <div
            className="shrink-0 flex items-stretch gap-2 mr-6 select-none pt-4"
            style={{ minWidth: `${Math.max(shotTrackMap.length * 16, 24)}px` }}
          >
            {shotTrackMap.map(({ shot, color }) => {
              const isSelected = activeShotId === shot.id;
              return (
                <div
                  key={shot.id}
                  className="flex flex-col items-center relative group"
                  style={{ width: '14px' }}
                >
                  {/* Shot code pill on top of line */}
                  <div
                    onClick={() => setActiveShotId(isSelected ? null : shot.id)}
                    className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-bold font-mono cursor-pointer shadow-sm mb-1 transition-transform group-hover:scale-125"
                    style={{
                      backgroundColor: color,
                      color: '#000',
                      boxShadow: isSelected ? `0 0 10px ${color}` : undefined,
                    }}
                    title={`Shot ${shot.setup_code}${shot.shot_code} (${shot.shot_size})`}
                  >
                    {shot.shot_code}
                  </div>

                  {/* Vertical coverage bar across blocks */}
                  <div className="flex-1 w-full flex flex-col justify-between py-1">
                    {blocks.map((block) => {
                      const isCovered = shot.covered_script_blocks?.includes(block.id);
                      return (
                        <div
                          key={`${shot.id}-${block.id}`}
                          className="flex-1 w-full flex items-center justify-center my-0.5"
                        >
                          {isCovered && (
                            <div
                              className="w-1.5 h-full rounded-full transition-all group-hover:w-2"
                              style={{
                                backgroundColor: color,
                                opacity: isSelected ? 1 : 0.75,
                              }}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Script Blocks Body */}
          <div className="flex-1 space-y-4 screenplay-container">
            {blocks.map((block) => {
              const isEditing = editingBlockId === block.id;
              const isCoveredByActiveShot = activeShotId
                ? shots.find((s) => s.id === activeShotId)?.covered_script_blocks?.includes(block.id)
                : false;

              return (
                <div
                  key={block.id}
                  className={`group/block relative p-2.5 rounded-lg transition-all ${
                    isCoveredByActiveShot
                      ? 'bg-sky-950/40 ring-1 ring-sky-500/40'
                      : 'hover:bg-studio-850/60'
                  }`}
                >
                  {/* Edit Controls Toolbar */}
                  <div className="absolute right-2 top-2 opacity-0 group-hover/block:opacity-100 flex items-center gap-1 bg-studio-950 px-1.5 py-0.5 rounded border border-white/10 text-slate-400 z-10 transition-opacity">
                    <button
                      onClick={() => handleStartEdit(block)}
                      className="hover:text-sky-400 p-1"
                      title="Edit block"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>
                    <button
                      onClick={() => handleDeleteBlock(block.id)}
                      className="hover:text-rose-400 p-1"
                      title="Delete block"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>

                  {isEditing ? (
                    <div className="space-y-2">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        className="w-full p-2 bg-studio-950 border border-sky-500 rounded font-mono text-sm text-white focus:outline-none"
                        rows={2}
                      />
                      <div className="flex justify-end gap-2">
                        <button
                          onClick={() => setEditingBlockId(null)}
                          className="px-2 py-1 text-xs text-slate-400 hover:text-white"
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleSaveEdit(block.id)}
                          className="px-3 py-1 bg-sky-600 hover:bg-sky-500 rounded text-xs font-bold text-white"
                        >
                          Save
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div>
                      {block.type === 'slugline' && (
                        <div className="screenplay-slugline">{block.content}</div>
                      )}
                      {block.type === 'action' && (
                        <div className="screenplay-action">{block.content}</div>
                      )}
                      {block.type === 'character' && (
                        <div className="screenplay-character">{block.content}</div>
                      )}
                      {block.type === 'parenthetical' && (
                        <div className="screenplay-parenthetical">{block.content}</div>
                      )}
                      {block.type === 'dialogue' && (
                        <div className="screenplay-dialogue">{block.content}</div>
                      )}
                      {block.type === 'transition' && (
                        <div className="text-right uppercase font-bold text-slate-400 my-2">
                          {block.content}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {/* Quick Add Inline Box */}
            {isAddingBlock && (
              <div className="p-4 bg-studio-950 border border-sky-500/40 rounded-xl space-y-3 mt-4 animate-in fade-in">
                <div className="flex items-center gap-3">
                  <label className="text-xs font-semibold text-slate-300">Block Type:</label>
                  <select
                    value={newBlockType}
                    onChange={(e) => setNewBlockType(e.target.value as any)}
                    className="px-2.5 py-1 bg-studio-900 border border-white/10 rounded text-xs text-white"
                  >
                    <option value="action">Action / Staging</option>
                    <option value="character">Character Name</option>
                    <option value="dialogue">Dialogue</option>
                    <option value="parenthetical">Parenthetical Cue</option>
                    <option value="slugline">Slugline Header</option>
                    <option value="transition">Transition</option>
                  </select>
                </div>
                <textarea
                  rows={2}
                  value={newBlockText}
                  onChange={(e) => setNewBlockText(e.target.value)}
                  placeholder={`Type ${newBlockType} text here...`}
                  className="w-full p-2.5 bg-studio-900 border border-white/10 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-sky-500"
                />
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => setIsAddingBlock(false)}
                    className="px-3 py-1.5 text-xs text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleAddBlock}
                    className="px-4 py-1.5 bg-sky-600 hover:bg-sky-500 rounded-lg text-xs font-bold text-white shadow-sm"
                  >
                    Insert Block
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
