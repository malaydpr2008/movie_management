"use client";

import React, { useState } from 'react';
import {
  CalendarDays,
  Clock,
  MapPin,
  Coffee,
  Truck,
  Plus,
  Trash2,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  GripVertical,
  Flame,
  Wand2,
  FileDown
} from 'lucide-react';
import Link from 'next/link';
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
} from '@dnd-kit/core';
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  api,
  ScheduleData,
  ShootDayDetail,
  StripboardItemDetail,
  UnassignedScene
} from '@/lib/api';
import AddShootDayModal from './AddShootDayModal';
import AddBannerModal from './AddBannerModal';
import { toast } from '@/stores/useToastStore';

interface StripboardViewProps {
  projectId: string;
  schedule: ScheduleData;
  onRefresh: () => void;
}

// Strip color styles matching Hollywood call sheet conventions
function getStripColorClass(intExt?: string, timeOfDay?: string) {
  const isInt = intExt?.toUpperCase().includes('INT');
  const isNight = timeOfDay?.toUpperCase().includes('NIGHT');

  if (isInt && !isNight) {
    // INT DAY: Warm Golden Yellow
    return 'bg-amber-950/25 border-amber-500/30 text-amber-200 hover:border-amber-400/50';
  } else if (isInt && isNight) {
    // INT NIGHT: Rich Cobalt Blue
    return 'bg-blue-950/25 border-blue-500/30 text-blue-200 hover:border-blue-400/50';
  } else if (!isInt && !isNight) {
    // EXT DAY: Forest Green
    return 'bg-emerald-950/25 border-emerald-500/30 text-emerald-200 hover:border-emerald-400/50';
  } else {
    // EXT NIGHT: Midnight Navy / Obsidian
    return 'bg-slate-900 border-indigo-500/40 text-indigo-200 hover:border-indigo-400/60';
  }
}

