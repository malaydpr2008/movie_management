'use client';

import React, { useState, useEffect } from 'react';
import FloatingMediaViewer from '@/components/ui/FloatingMediaViewer';
import { Paperclip } from 'lucide-react';
import { api, SceneTreeNode } from '@/lib/api';

const CATEGORIES = [
  'Cast', 'Extras', 'Props', 'Wardrobe', 'Makeup', 'Vehicles',
  'Stunts', 'SFX', 'VFX', 'Sound', 'Set Dressing', 'Special Equipment'
];

const CATEGORY_COLORS: Record<string, string> = {
  'PROPS': 'bg-purple-100 text-purple-800 border-purple-200',
  'PROP': 'bg-purple-100 text-purple-800 border-purple-200',
  'WARDROBE': 'bg-pink-100 text-pink-800 border-pink-200',
  'SFX': 'bg-orange-100 text-orange-800 border-orange-200',
  'STUNTS': 'bg-red-100 text-red-800 border-red-200',
  'VEHICLES': 'bg-green-100 text-green-800 border-green-200',
  'VFX': 'bg-blue-100 text-blue-800 border-blue-200',
  'CAST': 'bg-indigo-100 text-indigo-800 border-indigo-200',
  'EXTRAS': 'bg-teal-100 text-teal-800 border-teal-200',
  'MAKEUP': 'bg-rose-100 text-rose-800 border-rose-200',
  'SOUND': 'bg-yellow-100 text-yellow-800 border-yellow-200',
  'SET DRESSING': 'bg-amber-100 text-amber-800 border-amber-200',
  'SPECIAL EQUIPMENT': 'bg-cyan-100 text-cyan-800 border-cyan-200',
  'DEFAULT': 'bg-gray-100 text-gray-800 border-gray-200'
};

interface Element {
  id: string;
  category: string;
  name: string;
  description: string;
}

interface Props {
  projectId: string;
  sceneId?: string;
}

export default function ElementTaggingPanel({ projectId, sceneId }: Props) {
  const [elements, setElements] = useState<Element[]>([]);
  const [activeSceneId, setActiveSceneId] = useState<string>(sceneId || '');
  const [scenes, setScenes] = useState<SceneTreeNode[]>([]);
  const [category, setCategory] = useState(CATEGORIES[0]);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeMedia, setActiveMedia] = useState<{appLabel: string, modelName: string, objectId: string} | null>(null);

  useEffect(() => {
    if (!sceneId) {
      api.getProjectTree(projectId).then(tree => {
        const allScenes = tree.acts.flatMap(act => act.sequences.flatMap(seq => seq.scenes));
        setScenes(allScenes);
        if (allScenes.length > 0 && !activeSceneId) setActiveSceneId(allScenes[0].id);
      }).catch(console.error);
    } else {
      setActiveSceneId(sceneId);
    }
  }, [projectId, sceneId]);

  useEffect(() => {
    if (activeSceneId) {
      fetchElements(activeSceneId);
    }
  }, [projectId, activeSceneId]);

  const fetchElements = async (sid: string) => {
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/breakdown/projects/${projectId}/scenes/${sid}/elements`);
      if (res.ok) {
        const data = await res.json();
        setElements(data.elements || []);
      }
    } catch (err) {
      console.error("Failed to fetch elements", err);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/breakdown/projects/${projectId}/scenes/${activeSceneId}/elements`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ category, name, description })
      });

      if (res.ok) {
        const newElement = await res.json();
        setElements([...elements, newElement]);
        setName('');
        setDescription('');
      }
    } catch (err) {
      console.error("Failed to add element", err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 w-full">
      <div className="flex justify-between items-center mb-4 border-b pb-2">
        <h3 className="text-lg font-semibold text-gray-900">Manual Tagging Panel</h3>
        {!sceneId && scenes.length > 0 && (
          <select 
            value={activeSceneId}
            onChange={(e) => setActiveSceneId(e.target.value)}
            className="border border-gray-300 rounded-md text-sm p-1.5 focus:border-indigo-500 focus:ring-indigo-500"
          >
            {scenes.map(s => (
              <option key={s.id} value={s.id}>Scene {s.scene_number} - {s.int_ext} {s.set_name}</option>
            ))}
          </select>
        )}
      </div>
      
      {!activeSceneId ? (
        <p className="text-sm text-gray-500 italic text-center py-4">Select a scene to tag elements.</p>
      ) : (
      <>
      <form onSubmit={handleSubmit} className="mb-6 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
            <select 
              value={category} 
              onChange={(e) => setCategory(e.target.value)}
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            >
              {CATEGORIES.map(cat => (
                <option key={cat} value={cat}>{cat}</option>
              ))}
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-gray-700 mb-1">Element Name</label>
            <input 
              type="text" 
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
              placeholder="e.g., Quantum Briefcase"
            />
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Notes / Description (Optional)</label>
          <input 
            type="text" 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full border-gray-300 rounded-md shadow-sm focus:border-indigo-500 focus:ring-indigo-500 sm:text-sm p-2 border"
            placeholder="Additional details..."
          />
        </div>
        
        <button 
          type="submit" 
          disabled={isSubmitting}
          className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
        >
          {isSubmitting ? 'Adding...' : 'Add Element'}
        </button>
      </form>

      <div>
        <h4 className="text-sm font-medium text-gray-700 mb-3 uppercase tracking-wider">Tagged Elements ({elements.length})</h4>
        {elements.length === 0 ? (
          <p className="text-sm text-gray-500 italic text-center py-4 bg-gray-50 rounded border border-dashed border-gray-300">
            No elements tagged manually yet.
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {elements.map(el => {
              const catKey = el.category.toUpperCase();
              const colorClass = CATEGORY_COLORS[catKey] || CATEGORY_COLORS['DEFAULT'];
              return (
                <div key={el.id} className={`inline-flex flex-col border rounded-md px-3 py-2 text-sm shadow-sm relative group pr-8 ${colorClass}`}>
                  <span className="font-bold text-[10px] uppercase tracking-wide opacity-80 mb-1">{el.category}</span>
                  <span className="font-medium leading-tight">{el.name}</span>
                  {el.description && (
                    <span className="text-xs opacity-75 mt-1">{el.description}</span>
                  )}
                  <button
                    onClick={() => setActiveMedia({ appLabel: 'breakdown', modelName: 'scenebreakdownitem', objectId: el.id })}
                    className="absolute top-2 right-2 p-1 rounded-md bg-black/5 hover:bg-black/10 transition-colors"
                    title="Attach Media"
                  >
                    <Paperclip className="w-3.5 h-3.5 opacity-60 group-hover:opacity-100" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
      </>
      )}
      {activeMedia && (
        <FloatingMediaViewer
          appLabel={activeMedia.appLabel}
          modelName={activeMedia.modelName}
          objectId={activeMedia.objectId}
          onClose={() => setActiveMedia(null)}
        />
      )}
    </div>
  );
}
