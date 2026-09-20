import { createArchitectureDocument, createArchitectureNode, createArchitectureEdge } from '../architecture/factories';
import type { ComponentType, OperationalConfig, EdgeConfig } from '../architecture/types';
import type { SimulationScenario } from '../simulation/types';

/** Reference assumptions are explicit configuration, never challenge-specific engine branches. */
export function createUrlShortener(reference: boolean) {
  const document = createArchitectureDocument(`URL Shortener - ${reference ? 'Reference' : 'Starter'}`);
  document.metadata.description = 'Separate redirect reads, URL creation writes, and asynchronous analytics. Capacity is an educational estimate.';
  document.projectSettings.expectedScale = 'large';
  document.projectSettings.simulationDefaults = { initialRps: 19200, peakRps: 60200, ambientFailureRate: 0, durationSeconds: 60 };
  const add = (type: ComponentType, label: string, x: number, y: number, config: Partial<OperationalConfig> = {}) => {
    const node = createArchitectureNode(type, { x, y });
    node.data.label = label;
    Object.assign(node.data.config, { capacity: 100000, failureRate: 0, queueLimit: 0 }, config);
    document.nodes.push(node);
    return node;
  };
  const link = (source: typeof document.nodes[number], target: typeof source, trafficType: EdgeConfig['trafficType'] = 'mixed', asynchronous = false) => {
    const edge = createArchitectureEdge(source.id, target.id);
    Object.assign(edge.config, { trafficType, retryCount: 0, mode: asynchronous ? 'asynchronous' : 'synchronous' });
    edge.label = `${trafficType}${asynchronous ? ' / async' : ''}`;
    document.edges.push(edge);
    return edge;
  };
  const client = add('client', 'Redirect and creation clients', 0, 100);
  const gateway = add('api-gateway', 'Admission gateway', 240, 100, reference ? { rateLimitRps: 80000 } : {});
  link(client, gateway);
  if (!reference) {
    const app = add('application-server', 'Basic URL service', 480, 100, { capacity: 2000 });
    const db = add('nosql-database', 'URL mappings', 720, 100, { capacity: 1000 });
    add('monitoring-service', 'Operational visibility', 480, 340);
    link(gateway, app); link(app, db);
    document.metadata.description += ' Starter intentionally lacks caching, sharding and isolated key allocation; expect overload.';
  } else {
    const lb = add('load-balancer', 'Redirect load balancer', 480, 0);
    const a = add('application-server', 'Redirect service A', 720, -100, { applicationRole: 'redirect', capacity: 40000 });
    const b = add('application-server', 'Redirect service B', 720, 100, { applicationRole: 'redirect', capacity: 40000 });
    const cache = add('cache', 'Short-code cache', 960, 0, { hitRatePercent: 95, ttlSeconds: 300, requestCoalescing: true });
    const router = add('sharding', 'Hash short code', 1200, 120, { shardKey: 'shortCode', shardCount: 2 });
    const dbA = add('nosql-database', 'URL partition A', 1440, 20, { capacity: 3000, lazyExpiration: true, backgroundCleanup: true, uniqueConditionalWrites: true });
    const dbB = add('nosql-database', 'URL partition B', 1440, 220, { capacity: 3000, lazyExpiration: true, backgroundCleanup: true, uniqueConditionalWrites: true });
    const create = add('application-server', 'URL creation service', 480, 360, { applicationRole: 'url-creation', capacity: 1000 });
    const keys = add('application-server', 'Key generation service', 720, 360, { applicationRole: 'id-generator', capacity: 1000, idStrategy: 'pool', idAlphabetSize: 62, idKeyLength: 7, idPoolSize: 10000, atomicAllocation: true });
    const queue = add('message-queue', 'Click analytics buffer', 960, -320, { capacity: 100000, queueLimit: 2000000 });
    const worker = add('worker', 'Analytics consumer', 1200, -320, { workerRole: 'analytics-consumer', capacity: 25000 });
    const analytics = add('nosql-database', 'Analytics store', 1440, -320, { capacity: 30000 });
    add('worker', 'Expiration cleanup policy', 1200, 420, { workerRole: 'cleanup' });
    add('monitoring-service', 'Read / write / queue visibility', 960, 520);
    link(gateway, lb, 'read'); link(lb, a, 'read'); link(lb, b, 'read');
    link(a, cache, 'read'); link(b, cache, 'read'); link(cache, router, 'read');
    link(router, dbA); link(router, dbB);
    link(gateway, create, 'write'); link(create, keys, 'write'); link(keys, router, 'write');
    link(a, queue, 'read', true); link(b, queue, 'read', true); link(queue, worker, 'read', true); link(worker, analytics, 'read', true);
  }
  const baseline: SimulationScenario = { id: 'url-baseline', name: 'URL baseline: 19k reads + 200 writes', durationSeconds: 40, ambientFailureRate: 0, traffic: [{ sourceNodeId: client.id, requestsPerSecond: 19000, trafficType: 'read', operation: 'redirect' }, { sourceNodeId: client.id, requestsPerSecond: 200, trafficType: 'write', operation: 'create' }], events: [] };
  document.scenarios = [baseline, { ...structuredClone(baseline), id: 'url-viral', name: 'Viral link: 60k reads', events: [{ id: 'viral', type: 'TRAFFIC_SET', sourceNodeId: client.id, trafficType: 'read', requestsPerSecond: 60000, atSecond: 10 }] }];
  if (reference) {
    const cache = document.nodes.find(node => node.type === 'cache')!;
    const keys = document.nodes.find(node => node.data.config.applicationRole === 'id-generator')!;
    const worker = document.nodes.find(node => node.data.config.workerRole === 'analytics-consumer')!;
    document.scenarios.push(
      { ...structuredClone(baseline), id: 'url-cache-bypass', name: 'Cache bypass / database pressure', events: [{ id: 'bypass', type: 'CACHE_BYPASS', nodeId: cache.id, atSecond: 10, durationSeconds: 20 }] },
      { ...structuredClone(baseline), id: 'url-key-outage', name: 'Key generator outage: writes isolated', events: [{ id: 'outage', type: 'NODE_FAILURE', nodeId: keys.id, atSecond: 10, durationSeconds: 20 }] },
      { ...structuredClone(baseline), id: 'url-pool-depletion', name: 'Finite key pool depletion', durationSeconds: 80 },
      { ...structuredClone(baseline), id: 'url-analytics-lag', name: 'Analytics consumer outage', events: [{ id: 'lag', type: 'NODE_FAILURE', nodeId: worker.id, atSecond: 10, durationSeconds: 20 }] },
    );
  }
  return document;
}