function SortableStripItem({
  item,
  dayId,
  projectId,
  onDelete,
}: {
  item: StripboardItemDetail;
  dayId: string;
  projectId: string;
  onDelete: (stripId: string) => void;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    data: { item, dayId },
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : 1,
  };

  if (item.item_type === 'BANNER') {
    const isLunch = item.banner_label.toLowerCase().includes('lunch');
    const isMove = item.banner_label.toLowerCase().includes('move');

    return (
      <div
        ref={setNodeRef}
        style={style}
        className={`group p-2.5 rounded-xl border text-xs font-mono font-bold tracking-wider uppercase flex items-center justify-between gap-3 shadow-md ${
          isLunch
            ? 'bg-amber-950/40 border-amber-500/30 text-amber-300'
            : isMove
            ? 'bg-purple-950/40 border-purple-500/30 text-purple-300'
            : 'bg-studio-850 border-white/10 text-slate-300'
        }`}
      >
        <div className="flex items-center gap-2">
          <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-white p-0.5">
            <GripVertical className="w-3.5 h-3.5" />
          </div>
          {isLunch && <Coffee className="w-3.5 h-3.5 text-amber-400" />}
          {isMove && <Truck className="w-3.5 h-3.5 text-purple-400" />}
          <span>{item.banner_label}</span>
        </div>

        <button
          onClick={() => onDelete(item.id)}
          className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-400 transition-opacity"
          title="Remove Banner"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  }

  // Scene Strip
  const stripColor = getStripColorClass(item.int_ext, item.time_of_day);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`group p-3 rounded-xl border shadow-sm transition-all flex items-center justify-between gap-3 ${stripColor}`}
    >
      <div className="flex items-center gap-2.5 min-w-0">
        <div {...attributes} {...listeners} className="cursor-grab active:cursor-grabbing text-slate-500 hover:text-white p-0.5 shrink-0">
          <GripVertical className="w-4 h-4" />
        </div>

        <span className="font-mono font-black text-xs px-2 py-0.5 rounded bg-black/40 border border-white/10 shrink-0 text-white">
          #{item.scene_number}
        </span>

        <span className="font-mono font-bold text-[10px] px-1.5 py-0.5 rounded bg-white/10 uppercase shrink-0">
          {item.int_ext}
        </span>

        <span className="font-bold text-xs truncate text-white">{item.set_name}</span>

        <span className="font-mono text-[10px] px-1.5 py-0.5 rounded bg-black/30 uppercase text-slate-300 shrink-0">
          {item.time_of_day}
        </span>

        {/* Cast ID Pills */}
        {item.cast_ids && item.cast_ids.length > 0 && (
          <div className="hidden sm:flex items-center gap-1 shrink-0">
            <span className="text-[10px] font-mono text-slate-400">Cast:</span>
            {item.cast_ids.map((cid) => (
              <span
                key={cid}
                className="w-4 h-4 rounded-full bg-sky-500/20 text-sky-300 font-mono text-[10px] font-bold flex items-center justify-center border border-sky-500/30"
              >
                {cid}
              </span>
            ))}
          </div>
        )}

        {/* Flags */}
        <div className="hidden md:flex items-center gap-1 shrink-0">
          {item.has_stunts && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30 flex items-center gap-0.5">
              <Flame className="w-2.5 h-2.5" /> STUNT
            </span>
          )}
          {item.has_vfx && (
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center gap-0.5">
              <Wand2 className="w-2.5 h-2.5" /> VFX
            </span>
          )}
        </div>
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <span className="font-mono font-bold text-xs text-slate-300">
          {item.pages_display} pgs
        </span>

        {item.scene_id && (
          <Link
            href={`/projects/${projectId}/scenes/${item.scene_id}`}
            className="p-1 rounded text-slate-400 hover:text-sky-400 hover:bg-white/5 transition-colors"
            title="Open Scene Studio"
          >
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        )}

        <button
          onClick={() => onDelete(item.id)}
          className="opacity-0 group-hover:opacity-100 p-1 text-slate-500 hover:text-rose-400 transition-opacity"
          title="Unschedule Scene"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
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

  // Sync internal state with props if refreshed externally
  React.useEffect(() => {
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
      await api.reorderStrip({
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
      await api.deleteStrip(stripId);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete strip', err);
    }
  };

  const handleScheduleUnassignedScene = async (sceneId: string, shootDayId: string) => {
    try {
      await api.scheduleSceneStrip({
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
      await api.generateCallSheet(shootDayId);
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
      {isUnassignedOpen && unassigned.length > 0 && (
        <div className="p-5 rounded-2xl bg-amber-950/20 border border-amber-500/30 space-y-3 animate-fade-in">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse" />
              <h4 className="text-xs font-mono font-black uppercase tracking-wider text-amber-300">
                Unassigned Scenes Waiting For Call Scheduling ({unassigned.length})
              </h4>
            </div>
            <span className="text-[11px] text-slate-400">
              Select target shoot day to schedule strip
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-2.5 max-h-64 overflow-y-auto pr-1">
            {unassigned.map((sc) => (
              <div
                key={sc.id}
                className="p-3 rounded-xl bg-studio-950 border border-white/5 hover:border-amber-500/30 transition-all flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono font-black text-xs text-white">#{sc.scene_number}</span>
                    <span className="text-[10px] font-mono px-1 rounded bg-white/10 text-slate-300">{sc.int_ext}</span>
                    <span className="text-[10px] font-mono text-slate-400">{sc.time_of_day}</span>
                  </div>
                  <p className="text-xs font-bold text-slate-200 truncate mt-0.5">{sc.set_name}</p>
                  <p className="text-[11px] font-mono text-slate-400">{sc.pages_display} pgs • {sc.estimated_shoot_minutes}m</p>
                </div>

                <div className="shrink-0 flex items-center gap-1.5">
                  <select
                    defaultValue=""
                    onChange={(e) => {
                      if (e.target.value) {
                        handleScheduleUnassignedScene(sc.id, e.target.value);
                      }
                    }}
                    className="bg-studio-900 border border-white/15 rounded-lg px-2 py-1 text-[11px] font-mono text-sky-400 focus:outline-none"
                  >
                    <option value="" disabled>+ Day...</option>
                    {days.map((d) => (
                      <option key={d.id} value={d.id}>
                        Day {d.day_number}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

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
              <div
                key={day.id}
                className="rounded-2xl bg-studio-900 border border-white/10 shadow-2xl overflow-hidden"
              >
                {/* Shoot Day Header Banner */}
                <div className="p-4 bg-studio-950/80 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <span className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-500 to-sky-500 text-black font-black font-mono flex items-center justify-center text-sm shadow-md">
                      D{day.day_number}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-black text-sm text-white tracking-wide uppercase">
                          Day {day.day_number} &bull; {day.calendar_date}
                        </h3>
                        <span className="font-mono text-[10px] px-2 py-0.5 rounded-full bg-sky-500/10 text-sky-400 border border-sky-500/20">
                          {day.unit_name}
                        </span>
                      </div>
                      {day.hospital_address && (
                        <p className="text-[11px] text-rose-400/80 flex items-center gap-1 mt-0.5 font-mono">
                          <MapPin className="w-3 h-3 shrink-0" /> {day.hospital_address}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Production Math & Call Badges */}
                  <div className="flex flex-wrap items-center gap-3 font-mono text-xs">
                    <span className="px-3 py-1 rounded-xl bg-studio-900 border border-white/10 text-sky-300 font-bold">
                      {day.total_pages_display} &bull; {day.total_estimated_shoot_minutes} mins ({day.scene_count} scenes)
                    </span>

                    {day.general_crew_call && (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-studio-900 border border-white/10 text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-sky-400" />
                        <span>Crew: {day.general_crew_call}</span>
                      </span>
                    )}

                    {day.shooting_call && (
                      <span className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-studio-900 border border-white/10 text-slate-300">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Shoot: {day.shooting_call}</span>
                      </span>
                    )}

                    <button
                      onClick={() => setActiveBannerDay({ id: day.id, num: day.day_number })}
                      className="px-2.5 py-1 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 hover:bg-amber-500/25 transition-all text-xs font-bold"
                    >
                      + Banner
                    </button>

                    <button
                      onClick={() => handleGenerateCallSheet(day.id)}
                      title="Generate Call Sheet"
                      className="px-2.5 py-1 flex items-center gap-1.5 rounded-xl bg-purple-500/15 border border-purple-500/30 text-purple-300 hover:bg-purple-500/25 transition-all text-xs font-bold"
                    >
                      <FileDown className="w-3.5 h-3.5" />
                      Call Sheet
                    </button>
                  </div>
                </div>

                {/* Sortable Strips List */}
                <SortableContext
                  id={day.id}
                  items={filteredItems.map((it) => it.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="p-3.5 space-y-2 min-h-[90px] bg-studio-950/30">
                    {filteredItems.length === 0 ? (
                      <div className="p-6 text-center text-xs font-mono text-slate-500 border border-dashed border-white/5 rounded-xl">
                        No scenes or banners scheduled for Day {day.day_number}. Drag strips here or schedule from unscheduled pool.
                      </div>
                    ) : (
                      filteredItems.map((item) => (
                        <SortableStripItem
                          key={item.id}
                          item={item}
                          dayId={day.id}
                          projectId={projectId}
                          onDelete={handleDeleteStrip}
                        />
                      ))
                    )}
                  </div>
                </SortableContext>
              </div>
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
    </div>
  );
}
