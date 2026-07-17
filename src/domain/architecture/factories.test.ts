import { describe, expect, it } from 'vitest';
import { createArchitectureEdge, createArchitectureNode } from './factories';

describe('architecture factories', () => {
  it('creates nodes from component presets without sharing config objects', () => {
    const first = createArchitectureNode('application-server', {
      x: 10,
      y: 20,
    });
    const second = createArchitectureNode('application-server', {
      x: 30,
      y: 40,
    });

    expect(first.type).toBe('application-server');
    expect(first.data.config.capacity).toBe(1500);
    expect(first.data.config).not.toBe(second.data.config);
    expect(first.id).not.toBe(second.id);
  });

  it('creates a simulation-ready connection with safe defaults', () => {
    const edge = createArchitectureEdge('client', 'api');

    expect(edge.config).toMatchObject({
      protocol: 'HTTP',
      mode: 'synchronous',
      encrypted: true,
      trafficPercentage: 100,
    });
  });
});
