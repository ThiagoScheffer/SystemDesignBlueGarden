import {
  createArchitectureDocument,
  createArchitectureEdge,
  createArchitectureNode,
} from '../architecture/factories';
import type {
  ArchitectureDocumentV1,
  ComponentType,
} from '../architecture/types';
import type { ChallengeDefinition, LearningTemplate } from './types';

type TemplateSpec = {
  nodes: Array<{ type: ComponentType; label?: string; x: number; y: number }>;
  edges: Array<[number, number, ('sync' | 'async')?]>;
};

const templateSpecs: Record<
  string,
  { starter: TemplateSpec; reference: TemplateSpec }
> = {
  'url-shortener': {
    starter: {
      nodes: [
        { type: 'client', x: 0, y: 120 },
        { type: 'load-balancer', x: 190, y: 120 },
        { type: 'api-gateway', x: 380, y: 120 },
        { type: 'application-server', x: 570, y: 120 },
        { type: 'cache', x: 760, y: 50 },
        { type: 'nosql-database', x: 760, y: 190 },
        { type: 'monitoring-service', x: 570, y: 270 },
      ],
      edges: [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [4, 5],
        [3, 5],
      ],
    },
    reference: {
      nodes: [
        { type: 'client', x: 0, y: 120 },
        { type: 'cdn', x: 170, y: 120 },
        { type: 'load-balancer', x: 340, y: 120 },
        { type: 'api-gateway', x: 510, y: 120 },
        {
          type: 'application-server',
          label: 'Redirect service A',
          x: 690,
          y: 60,
        },
        {
          type: 'application-server',
          label: 'Redirect service B',
          x: 690,
          y: 180,
        },
        { type: 'cache', x: 880, y: 30 },
        { type: 'sharding', x: 880, y: 150 },
        { type: 'nosql-database', label: 'Link shard A', x: 1060, y: 90 },
        { type: 'nosql-database', label: 'Link shard B', x: 1060, y: 210 },
        { type: 'monitoring-service', x: 700, y: 300 },
      ],
      edges: [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [3, 5],
        [4, 6],
        [5, 6],
        [4, 7],
        [5, 7],
        [7, 8],
        [7, 9],
      ],
    },
  },
  'rate-limiter': {
    starter: {
      nodes: [
        { type: 'client', x: 0, y: 100 },
        { type: 'load-balancer', x: 190, y: 100 },
        { type: 'api-gateway', label: 'Rate-limiting gateway', x: 380, y: 100 },
        { type: 'cache', label: 'Distributed counters', x: 580, y: 40 },
        { type: 'application-server', x: 580, y: 170 },
        { type: 'monitoring-service', x: 380, y: 260 },
      ],
      edges: [
        [0, 1],
        [1, 2],
        [2, 3],
        [2, 4],
      ],
    },
    reference: {
      nodes: [
        { type: 'client', x: 0, y: 100 },
        { type: 'load-balancer', x: 180, y: 100 },
        { type: 'api-gateway', label: 'Gateway A', x: 360, y: 40 },
        { type: 'api-gateway', label: 'Gateway B', x: 360, y: 170 },
        { type: 'cache', label: 'Shared token counters', x: 570, y: 100 },
        { type: 'application-server', x: 770, y: 100 },
        { type: 'nosql-database', label: 'Policy store', x: 570, y: 260 },
        { type: 'monitoring-service', x: 770, y: 260 },
      ],
      edges: [
        [0, 1],
        [1, 2],
        [1, 3],
        [2, 4],
        [3, 4],
        [2, 5],
        [3, 5],
        [2, 6],
        [3, 6],
      ],
    },
  },
  'news-feed': {
    starter: {
      nodes: [
        { type: 'client', x: 0, y: 130 },
        { type: 'load-balancer', x: 170, y: 130 },
        { type: 'api-gateway', x: 340, y: 130 },
        { type: 'application-server', label: 'Feed service', x: 520, y: 130 },
        { type: 'cache', label: 'Timeline cache', x: 710, y: 40 },
        { type: 'nosql-database', label: 'Post store', x: 710, y: 210 },
        { type: 'message-queue', label: 'Fan-out queue', x: 520, y: 310 },
        { type: 'worker', label: 'Fan-out worker', x: 710, y: 310 },
        { type: 'monitoring-service', x: 900, y: 310 },
      ],
      edges: [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [4, 5],
        [3, 5],
        [3, 6, 'async'],
        [6, 7, 'async'],
      ],
    },
    reference: {
      nodes: [
        { type: 'client', x: 0, y: 130 },
        { type: 'cdn', x: 160, y: 130 },
        { type: 'load-balancer', x: 320, y: 130 },
        { type: 'api-gateway', x: 480, y: 130 },
        {
          type: 'application-server',
          label: 'Feed read service',
          x: 650,
          y: 40,
        },
        { type: 'application-server', label: 'Post service', x: 650, y: 200 },
        { type: 'cache', label: 'Timeline cache', x: 840, y: 20 },
        {
          type: 'nosql-database',
          label: 'Post and graph store',
          x: 840,
          y: 180,
        },
        { type: 'message-queue', label: 'Fan-out stream', x: 650, y: 330 },
        { type: 'worker', label: 'Fan-out workers', x: 840, y: 330 },
        { type: 'monitoring-service', x: 1020, y: 330 },
      ],
      edges: [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [3, 5],
        [4, 6],
        [4, 7],
        [5, 7],
        [5, 8, 'async'],
        [8, 9, 'async'],
        [9, 6],
      ],
    },
  },
  'file-storage': {
    starter: {
      nodes: [
        { type: 'client', x: 0, y: 120 },
        { type: 'load-balancer', x: 180, y: 120 },
        { type: 'api-gateway', x: 360, y: 120 },
        { type: 'application-server', label: 'Upload service', x: 540, y: 120 },
        { type: 'sql-database', label: 'File metadata', x: 740, y: 40 },
        { type: 'object-storage', x: 740, y: 190 },
        { type: 'message-queue', x: 540, y: 300 },
        { type: 'worker', label: 'Thumbnail worker', x: 740, y: 300 },
      ],
      edges: [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [3, 5],
        [3, 6, 'async'],
        [6, 7, 'async'],
        [7, 5],
      ],
    },
    reference: {
      nodes: [
        { type: 'client', x: 0, y: 120 },
        { type: 'cdn', x: 170, y: 120 },
        { type: 'load-balancer', x: 340, y: 120 },
        { type: 'api-gateway', x: 510, y: 120 },
        {
          type: 'application-server',
          label: 'Metadata service A',
          x: 690,
          y: 50,
        },
        {
          type: 'application-server',
          label: 'Metadata service B',
          x: 690,
          y: 180,
        },
        { type: 'sql-database', label: 'Metadata database', x: 880, y: 20 },
        {
          type: 'object-storage',
          label: 'Durable object store',
          x: 880,
          y: 170,
        },
        { type: 'message-queue', label: 'Processing queue', x: 690, y: 310 },
        { type: 'worker', label: 'Media processors', x: 880, y: 310 },
        { type: 'monitoring-service', x: 1060, y: 310 },
      ],
      edges: [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [3, 5],
        [4, 6],
        [5, 6],
        [4, 7],
        [5, 7],
        [4, 8, 'async'],
        [5, 8, 'async'],
        [8, 9, 'async'],
        [9, 7],
      ],
    },
  },
  'ecommerce-checkout': {
    starter: {
      nodes: [
        { type: 'client', x: 0, y: 130 },
        { type: 'load-balancer', x: 170, y: 130 },
        { type: 'api-gateway', x: 340, y: 130 },
        {
          type: 'application-server',
          label: 'Checkout service',
          x: 520,
          y: 130,
        },
        { type: 'cache', label: 'Inventory cache', x: 710, y: 30 },
        { type: 'sql-database', label: 'Orders database', x: 710, y: 180 },
        { type: 'message-queue', label: 'Order events', x: 520, y: 310 },
        { type: 'worker', label: 'Payment worker', x: 710, y: 310 },
        { type: 'object-storage', label: 'Receipts', x: 900, y: 310 },
      ],
      edges: [
        [0, 1],
        [1, 2],
        [2, 3],
        [3, 4],
        [4, 5],
        [3, 5],
        [3, 6, 'async'],
        [6, 7, 'async'],
        [7, 8],
      ],
    },
    reference: {
      nodes: [
        { type: 'client', x: 0, y: 130 },
        { type: 'load-balancer', x: 170, y: 130 },
        { type: 'api-gateway', x: 340, y: 130 },
        { type: 'application-server', label: 'Checkout A', x: 520, y: 50 },
        { type: 'application-server', label: 'Checkout B', x: 520, y: 190 },
        { type: 'cache', label: 'Inventory cache', x: 710, y: 20 },
        { type: 'sharding', label: 'Order router', x: 710, y: 160 },
        { type: 'sql-database', label: 'Order shard A', x: 900, y: 90 },
        { type: 'sql-database', label: 'Order shard B', x: 900, y: 210 },
        {
          type: 'message-queue',
          label: 'Durable order events',
          x: 710,
          y: 330,
        },
        { type: 'worker', label: 'Idempotent payment workers', x: 900, y: 330 },
        { type: 'monitoring-service', x: 1080, y: 330 },
      ],
      edges: [
        [0, 1],
        [1, 2],
        [2, 3],
        [2, 4],
        [3, 5],
        [4, 5],
        [3, 6],
        [4, 6],
        [6, 7],
        [6, 8],
        [3, 9, 'async'],
        [4, 9, 'async'],
        [9, 10, 'async'],
      ],
    },
  },
};

