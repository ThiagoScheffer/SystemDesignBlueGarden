import type {
  ArchitectureDocumentV1,
  ComponentType,
} from '../architecture/types';
import type {
  EvaluationRule,
  EvidenceState,
  LearningRunMetrics,
  LearningRunSnapshot,
  RubricDefinition,
  RubricCriterionDefinition,
} from './types';
import type {
  SimulationScenario,
  SimulationSummary,
  SimulationTick,
} from '../simulation/types';

export interface RubricObservation {
  criterionId: string;
  label: string;
  explanation: string;
  state: EvidenceState;
  evidence: string;
}

const round = (value: number) => Math.round(value * 100) / 100;

export function collectLearningRunMetrics(
  document: ArchitectureDocumentV1,
  ticks: SimulationTick[],
): LearningRunMetrics {
  const cacheIds = new Set(
    document.nodes
      .filter((node) => node.type === 'cache')
      .map((node) => node.id),
  );
  const databaseIds = new Set(
    document.nodes
      .filter(
        (node) =>
          node.type === 'sql-database' || node.type === 'nosql-database',
      )
      .map((node) => node.id),
  );
  const metrics: LearningRunMetrics = {
    databasePeakOfferedRps: 0,
    cachePeakOriginRps: 0,
    cachePeakLockWaitRps: 0,
    cacheTotalLockTimeouts: 0,
    cacheTotalStaleResponses: 0,
    cacheTotalCoalescedRequests: 0,
    globalPeakP95LatencyMs: 0,
    globalPeakErrorRate: 0,
  };
  for (const tick of ticks) {
    metrics.globalPeakP95LatencyMs = Math.max(
      metrics.globalPeakP95LatencyMs,
      tick.global.p95LatencyMs,
    );
    metrics.globalPeakErrorRate = Math.max(
      metrics.globalPeakErrorRate,
      tick.global.errorRate,
    );
    for (const [nodeId, metric] of Object.entries(tick.nodes)) {
      if (databaseIds.has(nodeId))
        metrics.databasePeakOfferedRps = Math.max(
          metrics.databasePeakOfferedRps,
          metric.offeredRps,
        );
      if (!cacheIds.has(nodeId)) continue;
      metrics.cachePeakOriginRps = Math.max(
        metrics.cachePeakOriginRps,
        metric.cacheOriginRps ?? 0,
      );
      metrics.cachePeakLockWaitRps = Math.max(
        metrics.cachePeakLockWaitRps,
        metric.lockWaitRps ?? 0,
      );
      metrics.cacheTotalLockTimeouts += metric.lockTimeoutRps ?? 0;
      metrics.cacheTotalStaleResponses += metric.staleServedRps ?? 0;
      metrics.cacheTotalCoalescedRequests += metric.coalescedRps ?? 0;
    }
  }
  for (const key of Object.keys(metrics) as Array<keyof LearningRunMetrics>)
    metrics[key] = round(metrics[key]);
  return metrics;
}

export function createLearningRunSnapshot(
  document: ArchitectureDocumentV1,
  scenario: SimulationScenario,
  summary: SimulationSummary,
  ticks: SimulationTick[],
): LearningRunSnapshot {
  return {
    id: summary.runId,
    createdAt: summary.completedAt,
    architecture: structuredClone(document),
    scenario: structuredClone(scenario),
    summary: structuredClone(summary),
    metrics: collectLearningRunMetrics(document, ticks),
  };
}

function nodesOf(document: ArchitectureDocumentV1, type: ComponentType) {
  return document.nodes.filter((node) => node.type === type);
}

