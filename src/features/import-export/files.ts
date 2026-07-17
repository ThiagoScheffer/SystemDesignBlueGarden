import { parseArchitectureDocument } from '../../domain/architecture/schema';
import type { ArchitectureDocumentV1 } from '../../domain/architecture/types';

export function exportArchitecture(document: ArchitectureDocumentV1) {
  const content = JSON.stringify(document, null, 2);
  const blob = new Blob([content], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = window.document.createElement('a');
  const safeName = document.metadata.name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
  anchor.href = url;
  anchor.download = `${safeName || 'architecture'}.blue-garden.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

export async function readArchitectureFile(file: File) {
  const raw = await file.text();
  return parseArchitectureDocument(JSON.parse(raw));
}
