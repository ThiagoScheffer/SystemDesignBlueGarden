import { describe, expect, it } from 'vitest';
import { createArchitectureEdge } from '../architecture/factories';
import type { ArchitectureEdgeV1 } from '../architecture/types';
import type { NodeMetric, SimulationTick } from './types';
import { computeAffectedEdgeStates } from './diagnostics';

const metric = (diagnostics: NodeMetric['diagnostics'] = []): NodeMetric => ({
  incomingRps: 100,
  offeredRps: 100,
  processedRps: 100,
  utilization: 0.5,
  loadRatio: 0.5,
  backlog: 0,
  overflow: 0,
  rejectedRps: 0,
  processingFailureRps: 0,
  averageLatencyMs: 10,
  p95LatencyMs: 20,
  failedRps: 0,
  effectiveCapacity: 200,
  status: 'normal',
  diagnostics,
});

const tick = (
  nodes: SimulationTick['nodes'],
  edges: ArchitectureEdgeV1[],
): SimulationTick => ({
  second: 0,
  global: {
    generatedRps: 100,
    successfulRps: 100,
    failedRps: 0,
    errorRate: 0,
    averageLatencyMs: 10,
    p95LatencyMs: 20,
    queueDepth: 0,
    estimatedMonthlyCost: 0,
  },
  nodes,
  edges: Object.fromEntries(
    edges.map((edge) => [
      edge.id,
      {
        transferredRps: 100,
        effectiveLatencyMs: 1,
        retries: 0,
        timeouts: 0,
        failedRps: 0,
        rejectedRps: 0,
        processingFailureRps: 0,
        unavailableRps: 0,
        diagnostics: [],
      },
    ]),
  ),
  events: [],
});

const errorDiagnostic: NodeMetric['diagnostics'][number] = {
  id: 'error',
  code: 'processing-failure',
  topic: 'failure',
  category: 'error',
  severity: 'critical',
  title: 'Failure',
  explanation: 'Failed',
  affectedRps: 10,
  affectedPercent: 10,
};

const bottleneckDiagnostic: NodeMetric['diagnostics'][number] = {
  ...errorDiagnostic,
  id: 'bottleneck',
  category: 'bottleneck',
  title: 'Bottleneck',
};

describe('affected simulation paths', () => {
  it('traces a downstream error across all active upstream edges', () => {
    const first = createArchitectureEdge('client', 'service');
    const second = createArchitectureEdge('service', 'database');
    const simulationTick = tick(
      {
        client: metric(),
        service: metric(),
        database: metric([errorDiagnostic]),
      },
      [first, second],
    );

    expect(computeAffectedEdgeStates([first, second], simulationTick)).toEqual({
      [first.id]: 'affected-error',
      [second.id]: 'affected-error',
    });
  });

  it('preserves a direct edge failure as a solid error state', () => {
    const edge = createArchitectureEdge('source', 'target');
    const simulationTick = tick({ source: metric(), target: metric() }, [edge]);
    simulationTick.edges[edge.id].diagnostics = [errorDiagnostic];

    expect(computeAffectedEdgeStates([edge], simulationTick)).toEqual({
      [edge.id]: 'error',
    });
  });

  it('keeps bottlenecks amber and ignores disconnected paths', () => {
    const active = createArchitectureEdge('client', 'queue');
    const disconnected = createArchitectureEdge('other', 'unused');
    const simulationTick = tick(
      {
        client: metric(),
        queue: metric([bottleneckDiagnostic]),
        other: metric(),
        unused: metric(),
      },
      [active, disconnected],
    );
    simulationTick.edges[disconnected.id].transferredRps = 0;

    expect(
      computeAffectedEdgeStates([active, disconnected], simulationTick),
    ).toEqual({ [active.id]: 'bottleneck' });
  });

  it('terminates safely when an affected graph contains a cycle', () => {
    const first = createArchitectureEdge('a', 'b');
    const second = createArchitectureEdge('b', 'a');
    const simulationTick = tick({ a: metric(), b: metric([errorDiagnostic]) }, [
      first,
      second,
    ]);

    expect(computeAffectedEdgeStates([first, second], simulationTick)).toEqual({
      [first.id]: 'affected-error',
      [second.id]: 'affected-error',
    });
  });
});
