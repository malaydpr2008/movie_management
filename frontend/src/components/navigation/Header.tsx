"use client";

import React from 'react';
import Link from 'next/link';
import {
  Film,
  Search,
  ExternalLink,
  RefreshCw,
  ChevronRight,
  ChevronDown
} from 'lucide-react';
import { useProjectStore } from '@/stores/useProjectStore';
import { ProjectTree } from '@/lib/types';
import { useProjects } from '@/hooks/useStudio';

interface HeaderProps {
  projectId: string;
  projectTree?: ProjectTree;
  onRefresh?: () => void;
}

export function Header({ projectId, projectTree, onRefresh }: HeaderProps) {
  const { searchQuery, setSearchQuery, filterIntExt, setFilterIntExt } = useProjectStore();
  const [isDropdownOpen, setIsDropdownOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  const { data: projects = [] } = useProjects();

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <header className="h-14 px-5 bg-studio-900/90 backdrop-blur-md border-b border-white/5 flex items-center justify-between gap-4 sticky top-0 z-30 shrink-0">
      {/* Brand & Breadcrumbs */}
      <div className="flex items-center gap-3 min-w-0">
        <Link href={`/projects/${projectId}`} className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-sky-500 via-indigo-500 to-amber-500 p-0.5 shrink-0 shadow-md shadow-sky-500/10">
            <div className="w-full h-full bg-studio-950 rounded-[6px] flex items-center justify-center">
              <Film className="w-4 h-4 text-sky-400 group-hover:scale-110 transition-transform" />
            </div>
          </div>
          <span className="font-black text-xs tracking-wider uppercase text-white flex items-center gap-1.5">
            CINEFLOW <span className="text-[10px] font-bold px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-400 border border-sky-500/30">PRO</span>
          </span>
        </Link>

        <span className="text-slate-700">|</span>

        <span className="flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded-full shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
          LIVE PROD
        </span>

        <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />

        <div className="relative flex items-center gap-2" ref={dropdownRef}>
          <button 
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="flex items-center gap-1.5 hover:bg-studio-800 px-2 py-1 rounded transition-colors"
          >
            <h1 className="text-xs font-bold text-white tracking-wide truncate max-w-xs">
              {projectTree?.title || "Loading..."}
            </h1>
            <ChevronDown className={`w-3.5 h-3.5 text-slate-400 transition-transform ${isDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isDropdownOpen && (
            <div className="absolute top-full left-0 mt-1 w-64 bg-studio-900 border border-white/10 rounded-xl shadow-xl overflow-hidden py-1 z-50">
              <div className="px-3 py-2 border-b border-white/5 bg-studio-950">
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Switch Project</span>
              </div>
              <div className="max-h-64 overflow-y-auto">
                {projects.map((p) => (
                  <Link
                    key={p.id}
                    href={`/projects/${p.id}/schedule`}
                    onClick={() => setIsDropdownOpen(false)}
                    className={`block px-4 py-2.5 text-sm hover:bg-studio-800 transition-colors ${p.id === projectId ? 'bg-sky-500/10 text-sky-400 font-bold' : 'text-slate-300'}`}
                  >
                    {p.title}
                  </Link>
                ))}
              </div>
              <div className="border-t border-white/5 p-2">
                <Link
                  href="/"
                  className="block w-full text-center px-2 py-1.5 text-xs font-medium text-sky-400 hover:bg-sky-500/10 rounded transition-colors"
                >
                  View All Projects Hub
                </Link>
              </div>
            </div>
          )}
        </div>

        {projectTree?.aspect_ratio && (
          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-studio-800 text-slate-400 border border-white/5 shrink-0 hidden sm:inline-block">
            {projectTree.aspect_ratio}
          </span>
        )}
      </div>

      {/* Search, Filter & Links */}
      <div className="flex items-center gap-3">
        <div className="relative w-56 hidden md:block">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search scenes, sluglines..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-8 pr-3 py-1 bg-studio-950/80 border border-white/10 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500 transition-colors font-mono"
          />
        </div>

        {/* INT / EXT filter */}
        <div className="hidden lg:flex items-center bg-studio-950 p-0.5 rounded-lg border border-white/5 text-xs">
          <button
            onClick={() => setFilterIntExt(null)}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              filterIntExt === null ? 'bg-studio-800 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            All
          </button>
          <button
            onClick={() => setFilterIntExt('INT')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              filterIntExt === 'INT' ? 'bg-sky-500/20 text-sky-300' : 'text-slate-400 hover:text-white'
            }`}
          >
            INT
          </button>
          <button
            onClick={() => setFilterIntExt('EXT')}
            className={`px-2 py-0.5 rounded text-[11px] font-medium transition-colors ${
              filterIntExt === 'EXT' ? 'bg-amber-500/20 text-amber-300' : 'text-slate-400 hover:text-white'
            }`}
          >
            EXT
          </button>
        </div>

        {onRefresh && (
          <button
            onClick={onRefresh}
            title="Refresh narrative data"
            className="p-1.5 rounded-lg bg-studio-850 hover:bg-studio-800 text-slate-400 hover:text-white border border-white/5 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>
        )}

        <a
          href="http://localhost:8000/api/docs"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-studio-850 hover:bg-studio-800 border border-white/10 text-[11px] font-semibold text-slate-300 hover:text-white transition-colors shrink-0"
        >
          <span>API Docs</span>
          <ExternalLink className="w-3 h-3 text-slate-400" />
        </a>
      </div>
    </header>
  );
}
