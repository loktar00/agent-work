import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface TutorialState {
  hasCompletedWelcome: boolean;
  hasCompletedTour: boolean;
  currentTourStep: number;
  isTourActive: boolean;
  tutorialProgress: Record<string, boolean>;
  welcomeBoardId: string | null;
  completeWelcome: () => void;
  startTour: () => void;
  stopTour: () => void;
  setTourStep: (step: number) => void;
  markTutorialStep: (stepId: string) => void;
  setWelcomeBoardId: (id: string) => void;
  reset: () => void;
}

export const useTutorialStore = create<TutorialState>()(
  persist(
    (set) => ({
      hasCompletedWelcome: false,
      hasCompletedTour: false,
      currentTourStep: 0,
      isTourActive: false,
      tutorialProgress: {},
      welcomeBoardId: null,
      completeWelcome: () => set({ hasCompletedWelcome: true }),
      startTour: () => set({ isTourActive: true, currentTourStep: 0 }),
      stopTour: () => set({ isTourActive: false, hasCompletedTour: true }),
      setTourStep: (step) => set({ currentTourStep: step }),
      markTutorialStep: (stepId) =>
        set((state) => ({
          tutorialProgress: { ...state.tutorialProgress, [stepId]: true },
        })),
      setWelcomeBoardId: (id) => set({ welcomeBoardId: id }),
      reset: () =>
        set({
          hasCompletedWelcome: false,
          hasCompletedTour: false,
          currentTourStep: 0,
          isTourActive: false,
          tutorialProgress: {},
          welcomeBoardId: null,
        }),
    }),
    { name: 'agent-board-tutorial' },
  ),
);
