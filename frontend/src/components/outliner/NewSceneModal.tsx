"use client";

import React, { useState } from 'react';
import { X, Clapperboard, Sparkles } from 'lucide-react';
import { api } from '@/lib/api';
import { toast } from '@/stores/useToastStore';

interface NewSceneModalProps {
  isOpen: boolean;
  onClose: () => void;
  sequenceId: string;
  onCreated: () => void;
}

export function NewSceneModal({ isOpen, onClose, sequenceId, onCreated }: NewSceneModalProps) {
  const [sceneNumber, setSceneNumber] = useState('');
  const [setName, setSetName] = useState('');
  const [intExt, setIntExt] = useState('INT');
  const [timeOfDay, setTimeOfDay] = useState('DAY');
  const [pagesEighths, setPagesEighths] = useState(8);
  const [synopsis, setSynopsis] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sceneNumber || !setName) {
      toast.error('Missing fields', 'Please enter a scene number and set name.');
      return;
    }

    try {
      setIsSubmitting(true);
      await api.createScene({
        sequence_id: sequenceId,
        scene_number: sceneNumber,
        set_name: setName,
        int_ext: intExt,
        time_of_day: timeOfDay,
        pages_eighths: Number(pagesEighths),
        synopsis,
      });
      toast.success('Scene Created', `Scene #${sceneNumber} added successfully.`);
      onCreated();
      onClose();
      // Reset form
      setSceneNumber('');
      setSetName('');
      setSynopsis('');
    } catch (err: any) {
      toast.error('Failed to create scene', err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-studio-900 border border-white/10 rounded-2xl shadow-2xl p-6 space-y-5">
        <div className="flex items-center justify-between border-b border-white/5 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-sky-500/20 text-sky-400">
              <Clapperboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-base text-white">Create New Scene</h3>
              <p className="text-xs text-slate-400">Add a new scene block to this sequence</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-studio-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Scene Number</label>
              <input
                type="text"
                placeholder="e.g. 19 or 2A"
                value={sceneNumber}
                onChange={(e) => setSceneNumber(e.target.value)}
                required
                className="w-full px-3 py-2 bg-studio-950 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Int / Ext</label>
              <select
                value={intExt}
                onChange={(e) => setIntExt(e.target.value)}
                className="w-full px-3 py-2 bg-studio-950 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
              >
                <option value="INT">INT. (Interior)</option>
                <option value="EXT">EXT. (Exterior)</option>
                <option value="INT/EXT">INT/EXT. (Combined)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Set Name / Slugline</label>
            <input
              type="text"
              placeholder="e.g. COMMAND DECK - PRIMARY BRIDGE"
              value={setName}
              onChange={(e) => setSetName(e.target.value)}
              required
              className="w-full px-3 py-2 bg-studio-950 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500 uppercase font-mono"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">Time of Day</label>
              <select
                value={timeOfDay}
                onChange={(e) => setTimeOfDay(e.target.value)}
                className="w-full px-3 py-2 bg-studio-950 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
              >
                <option value="DAY">DAY</option>
                <option value="NIGHT">NIGHT</option>
                <option value="DAWN">DAWN</option>
                <option value="DUSK">DUSK</option>
                <option value="MAGIC HOUR">MAGIC HOUR</option>
                <option value="CONTINUOUS">CONTINUOUS</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Page Length (1/8ths)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="number"
                  min="1"
                  max="80"
                  value={pagesEighths}
                  onChange={(e) => setPagesEighths(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-studio-950 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
                />
                <span className="text-xs text-slate-400 shrink-0">
                  = {(pagesEighths / 8).toFixed(2)} pgs
                </span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">Dramatic Synopsis</label>
            <textarea
              rows={3}
              placeholder="Brief summary of narrative beats, conflict, and character intentions..."
              value={synopsis}
              onChange={(e) => setSynopsis(e.target.value)}
              className="w-full px-3 py-2 bg-studio-950 border border-white/10 rounded-lg text-sm text-white focus:outline-none focus:border-sky-500"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg bg-studio-800 hover:bg-studio-700 text-xs font-semibold text-slate-300 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-xs font-bold text-white shadow-lg shadow-sky-600/30 transition-all"
            >
              {isSubmitting ? 'Creating...' : 'Create Scene'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
