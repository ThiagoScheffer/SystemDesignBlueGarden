import { beforeEach, describe, expect, it } from 'vitest';
import type { SimulationTick } from '../../domain/simulation/types';
import { useSimulationStore } from './simulationStore';

const tick: SimulationTick = {
  second: 0,
  global: {
    generatedRps: 100,
    successfulRps: 100,
    failedRps: 0,
    errorRate: 0,
    averageLatencyMs: 10,
    p95LatencyMs: 15,
    queueDepth: 0,
    estimatedMonthlyCost: 10,
  },
  nodes: {},
  edges: {},
  events: [],
};

describe('simulation store', () => {
  beforeEach(() => useSimulationStore.getState().reset());

  it('ignores ticks from a stale run ID', () => {
    useSimulationStore.getState().started('current');
    useSimulationStore.getState().addTick('stale', tick);
    expect(useSimulationStore.getState().ticks).toHaveLength(0);
    useSimulationStore.getState().addTick('current', tick);
    expect(useSimulationStore.getState().ticks).toEqual([tick]);
  });

  it('tracks pause, resume, and reset without editor state', () => {
    useSimulationStore.getState().started('run');
    useSimulationStore.getState().pause();
    expect(useSimulationStore.getState().status).toBe('paused');
    useSimulationStore.getState().resume();
    expect(useSimulationStore.getState().status).toBe('running');
    useSimulationStore.getState().reset();
    expect(useSimulationStore.getState().status).toBe('idle');
  });
});