export const learningTemplates: LearningTemplate[] = [
  {
    id: 'url-shortener',
    contentVersion: 1,
    title: 'URL Shortener',
    summary: 'A read-heavy redirect service with cached key lookup.',
    level: 'beginner',
    concepts: ['Caching', 'Sharding', 'Hot keys'],
    assumptions: ['Redirect reads greatly exceed link creation writes.'],
    knownTradeoffs: [
      'Cache improves read latency but adds invalidation and stampede concerns.',
    ],
  },
  {
    id: 'rate-limiter',
    contentVersion: 1,
    title: 'Distributed Rate Limiter',
    summary: 'A gateway using shared cached counters to enforce quotas.',
    level: 'intermediate',
    concepts: ['Quotas', 'Distributed counters', 'Overload'],
    assumptions: ['Limits are enforced per user and per API route.'],
    knownTradeoffs: [
      'Shared counters improve consistency but add a network dependency.',
    ],
  },
  {
    id: 'news-feed',
    contentVersion: 1,
    title: 'News Feed',
    summary: 'A cached feed with asynchronous fan-out workers.',
    level: 'advanced',
    concepts: ['Fan-out', 'Backpressure', 'Hot users'],
    assumptions: [
      'Most users have modest follower counts; a small group is very large.',
    ],
    knownTradeoffs: [
      'Fan-out on write makes reads fast but amplifies celebrity posts.',
    ],
  },
  {
    id: 'file-storage',
    contentVersion: 1,
    title: 'File Storage Service',
    summary: 'Separate metadata, durable objects, and background processing.',
    level: 'intermediate',
    concepts: ['Object storage', 'Metadata', 'Durability'],
    assumptions: ['Binary data is kept outside the relational metadata store.'],
    knownTradeoffs: [
      'Direct object storage reduces application load but complicates authorization.',
    ],
  },
  {
    id: 'ecommerce-checkout',
    contentVersion: 1,
    title: 'E-commerce Checkout',
    summary: 'Transactional order intake with asynchronous downstream work.',
    level: 'intermediate',
    concepts: ['Transactions', 'Idempotency', 'Queueing'],
    assumptions: [
      'Order acceptance and downstream fulfillment can be separated.',
    ],
    knownTradeoffs: [
      'Asynchronous payment work improves resilience but requires status handling.',
    ],
  },
];