function evaluateRule(
  rule: EvaluationRule,
  document: ArchitectureDocumentV1,
  runs: LearningRunSnapshot[],
): { state: EvidenceState; evidence: string } {
  if (rule.type === 'workload-run') {
    const evidence = runs.filter(run => run.summary.engineVersion).map(run => run.summary.workloads?.[rule.trafficType]).filter(metric => metric && metric.generatedRps > 0);
    const observed = evidence.some(metric => metric!.failedRps / metric!.generatedRps * 100 <= rule.maximumFailurePercent);
    return { state: observed ? 'observed' : evidence.length ? 'partial' : 'not-represented', evidence: evidence.length ? `${rule.trafficType} completion evidence evaluated against ${rule.maximumFailurePercent}% maximum failure; inspect incident ticks separately.` : 'A versioned run with this workload is required.' };
  }
  if (rule.type === 'workload-path') {
    const nodes = new Map(document.nodes.map(node => [node.id, node]));
    const starts = document.nodes.filter(node => node.type === rule.from && (!rule.fromRole || node.data.config.applicationRole === rule.fromRole || node.data.config.workerRole === rule.fromRole));
    const edges = document.edges.filter(edge => !edge.config.disabled && edge.config.trafficPercentage > 0 && (edge.config.trafficType === 'mixed' || edge.config.trafficType === rule.trafficType));
    const pending = starts.map(node => ({ id: node.id, via: !rule.via || node.type === rule.via, async: false }));
    const visited = new Set<string>();
    let observed = false;
    while (pending.length) {
      const current = pending.pop()!;
      const key = `${current.id}:${current.via}:${current.async}`;
      if (visited.has(key)) continue;
      visited.add(key);
      const node = nodes.get(current.id)!;
      if (node.type === rule.to && current.via && (rule.asynchronous === undefined || current.async === rule.asynchronous) && (!rule.toRole || node.data.config.applicationRole === rule.toRole || node.data.config.workerRole === rule.toRole)) { observed = true; break; }
      for (const edge of edges.filter(edge => edge.source === current.id)) pending.push({ id: edge.target, via: current.via || nodes.get(edge.target)?.type === rule.via, async: current.async || edge.config.mode === 'asynchronous' });
    }
    return { state: observed ? 'observed' : 'not-represented', evidence: observed ? `Active ${rule.trafficType} path observed through the configured semantic roles.` : `No eligible ${rule.trafficType} path connects the required roles.` };
  }
  if (rule.type === 'component-count') {
    const count = document.nodes.filter((node) =>
      rule.componentTypes.includes(node.type),
    ).length;
    return {
      state:
        count >= rule.minimum
          ? 'observed'
          : count > 0
            ? 'partial'
            : 'not-represented',
      evidence: `${count} matching component${count === 1 ? '' : 's'} observed.`,
    };
  }
  if (rule.type === 'active-path') {
    const activeEdges = document.edges.filter((edge) => !edge.config.disabled);
    let candidates = nodesOf(document, rule.componentTypes[0]).map(
      (node) => node.id,
    );
    for (const type of rule.componentTypes.slice(1)) {
      const targets = new Set(nodesOf(document, type).map((node) => node.id));
      candidates = activeEdges
        .filter(
          (edge) =>
            candidates.includes(edge.source) && targets.has(edge.target),
        )
        .map((edge) => edge.target);
    }
    const allPresent = rule.componentTypes.every(
      (type) => nodesOf(document, type).length > 0,
    );
    return {
      state: candidates.length
        ? 'observed'
        : allPresent
          ? 'partial'
          : 'not-represented',
      evidence: candidates.length
        ? `Active ${rule.componentTypes.join(' → ')} path observed.`
        : allPresent
          ? 'Required components exist but are not connected in the expected active direction.'
          : 'One or more required request-path roles are absent.',
    };
  }
  if (rule.type === 'config-enabled') {
    const nodes = nodesOf(document, rule.componentType);
    const enabled = nodes.flatMap((node) =>
      rule.keys.filter((key) => {
        const value = node.data.config[key];
        return value === true || (typeof value === 'number' && value > 0);
      }),
    );
    return {
      state:
        enabled.length >= rule.minimumEnabled
          ? 'observed'
          : enabled.length
            ? 'partial'
            : 'not-represented',
      evidence: enabled.length
        ? `Enabled configuration: ${[...new Set(enabled)].join(', ')}.`
        : 'No matching mitigation is enabled.',
    };
  }
  if (rule.type === 'cache-lock-safety') {
    const caches = nodesOf(document, 'cache');
    const locking = caches.filter((node) => node.data.config.cacheLocking);
    const safe = locking.filter(
      (node) =>
        Number(node.data.config.lockWaitTimeoutMs) >= 0 &&
        Number(node.data.config.lockTtlMs) >
          Number(node.data.config.lockWaitTimeoutMs),
    );
    return {
      state: safe.length
        ? 'observed'
        : locking.length
          ? 'partial'
          : 'not-represented',
      evidence: safe.length
        ? 'Lock TTL exceeds the bounded wait timeout.'
        : locking.length
          ? 'Locking is enabled but its expiry/wait bounds are unsafe.'
          : 'Cache locking is not enabled.',
    };
  }
  if (rule.type === 'cache-refresh-connection') {
    const caches = nodesOf(document, 'cache').filter(
      (node) => node.data.config.backgroundRefresh,
    );
    const workers = new Set(
      nodesOf(document, 'worker')
        .filter((node) => node.data.config.workerRole === 'cache-refresh')
        .map((node) => node.id),
    );
    const connected = document.edges.some(
      (edge) =>
        !edge.config.disabled &&
        ((workers.has(edge.source) &&
          caches.some((node) => node.id === edge.target)) ||
          (workers.has(edge.target) &&
            caches.some((node) => node.id === edge.source))),
    );
    return {
      state: connected
        ? 'observed'
        : caches.length || workers.size
          ? 'partial'
          : 'not-represented',
      evidence: connected
        ? 'A cache-refresh Worker is actively connected to the cache.'
        : 'Background refresh and its worker connection are incomplete.',
    };
  }
  if (rule.type === 'run-observation') {
    const value = Math.max(0, ...runs.map((run) => run.metrics[rule.metric]));
    const observed =
      rule.operator === 'gt'
        ? value > rule.value
        : rule.operator === 'gte'
          ? value >= rule.value
          : rule.operator === 'lt'
            ? value < rule.value
            : value <= rule.value;
    return {
      state: observed && runs.length > 0
        ? 'observed'
        : runs.length
          ? 'partial'
          : 'not-represented',
      evidence: runs.length
        ? `${rule.metric}: ${round(value)}.`
        : 'No completed learning run is available.',
    };
  }
  if (runs.length >= 2 && runs[0].summary.engineVersion !== runs.at(-1)?.summary.engineVersion) return { state: 'not-represented', evidence: 'Rerun both designs with the same engine version before comparing improvements.' };
  const first = runs[0]?.metrics[rule.metric];
  const latest = runs.at(-1)?.metrics[rule.metric];
  if (first === undefined || latest === undefined || runs.length < 2)
    return {
      state: 'not-represented',
      evidence: 'Two completed learning runs are required.',
    };
  const improvement = first > 0 ? ((first - latest) / first) * 100 : 0;
  return {
    state: improvement >= rule.minimumPercent ? 'observed' : 'partial',
    evidence: `${rule.metric} changed from ${round(first)} to ${round(latest)} (${round(improvement)}% reduction).`,
  };
}

export function evaluateRubric(
  rubric: RubricDefinition,
  document: ArchitectureDocumentV1,
  runs: LearningRunSnapshot[],
): RubricObservation[] {
  return rubric.criteria.map((criterion: RubricCriterionDefinition) => ({
    criterionId: criterion.id,
    label: criterion.label,
    explanation: criterion.explanation,
    ...evaluateRule(criterion.rule, document, runs),
  }));
}
