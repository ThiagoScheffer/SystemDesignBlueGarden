import { parseArchitectureDocument } from '../architecture/schema';
import type { ChallengeAttempt } from './types';

export function normalizeChallengeAttempt(
  input: ChallengeAttempt,
): ChallengeAttempt {
  return {
    ...structuredClone(input),
    learningSchemaVersion: 2,
    comparison: input.comparison ? { ...structuredClone(input.comparison), submittedArchitecture: parseArchitectureDocument(input.comparison.submittedArchitecture), referenceArchitecture: parseArchitectureDocument(input.comparison.referenceArchitecture) } : undefined,
    runSnapshots: (input.runSnapshots ?? []).map(run => ({ ...structuredClone(run), architecture: parseArchitectureDocument(run.architecture) })),
  };
}
