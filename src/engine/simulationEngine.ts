import type {
  ArchitectureEdgeV1,
  ArchitectureNodeV1,
} from '../domain/architecture/types';
import { runPreflight } from '../domain/simulation/preflight';
import {
  buildEdgeDiagnostics,
  buildNodeDiagnostics,
} from '../domain/simulation/diagnostics';
import type {
  BottleneckFinding,
  EdgeMetric,
  GlobalMetric,
  NodeMetric,
  SimulationInput,
  SimulationLogEntry,
  SimulationSummary,
  SimulationTick,
  WorkloadKind,
  WorkloadMetric,
} from '../domain/simulation/types';

export const ENGINE_VERSION = '2.0.0';
const kinds: WorkloadKind[] = ['read', 'write'];
type Demand = Record<WorkloadKind, number>;
const emptyDemand = (): Demand => ({ read: 0, write: 0 });

interface EngineResult {
  ticks: SimulationTick[];
  summary: SimulationSummary;
}

const round = (value: number) =>
  Number.isFinite(value) ? Math.round(value * 10000) / 10000 : 0;

const zeroGlobal = (): GlobalMetric => ({
  generatedRps: 0,
  successfulRps: 0,
  failedRps: 0,
  errorRate: 0,
  averageLatencyMs: 0,
  p95LatencyMs: 0,
  queueDepth: 0,
  estimatedMonthlyCost: 0,
});

const isActive = (second: number, at: number, duration: number) =>
  second >= at && second < at + duration;

function logScenarioEvents(
  input: SimulationInput,
  second: number,
  nodeById: Map<string, ArchitectureNodeV1>,
): SimulationLogEntry[] {
  return input.scenario.events
    .filter(
      (event) =>
        event.atSecond === second &&
        !(
          event.type === 'EDGE_LATENCY' &&
          input.edges.find((edge) => edge.id === event.edgeId)?.config.disabled
        ),
    )
    .sort((a, b) => a.id.localeCompare(b.id))
    .map((event) => {
      let message: string;
      let nodeId: string | undefined;
      let edgeId: string | undefined;
      if (event.type === 'TRAFFIC_SET') {
        message = `Traffic changed to ${event.requestsPerSecond.toLocaleString()} requests/second.`;
        nodeId = event.sourceNodeId;
      } else if (event.type === 'NODE_FAILURE') {
        nodeId = event.nodeId;
        message = `${nodeById.get(nodeId)?.data.label ?? 'Node'} failed for ${event.durationSeconds} seconds.`;
      } else if (event.type === 'NODE_CAPACITY') {
        nodeId = event.nodeId;
        message = `${nodeById.get(nodeId)?.data.label ?? 'Node'} capacity changed to ${round(event.multiplier * 100)}%.`;
      } else if (event.type === 'CACHE_BYPASS') {
        nodeId = event.nodeId;
        message = `${nodeById.get(nodeId)?.data.label ?? 'Cache'} entered bypass mode.`;
      } else if (event.type === 'CACHE_KEY_EXPIRATION') {
        nodeId = event.nodeId;
        message = `${event.keyCount.toLocaleString()} cache ${event.keyCount === 1 ? 'key expired' : 'keys expired'}, affecting ${round(event.affectedTrafficPercent)}% of traffic.`;
      } else if (event.type === 'QUEUE_INJECT') {
        nodeId = event.nodeId;
        message = `${event.messages.toLocaleString()} messages were injected into ${nodeById.get(nodeId)?.data.label ?? 'the queue'}.`;
      } else {
        edgeId = event.edgeId;
        message = `Network latency increased by ${event.addedLatencyMs} ms.`;
      }
      return {
        id: `event-${second}-${event.id}`,
        second,
        severity: event.type === 'TRAFFIC_SET' ? 'info' : 'warning',
        message,
        nodeId,
        edgeId,
      };
    });
}

