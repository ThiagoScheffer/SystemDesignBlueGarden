import type { ChallengeAttempt } from './types';

export function normalizeChallengeAttempt(
  input: ChallengeAttempt,
): ChallengeAttempt {
  return {
    ...structuredClone(input),
    learningSchemaVersion: 2,
    runSnapshots: structuredClone(input.runSnapshots ?? []),
  };
}
