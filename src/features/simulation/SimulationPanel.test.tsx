import { act, fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { SimulationPanel } from './SimulationPanel';
import { useSimulationStore } from './simulationStore';
import { useEditorStore } from '../canvas/editorStore';

describe('simulation results reading states', () => {
  beforeEach(() => {
    useEditorStore.getState().newDocument();
    useSimulationStore.getState().reset();
  });

  it('shows a worker error even when no metrics arrived, and does not reset on collapse', () => {
    const reset = vi.fn();
    useSimulationStore.getState().started('failed-run');
    useSimulationStore
      .getState()
      .fail('failed-run', 'Worker stopped before producing metrics.');
    render(<SimulationPanel onReset={reset} />);
    expect(screen.getByRole('alert')).toHaveTextContent(
      'Worker stopped before producing metrics.',
    );
    fireEvent.click(screen.getByRole('tab', { name: /Explainable findings/ }));
    expect(screen.getByRole('tabpanel')).toHaveTextContent(
      'This run ended before final findings were available.',
    );
    fireEvent.click(screen.getByRole('button', { name: 'Collapse' }));
    expect(reset).not.toHaveBeenCalled();
    expect(screen.getByRole('alert')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: 'Reset simulation' }));
    expect(reset).toHaveBeenCalledOnce();
  });

  it('resets the reading tab for a new run and supports empty selected metrics', () => {
    useSimulationStore.getState().started('first-run');
    render(<SimulationPanel onReset={vi.fn()} />);
    fireEvent.click(screen.getByRole('tab', { name: 'Selected metrics' }));
    expect(screen.getByRole('tabpanel')).toHaveTextContent(
      'Choose a component or connection',
    );
    act(() => useSimulationStore.getState().started('second-run'));
    expect(screen.getByRole('tab', { name: 'Overview' })).toHaveAttribute(
      'aria-selected',
      'true',
    );
    expect(screen.getByRole('tabpanel')).toHaveTextContent(
      'Waiting for simulation metrics',
    );
  });
});