function buildFindings(ticks: SimulationTick[]): BottleneckFinding[] {
  const nodePeak = new Map<string, NodeMetric>();
  const edgePeak = new Map<string, EdgeMetric>();
  for (const tick of ticks) {
    for (const [id, metric] of Object.entries(tick.nodes)) {
      const current = nodePeak.get(id);
      if (
        !current ||
        metric.utilization + metric.failedRps >
          current.utilization + current.failedRps
      ) {
        nodePeak.set(id, metric);
      }
    }
    for (const [id, metric] of Object.entries(tick.edges)) {
      const current = edgePeak.get(id);
      if (!current || metric.retries > current.retries)
        edgePeak.set(id, metric);
    }
  }
  const findings: BottleneckFinding[] = [];
  for (const [nodeId, metric] of nodePeak) {
    if (
      (metric.loadRatio ?? metric.utilization) >= 0.9 ||
      metric.overflow > 0
    ) {
      findings.push({
        id: `capacity-${nodeId}`,
        kind: 'capacity',
        severity: metric.overflow > 0 ? 'critical' : 'warning',
        title: 'Capacity saturation',
        description: `Demand reached ${round((metric.loadRatio ?? metric.utilization) * 100)}% of capacity with ${round(metric.overflow)} requests/second overflowing.`,
        suggestion:
          'Increase capacity, distribute traffic, or reduce synchronous work.',
        nodeId,
        impact:
          (metric.loadRatio ?? metric.utilization) * 100 + metric.overflow,
      });
    }
    if (metric.backlog > 0) {
      findings.push({
        id: `queue-${nodeId}`,
        kind: 'queue',
        severity: metric.status === 'critical' ? 'critical' : 'warning',
        title: 'Queue buildup',
        description: `Backlog reached ${round(metric.backlog)} work items.`,
        suggestion: 'Increase consumer throughput or reduce incoming work.',
        nodeId,
        impact: metric.backlog,
      });
    }
    if (metric.p95LatencyMs >= 500) {
      findings.push({
        id: `latency-${nodeId}`,
        kind: 'latency',
        severity: metric.p95LatencyMs >= 1000 ? 'critical' : 'warning',
        title: 'Latency contribution',
        description: `Estimated node P95 latency reached ${round(metric.p95LatencyMs)} ms.`,
        suggestion:
          'Reduce utilization or remove this component from the critical path.',
        nodeId,
        impact: metric.p95LatencyMs,
      });
    }
  }
  for (const [edgeId, metric] of edgePeak) {
    if (metric.retries > 0) {
      findings.push({
        id: `retry-${edgeId}`,
        kind: 'retry',
        severity: 'warning',
        title: 'Retry amplification',
        description: `${round(metric.retries)} retry requests/second increased downstream load.`,
        suggestion:
          'Reduce retries or introduce backoff and a circuit breaker.',
        edgeId,
        impact: metric.retries,
      });
    }
  }
  return findings.sort((a, b) => b.impact - a.impact).slice(0, 5);
}

