import type {
  ArchitectureEdgeV1,
  ArchitectureNodeV1,
  SimulationDefaults,
} from '../../domain/architecture/types';
import type { SimulationScenario } from '../../domain/simulation/types';

export type ScenarioPreset =
  | 'baseline'
  | 'traffic-spike'
  | 'server-failure'
  | 'database-overload'
  | 'cache-failure'
  | 'queue-backlog'
  | 'network-latency';

export const scenarioPresetLabels: Record<ScenarioPreset, string> = {
  baseline: 'Baseline',
  'traffic-spike': 'Traffic spike',
  'server-failure': 'Server failure',
  'database-overload': 'Database overload',
  'cache-failure': 'Cache failure',
  'queue-backlog': 'Queue backlog',
  'network-latency': 'Network latency increase',
};

export function createScenarioPreset(
  preset: ScenarioPreset,
  nodes: ArchitectureNodeV1[],
  edges: ArchitectureEdgeV1[],
  defaults?: SimulationDefaults,
): SimulationScenario {
  const id = `scenario-${crypto.randomUUID()}`;
  const client = nodes.find((node) => node.type === 'client');
  const traffic = client
    ? [
        {
          sourceNodeId: client.id,
          requestsPerSecond: defaults?.initialRps ?? 1000,
        },
      ]
    : [];
  const base: SimulationScenario = {
    id,
    name: scenarioPresetLabels[preset],
    durationSeconds: defaults?.durationSeconds ?? 120,
    ambientFailureRate: defaults?.ambientFailureRate ?? 0,
    traffic,
    events: [],
  };
  const eventId = (suffix: string) => `${id}-${suffix}`;

  if (preset === 'traffic-spike' && client) {
    base.events = [
      {
        id: eventId('spike'),
        type: 'TRAFFIC_SET',
        atSecond: Math.floor(base.durationSeconds * 0.25),
        sourceNodeId: client.id,
        requestsPerSecond: defaults?.peakRps ?? 5000,
      },
      {
        id: eventId('restore'),
        type: 'TRAFFIC_SET',
        atSecond: Math.floor(base.durationSeconds * 0.75),
        sourceNodeId: client.id,
        requestsPerSecond: defaults?.initialRps ?? 1000,
      },
    ];
  }
  if (preset === 'server-failure') {
    const target = nodes.find((node) => node.type === 'application-server');
    if (target)
      base.events = [
        {
          id: eventId('failure'),
          type: 'NODE_FAILURE',
          atSecond: 30,
          nodeId: target.id,
          durationSeconds: 45,
        },
      ];
  }
  if (preset === 'database-overload') {
    const target = nodes.find(
      (node) => node.type === 'sql-database' || node.type === 'nosql-database',
    );
    if (target)
      base.events = [
        {
          id: eventId('overload'),
          type: 'NODE_CAPACITY',
          atSecond: 30,
          nodeId: target.id,
          multiplier: 0.25,
          durationSeconds: 60,
        },
      ];
  }
  if (preset === 'cache-failure') {
    const target = nodes.find((node) => node.type === 'cache');
    if (target)
      base.events = [
        {
          id: eventId('bypass'),
          type: 'CACHE_BYPASS',
          atSecond: 30,
          nodeId: target.id,
          durationSeconds: 45,
        },
      ];
  }
  if (preset === 'queue-backlog') {
    const target = nodes.find((node) => node.type === 'message-queue');
    if (target)
      base.events = [
        {
          id: eventId('inject'),
          type: 'QUEUE_INJECT',
          atSecond: 30,
          nodeId: target.id,
          messages: 50000,
        },
      ];
  }
  if (preset === 'network-latency' && edges[0]) {
    base.events = [
      {
        id: eventId('latency'),
        type: 'EDGE_LATENCY',
        atSecond: 30,
        edgeId: edges[0].id,
        addedLatencyMs: 250,
        durationSeconds: 60,
      },
    ];
  }
  return base;
}
