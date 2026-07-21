import type {
  ExpectedScale,
  ProjectSettings,
  SimulationDefaults,
} from './types';

export const recommendedSimulationDefaults: Record<
  Exclude<ExpectedScale, 'custom'>,
  Omit<SimulationDefaults, 'ambientFailureRate'>
> = {
  small: { initialRps: 100, peakRps: 300, durationSeconds: 120 },
  medium: { initialRps: 1_000, peakRps: 3_000, durationSeconds: 180 },
  large: { initialRps: 10_000, peakRps: 50_000, durationSeconds: 300 },
};

export const createDefaultProjectSettings = (): ProjectSettings => ({
  expectedScale: 'small',
  expectedUsers: 'under-100',
  expectedComplexity: 'low',
  simulationDefaults: {
    ...recommendedSimulationDefaults.small,
    ambientFailureRate: 0,
  },
  visibility: 'private',
});

export function simulationDefaultsForScale(
  settings: ProjectSettings,
): SimulationDefaults {
  if (settings.expectedScale !== 'custom') {
    return {
      ...recommendedSimulationDefaults[settings.expectedScale],
      ambientFailureRate: settings.simulationDefaults.ambientFailureRate,
    };
  }
  const initialRps = settings.customScale?.requestsPerSecond ?? 0;
  const multiplier = settings.customScale?.peakTrafficMultiplier ?? 1;
  return {
    ...settings.simulationDefaults,
    initialRps,
    peakRps: initialRps * multiplier,
  };
}
