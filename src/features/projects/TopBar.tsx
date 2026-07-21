import {
  Download,
  FilePlus2,
  Leaf,
  Redo2,
  Settings,
  Undo2,
  Upload,
} from 'lucide-react';
import { useRef, useState } from 'react';
import { useEditorStore } from '../canvas/editorStore';
import {
  exportArchitecture,
  readArchitectureFile,
} from '../import-export/files';
import type { SaveStatus } from './useProjectPersistence';
import type { ReactNode } from 'react';
import {
  isSimulationLocked,
  useSimulationStore,
} from '../simulation/simulationStore';
import { ProjectSettingsDrawer } from './ProjectSettingsDrawer';

export function TopBar({
  saveStatus,
  simulationControls,
}: {
  saveStatus: SaveStatus;
  simulationControls?: ReactNode;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [importError, setImportError] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const document = useEditorStore((state) => state.document);
  const past = useEditorStore((state) => state.past);
  const future = useEditorStore((state) => state.future);
  const undo = useEditorStore((state) => state.undo);
  const redo = useEditorStore((state) => state.redo);
  const newDocument = useEditorStore((state) => state.newDocument);
  const replaceDocument = useEditorStore((state) => state.replaceDocument);
  const renameDocument = useEditorStore((state) => state.renameDocument);
  const simulationStatus = useSimulationStore((state) => state.status);
  const locked = isSimulationLocked(simulationStatus);

  const importFile = async (file?: File) => {
    if (!file) return;
    try {
      replaceDocument(await readArchitectureFile(file));
      setImportError('');
    } catch (error) {
      setImportError(
        error instanceof Error
          ? error.message
          : 'The architecture file is invalid.',
      );
    }
  };

  return (
    <header className="topbar">
      <div className="brand">
        <span className="brand-mark">
          <Leaf aria-hidden="true" size={18} />
        </span>
        <div>
          <strong>Blue Garden</strong>
          <span>System design lab</span>
        </div>
      </div>
      <div className="project-title">
        <input
          aria-label="Architecture name"
          maxLength={120}
          value={document.metadata.name}
          disabled={locked}
          onChange={(event) =>
            renameDocument(event.target.value || 'Untitled architecture')
          }
        />
        <span className={`save-status save-${saveStatus}`}>
          {saveStatus === 'loading' && 'Opening…'}
          {saveStatus === 'saving' && 'Saving…'}
          {saveStatus === 'saved' && 'Saved locally'}
          {saveStatus === 'error' && 'Save unavailable'}
        </span>
      </div>
      <nav className="toolbar" aria-label="Architecture actions">
        <button
          type="button"
          onClick={newDocument}
          title="New architecture"
          disabled={locked}
        >
          <FilePlus2 aria-hidden="true" size={17} />
          <span>New</span>
        </button>
        <span className="toolbar-divider" />
        <button
          type="button"
          onClick={undo}
          disabled={locked || past.length === 0}
          title="Undo"
        >
          <Undo2 aria-hidden="true" size={17} />
        </button>
        <button
          type="button"
          onClick={redo}
          disabled={locked || future.length === 0}
          title="Redo"
        >
          <Redo2 aria-hidden="true" size={17} />
        </button>
        <span className="toolbar-divider" />
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          title="Import JSON"
          disabled={locked}
        >
          <Upload aria-hidden="true" size={17} />
          <span>Import</span>
        </button>
        <button
          type="button"
          onClick={() => exportArchitecture(document)}
          title="Export JSON"
        >
          <Download aria-hidden="true" size={17} />
          <span>Export</span>
        </button>
        <input
          ref={inputRef}
          className="sr-only"
          type="file"
          accept="application/json,.json"
          onChange={(event) => void importFile(event.target.files?.[0])}
        />
        <span className="toolbar-divider" />
        <button
          type="button"
          onClick={() => setSettingsOpen(true)}
          title="Project settings"
        >
          <Settings aria-hidden="true" size={17} />
          <span>Settings</span>
        </button>
        <span className="toolbar-divider" />
        {simulationControls}
      </nav>
      {importError && (
        <div className="import-error" role="alert" title={importError}>
          Import failed
        </div>
      )}
      {settingsOpen && (
        <ProjectSettingsDrawer
          open
          onClose={() => setSettingsOpen(false)}
          locked={locked}
        />
      )}
    </header>
  );
}