const steps = [
  [
    'understand',
    'Understand the prompt',
    'Identify the actors, core use cases, and unclear terms.',
  ],
  [
    'questions',
    'Ask clarifying questions',
    'Write questions before committing to a topology.',
  ],
  [
    'functional',
    'Define functional requirements',
    'Choose the essential user-visible behavior.',
  ],
  [
    'non-functional',
    'Define non-functional requirements',
    'State scale, latency, availability, and consistency goals.',
  ],
  [
    'estimate',
    'Estimate capacity',
    'Calculate average and peak demand before sizing components.',
  ],
  [
    'architecture',
    'Build the architecture',
    'Connect the request path and asynchronous work explicitly.',
  ],
  [
    'data-api',
    'Record data and API decisions',
    'Explain keys, access patterns, APIs, and consistency.',
  ],
  [
    'baseline',
    'Run the baseline',
    'Confirm the normal traffic path before injecting failure.',
  ],
  [
    'incident',
    'Test the hidden incident',
    'Observe the first bottleneck and affected path.',
  ],
  [
    'tradeoffs',
    'Record bottlenecks and trade-offs',
    'Explain what you would improve and what it costs.',
  ],
  [
    'finish',
    'Finish and compare',
    'Submit a snapshot for neutral evidence comparison.',
  ],
].map(([id, label, hint]) => ({ id, label, hint }));

