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
}

export interface ArchitectureEdgeV1 {
  id: string;
  source: string;
  target: string;
  label?: string;
  config: EdgeConfig;
}

export interface ArchitectureDocumentV1 {
  schemaVersion: '1.2';
  id: string;
  metadata: {
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
  };
  viewport?: { x: number; y: number; zoom: number };
  nodes: ArchitectureNodeV1[];
  edges: ArchitectureEdgeV1[];
  scenarios: SimulationScenario[];
}
import type { SimulationScenario } from '../simulation/types';
