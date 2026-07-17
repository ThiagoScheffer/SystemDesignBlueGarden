import { useCallback, useEffect, useRef } from 'react';
import type { ArchitectureDocumentV1 } from '../../domain/architecture/types';
import { runPreflight } from '../../domain/simulation/preflight';
import type {
  SimulationScenario,
  SimulationSpeed,
  WorkerCommand,
  WorkerResponse,
} from '../../domain/simulation/types';
import { saveSimulationRun } from '../../storage/database';
import { useSimulationStore } from './simulationStore';

export function useSimulationController(document: ArchitectureDocumentV1) {
  const workerRef = useRef<Worker | null>(null);

  const disposeWorker = useCallback(() => {
    workerRef.current?.terminate();
    workerRef.current = null;
  }, []);

  useEffect(() => disposeWorker, [disposeWorker]);

  const start = useCallback(
    (scenario: SimulationScenario, acknowledgeWarnings = false) => {
      const preflight = runPreflight(document.nodes, document.edges, scenario);
      useSimulationStore.getState().prepare(scenario, preflight);
      if (
        preflight.errors.length ||
        (preflight.warnings.length && !acknowledgeWarnings)
      ) {
        return false;
      }
      disposeWorker();
      const runId = `run-${crypto.randomUUID()}`;
      const speed = useSimulationStore.getState().speed;
      const worker = new Worker(
        new URL('../../engine/simulation.worker.ts', import.meta.url),
        { type: 'module' },
      );
      workerRef.current = worker;
      worker.onmessage = (event: MessageEvent<WorkerResponse>) => {
        const message = event.data;
        const state = useSimulationStore.getState();
        if (state.runId && message.runId !== state.runId) return;
        if (message.type === 'TICK') state.addTick(message.runId, message.tick);
        if (message.type === 'COMPLETE') {
          state.complete(message.runId, message.summary);
          void saveSimulationRun(
            message.summary,
            useSimulationStore.getState().ticks,
          );
          disposeWorker();
        }
        if (message.type === 'ERROR') {
          state.fail(message.runId, message.message);
          disposeWorker();
        }
      };
      worker.onerror = () => {
        useSimulationStore
          .getState()
          .fail(runId, 'The simulation worker stopped unexpectedly.');
        disposeWorker();
      };
      useSimulationStore.getState().started(runId);
      const command: WorkerCommand = {
        type: 'START',
        speed,
        input: {
          runId,
          architectureId: document.id,
          architectureUpdatedAt: document.metadata.updatedAt,
          nodes: structuredClone(document.nodes),
          edges: structuredClone(document.edges),
          scenario: structuredClone(scenario),
        },
      };
      worker.postMessage(command);
      return true;
    },
    [disposeWorker, document],
  );

  const send = useCallback((command: WorkerCommand) => {
    workerRef.current?.postMessage(command);
  }, []);

  const pause = useCallback(() => {
    const state = useSimulationStore.getState();
    if (!state.runId) return;
    send({ type: 'PAUSE', runId: state.runId });
    state.pause();
  }, [send]);

  const resume = useCallback(() => {
    const state = useSimulationStore.getState();
    if (!state.runId) return;
    send({ type: 'RESUME', runId: state.runId, speed: state.speed });
    state.resume();
  }, [send]);

  const setSpeed = useCallback(
    (speed: SimulationSpeed) => {
      const state = useSimulationStore.getState();
      state.setSpeed(speed);
      if (state.runId) send({ type: 'SET_SPEED', runId: state.runId, speed });
    },
    [send],
  );

  const reset = useCallback(() => {
    const state = useSimulationStore.getState();
    if (state.runId) send({ type: 'CANCEL', runId: state.runId });
    disposeWorker();
    state.reset();
  }, [disposeWorker, send]);

  return { start, pause, resume, setSpeed, reset };
}
