import { describe, expect, it } from 'vitest';
import { COMPONENT_TYPES } from '../architecture/types';
import { iconMap } from '../../features/component-library/iconMap';
import { componentDefinitions } from './definitions';

describe('component registry', () => {
  it('defines complete educational metadata for all 16 component types', () => {
    const types = componentDefinitions.map((definition) => definition.type);

    expect(componentDefinitions).toHaveLength(16);
    expect(new Set(types).size).toBe(16);
    expect(new Set(types)).toEqual(new Set(COMPONENT_TYPES));
    for (const definition of componentDefinitions) {
      expect(definition.label).not.toBe('');
      expect(definition.education.summary).not.toBe('');
      expect(definition.education.example).not.toBe('');
      expect(iconMap[definition.icon]).toBeDefined();
    }
  });

  it('uses the approved Cache explanation and defaults', () => {
    const cache = componentDefinitions.find(
      (definition) => definition.type === 'cache',
    );

    expect(cache?.education.summary).toBe(
      'An in-memory store, such as Redis, that serves repeated reads quickly and reduces database load. In this model it improves read traffic; it does not make writes faster.',
    );
    expect(cache?.defaults.hitRatePercent).toBe(80);
  });
});