export function runSimulation(input: SimulationInput): EngineResult {
  const activeEdges = input.edges.filter((edge) => !edge.config.disabled);
  const preflight = runPreflight(input.nodes, activeEdges, input.scenario);
  if (preflight.errors.length) {
    throw new Error(preflight.errors.map((entry) => entry.message).join(' '));
  }

  const nodeById = new Map(input.nodes.map((node) => [node.id, node]));
  const outgoing = new Map<string, ArchitectureEdgeV1[]>();
  const incomingEdges = new Map<string, ArchitectureEdgeV1[]>();
  for (const edge of activeEdges) {
    const list = outgoing.get(edge.source) ?? [];
    list.push(edge);
    outgoing.set(edge.source, list);
    const incomingList = incomingEdges.get(edge.target) ?? [];
    incomingList.push(edge);
    incomingEdges.set(edge.target, incomingList);
  }
  const backlog = new Map<string, number>();
  const keyPools = new Map(input.nodes.filter(node => node.data.config.applicationRole === 'id-generator').map(node => [node.id, node.data.config.idPoolSize ?? 100000]));
  const allocatedKeys = new Map<string, number>();
  const workloadBacklog = new Map<string, Demand>();
  const traffic = new Map<string, Demand>();
  for (const source of input.scenario.traffic) {
    const demand = traffic.get(source.sourceNodeId) ?? emptyDemand();
    demand[source.trafficType ?? 'read'] += source.requestsPerSecond;
    traffic.set(source.sourceNodeId, demand);
  }
  const previousStatus = new Map<string, NodeMetric['status']>();
  const ticks: SimulationTick[] = [];
  const estimatedMonthlyCost = round(
    input.nodes
      .filter((node) => node.type !== 'region' && node.type !== 'note')
      .reduce((sum, node) => sum + node.data.config.costPerHour * 730, 0),
  );

  for (let second = 0; second < input.scenario.durationSeconds; second += 1) {
    for (const event of input.scenario.events
      .filter(
        (candidate) =>
          candidate.type === 'TRAFFIC_SET' && candidate.atSecond === second,
      )
      .sort((a, b) => a.id.localeCompare(b.id))) {
      if (event.type === 'TRAFFIC_SET') {
        const demand = traffic.get(event.sourceNodeId) ?? emptyDemand();
        demand[event.trafficType ?? 'read'] = event.requestsPerSecond;
        traffic.set(event.sourceNodeId, demand);
      }
    }

    const incoming = new Map<string, number>();
    const workloadIncoming = new Map<string, Demand>();
    const workloadOutput = new Map<string, Demand>();
    const routeWeights = new Map<string, Demand>();
    for (const [sourceId, demand] of traffic) {
      incoming.set(sourceId, demand.read + demand.write);
      workloadIncoming.set(sourceId, { ...demand });
    }
    const unavailable = (id: string) => input.scenario.events.some(event =>
      event.type === 'NODE_FAILURE' && event.nodeId === id && isActive(second, event.atSecond, event.durationSeconds)) || nodeById.get(id)?.data.config.capacity === 0;

    const nodeMetrics: Record<string, NodeMetric> = {};
    const edgeMetrics: Record<string, EdgeMetric> = {};
    const events = logScenarioEvents(input, second, nodeById);

    for (const nodeId of preflight.order) {
      const node = nodeById.get(nodeId)!;
      const isFailed = input.scenario.events.some(
        (event) =>
          event.type === 'NODE_FAILURE' &&
          event.nodeId === nodeId &&
          isActive(second, event.atSecond, event.durationSeconds),
      );
      const capacityMultiplier = input.scenario.events
        .filter(
          (event) =>
            event.type === 'NODE_CAPACITY' &&
            event.nodeId === nodeId &&
            isActive(second, event.atSecond, event.durationSeconds),
        )
        .reduce(
          (value, event) =>
            event.type === 'NODE_CAPACITY' ? value * event.multiplier : value,
          1,
        );
      const injected = input.scenario.events
        .filter(
          (event) =>
            event.type === 'QUEUE_INJECT' &&
            event.nodeId === nodeId &&
            event.atSecond === second,
        )
        .reduce(
          (sum, event) =>
            event.type === 'QUEUE_INJECT' ? sum + event.messages : sum,
          0,
        );
      let effectiveCapacity = isFailed
        ? 0
        : node.data.config.capacity * capacityMultiplier;
      if (node.type === 'message-queue') {
        const consumers = (outgoing.get(nodeId) ?? []).filter(edge => nodeById.get(edge.target)?.type === 'worker');
        if (consumers.length) {
          const total = consumers.reduce((sum, edge) => sum + edge.config.trafficPercentage, 0);
          const deliveryCapacity = Math.min(...consumers.map(edge => {
            const weight = total > 0 ? edge.config.trafficPercentage / total : 1 / consumers.length;
            if (!weight) return Infinity;
            return unavailable(edge.target) ? 0 : nodeById.get(edge.target)!.data.config.capacity / weight;
          }));
          effectiveCapacity = Math.min(effectiveCapacity, deliveryCapacity);
        }
      }
      const newIncoming = incoming.get(nodeId) ?? 0;
      const rateLimited = node.type === 'api-gateway' && node.data.config.rateLimitRps !== undefined
        ? Math.max(0, newIncoming - node.data.config.rateLimitRps) : 0;
      const isGenerator = node.type === 'application-server' && node.data.config.applicationRole === 'id-generator';
      const keyspace = BigInt(node.data.config.idAlphabetSize ?? 62) ** BigInt(node.data.config.idKeyLength ?? 7);
      const remainingKeys = isGenerator ? node.data.config.idStrategy === 'pool'
        ? keyPools.get(nodeId) ?? 0
        : Number(keyspace > BigInt(Number.MAX_SAFE_INTEGER) ? BigInt(Number.MAX_SAFE_INTEGER) : keyspace) - (allocatedKeys.get(nodeId) ?? 0) : Infinity;
      if (isGenerator) effectiveCapacity = Math.min(effectiveCapacity, Math.max(0, remainingKeys) / (node.data.config.idBatchSize ?? 1));
      const available = (backlog.get(nodeId) ?? 0) + newIncoming + injected - rateLimited;
      const demand = workloadIncoming.get(nodeId) ?? emptyDemand();
      const queued = workloadBacklog.get(nodeId) ?? emptyDemand();
      const admission = newIncoming > 0 ? (newIncoming - rateLimited) / newIncoming : 1;
      const availableDemand: Demand = { read: demand.read * admission + queued.read + injected, write: demand.write * admission + queued.write };
      const processed = Math.min(available, effectiveCapacity);
      const remaining = Math.max(0, available - processed);
      const queueLimit = isGenerator ? 0 : node.data.config.queueLimit;
      const newBacklog = Math.min(remaining, queueLimit);
      const overflow = Math.max(0, remaining - queueLimit);
      backlog.set(nodeId, newBacklog);
      workloadBacklog.set(nodeId, { read: available ? newBacklog * availableDemand.read / available : 0, write: available ? newBacklog * availableDemand.write / available : 0 });
      const utilization =
        effectiveCapacity > 0
          ? Math.min(1, processed / effectiveCapacity)
          : available > 0
            ? 1
            : 0;
      const queueUtilization = Math.min(utilization, 0.99);
      const theoreticalDelay =
        node.data.config.baseLatencyMs *
        (queueUtilization / Math.max(0.01, 1 - queueUtilization));
      const delayCap =
        node.data.config.baseLatencyMs * 10 +
        (newBacklog / Math.max(effectiveCapacity, 1)) * 1000;
      const queueDelay = Math.min(theoreticalDelay, delayCap);
      const effectiveFailureRate =
        1 -
        (1 - node.data.config.failureRate) *
          (1 - (input.scenario.ambientFailureRate ?? 0));
      const failedByRate = processed * effectiveFailureRate;
      const failed = overflow + failedByRate + rateLimited;
      const successfulOutput = Math.max(0, processed - failedByRate);
      const status: NodeMetric['status'] = isFailed
        ? 'failed'
        : overflow > 0 || newBacklog > 0 || utilization >= 0.9
          ? 'critical'
          : utilization >= 0.7
            ? 'warning'
            : 'normal';
      const metric: NodeMetric = {
        incomingRps: round(newIncoming + injected),
        offeredRps: round(available),
        processedRps: round(processed),
        utilization: round(utilization),
        loadRatio:
          effectiveCapacity > 0
            ? round(available / effectiveCapacity)
            : available > 0
              ? null
              : 0,
        backlog: round(newBacklog),
        overflow: round(overflow),
        rejectedRps: round(overflow + rateLimited),
        readRps: round(demand.read),
        writeRps: round(demand.write),
        processingFailureRps: round(failedByRate),
        averageLatencyMs: round(node.data.config.baseLatencyMs + queueDelay),
        p95LatencyMs: round(node.data.config.baseLatencyMs + queueDelay * 2),
        failedRps: round(failed),
        effectiveCapacity: round(effectiveCapacity),
        status,
        diagnostics: [],
      };
      if (node.type === 'api-gateway' && node.data.config.rateLimitRps !== undefined) metric.rateLimitedRps = round(rateLimited);
      if (isGenerator) {
        const keysAllocated = successfulOutput * (node.data.config.idBatchSize ?? 1);
        allocatedKeys.set(nodeId, (allocatedKeys.get(nodeId) ?? 0) + keysAllocated);
        if (node.data.config.idStrategy === 'pool') keyPools.set(nodeId, Math.max(0, remainingKeys - keysAllocated));
        metric.idKeyspace = keyspace.toString();
        metric.idAllocatedRps = round(keysAllocated);
        metric.idAllocationFailedRps = round(overflow + failedByRate);
        metric.idPoolRemaining = round(Math.max(0, remainingKeys - keysAllocated));
        metric.idTimeToExhaustionSeconds = newIncoming > 0 ? round(metric.idPoolRemaining / (newIncoming * (node.data.config.idBatchSize ?? 1))) : null;
      }
      if (node.type === 'message-queue') {
        metric.queueEnqueued = round(newIncoming + injected);
        metric.queueDelivered = round(processed);
      }

      const edges = (outgoing.get(nodeId) ?? []).filter((edge) =>
        nodeById.has(edge.target),
      );
      const cacheBypass = input.scenario.events.some(
        (event) =>
          event.type === 'CACHE_BYPASS' &&
          event.nodeId === nodeId &&
          isActive(second, event.atSecond, event.durationSeconds),
      );
      const output: Demand = { read: available ? successfulOutput * availableDemand.read / available : 0, write: available ? successfulOutput * availableDemand.write / available : 0 };
      workloadOutput.set(nodeId, { ...output });

      if (node.type === 'cache') {
        const hitRate = cacheBypass
          ? 0
          : (node.data.config.hitRatePercent ?? 80) / 100;
        const baseMissRps = output.read * (1 - hitRate);
        const expiration = input.scenario.events.find(
          (event) =>
            event.type === 'CACHE_KEY_EXPIRATION' &&
            event.nodeId === nodeId &&
            isActive(second, event.atSecond, event.durationSeconds),
        );
        let forcedMissRps = 0;
        let originRps = baseMissRps;
        let coalescedRps = 0;
        let lockWaitRps = 0;
        let lockTimeoutRps = 0;
        let staleServedRps = 0;
        let refreshRps = 0;
        let refreshFailureRps = 0;

        if (expiration?.type === 'CACHE_KEY_EXPIRATION' && !cacheBypass) {
          const age = second - expiration.atSecond;
          const jitterWindow =
            expiration.keyCount > 1
              ? Math.max(
                  1,
                  Math.min(
                    expiration.keyCount,
                    Math.ceil(
                      (node.data.config.ttlSeconds ?? 300) *
                        ((node.data.config.ttlJitterPercent ?? 0) / 100),
                    ),
                  ),
                )
              : 1;
          forcedMissRps =
            (successfulOutput *
              hitRate *
              (expiration.affectedTrafficPercent / 100)) /
            jitterWindow;
          const batchKeys = Math.max(1, expiration.keyCount / jitterWindow);
          const newBatch =
            expiration.keyCount === 1 ? age === 0 : age < jitterWindow;
          const refreshWorkers = input.nodes.filter(
            (candidate) =>
              candidate.type === 'worker' &&
              candidate.data.config.workerRole === 'cache-refresh' &&
              [
                ...(incomingEdges.get(nodeId) ?? []),
                ...(outgoing.get(nodeId) ?? []),
              ].some(
                (edge) =>
                  edge.source === candidate.id || edge.target === candidate.id,
              ),
          );
          const activeRefreshWorkers = refreshWorkers.filter(
            (worker) =>
              !input.scenario.events.some(
                (event) =>
                  event.type === 'NODE_FAILURE' &&
                  event.nodeId === worker.id &&
                  isActive(second, event.atSecond, event.durationSeconds),
              ),
          );
          const refreshEnabled = Boolean(node.data.config.backgroundRefresh);
          const preRefreshed =
            refreshEnabled && activeRefreshWorkers.length > 0;
          if (preRefreshed) {
            refreshRps = newBatch ? batchKeys : 0;
            originRps += refreshRps;
            forcedMissRps = 0;
          } else {
            if (refreshEnabled && refreshWorkers.length > 0) {
              refreshFailureRps = forcedMissRps;
            }
            const staleAvailable =
              (node.data.config.staleWindowSeconds ?? 0) > age;
            const lockTtlMs = node.data.config.lockTtlMs ?? 5000;
            const lockExpired =
              Boolean(node.data.config.cacheLocking) &&
              age > 0 &&
              (age * 1000) % lockTtlMs < 1000;
            const upstreamApplications = Math.max(
              1,
              (incomingEdges.get(nodeId) ?? []).filter(
                (edge) =>
                  nodeById.get(edge.source)?.type === 'application-server',
              ).length,
            );
            let rebuildRps = forcedMissRps;
            if (node.data.config.cacheLocking) {
              rebuildRps = newBatch || lockExpired ? batchKeys : 0;
              lockWaitRps = Math.max(0, forcedMissRps - rebuildRps);
            } else if (node.data.config.requestCoalescing) {
              rebuildRps = newBatch ? batchKeys * upstreamApplications : 0;
              coalescedRps = Math.max(0, forcedMissRps - rebuildRps);
            } else if (staleAvailable) {
              rebuildRps = newBatch ? batchKeys : 0;
            }
            if (staleAvailable) {
              staleServedRps = forcedMissRps;
              lockWaitRps = 0;
              coalescedRps = Math.max(coalescedRps, forcedMissRps - rebuildRps);
            } else if (
              node.data.config.cacheLocking &&
              expiration.rebuildDurationSeconds * 1000 >
                (node.data.config.lockWaitTimeoutMs ?? 500)
            ) {
              lockTimeoutRps = lockWaitRps;
            }
            refreshRps = rebuildRps;
            originRps += rebuildRps;
          }
          metric.cacheRebuildLatencyMs =
            expiration.rebuildDurationSeconds * 1000;
          if (coalescedRps > 0 || lockWaitRps > 0) {
            metric.averageLatencyMs = round(
              metric.averageLatencyMs + expiration.rebuildDurationSeconds * 500,
            );
            metric.p95LatencyMs = round(
              metric.p95LatencyMs + expiration.rebuildDurationSeconds * 1000,
            );
          }
        }

        metric.cacheHitRps = round(
          Math.max(0, output.read - baseMissRps - forcedMissRps),
        );
        metric.cacheMissRps = round(baseMissRps + forcedMissRps);
        metric.cacheOriginRps = round(originRps);
        metric.coalescedRps = round(coalescedRps);
        metric.lockWaitRps = round(lockWaitRps);
        metric.lockTimeoutRps = round(lockTimeoutRps);
        metric.staleServedRps = round(staleServedRps);
        metric.refreshRps = round(refreshRps);
        metric.refreshFailureRps = round(refreshFailureRps);
        metric.failedRps = round(metric.failedRps + lockTimeoutRps);
        output.read = originRps;

      }
      const normalized = ['load-balancer', 'sharding', 'message-queue'].includes(node.type);
      if (normalized) metric.routedRps = {};
      for (const edge of edges) {
        const weights = emptyDemand();
        const transferredDemand = emptyDemand();
        for (const kind of kinds) {
          const eligible = edges.filter(candidate =>
            (candidate.config.trafficType === 'mixed' || candidate.config.trafficType === kind) &&
            (node.type !== 'load-balancer' || !unavailable(candidate.target)));
          const total = eligible.reduce((sum, candidate) => sum + candidate.config.trafficPercentage, 0);
          const weight = !eligible.includes(edge) ? 0 : normalized
            ? total > 0 ? edge.config.trafficPercentage / total : 1 / Math.max(1, eligible.length)
            : edge.config.trafficPercentage / 100;
          weights[kind] = weight;
          transferredDemand[kind] = output[kind] * weight;
        }
        routeWeights.set(edge.id, weights);
        const baseTransferred = transferredDemand.read + transferredDemand.write;
        const target = nodeById.get(edge.target)!;
        const attempts = Math.min(3, Math.max(0, edge.config.retryCount));
        const targetFailureRate =
          1 -
          (1 - target.data.config.failureRate) *
            (1 - (input.scenario.ambientFailureRate ?? 0));
        const retries = baseTransferred * targetFailureRate * attempts;
        const transferred = baseTransferred + retries;
        const targetDemand = workloadIncoming.get(edge.target) ?? emptyDemand();
        for (const kind of kinds) targetDemand[kind] += transferredDemand[kind] * (1 + targetFailureRate * attempts);
        workloadIncoming.set(edge.target, targetDemand);
        incoming.set(
          edge.target,
          (incoming.get(edge.target) ?? 0) + transferred,
        );
        const addedLatency = input.scenario.events
          .filter(
            (event) =>
              event.type === 'EDGE_LATENCY' &&
              event.edgeId === edge.id &&
              isActive(second, event.atSecond, event.durationSeconds),
          )
          .reduce(
            (sum, event) =>
              event.type === 'EDGE_LATENCY' ? sum + event.addedLatencyMs : sum,
            0,
          );
        const effectiveLatency = edge.config.latencyMs + addedLatency;
        edgeMetrics[edge.id] = {
          transferredRps: round(transferred),
          effectiveLatencyMs: round(effectiveLatency),
          retries: round(retries),
          timeouts:
            effectiveLatency > edge.config.timeoutMs
              ? round(baseTransferred)
              : 0,
          failedRps: 0,
          rejectedRps: 0,
          processingFailureRps: 0,
          unavailableRps: 0,
          diagnostics: [],
        };
        if (metric.routedRps)
          metric.routedRps[edge.target] = round(transferred);
      }
      nodeMetrics[nodeId] = metric;

      const oldStatus = previousStatus.get(nodeId);
      if (oldStatus !== status && status !== 'normal') {
        events.push({
          id: `threshold-${second}-${nodeId}-${status}`,
          second,
          severity: status === 'warning' ? 'warning' : 'critical',
          message:
            status === 'failed'
              ? `${node.data.label} is unavailable.`
              : `${node.data.label} entered ${status} utilization at ${round(utilization * 100)}%.`,
          nodeId,
          evidence: {
            utilization: round(utilization),
            backlog: round(newBacklog),
          },
        });
      }
      previousStatus.set(nodeId, status);
    }

    for (const edge of activeEdges) {
      const metric = edgeMetrics[edge.id];
      const targetMetric = nodeMetrics[edge.target];
      if (!metric || !targetMetric) continue;
      if (targetMetric.status === 'failed') {
        metric.unavailableRps = metric.transferredRps;
      } else if (targetMetric.incomingRps > 0) {
        metric.rejectedRps = round(
          metric.transferredRps *
            Math.min(1, targetMetric.rejectedRps / targetMetric.incomingRps),
        );
        metric.processingFailureRps = round(
          metric.transferredRps *
            Math.min(
              1,
              targetMetric.processingFailureRps / targetMetric.incomingRps,
            ),
        );
      }
      metric.failedRps = round(
        Math.min(
          metric.transferredRps,
          metric.unavailableRps +
            metric.rejectedRps +
            metric.processingFailureRps +
            metric.timeouts,
        ),
      );
      metric.diagnostics = buildEdgeDiagnostics(edge, metric);
    }

    const previousTick = ticks.at(-1);
    for (const node of input.nodes) {
      const metric = nodeMetrics[node.id];
      if (!metric) continue;
      metric.diagnostics = buildNodeDiagnostics(
        node,
        metric,
        previousTick?.nodes[node.id],
      );
    }

    const memo = new Map<
      string,
      { success: number; averageLatency: number; p95Latency: number }
    >();
    const evaluate = (
      nodeId: string,
      kind: WorkloadKind,
    ): { success: number; averageLatency: number; p95Latency: number } => {
      const cached = memo.get(`${nodeId}:${kind}`);
      if (cached) return cached;
      const node = nodeById.get(nodeId);
      const metric = nodeMetrics[nodeId];
      if (!node || !metric)
        return { success: 0, averageLatency: 0, p95Latency: 0 };
      let success =
        metric.incomingRps > 0
          ? Math.max(
              0,
              (metric.processedRps - metric.processingFailureRps) /
                metric.incomingRps,
            )
          : 1;
      const configuredEdges = outgoing.get(nodeId) ?? [];
      if (configuredEdges.length && !configuredEdges.some(edge => edge.config.trafficType === 'mixed' || edge.config.trafficType === kind)) success = 0;
      let childAverage = 0;
      let childP95 = 0;
      const syncEdges = (outgoing.get(nodeId) ?? []).filter(
        (edge) => edge.config.mode === 'synchronous' && (edge.config.trafficType === 'mixed' || edge.config.trafficType === kind),
      );
      if (['sharding', 'load-balancer'].includes(node.type) && syncEdges.length) {
        let weightedSuccess = 0;
        for (const edge of syncEdges) {
          const child = evaluate(edge.target, kind);
          const weight = routeWeights.get(edge.id)?.[kind] ?? 0;
          if (weight === 0) continue;
          weightedSuccess += child.success * weight;
          childAverage = Math.max(
            childAverage,
            (edgeMetrics[edge.id]?.effectiveLatencyMs ??
              edge.config.latencyMs) + child.averageLatency,
          );
          childP95 = Math.max(
            childP95,
            (edgeMetrics[edge.id]?.effectiveLatencyMs ??
              edge.config.latencyMs) + child.p95Latency,
          );
        }
        success *= weightedSuccess;
      } else {
        for (const edge of syncEdges) {
          const child = evaluate(edge.target, kind);
          let probability = routeWeights.get(edge.id)?.[kind] ?? 0;
          if (node.type === 'cache' && kind === 'read') {
            probability *=
              (workloadOutput.get(nodeId)?.read ?? 0) > 0
                ? Math.min(
                    1,
                    (metric.cacheOriginRps ?? metric.cacheMissRps ?? 0) /
                      (workloadOutput.get(nodeId)?.read ?? 1),
                  )
                : 0;
          }
          if (probability === 0) continue;
          success *= 1 - probability + probability * child.success;
          childAverage = Math.max(
            childAverage,
            (edgeMetrics[edge.id]?.effectiveLatencyMs ??
              edge.config.latencyMs) + child.averageLatency,
          );
          childP95 = Math.max(
            childP95,
            (edgeMetrics[edge.id]?.effectiveLatencyMs ??
              edge.config.latencyMs) + child.p95Latency,
          );
        }
      }
      const result = {
        success: Math.min(
          1,
          Math.max(
            0,
            success *
              (metric.processedRps > 0
                ? 1 - (metric.lockTimeoutRps ?? 0) / metric.processedRps
                : 1),
          ),
        ),
        averageLatency: metric.averageLatencyMs + childAverage,
        p95Latency: metric.p95LatencyMs + childP95,
      };
      memo.set(`${nodeId}:${kind}`, result);
      return result;
    };

    let generatedRps = 0;
    let successfulRps = 0;
    let latencyTotal = 0;
    let p95Total = 0;
    const workloads = Object.fromEntries(kinds.map(kind => [kind, { generatedRps: 0, successfulRps: 0, failedRps: 0, averageLatencyMs: 0, p95LatencyMs: 0 }])) as Record<WorkloadKind, WorkloadMetric>;
    for (const [sourceId, demand] of traffic) {
      for (const kind of kinds) {
        const rps = demand[kind];
        if (!rps) continue;
        const result = evaluate(sourceId, kind);
        generatedRps += rps;
        successfulRps += rps * result.success;
        latencyTotal += rps * result.averageLatency;
        p95Total += rps * result.p95Latency;
        workloads[kind].generatedRps += rps;
        workloads[kind].successfulRps += rps * result.success;
        workloads[kind].averageLatencyMs += rps * result.averageLatency;
        workloads[kind].p95LatencyMs += rps * result.p95Latency;
      }
    }
    for (const kind of kinds) {
      const metric = workloads[kind];
      metric.failedRps = round(Math.max(0, metric.generatedRps - metric.successfulRps));
      metric.successfulRps = round(metric.successfulRps);
      metric.averageLatencyMs = round(metric.averageLatencyMs / (metric.generatedRps || 1));
      metric.p95LatencyMs = round(metric.p95LatencyMs / (metric.generatedRps || 1));
    }
    const global: GlobalMetric = {
      generatedRps: round(generatedRps),
      successfulRps: round(successfulRps),
      failedRps: round(Math.max(0, generatedRps - successfulRps)),
      errorRate: round(
        generatedRps > 0 ? (generatedRps - successfulRps) / generatedRps : 0,
      ),
      averageLatencyMs: round(
        generatedRps > 0 ? latencyTotal / generatedRps : 0,
      ),
      p95LatencyMs: round(generatedRps > 0 ? p95Total / generatedRps : 0),
      queueDepth: round(
        Object.values(nodeMetrics).reduce(
          (sum, metric) => sum + metric.backlog,
          0,
        ),
      ),
      estimatedMonthlyCost,
    };
    ticks.push({
      second,
      workloads,
      global,
      nodes: nodeMetrics,
      edges: edgeMetrics,
      events,
    });
  }

  const peakMetric = ticks.reduce((peak, tick) => {
    for (const key of Object.keys(peak) as (keyof GlobalMetric)[]) {
      peak[key] = Math.max(peak[key], tick.global[key]);
    }
    return peak;
  }, zeroGlobal());
  const finalMetric = ticks.at(-1)?.global ?? zeroGlobal();
  const summary: SimulationSummary = {
    engineVersion: ENGINE_VERSION,
    workloads: ticks.at(-1)?.workloads,
    runId: input.runId,
    architectureId: input.architectureId,
    architectureUpdatedAt: input.architectureUpdatedAt,
    scenarioId: input.scenario.id,
    scenarioName: input.scenario.name,
    completedAt: new Date().toISOString(),
    durationSeconds: input.scenario.durationSeconds,
    finalMetric,
    peakMetric,
    findings: buildFindings(ticks),
  };
  return { ticks, summary };
}

export function simulateTickStream(input: SimulationInput) {
  return runSimulation(input);
}
