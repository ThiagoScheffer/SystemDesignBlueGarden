import { create } from 'zustand';
import type {
  PreflightResult,
  SimulationScenario,
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
  setDrawerOpen: (open: boolean) => void;
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
  setDrawerOpen: (drawerOpen) => set({ drawerOpen }),
  prepare: (scenario, preflight) =>
    set({ scenario, preflight, status: 'preflight', error: null }),
  started: (runId) =>
    set({ runId, status: 'running', ticks: [], summary: null, error: null }),
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
    }),
}));

export const isSimulationLocked = (status: SimulationStatus) =>
  status === 'running' || status === 'paused';
