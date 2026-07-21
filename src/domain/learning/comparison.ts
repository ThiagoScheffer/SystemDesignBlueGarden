import type { ArchitectureDocumentV1 } from '../architecture/types';
import type { GlobalMetric } from '../simulation/types';
import type { SimulationScenario } from '../simulation/types';
import type { ChallengeDefinition, EvidenceObservation } from './types';

export function collectEvidence(
  challenge: ChallengeDefinition,
  user: ArchitectureDocumentV1,
  reference: ArchitectureDocumentV1,
): EvidenceObservation[] {
  const inspect = (
    document: ArchitectureDocumentV1,
    types: ChallengeDefinition['criteria'][number]['componentTypes'],
    minimum: number,
  ) =>
    document.nodes.filter((node) => types.includes(node.type)).length >= minimum
      ? ('observed' as const)
      : ('not-represented' as const);
  return challenge.criteria.map((criterion) => ({
    criterionId: criterion.id,
    label: criterion.label,
    userState: inspect(user, criterion.componentTypes, criterion.minimum),
    referenceState: inspect(
      reference,
      criterion.componentTypes,
      criterion.minimum,
    ),
    explanation: criterion.explanation,
  }));
}

export const emptyMetric = (): GlobalMetric => ({
  generatedRps: 0,
  successfulRps: 0,
  failedRps: 0,
  errorRate: 0,
  averageLatencyMs: 0,
  p95LatencyMs: 0,
  queueDepth: 0,
  estimatedMonthlyCost: 0,
});

export function alignReferenceScenario(
  userScenario: SimulationScenario,
  referenceScenario: SimulationScenario,
): SimulationScenario {
  return {
    ...referenceScenario,
    durationSeconds: userScenario.durationSeconds,
    ambientFailureRate: userScenario.ambientFailureRate,
    traffic: referenceScenario.traffic.map((source, index) => ({
      ...source,
      requestsPerSecond:
        userScenario.traffic[index]?.requestsPerSecond ??
        userScenario.traffic[0]?.requestsPerSecond ??
        source.requestsPerSecond,
    })),
  };
}
