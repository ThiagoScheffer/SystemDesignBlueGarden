import { create } from 'zustand';
import type { ChallengeAttempt } from '../../domain/learning/types';

export type LearningHubTab = 'challenges' | 'templates' | 'progress';

interface LearningState {
  hubOpen: boolean;
  hubTab: LearningHubTab;
  drawerOpen: boolean;
  attempts: ChallengeAttempt[];
  activeAttempt: ChallengeAttempt | null;
  loading: boolean;
  comparisonRunning: boolean;
  error: string | null;
  setHubOpen: (open: boolean) => void;
  setHubTab: (tab: LearningHubTab) => void;
  setDrawerOpen: (open: boolean) => void;
  setAttempts: (attempts: ChallengeAttempt[]) => void;
  setActiveAttempt: (attempt: ChallengeAttempt | null) => void;
  replaceAttempt: (attempt: ChallengeAttempt) => void;
  removeAttempt: (id: string) => void;
  setLoading: (loading: boolean) => void;
  setComparisonRunning: (running: boolean) => void;
  setError: (error: string | null) => void;
}

export const useLearningStore = create<LearningState>((set) => ({
  hubOpen: false,
  hubTab: 'challenges',
  drawerOpen: false,
  attempts: [],
  activeAttempt: null,
  loading: true,
  comparisonRunning: false,
  error: null,
  setHubOpen: (hubOpen) => set({ hubOpen }),
  setHubTab: (hubTab) => set({ hubTab }),
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
  setAttempts: (attempts) => set({ attempts }),
  setActiveAttempt: (activeAttempt) => set({ activeAttempt }),
  replaceAttempt: (attempt) =>
    set((state) => ({
      attempts: [
        attempt,
        ...state.attempts.filter((candidate) => candidate.id !== attempt.id),
      ].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
      activeAttempt:
        state.activeAttempt?.id === attempt.id ? attempt : state.activeAttempt,
    })),
  removeAttempt: (id) =>
    set((state) => ({
      attempts: state.attempts.filter((attempt) => attempt.id !== id),
      activeAttempt:
        state.activeAttempt?.id === id ? null : state.activeAttempt,
    })),
  setLoading: (loading) => set({ loading }),
  setComparisonRunning: (comparisonRunning) => set({ comparisonRunning }),
  setError: (error) => set({ error }),
}));