const worksheet = (
  activeUsers: number,
  actions: number,
  readPercent: number,
  payloadKB: number,
  peak: number,
) => ({
  activeUsers,
  actionsPerUserPerDay: actions,
  readPercent,
  averagePayloadKB: payloadKB,
  retentionDays: 30,
  replicationFactor: 3,
  peakMultiplier: peak,
});

export const challenges: ChallengeDefinition[] = [
  {
    id: 'url-shortener',
    contentVersion: 1,
    templateId: 'url-shortener',
    title: 'Design a URL Shortener',
    level: 'beginner',
    summary:
      'Build a low-latency service that creates short links and resolves them at scale.',
    prompt:
      'Design a service that creates compact URLs and redirects users reliably under highly read-heavy traffic.',
    concepts: ['Read scaling', 'Hot keys', 'Sharding'],
    functionalRequirements: [
      'Create a short link',
      'Redirect a short code',
      'Support expiration',
    ],
    nonFunctionalRequirements: [
      'Low redirect latency',
      'High availability',
      'Read-heavy scale',
    ],
    guidedSteps: steps,
    worksheetDefaults: worksheet(1_000_000, 20, 95, 1, 8),
    incident: {
      id: 'url-viral',
      title: 'Viral link',
      hiddenDescription:
        'A production traffic change will be revealed when tested.',
      revealedDescription: 'A link goes viral while the cache is bypassed.',
      durationSeconds: 60,
      events: [
        {
          type: 'TRAFFIC_SET',
          componentType: 'client',
          requestsPerSecond: 15_000,
          atSecond: 15,
        },
        {
          type: 'CACHE_BYPASS',
          componentType: 'cache',
          durationSeconds: 25,
          atSecond: 20,
        },
      ],
    },
    criteria: [
      {
        id: 'edge-entry',
        label: 'Traffic distribution',
        explanation: 'A load balancer or gateway is represented.',
        componentTypes: ['load-balancer', 'api-gateway'],
        minimum: 1,
      },
      {
        id: 'cache',
        label: 'Repeated-read cache',
        explanation: 'A cache is represented on the read path.',
        componentTypes: ['cache'],
        minimum: 1,
      },
      {
        id: 'partitioning',
        label: 'Partitioned persistence',
        explanation: 'A sharding router is represented.',
        componentTypes: ['sharding'],
        minimum: 1,
      },
    ],
    referenceTradeoffs: [
      'A cache lowers redirect latency but cache misses still require durable lookup.',
      'Hash sharding spreads keys but resharding requires careful migration.',
    ],
  },
  {
    id: 'rate-limiter',
    contentVersion: 1,
    templateId: 'rate-limiter',
    title: 'Design a Rate Limiter',
    level: 'intermediate',
    summary:
      'Enforce distributed quotas without turning the limiter into the outage.',
    prompt:
      'Design a distributed API rate limiter with per-user and per-route policies.',
    concepts: ['Quotas', 'Distributed counters', 'Overload'],
    functionalRequirements: [
      'Allow or reject requests',
      'Support user and route policies',
      'Expose remaining quota',
    ],
    nonFunctionalRequirements: [
      'Low decision latency',
      'Consistent limits',
      'Graceful overload',
    ],
    guidedSteps: steps,
    worksheetDefaults: worksheet(2_000_000, 50, 90, 2, 10),
    incident: {
      id: 'limiter-burst',
      title: 'Coordinated burst',
      hiddenDescription: 'A burst condition will be revealed when tested.',
      revealedDescription:
        'A coordinated burst arrives while gateway capacity is reduced.',
      durationSeconds: 60,
      events: [
        {
          type: 'TRAFFIC_SET',
          componentType: 'client',
          requestsPerSecond: 20_000,
          atSecond: 10,
        },
        {
          type: 'NODE_CAPACITY',
          componentType: 'api-gateway',
          multiplier: 0.35,
          durationSeconds: 30,
          atSecond: 15,
        },
      ],
    },
    criteria: [
      {
        id: 'gateway',
        label: 'Enforcement entry point',
        explanation:
          'An API gateway represents the rate-limiting decision point.',
        componentTypes: ['api-gateway'],
        minimum: 1,
      },
      {
        id: 'counter-store',
        label: 'Shared counter store',
        explanation: 'A cache represents fast distributed counters.',
        componentTypes: ['cache'],
        minimum: 1,
      },
      {
        id: 'monitoring',
        label: 'Limit observability',
        explanation: 'Monitoring is represented.',
        componentTypes: ['monitoring-service'],
        minimum: 1,
      },
    ],
    referenceTradeoffs: [
      'Strict shared counters improve consistency but add dependency latency.',
      'Local allowance can preserve availability at the cost of temporary over-admission.',
    ],
  },
  {
    id: 'news-feed',
    contentVersion: 1,
    templateId: 'news-feed',
    title: 'Design a News Feed',
    level: 'advanced',
    summary: 'Build a feed that handles normal users and celebrity fan-out.',
    prompt:
      'Design a home timeline for posting, following, and reading a ranked feed.',
    concepts: ['Fan-out', 'Backpressure', 'Cache pressure'],
    functionalRequirements: [
      'Publish posts',
      'Follow users',
      'Read a home timeline',
    ],
    nonFunctionalRequirements: [
      'Fast feed reads',
      'Eventual consistency is acceptable',
      'Handle celebrity accounts',
    ],
    guidedSteps: steps,
    worksheetDefaults: worksheet(10_000_000, 40, 90, 4, 12),
    incident: {
      id: 'feed-celebrity',
      title: 'Celebrity fan-out',
      hiddenDescription: 'A fan-out condition will be revealed when tested.',
      revealedDescription:
        'A celebrity post creates a large fan-out backlog during elevated reads.',
      durationSeconds: 75,
      events: [
        {
          type: 'TRAFFIC_SET',
          componentType: 'client',
          requestsPerSecond: 25_000,
          atSecond: 10,
        },
        {
          type: 'QUEUE_INJECT',
          componentType: 'message-queue',
          messages: 50_000,
          atSecond: 20,
        },
      ],
    },
    criteria: [
      {
        id: 'feed-cache',
        label: 'Timeline cache',
        explanation: 'A cache is represented for repeated feed reads.',
        componentTypes: ['cache'],
        minimum: 1,
      },
      {
        id: 'fanout-queue',
        label: 'Asynchronous fan-out',
        explanation: 'A queue and worker are represented.',
        componentTypes: ['message-queue', 'worker'],
        minimum: 2,
      },
      {
        id: 'feed-store',
        label: 'Scalable feed storage',
        explanation: 'A NoSQL store is represented.',
        componentTypes: ['nosql-database'],
        minimum: 1,
      },
    ],
    referenceTradeoffs: [
      'Fan-out on write accelerates reads but performs poorly for high-follower accounts.',
      'Hybrid fan-out needs more complex read-time merging.',
    ],
  },
  {
    id: 'file-storage',
    contentVersion: 1,
    templateId: 'file-storage',
    title: 'Design a File Storage Service',
    level: 'intermediate',
    summary: 'Separate durable file data from metadata and processing.',
    prompt:
      'Design an upload, download, and background-processing service for user files.',
    concepts: ['Metadata', 'Durability', 'Async processing'],
    functionalRequirements: [
      'Upload and download files',
      'List file metadata',
      'Generate derived previews',
    ],
    nonFunctionalRequirements: [
      'Durable storage',
      'Large payload support',
      'Failure-safe processing',
    ],
    guidedSteps: steps,
    worksheetDefaults: worksheet(500_000, 8, 60, 2_048, 6),
    incident: {
      id: 'storage-outage',
      title: 'Object storage slowdown',
      hiddenDescription:
        'A storage dependency incident will be revealed when tested.',
      revealedDescription:
        'Object storage becomes unavailable during active uploads.',
      durationSeconds: 60,
      events: [
        {
          type: 'NODE_FAILURE',
          componentType: 'object-storage',
          durationSeconds: 20,
          atSecond: 20,
        },
      ],
    },
    criteria: [
      {
        id: 'objects',
        label: 'Binary object storage',
        explanation: 'Object storage is represented.',
        componentTypes: ['object-storage'],
        minimum: 1,
      },
      {
        id: 'metadata',
        label: 'Separate metadata',
        explanation: 'A database is represented separately from objects.',
        componentTypes: ['sql-database', 'nosql-database'],
        minimum: 1,
      },
      {
        id: 'processing',
        label: 'Background processing',
        explanation: 'A queue and worker are represented.',
        componentTypes: ['message-queue', 'worker'],
        minimum: 2,
      },
    ],
    referenceTradeoffs: [
      'Direct uploads reduce service bandwidth but require scoped authorization.',
      'Metadata and object writes need reconciliation after partial failure.',
    ],
  },
  {
    id: 'ecommerce-checkout',
    contentVersion: 1,
    templateId: 'ecommerce-checkout',
    title: 'Design E-commerce Checkout',
    level: 'intermediate',
    summary: 'Accept transactional orders while isolating downstream work.',
    prompt:
      'Design checkout for inventory validation, order persistence, payment processing, and receipts.',
    concepts: ['Transactions', 'Idempotency', 'Database scaling'],
    functionalRequirements: [
      'Create an order',
      'Reserve inventory',
      'Process payment and receipt',
    ],
    nonFunctionalRequirements: [
      'Prevent duplicate charges',
      'Preserve order state',
      'Survive traffic spikes',
    ],
    guidedSteps: steps,
    worksheetDefaults: worksheet(1_000_000, 5, 65, 8, 10),
    incident: {
      id: 'checkout-sale',
      title: 'Flash sale',
      hiddenDescription:
        'A checkout load condition will be revealed when tested.',
      revealedDescription:
        'A flash sale spikes traffic while database capacity is reduced.',
      durationSeconds: 75,
      events: [
        {
          type: 'TRAFFIC_SET',
          componentType: 'client',
          requestsPerSecond: 15_000,
          atSecond: 10,
        },
        {
          type: 'NODE_CAPACITY',
          componentType: 'sql-database',
          multiplier: 0.25,
          durationSeconds: 35,
          atSecond: 20,
        },
      ],
    },
    criteria: [
      {
        id: 'transaction-store',
        label: 'Transactional order store',
        explanation: 'A SQL database is represented.',
        componentTypes: ['sql-database'],
        minimum: 1,
      },
      {
        id: 'async-payment',
        label: 'Asynchronous downstream work',
        explanation: 'A queue and worker are represented.',
        componentTypes: ['message-queue', 'worker'],
        minimum: 2,
      },
      {
        id: 'checkout-scale',
        label: 'Application redundancy',
        explanation: 'At least two application servers are represented.',
        componentTypes: ['application-server'],
        minimum: 2,
      },
    ],
    referenceTradeoffs: [
      'Asynchronous payment avoids holding checkout open but requires explicit order states.',
      'Sharded orders scale writes but complicate cross-customer reporting.',
    ],
  },
];

