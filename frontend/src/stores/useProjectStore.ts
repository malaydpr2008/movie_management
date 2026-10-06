import { create } from 'zustand';

interface ProjectState {
  activeProjectId: string | null;
  selectedSceneId: string | null;
  activeShotId: string | null;
  sidebarCollapsed: boolean;
  rightDrawerTab: 'shots' | 'breakdown' | 'logistics';
  rightDrawerCollapsed: boolean;
  filterIntExt: string | null;
  searchQuery: string;

  // Actions
  setActiveProjectId: (id: string | null) => void;
  setSelectedSceneId: (id: string | null) => void;
  setActiveShotId: (id: string | null) => void;
  toggleSidebar: () => void;
  setSidebarCollapsed: (collapsed: boolean) => void;
  setRightDrawerTab: (tab: 'shots' | 'breakdown' | 'logistics') => void;
  toggleRightDrawer: () => void;
  setRightDrawerCollapsed: (collapsed: boolean) => void;
  setFilterIntExt: (filter: string | null) => void;
  setSearchQuery: (query: string) => void;
}

export const useProjectStore = create<ProjectState>((set) => ({
  activeProjectId: null,
  selectedSceneId: null,
  activeShotId: null,
  sidebarCollapsed: false,
  rightDrawerTab: 'shots',
  rightDrawerCollapsed: false,
  filterIntExt: null,
  searchQuery: '',

  setActiveProjectId: (id) => set({ activeProjectId: id }),
  setSelectedSceneId: (id) => set({ selectedSceneId: id }),
  setActiveShotId: (id) => set({ activeShotId: id }),
  toggleSidebar: () => set((state) => ({ sidebarCollapsed: !state.sidebarCollapsed })),
  setSidebarCollapsed: (collapsed) => set({ sidebarCollapsed: collapsed }),
  setRightDrawerTab: (tab) => set({ rightDrawerTab: tab }),
  toggleRightDrawer: () => set((state) => ({ rightDrawerCollapsed: !state.rightDrawerCollapsed })),
  setRightDrawerCollapsed: (collapsed) => set({ rightDrawerCollapsed: collapsed }),
  setFilterIntExt: (filter) => set({ filterIntExt: filter }),
  setSearchQuery: (query) => set({ searchQuery: query }),
}));
