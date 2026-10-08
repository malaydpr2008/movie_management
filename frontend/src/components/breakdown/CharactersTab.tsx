"use client";

import { useQuery } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  Users,
  Plus,
  Shirt,
  Calendar,
  Film,
  Trash2,
  X,
  Camera
, Paperclip } from 'lucide-react';
import { api, CharacterDetail } from '@/lib/api';

interface Props {
  projectId: string;
  onOpenMedia: (media: {appLabel: string, modelName: string, objectId: string}) => void;
}

export default function CharactersTab({ projectId, onOpenMedia }: Props) {
  const { data: dataArray = [], isLoading } = useQuery<CharacterDetail[]>({
    queryKey: ['projectCharacters', projectId],
    queryFn: () => api.getProjectCharacters(projectId),
  });
  const characters = dataArray;

  const [selectedCharId, setSelectedCharId] = useState<string>(
    characters[0]?.id || ''
  );
  const [isAddCharOpen, setIsAddCharOpen] = useState(false);
  const [isAddLookOpen, setIsAddLookOpen] = useState(false);

  // New character form
  const [charName, setCharName] = useState('');
  const [castIdNumber, setCastIdNumber] = useState<number>(
    characters.length > 0 ? Math.max(...characters.map((c) => c.cast_id_number)) + 1 : 1
  );
  const [actorName, setActorName] = useState('');

  // New look form
  const [lookNumber, setLookNumber] = useState('Look 1');
  const [lookDesc, setLookDesc] = useState('');
  const [photoUrl, setPhotoUrl] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const selectedChar = characters.find((c) => c.id === selectedCharId) || characters[0];

  const handleCreateCharacter = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!charName.trim()) return;
    setIsSubmitting(true);
    try {
      const created = await api.createCharacter({
        project_id: projectId,
        name: charName,
        cast_id_number: Number(castIdNumber),
        actor_name: actorName,
      });
      setCharName('');
      setActorName('');
      setIsAddCharOpen(false);
      setSelectedCharId(created.id);
      queryClient.invalidateQueries({ queryKey: ['projectCharacters', projectId] });
    } catch (err) {
      console.error('Failed to create character', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreateLook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedChar || !lookNumber.trim()) return;
    setIsSubmitting(true);
    try {
      await api.addCostumeLook(selectedChar.id, {
        look_number: lookNumber,
        description: lookDesc,
        continuity_photo_url: photoUrl,
      });
      setLookNumber(`Look ${(selectedChar.looks?.length || 0) + 2}`);
      setLookDesc('');
      setPhotoUrl('');
      setIsAddLookOpen(false);
      queryClient.invalidateQueries({ queryKey: ['projectCharacters', projectId] });
    } catch (err) {
      console.error('Failed to add costume look', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCharacter = async (charId: string) => {
    if (!confirm('Are you sure you want to delete this character?')) return;
    try {
      await api.deleteCharacter(charId);
      queryClient.invalidateQueries({ queryKey: ['projectCharacters', projectId] });
    } catch (err) {
      console.error('Failed to delete character', err);
    }
  };

  const handleDeleteLook = async (lookId: string) => {
    if (!confirm('Are you sure you want to delete this costume look?')) return;
    try {
      await api.deleteCostumeLook(lookId);
      queryClient.invalidateQueries({ queryKey: ['projectCharacters', projectId] });
    } catch (err) {
      console.error('Failed to delete look', err);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left Column: Character Master List */}
        <div className="lg:col-span-4 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400">
              Cast Registry ({characters.length})
            </h4>
            <button
              onClick={() => setIsAddCharOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-md shadow-purple-600/20 transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Character</span>
            </button>
          </div>

          <div className="space-y-2">
            {characters.map((char) => {
              const isSelected = selectedChar?.id === char.id;
              return (
                <div
                  key={char.id}
                  onClick={() => setSelectedCharId(char.id)}
                  className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                    isSelected
                      ? 'bg-purple-950/40 border-purple-500/50 shadow-lg shadow-purple-950/30'
                      : 'bg-studio-900 border-white/5 hover:border-white/20'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 font-mono font-black text-xs flex items-center justify-center shrink-0">
                      #{char.cast_id_number}
                    </span>
                    <div className="min-w-0">
                      <h4 className="font-bold text-sm text-white truncate">{char.name}</h4>
                      <p className="text-xs text-slate-400 truncate">
                        {char.actor_name || 'Cast Pending'}
                      </p>
                    </div>
                  </div>

                  <span className="font-mono text-[11px] text-slate-400 shrink-0">
                    {char.looks?.length || 0} looks
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Right Column: Character Profile & Looks Gallery */}
        <div className="lg:col-span-8 space-y-6">
          {selectedChar ? (
            <div className="p-6 rounded-2xl bg-studio-900 border border-white/10 shadow-2xl space-y-6">
              {/* Profile Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/5">
                <div className="flex items-center gap-4">
                  <span className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-600 to-indigo-500 text-white font-mono font-black text-lg flex items-center justify-center shadow-lg shadow-purple-500/20 shrink-0">
                    #{selectedChar.cast_id_number}
                  </span>
                  <div>
                    <h3 className="text-xl font-black text-white">{selectedChar.name}</h3>
                    <p className="text-xs text-purple-300 font-medium">
                      Portrayed by: <span className="font-bold text-white">{selectedChar.actor_name || 'Unassigned'}</span>
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-4 font-mono text-xs">
                  <div className="px-3 py-1.5 rounded-xl bg-studio-950 border border-white/10 flex items-center gap-2 text-slate-300">
                    <Film className="w-3.5 h-3.5 text-sky-400" />
                    <span>{selectedChar.linked_scenes_count} Scenes Tagged</span>
                  </div>
                  <div className="px-3 py-1.5 rounded-xl bg-studio-950 border border-white/10 flex items-center gap-2 text-slate-300">
                    <Calendar className="w-3.5 h-3.5 text-amber-400" />
                    <span>{selectedChar.dood_work_days} DooD Days</span>
                  </div>
                  <button
                    onClick={() => handleDeleteCharacter(selectedChar.id)}
                    className="p-2 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                    title="Delete Character"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Wardrobe & Looks Section */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Shirt className="w-4 h-4 text-purple-400" />
                    <h4 className="text-sm font-bold text-white uppercase tracking-wider font-mono">
                      Wardrobe Looks & Continuity Gallery ({selectedChar.looks?.length || 0})
                    </h4>
                  </div>
                  <button
                    onClick={() => setIsAddLookOpen(true)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold bg-purple-600/20 text-purple-300 border border-purple-500/30 hover:bg-purple-600/30 transition-all"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>+ Add Look</span>
                  </button>
                </div>

                {(!selectedChar.looks || selectedChar.looks.length === 0) ? (
                  <div className="p-8 text-center text-xs font-mono text-slate-500 border border-dashed border-white/5 rounded-2xl">
                    No costume looks cataloged for {selectedChar.name}. Click &quot;+ Add Look&quot; to establish wardrobe continuity.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {selectedChar.looks.map((look) => (
                      <div
                        key={look.id}
                        className="p-4 rounded-xl bg-studio-950 border border-white/5 space-y-3 group hover:border-purple-500/30 transition-all flex flex-col justify-between"
                      >
                        <div className="space-y-3">
                          <div className="flex items-start justify-between gap-3">
                            <h5 className="font-bold text-sm text-white flex items-center gap-2">
                              <span>{look.look_number}</span>
                            </h5>
                            <button
                              onClick={() => handleDeleteLook(look.id)}
                              className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity"
                              title="Delete Look"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {look.continuity_photo_url && (
                            <div className="relative aspect-video rounded-lg overflow-hidden border border-white/10 bg-black">
                              <img
                                src={look.continuity_photo_url}
                                alt={look.look_number}
                                className="w-full h-full object-cover"
                              />
                            </div>
                          )}

                          {look.description && (
                            <p className="text-xs text-slate-300 leading-relaxed font-sans">
                              {look.description}
                            </p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 font-mono text-xs">
              Select or create a character to manage bible and looks.
            </div>
          )}
        </div>
      </div>

      {/* Add Character Modal */}
      {isAddCharOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-studio-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-white/5 bg-studio-950/60">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm">
                  <Users className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">Add Character</h3>
                  <p className="text-xs text-slate-400">Register new role in project cast registry</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddCharOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateCharacter} className="p-6 space-y-4">
              <div className="grid grid-cols-3 gap-3">
                <div className="col-span-1">
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                    Cast ID #
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={castIdNumber}
                    onChange={(e) => setCastIdNumber(Number(e.target.value))}
                    className="w-full bg-studio-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                    Character Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={charName}
                    onChange={(e) => setCharName(e.target.value)}
                    placeholder="e.g. Elena Rostova"
                    className="w-full bg-studio-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                  Actor / Talent Name
                </label>
                <input
                  type="text"
                  value={actorName}
                  onChange={(e) => setActorName(e.target.value)}
                  placeholder="e.g. Karen Ward"
                  className="w-full bg-studio-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsAddCharOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Adding...' : 'Add Character'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Costume Look Modal */}
      {isAddLookOpen && selectedChar && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-studio-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-white/5 bg-studio-950/60">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center font-bold text-sm">
                  <Shirt className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">Add Costume Look</h3>
                  <p className="text-xs text-slate-400">Wardrobe change for {selectedChar.name}</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddLookOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateLook} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                  Look Identifier *
                </label>
                <input
                  type="text"
                  required
                  value={lookNumber}
                  onChange={(e) => setLookNumber(e.target.value)}
                  placeholder="e.g. Look 2 - Lab Infiltration"
                  className="w-full bg-studio-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                  Costume & Continuity Description
                </label>
                <textarea
                  rows={3}
                  value={lookDesc}
                  onChange={(e) => setLookDesc(e.target.value)}
                  placeholder="e.g. Reinforced Kevlar trench coat, silenced sidearm holster, fingerless gloves"
                  className="w-full bg-studio-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500"
                />
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5 flex items-center gap-1.5">
                  <Camera className="w-3.5 h-3.5 text-sky-400" /> Continuity Photo URL
                </label>
                <input
                  type="url"
                  value={photoUrl}
                  onChange={(e) => setPhotoUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full bg-studio-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-purple-500 font-mono"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsAddLookOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-purple-600 hover:bg-purple-500 text-white shadow-lg shadow-purple-600/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Add Look'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
