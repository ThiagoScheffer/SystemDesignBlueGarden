import { describe, expect, it } from 'vitest';
import {
  createArchitectureEdge,
  createArchitectureNode,
} from '../../domain/architecture/factories';
import { simulationScenarioSchema } from '../../domain/simulation/schema';
import {
  createScenarioPreset,
  scenarioPresetLabels,
  type ScenarioPreset,
} from './presets';

describe('scenario presets', () => {
  it('creates valid Baseline and six incident scenarios', () => {
    const nodes = [
      createArchitectureNode('client', { x: 0, y: 0 }),
      createArchitectureNode('application-server', { x: 100, y: 0 }),
      createArchitectureNode('sql-database', { x: 200, y: 0 }),
      createArchitectureNode('cache', { x: 300, y: 0 }),
      createArchitectureNode('message-queue', { x: 400, y: 0 }),
    ];
    const edges = [createArchitectureEdge(nodes[0].id, nodes[1].id)];
    const presets = Object.keys(scenarioPresetLabels) as ScenarioPreset[];

    expect(presets).toHaveLength(7);
    for (const preset of presets) {
      expect(
        simulationScenarioSchema.parse(
          createScenarioPreset(preset, nodes, edges),
        ),
      ).toBeDefined();
    }
  });
});
