import { useEffect, useState } from 'react';
import { parseArchitectureDocument } from '../../domain/architecture/schema';
import type { ArchitectureDocumentV1 } from '../../domain/architecture/types';
import { loadMostRecentProject, saveProject } from '../../storage/database';
import { useEditorStore } from '../canvas/editorStore';

export type SaveStatus = 'loading' | 'saved' | 'saving' | 'error';

export function useProjectPersistence(document: ArchitectureDocumentV1) {
  const [status, setStatus] = useState<SaveStatus>('loading');
  const [ready, setReady] = useState(false);
  const hydrateDocument = useEditorStore((state) => state.hydrateDocument);

  useEffect(() => {
    let active = true;
    void loadMostRecentProject()
      .then((stored) => {
        if (active && stored) {
          hydrateDocument(parseArchitectureDocument(stored.document));
        }
        if (active) setStatus('saved');
      })
      .catch(() => {
        if (active) setStatus('error');
      })
      .finally(() => {
        if (active) setReady(true);
      });
    return () => {
      active = false;
    };
  }, [hydrateDocument]);

  useEffect(() => {
    if (!ready) return;
    const timeout = window.setTimeout(() => {
      setStatus('saving');
      void saveProject(document)
        .then(() => setStatus('saved'))
        .catch(() => setStatus('error'));
    }, 500);
    return () => window.clearTimeout(timeout);
  }, [document, ready]);

  return status;
}
