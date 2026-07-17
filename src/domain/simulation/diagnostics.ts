import type {
  ArchitectureEdgeV1,
  ArchitectureNodeV1,
} from '../architecture/types';
import type {
  EdgeMetric,
  NodeMetric,
  SimulationDiagnostic,
  SimulationTick,
} from './types';

const round = (value: number) =>
  Number.isFinite(value) ? Math.round(value * 10000) / 10000 : 0;
const percent = (part: number, total: number) =>
  round(total > 0 ? (part / total) * 100 : 0);
const displayPercent = (value: number) => Math.round(value).toLocaleString();

const componentTip = (node: ArchitectureNodeV1) => {
  if (node.type === 'cache') return 'cache';
  if (node.type === 'message-queue') return 'queue';
  if (node.type === 'sharding') return 'sharding';
  return 'capacity';
};

function diagnostic(
  id: string,
  category: SimulationDiagnostic['category'],
  severity: SimulationDiagnostic['severity'],
  title: string,
  explanation: string,
  affectedRps: number,
  affectedPercent: number,
  tipId?: string,
): SimulationDiagnostic {
  return {
    id,
    category,
    severity,
    title,
    explanation,
    affectedRps: round(affectedRps),
    affectedPercent: round(affectedPercent),
    tipId,
  };
}

export function buildNodeDiagnostics(
  node: ArchitectureNodeV1,
  metric: NodeMetric,
  previous?: NodeMetric,
): SimulationDiagnostic[] {
  const result: SimulationDiagnostic[] = [];
  const loadPercent = metric.loadRatio === null ? null : metric.loadRatio * 100;
  const loadTitle =
    node.type === 'load-balancer' || node.type === 'api-gateway'
      ? 'Overloaded'
      : `${node.data.label} overloaded`;

  if (metric.status === 'failed' && metric.offeredRps > 0) {
    result.push(
      diagnostic(
        `${node.id}-unavailable`,
        'error',
        'critical',
        'Component unavailable',
        'No capacity is available, so incoming requests cannot be processed.',
        metric.offeredRps,
        100,
        'failure',
      ),
    );
  } else if (loadPercent !== null && loadPercent > 100) {
    result.push(
      diagnostic(
        `${node.id}-overloaded`,
        'error',
        'critical',
        loadTitle,
        `${displayPercent(loadPercent)}% capacity, ${metric.backlog > 0 ? 'requests queueing' : 'demand exceeds throughput'}`,
        Math.max(0, metric.offeredRps - metric.effectiveCapacity),
        Math.max(0, loadPercent - 100),
        componentTip(node),
      ),
    );
  }

  if (metric.rejectedRps > 0) {
    const rejectedPercent = percent(metric.rejectedRps, metric.offeredRps);
    result.push(
      diagnostic(
        `${node.id}-rejected`,
        'error',
        'critical',
        node.type === 'load-balancer' || node.type === 'api-gateway'
          ? 'Connections dropped'
          : 'Requests rejected',
        `${displayPercent(rejectedPercent)}% rejected at capacity`,
        metric.rejectedRps,
        rejectedPercent,
        componentTip(node),
      ),
    );
  }

  if (metric.processingFailureRps > 0) {
    const failurePercent = percent(
      metric.processingFailureRps,
      metric.processedRps,
    );
    result.push(
      diagnostic(
        `${node.id}-processing-failure`,
        'error',
        failurePercent >= 10 ? 'critical' : 'warning',
        node.type === 'load-balancer' || node.type === 'api-gateway'
          ? 'Server errors'
          : 'Processing errors',
        `${displayPercent(failurePercent)}% of requests failing`,
        metric.processingFailureRps,
        failurePercent,
        'failure',
      ),
    );
  }

  if (loadPercent !== null && loadPercent >= 80) {
    result.push(
      diagnostic(
        `${node.id}-capacity-bottleneck`,
        'bottleneck',
        loadPercent >= 100 ? 'critical' : 'warning',
        'Capacity saturation',
        `${displayPercent(loadPercent)}% of configured capacity is demanded.`,
        metric.offeredRps,
        loadPercent,
        componentTip(node),
      ),
    );
  }

  const backlogGrowing =
    metric.backlog > 0 && (!previous || metric.backlog > previous.backlog);
  const queueLimit = node.data.config.queueLimit;
  const queuePercent = percent(metric.backlog, queueLimit);
  if (backlogGrowing || (queueLimit > 0 && queuePercent >= 80)) {
    result.push(
      diagnostic(
        `${node.id}-queue-bottleneck`,
        'bottleneck',
        queuePercent >= 80 || metric.rejectedRps > 0 ? 'critical' : 'warning',
        node.type === 'message-queue' ? 'Consumer lag' : 'Queue buildup',
        `${Math.round(metric.backlog).toLocaleString()} requests are waiting${backlogGrowing ? ' and the backlog is growing' : ''}.`,
        metric.backlog,
        queuePercent,
        node.type === 'message-queue' ? 'queue' : componentTip(node),
      ),
    );
  }

  if (metric.p95LatencyMs >= 500) {
    result.push(
      diagnostic(
        `${node.id}-latency-bottleneck`,
        'bottleneck',
        metric.p95LatencyMs >= 1000 ? 'critical' : 'warning',
        'High tail latency',
        `P95 latency reached ${Math.round(metric.p95LatencyMs).toLocaleString()} ms.`,
        metric.processedRps,
        percent(metric.processedRps, metric.offeredRps),
        'latency',
      ),
    );
  }

  if (
    node.type === 'cache' &&
    metric.cacheMissRps !== undefined &&
    metric.processedRps > 0 &&
    metric.cacheMissRps / metric.processedRps >= 0.5
  ) {
    const missPercent = percent(metric.cacheMissRps, metric.processedRps);
    result.push(
      diagnostic(
        `${node.id}-cache-misses`,
        'bottleneck',
        missPercent >= 80 ? 'critical' : 'warning',
        'Cache miss amplification',
        `${displayPercent(missPercent)}% of reads continue to the backing store.`,
        metric.cacheMissRps,
        missPercent,
        'cache',
      ),
    );
  }

  if (node.type === 'sharding' && metric.routedRps) {
    const routes = Object.values(metric.routedRps);
    const average =
      routes.reduce((sum, value) => sum + value, 0) / routes.length;
    const hottest = Math.max(0, ...routes);
    if (routes.length >= 2 && average > 0 && hottest / average >= 1.5) {
      result.push(
        diagnostic(
          `${node.id}-hot-shard`,
          'bottleneck',
          hottest / average >= 2 ? 'critical' : 'warning',
          'Hot shard',
          `The busiest shard receives ${displayPercent((hottest / average) * 100)}% of the average shard load.`,
          hottest,
          percent(
            hottest,
            routes.reduce((sum, value) => sum + value, 0),
          ),
          'sharding',
        ),
      );
    }
  }

  return result;
}

