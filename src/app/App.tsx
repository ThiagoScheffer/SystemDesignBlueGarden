import { ArchitectureCanvas } from '../features/canvas/ArchitectureCanvas';
import { useEditorStore } from '../features/canvas/editorStore';
import { ComponentPalette } from '../features/component-library/ComponentPalette';
import { useEditorShortcuts } from '../features/history/useEditorShortcuts';
import { Inspector } from '../features/inspector/Inspector';
import { TopBar } from '../features/projects/TopBar';
import { useProjectPersistence } from '../features/projects/useProjectPersistence';
import { ScenarioDrawer } from '../features/scenarios/ScenarioDrawer';
import { SimulationControls } from '../features/simulation/SimulationControls';
import { SimulationPanel } from '../features/simulation/SimulationPanel';
import { useSimulationController } from '../features/simulation/useSimulationController';

export function App() {
  const document = useEditorStore((state) => state.document);
  const saveStatus = useProjectPersistence(document);
  const simulation = useSimulationController(document);
  useEditorShortcuts();

  return (
    <div className="app-shell">
      <TopBar
        saveStatus={saveStatus}
        simulationControls={
          <SimulationControls document={document} {...simulation} />
        }
      />
      <div className="app-main">
        <div className="workspace">
          <ComponentPalette />
          <ArchitectureCanvas />
          <Inspector />
        </div>
        <SimulationPanel onReset={simulation.reset} />
      </div>
      <ScenarioDrawer document={document} start={simulation.start} />
      <div className="viewport-warning">
        <strong>Blue Garden needs a wider canvas.</strong>
        <span>Open the editor on a desktop or a larger browser window.</span>
      </div>
    </div>
  );
}
