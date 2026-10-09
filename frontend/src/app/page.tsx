"use client";

import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Film, Clapperboard, Plus, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Project } from '@/lib/api';
import { useProjects, useCreateProject } from '@/hooks/useStudio';

export default function RootHomePage() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [newProjectTitle, setNewProjectTitle] = useState('');
  const [errorMessage, setErrorMessage] = useState('');

  const router = useRouter();

  const { data: projects = [], isLoading } = useProjects();
  const createProjectMutation = useCreateProject();

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage('');
    if (newProjectTitle.trim()) {
      try {
        const data = await createProjectMutation.mutateAsync({ title: newProjectTitle });
        setIsModalOpen(false);
        setNewProjectTitle('');
        setErrorMessage('');
        router.push(`/projects/${data.id}`);
      } catch (error) {
        setErrorMessage(`Failed to create project: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    }
  };

  const handleEmergencyBypass = () => {
    if (projects.length > 0) {
      router.push(`/projects/${projects[0].id}`);
    } else {
      router.push(`/projects/00000000-0000-0000-0000-000000000000`);
    }
  };

  return (
    <div className="min-h-screen bg-studio-950 p-8 relative overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute top-0 right-0 w-[800px] h-[800px] bg-gradient-to-bl from-sky-600/10 via-indigo-600/5 to-transparent rounded-full blur-[120px] pointer-events-none" />

      <div className="max-w-6xl mx-auto space-y-12 relative z-10">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-2xl bg-studio-900 border border-white/10 shadow-lg shadow-sky-500/10">
              <Film className="w-8 h-8 text-sky-400" />
            </div>
            <div>
              <h1 className="text-3xl font-black text-white tracking-tight">CineFlow Studio</h1>
              <p className="text-slate-400 text-sm">Multi-Project Production Hub</p>
            </div>
          </div>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-lg transition-colors shadow-lg shadow-sky-500/20"
          >
            <Plus className="w-4 h-4" />
            New Project
          </button>
        </header>

        {isLoading ? (
          <div className="flex items-center justify-center py-20 text-slate-400 gap-3">
            <Loader2 className="w-6 h-6 animate-spin text-sky-500" />
            <span>Loading productions...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {projects.map((p) => (
              <Link key={p.id} href={`/projects/${p.id}/schedule`} className="group block">
                <div className="bg-studio-900/80 border border-white/10 hover:border-sky-500/40 rounded-2xl p-6 h-full flex flex-col justify-between transition-all hover:bg-studio-850 hover:shadow-xl hover:shadow-sky-500/5 hover:-translate-y-1">
                  <div className="space-y-4">
                    <div className="w-12 h-12 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold">
                      <Clapperboard className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="text-xl font-bold text-white group-hover:text-sky-300 transition-colors">
                        {p.title}
                      </h3>
                      <div className="flex items-center gap-3 mt-2 text-xs font-mono text-slate-400">
                        <span className="px-2 py-0.5 rounded bg-studio-800 border border-white/5">{p.status || 'PRE_PRODUCTION'}</span>
                        <span>{p.aspect_ratio}</span>
                        <span>{p.target_runtime_minutes}m</span>
                      </div>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
            
            {projects.length === 0 && (
              <div className="col-span-full p-12 text-center border-2 border-dashed border-white/10 rounded-2xl">
                <p className="text-slate-400 mb-4">No productions initialized.</p>
                <button
                  onClick={() => setIsModalOpen(true)}
                  className="px-6 py-3 bg-sky-500/20 text-sky-400 font-bold rounded-xl hover:bg-sky-500/30 transition-colors"
                >
                  Create Your First Project
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-studio-900 border border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden">
            <div className="p-6 space-y-6">
              <div>
                <h2 className="text-2xl font-bold text-white">Create New Project</h2>
                <p className="text-sm text-slate-400 mt-1">Initialize a new production workspace.</p>
              </div>
              <form onSubmit={handleCreateProject} className="space-y-4">
                {errorMessage && (
                  <div className="p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                    {errorMessage}
                  </div>
                )}
                <div className="space-y-2">
                  <label className="text-sm font-medium text-slate-300 block">Project Title</label>
                  <input
                    type="text"
                    value={newProjectTitle}
                    onChange={(e) => setNewProjectTitle(e.target.value)}
                    placeholder="e.g. Chronos Incident"
                    className="w-full bg-studio-950 border border-white/10 rounded-lg px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 focus:ring-1 focus:ring-sky-500 transition-all"
                    autoFocus
                  />
                </div>
                <div className="flex gap-3 justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-sm font-medium text-slate-300 hover:text-white transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={createProjectMutation.isPending || !newProjectTitle.trim()}
                    className="px-5 py-2 bg-sky-500 hover:bg-sky-400 disabled:opacity-50 text-white text-sm font-bold rounded-lg transition-colors flex items-center gap-2"
                  >
                    {createProjectMutation.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
                    Create Project
                  </button>
                </div>
                
                <div className="pt-2 text-center">
                  <button
                    type="button"
                    onClick={handleEmergencyBypass}
                    className="text-xs text-slate-500 hover:text-red-400 underline transition-colors"
                  >
                    Emergency Bypass (Skip Creation)
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
