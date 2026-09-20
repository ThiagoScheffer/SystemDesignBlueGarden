import { ArchitectureCanvas } from '../features/canvas/ArchitectureCanvas';
import { useEditorStore } from '../features/canvas/editorStore';
import { ComponentPalette } from '../features/component-library/ComponentPalette';
import { useEditorShortcuts } from '../features/history/useEditorShortcuts';
import { InspectorHost } from '../features/inspector/InspectorHost';
import { usePresentationStore } from './presentationStore';
import { useSimulationStore } from '../features/simulation/simulationStore';
import { useEffect, useRef, useState } from 'react';
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
  const [width, setWidth] = useState(window.innerWidth);
  useEffect(() => {
    const resize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', resize);
    return () => window.removeEventListener('resize', resize);
  }, []);
  const document = useEditorStore((state) => state.document);
  const saveStatus = useProjectPersistence(document);
  const simulation = useSimulationController(document);
  const learning = useLearningController(document, simulation.start);
  useEditorShortcuts();
  const readingView = usePresentationStore((state) => state.readingView);
  const componentsVisible = usePresentationStore(
    (state) => state.componentsVisible,
  );
  const inspectorVisible = usePresentationStore(
    (state) => state.inspectorVisible,
  );
  const togglePanel = usePresentationStore((state) => state.togglePanel);
  const setReadingView = usePresentationStore((state) => state.setReadingView);
  const diagnostic = useSimulationStore((state) => state.activeDiagnostic);
  const infoNodeId = useEditorStore((state) => state.expandedInfoNodeId);
  const hasDetails = !!diagnostic || !!infoNodeId;
  useEffect(() => {
    if (diagnostic || infoNodeId)
      usePresentationStore.getState().setReadingView('inspector');
  }, [diagnostic, infoNodeId]);
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
          id="components-toggle"
          aria-expanded={
            width < 1280 ? readingView === 'components' : componentsVisible
          }
          aria-controls="components-panel"
          onClick={() => togglePanel('components')}
        >
          Components
        </button>
        <button
          type="button"
          className="inspector-navigation"
          id="inspector-toggle"
          aria-expanded={
            width < 1000 ? readingView === 'inspector' : inspectorVisible
          }
          aria-controls="inspector-panel"
          onClick={() => togglePanel('inspector')}
        >
          Inspector
        </button>
        <button type="button" onClick={backToCanvas}>
          Back to canvas
        </button>
      </nav>
      <div className={`app-main reading-${readingView}`}>
        <div
          className={`workspace ${hasDetails ? 'has-details' : ''} ${readingView === 'components' ? 'components-open' : ''} ${componentsVisible ? '' : 'components-hidden'} ${inspectorVisible ? '' : 'inspector-hidden'}`}
        >
          <div className="palette-host" id="components-panel">
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
