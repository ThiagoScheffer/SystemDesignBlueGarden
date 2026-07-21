import type {
  ArchitectureDocumentV1,
  ComponentType,
} from '../architecture/types';
import type { GlobalMetric, SimulationScenario } from '../simulation/types';

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
  userState: 'observed' | 'not-represented';
  referenceState: 'observed' | 'not-represented';
  explanation: string;
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
}

export interface CompiledIncident {
  scenario?: SimulationScenario;
  missingRoles: string[];
}
