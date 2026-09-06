import { ArchitectureCanvas } from '../features/canvas/ArchitectureCanvas';
import { useEditorStore } from '../features/canvas/editorStore';
import { ComponentPalette } from '../features/component-library/ComponentPalette';
import { useEditorShortcuts } from '../features/history/useEditorShortcuts';
import { InspectorHost } from '../features/inspector/InspectorHost';
import { usePresentationStore } from './presentationStore';
import { useSimulationStore } from '../features/simulation/simulationStore';
import { useEffect, useRef } from 'react';
import { TopBar } from '../features/projects/TopBar';
import { useProjectPersistence } from '../features/projects/useProjectPersistence';
import { ScenarioDrawer } from '../features/scenarios/ScenarioDrawer';
import { SimulationControls } from '../features/simulation/SimulationControls';
import { SimulationPanel } from '../features/simulation/SimulationPanel';
import { useSimulationController } from '../features/simulation/useSimulationController';
import { useLearningController } from '../features/learning/useLearningController';
import { LearningHub } from '../features/learning/LearningHub';
import { LearningDrawer } from '../features/learning/LearningDrawer';

export function App() {
  const document = useEditorStore((state) => state.document);
  const saveStatus = useProjectPersistence(document);
  const simulation = useSimulationController(document);
  const learning = useLearningController(document, simulation.start);
  useEditorShortcuts();
  const readingView = usePresentationStore((state) => state.readingView);
  const setReadingView = usePresentationStore((state) => state.setReadingView);
  const diagnostic = useSimulationStore((state) => state.activeDiagnostic);
  const infoNodeId = useEditorStore((state) => state.expandedInfoNodeId);
  const hasDetails = !!diagnostic || !!infoNodeId;
  const previousProject = useRef(document.id);
  const resetSimulation = simulation.reset;
  useEffect(() => {
    if (previousProject.current !== document.id) {
      resetSimulation();
      setReadingView('canvas');
      previousProject.current = document.id;
    }
  }, [document.id, setReadingView, resetSimulation]);
  const backToCanvas = () => {
    useEditorStore.getState().commitTransaction();
    useEditorStore.getState().closeInfoNode();
    useSimulationStore.getState().closeDiagnostic();
    setReadingView('canvas');
  };

  return (
    <div className="app-shell">
      <TopBar
        saveStatus={saveStatus}
        simulationControls={
          <SimulationControls document={document} {...simulation} />
        }
      />
      <nav className="workspace-navigation" aria-label="Workspace panels">
        <button
          type="button"
          aria-pressed={readingView === 'components'}
          onClick={() => {
            backToCanvas();
            setReadingView(
              readingView === 'components' ? 'canvas' : 'components',
            );
          }}
        >
          Components
        </button>
        <button
          type="button"
          className="inspector-navigation"
          aria-pressed={readingView === 'inspector' || hasDetails}
          onClick={() => setReadingView('inspector')}
        >
          Inspector
        </button>
        <button type="button" onClick={backToCanvas}>
          Back to canvas
        </button>
      </nav>
      <div
        className={`app-main reading-${hasDetails ? 'inspector' : readingView}`}
      >
        <div
          className={`workspace ${hasDetails ? 'has-details' : ''} ${readingView === 'components' ? 'components-open' : ''}`}
        >
          <div className="palette-host">
            <ComponentPalette />
          </div>
          <ArchitectureCanvas />
          <InspectorHost />
        </div>
        <SimulationPanel onReset={simulation.reset} />
      </div>
      <ScenarioDrawer document={document} start={simulation.start} />
      <LearningHub controller={learning} />
      <LearningDrawer controller={learning} />
    </div>
  );
}
