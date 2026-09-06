import type {
  ComponentCategory,
  ComponentType,
  OperationalConfig,
} from '../architecture/types';

export interface ComponentDefinition {
  type: ComponentType;
  label: string;
  category: ComponentCategory;
  color: string;
  icon: string;
  description: string;
  education: {
    summary: string;
    example: string;
  };
  defaults: OperationalConfig;
}

const defaultConfig = (
  overrides: Partial<OperationalConfig> = {},
): OperationalConfig => ({
  capacity: 1000,
  baseLatencyMs: 20,
  failureRate: 0.001,
  concurrencyLimit: 100,
  queueLimit: 1000,
  costPerHour: 0.1,
  ...overrides,
});

const baseComponentDefinitions: Omit<ComponentDefinition, 'education'>[] = [
  {
    type: 'client',
    label: 'Client',
    category: 'Client & edge',
    color: '#5eead4',
    icon: 'MonitorSmartphone',
    description: 'A user or system initiating requests.',
    defaults: defaultConfig({
      capacity: 5000,
      baseLatencyMs: 0,
      costPerHour: 0,
    }),
  },
  {
    type: 'dns',
    label: 'DNS',
    category: 'Client & edge',
    color: '#67e8f9',
    icon: 'Globe2',
    description: 'Resolves service names to network locations.',
    defaults: defaultConfig({
      capacity: 100000,
      baseLatencyMs: 12,
      costPerHour: 0.02,
    }),
  },
  {
    type: 'cdn',
    label: 'CDN',
    category: 'Client & edge',
    color: '#7dd3fc',
    icon: 'Cloud',
    description: 'Caches content near users at the edge.',
    defaults: defaultConfig({
      capacity: 100000,
      baseLatencyMs: 8,
      costPerHour: 0.2,
    }),
  },
  {
    type: 'load-balancer',
    label: 'Load balancer',
    category: 'Client & edge',
    color: '#93c5fd',
    icon: 'Network',
    description: 'Distributes traffic across healthy targets.',
    defaults: defaultConfig({
      capacity: 20000,
      baseLatencyMs: 2,
      costPerHour: 0.04,
    }),
  },
  {
    type: 'api-gateway',
    label: 'API gateway',
    category: 'Client & edge',
    color: '#a5b4fc',
    icon: 'Waypoints',
    description: 'Routes, authenticates, and limits API requests.',
    defaults: defaultConfig({
      capacity: 10000,
      baseLatencyMs: 5,
      costPerHour: 0.08,
    }),
  },
  {
    type: 'application-server',
    label: 'Application server',
    category: 'Compute',
    color: '#c4b5fd',
    icon: 'Server',
    description: 'Runs synchronous application logic.',
    defaults: defaultConfig({
      capacity: 1500,
      baseLatencyMs: 25,
      concurrencyLimit: 200,
      costPerHour: 0.18,
    }),
  },
  {
    type: 'worker',
    label: 'Worker',
    category: 'Compute',
    color: '#d8b4fe',
    icon: 'Cpu',
    description: 'Processes asynchronous background jobs.',
    defaults: defaultConfig({
      capacity: 500,
      baseLatencyMs: 80,
      concurrencyLimit: 20,
      costPerHour: 0.12,
      workerRole: 'general',
    }),
  },
  {
    type: 'cache',
    label: 'Cache',
    category: 'Data',
    color: '#f0abfc',
    icon: 'Gauge',
    description: 'Stores frequently used data for fast access.',
    defaults: defaultConfig({
      capacity: 50000,
      baseLatencyMs: 1,
      costPerHour: 0.15,
      hitRatePercent: 80,
      ttlSeconds: 300,
      staleWindowSeconds: 0,
      ttlJitterPercent: 0,
      requestCoalescing: false,
      cacheLocking: false,
      lockWaitTimeoutMs: 500,
      lockTtlMs: 5000,
      backgroundRefresh: false,
    }),
  },
  {
    type: 'sharding',
    label: 'Sharding',
    category: 'Data',
    color: '#fb7185',
    icon: 'GitFork',
    description: 'Routes data operations to the correct database partition.',
    defaults: defaultConfig({
      capacity: 10000,
      baseLatencyMs: 3,
      concurrencyLimit: 500,
      queueLimit: 5000,
      costPerHour: 0.12,
      shardCount: 4,
      shardKey: 'userId',
      shardStrategy: 'hash',
    }),
  },
  {
    type: 'sql-database',
    label: 'SQL database',
    category: 'Data',
    color: '#f9a8d4',
    icon: 'Database',
    description: 'Relational, transactional data storage.',
    defaults: defaultConfig({
      capacity: 3000,
      baseLatencyMs: 12,
      concurrencyLimit: 250,
      costPerHour: 0.32,
    }),
  },
  {
    type: 'nosql-database',
    label: 'NoSQL database',
    category: 'Data',
    color: '#fda4af',
    icon: 'Boxes',
    description: 'Flexible and horizontally scalable data storage.',
    defaults: defaultConfig({
      capacity: 10000,
      baseLatencyMs: 8,
      costPerHour: 0.28,
    }),
  },
  {
    type: 'object-storage',
    label: 'Object storage',
    category: 'Data',
    color: '#fdba74',
    icon: 'Archive',
    description: 'Durable storage for files and binary objects.',
    defaults: defaultConfig({
      capacity: 5000,
      baseLatencyMs: 35,
      costPerHour: 0.03,
    }),
  },
  {
    type: 'message-queue',
    label: 'Message queue',
    category: 'Messaging',
    color: '#fcd34d',
    icon: 'ListEnd',
    description: 'Buffers work between asynchronous services.',
    defaults: defaultConfig({
      capacity: 20000,
      baseLatencyMs: 4,
      queueLimit: 100000,
      costPerHour: 0.1,
    }),
  },
  {
    type: 'monitoring-service',
    label: 'Monitoring service',
    category: 'Operations',
    color: '#bef264',
    icon: 'Activity',
    description: 'Collects operational signals and health data.',
    defaults: defaultConfig({
      capacity: 50000,
      baseLatencyMs: 10,
      costPerHour: 0.08,
    }),
  },
  {
    type: 'region',
    label: 'Region',
    category: 'Structure',
    color: '#86efac',
    icon: 'Map',
    description: 'A geographic boundary for architecture components.',
    defaults: defaultConfig({
      capacity: 0,
      baseLatencyMs: 0,
      failureRate: 0.0001,
      concurrencyLimit: 0,
      queueLimit: 0,
      costPerHour: 0,
    }),
  },
  {
    type: 'note',
    label: 'Note',
    category: 'Structure',
    color: '#fde68a',
    icon: 'StickyNote',
    description: 'Records an assumption, decision, risk, or trade-off.',
    defaults: defaultConfig({
      capacity: 0,
      baseLatencyMs: 0,
      failureRate: 0,
      concurrencyLimit: 0,
      queueLimit: 0,
      costPerHour: 0,
      noteType: 'assumption',
      content: '',
    }),
  },
];

