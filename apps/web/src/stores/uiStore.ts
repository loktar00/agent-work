import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  activeCardId: string | null;
  setActiveCard: (id: string | null) => void;
  filterAgentId: string | null;
  setFilterAgent: (id: string | null) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  activeCardId: null,
  setActiveCard: (id) => set({ activeCardId: id }),
  filterAgentId: null,
  setFilterAgent: (id) => set({ filterAgentId: id }),
}));
