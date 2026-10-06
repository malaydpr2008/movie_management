"use client";

import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  DndContext,
  DragOverlay,
  closestCorners,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragStartEvent,
  DragEndEvent
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
  useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { api, VfxShotOut, VfxShotIn, ProjectTree } from '@/lib/api';
import { toast } from '@/stores/useToastStore';
import { Wand2, Plus, Loader2, GripVertical, X } from 'lucide-react';

const COLUMNS = [
  { id: 'Pending', title: 'Pending' },
  { id: 'Plate Ingest', title: 'Plate Ingest' },
  { id: 'Matchmove', title: 'Matchmove' },
  { id: 'Animation/Lighting', title: 'Animation/Lighting' },
  { id: 'Compositing', title: 'Compositing' },
  { id: 'Final', title: 'Final' },
];

export default function VfxKanbanPage({ params }: { params: { projectId: string } }) {
  const { projectId } = params;
  const queryClient = useQueryClient();
  const [activeShot, setActiveShot] = useState<VfxShotOut | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const { data: shots = [], isLoading } = useQuery({
    queryKey: ['vfx', projectId],
    queryFn: () => api.getVfxShots(projectId),
  });

  const { data: tree } = useQuery({
    queryKey: ['projectTree', projectId],
    queryFn: () => api.getProjectTree(projectId),
  });

  const updateStatusMutation = useMutation({
    mutationFn: ({ shotId, status }: { shotId: string; status: string }) => api.updateVfxShotStatus(shotId, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vfx', projectId] });
    },
    onError: (err: any) => {
      toast.error('Failed to move shot', err.message);
      queryClient.invalidateQueries({ queryKey: ['vfx', projectId] }); // revert optimistic
    }
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const shot = shots.find(s => s.id === active.id);
    if (shot) setActiveShot(shot);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveShot(null);

    if (!over) return;

    const shotId = active.id as string;
    const shot = shots.find(s => s.id === shotId);
    if (!shot) return;

    let targetStatus = over.id as string;
    
    // If dropped over another shot, get its status
    if (over.data.current?.type === 'Shot') {
      const overShot = shots.find(s => s.id === over.id);
      if (overShot) targetStatus = overShot.status;
    }

    if (shot.status !== targetStatus && COLUMNS.map(c => c.id).includes(targetStatus)) {
      // Optimistic update
      queryClient.setQueryData(['vfx', projectId], (old: VfxShotOut[] | undefined) => {
        if (!old) return [];
        return old.map(s => s.id === shotId ? { ...s, status: targetStatus } : s);
      });
      updateStatusMutation.mutate({ shotId, status: targetStatus });
    }
  };

  const shotsByColumn = useMemo(() => {
    const grouped: Record<string, VfxShotOut[]> = {};
    COLUMNS.forEach(col => grouped[col.id] = []);
    shots.forEach(shot => {
      // map similar statuses if needed, but exact matches preferred
      const colId = COLUMNS.find(c => c.id === shot.status)?.id || 'Pending';
      grouped[colId].push(shot);
    });
    return grouped;
  }, [shots]);

  return (
    <div className="flex-1 flex flex-col h-full bg-studio-950 text-white overflow-hidden">
      <div className="flex-shrink-0 flex items-center justify-between p-6 border-b border-white/10 bg-studio-950 z-10">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2">
            <Wand2 className="w-6 h-6 text-fuchsia-500" />
            VFX Pipeline
          </h1>
          <p className="text-slate-400 text-sm">Post-production shot tracking and workflows.</p>
        </div>
        <button
          onClick={() => setIsModalOpen(true)}
          className="flex items-center gap-2 px-4 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 text-white font-bold rounded-lg shadow-lg shadow-fuchsia-500/20 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add VFX Shot
        </button>
      </div>

      <div className="flex-1 overflow-x-auto overflow-y-hidden p-6">
        {isLoading ? (
          <div className="flex items-center justify-center h-full text-slate-400 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-fuchsia-500" />
            <span>Loading VFX Shots...</span>
          </div>
        ) : (
          <DndContext
            sensors={sensors}
            collisionDetection={closestCorners}
            onDragStart={handleDragStart}
            onDragEnd={handleDragEnd}
          >
            <div className="flex gap-6 h-full min-w-max">
              {COLUMNS.map(col => (
                <Column key={col.id} col={col} shots={shotsByColumn[col.id] || []} />
              ))}
            </div>
            
            <DragOverlay>
              {activeShot ? <ShotCard shot={activeShot} isOverlay /> : null}
            </DragOverlay>
          </DndContext>
        )}
      </div>

      {isModalOpen && (
        <AddVfxModal 
          projectId={projectId}
          tree={tree}
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </div>
  );
}

function Column({ col, shots }: { col: { id: string, title: string }, shots: VfxShotOut[] }) {
  return (
    <div className="flex flex-col w-80 h-full bg-studio-900/50 border border-white/10 rounded-2xl overflow-hidden shrink-0">
      <div className="px-4 py-3 bg-studio-900 border-b border-white/10 flex items-center justify-between">
        <h3 className="font-bold text-slate-200 tracking-wider uppercase text-sm">{col.title}</h3>
        <span className="text-xs font-mono text-slate-500 bg-studio-950 px-2 py-0.5 rounded-full border border-white/5">
          {shots.length}
        </span>
      </div>
      <div className="flex-1 p-3 overflow-y-auto">
        <SortableContext id={col.id} items={shots.map(s => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3 min-h-[100px]">
            {shots.map(shot => (
              <SortableShot key={shot.id} shot={shot} />
            ))}
          </div>
        </SortableContext>
      </div>
    </div>
  );
}

function SortableShot({ shot }: { shot: VfxShotOut }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ 
    id: shot.id,
    data: { type: 'Shot', shot }
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <ShotCard shot={shot} />
    </div>
  );
}

function ShotCard({ shot, isOverlay }: { shot: VfxShotOut, isOverlay?: boolean }) {
  return (
    <div className={`bg-studio-800 border border-white/10 rounded-xl p-3 cursor-grab active:cursor-grabbing hover:border-fuchsia-500/50 transition-colors ${isOverlay ? 'shadow-2xl shadow-fuchsia-500/20 rotate-2' : 'shadow-md'}`}>
      <div className="flex items-start justify-between mb-2">
        <div className="font-mono text-xs font-bold text-fuchsia-400 bg-fuchsia-500/10 px-2 py-0.5 rounded border border-fuchsia-500/20">
          {shot.vfx_id}
        </div>
        <GripVertical className="w-4 h-4 text-slate-500" />
      </div>
      <p className="text-sm text-slate-200 mb-3 line-clamp-3 leading-relaxed">
        {shot.description}
      </p>
      <div className="flex items-center justify-between text-[10px] text-slate-400 font-bold uppercase tracking-wider">
        <span className="truncate">{shot.vendor_name || 'In-House'}</span>
        <span>{shot.frame_count} F</span>
      </div>
    </div>
  );
}

function AddVfxModal({ projectId, tree, onClose }: any) {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState<VfxShotIn>({
    scene_id: '',
    vfx_id: '',
    status: 'Pending',
    description: '',
    frame_count: 0,
    vendor_name: ''
  });

  const createMutation = useMutation({
    mutationFn: (payload: VfxShotIn) => api.createVfxShot(projectId, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vfx', projectId] });
      toast.success('Shot Added', 'VFX shot tracked successfully.');
      onClose();
    },
    onError: (err: any) => {
      toast.error('Failed to add shot', err.message);
    }
  });

  const scenes = tree?.acts.flatMap((a: any) => a.sequences.flatMap((s: any) => s.scenes)) || [];

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-studio-900 border border-white/10 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-white/10 bg-studio-950">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Wand2 className="w-5 h-5 text-fuchsia-500" />
            Add VFX Shot
          </h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); createMutation.mutate(formData); }} className="p-6 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 block mb-1">VFX ID *</label>
              <input
                required
                type="text"
                placeholder="e.g. SQ01_SC04_VFX010"
                value={formData.vfx_id}
                onChange={(e) => setFormData(p => ({ ...p, vfx_id: e.target.value }))}
                className="w-full bg-studio-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white font-mono"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 block mb-1">Link to Scene *</label>
              <select
                required
                value={formData.scene_id}
                onChange={(e) => setFormData(p => ({ ...p, scene_id: e.target.value }))}
                className="w-full bg-studio-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              >
                <option value="">-- Select Scene --</option>
                {scenes.map((s: any) => (
                  <option key={s.id} value={s.id}>Sc {s.scene_number} - {s.set_name}</option>
                ))}
              </select>
            </div>
          </div>
          
          <div>
            <label className="text-xs text-slate-400 block mb-1">Description *</label>
            <textarea
              required
              rows={3}
              placeholder="Describe the visual effects required..."
              value={formData.description}
              onChange={(e) => setFormData(p => ({ ...p, description: e.target.value }))}
              className="w-full bg-studio-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white resize-none"
            />
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="col-span-1">
              <label className="text-xs text-slate-400 block mb-1">Frames</label>
              <input
                type="number"
                min="0"
                value={formData.frame_count}
                onChange={(e) => setFormData(p => ({ ...p, frame_count: parseInt(e.target.value) || 0 }))}
                className="w-full bg-studio-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
            <div className="col-span-2">
              <label className="text-xs text-slate-400 block mb-1">Vendor / Artist</label>
              <input
                type="text"
                placeholder="e.g. ILM, Weta, or John Doe"
                value={formData.vendor_name}
                onChange={(e) => setFormData(p => ({ ...p, vendor_name: e.target.value }))}
                className="w-full bg-studio-950 border border-white/10 rounded-lg px-3 py-2 text-sm text-white"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white">
              Cancel
            </button>
            <button type="submit" disabled={createMutation.isPending || !formData.scene_id || !formData.vfx_id} className="px-5 py-2 bg-fuchsia-600 hover:bg-fuchsia-500 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2">
              {createMutation.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Create Shot
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
