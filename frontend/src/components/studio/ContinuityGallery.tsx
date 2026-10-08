"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Camera, Image as ImageIcon, Upload, CheckCircle, XCircle, BrainCircuit } from 'lucide-react';
import { api, ContinuityPhoto } from '@/lib/api';

const CATEGORIES = [
  { value: 'CAST', label: 'Cast', color: 'bg-blue-500/20 text-blue-300' },
  { value: 'PROPS', label: 'Props', color: 'bg-purple-500/20 text-purple-300' },
  { value: 'WARDROBE', label: 'Wardrobe', color: 'bg-pink-500/20 text-pink-300' },
  { value: 'VFX', label: 'VFX', color: 'bg-cyan-500/20 text-cyan-300' },
  { value: 'SFX', label: 'SFX', color: 'bg-orange-500/20 text-orange-300' },
  { value: 'STUNTS', label: 'Stunts', color: 'bg-red-500/20 text-red-300' },
  { value: 'VEHICLES', label: 'Vehicles', color: 'bg-yellow-500/20 text-yellow-300' },
  { value: 'SOUND', label: 'Sound', color: 'bg-emerald-500/20 text-emerald-300' },
  { value: 'SET_DRESSING', label: 'Set Dressing', color: 'bg-amber-500/20 text-amber-300' }
];

export default function ContinuityGallery({ projectId, sceneId }: { projectId: string; sceneId: string }) {
  const queryClient = useQueryClient();
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState('PROPS');
  const [description, setDescription] = useState('');
  const [isUploading, setIsUploading] = useState(false);

  const { data: photos = [], isLoading } = useQuery<ContinuityPhoto[]>({
    queryKey: ['continuityPhotos', sceneId],
    queryFn: () => api.getContinuityPhotos(sceneId),
    enabled: Boolean(sceneId),
  });

  const toggleVerifyMut = useMutation({
    mutationFn: (photoId: string) => api.toggleContinuityPhotoVerify(photoId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['continuityPhotos', sceneId] });
    }
  });

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;
    setIsUploading(true);
    try {
      await api.uploadContinuityPhoto(projectId, sceneId, file, category, description);
      queryClient.invalidateQueries({ queryKey: ['continuityPhotos', sceneId] });
      setFile(null);
      setDescription('');
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const getCategoryColor = (catValue: string) => {
    const cat = CATEGORIES.find(c => c.value === catValue);
    return cat ? cat.color : 'bg-slate-500/20 text-slate-300';
  };

  const getCategoryLabel = (catValue: string) => {
    const cat = CATEGORIES.find(c => c.value === catValue);
    return cat ? cat.label : catValue;
  };

  return (
    <div className="flex flex-col h-full bg-studio-950 border border-white/5 rounded-2xl overflow-hidden shadow-2xl relative">
      <div className="p-5 bg-studio-900/90 backdrop-blur-md border-b border-white/10 shadow-lg flex items-center justify-between">
        <h3 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
          <Camera className="w-4 h-4 text-sky-400" />
          Semantic Continuity Vault
        </h3>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-bold hover:bg-sky-500/30 transition-colors">
          <BrainCircuit className="w-3.5 h-3.5" />
          Run AI Audit
        </button>
      </div>

      <div className="p-5 border-b border-white/5 bg-white/[0.02]">
        <form onSubmit={handleUpload} className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-3">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Upload Photo</label>
            <input 
              type="file" 
              accept="image/*"
              onChange={(e) => setFile(e.target.files ? e.target.files[0] : null)}
              className="w-full bg-studio-900 border border-white/10 rounded-lg px-3 py-2 text-xs text-slate-300 file:mr-3 file:py-1 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-bold file:bg-sky-500/20 file:text-sky-300 hover:file:bg-sky-500/30 transition-all cursor-pointer"
              required
            />
          </div>
          <div className="md:col-span-3">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Category</label>
            <select 
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-studio-900 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white"
            >
              {CATEGORIES.map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
            </select>
          </div>
          <div className="md:col-span-4">
            <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Description / Notes</label>
            <input 
              type="text" 
              placeholder="e.g. Hero watch set to 10:04"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-studio-900 border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white"
            />
          </div>
          <div className="md:col-span-2">
            <button 
              type="submit" 
              disabled={isUploading || !file}
              className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-bold transition-colors"
            >
              {isUploading ? 'Uploading...' : (
                <>
                  <Upload className="w-3.5 h-3.5" /> Save
                </>
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {isLoading ? (
          <div className="h-full flex items-center justify-center">
            <span className="text-xs font-mono text-slate-500 animate-pulse">Loading Continuity Vault...</span>
          </div>
        ) : photos.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 gap-3">
            <ImageIcon className="w-12 h-12 opacity-20" />
            <p className="text-xs font-mono">No photos uploaded for this scene.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
            {photos.map((photo) => (
              <div key={photo.id} className="bg-studio-900 border border-white/10 rounded-xl overflow-hidden shadow-lg flex flex-col group">
                <div className="relative aspect-video bg-black flex items-center justify-center overflow-hidden">
                  <img src={photo.image_url.startsWith('http') ? photo.image_url : `${process.env.NEXT_PUBLIC_API_URL}${photo.image_url}`} alt={photo.description} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                  <div className="absolute top-2 left-2 flex items-center gap-2">
                    <span className={`px-2 py-1 rounded text-[10px] font-bold shadow-sm backdrop-blur-md ${getCategoryColor(photo.category)}`}>
                      {getCategoryLabel(photo.category)}
                    </span>
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col gap-3">
                  <p className="text-xs text-slate-300 leading-relaxed flex-1">
                    {photo.description || <span className="text-slate-600 italic">No description</span>}
                  </p>
                  
                  <div className="flex items-center justify-between pt-3 border-t border-white/5">
                    <button 
                      onClick={() => toggleVerifyMut.mutate(photo.id)}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        photo.is_verified
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-red-500/20 text-red-400 border border-red-500/30 hover:bg-red-500/30'
                      }`}
                    >
                      {photo.is_verified ? (
                        <><CheckCircle className="w-3.5 h-3.5" /> Verified</>
                      ) : (
                        <><XCircle className="w-3.5 h-3.5" /> Unverified</>
                      )}
                    </button>
                    <span className="text-[10px] font-mono text-slate-500">
                      {new Date(photo.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