export function buildEdgeDiagnostics(
  edge: ArchitectureEdgeV1,
  metric: EdgeMetric,
): SimulationDiagnostic[] {
  const result: SimulationDiagnostic[] = [];
  if (metric.timeouts > 0) {
    result.push(
      diagnostic(
        `${edge.id}-timeouts`,
        'error',
        'critical',
        'Requests timed out',
        `${displayPercent(percent(metric.timeouts, metric.transferredRps))}% exceeded the connection timeout.`,
        metric.timeouts,
        percent(metric.timeouts, metric.transferredRps),
        'latency',
      ),
    );
  }
  if (metric.failedRps > 0) {
    result.push(
      diagnostic(
        `${edge.id}-downstream-failures`,
        'error',
        'critical',
        'Downstream requests failed',
        `${displayPercent(percent(metric.failedRps, metric.transferredRps))}% failed at the destination.`,
        metric.failedRps,
        percent(metric.failedRps, metric.transferredRps),
        'failure',
      ),
    );
  }
  if (metric.retries > 0) {
    result.push(
      diagnostic(
        `${edge.id}-retries`,
        'bottleneck',
        metric.retries >= metric.transferredRps * 0.1 ? 'critical' : 'warning',
        'Retry amplification',
        `${round(metric.retries)} retry requests/second add downstream load.`,
        metric.retries,
        percent(metric.retries, metric.transferredRps),
        'failure',
      ),
    );
  }
  return result;
}

export type EdgeDiagnosticState = 'error' | 'affected-error' | 'bottleneck';

export function computeAffectedEdgeStates(
  edges: ArchitectureEdgeV1[],
  tick?: SimulationTick,
): Record<string, EdgeDiagnosticState> {
  if (!tick) return {};
  const states: Record<string, EdgeDiagnosticState> = {};
  const reverse = new Map<string, ArchitectureEdgeV1[]>();
  for (const edge of edges) {
    if ((tick.edges[edge.id]?.transferredRps ?? 0) <= 0) continue;
    const incoming = reverse.get(edge.target) ?? [];
    incoming.push(edge);
    reverse.set(edge.target, incoming);
    const diagnostics = tick.edges[edge.id]?.diagnostics ?? [];
    if (diagnostics.some((entry) => entry.category === 'error'))
      states[edge.id] = 'error';
    else if (diagnostics.some((entry) => entry.category === 'bottleneck'))
      states[edge.id] = 'bottleneck';
  }

  const trace = (starts: string[], state: EdgeDiagnosticState) => {
    const visited = new Set<string>();
    const pending = [...starts];
    while (pending.length) {
      const nodeId = pending.shift()!;
      if (visited.has(nodeId)) continue;
      visited.add(nodeId);
      for (const edge of reverse.get(nodeId) ?? []) {
        if (!states[edge.id] || states[edge.id] === 'bottleneck')
          states[edge.id] = state;
        pending.push(edge.source);
      }
    }
  };

  const errorNodes = Object.entries(tick.nodes)
    .filter(([, metric]) =>
      metric.diagnostics.some((entry) => entry.category === 'error'),
    )
    .map(([id]) => id);
  const bottleneckNodes = Object.entries(tick.nodes)
    .filter(([, metric]) =>
      metric.diagnostics.some((entry) => entry.category === 'bottleneck'),
    )
    .map(([id]) => id);
  trace(bottleneckNodes, 'bottleneck');
  trace(errorNodes, 'affected-error');
  return states;
}
