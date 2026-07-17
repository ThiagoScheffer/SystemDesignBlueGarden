import type {
  ArchitectureEdgeV1,
  ArchitectureNodeV1,
} from '../architecture/types';
import type {
  DiagnosticCode,
  DiagnosticTopic,
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

const componentTopic = (node: ArchitectureNodeV1): DiagnosticTopic => {
  if (node.type === 'cache') return 'cache';
  if (node.type === 'message-queue') return 'queue';
  if (node.type === 'sharding') return 'sharding';
  return 'capacity';
};

const isIncidentRate = (affectedRps: number, affectedPercent: number) =>
  affectedRps >= 1 && affectedPercent >= 1;

function diagnostic(
  id: string,
  code: DiagnosticCode,
  topic: DiagnosticTopic,
  category: SimulationDiagnostic['category'],
  severity: SimulationDiagnostic['severity'],
  title: string,
  explanation: string,
  affectedRps: number,
  affectedPercent: number,
): SimulationDiagnostic {
  return {
    id,
    code,
    topic,
    category,
    severity,
    title,
    explanation,
    affectedRps: round(affectedRps),
    affectedPercent: round(affectedPercent),
  };
}

export function buildNodeDiagnostics(
  node: ArchitectureNodeV1,
  metric: NodeMetric,
  previous?: NodeMetric,
): SimulationDiagnostic[] {
  const result: SimulationDiagnostic[] = [];
  const loadPercent = metric.loadRatio === null ? null : metric.loadRatio * 100;

  if (metric.status === 'failed' && metric.offeredRps > 0) {
    result.push(
      diagnostic(
        `${node.id}-unavailable`,
        'component-unavailable',
        'failure',
        'error',
        'critical',
        'Component unavailable',
        'No capacity is available, so incoming requests cannot be processed.',
        metric.offeredRps,
        100,
      ),
    );
  }

  if (metric.rejectedRps > 0) {
    const rejectedPercent = percent(metric.rejectedRps, metric.offeredRps);
    result.push(
      diagnostic(
        `${node.id}-rejected`,
        'capacity-rejection',
        'capacity',
        'error',
        'critical',
        node.type === 'load-balancer' || node.type === 'api-gateway'
          ? 'Connections dropped'
          : 'Requests rejected',
        `${displayPercent(rejectedPercent)}% rejected at capacity`,
        metric.rejectedRps,
        rejectedPercent,
      ),
    );
  }

  if (metric.processingFailureRps > 0) {
    const failurePercent = percent(
      metric.processingFailureRps,
      metric.processedRps,
    );
    if (isIncidentRate(metric.processingFailureRps, failurePercent)) {
      result.push(
        diagnostic(
          `${node.id}-processing-failure`,
          'processing-failure',
          'failure',
          'error',
          failurePercent >= 10 ? 'critical' : 'warning',
          node.type === 'load-balancer' || node.type === 'api-gateway'
            ? 'Server errors'
            : 'Processing errors',
          `${displayPercent(failurePercent)}% of requests failing`,
          metric.processingFailureRps,
          failurePercent,
        ),
      );
    }
  }

  if (loadPercent !== null && loadPercent >= 80) {
    result.push(
      diagnostic(
        `${node.id}-capacity-bottleneck`,
        'capacity-saturation',
        componentTopic(node),
        'bottleneck',
        loadPercent >= 100 ? 'critical' : 'warning',
        'Capacity saturation',
        `${displayPercent(loadPercent)}% of configured capacity is demanded.`,
        metric.offeredRps,
        loadPercent,
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
        'queue-growth',
        node.type === 'message-queue' ? 'queue' : componentTopic(node),
        'bottleneck',
        queuePercent >= 80 || metric.rejectedRps > 0 ? 'critical' : 'warning',
        node.type === 'message-queue' ? 'Consumer lag' : 'Queue buildup',
        `${Math.round(metric.backlog).toLocaleString()} requests are waiting${backlogGrowing ? ' and the backlog is growing' : ''}.`,
        metric.backlog,
        queuePercent,
      ),
    );
  }

  if (metric.p95LatencyMs >= 500) {
    result.push(
      diagnostic(
        `${node.id}-latency-bottleneck`,
        'high-tail-latency',
        'latency',
        'bottleneck',
        metric.p95LatencyMs >= 1000 ? 'critical' : 'warning',
        'High tail latency',
        `P95 latency reached ${Math.round(metric.p95LatencyMs).toLocaleString()} ms.`,
        metric.processedRps,
        percent(metric.processedRps, metric.offeredRps),
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
        'cache-miss-amplification',
        'cache',
        'bottleneck',
        missPercent >= 80 ? 'critical' : 'warning',
        'Cache miss amplification',
        `${displayPercent(missPercent)}% of reads continue to the backing store.`,
        metric.cacheMissRps,
        missPercent,
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
          'hot-shard',
          'sharding',
          'bottleneck',
          hottest / average >= 2 ? 'critical' : 'warning',
          'Hot shard',
          `The busiest shard receives ${displayPercent((hottest / average) * 100)}% of the average shard load.`,
          hottest,
          percent(
            hottest,
            routes.reduce((sum, value) => sum + value, 0),
          ),
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
        'timeout',
        'latency',
        'error',
        'critical',
        'Requests timed out',
        `${displayPercent(percent(metric.timeouts, metric.transferredRps))}% exceeded the connection timeout.`,
        metric.timeouts,
        percent(metric.timeouts, metric.transferredRps),
      ),
    );
  }
  if (metric.unavailableRps > 0) {
    result.push(
      diagnostic(
        `${edge.id}-downstream-unavailable`,
        'downstream-unavailable',
        'failure',
        'error',
        'critical',
        'Downstream component unavailable',
        'The destination cannot process requests.',
        metric.unavailableRps,
        percent(metric.unavailableRps, metric.transferredRps),
      ),
    );
  }
  if (metric.rejectedRps > 0) {
    result.push(
      diagnostic(
        `${edge.id}-downstream-rejection`,
        'downstream-rejection',
        'capacity',
        'error',
        'critical',
        'Downstream requests rejected',
        `${displayPercent(percent(metric.rejectedRps, metric.transferredRps))}% were rejected at the destination.`,
        metric.rejectedRps,
        percent(metric.rejectedRps, metric.transferredRps),
      ),
    );
  }
  const downstreamFailurePercent = percent(
    metric.processingFailureRps,
    metric.transferredRps,
  );
  if (isIncidentRate(metric.processingFailureRps, downstreamFailurePercent)) {
    result.push(
      diagnostic(
        `${edge.id}-downstream-processing-failure`,
        'downstream-processing-failure',
        'failure',
        'error',
        downstreamFailurePercent >= 10 ? 'critical' : 'warning',
        'Downstream requests failed',
        `${displayPercent(downstreamFailurePercent)}% failed at the destination.`,
        metric.processingFailureRps,
        downstreamFailurePercent,
      ),
    );
  }
  if (metric.retries > 0) {
    result.push(
      diagnostic(
        `${edge.id}-retries`,
        'retry-amplification',
        'failure',
        'bottleneck',
        metric.retries >= metric.transferredRps * 0.1 ? 'critical' : 'warning',
        'Retry amplification',
        `${round(metric.retries)} retry requests/second add downstream load.`,
        metric.retries,
        percent(metric.retries, metric.transferredRps),
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
