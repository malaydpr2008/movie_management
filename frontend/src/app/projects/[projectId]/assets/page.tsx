"use client";

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { Image as ImageIcon, Loader2 } from 'lucide-react';

export default function AssetsPage({ params }: { params: { projectId: string } }) {
  const { projectId } = params;
  const [filter, setFilter] = useState('All');

  const { data: summary, isLoading } = useQuery({
    queryKey: ['breakdownSummary', projectId],
    queryFn: () => api.getBreakdownSummary(projectId),
  });

  const { data: vfxShots = [] } = useQuery({
    queryKey: ['vfx', projectId],
    queryFn: () => api.getVfxShots(projectId),
  });

  const { data: tree } = useQuery({
    queryKey: ['projectTree', projectId],
    queryFn: () => api.getProjectTree(projectId),
  });

  // Extract all assets
  const assets: any[] = [];

  // Extract Costumes
  summary?.characters?.forEach(char => {
    char.looks?.forEach(look => {
      assets.push({
        id: look.id,
        type: 'Costumes',
        url: look.continuity_photo_url || `https://picsum.photos/seed/costume${look.id}/400/600`, // fallback for demo
        title: look.description,
        subtitle: `Character: ${char.name}`,
      });
    });
  });

  // Extract VFX Plates (Mock image based on VFX ID)
  vfxShots?.forEach(shot => {
    assets.push({
      id: shot.id,
      type: 'VFX Plates',
      url: `https://picsum.photos/seed/vfx${shot.id}/800/400`,
      title: shot.vfx_id,
      subtitle: `Vendor: ${shot.vendor_name || 'In-House'}`,
    });
  });

  // Extract Locations (Mock image)
  summary?.locations?.forEach(loc => {
    assets.push({
      id: loc.id,
      type: 'Locations',
      url: `https://picsum.photos/seed/loc${loc.id}/600/400`,
      title: loc.name,
      subtitle: loc.address || 'Location',
    });
  });

  // Extract Storyboards from Scene setups
  tree?.acts?.forEach(act => {
    act.sequences?.forEach(seq => {
      seq.scenes?.forEach(scene => {
        scene.camera_setups?.forEach(setup => {
          setup.shots?.forEach(shot => {
            if (shot.storyboard_frame_url) {
              assets.push({
                id: shot.id,
                type: 'Storyboards',
                url: shot.storyboard_frame_url,
                title: `Shot ${setup.setup_code}${shot.shot_code}`,
                subtitle: `Scene ${scene.scene_number}`,
              });
            } else {
              // demo fallback
              assets.push({
                id: shot.id,
                type: 'Storyboards',
                url: `https://picsum.photos/seed/shot${shot.id}/800/450`,
                title: `Shot ${setup.setup_code}${shot.shot_code}`,
                subtitle: `Scene ${scene.scene_number}`,
              });
            }
          });
        });
      });
    });
  });

  const filteredAssets = filter === 'All' ? assets : assets.filter(a => a.type === filter);
  const tabs = ['All', 'Storyboards', 'Locations', 'Costumes', 'VFX Plates'];

  return (
    <div className="flex-1 flex flex-col h-full bg-studio-950 text-white overflow-hidden">
      <div className="flex-shrink-0 p-6 border-b border-white/10 bg-studio-950 sticky top-0 z-10 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black uppercase tracking-tight flex items-center gap-2 text-indigo-400">
            <ImageIcon className="w-6 h-6" />
            Media Asset Manager
          </h1>
          <p className="text-slate-400 text-sm">Unified gallery for storyboards, location scouts, and VFX plates.</p>
        </div>
        <div className="flex bg-studio-900 border border-white/10 rounded-lg p-1">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={`px-4 py-1.5 text-sm font-bold rounded-md transition-colors ${filter === tab ? 'bg-indigo-500 text-white' : 'text-slate-400 hover:text-white'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-500" />
            <span>Loading assets...</span>
          </div>
        ) : filteredAssets.length === 0 ? (
          <div className="text-center py-20 text-slate-500">No assets found for this category.</div>
        ) : (
          <div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
            {filteredAssets.map(asset => (
              <div key={asset.id} className="relative group break-inside-avoid rounded-xl overflow-hidden bg-studio-900 border border-white/5 cursor-pointer">
                <img src={asset.url} alt={asset.title} className="w-full object-cover transition-transform duration-500 group-hover:scale-105" loading="lazy" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex flex-col justify-end p-4">
                  <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider mb-1">{asset.type}</span>
                  <h3 className="text-white font-bold text-lg leading-tight">{asset.title}</h3>
                  <p className="text-slate-300 text-xs mt-1">{asset.subtitle}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
