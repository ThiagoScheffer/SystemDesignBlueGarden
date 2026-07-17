import { fireEvent, render } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useEditorStore } from '../canvas/editorStore';
import { useEditorShortcuts } from './useEditorShortcuts';

function ShortcutHarness() {
  useEditorShortcuts();
  return null;
}

describe('node information shortcuts', () => {
  beforeEach(() => {
    useEditorStore.getState().newDocument();
    useEditorStore.getState().addNode('cache');
  });

  it('toggles selected-node information with I and closes it with Escape', () => {
    render(<ShortcutHarness />);
    const node = useEditorStore.getState().document.nodes[0];

    fireEvent.keyDown(window, { key: 'i' });
    expect(useEditorStore.getState().expandedInfoNodeId).toBe(node.id);

    fireEvent.keyDown(window, { key: 'Escape' });
    expect(useEditorStore.getState().expandedInfoNodeId).toBeNull();
  });

  it('closes an open information card when its node is deleted', () => {
    render(<ShortcutHarness />);
    fireEvent.keyDown(window, { key: 'i' });
    fireEvent.keyDown(window, { key: 'Delete' });

    expect(useEditorStore.getState().expandedInfoNodeId).toBeNull();
    expect(useEditorStore.getState().document.nodes).toHaveLength(0);
  });

  it('commits a continuous edit before applying undo', () => {
    render(<ShortcutHarness />);
    const node = useEditorStore.getState().document.nodes[0];
    useEditorStore.getState().beginTransaction();
    useEditorStore.getState().updateNodeTransient(node.id, {
      implementationNotes: 'Temporary decision',
    });
    expect(useEditorStore.getState().transactionBase?.nodes).toHaveLength(1);

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true });

    expect(
      useEditorStore.getState().document.nodes[0].data.implementationNotes,
    ).toBeUndefined();
  });
});
