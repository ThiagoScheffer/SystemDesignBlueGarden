import { useEffect } from 'react';
import { useEditorStore } from '../canvas/editorStore';

const isFormControl = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName);

export function useEditorShortcuts() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const state = useEditorStore.getState();
      const modifier = event.ctrlKey || event.metaKey;

      if (event.key === 'Escape' && state.expandedInfoNodeId) {
        event.preventDefault();
        state.commitTransaction();
        state.closeInfoNode();
        return;
      }

      if (modifier && event.key.toLowerCase() === 'z') {
        event.preventDefault();
        if (event.shiftKey) {
          state.commitTransaction();
          state.redo();
        } else {
          state.undo();
        }
        return;
      }
      if (modifier && event.key.toLowerCase() === 'y') {
        event.preventDefault();
        state.commitTransaction();
        state.redo();
        return;
      }
      if (
        !isFormControl(event.target) &&
        event.key.toLowerCase() === 'i' &&
        state.selection?.kind === 'node'
      ) {
        event.preventDefault();
        state.toggleInfoNode(state.selection.id);
        return;
      }
      if (
        !isFormControl(event.target) &&
        (event.key === 'Delete' || event.key === 'Backspace')
      ) {
        event.preventDefault();
        state.deleteSelection();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
