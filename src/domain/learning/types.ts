import type {
  ArchitectureDocumentV1,
  ComponentType,
} from '../architecture/types';
import type {
  GlobalMetric,
  SimulationScenario,
  SimulationSummary,
} from '../simulation/types';

export type ChallengeLevel = 'beginner' | 'intermediate' | 'advanced';
export type LearningMode = 'guided' | 'interview';
export type AttemptStatus = 'in-progress' | 'completed' | 'abandoned';

export interface CapacityWorksheet {
  activeUsers: number;
  actionsPerUserPerDay: number;
  readPercent: number;
  averagePayloadKB: number;
  retentionDays: number;
  replicationFactor: number;
  peakMultiplier: number;
}

export interface CapacityEstimate {
  averageRps: number;
  peakRps: number;
  readRps: number;
  writeRps: number;
  dailyStorageGB: number;
  retainedStorageGB: number;
  monthlyTrafficGB: number;
}

export type IncidentEventBlueprint =
  | {
      type: 'TRAFFIC_SET';
      componentType: 'client';
      requestsPerSecond: number;
      atSecond: number;
    }
  | {
      type: 'NODE_FAILURE';
      componentType: ComponentType;
      durationSeconds: number;
      atSecond: number;
    }
  | {
      type: 'NODE_CAPACITY';
      componentType: ComponentType;
      multiplier: number;
      durationSeconds: number;
      atSecond: number;
    }
  | {
      type: 'CACHE_BYPASS';
      componentType: 'cache';
      durationSeconds: number;
      atSecond: number;
    }
  | {
      type: 'CACHE_KEY_EXPIRATION';
      componentType: 'cache';
      keyCount: number;
      affectedTrafficPercent: number;
      rebuildDurationSeconds: number;
      durationSeconds: number;
      atSecond: number;
    }
  | {
      type: 'QUEUE_INJECT';
      componentType: 'message-queue';
      messages: number;
      atSecond: number;
    }
  | {
      type: 'EDGE_LATENCY';
      sourceType: ComponentType;
      targetType: ComponentType;
      addedLatencyMs: number;
      durationSeconds: number;
      atSecond: number;
    };

export interface IncidentBlueprint {
  id: string;
  title: string;
  hiddenDescription: string;
  revealedDescription: string;
  durationSeconds: number;
  events: IncidentEventBlueprint[];
}

export interface ChallengeCriterion {
  id: string;
  label: string;
  explanation: string;
  componentTypes: ComponentType[];
  minimum: number;
}

export type EvidenceState = 'observed' | 'partial' | 'not-represented';
export type EvaluationRule =
  | {
      type: 'component-count';
      componentTypes: ComponentType[];
      minimum: number;
    }
  | {
      type: 'active-path';
      componentTypes: ComponentType[];
    }
  | {
      type: 'config-enabled';
      componentType: ComponentType;
      keys: string[];
      minimumEnabled: number;
    }
  | {
      type: 'run-observation';
      metric: LearningMetricKey;
      operator: 'gt' | 'gte' | 'lt' | 'lte';
      value: number;
    }
  | {
      type: 'run-improvement';
      metric: LearningMetricKey;
      minimumPercent: number;
    }
  | { type: 'cache-lock-safety' }
  | { type: 'cache-refresh-connection' };

export interface RubricCriterionDefinition {
  id: string;
  label: string;
  explanation: string;
  rule: EvaluationRule;
}

export interface RubricDefinition {
  id: string;
  contentVersion: number;
  criteria: RubricCriterionDefinition[];
}

export interface ConceptDefinition {
  id: string;
  contentVersion: number;
  title: string;
  summary: string;
  componentTypes: ComponentType[];
  sourceIds: string[];
}

export interface LessonDefinition {
  id: string;
  contentVersion: number;
  title: string;
  summary: string;
  conceptIds: string[];
  questionIds: string[];
  tipIds: string[];
}

export interface LearningQuestion {
  id: string;
  prompt: string;
  conceptIds: string[];
}

export interface LearningTipDefinition {
  id: string;
  title: string;
  guidance: string;
  conceptIds: string[];
}

export interface LearningSourceReference {
  id: string;
  title: string;
  localPath: string;
}

export interface ChallengeDefinition {
  id: string;
  contentVersion: number;
  templateId: string;
  title: string;
  level: ChallengeLevel;
  summary: string;
  prompt: string;
  concepts: string[];
  functionalRequirements: string[];
  nonFunctionalRequirements: string[];
  guidedSteps: Array<{ id: string; label: string; hint: string }>;
  worksheetDefaults: CapacityWorksheet;
  incident: IncidentBlueprint;
  criteria: ChallengeCriterion[];
  referenceTradeoffs: string[];
  recommendedComponents?: ComponentType[];
  lessonIds?: string[];
  rubricId?: string;
}

export interface LearningTemplate {
  id: string;
  contentVersion: number;
  title: string;
  summary: string;
  level: ChallengeLevel;
  concepts: string[];
  assumptions: string[];
  knownTradeoffs: string[];
}

export interface AttemptAnswers {
  clarifyingQuestions: string;
  functionalRequirements: string;
  nonFunctionalRequirements: string;
  dataAndApiDecisions: string;
  bottlenecksAndTradeoffs: string;
}

export interface EvidenceObservation {
  criterionId: string;
  label: string;
  userState: EvidenceState;
  referenceState: EvidenceState;
  explanation: string;
}

export type LearningMetricKey =
  | 'databasePeakOfferedRps'
  | 'cachePeakOriginRps'
  | 'cachePeakLockWaitRps'
  | 'cacheTotalLockTimeouts'
  | 'cacheTotalStaleResponses'
  | 'cacheTotalCoalescedRequests'
  | 'globalPeakP95LatencyMs'
  | 'globalPeakErrorRate';

export interface LearningRunMetrics {
  databasePeakOfferedRps: number;
  cachePeakOriginRps: number;
  cachePeakLockWaitRps: number;
  cacheTotalLockTimeouts: number;
  cacheTotalStaleResponses: number;
  cacheTotalCoalescedRequests: number;
  globalPeakP95LatencyMs: number;
  globalPeakErrorRate: number;
}

export interface LearningRunSnapshot {
  id: string;
  createdAt: string;
  architecture: ArchitectureDocumentV1;
  scenario: SimulationScenario;
  summary: SimulationSummary;
  metrics: LearningRunMetrics;
}

export interface ComparisonSnapshot {
  createdAt: string;
  scenario: SimulationScenario;
  submittedArchitecture: ArchitectureDocumentV1;
  referenceArchitecture: ArchitectureDocumentV1;
  userMetric: GlobalMetric;
  referenceMetric: GlobalMetric;
  evidence: EvidenceObservation[];
  referenceTradeoffs: string[];
}

export interface ChallengeAttempt {
  learningSchemaVersion?: 2;
  id: string;
  challengeId: string;
  challengeVersion: number;
  challengeSnapshot: ChallengeDefinition;
  architectureId: string;
  mode: LearningMode;
  status: AttemptStatus;
  startedAt: string;
  updatedAt: string;
  deadlineAt?: string;
  completedAt?: string;
  revealedIncident: boolean;
  incidentRunCompleted: boolean;
  incidentScenarioId?: string;
  completedStepIds: string[];
  answers: AttemptAnswers;
  worksheet: CapacityWorksheet;
  comparison?: ComparisonSnapshot;
  runSnapshots?: LearningRunSnapshot[];
}

export interface CompiledIncident {
  scenario?: SimulationScenario;
  missingRoles: string[];
}
