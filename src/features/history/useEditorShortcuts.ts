import { useEffect } from 'react';
import { useEditorStore } from '../canvas/editorStore';
import {
  isSimulationLocked,
  useSimulationStore,
} from '../simulation/simulationStore';

const isFormControl = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  !!target.closest(
    'input, textarea, select, button, a, [contenteditable="true"], [role="tabpanel"]',
  );

export function useEditorShortcuts() {
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const state = useEditorStore.getState();
      const locked = isSimulationLocked(useSimulationStore.getState().status);
      const modifier = event.ctrlKey || event.metaKey;

      if (event.key === 'Escape' && state.expandedInfoNodeId) {
        event.preventDefault();
        state.commitTransaction();
        state.closeInfoNode();
        return;
      }

      if (modifier && event.key.toLowerCase() === 'z') {
        if (locked) return;
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
        if (locked) return;
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
        useSimulationStore.getState().closeDiagnostic();
        state.toggleInfoNode(state.selection.id);
        return;
      }
      if (
        !isFormControl(event.target) &&
        (event.key === 'Delete' || event.key === 'Backspace')
      ) {
        if (locked) return;
        event.preventDefault();
        state.deleteSelection();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
}
