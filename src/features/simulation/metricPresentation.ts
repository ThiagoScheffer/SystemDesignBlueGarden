import type { EdgeMetric, NodeMetric } from '../../domain/simulation/types';

type MetricKey = Exclude<
  keyof NodeMetric | keyof EdgeMetric,
  'diagnostics' | 'routedRps'
>;
type Format = 'rps' | 'ms' | 'percent' | 'count' | 'text';
export const metricPresentation = {
  status: ['Status', 'text'],
  incomingRps: ['Incoming traffic', 'rps'],
  offeredRps: ['Offered traffic', 'rps'],
  processedRps: ['Processed traffic', 'rps'],
  effectiveCapacity: ['Effective capacity', 'rps'],
  utilization: ['Utilization', 'percent'],
  loadRatio: ['Demand / capacity', 'percent'],
  backlog: ['Backlog', 'count'],
  overflow: ['Overflow', 'count'],
  rejectedRps: ['Rejected requests', 'rps'],
  processingFailureRps: ['Processing failures', 'rps'],
  failedRps: ['Failed requests', 'rps'],
  averageLatencyMs: ['Average latency', 'ms'],
  p95LatencyMs: ['P95 latency', 'ms'],
  cacheHitRps: ['Cache hits', 'rps'],
  cacheMissRps: ['Cache misses', 'rps'],
  cacheOriginRps: ['Origin traffic', 'rps'],
  coalescedRps: ['Coalesced requests', 'rps'],
  lockWaitRps: ['Requests waiting for lock', 'rps'],
  lockTimeoutRps: ['Lock timeouts', 'rps'],
  staleServedRps: ['Stale responses served', 'rps'],
  refreshRps: ['Refresh requests', 'rps'],
  refreshFailureRps: ['Refresh failures', 'rps'],
  cacheRebuildLatencyMs: ['Cache rebuild latency', 'ms'],
  queueEnqueued: ['Messages enqueued', 'count'],
  queueDelivered: ['Messages delivered', 'count'],
  transferredRps: ['Transferred traffic', 'rps'],
  effectiveLatencyMs: ['Effective latency', 'ms'],
  retries: ['Retries', 'count'],
  timeouts: ['Timeouts', 'count'],
  unavailableRps: ['Unavailable requests', 'rps'],
} satisfies Record<MetricKey, readonly [string, Format]>;

export function formatMetric(
  value: number | string | null,
  format: Format,
): string {
  if (value === null) return 'Unavailable';
  if (typeof value === 'string') return value;
  const number = (format === 'percent' ? value * 100 : value).toLocaleString(
    undefined,
    {
      maximumFractionDigits: format === 'count' ? 0 : 2,
    },
  );
  return `${number}${format === 'rps' ? ' req/s' : format === 'ms' ? ' ms' : format === 'percent' ? '%' : ''}`;
}

export function metricRows(metric: NodeMetric | EdgeMetric) {
  const rows = (Object.keys(metricPresentation) as MetricKey[]).flatMap(
    (key) => {
      const value = (metric as Partial<NodeMetric & EdgeMetric>)[key];
      const [label, format] = metricPresentation[key];
      return value === undefined
        ? []
        : [{ key, label, value: formatMetric(value, format) }];
    },
  );
  return [
    ...rows,
    ...Object.entries(
      'routedRps' in metric ? (metric.routedRps ?? {}) : {},
    ).map(([id, value]) => ({
      key: `route-${id}`,
      label: `Routed traffic: ${id}`,
      value: formatMetric(value, 'rps'),
    })),
  ];
}
