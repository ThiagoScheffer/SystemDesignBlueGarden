import Dexie, { type EntityTable } from 'dexie';
import type { ArchitectureDocumentV1 } from '../domain/architecture/types';

interface StoredProject {
  id: string;
  updatedAt: string;
  document: ArchitectureDocumentV1;
}

class BlueGardenDatabase extends Dexie {
  projects!: EntityTable<StoredProject, 'id'>;

  constructor() {
    super('blue-garden');
    this.version(1).stores({
      projects: 'id, updatedAt',
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
