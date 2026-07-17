import type {
  ArchitectureEdgeV1,
  ArchitectureNodeV1,
  ComponentType,
} from '../architecture/types';

export type SimulationSpeed = 1 | 4 | 16 | 'MAX';
export type SimulationStatus =
  | 'idle'
  | 'preflight'
  | 'running'
  | 'paused'
  | 'completed'
  | 'cancelled'
  | 'error';

export interface TrafficSource {
  sourceNodeId: string;
  requestsPerSecond: number;
}

interface ScenarioEventBase {
  id: string;
  atSecond: number;
}

export type ScenarioEvent =
  | (ScenarioEventBase & {
      type: 'TRAFFIC_SET';
      sourceNodeId: string;
      requestsPerSecond: number;
    })
  | (ScenarioEventBase & {
      type: 'NODE_FAILURE';
      nodeId: string;
      durationSeconds: number;
    })
  | (ScenarioEventBase & {
      type: 'NODE_CAPACITY';
      nodeId: string;
      multiplier: number;
      durationSeconds: number;
    })
  | (ScenarioEventBase & {
      type: 'CACHE_BYPASS';
      nodeId: string;
      durationSeconds: number;
    })
  | (ScenarioEventBase & {
      type: 'QUEUE_INJECT';
      nodeId: string;
      messages: number;
    })
  | (ScenarioEventBase & {
      type: 'EDGE_LATENCY';
      edgeId: string;
      addedLatencyMs: number;
      durationSeconds: number;
    });

export interface SimulationScenario {
  id: string;
  name: string;
  description?: string;
  durationSeconds: number;
  traffic: TrafficSource[];
  events: ScenarioEvent[];
}

export interface SimulationInput {
  runId: string;
  architectureId: string;
  architectureUpdatedAt: string;
  nodes: ArchitectureNodeV1[];
  edges: ArchitectureEdgeV1[];
  scenario: SimulationScenario;
}

export type MetricStatus = 'normal' | 'warning' | 'critical' | 'failed';

export type DiagnosticCategory = 'error' | 'bottleneck';
export type DiagnosticSeverity = 'warning' | 'critical';
export type DiagnosticTopic =
  'capacity' | 'latency' | 'cache' | 'queue' | 'sharding' | 'failure';
export type DiagnosticCode =
  | 'component-unavailable'
  | 'capacity-rejection'
  | 'processing-failure'
  | 'timeout'
  | 'downstream-unavailable'
  | 'downstream-rejection'
  | 'downstream-processing-failure'
  | 'capacity-saturation'
  | 'queue-growth'
  | 'high-tail-latency'
  | 'cache-miss-amplification'
  | 'hot-shard'
  | 'retry-amplification';

export interface SimulationDiagnostic {
  id: string;
  code: DiagnosticCode;
  topic: DiagnosticTopic;
  category: DiagnosticCategory;
  severity: DiagnosticSeverity;
  title: string;
  explanation: string;
  affectedRps: number;
  affectedPercent: number;
}

export interface NodeMetric {
  incomingRps: number;
  offeredRps: number;
  processedRps: number;
  utilization: number;
  loadRatio: number | null;
  backlog: number;
  overflow: number;
  rejectedRps: number;
  processingFailureRps: number;
  averageLatencyMs: number;
  p95LatencyMs: number;
  failedRps: number;
  effectiveCapacity: number;
  status: MetricStatus;
  diagnostics: SimulationDiagnostic[];
  cacheHitRps?: number;
  cacheMissRps?: number;
  queueEnqueued?: number;
  queueDelivered?: number;
  routedRps?: Record<string, number>;
}

export interface EdgeMetric {
  transferredRps: number;
  effectiveLatencyMs: number;
  retries: number;
  timeouts: number;
  failedRps: number;
  rejectedRps: number;
  processingFailureRps: number;
  unavailableRps: number;
  diagnostics: SimulationDiagnostic[];
}

export interface GlobalMetric {
  generatedRps: number;
  successfulRps: number;
  failedRps: number;
  errorRate: number;
  averageLatencyMs: number;
  p95LatencyMs: number;
  queueDepth: number;
  estimatedMonthlyCost: number;
}

export interface SimulationLogEntry {
  id: string;
  second: number;
  severity: 'info' | 'warning' | 'critical';
  message: string;
  nodeId?: string;
  edgeId?: string;
  evidence?: Record<string, number | string>;
}

export interface SimulationTick {
  second: number;
  global: GlobalMetric;
  nodes: Record<string, NodeMetric>;
  edges: Record<string, EdgeMetric>;
  events: SimulationLogEntry[];
}

export interface BottleneckFinding {
  id: string;
  kind: 'capacity' | 'queue' | 'latency' | 'failure' | 'retry';
  severity: 'warning' | 'critical';
  title: string;
  description: string;
  suggestion: string;
  nodeId?: string;
  edgeId?: string;
  impact: number;
}

export interface SimulationSummary {
  runId: string;
  architectureId: string;
  architectureUpdatedAt: string;
  scenarioId: string;
  scenarioName: string;
  completedAt: string;
  durationSeconds: number;
  finalMetric: GlobalMetric;
  peakMetric: GlobalMetric;
  findings: BottleneckFinding[];
}

export interface PreflightFinding {
  id: string;
  severity: 'error' | 'warning';
  code: string;
  message: string;
  nodeId?: string;
  edgeId?: string;
}

export interface PreflightResult {
  errors: PreflightFinding[];
  warnings: PreflightFinding[];
  order: string[];
}

export interface ComponentSimulationRule {
  type: ComponentType;
  trafficNode: boolean;
}

export type WorkerCommand =
  | { type: 'START'; input: SimulationInput; speed: SimulationSpeed }
  | { type: 'PAUSE'; runId: string }
  | { type: 'RESUME'; runId: string; speed: SimulationSpeed }
  | { type: 'SET_SPEED'; runId: string; speed: SimulationSpeed }
  | { type: 'CANCEL'; runId: string };

export type WorkerResponse =
  | { type: 'READY'; runId: string }
  | { type: 'TICK'; runId: string; tick: SimulationTick }
  | { type: 'COMPLETE'; runId: string; summary: SimulationSummary }
  | { type: 'CANCELLED'; runId: string }
  | { type: 'ERROR'; runId: string; code: string; message: string };
