import { z } from 'zod';
import { simulationScenarioSchema } from '../simulation/schema';
import { COMPONENT_TYPES, type ArchitectureDocumentV1 } from './types';

const nonNegative = z.number().finite().nonnegative();

const operationalConfigSchema = z
  .object({
    capacity: nonNegative,
    baseLatencyMs: nonNegative,
    failureRate: z.number().finite().min(0).max(1),
    concurrencyLimit: nonNegative,
    queueLimit: nonNegative,
    costPerHour: nonNegative,
    noteType: z
      .enum([
        'assumption',
        'decision',
        'risk',
        'question',
        'constraint',
        'requirement',
        'trade-off',
        'improvement',
      ])
      .optional(),
    content: z.string().optional(),
    hitRatePercent: z.number().int().min(0).max(100).optional(),
    shardCount: z.number().int().positive().optional(),
    shardKey: z.string().min(1).optional(),
    shardStrategy: z.enum(['hash', 'range', 'directory']).optional(),
  })
  .catchall(z.union([z.string(), z.number(), z.boolean(), z.undefined()]));

const baseNodeSchema = z.object({
  id: z.string().min(1),
  type: z.enum(COMPONENT_TYPES),
  position: z.object({ x: z.number().finite(), y: z.number().finite() }),
  parentId: z.string().min(1).optional(),
  data: z.object({
    label: z.string().min(1),
    description: z.string().optional(),
    implementationNotes: z.string().optional(),
    config: operationalConfigSchema,
  }),
});

const currentNodeSchema = baseNodeSchema.superRefine((node, context) => {
  if (node.type === 'cache' && node.data.config.hitRatePercent === undefined) {
    context.addIssue({
      code: 'custom',
      message: 'Cache nodes require a hit rate percentage',
      path: ['data', 'config', 'hitRatePercent'],
    });
  }

  if (node.type === 'sharding') {
    if (node.data.config.shardCount === undefined) {
      context.addIssue({
        code: 'custom',
        message: 'Sharding nodes require a positive shard count',
        path: ['data', 'config', 'shardCount'],
      });
    }
    if (!node.data.config.shardKey) {
      context.addIssue({
        code: 'custom',
        message: 'Sharding nodes require a shard key',
        path: ['data', 'config', 'shardKey'],
      });
    }
    if (!node.data.config.shardStrategy) {
      context.addIssue({
        code: 'custom',
        message: 'Sharding nodes require a shard strategy',
        path: ['data', 'config', 'shardStrategy'],
      });
    }
  }
});

const edgeSchema = z.object({
  id: z.string().min(1),
  source: z.string().min(1),
  target: z.string().min(1),
  label: z.string().optional(),
  config: z.object({
    protocol: z.enum(['HTTP', 'gRPC', 'TCP', 'Async']),
    mode: z.enum(['synchronous', 'asynchronous']),
    trafficType: z.enum(['read', 'write', 'mixed']),
    encrypted: z.boolean(),
    latencyMs: nonNegative,
    bandwidthMbps: nonNegative,
    timeoutMs: nonNegative,
    retryCount: nonNegative,
    trafficPercentage: z.number().finite().min(0).max(100),
  }),
});

const metadataSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});

const viewportSchema = z
  .object({
    x: z.number().finite(),
    y: z.number().finite(),
    zoom: z.number().finite().positive(),
  })
  .optional();

type DocumentShape = {
  nodes: z.infer<typeof baseNodeSchema>[];
  edges: z.infer<typeof edgeSchema>[];
};

function validateGraph(document: DocumentShape, context: z.RefinementCtx) {
  const nodeIds = new Set<string>();
  const edgeIds = new Set<string>();
  const nodeById = new Map(document.nodes.map((node) => [node.id, node]));

  for (const node of document.nodes) {
    if (nodeIds.has(node.id)) {
      context.addIssue({
        code: 'custom',
        message: `Duplicate node ID: ${node.id}`,
        path: ['nodes'],
      });
    }
    nodeIds.add(node.id);
  }

  for (const node of document.nodes) {
    if (!node.parentId) continue;
    const parent = nodeById.get(node.parentId);

    if (!parent) {
      context.addIssue({
        code: 'custom',
        message: `Node ${node.id} references a missing parent`,
        path: ['nodes'],
      });
      continue;
    }
    if (parent.type !== 'region') {
      context.addIssue({
        code: 'custom',
        message: `Node ${node.id} must have a Region parent`,
        path: ['nodes'],
      });
    }
    if (node.type === 'region' || parent.parentId) {
      context.addIssue({
        code: 'custom',
        message: 'Region containment is limited to one level',
        path: ['nodes'],
      });
    }
  }

  for (const node of document.nodes) {
    const visited = new Set<string>();
    let currentId: string | undefined = node.id;
    while (currentId) {
      if (visited.has(currentId)) {
        context.addIssue({
          code: 'custom',
          message: `Containment cycle detected at node ${currentId}`,
          path: ['nodes'],
        });
        break;
      }
      visited.add(currentId);
      currentId = nodeById.get(currentId)?.parentId;
    }
  }

  for (const edge of document.edges) {
    if (edgeIds.has(edge.id)) {
      context.addIssue({
        code: 'custom',
        message: `Duplicate edge ID: ${edge.id}`,
        path: ['edges'],
      });
    }
    edgeIds.add(edge.id);
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      context.addIssue({
        code: 'custom',
        message: `Edge ${edge.id} references a missing node`,
        path: ['edges'],
      });
    }
  }
}

