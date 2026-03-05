import { create } from 'zustand';

interface UIState {
  sidebarOpen: boolean;
  toggleSidebar: () => void;
  activeCardId: string | null;
  setActiveCard: (id: string | null) => void;
  filterAgentId: string | null;
  setFilterAgent: (id: string | null) => void;
  boardChatOpen: boolean;
  boardChatHeight: number;
  toggleBoardChat: () => void;
  setBoardChatHeight: (h: number) => void;
}

export const useUIStore = create<UIState>((set) => ({
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),
  activeCardId: null,
  setActiveCard: (id) => set({ activeCardId: id }),
  filterAgentId: null,
  setFilterAgent: (id) => set({ filterAgentId: id }),
  boardChatOpen: false,
  boardChatHeight: 300,
  toggleBoardChat: () => set((s) => ({ boardChatOpen: !s.boardChatOpen })),
  setBoardChatHeight: (h) => set({ boardChatHeight: Math.max(150, Math.min(600, h)) }),
}));
