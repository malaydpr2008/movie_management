"use client";

import React, { useState, useEffect } from 'react';
import {
  Plus,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import { arrayMove } from '@dnd-kit/sortable';
import {
  ScheduleData,
  ShootDayDetail,
  StripboardItemDetail,
  UnassignedScene,
} from '@/lib/types';
import { productionApi } from '@/lib/api/production';
import {
  useReorderStrip,
  useDeleteStrip,
  useScheduleSceneStrip,
} from '@/hooks/useProduction';
import AddShootDayModal from './AddShootDayModal';
import AddBannerModal from './AddBannerModal';
import { toast } from '@/stores/useToastStore';
import { DprFormDrawer } from './DprFormDrawer';
import { ShootDayCard } from './stripboard/ShootDayCard';
import { UnassignedScenesPool } from './stripboard/UnassignedScenesPool';

interface StripboardViewProps {
  projectId: string;
  schedule: ScheduleData;
  onRefresh: () => void;
}

export default function StripboardView({
  projectId,
  schedule,
  onRefresh,
}: StripboardViewProps) {
  const [days, setDays] = useState<ShootDayDetail[]>(schedule.shoot_days);
  const [unassigned, setUnassigned] = useState<UnassignedScene[]>(schedule.unassigned_scenes);
  const [isUnassignedOpen, setIsUnassignedOpen] = useState(true);
  const [filterLight, setFilterLight] = useState<'ALL' | 'DAY' | 'NIGHT' | 'INT' | 'EXT'>('ALL');
  const [isAddDayOpen, setIsAddDayOpen] = useState(false);
  const [activeBannerDay, setActiveBannerDay] = useState<{ id: string; num: number } | null>(null);
  const [activeDprDay, setActiveDprDay] = useState<{ id: string; num: number } | null>(null);

  // Feature mutation hooks
  const reorderStripMutation = useReorderStrip(projectId);
  const deleteStripMutation = useDeleteStrip(projectId);
  const scheduleSceneMutation = useScheduleSceneStrip(projectId);

  // Sync internal state with props if refreshed externally
  useEffect(() => {
    setDays(schedule.shoot_days);
    setUnassigned(schedule.unassigned_scenes);
  }, [schedule]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeId = String(active.id);
    const overId = String(over.id);

    if (activeId === overId) return;

    // Find source day and target day
    let sourceDay: ShootDayDetail | undefined;
    let targetDay: ShootDayDetail | undefined;
    let activeItem: StripboardItemDetail | undefined;

    for (const d of days) {
      const it = d.items.find((item) => item.id === activeId);
      if (it) {
        sourceDay = d;
        activeItem = it;
      }
      if (d.id === overId || d.items.some((item) => item.id === overId)) {
        targetDay = d;
      }
    }

    if (!sourceDay || !targetDay || !activeItem) return;

    // Reorder in same day or move to another day
    const sourceItems = [...sourceDay.items];
    const targetItems = sourceDay.id === targetDay.id ? sourceItems : [...targetDay.items];

    const oldIndex = sourceItems.findIndex((it) => it.id === activeId);
    let newIndex = targetItems.findIndex((it) => it.id === overId);

    if (newIndex === -1) {
      newIndex = targetItems.length;
    }

    if (sourceDay.id === targetDay.id) {
      const reordered = arrayMove(sourceItems, oldIndex, newIndex);
      setDays((prev) =>
        prev.map((d) => (d.id === sourceDay!.id ? { ...d, items: reordered } : d))
      );
    } else {
      sourceItems.splice(oldIndex, 1);
      targetItems.splice(newIndex, 0, { ...activeItem, shoot_day_id: targetDay.id });
      setDays((prev) =>
        prev.map((d) => {
          if (d.id === sourceDay!.id) return { ...d, items: sourceItems };
          if (d.id === targetDay!.id) return { ...d, items: targetItems };
          return d;
        })
      );
    }

    // Persist to backend
    try {
      await reorderStripMutation.mutateAsync({
        strip_id: activeId,
        target_shoot_day_id: targetDay.id,
        new_order_index: `${(newIndex + 1) * 10}`,
      });
      onRefresh();
    } catch (err) {
      console.error('Failed to persist strip reordering', err);
      onRefresh();
    }
  };

  const handleDeleteStrip = async (stripId: string) => {
    try {
      await deleteStripMutation.mutateAsync(stripId);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete strip', err);
    }
  };

  const handleScheduleUnassignedScene = async (sceneId: string, shootDayId: string) => {
    try {
      await scheduleSceneMutation.mutateAsync({
        scene_id: sceneId,
        shoot_day_id: shootDayId,
      });
      onRefresh();
    } catch (err) {
      console.error('Failed to schedule scene', err);
    }
  };

  const handleGenerateCallSheet = async (shootDayId: string) => {
    try {
      await productionApi.generateCallSheet(shootDayId);
      toast.success('Processing', 'Call Sheet generation queued in background.');
    } catch (err: any) {
      toast.error('Failed to generate Call Sheet', err.message);
    }
  };

  return (
    <div className="space-y-6">
      {/* Action Header & Filter Controls */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 p-5 rounded-2xl bg-studio-900 border border-white/5 shadow-xl">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-mono font-bold text-slate-400 mr-2 uppercase tracking-wider">
            Filter View:
          </span>
          {(['ALL', 'DAY', 'NIGHT', 'INT', 'EXT'] as const).map((filter) => (
            <button
              key={filter}
              onClick={() => setFilterLight(filter)}
              className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all ${
                filterLight === filter
                  ? 'bg-sky-500 text-black shadow-md shadow-sky-500/20'
                  : 'bg-studio-950 border border-white/5 text-slate-400 hover:text-white hover:border-white/20'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsUnassignedOpen(!isUnassignedOpen)}
            className="flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold bg-studio-950 border border-white/10 text-slate-300 hover:text-white hover:border-white/20 transition-all"
          >
            <span>Unscheduled Pool ({unassigned.length})</span>
            {isUnassignedOpen ? <ChevronUp className="w-3.5 h-3.5 text-sky-400" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>

          <button
            onClick={() => setIsAddDayOpen(true)}
            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-black shadow-lg shadow-sky-500/20 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>+ Add Shoot Day</span>
          </button>
        </div>
      </div>

      {/* Unassigned Scenes Collapsible Tray */}
      <UnassignedScenesPool
        unassigned={unassigned}
        days={days}
        isOpen={isUnassignedOpen}
        onScheduleScene={handleScheduleUnassignedScene}
      />

      {/* DND Interactive Stripboard Container */}
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <div className="space-y-6">
          {days.map((day) => {
            const filteredItems = day.items.filter((it) => {
              if (it.item_type === 'BANNER') return true;
              if (filterLight === 'ALL') return true;
              if (filterLight === 'DAY') return it.time_of_day?.toUpperCase().includes('DAY');
              if (filterLight === 'NIGHT') return it.time_of_day?.toUpperCase().includes('NIGHT');
              if (filterLight === 'INT') return it.int_ext === 'INT';
              if (filterLight === 'EXT') return it.int_ext === 'EXT';
              return true;
            });

            return (
              <ShootDayCard
                key={day.id}
                day={day}
                projectId={projectId}
                filteredItems={filteredItems}
                onOpenAddBanner={(id, num) => setActiveBannerDay({ id, num })}
                onGenerateCallSheet={handleGenerateCallSheet}
                onOpenLogDpr={(id, num) => setActiveDprDay({ id, num })}
                onDeleteStrip={handleDeleteStrip}
              />
            );
          })}
        </div>
      </DndContext>

      {/* Modals */}
      <AddShootDayModal
        projectId={projectId}
        nextDayNumber={days.length + 1}
        isOpen={isAddDayOpen}
        onClose={() => setIsAddDayOpen(false)}
        onCreated={() => {
          setIsAddDayOpen(false);
          onRefresh();
        }}
      />

      {activeBannerDay && (
        <AddBannerModal
          shootDayId={activeBannerDay.id}
          dayNumber={activeBannerDay.num}
          isOpen={Boolean(activeBannerDay)}
          onClose={() => setActiveBannerDay(null)}
          onCreated={() => {
            setActiveBannerDay(null);
            onRefresh();
          }}
        />
      )}

      {activeDprDay && (
        <DprFormDrawer
          shootDayId={activeDprDay.id}
          dayNumber={activeDprDay.num}
          isOpen={Boolean(activeDprDay)}
          onClose={() => setActiveDprDay(null)}
        />
      )}
    </div>
  );
}
