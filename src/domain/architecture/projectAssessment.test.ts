import { describe, expect, it } from 'vitest';
import {
  createArchitectureDocument,
  createArchitectureEdge,
  createArchitectureNode,
} from './factories';
import { assessProject } from './projectAssessment';

describe('project assessment', () => {
  it('does not add scale findings to a new small project', () => {
    expect(assessProject(createArchitectureDocument())).toEqual([]);
  });

  it('produces targeted advisory findings for a fragile large design', () => {
    const document = createArchitectureDocument('Large service');
    document.projectSettings.expectedScale = 'large';
    document.projectSettings.expectedComplexity = 'high';
    document.projectSettings.simulationDefaults.peakRps = 50_000;
    const client = createArchitectureNode('client', { x: 0, y: 0 });
    const app = createArchitectureNode('application-server', { x: 100, y: 0 });
    const database = createArchitectureNode('sql-database', { x: 200, y: 0 });
    const read = createArchitectureEdge(app.id, database.id);
    read.config.trafficType = 'read';
    read.config.encrypted = false;
    document.nodes = [client, app, database];
    document.edges = [createArchitectureEdge(client.id, app.id), read];
    const findings = assessProject(document);
    expect(findings.every((finding) => finding.severity === 'advisory')).toBe(
      true,
    );
    expect(findings.map((finding) => finding.id)).toEqual(
      expect.arrayContaining([
        'peak-application-capacity',
        'missing-load-balancer',
        'missing-cache',
        'missing-monitoring',
        'unencrypted-connection',
        'missing-failure-scenario',
      ]),
    );
    expect(
      findings.find((finding) => finding.id === 'unencrypted-connection')
        ?.edgeId,
    ).toBe(read.id);
  });
});
