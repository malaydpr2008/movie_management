"use client";

import React, { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Header } from '@/components/navigation/Header';
import { SubHeaderBar } from '@/components/navigation/SubHeaderBar';
import { NarrativeTreeNavigator } from '@/components/navigation/NarrativeTreeNavigator';
import { useProjectStore } from '@/stores/useProjectStore';
import { WebSocketProvider } from '@/providers/WebSocketProvider';
import AIChatWidget from '@/components/studio/AIChatWidget';
import { BreakdownReviewModal } from '@/components/studio/BreakdownReviewModal';

export default function ProjectLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: { projectId: string };
}) {
  const { projectId } = params;
  const { setActiveProjectId } = useProjectStore();

  const router = useRouter();

  useEffect(() => {
    setActiveProjectId(projectId);
  }, [projectId, setActiveProjectId]);

  const { data: projectTree, refetch, isError, isLoading } = useQuery({
    queryKey: ['projectTree', projectId],
    queryFn: () => api.getProjectTree(projectId),
    enabled: Boolean(projectId),
    retry: false,
  });

  useEffect(() => {
    if (isError) {
      router.push('/');
    }
  }, [isError, router]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-studio-950 flex items-center justify-center text-slate-400 font-mono text-sm gap-3">
        <div className="w-4 h-4 border-2 border-sky-400 border-t-transparent rounded-full animate-spin" />
        <span>Loading production workspace...</span>
      </div>
    );
  }

  if (isError) return null;

  return (
    <WebSocketProvider>
      <div className="flex flex-col min-h-screen bg-studio-950 text-slate-100 selection:bg-sky-500/20">
        {/* Top Header */}
        <Header projectId={projectId} projectTree={projectTree} onRefresh={() => refetch()} />

        {/* Sub-Header Horizontal Workspace Tabs */}
        <SubHeaderBar projectId={projectId} />

        {/* Body with Persistent Left Narrative Tree Navigator & Main Workspace */}
        <div className="flex-1 flex min-w-0 overflow-hidden">
          {/* Left Persistent Tree Navigator */}
          <NarrativeTreeNavigator
            projectId={projectId}
            projectTree={projectTree}
            onRefresh={() => refetch()}
          />

          {/* Active Workspace Main Viewport */}
          <main className="flex-1 overflow-auto bg-studio-950">
            {children}
          </main>
        </div>
        
        {/* Persistent Floating Chat Widget */}
        <AIChatWidget projectId={projectId} />
        
        {/* Breakdown Review Modal */}
        <BreakdownReviewModal projectId={projectId} />
      </div>
    </WebSocketProvider>
  );
}
