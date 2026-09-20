import { describe, it, expect } from 'vitest';
import { createArchitectureNode, createArchitectureEdge } from '../domain/architecture/factories';
import type { ComponentType } from '../domain/architecture/types';
import type { SimulationScenario } from '../domain/simulation/types';
import { runSimulation } from './simulationEngine';
import { createUrlShortener } from '../domain/learning/urlShortener';
import { createTemplateDocument, getChallenge } from '../domain/learning/content';
import { compileIncident } from '../domain/learning/incidents';

function graph(types: ComponentType[], pairs: [number, number][]) {
  const nodes = types.map(type => createArchitectureNode(type, { x: 0, y: 0 }));
  nodes.forEach(node => Object.assign(node.data.config, { capacity: 100000, failureRate: 0, queueLimit: 0 }));
  const edges = pairs.map(([a, b]) => createArchitectureEdge(nodes[a].id, nodes[b].id));
  edges.forEach(edge => edge.config.retryCount = 0);
  const scenario: SimulationScenario = { id: 'test', name: 'Test', durationSeconds: 2, traffic: [{ sourceNodeId: nodes[0].id, trafficType: 'read', requestsPerSecond: 19000 }, { sourceNodeId: nodes[0].id, trafficType: 'write', requestsPerSecond: 200 }], events: [] };
  const run = () => runSimulation({ runId: 'test', architectureId: 'test', architectureUpdatedAt: '', nodes, edges, scenario });
  return { nodes, edges, scenario, run };
}

describe('shared workload engine', () => {
  it('routes simultaneous reads and writes without duplication and shares capacity', () => {
    const g = graph(['client', 'application-server', 'nosql-database', 'sql-database'], [[0,1],[1,2],[1,3]]);
    g.edges[1].config.trafficType = 'read'; g.edges[2].config.trafficType = 'write';
    let tick = g.run().ticks[0];
    expect(tick.nodes[g.nodes[2].id].incomingRps).toBe(19000);
    expect(tick.nodes[g.nodes[3].id].incomingRps).toBe(200);
    g.nodes[1].data.config.capacity = 9600;
    tick = g.run().ticks[0];
    expect(tick.workloads?.read.successfulRps).toBe(9500);
    expect(tick.workloads?.write.successfulRps).toBe(100);
  });
  it('changes reads without replacing write demand', () => {
    const g = graph(['client','application-server'], [[0,1]]);
    g.scenario.events = [{ id:'viral', type:'TRAFFIC_SET', sourceNodeId:g.nodes[0].id, trafficType:'read', atSecond:1, requestsPerSecond:60000 }];
    expect(g.run().ticks[1].global.generatedRps).toBe(60200);
  });
  it('applies cache hits only to reads and sends misses plus writes to storage', () => {
    const g = graph(['client','cache','sharding','nosql-database','nosql-database'], [[0,1],[1,2],[2,3],[2,4]]);
    g.nodes[1].data.config.hitRatePercent = 90;
    const tick = g.run().ticks[0];
    expect(tick.nodes[g.nodes[1].id].cacheOriginRps).toBe(1900);
    expect(tick.nodes[g.nodes[3].id].incomingRps).toBe(1050);
    expect(tick.nodes[g.nodes[4].id].incomingRps).toBe(1050);
  });
  it('removes failed load-balancer destinations but retains failed shard ownership', () => {
    const g = graph(['client','load-balancer','application-server','application-server'], [[0,1],[1,2],[1,3]]);
    g.scenario.events = [{id:'fail',type:'NODE_FAILURE',nodeId:g.nodes[2].id,atSecond:0,durationSeconds:2}];
    let tick = g.run().ticks[0];
    expect(tick.nodes[g.nodes[2].id].incomingRps).toBe(0);
    expect(tick.nodes[g.nodes[3].id].incomingRps).toBe(19200);
    expect(tick.global.successfulRps).toBe(19200);
    g.nodes[1].type = 'sharding'; g.nodes[1].data.config.shardCount = 2;
    tick = g.run().ticks[0];
    expect(tick.global.successfulRps).toBe(9600);
  });
  it('does not turn ordinary mixed dependencies into load balancing', () => {
    const g = graph(['client','application-server','nosql-database','sql-database'], [[0,1],[1,2],[1,3]]);
    const tick = g.run().ticks[0];
    expect(tick.nodes[g.nodes[2].id].incomingRps).toBe(19200);
    expect(tick.nodes[g.nodes[3].id].incomingRps).toBe(19200);
  });
  it('rejects gateway admission excess before downstream processing', () => {
    const g = graph(['client','api-gateway','application-server'], [[0,1],[1,2]]);
    g.nodes[1].data.config.rateLimitRps = 9600;
    const tick = g.run().ticks[0];
    expect(tick.nodes[g.nodes[1].id].rateLimitedRps).toBe(9600);
    expect(tick.nodes[g.nodes[2].id].incomingRps).toBe(9600);
    expect(tick.global.failedRps).toBe(9600);
    expect(tick.nodes[g.nodes[1].id].diagnostics.some(d => d.code === 'rate-limit-rejection')).toBe(true);
  });
  it('ignores disabled routes and is deterministic', () => {
    const g = graph(['client','load-balancer','application-server','application-server'], [[0,1],[1,2],[1,3]]);
    g.edges[1].config.disabled = true;
    expect(g.run().ticks[0].nodes[g.nodes[3].id].incomingRps).toBe(19200);
    expect(g.run().ticks).toEqual(g.run().ticks);
  });
});

