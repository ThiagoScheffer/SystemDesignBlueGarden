/// <reference lib="webworker" />
import { runSimulation } from './simulationEngine';
import { compileIncident } from '../domain/learning/incidents';
import type { ArchitectureDocumentV1 } from '../domain/architecture/types';
import type { ChallengeDefinition } from '../domain/learning/types';
import { alignReferenceScenario } from '../domain/learning/comparison';

interface Request {
  attemptId: string;
  challenge: ChallengeDefinition;
  user: ArchitectureDocumentV1;
  reference: ArchitectureDocumentV1;
}

self.onmessage = (message: MessageEvent<Request>) => {
  const { attemptId, challenge, user, reference } = message.data;
  try {
    const userIncident = compileIncident(challenge.incident, user);
    const referenceIncident = compileIncident(challenge.incident, reference);
    if (!userIncident.scenario)
      throw new Error(
        `Your design is missing: ${userIncident.missingRoles.join(', ')}.`,
      );
    if (!referenceIncident.scenario)
      throw new Error(
        `Reference incident is invalid: ${referenceIncident.missingRoles.join(', ')}.`,
      );
    const referenceScenario = alignReferenceScenario(
      userIncident.scenario,
      referenceIncident.scenario,
    );
    const execute = (
      document: ArchitectureDocumentV1,
      scenario: NonNullable<typeof userIncident.scenario>,
      suffix: string,
    ) =>
      runSimulation({
        runId: `comparison-${attemptId}-${suffix}`,
        architectureId: document.id,
        architectureUpdatedAt: document.metadata.updatedAt,
        nodes: document.nodes,
        edges: document.edges,
        scenario,
      }).summary.peakMetric;
    self.postMessage({
      type: 'COMPLETE',
      attemptId,
      scenario: userIncident.scenario,
      userMetric: execute(user, userIncident.scenario, 'user'),
      referenceMetric: execute(reference, referenceScenario, 'reference'),
    });
  } catch (error) {
    self.postMessage({
      type: 'ERROR',
      attemptId,
      message: error instanceof Error ? error.message : 'Comparison failed.',
    });
  }
};