const legacyV11ArchitectureDocumentSchema = z
  .object({
    schemaVersion: z.literal('1.1'),
    id: z.string().min(1),
    metadata: metadataSchema,
    viewport: viewportSchema,
    nodes: z.array(currentNodeSchema),
    edges: z.array(edgeSchema),
  })
  .superRefine(validateGraph);

export const architectureDocumentSchema = z
  .object({
    schemaVersion: z.literal('1.2'),
    id: z.string().min(1),
    metadata: metadataSchema,
    viewport: viewportSchema,
    nodes: z.array(currentNodeSchema),
    edges: z.array(edgeSchema),
    scenarios: z.array(simulationScenarioSchema),
  })
  .superRefine((document, context) => {
    validateGraph(document, context);
    const nodeById = new Map(document.nodes.map((node) => [node.id, node]));
    const edgeIds = new Set(document.edges.map((edge) => edge.id));
    const scenarioIds = new Set<string>();

    for (const scenario of document.scenarios) {
      if (scenarioIds.has(scenario.id)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate scenario ID: ${scenario.id}`,
          path: ['scenarios'],
        });
      }
      scenarioIds.add(scenario.id);

      for (const traffic of scenario.traffic) {
        if (nodeById.get(traffic.sourceNodeId)?.type !== 'client') {
          context.addIssue({
            code: 'custom',
            message: `Traffic source ${traffic.sourceNodeId} must reference a Client`,
            path: ['scenarios'],
          });
        }
      }

      for (const event of scenario.events) {
        if (event.type === 'TRAFFIC_SET') {
          if (nodeById.get(event.sourceNodeId)?.type !== 'client') {
            context.addIssue({
              code: 'custom',
              message: `Traffic event ${event.id} must target a Client`,
              path: ['scenarios'],
            });
          }
        } else if (event.type === 'EDGE_LATENCY') {
          if (!edgeIds.has(event.edgeId)) {
            context.addIssue({
              code: 'custom',
              message: `Latency event ${event.id} references a missing edge`,
              path: ['scenarios'],
            });
          }
        } else {
          const node = nodeById.get(event.nodeId);
          if (!node) {
            context.addIssue({
              code: 'custom',
              message: `Scenario event ${event.id} references a missing node`,
              path: ['scenarios'],
            });
          } else if (event.type === 'CACHE_BYPASS' && node.type !== 'cache') {
            context.addIssue({
              code: 'custom',
              message: `Cache bypass event ${event.id} must target a Cache`,
              path: ['scenarios'],
            });
          } else if (
            event.type === 'QUEUE_INJECT' &&
            node.type !== 'message-queue'
          ) {
            context.addIssue({
              code: 'custom',
              message: `Queue event ${event.id} must target a Message Queue`,
              path: ['scenarios'],
            });
          }
        }
      }
    }
  });

const legacyArchitectureDocumentSchema = z
  .object({
    schemaVersion: z.literal('1.0'),
    id: z.string().min(1),
    metadata: metadataSchema,
    viewport: viewportSchema,
    nodes: z.array(baseNodeSchema),
    edges: z.array(edgeSchema),
  })
  .superRefine(validateGraph);

function migrateFromV1(
  document: z.infer<typeof legacyArchitectureDocumentSchema>,
) {
  return {
    ...document,
    schemaVersion: '1.1' as const,
    nodes: document.nodes.map((node) => ({
      ...node,
      data: {
        ...node.data,
        config:
          node.type === 'cache'
            ? { hitRatePercent: 80, ...node.data.config }
            : node.data.config,
      },
    })),
  };
}

function migrateFromV11(
  document: z.infer<typeof legacyV11ArchitectureDocumentSchema>,
) {
  return {
    ...document,
    schemaVersion: '1.2' as const,
    scenarios: [],
  };
}

export function parseArchitectureDocument(
  input: unknown,
): ArchitectureDocumentV1 {
  const version =
    typeof input === 'object' && input !== null && 'schemaVersion' in input
      ? (input as { schemaVersion?: unknown }).schemaVersion
      : undefined;

  if (version === '1.0') {
    const migratedV11 = migrateFromV1(
      legacyArchitectureDocumentSchema.parse(input),
    );
    const migrated = migrateFromV11(
      legacyV11ArchitectureDocumentSchema.parse(migratedV11),
    );
    return architectureDocumentSchema.parse(migrated) as ArchitectureDocumentV1;
  }
  if (version === '1.1') {
    const migrated = migrateFromV11(
      legacyV11ArchitectureDocumentSchema.parse(input),
    );
    return architectureDocumentSchema.parse(migrated) as ArchitectureDocumentV1;
  }
  if (version === '1.2') {
    return architectureDocumentSchema.parse(input) as ArchitectureDocumentV1;
  }
  throw new Error(
    `Unsupported architecture schema version: ${String(version)}`,
  );
}
