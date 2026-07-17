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

  it('keeps one diagnostic open and persists the learning-tip preference', () => {
    useSimulationStore.getState().toggleDiagnostic('node-a', 'error');
    expect(useSimulationStore.getState().activeDiagnostic).toEqual({
      nodeId: 'node-a',
      category: 'error',
    });
    useSimulationStore.getState().toggleDiagnostic('node-b', 'bottleneck');
    expect(useSimulationStore.getState().activeDiagnostic).toEqual({
      nodeId: 'node-b',
      category: 'bottleneck',
    });

    useSimulationStore.getState().setLearningTipsEnabled(false);
    expect(useSimulationStore.getState().learningTipsEnabled).toBe(false);
    expect(localStorage.getItem('blue-garden-learning-tips')).toBe('false');
    useSimulationStore.getState().reset();
    expect(useSimulationStore.getState().activeDiagnostic).toBeNull();
    expect(useSimulationStore.getState().learningTipsEnabled).toBe(false);
  });

  it('freezes the final tick and diagnostics after completion', () => {
    useSimulationStore.getState().started('run');
    useSimulationStore.getState().addTick('run', tick);
    useSimulationStore.getState().complete('run', {
      runId: 'run',
      architectureId: 'architecture',
      architectureUpdatedAt: '2026-01-01T00:00:00.000Z',
      scenarioId: 'scenario',
      scenarioName: 'Scenario',
      completedAt: '2026-01-01T00:00:01.000Z',
      durationSeconds: 1,
      finalMetric: tick.global,
      peakMetric: tick.global,
      findings: [],
    });

    expect(useSimulationStore.getState().status).toBe('completed');
    expect(useSimulationStore.getState().ticks.at(-1)).toEqual(tick);
  });
});
