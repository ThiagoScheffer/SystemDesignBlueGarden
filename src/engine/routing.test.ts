import { describe, it, expect } from 'vitest';
import { createArchitectureNode, createArchitectureEdge } from '../domain/architecture/factories';
import { runSimulation } from './simulationEngine';

describe('routing conservation', () => {
  it.each([[100, 100, 500, 500], [70, 30, 700, 300]])('distributes load balancer weights %s/%s', (a, b, expectedA, expectedB) => {
    const nodes = ['client', 'load-balancer', 'application-server', 'application-server'].map((type) => createArchitectureNode(type as 'client' | 'load-balancer' | 'application-server', { x: 0, y: 0 }));
    nodes.forEach(node => { node.data.config.capacity = 10000; node.data.config.failureRate = 0; });
    const edges = [createArchitectureEdge(nodes[0].id, nodes[1].id), createArchitectureEdge(nodes[1].id, nodes[2].id), createArchitectureEdge(nodes[1].id, nodes[3].id)];
    edges[1].config.trafficPercentage = a;
    edges[2].config.trafficPercentage = b;
    const result = runSimulation({ runId: 'routing', architectureId: 'test', architectureUpdatedAt: '', nodes, edges, scenario: { id: 'test', name: 'test', durationSeconds: 1, traffic: [{ sourceNodeId: nodes[0].id, requestsPerSecond: 1000 }], events: [] } });
    expect(result.ticks[0].nodes[nodes[2].id].incomingRps).toBe(expectedA);
    expect(result.ticks[0].nodes[nodes[3].id].incomingRps).toBe(expectedB);
    expect(result.ticks[0].global.successfulRps).toBe(1000);
  });
});
