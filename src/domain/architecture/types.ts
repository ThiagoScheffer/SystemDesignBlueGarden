export const COMPONENT_TYPES = [
  'client',
  'dns',
  'cdn',
  'load-balancer',
  'api-gateway',
  'application-server',
  'worker',
  'cache',
  'sharding',
  'sql-database',
  'nosql-database',
  'object-storage',
  'message-queue',
  'monitoring-service',
  'region',
  'note',
] as const;

export type ComponentType = (typeof COMPONENT_TYPES)[number];
export type ComponentCategory =
  | 'Client & edge'
  | 'Compute'
  | 'Data'
  | 'Messaging'
  | 'Operations'
  | 'Structure';

export type NoteType =
  | 'assumption'
  | 'decision'
  | 'risk'
  | 'question'
  | 'constraint'
  | 'requirement'
  | 'trade-off'
  | 'improvement';

export type ShardStrategy = 'hash' | 'range' | 'directory';
export type WorkerRole = 'general' | 'cache-refresh' | 'analytics-consumer' | 'cleanup';

export interface OperationalConfig {
  capacity: number;
  baseLatencyMs: number;
  failureRate: number;
  concurrencyLimit: number;
  queueLimit: number;
  costPerHour: number;
  noteType?: NoteType;
  content?: string;
  hitRatePercent?: number;
  shardCount?: number;
  shardKey?: string;
  shardStrategy?: ShardStrategy;
  ttlSeconds?: number;
  staleWindowSeconds?: number;
  ttlJitterPercent?: number;
  requestCoalescing?: boolean;
  cacheLocking?: boolean;
  lockWaitTimeoutMs?: number;
  lockTtlMs?: number;
  backgroundRefresh?: boolean;
  workerRole?: WorkerRole;
  applicationRole?: 'general' | 'redirect' | 'url-creation' | 'id-generator';
  rateLimitRps?: number;
  idStrategy?: 'sequence' | 'pool';
  idAlphabetSize?: number;
  idKeyLength?: number;
  idPoolSize?: number;
  idBatchSize?: number;
  atomicAllocation?: boolean;
  lazyExpiration?: boolean;
  backgroundCleanup?: boolean;
  uniqueConditionalWrites?: boolean;
  [key: string]: string | number | boolean | undefined;
}

export interface ArchitectureNodeV1 {
  id: string;
  type: ComponentType;
  position: { x: number; y: number };
  parentId?: string;
  data: {
    label: string;
    description?: string;
    implementationNotes?: string;
    config: OperationalConfig;
  };
}

export interface EdgeConfig {
  protocol: 'HTTP' | 'gRPC' | 'TCP' | 'Async';
  mode: 'synchronous' | 'asynchronous';
  trafficType: 'read' | 'write' | 'mixed';
  encrypted: boolean;
  latencyMs: number;
  bandwidthMbps: number;
  timeoutMs: number;
  retryCount: number;
  trafficPercentage: number;
  disabled: boolean;
  monitored: boolean;
}

export interface ArchitectureEdgeV1 {
  id: string;
  source: string;
  target: string;
  label?: string;
  config: EdgeConfig;
}

export type ExpectedScale = 'small' | 'medium' | 'large' | 'custom';
export type ExpectedUsers =
  'under-100' | '100-1000' | '1000-100000' | 'over-100000' | 'custom';
export type ExpectedComplexity = 'low' | 'medium' | 'high' | 'very-high';
export type ProjectVisibility = 'private' | 'shared' | 'public-template';

export interface CustomProjectScale {
  registeredUsers?: number;
  monthlyActiveUsers?: number;
  dailyActiveUsers?: number;
  concurrentUsers?: number;
  requestsPerSecond?: number;
  dailyTransactions?: number;
  storageGB?: number;
  monthlyTrafficGB?: number;
  peakTrafficMultiplier?: number;
}

export interface SimulationDefaults {
  initialRps: number;
  peakRps: number;
  ambientFailureRate: number;
  durationSeconds: number;
}

export interface ProjectSettings {
  expectedScale: ExpectedScale;
  expectedUsers: ExpectedUsers;
  expectedComplexity: ExpectedComplexity;
  customScale?: CustomProjectScale;
  simulationDefaults: SimulationDefaults;
  visibility: ProjectVisibility;
}

export interface ArchitectureDocumentV1 {
  schemaVersion: '1.5';
  id: string;
  metadata: {
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
  };
  viewport?: { x: number; y: number; zoom: number };
  projectSettings: ProjectSettings;
  nodes: ArchitectureNodeV1[];
  edges: ArchitectureEdgeV1[];
  scenarios: SimulationScenario[];
}
import type { SimulationScenario } from '../simulation/types';
