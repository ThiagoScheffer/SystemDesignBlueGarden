/// <reference lib="webworker" />

import type {
  SimulationSpeed,
  WorkerCommand,
  WorkerResponse,
} from '../domain/simulation/types';
import { runSimulation } from './simulationEngine';

let activeRunId: string | null = null;
let paused = false;
let cancelled = false;
let speed: SimulationSpeed = 4;
let timer: ReturnType<typeof setTimeout> | null = null;

const send = (message: WorkerResponse) => self.postMessage(message);
const delayFor = () => (speed === 'MAX' ? 0 : 1000 / speed);

function clearTimer() {
  if (timer) clearTimeout(timer);
  timer = null;
}

function start(command: Extract<WorkerCommand, { type: 'START' }>) {
  clearTimer();
  activeRunId = command.input.runId;
  paused = false;
  cancelled = false;
  speed = command.speed;
  try {
    const result = runSimulation(command.input);
    send({ type: 'READY', runId: command.input.runId });
    let index = 0;
    const emit = () => {
      if (cancelled || activeRunId !== command.input.runId) return;
      if (paused) {
        timer = setTimeout(emit, 50);
        return;
      }
      const batchSize = speed === 'MAX' ? 25 : 1;
      for (
        let count = 0;
        count < batchSize && index < result.ticks.length;
        count += 1
      ) {
        send({
          type: 'TICK',
          runId: command.input.runId,
          tick: result.ticks[index],
        });
        index += 1;
      }
      if (index >= result.ticks.length) {
        send({
          type: 'COMPLETE',
          runId: command.input.runId,
          summary: result.summary,
        });
        activeRunId = null;
        return;
      }
      timer = setTimeout(emit, delayFor());
    };
    emit();
  } catch (error) {
    send({
      type: 'ERROR',
      runId: command.input.runId,
      code: 'SIMULATION_FAILED',
      message: error instanceof Error ? error.message : 'Simulation failed.',
    });
    activeRunId = null;
  }
}

self.onmessage = (event: MessageEvent<WorkerCommand>) => {
  const command = event.data;
  if (command.type === 'START') {
    start(command);
    return;
  }
  if (command.runId !== activeRunId) return;
  if (command.type === 'PAUSE') paused = true;
  if (command.type === 'RESUME') {
    paused = false;
    speed = command.speed;
  }
  if (command.type === 'SET_SPEED') speed = command.speed;
  if (command.type === 'CANCEL') {
    cancelled = true;
    clearTimer();
    send({ type: 'CANCELLED', runId: command.runId });
    activeRunId = null;
  }
};

export {};
