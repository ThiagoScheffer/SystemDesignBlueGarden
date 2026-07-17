import { act, fireEvent, render, screen } from '@testing-library/react';
import type { NodeProps } from '@xyflow/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createArchitectureNode } from '../../domain/architecture/factories';
import {
  ArchitectureNode,
  type ArchitectureFlowNode,
} from './ArchitectureNode';
import { useEditorStore } from './editorStore';

vi.mock('@xyflow/react', () => ({
  Handle: () => <span data-testid="handle" />,
  Position: { Left: 'left', Right: 'right' },
}));

const renderNode = (node: ArchitectureFlowNode['data']['architecture']) =>
  render(
    <ArchitectureNode
      {...({
        data: { architecture: node },
        selected: true,
      } as NodeProps<ArchitectureFlowNode>)}
    />,
  );

describe('ArchitectureNode education', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useEditorStore.getState().newDocument();
  });

  afterEach(() => {
    vi.runOnlyPendingTimers();
    vi.useRealTimers();
  });

  it('shows its educational tooltip only after a one-second hover', () => {
    const cache = createArchitectureNode('cache', { x: 0, y: 0 });
    renderNode(cache);
    const node = screen.getByLabelText('Cache architecture component');

    fireEvent.mouseEnter(node);
    act(() => vi.advanceTimersByTime(999));
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();

    act(() => vi.advanceTimersByTime(1));
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      'An in-memory store, such as Redis',
    );
    expect(screen.getByRole('tooltip')).toHaveTextContent(
      'Double-click for details',
    );

    fireEvent.mouseLeave(node);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('cancels the delayed tooltip when the pointer leaves early', () => {
    const sharding = createArchitectureNode('sharding', { x: 0, y: 0 });
    renderNode(sharding);
    const node = screen.getByLabelText('Sharding architecture component');

    fireEvent.mouseEnter(node);
    act(() => vi.advanceTimersByTime(500));
    fireEvent.mouseLeave(node);
    act(() => vi.advanceTimersByTime(600));

    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('edits Cache hit rate and implementation notes in the expanded card', () => {
    useEditorStore.getState().addNode('cache');
    const cache = useEditorStore.getState().document.nodes[0];
    useEditorStore.getState().toggleInfoNode(cache.id);
    renderNode(cache);

    expect(screen.getByLabelText('Cache information')).toHaveTextContent(
      'An in-memory store, such as Redis, that serves repeated reads quickly and reduces database load. In this model it improves read traffic; it does not make writes faster.',
    );
    const slider = screen.getByRole('slider');
    expect(slider).toHaveValue('80');
    fireEvent.focus(slider);
    fireEvent.change(slider, { target: { value: '91' } });
    fireEvent.blur(slider);

    const notes = screen.getByPlaceholderText(
      'Add decisions, constraints, or implementation details…',
    );
    fireEvent.focus(notes);
    fireEvent.change(notes, {
      target: { value: 'Use a cache-aside strategy.' },
    });
    fireEvent.blur(notes);

    const saved = useEditorStore.getState().document.nodes[0];
    expect(saved.data.config.hitRatePercent).toBe(91);
    expect(saved.data.implementationNotes).toBe('Use a cache-aside strategy.');
  });
});