const educationalContent: Record<
  ComponentType,
  ComponentDefinition['education']
> = {
  client: {
    summary:
      'A person, browser, mobile app, or another system that starts a request to your architecture.',
    example: 'A browser sends GET /products to the public API.',
  },
  dns: {
    summary:
      'The naming system that translates a human-readable domain into the network address of a service.',
    example: 'Resolve api.example.com to the public API gateway.',
  },
  cdn: {
    summary:
      'A geographically distributed cache that serves static or cacheable content close to users.',
    example: 'Serve cached product images from an edge location near the user.',
  },
  'load-balancer': {
    summary:
      'A traffic distributor that sends requests across healthy service instances to improve capacity and availability.',
    example:
      'Spread 10,000 requests per second across four application servers.',
  },
  'api-gateway': {
    summary:
      'A controlled entry point that routes APIs and commonly handles authentication, quotas, and request policies.',
    example: 'Validate a JWT and rate-limit requests to /checkout.',
  },
  'application-server': {
    summary:
      'A compute service that runs application logic and coordinates calls to data stores and dependencies.',
    example:
      'Process a checkout request, read inventory, and enqueue payment work.',
  },
  worker: {
    summary:
      'A background compute process that handles work asynchronously outside the user request path.',
    example: 'Consume an email job from a queue and send the message.',
  },
  cache: {
    summary:
      'An in-memory store, such as Redis, that serves repeated reads quickly and reduces database load. In this model it improves read traffic; it does not make writes faster.',
    example:
      'Cache product details for five minutes; on a miss, read the database and populate the cache.',
  },
  sharding: {
    summary:
      'A routing layer that uses a shard key to distribute data operations across database partitions.',
    example:
      'Hash customerId across four SQL shards so each customer is routed to one partition.',
  },
  'sql-database': {
    summary:
      'A relational data store for structured records, transactions, constraints, and queryable relationships.',
    example: 'Store transactional orders, line items, and payment records.',
  },
  'nosql-database': {
    summary:
      'A non-relational data store optimized for flexible models, key-based access, and horizontal scale.',
    example: 'Retrieve a user session directly by user ID.',
  },
  'object-storage': {
    summary:
      'Durable storage for files and binary objects addressed by a key rather than database rows.',
    example: 'Store uploaded product images and customer documents.',
  },
  'message-queue': {
    summary:
      'A durable buffer that decouples producers from consumers and enables asynchronous processing.',
    example:
      'Buffer checkout jobs while workers catch up after a traffic spike.',
  },
  'monitoring-service': {
    summary:
      'An operations service that collects health and performance signals and raises actionable alerts.',
    example: 'Alert when checkout P95 latency exceeds 800 ms.',
  },
  region: {
    summary:
      'A geographic deployment boundary used to group infrastructure with shared locality and failure risk.',
    example: 'Group services deployed together in the ap-southeast region.',
  },
  note: {
    summary:
      'A design annotation that records intent, assumptions, risks, constraints, and trade-offs.',
    example:
      'Record why payment processing was moved to an asynchronous queue.',
  },
};

export const componentDefinitions: ComponentDefinition[] =
  baseComponentDefinitions.map((definition) => ({
    ...definition,
    education: educationalContent[definition.type],
  }));

export const componentDefinitionMap = Object.fromEntries(
  componentDefinitions.map((definition) => [definition.type, definition]),
) as Record<ComponentType, ComponentDefinition>;
