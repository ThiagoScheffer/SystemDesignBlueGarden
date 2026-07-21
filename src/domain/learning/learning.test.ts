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

describe('Phase 3 learning domain', () => {
  it('publishes five unique, versioned challenges and templates', () => {
    expect(challenges).toHaveLength(5);
    expect(learningTemplates).toHaveLength(5);
    expect(new Set(challenges.map((challenge) => challenge.id)).size).toBe(5);
    expect(new Set(learningTemplates.map((template) => template.id)).size).toBe(
      5,
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
    const challenge = challenges[0];
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
    const challenge = challenges[0];
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
});
