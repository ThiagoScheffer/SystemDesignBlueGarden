import { describe, expect, it } from 'vitest';
import { parseArchitectureDocument } from '../architecture/schema';
import { alignReferenceScenario, collectEvidence } from './comparison';
import {
  challenges,
  createTemplateDocument,
  learningTemplates,
} from './content';
import { compileIncident } from './incidents';
import { calculateCapacity, validateWorksheet } from './worksheet';
import { learningRegistry, learningRubrics } from './structuredContent';
import { evaluateRubric } from './evaluation';
import { normalizeChallengeAttempt } from './attempts';

describe('Phase 3 learning domain', () => {
  it('publishes six unique, versioned challenges and templates', () => {
    expect(challenges).toHaveLength(6);
    expect(learningTemplates).toHaveLength(6);
    expect(new Set(challenges.map((challenge) => challenge.id)).size).toBe(6);
    expect(new Set(learningTemplates.map((template) => template.id)).size).toBe(
      6,
    );
    expect(
      challenges.every(
        (challenge) =>
          challenge.contentVersion === 1 && challenge.guidedSteps.length === 11,
      ),
    ).toBe(true);
  });

  it('generates valid, fresh starter and reference architecture documents', () => {
    for (const template of learningTemplates) {
      const starter = createTemplateDocument(template.id);
      const second = createTemplateDocument(template.id);
      const reference = createTemplateDocument(template.id, true);
      expect(parseArchitectureDocument(starter)).toEqual(starter);
      expect(parseArchitectureDocument(reference)).toEqual(reference);
      expect(starter.id).not.toBe(second.id);
      expect(starter.nodes.length).toBeGreaterThan(4);
    }
  });

  it('calculates capacity using the documented formulas', () => {
    const worksheet = {
      activeUsers: 86_400,
      actionsPerUserPerDay: 10,
      readPercent: 80,
      averagePayloadKB: 2,
      retentionDays: 30,
      replicationFactor: 3,
      peakMultiplier: 5,
    };
    expect(validateWorksheet(worksheet)).toEqual([]);
    expect(calculateCapacity(worksheet)).toMatchObject({
      averageRps: 10,
      peakRps: 50,
      readRps: 40,
      writeRps: 10,
    });
    expect(
      validateWorksheet({ ...worksheet, readPercent: 101, peakMultiplier: 0 }),
    ).toHaveLength(2);
  });

  it('compiles hidden incidents by semantic role without mutating the architecture', () => {
    const challenge = challenges.find((entry) => entry.id === 'url-shortener')!;
    const document = createTemplateDocument(challenge.id);
    const before = structuredClone(document);
    const result = compileIncident(challenge.incident, document);
    expect(result.missingRoles).toEqual([]);
    expect(result.scenario?.events).toHaveLength(
      challenge.incident.events.length,
    );
    expect(document).toEqual(before);
    const withoutCache = {
      ...document,
      nodes: document.nodes.filter((node) => node.type !== 'cache'),
    };
    expect(
      compileIncident(challenge.incident, withoutCache).missingRoles,
    ).toContain('cache');
    for (const definition of challenges) {
      expect(
        compileIncident(
          definition.incident,
          createTemplateDocument(definition.id),
        ).missingRoles,
      ).toEqual([]);
      expect(
        compileIncident(
          definition.incident,
          createTemplateDocument(definition.id, true),
        ).missingRoles,
      ).toEqual([]);
    }
  });

  it('uses neutral evidence states and never emits a score', () => {
    const challenge = challenges.find((entry) => entry.id === 'url-shortener')!;
    const user = createTemplateDocument(challenge.id);
    const reference = createTemplateDocument(challenge.id, true);
    const evidence = collectEvidence(challenge, user, reference);
    expect(evidence.some((item) => item.userState === 'not-represented')).toBe(
      true,
    );
    expect(JSON.stringify(evidence)).not.toMatch(/score|pass|fail/i);
  });

  it('aligns reference traffic with the submitted challenge scenario', () => {
    const challenge = challenges[0];
    const user = compileIncident(
      challenge.incident,
      createTemplateDocument(challenge.id),
    ).scenario!;
    user.traffic[0].requestsPerSecond = 12_345;
    user.ambientFailureRate = 0.03;
    const reference = compileIncident(
      challenge.incident,
      createTemplateDocument(challenge.id, true),
    ).scenario!;
    const aligned = alignReferenceScenario(user, reference);
    expect(aligned.traffic[0].sourceNodeId).toBe(
      reference.traffic[0].sourceNodeId,
    );
    expect(aligned.traffic[0].requestsPerSecond).toBe(12_345);
    expect(aligned.ambientFailureRate).toBe(0.03);
  });

  it('validates the structured registry and cache-stampede cross references', () => {
    const challenge = challenges.find((entry) => entry.id === 'cache-stampede');
    expect(challenge).toMatchObject({
      rubricId: 'cache-stampede-rubric',
      lessonIds: ['prevent-cache-stampede'],
    });
    expect(learningRegistry.challenges).toHaveLength(6);
    expect(learningRegistry.concepts.length).toBeGreaterThanOrEqual(6);
  });

  it('evaluates cache-stampede evidence without a score', () => {
    const document = createTemplateDocument('cache-stampede');
    const rubric = learningRubrics[0];
    const before = evaluateRubric(rubric, document, []);
    expect(before).toContainEqual(
      expect.objectContaining({
        criterionId: 'cache-request-path',
        state: 'observed',
      }),
    );
    expect(before).toContainEqual(
      expect.objectContaining({
        criterionId: 'duplicate-rebuild-protection',
        state: 'not-represented',
      }),
    );
    expect(JSON.stringify(before)).not.toMatch(/score|pass|fail/i);
  });

  it('normalizes legacy attempts without rewriting their challenge snapshot', () => {
    const challenge = challenges.find((entry) => entry.id === 'url-shortener')!;
    const legacy = {
      id: 'attempt-legacy',
      challengeId: challenge.id,
      challengeVersion: challenge.contentVersion,
      challengeSnapshot: structuredClone(challenge),
      architectureId: 'architecture-legacy',
      mode: 'guided' as const,
      status: 'in-progress' as const,
      startedAt: '2026-01-01T00:00:00.000Z',
      updatedAt: '2026-01-01T00:00:00.000Z',
      revealedIncident: false,
      incidentRunCompleted: false,
      completedStepIds: [],
      answers: {
        clarifyingQuestions: '',
        functionalRequirements: '',
        nonFunctionalRequirements: '',
        dataAndApiDecisions: '',
        bottlenecksAndTradeoffs: '',
      },
      worksheet: structuredClone(challenge.worksheetDefaults),
    };
    const normalized = normalizeChallengeAttempt(legacy);
    expect(normalized.learningSchemaVersion).toBe(2);
    expect(normalized.runSnapshots).toEqual([]);
    expect(normalized.challengeSnapshot).toEqual(legacy.challengeSnapshot);
    expect(normalized.challengeSnapshot).not.toBe(legacy.challengeSnapshot);
  });
});
