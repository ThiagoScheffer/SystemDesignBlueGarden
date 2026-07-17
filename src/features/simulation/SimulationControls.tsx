import {
  FlaskConical,
  Pause,
  Play,
  RotateCcw,
  SlidersHorizontal,
} from 'lucide-react';
import type { ArchitectureDocumentV1 } from '../../domain/architecture/types';
import type {
  SimulationScenario,
  SimulationSpeed,
} from '../../domain/simulation/types';
import { createScenarioPreset } from '../scenarios/presets';
import { useSimulationStore } from './simulationStore';

interface SimulationControlsProps {
  document: ArchitectureDocumentV1;
  start: (
    scenario: SimulationScenario,
    acknowledgeWarnings?: boolean,
  ) => boolean;
  pause: () => void;
  resume: () => void;
  reset: () => void;
  setSpeed: (speed: SimulationSpeed) => void;
}

export function SimulationControls({
  document,
  start,
  pause,
  resume,
  reset,
  setSpeed,
}: SimulationControlsProps) {
  const status = useSimulationStore((state) => state.status);
  const speed = useSimulationStore((state) => state.speed);
  const setDrawerOpen = useSimulationStore((state) => state.setDrawerOpen);
  const active = status === 'running' || status === 'paused';

  const run = () => {
    const scenario =
      document.scenarios[0] ??
      createScenarioPreset('baseline', document.nodes, document.edges);
    if (!start(scenario)) setDrawerOpen(true);
  };

  return (
    <div className="simulation-controls">
      <button
        type="button"
        onClick={() => setDrawerOpen(true)}
        title="Configure scenario"
        disabled={active}
      >
        <SlidersHorizontal size={16} />
        <span>Scenario</span>
      </button>
      {!active && (
        <button
          className="run-toolbar-button"
          type="button"
          onClick={run}
          title="Run simulation"
        >
          <FlaskConical size={16} />
          <span>Run</span>
        </button>
      )}
      {status === 'running' && (
        <button type="button" onClick={pause} title="Pause simulation">
          <Pause size={16} />
        </button>
      )}
      {status === 'paused' && (
        <button type="button" onClick={resume} title="Resume simulation">
          <Play size={16} />
        </button>
      )}
      {active && (
        <button type="button" onClick={reset} title="Reset simulation">
          <RotateCcw size={16} />
        </button>
      )}
      {(active || status === 'completed') && (
        <select
          aria-label="Simulation speed"
          value={String(speed)}
          onChange={(event) =>
            setSpeed(
              event.target.value === 'MAX'
                ? 'MAX'
                : (Number(event.target.value) as SimulationSpeed),
            )
          }
        >
          <option value="1">1×</option>
          <option value="4">4×</option>
          <option value="16">16×</option>
          <option value="MAX">MAX</option>
        </select>
      )}
    </div>
  );
}
