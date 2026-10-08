"use client";

import { useQuery, useQueryClient } from '@tanstack/react-query';
import React, { useState } from 'react';
import {
  Box,
  Plus,
  Star,
  Film,
  Trash2,
  X,
  ExternalLink,
  ShieldAlert
, Paperclip } from 'lucide-react';
import Link from 'next/link';
import { api, PropDetail } from '@/lib/api';

interface Props {
  projectId: string;
  onOpenMedia: (media: {appLabel: string, modelName: string, objectId: string}) => void;
}

export default function PropsTab({ projectId, onOpenMedia }: Props) {
  const queryClient = useQueryClient();
  const { data: dataArray = [], isLoading } = useQuery<PropDetail[]>({
    queryKey: ['projectProps', projectId],
    queryFn: () => api.getProjectProps(projectId),
  });
  const props = dataArray;

  const [filterHero, setFilterHero] = useState<'ALL' | 'HERO' | 'GENERAL'>('ALL');
  const [isAddOpen, setIsAddOpen] = useState(false);

  // New prop form
  const [name, setName] = useState('');
  const [isHero, setIsHero] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await api.createProp({
        project_id: projectId,
        name,
        is_hero_prop: isHero,
        quantity: Number(quantity),
      });
      setName('');
      setIsHero(false);
      setQuantity(1);
      setIsAddOpen(false);
      queryClient.invalidateQueries({ queryKey: ['projectProps', projectId] });
    } catch (err) {
      console.error('Failed to create prop', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (propId: string) => {
    if (!confirm('Are you sure you want to delete this prop from the master inventory?')) return;
    try {
      await api.deleteProp(propId);
      queryClient.invalidateQueries({ queryKey: ['projectProps', projectId] });
    } catch (err) {
      console.error('Failed to delete prop', err);
    }
  };

  const filteredProps = props.filter((p) => {
    if (filterHero === 'HERO') return p.is_hero_prop;
    if (filterHero === 'GENERAL') return !p.is_hero_prop;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <span className="text-xs font-mono font-bold text-slate-400 mr-2 uppercase tracking-wider">
            Filter:
          </span>
          <button
            onClick={() => setFilterHero('ALL')}
            className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all ${
              filterHero === 'ALL'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'bg-studio-900 border border-white/5 text-slate-400 hover:text-white'
            }`}
          >
            All Props ({props.length})
          </button>
          <button
            onClick={() => setFilterHero('HERO')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all ${
              filterHero === 'HERO'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'bg-studio-900 border border-white/5 text-slate-400 hover:text-white'
            }`}
          >
            <Star className="w-3.5 h-3.5 fill-current" />
            <span>Hero Props ({props.filter((p) => p.is_hero_prop).length})</span>
          </button>
          <button
            onClick={() => setFilterHero('GENERAL')}
            className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all ${
              filterHero === 'GENERAL'
                ? 'bg-amber-500 text-black shadow-md shadow-amber-500/20'
                : 'bg-studio-900 border border-white/5 text-slate-400 hover:text-white'
            }`}
          >
            Standard ({props.filter((p) => !p.is_hero_prop).length})
          </button>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 transition-all self-start sm:self-auto"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Prop</span>
        </button>
      </div>

      {/* Props Table / Grid */}
      <div className="rounded-2xl bg-studio-900 border border-white/10 shadow-2xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-xs">
            <thead>
              <tr className="bg-studio-950 border-b border-white/10 font-mono uppercase text-slate-400 text-[11px]">
                <th className="px-5 py-4 font-bold">Prop Name</th>
                <th className="px-4 py-4 font-bold text-center">Category</th>
                <th className="px-4 py-4 font-bold text-center">In Stock</th>
                <th className="px-5 py-4 font-bold">Tagged In Scenes</th>
                <th className="px-4 py-4 font-bold text-right">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-white/5">
              {filteredProps.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-slate-500 font-mono">
                    No props found matching the current filter.
                  </td>
                </tr>
              ) : (
                filteredProps.map((prop) => (
                  <tr key={prop.id} className="hover:bg-white/[0.02] transition-colors group">
                    {/* Prop Name */}
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className={`p-2 rounded-xl border shrink-0 ${
                          prop.is_hero_prop
                            ? 'bg-amber-500/20 border-amber-500/30 text-amber-300'
                            : 'bg-studio-950 border-white/10 text-slate-400'
                        }`}>
                          <Box className="w-4 h-4" />
                        </span>
                        <div>
                          <h4 className="font-bold text-sm text-white">{prop.name}</h4>
                        </div>
                      </div>
                    </td>

                    {/* Category / Hero Badge */}
                    <td className="px-4 py-3.5 text-center">
                      {prop.is_hero_prop ? (
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono font-black px-2.5 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10">
                          <Star className="w-3 h-3 fill-amber-400" /> HERO PROP
                        </span>
                      ) : (
                        <span className="inline-block text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400 border border-white/5">
                          Standard
                        </span>
                      )}
                    </td>

                    {/* Quantity */}
                    <td className="px-4 py-3.5 text-center font-mono font-bold text-sm text-white">
                      x{prop.quantity}
                    </td>

                    {/* Linked Scenes */}
                    <td className="px-5 py-3.5">
                      {prop.linked_scenes?.length === 0 ? (
                        <span className="text-slate-600 font-mono text-[11px] italic">Not tagged in scenes</span>
                      ) : (
                        <div className="flex flex-wrap gap-1.5">
                          {prop.linked_scenes?.map((sc) => (
                            <Link
                              key={sc.id}
                              href={`/projects/${projectId}/scenes/${sc.id}`}
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-studio-950 border border-white/10 text-[11px] font-mono text-slate-300 hover:text-amber-300 hover:border-amber-500/30 transition-colors"
                              title={sc.set_name}
                            >
                              <span>#{sc.scene_number}</span>
                              <ExternalLink className="w-2.5 h-2.5 text-amber-400" />
                            </Link>
                          ))}
                        </div>
                      )}
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5 text-right">
                      <button
                        onClick={() => handleDelete(prop.id)}
                        className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                        title="Delete Prop"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Prop Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md bg-studio-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-white/5 bg-studio-950/60">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
                  <Box className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">Add Prop to Inventory</h3>
                  <p className="text-xs text-slate-400">Master inventory registry for prop master</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                  Prop Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Quantum Encryption Drive"
                  className="w-full bg-studio-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 items-center">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                    Quantity in Stock
                  </label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={quantity}
                    onChange={(e) => setQuantity(Number(e.target.value))}
                    className="w-full bg-studio-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
                  />
                </div>

                <div className="pt-5">
                  <label className="flex items-center gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={isHero}
                      onChange={(e) => setIsHero(e.target.checked)}
                      className="w-4 h-4 rounded bg-studio-950 border-white/20 text-amber-500 focus:ring-amber-500/20"
                    />
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1 font-mono">
                      <Star className="w-3.5 h-3.5 fill-amber-400" /> Hero Prop
                    </span>
                  </label>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Adding...' : 'Add Prop'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
