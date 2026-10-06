"use client";

import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api, DPRIn } from '@/lib/api';
import { toast } from '@/stores/useToastStore';
import { ClipboardList, Save, X, Loader2 } from 'lucide-react';

interface DprFormDrawerProps {
  shootDayId: string;
  dayNumber: number;
  isOpen: boolean;
  onClose: () => void;
}

export function DprFormDrawer({ shootDayId, dayNumber, isOpen, onClose }: DprFormDrawerProps) {
  const queryClient = useQueryClient();

  const { data: dpr, isLoading } = useQuery({
    queryKey: ['dpr', shootDayId],
    queryFn: () => api.getDPR(shootDayId),
    enabled: isOpen && Boolean(shootDayId),
  });

  const [formData, setFormData] = useState<DPRIn>({
    actual_first_shot: '',
    actual_wrap: '',
    scenes_completed: 0,
    pages_completed: 0.0,
    camera_rolls_used: 0,
    sound_rolls_used: 0,
    delay_notes: '',
  });

  useEffect(() => {
    if (dpr) {
      setFormData({
        actual_first_shot: dpr.actual_first_shot?.substring(0, 5) || '',
        actual_wrap: dpr.actual_wrap?.substring(0, 5) || '',
        scenes_completed: dpr.scenes_completed || 0,
        pages_completed: dpr.pages_completed || 0.0,
        camera_rolls_used: dpr.camera_rolls_used || 0,
        sound_rolls_used: dpr.sound_rolls_used || 0,
        delay_notes: dpr.delay_notes || '',
      });
    }
  }, [dpr]);

  const updateMutation = useMutation({
    mutationFn: (payload: DPRIn) => api.updateDPR(shootDayId, payload),
    onSuccess: () => {
      toast.success('DPR Saved', 'Daily Production Report updated successfully.');
      queryClient.invalidateQueries({ queryKey: ['dpr', shootDayId] });
      onClose();
    },
    onError: (err: any) => {
      toast.error('Failed to save DPR', err.message);
    }
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'number' ? (value ? parseFloat(value) : 0) : value,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-y-0 right-0 w-full md:w-96 bg-studio-900 border-l border-white/10 shadow-2xl z-50 flex flex-col animate-in slide-in-from-right-full duration-300">
      <div className="flex items-center justify-between p-4 border-b border-white/10 bg-studio-950">
        <h3 className="font-bold text-white flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-emerald-400" />
          Day {dayNumber} DPR
        </h3>
        <button onClick={onClose} className="p-1 text-slate-400 hover:text-white rounded">
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
          </div>
        ) : (
          <form id="dpr-form" onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Actual First Shot</label>
                <input
                  type="time"
                  name="actual_first_shot"
                  value={formData.actual_first_shot}
                  onChange={handleChange}
                  className="w-full bg-studio-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Actual Wrap</label>
                <input
                  type="time"
                  name="actual_wrap"
                  value={formData.actual_wrap}
                  onChange={handleChange}
                  className="w-full bg-studio-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Scenes Completed</label>
                <input
                  type="number"
                  name="scenes_completed"
                  value={formData.scenes_completed || ''}
                  onChange={handleChange}
                  min="0"
                  className="w-full bg-studio-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Pages Completed</label>
                <input
                  type="number"
                  name="pages_completed"
                  value={formData.pages_completed || ''}
                  onChange={handleChange}
                  min="0"
                  step="0.1"
                  className="w-full bg-studio-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Camera Rolls</label>
                <input
                  type="number"
                  name="camera_rolls_used"
                  value={formData.camera_rolls_used || ''}
                  onChange={handleChange}
                  min="0"
                  className="w-full bg-studio-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Sound Rolls</label>
                <input
                  type="number"
                  name="sound_rolls_used"
                  value={formData.sound_rolls_used || ''}
                  onChange={handleChange}
                  min="0"
                  className="w-full bg-studio-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1">Delay Notes</label>
              <textarea
                name="delay_notes"
                value={formData.delay_notes}
                onChange={handleChange}
                rows={4}
                placeholder="Weather delays, equipment issues..."
                className="w-full bg-studio-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white resize-none"
              />
            </div>
          </form>
        )}
      </div>

      <div className="p-4 border-t border-white/10 bg-studio-950">
        <button
          type="submit"
          form="dpr-form"
          disabled={updateMutation.isPending || isLoading}
          className="w-full flex items-center justify-center gap-2 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold rounded-xl transition-colors"
        >
          {updateMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Save DPR
        </button>
      </div>
    </div>
  );
}
