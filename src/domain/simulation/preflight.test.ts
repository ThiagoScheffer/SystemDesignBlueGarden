import { describe, expect, it } from 'vitest';
import {
  createArchitectureEdge,
  createArchitectureNode,
} from '../architecture/factories';
import { runPreflight } from './preflight';
import type { SimulationScenario } from './types';

describe('simulation preflight', () => {
  it('blocks reachable directed cycles', () => {
    const client = createArchitectureNode('client', { x: 0, y: 0 });
    const first = createArchitectureNode('application-server', {
      x: 100,
      y: 0,
    });
    const second = createArchitectureNode('worker', { x: 200, y: 0 });
    const scenario: SimulationScenario = {
      id: 'cycle',
      name: 'Cycle',
      durationSeconds: 10,
      traffic: [{ sourceNodeId: client.id, requestsPerSecond: 100 }],
      events: [],
    };

    const result = runPreflight(
      [client, first, second],
      [
        createArchitectureEdge(client.id, first.id),
        createArchitectureEdge(first.id, second.id),
        createArchitectureEdge(second.id, first.id),
      ],
      scenario,
    );

    expect(result.errors.some((error) => error.code === 'DIRECTED_CYCLE')).toBe(
      true,
    );
  });

  it('warns about missing Cache fallback and Sharding target mismatch', () => {
    const client = createArchitectureNode('client', { x: 0, y: 0 });
    const cache = createArchitectureNode('cache', { x: 100, y: 0 });
    const sharding = createArchitectureNode('sharding', { x: 200, y: 0 });
    const scenario: SimulationScenario = {
      id: 'warnings',
      name: 'Warnings',
      durationSeconds: 10,
      traffic: [{ sourceNodeId: client.id, requestsPerSecond: 100 }],
      events: [],
    };

    const result = runPreflight(
      [client, cache, sharding],
      [
        createArchitectureEdge(client.id, cache.id),
        createArchitectureEdge(cache.id, sharding.id),
      ],
      scenario,
    );

    expect(
      result.warnings.some(
        (warning) => warning.code === 'SHARD_COUNT_MISMATCH',
      ),
    ).toBe(true);
  });
});
