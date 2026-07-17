import { describe, expect, it } from 'vitest';
import {
  createArchitectureEdge,
  createArchitectureNode,
} from '../domain/architecture/factories';
import type {
  ArchitectureEdgeV1,
  ArchitectureNodeV1,
} from '../domain/architecture/types';
import type {
  SimulationInput,
  SimulationScenario,
} from '../domain/simulation/types';
import { runSimulation } from './simulationEngine';

const scenario = (
  clientId: string,
  requestsPerSecond = 1000,
): SimulationScenario => ({
  id: 'scenario-test',
  name: 'Test',
  durationSeconds: 10,
  traffic: [{ sourceNodeId: clientId, requestsPerSecond }],
  events: [],
});

const input = (
  nodes: ArchitectureNodeV1[],
  edges: ArchitectureEdgeV1[],
  simulationScenario: SimulationScenario,
): SimulationInput => ({
  runId: 'run-test',
  architectureId: 'architecture-test',
  architectureUpdatedAt: '2026-01-01T00:00:00.000Z',
  nodes,
  edges,
  scenario: simulationScenario,
});

describe('deterministic simulation engine', () => {
  it('explains uncapped Load Balancer failures with separate percentages', () => {
    const client = createArchitectureNode('client', { x: 0, y: 0 });
    const loadBalancer = createArchitectureNode('load-balancer', {
      x: 100,
      y: 0,
    });
    client.data.config.capacity = 10_000;
    client.data.config.failureRate = 0;
    client.data.config.queueLimit = 0;
    loadBalancer.data.config.capacity = 1_000;
    loadBalancer.data.config.queueLimit = 1;
    loadBalancer.data.config.failureRate = 0.12;
    const edge = createArchitectureEdge(client.id, loadBalancer.id);
    edge.config.retryCount = 0;

    const result = runSimulation(
      input([client, loadBalancer], [edge], scenario(client.id, 3_200)),
    );
    const metric = result.ticks[0].nodes[loadBalancer.id];
    const errors = metric.diagnostics.filter(
      (entry) => entry.category === 'error',
    );

    expect(metric.loadRatio).toBe(3.2);
    expect(metric.rejectedRps).toBe(2_199);
    expect(metric.processingFailureRps).toBe(120);
    expect(errors).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          title: 'Overloaded',
          explanation: '320% capacity, requests queueing',
        }),
        expect.objectContaining({
          title: 'Connections dropped',
          explanation: '69% rejected at capacity',
        }),
        expect.objectContaining({
          title: 'Server errors',
          explanation: '12% of requests failing',
        }),
      ]),
    );
  });

  it('uses an unavailable load state instead of infinity at zero capacity', () => {
    const client = createArchitectureNode('client', { x: 0, y: 0 });
    const service = createArchitectureNode('application-server', {
      x: 100,
      y: 0,
    });
    client.data.config.failureRate = 0;
    const edge = createArchitectureEdge(client.id, service.id);
    const testScenario = scenario(client.id, 100);
    testScenario.events = [
      {
        id: 'failure',
        type: 'NODE_FAILURE',
        atSecond: 0,
        nodeId: service.id,
        durationSeconds: 2,
      },
    ];

    const metric = runSimulation(input([client, service], [edge], testScenario))
      .ticks[0].nodes[service.id];

    expect(metric.loadRatio).toBeNull();
    expect(metric.diagnostics).toContainEqual(
      expect.objectContaining({
        category: 'error',
        title: 'Component unavailable',
      }),
    );
  });

  it('reports saturation, backlog, and errors when capacity is exceeded', () => {
    const client = createArchitectureNode('client', { x: 0, y: 0 });
    const service = createArchitectureNode('application-server', {
      x: 100,
      y: 0,
    });
    service.data.config.capacity = 100;
    service.data.config.queueLimit = 200;
    const edge = createArchitectureEdge(client.id, service.id);

    const result = runSimulation(
      input([client, service], [edge], scenario(client.id)),
    );
    const metric = result.ticks[0].nodes[service.id];

    expect(metric.utilization).toBe(1);
    expect(metric.backlog).toBe(200);
    expect(metric.overflow).toBeGreaterThan(600);
    expect(result.ticks[0].global.errorRate).toBeGreaterThan(0.8);
    expect(
      result.summary.findings.some((finding) => finding.kind === 'capacity'),
    ).toBe(true);
  });

  it('sends only Cache misses to the database', () => {
    const client = createArchitectureNode('client', { x: 0, y: 0 });
    const cache = createArchitectureNode('cache', { x: 100, y: 0 });
    const database = createArchitectureNode('sql-database', { x: 200, y: 0 });
    client.data.config.failureRate = 0;
    cache.data.config.failureRate = 0;
    database.data.config.failureRate = 0;
    const first = createArchitectureEdge(client.id, cache.id);
    const second = createArchitectureEdge(cache.id, database.id);

    const result = runSimulation(
      input(
        [client, cache, database],
        [first, second],
        scenario(client.id, 1000),
      ),
    );

    expect(result.ticks[0].nodes[cache.id].cacheHitRps).toBe(800);
    expect(result.ticks[0].nodes[cache.id].cacheMissRps).toBe(200);
    expect(result.ticks[0].nodes[database.id].incomingRps).toBe(200);
  });

  it('diagnoses cache miss amplification during bypass', () => {
    const client = createArchitectureNode('client', { x: 0, y: 0 });
    const cache = createArchitectureNode('cache', { x: 100, y: 0 });
    const database = createArchitectureNode('sql-database', { x: 200, y: 0 });
    for (const node of [client, cache, database])
      node.data.config.failureRate = 0;
    const first = createArchitectureEdge(client.id, cache.id);
    const second = createArchitectureEdge(cache.id, database.id);
    const testScenario = scenario(client.id, 100);
    testScenario.events = [
      {
        id: 'bypass',
        type: 'CACHE_BYPASS',
        atSecond: 0,
        nodeId: cache.id,
        durationSeconds: 2,
      },
    ];

    const result = runSimulation(
      input([client, cache, database], [first, second], testScenario),
    );

    expect(result.ticks[0].nodes[cache.id].diagnostics).toContainEqual(
      expect.objectContaining({
        title: 'Cache miss amplification',
        affectedPercent: 100,
        tipId: 'cache',
      }),
    );
  });

  it('routes Sharding traffic once across weighted database targets', () => {
    const client = createArchitectureNode('client', { x: 0, y: 0 });
    const sharding = createArchitectureNode('sharding', { x: 100, y: 0 });
    const firstDb = createArchitectureNode('sql-database', { x: 200, y: -50 });
    const secondDb = createArchitectureNode('sql-database', { x: 200, y: 50 });
    for (const node of [client, sharding, firstDb, secondDb])
      node.data.config.failureRate = 0;
    sharding.data.config.shardCount = 2;
    const inbound = createArchitectureEdge(client.id, sharding.id);
    const first = createArchitectureEdge(sharding.id, firstDb.id);
    const second = createArchitectureEdge(sharding.id, secondDb.id);
    first.config.trafficPercentage = 75;
    second.config.trafficPercentage = 25;

    const result = runSimulation(
      input(
        [client, sharding, firstDb, secondDb],
        [inbound, first, second],
        scenario(client.id, 1000),
      ),
    );

    expect(result.ticks[0].nodes[firstDb.id].incomingRps).toBe(750);
    expect(result.ticks[0].nodes[secondDb.id].incomingRps).toBe(250);
    expect(result.ticks[0].nodes[sharding.id].diagnostics).toContainEqual(
      expect.objectContaining({ title: 'Hot shard', tipId: 'sharding' }),
    );
  });

  it('injects messages and carries Queue backlog across ticks', () => {
    const client = createArchitectureNode('client', { x: 0, y: 0 });
    const queue = createArchitectureNode('message-queue', { x: 100, y: 0 });
    const worker = createArchitectureNode('worker', { x: 200, y: 0 });
    client.data.config.failureRate = 0;
    queue.data.config.failureRate = 0;
    worker.data.config.failureRate = 0;
    queue.data.config.capacity = 100;
    const inbound = createArchitectureEdge(client.id, queue.id);
    const outbound = createArchitectureEdge(queue.id, worker.id);
    outbound.config.mode = 'asynchronous';
    outbound.config.protocol = 'Async';
    const testScenario = scenario(client.id, 0);
    testScenario.events = [
      {
        id: 'inject',
        type: 'QUEUE_INJECT',
        atSecond: 1,
        nodeId: queue.id,
        messages: 1000,
      },
    ];

    const result = runSimulation(
      input([client, queue, worker], [inbound, outbound], testScenario),
    );

    expect(result.ticks[1].nodes[queue.id].queueDelivered).toBe(100);
    expect(result.ticks[1].nodes[queue.id].backlog).toBe(900);
    expect(result.ticks[2].nodes[queue.id].backlog).toBe(800);
    expect(result.ticks[1].nodes[queue.id].diagnostics).toContainEqual(
      expect.objectContaining({ title: 'Consumer lag', tipId: 'queue' }),
    );
  });

  it('returns identical tick data for identical input', () => {
    const client = createArchitectureNode('client', { x: 0, y: 0 });
    const service = createArchitectureNode('application-server', {
      x: 100,
      y: 0,
    });
    const edge = createArchitectureEdge(client.id, service.id);
    const simulationInput = input(
      [client, service],
      [edge],
      scenario(client.id),
    );

    expect(runSimulation(simulationInput).ticks).toEqual(
      runSimulation(simulationInput).ticks,
    );
  });

  it('completes a 15-minute 100-node graph within the Phase 2 budget', () => {
    const client = createArchitectureNode('client', { x: 0, y: 0 });
    client.data.config.failureRate = 0;
    const nodes = [client];
    for (let index = 1; index < 100; index += 1) {
      const node = createArchitectureNode('application-server', {
        x: index * 20,
        y: 0,
      });
      node.data.config.capacity = 1_000_000;
      node.data.config.failureRate = 0;
      node.data.config.queueLimit = 0;
      nodes.push(node);
    }
    const edges: ArchitectureEdgeV1[] = [];
    for (let index = 0; index < 99; index += 1) {
      edges.push(createArchitectureEdge(nodes[index].id, nodes[index + 1].id));
    }
    for (let index = 0; index < 50; index += 1) {
      const edge = createArchitectureEdge(nodes[index].id, nodes[index + 2].id);
      edge.config.trafficPercentage = 0;
      edges.push(edge);
    }
    const finalEdge = createArchitectureEdge(nodes[0].id, nodes[3].id);
    finalEdge.config.trafficPercentage = 0;
    edges.push(finalEdge);
    const longScenario = scenario(client.id, 100);
    longScenario.durationSeconds = 900;

    const started = performance.now();
    const result = runSimulation(input(nodes, edges, longScenario));
    const elapsed = performance.now() - started;

    expect(nodes).toHaveLength(100);
    expect(edges).toHaveLength(150);
    expect(result.ticks).toHaveLength(900);
    expect(elapsed).toBeLessThan(2000);
  });
});
