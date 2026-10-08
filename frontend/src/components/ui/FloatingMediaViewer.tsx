"use client";

import React, { useState, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { X, UploadCloud, FileText, Music, Image as ImageIcon, Loader2 } from 'lucide-react';
import { api, MediaAsset } from '@/lib/api';

interface FloatingMediaViewerProps {
  appLabel: string;
  modelName: string;
  objectId: string;
  title?: string;
  onClose: () => void;
}

export default function FloatingMediaViewer({
  appLabel,
  modelName,
  objectId,
  title = "Attached Media",
  onClose
}: FloatingMediaViewerProps) {
  const queryClient = useQueryClient();
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const queryKey = ['mediaAssets', appLabel, modelName, objectId];

  const { data: assets = [], isLoading } = useQuery<MediaAsset[]>({
    queryKey,
    queryFn: () => api.getMediaAssets(appLabel, modelName, objectId),
    enabled: Boolean(objectId),
  });

  const uploadMedia = async (file: File) => {
    setIsUploading(true);
    try {
      await api.uploadMedia(appLabel, modelName, objectId, file);
      queryClient.invalidateQueries({ queryKey });
    } catch (err) {
      console.error(err);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await uploadMedia(file);
    }
  }, [appLabel, modelName, objectId]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      await uploadMedia(e.target.files[0]);
    }
  };

  const renderThumbnail = (asset: MediaAsset) => {
    const url = asset.file_url.startsWith('http') ? asset.file_url : `${process.env.NEXT_PUBLIC_API_URL}${asset.file_url}`;
    
    if (asset.file_type === 'IMAGE') {
      return <img src={url} alt="Media" className="w-full h-full object-cover" />;
    } else if (asset.file_type === 'AUDIO') {
      return <div className="w-full h-full flex flex-col items-center justify-center bg-indigo-500/20 text-indigo-400"><Music className="w-8 h-8 mb-2" /><span className="text-[10px] font-bold">AUDIO</span></div>;
    } else if (asset.file_type === 'PDF') {
      return <div className="w-full h-full flex flex-col items-center justify-center bg-red-500/20 text-red-400"><FileText className="w-8 h-8 mb-2" /><span className="text-[10px] font-bold">PDF</span></div>;
    }
    
    return <div className="w-full h-full flex flex-col items-center justify-center bg-slate-500/20 text-slate-400"><ImageIcon className="w-8 h-8 mb-2" /><span className="text-[10px] font-bold">FILE</span></div>;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-4xl max-h-[85vh] flex flex-col bg-studio-950/90 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-white/5 bg-white/[0.02]">
          <h2 className="text-sm font-black text-white tracking-tight flex items-center gap-2">
            <ImageIcon className="w-4 h-4 text-sky-400" />
            {title}
          </h2>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Upload Zone (conditionally overlay if dragging) */}
        {isDragging && (
          <div className="absolute inset-0 z-10 bg-sky-500/10 backdrop-blur-sm border-2 border-dashed border-sky-400 flex flex-col items-center justify-center m-4 rounded-xl">
            <UploadCloud className="w-16 h-16 text-sky-400 animate-bounce mb-4" />
            <span className="text-lg font-bold text-sky-300">Drop file to upload</span>
          </div>
        )}

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="h-48 flex items-center justify-center">
              <Loader2 className="w-8 h-8 text-sky-500 animate-spin" />
            </div>
          ) : assets.length === 0 ? (
            <div className="h-64 flex flex-col items-center justify-center text-slate-500 border-2 border-dashed border-white/5 rounded-xl">
              <UploadCloud className="w-12 h-12 opacity-50 mb-3" />
              <p className="text-sm font-medium">No media attached.</p>
              <p className="text-xs mt-1">Drag and drop a file, or click below to upload.</p>
              
              <label className="mt-4 px-4 py-2 bg-white/5 hover:bg-white/10 border border-white/10 rounded-lg text-xs font-bold text-white cursor-pointer transition-colors">
                Browse Files
                <input type="file" className="hidden" onChange={handleFileSelect} />
              </label>
            </div>
          ) : (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {assets.map((asset) => (
                <div key={asset.id} className="group relative aspect-square bg-black border border-white/10 rounded-xl overflow-hidden shadow-md">
                  {renderThumbnail(asset)}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-3">
                    <div className="w-full flex justify-between items-center">
                      <span className="text-[10px] font-mono text-slate-300 truncate pr-2">
                        {new Date(asset.uploaded_at).toLocaleDateString()}
                      </span>
                      <a href={asset.file_url.startsWith('http') ? asset.file_url : `${process.env.NEXT_PUBLIC_API_URL}${asset.file_url}`} target="_blank" rel="noreferrer" className="text-[10px] font-bold text-sky-400 hover:text-sky-300">
                        View
                      </a>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Quick Upload Tile */}
              <label className="aspect-square flex flex-col items-center justify-center bg-white/5 hover:bg-white/10 border-2 border-dashed border-white/10 rounded-xl cursor-pointer transition-colors group">
                {isUploading ? (
                  <Loader2 className="w-8 h-8 text-sky-400 animate-spin mb-2" />
                ) : (
                  <>
                    <UploadCloud className="w-8 h-8 text-slate-400 group-hover:text-sky-400 transition-colors mb-2" />
                    <span className="text-xs font-bold text-slate-400 group-hover:text-white transition-colors">Upload Media</span>
                  </>
                )}
                <input type="file" className="hidden" disabled={isUploading} onChange={handleFileSelect} />
              </label>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
