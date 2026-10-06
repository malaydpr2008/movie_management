"use client";

import React, { useState } from 'react';
import {
  Clock,
  Calculator,
  Plus,
  Minus,
  Save,
  Sparkles,
  Timer,
  AlertCircle,
  FileSpreadsheet
} from 'lucide-react';
import { SceneDetail, api } from '@/lib/api';
import { toast } from '@/stores/useToastStore';

interface LogisticsPageMathDrawerProps {
  scene: SceneDetail;
  onSceneUpdated: () => void;
}

export function LogisticsPageMathDrawer({
  scene,
  onSceneUpdated,
}: LogisticsPageMathDrawerProps) {
  const [pagesEighths, setPagesEighths] = useState(scene.pages_eighths);
  const [estimatedShootMinutes, setEstimatedShootMinutes] = useState(scene.estimated_shoot_minutes);
  const [isSaving, setIsSaving] = useState(false);

  // Math conversions
  const wholePages = Math.floor(pagesEighths / 8);
  const remainderEighths = pagesEighths % 8;
  const decimalPages = (pagesEighths / 8).toFixed(2);
  const estimatedHours = (estimatedShootMinutes / 60).toFixed(1);

  // Stepper handlers
  const handleStepEighths = (delta: number) => {
    setPagesEighths((prev) => Math.max(1, prev + delta));
  };

  const handleStepPages = (delta: number) => {
    setPagesEighths((prev) => Math.max(1, prev + delta * 8));
  };

  // Preset time calculators
  const applyPreset = (minutes: number) => {
    setEstimatedShootMinutes(minutes);
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      await api.updateScene(scene.id, {
        pages_eighths: pagesEighths,
        estimated_shoot_minutes: estimatedShootMinutes,
      });
      toast.success('Logistics Updated', `Page count: ${decimalPages} pgs, Shoot time: ${estimatedHours}h`);
      onSceneUpdated();
    } catch (err: any) {
      toast.error('Failed to update logistics', err.message);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <div>
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Calculator className="w-4 h-4 text-emerald-400" />
            Logistics & Page Math
          </h3>
          <p className="text-xs text-slate-400">
            Standard Hollywood 1/8th page counter & scheduling pacing
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-xs font-bold text-white shadow-sm transition-colors"
        >
          <Save className="w-3.5 h-3.5" />
          <span>{isSaving ? 'Saving...' : 'Save Logistics'}</span>
        </button>
      </div>

      {/* Screenplay Page Length Stepper Counter */}
      <div className="p-5 rounded-2xl bg-studio-950/70 border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <FileSpreadsheet className="w-4 h-4 text-sky-400" />
            Script Page Count (1/8ths)
          </span>
          <span className="font-mono text-xs text-sky-400 font-bold bg-sky-950/80 px-2 py-0.5 rounded border border-sky-800/40">
            {pagesEighths} total 1/8ths
          </span>
        </div>

        {/* Big Display Badge */}
        <div className="p-4 rounded-xl bg-studio-900 border border-white/5 flex items-center justify-around text-center">
          <div>
            <span className="text-3xl font-black text-white font-mono">{wholePages}</span>
            <span className="text-xs text-slate-400 block mt-0.5">Whole Pages</span>
          </div>
          <span className="text-2xl text-slate-600 font-light">+</span>
          <div>
            <span className="text-3xl font-black text-amber-400 font-mono">
              {remainderEighths}/8
            </span>
            <span className="text-xs text-slate-400 block mt-0.5">Eighths</span>
          </div>
          <span className="text-2xl text-slate-600 font-light">=</span>
          <div>
            <span className="text-3xl font-black text-sky-400 font-mono">{decimalPages}</span>
            <span className="text-xs text-slate-400 block mt-0.5">Decimal Pages</span>
          </div>
        </div>

        {/* Stepper Buttons */}
        <div className="grid grid-cols-2 gap-3 pt-1">
          {/* 1/8th Steppers */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-studio-900 border border-white/5">
            <span className="text-xs font-semibold text-slate-400">Step 1/8th:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleStepEighths(-1)}
                className="w-8 h-8 rounded-lg bg-studio-800 hover:bg-studio-700 flex items-center justify-center text-slate-200 hover:text-white transition-colors"
                title="Subtract 1/8th"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleStepEighths(1)}
                className="w-8 h-8 rounded-lg bg-studio-800 hover:bg-studio-700 flex items-center justify-center text-slate-200 hover:text-white transition-colors"
                title="Add 1/8th"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {/* Full Page Steppers */}
          <div className="flex items-center justify-between p-2 rounded-xl bg-studio-900 border border-white/5">
            <span className="text-xs font-semibold text-slate-400">Step 1 Page:</span>
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleStepPages(-1)}
                className="w-8 h-8 rounded-lg bg-studio-800 hover:bg-studio-700 flex items-center justify-center text-slate-200 hover:text-white transition-colors"
                title="Subtract 1 Page"
              >
                <Minus className="w-3.5 h-3.5" />
              </button>
              <button
                onClick={() => handleStepPages(1)}
                className="w-8 h-8 rounded-lg bg-studio-800 hover:bg-studio-700 flex items-center justify-center text-slate-200 hover:text-white transition-colors"
                title="Add 1 Page"
              >
                <Plus className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Estimated Shoot Time Calculator */}
      <div className="p-5 rounded-2xl bg-studio-950/70 border border-white/5 space-y-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
            <Clock className="w-4 h-4 text-amber-400" />
            Estimated Shoot Time
          </span>
          <span className="font-mono text-xs text-amber-400 font-bold bg-amber-950/80 px-2 py-0.5 rounded border border-amber-800/40">
            {estimatedHours} hours ({estimatedShootMinutes} min)
          </span>
        </div>

        <div>
          <label className="text-xs text-slate-400 block mb-1">
            Planned Production Minutes:
          </label>
          <input
            type="number"
            min="15"
            max="1200"
            step="15"
            value={estimatedShootMinutes}
            onChange={(e) => setEstimatedShootMinutes(Number(e.target.value))}
            className="w-full px-3 py-2 bg-studio-900 border border-white/10 rounded-lg text-sm text-white font-mono focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Shoot Pacing Presets */}
        <div>
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block mb-2">
            Pacing & Complexity Presets:
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => applyPreset(120)}
              className="p-2 rounded-lg bg-studio-900 hover:bg-studio-800 text-left border border-white/5 transition-colors"
            >
              <span className="text-xs font-bold text-white block">Standard</span>
              <span className="text-[10px] text-slate-400">2.0 hrs (Simple)</span>
            </button>
            <button
              type="button"
              onClick={() => applyPreset(240)}
              className="p-2 rounded-lg bg-studio-900 hover:bg-studio-800 text-left border border-white/5 transition-colors"
            >
              <span className="text-xs font-bold text-amber-300 block">Heavy Drama</span>
              <span className="text-[10px] text-slate-400">4.0 hrs (Coverage)</span>
            </button>
            <button
              type="button"
              onClick={() => applyPreset(360)}
              className="p-2 rounded-lg bg-studio-900 hover:bg-studio-800 text-left border border-white/5 transition-colors"
            >
              <span className="text-xs font-bold text-rose-300 block">Action / SFX</span>
              <span className="text-[10px] text-slate-400">6.0 hrs (Stunts)</span>
            </button>
          </div>
        </div>

        <div className="p-3 rounded-lg bg-studio-900/60 border border-white/5 text-[11px] text-slate-400 space-y-1">
          <div className="flex justify-between">
            <span>Pacing Rule:</span>
            <span className="font-mono text-slate-300">~1 hr per 3/8ths page standard</span>
          </div>
          <div className="flex justify-between">
            <span>Stripboard Allocation:</span>
            <span className="font-mono text-slate-300">{(estimatedShootMinutes / 60 / 12 * 100).toFixed(0)}% of 12h shoot day</span>
          </div>
        </div>
      </div>
    </div>
  );
}
