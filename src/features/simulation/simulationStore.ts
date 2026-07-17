import { create } from 'zustand';
import type {
  PreflightResult,
  SimulationScenario,
  DiagnosticCategory,
  SimulationSpeed,
  SimulationStatus,
  SimulationSummary,
  SimulationTick,
} from '../../domain/simulation/types';

interface SimulationState {
  status: SimulationStatus;
  runId: string | null;
  scenario: SimulationScenario | null;
  speed: SimulationSpeed;
  ticks: SimulationTick[];
  summary: SimulationSummary | null;
  preflight: PreflightResult | null;
  error: string | null;
  drawerOpen: boolean;
  activeDiagnostic: { nodeId: string; category: DiagnosticCategory } | null;
  learningTipsEnabled: boolean;
  setDrawerOpen: (open: boolean) => void;
  toggleDiagnostic: (nodeId: string, category: DiagnosticCategory) => void;
  closeDiagnostic: () => void;
  setLearningTipsEnabled: (enabled: boolean) => void;
  prepare: (scenario: SimulationScenario, preflight: PreflightResult) => void;
  started: (runId: string) => void;
  addTick: (runId: string, tick: SimulationTick) => void;
  pause: () => void;
  resume: () => void;
  setSpeed: (speed: SimulationSpeed) => void;
  complete: (runId: string, summary: SimulationSummary) => void;
  fail: (runId: string, message: string) => void;
  reset: () => void;
}

const tipsStorageKey = 'blue-garden-learning-tips';
const storedTipsPreference = () => {
  try {
    return window.localStorage.getItem(tipsStorageKey) !== 'false';
  } catch {
    return true;
  }
};

export const useSimulationStore = create<SimulationState>((set) => ({
  status: 'idle',
  runId: null,
  scenario: null,
  speed: 4,
  ticks: [],
  summary: null,
  preflight: null,
  error: null,
  drawerOpen: false,
  activeDiagnostic: null,
  learningTipsEnabled: storedTipsPreference(),
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
  toggleDiagnostic: (nodeId, category) =>
    set((state) => ({
      activeDiagnostic:
        state.activeDiagnostic?.nodeId === nodeId &&
        state.activeDiagnostic.category === category
          ? null
          : { nodeId, category },
    })),
  closeDiagnostic: () => set({ activeDiagnostic: null }),
  setLearningTipsEnabled: (learningTipsEnabled) => {
    try {
      window.localStorage.setItem(tipsStorageKey, String(learningTipsEnabled));
    } catch {
      // The preference remains usable for this session when storage is blocked.
    }
    set({ learningTipsEnabled });
  },
  prepare: (scenario, preflight) =>
    set({
      scenario,
      preflight,
      status: 'preflight',
      error: null,
      activeDiagnostic: null,
    }),
  started: (runId) =>
    set({
      runId,
      status: 'running',
      ticks: [],
      summary: null,
      error: null,
      activeDiagnostic: null,
    }),
  addTick: (runId, tick) =>
    set((state) =>
      state.runId === runId ? { ticks: [...state.ticks, tick] } : state,
    ),
  pause: () => set({ status: 'paused' }),
  resume: () => set({ status: 'running' }),
  setSpeed: (speed) => set({ speed }),
  complete: (runId, summary) =>
    set((state) =>
      state.runId === runId ? { status: 'completed', summary } : state,
    ),
  fail: (runId, error) =>
    set((state) =>
      state.runId === runId ? { status: 'error', error } : state,
    ),
  reset: () =>
    set({
      status: 'idle',
      runId: null,
      ticks: [],
      summary: null,
      preflight: null,
      error: null,
      activeDiagnostic: null,
    }),
}));

export const isSimulationLocked = (status: SimulationStatus) =>
  status === 'running' || status === 'paused';
