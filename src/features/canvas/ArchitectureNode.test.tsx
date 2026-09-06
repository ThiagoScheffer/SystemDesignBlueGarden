import { act, fireEvent, render, screen } from '@testing-library/react';
import type { NodeProps } from '@xyflow/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createArchitectureNode } from '../../domain/architecture/factories';
import type { NodeMetric, SimulationTick } from '../../domain/simulation/types';
import {
  ArchitectureNode,
  type ArchitectureFlowNode,
} from './ArchitectureNode';
import { useEditorStore } from './editorStore';
import { InspectorHost } from '../inspector/InspectorHost';
import { useSimulationStore } from '../simulation/simulationStore';

vi.mock('@xyflow/react', () => ({
  Handle: () => <span data-testid="handle" />,
  Position: { Left: 'left', Right: 'right' },
}));

const renderNode = (node: ArchitectureFlowNode['data']['architecture']) => {
  const document = useEditorStore.getState().document;
  if (!document.nodes.some((entry) => entry.id === node.id))
    useEditorStore.setState({
      document: { ...document, nodes: [...document.nodes, node] },
    });
  return render(
    <>
      <ArchitectureNode
        {...({
          data: { architecture: node },
          selected: true,
        } as NodeProps<ArchitectureFlowNode>)}
      />
      <InspectorHost />
    </>,
  );
};

const showMetric = (nodeId: string, overrides: Partial<NodeMetric> = {}) => {
  const nodeMetric: NodeMetric = {
    incomingRps: 3_200,
    offeredRps: 3_200,
    processedRps: 1_000,
    utilization: 1,
    loadRatio: 3.2,
    backlog: 1,
    overflow: 2_199,
    rejectedRps: 2_199,
    processingFailureRps: 120,
    averageLatencyMs: 420,
    p95LatencyMs: 840,
    failedRps: 2_319,
    effectiveCapacity: 1_000,
    status: 'critical',
    diagnostics: [
      {
        id: `${nodeId}-rejected`,
        code: 'capacity-rejection',
        topic: 'capacity',
        category: 'error',
        severity: 'critical',
        title: 'Connections dropped',
        explanation: '69% rejected at capacity',
        affectedRps: 2_199,
        affectedPercent: 69,
      },
      {
        id: `${nodeId}-processing-failure`,
        code: 'processing-failure',
        topic: 'failure',
        category: 'error',
        severity: 'critical',
        title: 'Server errors',
        explanation: '12% of requests failing',
        affectedRps: 120,
        affectedPercent: 12,
      },
      {
        id: `${nodeId}-bottleneck`,
        code: 'capacity-saturation',
        topic: 'capacity',
        category: 'bottleneck',
        severity: 'critical',
        title: 'Capacity saturation',
        explanation: '320% of configured capacity is demanded.',
        affectedRps: 3_200,
        affectedPercent: 320,
      },
    ],
    ...overrides,
  };
  const simulationTick: SimulationTick = {
    second: 1,
    global: {
      generatedRps: 3_200,
      successfulRps: 881,
      failedRps: 2_319,
      errorRate: 0.7247,
      averageLatencyMs: 420,
      p95LatencyMs: 840,
      queueDepth: 1,
      estimatedMonthlyCost: 10,
    },
    nodes: { [nodeId]: nodeMetric },
    edges: {},
    events: [],
  };
  useSimulationStore.getState().started('node-test');
  useSimulationStore.getState().addTick('node-test', simulationTick);
};

describe('ArchitectureNode education', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useEditorStore.getState().newDocument();
    useSimulationStore.getState().reset();
    useSimulationStore.getState().setLearningTipsEnabled(true);
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

  it('shows uncapped load, P95 latency, separate signals, and learning guidance', () => {
    const loadBalancer = createArchitectureNode('load-balancer', {
      x: 0,
      y: 0,
    });
    showMetric(loadBalancer.id);
    renderNode(loadBalancer);

    expect(screen.getByText('320%')).toBeInTheDocument();
    expect(screen.getByText('· P95 840 ms')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Show Load balancer failing requests'),
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Show Load balancer bottleneck details'),
    ).toBeInTheDocument();

    fireEvent.click(
      screen.getByLabelText('Show Load balancer failing requests'),
    );
    const details = screen.getByLabelText('Load balancer error details');
    expect(details).toHaveTextContent('Failing requests');
    expect(details).toHaveTextContent(
      'Connections droppedcritical69% rejected at capacity',
    );
    expect(details).toHaveTextContent(
      'Server errorscritical12% of requests failing',
    );
    expect(details).toHaveTextContent(
      'Likely causeCapacity saturation: 320% of configured capacity is demanded.',
    );
    expect(details).toHaveTextContent('Suggested corrections');
    const studyLink = screen.getByRole('link', {
      name: /Azure performance antipatterns/,
    });
    expect(studyLink).toHaveAttribute('target', '_blank');
    expect(studyLink).toHaveAttribute('rel', 'noreferrer noopener');
    expect(
      screen.queryByRole('link', { name: /Twitter feed scaling case study/ }),
    ).not.toBeInTheDocument();

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(
      screen.queryByLabelText('Load balancer error details'),
    ).not.toBeInTheDocument();
  });

  it('hides educational corrections when learning tips are disabled', () => {
    const service = createArchitectureNode('application-server', {
      x: 0,
      y: 0,
    });
    showMetric(service.id);
    useSimulationStore.getState().setLearningTipsEnabled(false);
    renderNode(service);

    fireEvent.click(
      screen.getByLabelText('Show Application server failing requests'),
    );
    expect(
      screen.getByRole('heading', { name: 'Failing requests' }),
    ).toBeInTheDocument();
    expect(screen.queryByText('Suggested corrections')).not.toBeInTheDocument();
  });

  it('keeps an open diagnostic readable when the live finding clears, until reset', () => {
    const service = createArchitectureNode('application-server', {
      x: 0,
      y: 0,
    });
    showMetric(service.id);
    renderNode(service);
    fireEvent.click(
      screen.getByLabelText('Show Application server failing requests'),
    );
    act(() => {
      const tick = useSimulationStore.getState().ticks.at(-1)!;
      useSimulationStore.getState().addTick('node-test', {
        ...tick,
        second: 2,
        nodes: { [service.id]: { ...tick.nodes[service.id], diagnostics: [] } },
      });
    });
    expect(screen.getByRole('status')).toHaveTextContent(
      'No current findings for this category.',
    );
    expect(
      screen.getByRole('heading', { name: 'Failing requests' }),
    ).toBeInTheDocument();
    act(() => useSimulationStore.getState().reset());
    expect(
      screen.queryByRole('heading', { name: 'Failing requests' }),
    ).not.toBeInTheDocument();
  });

  it('restores the inspector mode after a temporary component guide', () => {
    useEditorStore.getState().addNode('cache');
    const cache = useEditorStore.getState().document.nodes[0];
    renderNode(cache);
    fireEvent.click(screen.getByRole('button', { name: 'Advanced' }));
    fireEvent.click(screen.getByRole('button', { name: 'Component guide' }));
    expect(screen.getByLabelText('Cache information')).toBeInTheDocument();
    fireEvent.click(
      screen.getByRole('button', { name: 'Close component information' }),
    );
    expect(screen.getByRole('button', { name: 'Advanced' })).toHaveClass(
      'is-active',
    );
  });
});
