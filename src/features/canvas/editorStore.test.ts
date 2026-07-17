import { beforeEach, describe, expect, it } from 'vitest';
import { useEditorStore } from './editorStore';

describe('editor store', () => {
  beforeEach(() => {
    useEditorStore.getState().newDocument();
  });

  it('adds a component and makes the action undoable', () => {
    useEditorStore.getState().addNode('client', { x: 16, y: 32 });

    expect(useEditorStore.getState().document.nodes).toHaveLength(1);
    expect(useEditorStore.getState().selection?.kind).toBe('node');

    useEditorStore.getState().undo();
    expect(useEditorStore.getState().document.nodes).toHaveLength(0);

    useEditorStore.getState().redo();
    expect(useEditorStore.getState().document.nodes).toHaveLength(1);
  });

  it('prevents duplicate and self-referencing connections', () => {
    const state = useEditorStore.getState();
    state.addNode('client');
    state.addNode('api-gateway');
    const [client, gateway] = useEditorStore.getState().document.nodes;

    useEditorStore.getState().addEdge(client.id, gateway.id);
    useEditorStore.getState().addEdge(client.id, gateway.id);
    useEditorStore.getState().addEdge(client.id, client.id);

    expect(useEditorStore.getState().document.edges).toHaveLength(1);
  });

  it('coalesces continuous edits into one undo entry', () => {
    useEditorStore.getState().addNode('cache');
    const cache = useEditorStore.getState().document.nodes[0];
    const historyBefore = useEditorStore.getState().past.length;

    useEditorStore.getState().beginTransaction();
    useEditorStore
      .getState()
      .updateNodeTransient(cache.id, { config: { hitRatePercent: 85 } });
    useEditorStore
      .getState()
      .updateNodeTransient(cache.id, { config: { hitRatePercent: 92 } });
    useEditorStore
      .getState()
      .updateNodeTransient(cache.id, { config: { hitRatePercent: 95 } });
    useEditorStore.getState().commitTransaction();

    expect(useEditorStore.getState().past).toHaveLength(historyBefore + 1);
    expect(
      useEditorStore.getState().document.nodes[0].data.config.hitRatePercent,
    ).toBe(95);

    useEditorStore.getState().undo();
    expect(
      useEditorStore.getState().document.nodes[0].data.config.hitRatePercent,
    ).toBe(80);
    useEditorStore.getState().redo();
    expect(
      useEditorStore.getState().document.nodes[0].data.config.hitRatePercent,
    ).toBe(95);
  });

  it('persists implementation notes while keeping open-card state outside the document', () => {
    useEditorStore.getState().addNode('sharding');
    const sharding = useEditorStore.getState().document.nodes[0];

    useEditorStore.getState().beginTransaction();
    useEditorStore.getState().updateNodeTransient(sharding.id, {
      implementationNotes: 'Rebalance shards during low traffic.',
    });
    useEditorStore.getState().commitTransaction();
    useEditorStore.getState().toggleInfoNode(sharding.id);

    const state = useEditorStore.getState();
    expect(state.document.nodes[0].data.implementationNotes).toBe(
      'Rebalance shards during low traffic.',
    );
    expect(state.expandedInfoNodeId).toBe(sharding.id);
    expect(JSON.stringify(state.document)).not.toContain('expandedInfoNodeId');
  });

  it('keeps only one information card open and closes it with selection changes', () => {
    useEditorStore.getState().addNode('cache');
    useEditorStore.getState().addNode('sharding');
    const [cache, sharding] = useEditorStore.getState().document.nodes;

    useEditorStore.getState().toggleInfoNode(cache.id);
    expect(useEditorStore.getState().expandedInfoNodeId).toBe(cache.id);
    useEditorStore.getState().toggleInfoNode(sharding.id);
    expect(useEditorStore.getState().expandedInfoNodeId).toBe(sharding.id);
    useEditorStore.getState().select(null);
    expect(useEditorStore.getState().expandedInfoNodeId).toBeNull();
  });
});
