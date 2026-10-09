"use client";

import React, { useState, useEffect } from 'react';
import { Camera } from 'lucide-react';
import { ScriptBlock } from '@/lib/types';

interface AddShotModalProps {
  setupId: string | null;
  scriptBlocks: ScriptBlock[];
  initialShotCode: string;
  onClose: () => void;
  onSubmit: (payload: {
    setup_id: string;
    shot_code: string;
    shot_size: string;
    focal_length?: string;
    camera_movement?: string;
    framing_description?: string;
    storyboard_frame_url?: string;
    covered_script_blocks?: string[];
  }) => Promise<void>;
}

export function AddShotModal({
  setupId,
  scriptBlocks,
  initialShotCode,
  onClose,
  onSubmit,
}: AddShotModalProps) {
  const [shotCode, setShotCode] = useState(initialShotCode);
  const [shotSize, setShotSize] = useState('MCU');
  const [focalLength, setFocalLength] = useState('35mm');
  const [movement, setMovement] = useState('Static');
  const [framingDesc, setFramingDesc] = useState('');
  const [storyboardUrl, setStoryboardUrl] = useState('');
  const [selectedBlocks, setSelectedBlocks] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    setShotCode(initialShotCode);
    setSelectedBlocks(scriptBlocks.map((b) => b.id));
  }, [initialShotCode, scriptBlocks]);

  if (!setupId) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await onSubmit({
        setup_id: setupId,
        shot_code: shotCode,
        shot_size: shotSize,
        focal_length: focalLength,
        camera_movement: movement,
        framing_description: framingDesc,
        storyboard_frame_url: storyboardUrl || 'https://images.unsplash.com/photo-1536440136628-849c177e76a1?w=600',
        covered_script_blocks: selectedBlocks,
      });
      onClose();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
      <div className="w-full max-w-lg bg-studio-900 border border-white/10 rounded-2xl shadow-2xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <h3 className="font-bold text-base text-white flex items-center gap-2">
            <Camera className="w-4 h-4 text-sky-400" />
            Add Shot to Setup
          </h3>
          <button
            onClick={onClose}
            className="text-xs text-slate-400 hover:text-white"
          >
            Close
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div>
              <label className="text-xs text-slate-300 block mb-1">Shot Code</label>
              <input
                type="text"
                value={shotCode}
                onChange={(e) => setShotCode(e.target.value)}
                required
                className="w-full px-3 py-2 bg-studio-950 border border-white/10 rounded-lg text-sm text-white font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-slate-300 block mb-1">Framing / Size</label>
              <select
                value={shotSize}
                onChange={(e) => setShotSize(e.target.value)}
                className="w-full px-3 py-2 bg-studio-950 border border-white/10 rounded-lg text-sm text-white"
              >
                <option value="Wide">Wide (Master)</option>
                <option value="Full Shot">Full Shot</option>
                <option value="Medium">Medium</option>
                <option value="MCU">MCU (Med Close-Up)</option>
                <option value="Close-Up">Close-Up</option>
                <option value="ECU">Extreme Close-Up</option>
                <option value="Insert">Insert / Detail</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-300 block mb-1">Focal Length</label>
              <input
                type="text"
                placeholder="e.g. 35mm"
                value={focalLength}
                onChange={(e) => setFocalLength(e.target.value)}
                className="w-full px-3 py-2 bg-studio-950 border border-white/10 rounded-lg text-sm text-white font-mono"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-300 block mb-1">Camera Movement</label>
              <select
                value={movement}
                onChange={(e) => setMovement(e.target.value)}
                className="w-full px-3 py-2 bg-studio-950 border border-white/10 rounded-lg text-sm text-white"
              >
                <option value="Static">Static / Locked-off</option>
                <option value="Handheld">Handheld</option>
                <option value="Steadicam">Steadicam / Ronin</option>
                <option value="Dolly">Dolly Track</option>
                <option value="Pan / Tilt">Pan / Tilt</option>
                <option value="Crane">Crane / Jib</option>
                <option value="Drone">Drone Aerial</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-300 block mb-1">Storyboard Thumbnail URL</label>
              <input
                type="url"
                placeholder="https://..."
                value={storyboardUrl}
                onChange={(e) => setStoryboardUrl(e.target.value)}
                className="w-full px-3 py-2 bg-studio-950 border border-white/10 rounded-lg text-xs text-white"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-300 block mb-1">Framing Description</label>
            <textarea
              rows={2}
              placeholder="e.g. OTS on Karen typing, shallow depth of field on console..."
              value={framingDesc}
              onChange={(e) => setFramingDesc(e.target.value)}
              className="w-full px-3 py-2 bg-studio-950 border border-white/10 rounded-lg text-xs text-white"
            />
          </div>

          {/* Covered Script Blocks Selector */}
          <div>
            <label className="text-xs text-slate-300 block mb-1.5 font-semibold">
              Covered Script Blocks ({selectedBlocks.length}/{scriptBlocks.length})
            </label>
            <div className="max-h-36 overflow-y-auto p-2 bg-studio-950 rounded-lg border border-white/5 space-y-1">
              {scriptBlocks.map((b) => {
                const isChecked = selectedBlocks.includes(b.id);
                return (
                  <label
                    key={b.id}
                    className="flex items-center gap-2 p-1 rounded hover:bg-studio-900 cursor-pointer text-xs text-slate-300"
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelectedBlocks([...selectedBlocks, b.id]);
                        } else {
                          setSelectedBlocks(selectedBlocks.filter((id) => id !== b.id));
                        }
                      }}
                      className="rounded text-sky-500"
                    />
                    <span className="font-mono text-[10px] text-slate-400 uppercase">[{b.type}]</span>
                    <span className="truncate">{b.content}</span>
                  </label>
                );
              })}
            </div>
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
              className="px-5 py-2 rounded-lg bg-sky-600 hover:bg-sky-500 text-xs font-bold text-white shadow-sm disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Save Shot'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
