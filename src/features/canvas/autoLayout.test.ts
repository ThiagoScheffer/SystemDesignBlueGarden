import { describe, expect, it } from 'vitest';
import { autoLayout } from './autoLayout';
import { useEditorStore } from './editorStore';

describe('automatic layout', () => {
  it('spaces measured nodes and keeps branches deterministic', () => {
    const nodes = [
      { id: 'a', width: 300, height: 120 },
      { id: 'b' },
      { id: 'c' },
    ];
    const edges = [
      { source: 'a', target: 'b' },
      { source: 'a', target: 'c' },
    ];
    const positions = autoLayout(nodes, edges);
    expect(positions.b.x - positions.a.x).toBe(400);
    expect(positions.c.y - positions.b.y).toBe(160);
    expect(autoLayout([...nodes].reverse(), [...edges, edges[0]])).toEqual(
      positions,
    );
  });
  it('handles cycles and separates disconnected groups', () => {
    const positions = autoLayout(
      [{ id: 'a' }, { id: 'b' }, { id: 'c' }],
      [
        { source: 'a', target: 'b' },
        { source: 'b', target: 'a' },
      ],
    );
    expect(positions.a.x).toBe(positions.b.x);
    expect(positions.c.y).toBeGreaterThan(positions.b.y + 100);
    expect(autoLayout([], [])).toEqual({});
  });
  it('applies a batch with one undo entry and ignores unchanged positions', () => {
    const store = useEditorStore;
    store.getState().newDocument();
    store.getState().addNode('client');
    store.getState().addNode('cache');
    const before = structuredClone(store.getState().document);
    const positions = autoLayout(before.nodes, before.edges);
    const count = store.getState().past.length;
    store.getState().applyPositions(positions);
    store.getState().applyPositions(positions);
    expect(store.getState().past).toHaveLength(count + 1);
    store.getState().undo();
    expect(store.getState().document.nodes).toEqual(before.nodes);
    store.getState().redo();
    expect(store.getState().document.nodes[0].position).toEqual(
      positions[before.nodes[0].id],
    );
  });
});
