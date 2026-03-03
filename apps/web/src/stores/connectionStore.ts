import { create } from 'zustand';

interface ConnectionState {
  status: 'connected' | 'connecting' | 'disconnected';
  setStatus: (status: ConnectionState['status']) => void;
  lastEventTime: number | null;
  setLastEventTime: (time: number) => void;
}

export const useConnectionStore = create<ConnectionState>((set) => ({
  status: 'disconnected',
  setStatus: (status) => set({ status }),
  lastEventTime: null,
  setLastEventTime: (time) => set({ lastEventTime: time }),
}));
