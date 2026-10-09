"use client";

import React, { useState, useEffect } from 'react';
import { CircleDot } from 'lucide-react';

interface TakeLoggerModalProps {
  shotId: string | null;
  initialTakeNumber: number;
  onClose: () => void;
  onSubmit: (payload: {
    shot_id: string;
    take_number: number;
    is_circle_take?: boolean;
    camera_card?: string;
    sound_roll?: string;
    timecode_in?: string;
    timecode_out?: string;
    script_supervisor_notes?: string;
  }) => Promise<void>;
}

export function TakeLoggerModal({
  shotId,
  initialTakeNumber,
  onClose,
  onSubmit,
}: TakeLoggerModalProps) {
  const [takeNum, setTakeNum] = useState(initialTakeNumber);
  const [isCircle, setIsCircle] = useState(false);
  const [cardNo, setCardNo] = useState('A001');
  const [soundRoll, setSoundRoll] = useState('SR01');
  const [tcIn, setTcIn] = useState('01:00:00:00');
  const [tcOut, setTcOut] = useState('01:01:15:00');
  const [supNotes, setSupNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setTakeNum(initialTakeNumber);
    setIsCircle(false);
    setSupNotes('');
  }, [initialTakeNumber, shotId]);

  if (!shotId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        shot_id: shotId,
        take_number: takeNum,
        is_circle_take: isCircle,
        camera_card: cardNo,
        sound_roll: soundRoll,
        timecode_in: tcIn,
        timecode_out: tcOut,
        script_supervisor_notes: supNotes,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-md bg-studio-900 border border-white/10 rounded-2xl shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <CircleDot className="w-4 h-4 text-emerald-400" />
            Record Take #{takeNum}
          </h3>
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-300 block mb-1">Take Number</label>
              <input
                type="number"
                min="1"
                value={takeNum}
                onChange={(e) => setTakeNum(Number(e.target.value))}
                className="w-full px-3 py-2 bg-studio-950 border border-white/10 rounded-lg text-sm text-white font-mono"
              />
            </div>
            <div className="flex items-center pt-5">
              <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-emerald-400">
                <input
                  type="checkbox"
                  checked={isCircle}
                  onChange={(e) => setIsCircle(e.target.checked)}
                  className="w-4 h-4 rounded text-emerald-500"
                />
                <span>Circle Take (Preferred)</span>
              </label>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-300 block mb-1">Camera Card</label>
              <input
                type="text"
                value={cardNo}
                onChange={(e) => setCardNo(e.target.value)}
                className="w-full px-3 py-2 bg-studio-950 border border-white/10 rounded-lg text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-slate-300 block mb-1">Sound Roll</label>
              <input
                type="text"
                value={soundRoll}
                onChange={(e) => setSoundRoll(e.target.value)}
                className="w-full px-3 py-2 bg-studio-950 border border-white/10 rounded-lg text-xs text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-300 block mb-1">Timecode In</label>
              <input
                type="text"
                value={tcIn}
                onChange={(e) => setTcIn(e.target.value)}
                className="w-full px-3 py-2 bg-studio-950 border border-white/10 rounded-lg text-xs text-white font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-slate-300 block mb-1">Timecode Out</label>
              <input
                type="text"
                value={tcOut}
                onChange={(e) => setTcOut(e.target.value)}
                className="w-full px-3 py-2 bg-studio-950 border border-white/10 rounded-lg text-xs text-white font-mono"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-300 block mb-1">Script Supervisor Notes</label>
            <textarea
              rows={2}
              placeholder="e.g. Good delivery, lens flare on entrance, clean audio..."
              value={supNotes}
              onChange={(e) => setSupNotes(e.target.value)}
              className="w-full px-3 py-2 bg-studio-950 border border-white/10 rounded-lg text-xs text-white"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2 border-t border-white/5">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-4 py-2 rounded-lg bg-studio-800 text-xs font-semibold text-slate-300"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-xs font-bold text-white shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Recording...' : 'Log Take'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