describe('URL Shortener reference', () => {
  const run = (id: string) => {
    const doc = createUrlShortener(true);
    const scenario = doc.scenarios.find(s => s.id === id)!;
    return { doc, result: runSimulation({runId:'url',architectureId:doc.id,architectureUpdatedAt:'',nodes:doc.nodes,edges:doc.edges,scenario}) };
  };
  it('sustains the baseline and viral redirects', () => {
    for (const id of ['url-baseline','url-viral']) {
      const { result } = run(id);
      expect(result.ticks[20].workloads?.read.failedRps).toBe(0);
      expect(result.ticks[20].workloads?.write.successfulRps).toBe(200);
    }
  });
  it('isolates key-generator failure from reads', () => {
    const { result } = run('url-key-outage');
    expect(result.ticks[15].workloads?.write.successfulRps).toBe(0);
    expect(result.ticks[15].workloads?.read.successfulRps).toBe(19000);
  });
  it('exhausts a finite key pool without breaking redirects', () => {
    const { result, doc } = run('url-pool-depletion');
    const key = doc.nodes.find(n => n.data.config.applicationRole === 'id-generator')!;
    expect(result.ticks[49].nodes[key.id].idPoolRemaining).toBe(0);
    expect(result.ticks[50].workloads?.write.failedRps).toBe(200);
    expect(result.ticks[50].workloads?.read.successfulRps).toBe(19000);
    expect(result.ticks[0].nodes[key.id].idKeyspace).toBe('3521614606208');
  });
  it('buffers analytics outage without adding redirect latency or failure', () => {
    const { result, doc } = run('url-analytics-lag');
    const queue = doc.nodes.find(n => n.type === 'message-queue')!;
    expect(result.ticks[15].nodes[queue.id].backlog).toBe(114000);
    expect(result.ticks[15].workloads?.read).toEqual(result.ticks[0].workloads?.read);
  });
  it('makes bypass pressure visible in mapping storage', () => {
    const { result } = run('url-cache-bypass');
    expect(result.ticks[15].workloads!.read.failedRps).toBeGreaterThan(0);
    expect(result.ticks[0].workloads!.read.failedRps).toBe(0);
  });
  it('preserves stampede formulas with explicit upstream capacity', () => {
    const doc = createTemplateDocument('cache-stampede');
    const scenario = compileIncident(getChallenge('cache-stampede')!.incident, doc).scenario!;
    const simulate = () => runSimulation({runId:'cache', architectureId:doc.id,architectureUpdatedAt:'',nodes:doc.nodes,edges:doc.edges,scenario});
    const cache = doc.nodes.find(n => n.type === 'cache')!;
    expect(simulate().ticks[15].nodes[cache.id].cacheOriginRps).toBe(9200);
    cache.data.config.requestCoalescing = true;
    expect(simulate().ticks[15].nodes[cache.id].cacheOriginRps).toBe(2001);
  });
});
