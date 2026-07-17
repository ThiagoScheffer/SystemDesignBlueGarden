import type {
  ArchitectureEdgeV1,
  ArchitectureNodeV1,
} from '../architecture/types';
import { simulationScenarioSchema } from './schema';
import type {
  PreflightFinding,
  PreflightResult,
  SimulationScenario,
} from './types';

const isOperational = (node: ArchitectureNodeV1) =>
  node.type !== 'region' && node.type !== 'note';

const finding = (
  severity: PreflightFinding['severity'],
  code: string,
  message: string,
  target: { nodeId?: string; edgeId?: string } = {},
): PreflightFinding => ({
  id: `${code}-${target.nodeId ?? target.edgeId ?? message}`,
  severity,
  code,
  message,
  ...target,
});

export function runPreflight(
  nodes: ArchitectureNodeV1[],
  edges: ArchitectureEdgeV1[],
  scenario: SimulationScenario,
): PreflightResult {
  const errors: PreflightFinding[] = [];
  const warnings: PreflightFinding[] = [];
  const parsed = simulationScenarioSchema.safeParse(scenario);
  if (!parsed.success) {
    for (const issue of parsed.error.issues) {
      errors.push(finding('error', 'INVALID_SCENARIO', issue.message));
    }
  }

  const operational = nodes.filter(isOperational);
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const edgeById = new Map(edges.map((edge) => [edge.id, edge]));
  const outgoing = new Map<string, ArchitectureEdgeV1[]>();
  for (const edge of edges) {
    const list = outgoing.get(edge.source) ?? [];
    list.push(edge);
    outgoing.set(edge.source, list);
  }

  if (scenario.traffic.length === 0) {
    errors.push(
      finding('error', 'NO_TRAFFIC', 'Configure at least one traffic source.'),
    );
  }

  const reachable = new Set<string>();
  const visit = (id: string) => {
    if (reachable.has(id)) return;
    reachable.add(id);
    for (const edge of outgoing.get(id) ?? []) visit(edge.target);
  };

  for (const source of scenario.traffic) {
    const node = nodeById.get(source.sourceNodeId);
    if (!node || node.type !== 'client') {
      errors.push(
        finding(
          'error',
          'INVALID_TRAFFIC_SOURCE',
          `Traffic source ${source.sourceNodeId} must reference a Client.`,
          { nodeId: source.sourceNodeId },
        ),
      );
      continue;
    }
    visit(node.id);
    if ((outgoing.get(node.id) ?? []).length === 0) {
      errors.push(
        finding(
          'error',
          'UNREACHABLE_TRAFFIC',
          `${node.data.label} has no reachable operational target.`,
          { nodeId: node.id },
        ),
      );
    }
  }

  const reachableOperational = operational.filter((node) =>
    reachable.has(node.id),
  );
  const reachableIds = new Set(reachableOperational.map((node) => node.id));
  const indegree = new Map(reachableOperational.map((node) => [node.id, 0]));
  for (const edge of edges) {
    if (reachableIds.has(edge.source) && reachableIds.has(edge.target)) {
      indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
    }
  }
  const queue = reachableOperational
    .filter((node) => indegree.get(node.id) === 0)
    .map((node) => node.id)
    .sort();
  const order: string[] = [];
  while (queue.length) {
    const id = queue.shift()!;
    order.push(id);
    for (const edge of outgoing.get(id) ?? []) {
      if (!reachableIds.has(edge.target)) continue;
      const next = (indegree.get(edge.target) ?? 0) - 1;
      indegree.set(edge.target, next);
      if (next === 0) {
        queue.push(edge.target);
        queue.sort();
      }
    }
  }
  if (order.length !== reachableOperational.length) {
    errors.push(
      finding(
        'error',
        'DIRECTED_CYCLE',
        'The reachable operational graph contains a directed cycle.',
      ),
    );
  }

  for (const node of operational) {
    if (!reachable.has(node.id)) {
      warnings.push(
        finding(
          'warning',
          'DISCONNECTED_NODE',
          `${node.data.label} is not reachable from configured traffic.`,
          { nodeId: node.id },
        ),
      );
    }
    const targets = (outgoing.get(node.id) ?? [])
      .map((edge) => nodeById.get(edge.target))
      .filter((target): target is ArchitectureNodeV1 => Boolean(target));
    if (node.type === 'cache' && targets.length === 0) {
      warnings.push(
        finding(
          'warning',
          'CACHE_NO_FALLBACK',
          `${node.data.label} has no fallback for cache misses.`,
          { nodeId: node.id },
        ),
      );
    }
    if (node.type === 'message-queue' && targets.length === 0) {
      warnings.push(
        finding(
          'warning',
          'QUEUE_NO_CONSUMER',
          `${node.data.label} has no downstream consumer.`,
          { nodeId: node.id },
        ),
      );
    }
    if (node.type === 'sharding') {
      const databaseTargets = targets.filter(
        (target) =>
          target.type === 'sql-database' || target.type === 'nosql-database',
      );
      if (databaseTargets.length !== node.data.config.shardCount) {
        warnings.push(
          finding(
            'warning',
            'SHARD_COUNT_MISMATCH',
            `${node.data.label} declares ${node.data.config.shardCount} shards but has ${databaseTargets.length} database targets.`,
            { nodeId: node.id },
          ),
        );
      }
      if (databaseTargets.length !== targets.length) {
        warnings.push(
          finding(
            'warning',
            'INVALID_SHARD_TARGET',
            `${node.data.label} should connect only to SQL or NoSQL databases.`,
            { nodeId: node.id },
          ),
        );
      }
    }
    const fanout = (outgoing.get(node.id) ?? []).reduce(
      (sum, edge) => sum + edge.config.trafficPercentage,
      0,
    );
    if (
      node.type !== 'sharding' &&
      node.type !== 'message-queue' &&
      fanout > 300
    ) {
      warnings.push(
        finding(
          'warning',
          'HIGH_FANOUT',
          `${node.data.label} creates ${fanout}% dependency fan-out.`,
          { nodeId: node.id },
        ),
      );
    }
  }

  for (const edge of edges) {
    if (
      (edge.config.mode === 'asynchronous' &&
        edge.config.protocol !== 'Async') ||
      (edge.config.mode === 'synchronous' && edge.config.protocol === 'Async')
    ) {
      warnings.push(
        finding(
          'warning',
          'PROTOCOL_MODE_MISMATCH',
          `Connection ${edge.label ?? edge.id} has mismatched protocol and mode.`,
          { edgeId: edge.id },
        ),
      );
    }
    if (edge.config.retryCount > 3) {
      warnings.push(
        finding(
          'warning',
          'RETRY_CAP',
          `Connection ${edge.label ?? edge.id} retries are modeled with a three-attempt cap.`,
          { edgeId: edge.id },
        ),
      );
    }
  }

  for (const event of scenario.events) {
    if (event.type === 'TRAFFIC_SET') {
      if (nodeById.get(event.sourceNodeId)?.type !== 'client') {
        errors.push(
          finding(
            'error',
            'INVALID_EVENT_TARGET',
            `${event.id} must target a Client.`,
          ),
        );
      }
    } else if (event.type === 'EDGE_LATENCY') {
      if (!edgeById.has(event.edgeId)) {
        errors.push(
          finding(
            'error',
            'MISSING_EDGE_TARGET',
            `${event.id} targets a missing edge.`,
          ),
        );
      }
    } else {
      const node = nodeById.get(event.nodeId);
      if (!node) {
        errors.push(
          finding(
            'error',
            'MISSING_NODE_TARGET',
            `${event.id} targets a missing node.`,
          ),
        );
      } else if (event.type === 'CACHE_BYPASS' && node.type !== 'cache') {
        errors.push(
          finding(
            'error',
            'INVALID_CACHE_TARGET',
            `${event.id} must target a Cache.`,
          ),
        );
      } else if (
        event.type === 'QUEUE_INJECT' &&
        node.type !== 'message-queue'
      ) {
        errors.push(
          finding(
            'error',
            'INVALID_QUEUE_TARGET',
            `${event.id} must target a Message Queue.`,
          ),
        );
      }
    }
  }

  return { errors, warnings, order };
}
