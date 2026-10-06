"use client";

import React, { useState } from 'react';
import { X, Flag, Coffee, Truck, Clock } from 'lucide-react';
import { api, StripboardItemDetail } from '@/lib/api';

interface AddBannerModalProps {
  shootDayId: string;
  dayNumber: number;
  isOpen: boolean;
  onClose: () => void;
  onCreated: (item: StripboardItemDetail) => void;
}

const PRESET_BANNERS = [
  { label: '--- 13:00 LUNCH BREAK (1 HOUR) ---', icon: Coffee },
  { label: '=== COMPANY MOVE TO LOCATION ===', icon: Truck },
  { label: '--- 15-MINUTE COURTESY BREAK ---', icon: Clock },
  { label: '*** WRAP UNIT / CAMERA TURNAROUND ***', icon: Flag },
];

export default function AddBannerModal({
  shootDayId,
  dayNumber,
  isOpen,
  onClose,
  onCreated,
}: AddBannerModalProps) {
  const [bannerLabel, setBannerLabel] = useState(PRESET_BANNERS[0].label);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bannerLabel.trim()) return;
    setIsSubmitting(true);
    try {
      const newStrip = await api.addBannerStrip({
        shoot_day_id: shootDayId,
        banner_label: bannerLabel,
      });
      onCreated(newStrip);
      onClose();
    } catch (err) {
      console.error('Failed to create banner strip', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-studio-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-white/5 bg-studio-950/60">
          <div className="flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-sm">
              <Flag className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-base font-bold text-white">Add Schedule Banner</h3>
              <p className="text-xs text-slate-400">Insert meal break or company move in Day {dayNumber}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-2">
              Preset Quick Select
            </label>
            <div className="grid grid-cols-1 gap-2">
              {PRESET_BANNERS.map((preset, idx) => {
                const Icon = preset.icon;
                return (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setBannerLabel(preset.label)}
                    className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium border text-left transition-all ${
                      bannerLabel === preset.label
                        ? 'bg-amber-500/15 border-amber-500/40 text-amber-300'
                        : 'bg-studio-950 border-white/5 text-slate-300 hover:border-white/20'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                    <span className="truncate">{preset.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
              Custom Banner Text
            </label>
            <input
              type="text"
              required
              value={bannerLabel}
              onChange={(e) => setBannerLabel(e.target.value)}
              className="w-full bg-studio-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-amber-500 font-mono"
              placeholder="e.g. --- SECOND MEAL (30 MINS) ---"
            />
          </div>

          <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-amber-500 hover:bg-amber-400 text-black shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Inserting...' : 'Insert Banner'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
