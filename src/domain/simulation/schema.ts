import { z } from 'zod';

const eventBase = {
  id: z.string().min(1),
  atSecond: z.number().int().nonnegative(),
};

export const scenarioEventSchema = z.discriminatedUnion('type', [
  z.object({
    ...eventBase,
    type: z.literal('TRAFFIC_SET'),
    sourceNodeId: z.string().min(1),
    requestsPerSecond: z.number().finite().nonnegative(),
  }),
  z.object({
    ...eventBase,
    type: z.literal('NODE_FAILURE'),
    nodeId: z.string().min(1),
    durationSeconds: z.number().int().positive(),
  }),
  z.object({
    ...eventBase,
    type: z.literal('NODE_CAPACITY'),
    nodeId: z.string().min(1),
    multiplier: z.number().finite().min(0).max(10),
    durationSeconds: z.number().int().positive(),
  }),
  z.object({
    ...eventBase,
    type: z.literal('CACHE_BYPASS'),
    nodeId: z.string().min(1),
    durationSeconds: z.number().int().positive(),
  }),
  z.object({
    ...eventBase,
    type: z.literal('CACHE_KEY_EXPIRATION'),
    nodeId: z.string().min(1),
    keyCount: z.number().int().positive(),
    affectedTrafficPercent: z.number().finite().min(0).max(100),
    rebuildDurationSeconds: z.number().int().positive(),
    durationSeconds: z.number().int().positive(),
  }),
  z.object({
    ...eventBase,
    type: z.literal('QUEUE_INJECT'),
    nodeId: z.string().min(1),
    messages: z.number().finite().nonnegative(),
  }),
  z.object({
    ...eventBase,
    type: z.literal('EDGE_LATENCY'),
    edgeId: z.string().min(1),
    addedLatencyMs: z.number().finite().nonnegative(),
    durationSeconds: z.number().int().positive(),
  }),
]);

export const simulationScenarioSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1),
    description: z.string().optional(),
    durationSeconds: z.number().int().min(1).max(86_400),
    ambientFailureRate: z.number().finite().min(0).max(1).optional(),
    traffic: z.array(
      z.object({
        sourceNodeId: z.string().min(1),
        requestsPerSecond: z.number().finite().nonnegative(),
      }),
    ),
    events: z.array(scenarioEventSchema),
  })
  .superRefine((scenario, context) => {
    const eventIds = new Set<string>();
    for (const event of scenario.events) {
      if (eventIds.has(event.id)) {
        context.addIssue({
          code: 'custom',
          message: `Duplicate scenario event ID: ${event.id}`,
          path: ['events'],
        });
      }
      eventIds.add(event.id);
      const duration = 'durationSeconds' in event ? event.durationSeconds : 0;
      if (event.atSecond >= scenario.durationSeconds) {
        context.addIssue({
          code: 'custom',
          message: `Event ${event.id} starts outside the scenario`,
          path: ['events'],
        });
      }
      if (duration && event.atSecond + duration > scenario.durationSeconds) {
        context.addIssue({
          code: 'custom',
          message: `Event ${event.id} ends outside the scenario`,
          path: ['events'],
        });
      }
    }
  });