export function getChallenge(id: string) {
  return challenges.find((challenge) => challenge.id === id);
}
export function getLearningTemplate(id: string) {
  return learningTemplates.find((template) => template.id === id);
}

export function createTemplateDocument(
  templateId: string,
  reference = false,
): ArchitectureDocumentV1 {
  const template = getLearningTemplate(templateId);
  const spec = templateSpecs[templateId]?.[reference ? 'reference' : 'starter'];
  if (!template || !spec)
    throw new Error(`Unknown learning template: ${templateId}`);
  const document = createArchitectureDocument(
    `${template.title}${reference ? ' — Reference' : ' — Starter'}`,
  );
  document.metadata.description = template.summary;
  document.projectSettings.expectedScale =
    template.level === 'advanced' ? 'large' : 'medium';
  document.projectSettings.expectedComplexity =
    template.level === 'beginner' ? 'medium' : 'high';
  document.projectSettings.simulationDefaults = {
    initialRps: template.level === 'advanced' ? 5_000 : 1_000,
    peakRps: template.level === 'advanced' ? 25_000 : 10_000,
    ambientFailureRate: 0,
    durationSeconds: 120,
  };
  document.nodes = spec.nodes.map((entry) => {
    const node = createArchitectureNode(entry.type, { x: entry.x, y: entry.y });
    if (entry.label) node.data.label = entry.label;
    if (node.type === 'sharding') node.data.config.shardCount = 2;
    return node;
  });
  document.edges = spec.edges.map(([source, target, mode]) => {
    const edge = createArchitectureEdge(
      document.nodes[source].id,
      document.nodes[target].id,
    );
    if (mode === 'async') {
      edge.config.mode = 'asynchronous';
      edge.config.protocol = 'Async';
    }
    return edge;
  });
  const client = document.nodes.find((node) => node.type === 'client');
  if (client)
    document.scenarios = [
      {
        id: `baseline-${crypto.randomUUID()}`,
        name: 'Learning baseline',
        durationSeconds: 60,
        ambientFailureRate: 0,
        traffic: [
          {
            sourceNodeId: client.id,
            requestsPerSecond:
              document.projectSettings.simulationDefaults.initialRps,
          },
        ],
        events: [],
      },
    ];
  return document;
}
