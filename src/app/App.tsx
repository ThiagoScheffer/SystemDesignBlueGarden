import { ArchitectureCanvas } from '../features/canvas/ArchitectureCanvas';
import { useEditorStore } from '../features/canvas/editorStore';
import { ComponentPalette } from '../features/component-library/ComponentPalette';
import { useEditorShortcuts } from '../features/history/useEditorShortcuts';
import { Inspector } from '../features/inspector/Inspector';
import { TopBar } from '../features/projects/TopBar';
import { useProjectPersistence } from '../features/projects/useProjectPersistence';

export function App() {
  const document = useEditorStore((state) => state.document);
  const saveStatus = useProjectPersistence(document);
  useEditorShortcuts();

  return (
    <div className="app-shell">
      <TopBar saveStatus={saveStatus} />
      <div className="workspace">
        <ComponentPalette />
        <ArchitectureCanvas />
        <Inspector />
      </div>
      <div className="viewport-warning">
        <strong>Blue Garden needs a wider canvas.</strong>
        <span>Open the editor on a desktop or a larger browser window.</span>
      </div>
    </div>
  );
}
