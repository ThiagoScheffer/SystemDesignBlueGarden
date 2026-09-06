# Editor, UI, and State Architecture

Last synchronized with source: **6 September 2026**

## 1. Editor design

The editor is a projection of the canonical architecture document, not the canonical model itself.

`ArchitectureCanvas.tsx` converts each `ArchitectureNodeV1` into a React Flow node with an `architecture` renderer and converts each `ArchitectureEdgeV1` into a React Flow edge. React Flow IDs are the canonical IDs; renderer-specific state is not persisted into the project document.

## 2. Main layout

The current application composes:

- top bar;
- component palette;
- architecture canvas;
- inspector/details surface;
- simulation panel;
- scenario drawer;
- Learning Hub;
- Learning Drawer.

A reading-view navigation allows the UI to prioritize Components, Inspector, or Canvas for narrower layouts without changing the document.

## 3. Component palette

The palette is built from the static component registry in `src/domain/components/definitions.ts`.

A node can be created by:

- clicking a palette item, using the store default position; or
- dragging the item to the canvas, converting screen coordinates to flow coordinates.

During a learning attempt, recommended components can be highlighted by the learning UI.

## 4. Selection model

The current editor store supports exactly one selected canonical entity:

```text
{kind: "node", id}
{kind: "edge", id}
null
```

This is why full multi-selection/clipboard workflows are still backlog items.

## 5. Node interactions

Implemented node interactions include:

- selection;
- drag/move;
- outgoing/incoming connection handles;
- deletion through selection;
- inspector editing;
- educational information cards;
- simulation overlays/diagnostic navigation.

Double-click toggles the educational node information card. Pressing `I` on a selected node provides the same action when focus is not inside an interactive form control.

Deleting a node also deletes every incident edge connected to that node.

## 6. Edge interactions

Edges are directional and support:

- select;
- create;
- reconnect source/target;
- delete one or a group selected through a port menu;
- reverse direction;
- duplicate as a parallel edge;
- label;
- toggle monitored state;
- toggle disabled state.

Self-connections are rejected by editor actions. A normal `addEdge` also rejects an already existing same-source/same-target connection, while `duplicateEdge` intentionally creates a parallel edge with a new ID.

Parallel connections are rendered with deterministic increasing curvature so they remain visually distinguishable.

Disabled connections are visually faded/dashed and excluded from the active simulation graph.

## 7. Information vs diagnostics

The UI intentionally avoids stacking multiple detailed overlays for the same context:

- selecting/opening component information closes an active simulation diagnostic;
- selecting other entities closes node information as appropriate;
- inspector/detail reading surfaces remain screen-space UI rather than being scaled with canvas zoom.

## 8. Transactional history

Architecture history is snapshot-based.

### 8.1 Immediate mutations

Discrete operations call `withHistory`, which:

- stores a clone of the previous canonical document;
- updates `metadata.updatedAt`;
- clears redo history.

### 8.2 Continuous mutations

Continuous form/drag editing can establish `transactionBase`, apply transient document changes, then commit once. A committed transaction becomes one history step only if document content changed.

The comparison intentionally ignores the `updatedAt` timestamp so timestamp-only changes do not create false history changes.

### 8.3 History capacity

Past and future snapshot lists are capped at approximately 50 documents.

### 8.4 Keyboard behavior

| Action | Shortcut |
| --- | --- |
| Undo | `Ctrl/Cmd + Z` |
| Redo | `Ctrl + Y`, `Ctrl/Cmd + Shift + Z` |
| Toggle selected component information | `I` |
| Delete selection | `Delete` / `Backspace` |
| Close expanded information | `Escape` |

Form controls are excluded from most global single-key operations so normal text editing is preserved.

## 9. Project actions

The top bar currently exposes:

- New architecture;
- Learning Studio;
- Undo/redo;
- Import JSON;
- Export JSON;
- Project Settings;
- Simulation controls.

Project name is editable inline when simulation is not locked.

## 10. Project settings UI contract

Project Settings edits:

- metadata name/description;
- expected scale;
- expected users;
- expected complexity;
- custom scale fields;
- simulation defaults;
- visibility metadata.

Saving Project Settings is an undoable architecture change.

Architecture assessment is advisory only and can report, depending on configured requirements/topology:

- peak application capacity shortfall;
- missing application redundancy;
- missing load balancer;
- missing cache on large read-oriented designs;
- single persistent data component;
- missing monitoring;
- insufficient region resilience;
- active unencrypted connection in high-complexity designs;
- absence of a saved failure scenario.

## 11. Scenario UI

The Scenario Drawer supports baseline and incident presets plus editable saved scenarios. Presets currently include:

- Baseline;
- Traffic spike;
- Server failure;
- Database overload;
- Cache failure;
- Queue backlog;
- Network latency increase.

A scenario must pass runtime schema validation and preflight before execution. Warnings require explicit acknowledgement before a run proceeds.

## 12. Simulation panel

The simulation result surface consumes ticks and summary from the simulation store. It presents global/node/edge metrics, event history, findings, and diagnostic navigation.

The canvas can display live/current tick information such as traffic animation, node utilization/latency, failure state, and affected-path state.

The MiniMap defaults to hidden once a simulation is beyond idle/preflight, but the user can explicitly reopen it.

## 13. Simulation locking

`isSimulationLocked` returns true only for:

- `running`;
- `paused`.

The UI uses this to disable editing actions while a run is active. Completed/error/preflight states do not keep the architecture locked.

## 14. Accessibility architecture currently present

The current UI contains semantic labels and keyboard behaviors, including:

- `aria-label` for the architecture canvas and edges;
- toolbar/navigation labels;
- focus management utility for modal/drawer surfaces;
- keyboard shortcuts with form-control guards;
- reduced-motion-safe visual handling in styles/tests;
- reading surfaces that do not scale with canvas zoom.

This is not a claim of full WCAG conformance; accessibility remains an ongoing quality dimension.

## 15. Current editor limitations

- no general multi-select model;
- no clipboard copy/cut/paste workflow;
- no general node duplicate command;
- Region schema support exists but containment editing UX is incomplete;
- local persistence opens the most recently modified project, but there is no full project browser/manager;
- desktop/wide-layout editing is the primary target.

## 16. Primary source files

- App layout: `src/app/App.tsx`
- Canvas adapter/interactions: `src/features/canvas/ArchitectureCanvas.tsx`
- Editor state/history: `src/features/canvas/editorStore.ts`
- Node renderer: `src/features/canvas/ArchitectureNode.tsx`
- Inspector: `src/features/inspector/`
- Top bar/settings: `src/features/projects/`
- Scenario drawer: `src/features/scenarios/ScenarioDrawer.tsx`
- Presentation state: `src/app/presentationStore.ts`
- Keyboard history/actions: `src/features/history/useEditorShortcuts.ts`
