"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Layers,
  Plus,
  Trash2,
  AlertTriangle,
  Shirt,
  Box,
  Volume2,
  Flame,
  Wand2,
  Sparkles,
  Link as LinkIcon
} from 'lucide-react';
import { SceneBreakdownItem, CatalogsResponse, api } from '@/lib/api';
import { toast } from '@/stores/useToastStore';

interface DepartmentBreakdownDrawerProps {
  sceneId: string;
  projectId: string;
  items: SceneBreakdownItem[];
  onItemsUpdated: () => void;
}

const ELEMENT_TYPE_ICONS: Record<string, any> = {
  PROP: Box,
  WARDROBE: Shirt,
  SOUND: Volume2,
  SFX: Flame,
  VFX: Wand2,
};

const ELEMENT_TYPE_COLORS: Record<string, string> = {
  PROP: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  WARDROBE: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  SOUND: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  SFX: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  VFX: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

export function DepartmentBreakdownDrawer({
  sceneId,
  projectId,
  items,
  onItemsUpdated,
}: DepartmentBreakdownDrawerProps) {
  const [isLinking, setIsLinking] = useState(false);
  const [elementType, setElementType] = useState<'PROP' | 'WARDROBE' | 'SOUND' | 'SFX' | 'VFX'>('PROP');
  const [selectedPropId, setSelectedPropId] = useState('');
  const [selectedCostumeId, setSelectedCostumeId] = useState('');
  const [customNotes, setCustomNotes] = useState('');
  const [isContinuityCritical, setIsContinuityCritical] = useState(false);

  const { data: catalogs } = useQuery<CatalogsResponse>({
    queryKey: ['catalogs', projectId],
    queryFn: () => api.getCatalogs(projectId),
    enabled: Boolean(projectId),
  });

  const { data: sceneData } = useQuery({
    queryKey: ['sceneDetail', sceneId],
    queryFn: () => api.getSceneDetail(sceneId),
    enabled: Boolean(sceneId),
  });

  const { data: sequenceData } = useQuery({
    queryKey: ['sequenceDetail', sceneData?.sequence_id],
    queryFn: () => api.getSequenceDetail(sceneData!.sequence_id!),
    enabled: Boolean(sceneData?.sequence_id),
  });

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.addSceneBreakdownItem(sceneId, {
        element_type: elementType,
        prop_id: elementType === 'PROP' && selectedPropId ? selectedPropId : undefined,
        costume_id: elementType === 'WARDROBE' && selectedCostumeId ? selectedCostumeId : undefined,
        custom_notes: customNotes,
        is_continuity_critical: isContinuityCritical,
      });
      toast.success('Breakdown Item Tagged', `Added ${elementType} element to scene.`);
      setIsLinking(false);
      setCustomNotes('');
      setSelectedPropId('');
      setSelectedCostumeId('');
      setIsContinuityCritical(false);
      onItemsUpdated();
    } catch (err: any) {
      toast.error('Failed to link item', err.message);
    }
  };

  const handleDeleteItem = async (itemId: string) => {
    try {
      await api.deleteBreakdownItem(itemId);
      toast.info('Item Removed', 'Breakdown item untagged.');
      onItemsUpdated();
    } catch (err: any) {
      toast.error('Failed to remove item', err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-3 border-b border-white/5">
        <div>
          <h3 className="font-bold text-sm text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-amber-400" />
            Department Breakdown & Assets
          </h3>
          <p className="text-xs text-slate-400">
            {items.length} tagged elements for this scene
          </p>
        </div>

        <button
          onClick={() => setIsLinking(true)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-600 hover:bg-amber-500 text-xs font-bold text-white shadow-sm transition-colors"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tag Asset</span>
        </button>
      </div>

      {/* Continuity Alert Banner */}
      {sequenceData?.continuity_notes && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex gap-3 animate-in fade-in">
          <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0" />
          <div>
            <h4 className="text-sm font-bold text-rose-400 mb-1">Sequence Continuity Alert</h4>
            <p className="text-xs text-rose-300/80 leading-relaxed">{sequenceData.continuity_notes}</p>
          </div>
        </div>
      )}

      {/* Link Item Form / Modal */}
      {isLinking && (
        <form onSubmit={handleAddItem} className="p-4 bg-studio-950 border border-amber-500/40 rounded-xl space-y-4 animate-in fade-in">
          <div className="flex items-center justify-between">
            <h4 className="font-bold text-xs text-white">Link Element from Catalog</h4>
            <button
              type="button"
              onClick={() => setIsLinking(false)}
              className="text-xs text-slate-400 hover:text-white"
            >
              Cancel
            </button>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-300 block mb-1">Department / Type</label>
              <select
                value={elementType}
                onChange={(e) => setElementType(e.target.value as any)}
                className="w-full px-3 py-2 bg-studio-900 border border-white/10 rounded-lg text-xs text-white"
              >
                <option value="PROP">Prop (Hero & Hand Props)</option>
                <option value="WARDROBE">Wardrobe / Costume Look</option>
                <option value="SOUND">Audio / Sound Design</option>
                <option value="SFX">Special Effects (Practical)</option>
                <option value="VFX">Visual Effects (Digital CGI)</option>
              </select>
            </div>

            {elementType === 'PROP' && (
              <div>
                <label className="text-xs text-slate-300 block mb-1">Select Catalog Prop</label>
                <select
                  value={selectedPropId}
                  onChange={(e) => setSelectedPropId(e.target.value)}
                  className="w-full px-3 py-2 bg-studio-900 border border-white/10 rounded-lg text-xs text-white"
                >
                  <option value="">-- Choose from Prop Catalog --</option>
                  {catalogs?.props.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.is_hero_prop ? '★ [HERO]' : ''} (x{p.quantity})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {elementType === 'WARDROBE' && (
              <div>
                <label className="text-xs text-slate-300 block mb-1">Select Character Look</label>
                <select
                  value={selectedCostumeId}
                  onChange={(e) => setSelectedCostumeId(e.target.value)}
                  className="w-full px-3 py-2 bg-studio-900 border border-white/10 rounded-lg text-xs text-white"
                >
                  <option value="">-- Choose Costume Look --</option>
                  {catalogs?.characters.map((c) =>
                    c.looks.map((lk) => (
                      <option key={lk.id} value={lk.id}>
                        {c.name} - {lk.look_number}: {lk.description.slice(0, 30)}...
                      </option>
                    ))
                  )}
                </select>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs text-slate-300 block mb-1">
              Custom Staging & Continuity Notes
            </label>
            <input
              type="text"
              placeholder="e.g. Must have blood splatter on right cuff, glows ultraviolet..."
              value={customNotes}
              onChange={(e) => setCustomNotes(e.target.value)}
              className="w-full px-3 py-2 bg-studio-900 border border-white/10 rounded-lg text-xs text-white"
            />
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-xs text-amber-400 font-semibold">
              <input
                type="checkbox"
                checked={isContinuityCritical}
                onChange={(e) => setIsContinuityCritical(e.target.checked)}
                className="w-4 h-4 rounded text-amber-500"
              />
              <span>Continuity Critical Flag</span>
            </label>

            <button
              type="submit"
              className="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-lg text-xs font-bold text-white shadow-sm"
            >
              Tag Asset
            </button>
          </div>
        </form>
      )}

      {/* Items List */}
      <div className="space-y-2.5">
        {items.map((item) => {
          const Icon = ELEMENT_TYPE_ICONS[item.element_type] || Box;
          const colorClass = ELEMENT_TYPE_COLORS[item.element_type] || 'bg-studio-800 text-white';

          return (
            <div
              key={item.id}
              className="p-3 rounded-xl bg-studio-950/70 border border-white/5 hover:border-white/10 flex items-center justify-between gap-3 group transition-colors"
            >
              <div className="flex items-center gap-3 min-w-0">
                <span className={`p-2 rounded-lg border ${colorClass} shrink-0`}>
                  <Icon className="w-4 h-4" />
                </span>

                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-xs text-white truncate">
                      {item.prop_name || item.costume_name || item.custom_notes || item.element_type}
                    </span>
                    {item.is_continuity_critical && (
                      <span className="flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.2 rounded bg-rose-950 text-rose-300 border border-rose-800/40">
                        <AlertTriangle className="w-3 h-3 text-rose-400" /> CRITICAL
                      </span>
                    )}
                  </div>
                  {item.custom_notes && (item.prop_name || item.costume_name) && (
                    <p className="text-[11px] text-slate-400 truncate mt-0.5">
                      {item.custom_notes}
                    </p>
                  )}
                </div>
              </div>

              <button
                onClick={() => handleDeleteItem(item.id)}
                className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 p-1 rounded transition-opacity"
                title="Remove item"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          );
        })}

        {items.length === 0 && (
          <div className="p-8 border-2 border-dashed border-white/10 rounded-2xl text-center space-y-2">
            <Layers className="w-8 h-8 text-slate-600 mx-auto" />
            <h4 className="font-bold text-sm text-slate-300">No Breakdown Items Tagged</h4>
            <p className="text-xs text-slate-500 max-w-xs mx-auto">
              Link props, character wardrobe looks, practical SFX rigs, and visual effect assets.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
