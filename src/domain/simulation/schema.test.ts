import { describe, expect, it } from 'vitest';
import { simulationScenarioSchema } from './schema';

describe('simulation scenario schema', () => {
  it('accepts a valid ordered incident timeline', () => {
    expect(
      simulationScenarioSchema.parse({
        id: 'scenario',
        name: 'Traffic spike',
        durationSeconds: 120,
        traffic: [{ sourceNodeId: 'client', requestsPerSecond: 1000 }],
        events: [
          {
            id: 'spike',
            type: 'TRAFFIC_SET',
            atSecond: 30,
            sourceNodeId: 'client',
            requestsPerSecond: 5000,
          },
        ],
      }),
    ).toBeDefined();
  });

  it('rejects duplicate event IDs and incidents ending outside the run', () => {
    const scenario = {
      id: 'scenario',
      name: 'Invalid',
      durationSeconds: 20,
      traffic: [{ sourceNodeId: 'client', requestsPerSecond: 1000 }],
      events: [
        {
          id: 'same',
          type: 'NODE_FAILURE',
          atSecond: 10,
          nodeId: 'server',
          durationSeconds: 15,
        },
        {
          id: 'same',
          type: 'QUEUE_INJECT',
          atSecond: 5,
          nodeId: 'queue',
          messages: 100,
        },
      ],
    };

    expect(() => simulationScenarioSchema.parse(scenario)).toThrow();
  });

  it('validates cache-key expiration parameters', () => {
    const scenario = {
      id: 'cache-expiry',
      name: 'Popular key expiration',
      durationSeconds: 20,
      traffic: [{ sourceNodeId: 'client', requestsPerSecond: 1000 }],
      events: [
        {
          id: 'expiry',
          type: 'CACHE_KEY_EXPIRATION',
          atSecond: 5,
          nodeId: 'cache',
          keyCount: 1,
          affectedTrafficPercent: 90,
          rebuildDurationSeconds: 5,
          durationSeconds: 5,
        },
      ],
    };
    expect(simulationScenarioSchema.parse(scenario)).toBeDefined();
    expect(() =>
      simulationScenarioSchema.parse({
        ...scenario,
        events: [{ ...scenario.events[0], affectedTrafficPercent: 101 }],
      }),
    ).toThrow();
  });
});
