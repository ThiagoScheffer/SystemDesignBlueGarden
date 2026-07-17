import Dexie, { type EntityTable } from 'dexie';
import type { ArchitectureDocumentV1 } from '../domain/architecture/types';
import type {
  SimulationSummary,
  SimulationTick,
} from '../domain/simulation/types';

interface StoredProject {
  id: string;
  updatedAt: string;
  document: ArchitectureDocumentV1;
}

export interface StoredSimulationRun {
  runId: string;
  architectureId: string;
  completedAt: string;
  summary: SimulationSummary;
  ticks: SimulationTick[];
}

class BlueGardenDatabase extends Dexie {
  projects!: EntityTable<StoredProject, 'id'>;
  simulationRuns!: EntityTable<StoredSimulationRun, 'runId'>;

  constructor() {
    super('blue-garden');
    this.version(1).stores({
      projects: 'id, updatedAt',
    });
    this.version(2).stores({
      projects: 'id, updatedAt',
      simulationRuns:
        'runId, architectureId, completedAt, [architectureId+completedAt]',
    });
  }
}

export const database = new BlueGardenDatabase();

export async function saveProject(document: ArchitectureDocumentV1) {
  await database.projects.put({
    id: document.id,
    updatedAt: document.metadata.updatedAt,
    document,
  });
}

export async function loadMostRecentProject() {
  return database.projects.orderBy('updatedAt').last();
}

export async function saveSimulationRun(
  summary: SimulationSummary,
  ticks: SimulationTick[],
) {
  const downsampled =
    ticks.length <= 900 ? ticks : ticks.filter((_, index) => index % 5 === 0);
  await database.simulationRuns.put({
    runId: summary.runId,
    architectureId: summary.architectureId,
    completedAt: summary.completedAt,
    summary,
    ticks: downsampled,
  });
  const runs = await database.simulationRuns
    .where('architectureId')
    .equals(summary.architectureId)
    .sortBy('completedAt');
  const expired = runs.slice(0, Math.max(0, runs.length - 10));
  if (expired.length) {
    await database.simulationRuns.bulkDelete(expired.map((run) => run.runId));
  }
}

export async function loadRecentSimulationRuns(architectureId: string) {
  const runs = await database.simulationRuns
    .where('architectureId')
    .equals(architectureId)
    .sortBy('completedAt');
  return runs.reverse().slice(0, 10);
}
