"use client";

import React, { useState } from 'react';
import {
  MapPin,
  Plus,
  Compass,
  Film,
  Trash2,
  X,
  ExternalLink
} from 'lucide-react';
import Link from 'next/link';
import { api, MasterLocationDetail } from '@/lib/api';

interface LocationsTabProps {
  projectId: string;
  locations: MasterLocationDetail[];
  onRefresh: () => void;
}

export default function LocationsTab({
  projectId,
  locations,
  onRefresh,
}: LocationsTabProps) {
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [gps, setGps] = useState('');
  const [sunNotes, setSunNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setIsSubmitting(true);
    try {
      await api.createLocation({
        project_id: projectId,
        name,
        address,
        gps_coordinates: gps,
        sun_path_notes: sunNotes,
      });
      setName('');
      setAddress('');
      setGps('');
      setSunNotes('');
      setIsAddOpen(false);
      onRefresh();
    } catch (err) {
      console.error('Failed to create location', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (locId: string) => {
    if (!confirm('Are you sure you want to delete this master location?')) return;
    try {
      await api.deleteLocation(locId);
      onRefresh();
    } catch (err) {
      console.error('Failed to delete location', err);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-bold text-white">Master Locations & Stage Sets</h3>
          <p className="text-xs text-slate-400">Scouted locations with sun angles, GPS coordinates, and linked scene breakdown tags</p>
        </div>

        <button
          onClick={() => setIsAddOpen(true)}
          className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-black shadow-lg shadow-sky-500/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>+ Add Master Location</span>
        </button>
      </div>

      {/* Grid of Locations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {locations.map((loc) => (
          <div
            key={loc.id}
            className="p-6 rounded-2xl bg-studio-900 border border-white/5 shadow-xl space-y-4 flex flex-col justify-between group hover:border-sky-500/30 transition-all"
          >
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <span className="p-3 rounded-xl bg-sky-500/20 text-sky-400 border border-sky-500/30 shrink-0">
                    <MapPin className="w-5 h-5" />
                  </span>
                  <div>
                    <h4 className="font-bold text-base text-white">{loc.name}</h4>
                    {loc.address && (
                      <p className="text-xs text-slate-300 mt-0.5">{loc.address}</p>
                    )}
                    {loc.gps_coordinates && (
                      <span className="text-[11px] font-mono text-slate-500 flex items-center gap-1 mt-1">
                        <Compass className="w-3 h-3 text-sky-400" /> GPS: {loc.gps_coordinates}
                      </span>
                    )}
                  </div>
                </div>

                <button
                  onClick={() => handleDelete(loc.id)}
                  className="opacity-0 group-hover:opacity-100 p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-all"
                  title="Delete Location"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>

              {/* Sun Path & Lighting Staging */}
              {loc.sun_path_notes && (
                <div className="p-3.5 rounded-xl bg-studio-950/80 border border-white/5 text-xs text-slate-300 leading-relaxed font-sans">
                  <span className="font-bold text-amber-400 block mb-1 text-[11px] uppercase tracking-wider font-mono">
                    Sun Path & Lighting Staging:
                  </span>
                  {loc.sun_path_notes}
                </div>
              )}
            </div>

            {/* Linked Scenes */}
            <div className="pt-3 border-t border-white/5 space-y-2">
              <div className="flex items-center justify-between text-xs font-mono">
                <span className="text-slate-400 flex items-center gap-1.5 font-bold">
                  <Film className="w-3.5 h-3.5 text-sky-400" />
                  <span>Linked Scenes ({loc.linked_scenes_count})</span>
                </span>
              </div>

              {loc.linked_scenes.length === 0 ? (
                <p className="text-[11px] text-slate-600 font-mono italic">No scenes linked to this location yet</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {loc.linked_scenes.map((sc) => (
                    <Link
                      key={sc.id}
                      href={`/projects/${projectId}/scenes/${sc.id}`}
                      className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-studio-950 border border-white/10 text-xs font-mono text-slate-300 hover:text-sky-300 hover:border-sky-500/40 transition-colors"
                      title={sc.set_name}
                    >
                      <span className="font-bold text-white">#{sc.scene_number}</span>
                      <span className="text-[10px] text-slate-500">{sc.int_ext}</span>
                      <span className="text-[10px] text-slate-500">{sc.pages_display}p</span>
                      <ExternalLink className="w-2.5 h-2.5 text-sky-400 ml-0.5" />
                    </Link>
                  ))}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Add Location Modal */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-lg bg-studio-900 border border-white/10 rounded-2xl shadow-2xl overflow-hidden">
            <div className="flex items-center justify-between p-5 border-b border-white/5 bg-studio-950/60">
              <div className="flex items-center gap-2.5">
                <span className="w-8 h-8 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-sm">
                  <MapPin className="w-4 h-4" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-white">Add Master Location</h3>
                  <p className="text-xs text-slate-400">Register physical shooting venue or soundstage</p>
                </div>
              </div>
              <button
                onClick={() => setIsAddOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreate} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                  Location Name *
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Sector 7 Industrial Rooftop"
                  className="w-full bg-studio-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                    Physical Address
                  </label>
                  <input
                    type="text"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. Pier 44 Warehouse District"
                    className="w-full bg-studio-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                    GPS Coordinates
                  </label>
                  <input
                    type="text"
                    value={gps}
                    onChange={(e) => setGps(e.target.value)}
                    placeholder="e.g. 37.7812 N, 122.3887 W"
                    className="w-full bg-studio-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-mono uppercase tracking-wider text-slate-300 mb-1.5">
                  Sun Path & Lighting Staging Notes
                </label>
                <textarea
                  rows={3}
                  value={sunNotes}
                  onChange={(e) => setSunNotes(e.target.value)}
                  placeholder="e.g. Full 360 horizon. Blue hour sunset window at 19:42 to 20:15. Rain towers required."
                  className="w-full bg-studio-950 border border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-sky-500"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/5">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold bg-sky-500 hover:bg-sky-400 text-black shadow-lg shadow-sky-500/20 transition-all disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : 'Add Location'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
