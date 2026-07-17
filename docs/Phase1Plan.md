# Phase 1 Plan — Editor Foundation

## 1. Product understanding

Blue Garden is an interactive system-design laboratory. Its core user loop is:

> Build an architecture → configure it → simulate load or failure → diagnose the result → improve the design → compare outcomes.

Phase 1 delivers the first part of that loop: a low-friction architecture editor backed by a stable, structured data model. It must feel useful as an editor now while preserving the operational data that later phases need for simulation and deterministic evaluation.

The product is not intended to win by offering the most drawing features. Its long-term advantages are executable connections, explainable simulation, guided challenges, and evidence-based feedback. Phase 1 should therefore favor domain correctness, usability, and extensibility over visual complexity.

## 2. Phase 1 outcome

At the end of Phase 1, a user can:

1. Create an architecture on an infinite canvas.
2. Add, move, duplicate, connect, configure, and delete components.
3. Add typed notes to explain requirements, assumptions, decisions, risks, and trade-offs.
4. Undo and redo editing actions.
5. Save work locally and reopen it later.
6. export and import a versioned architecture JSON document.
7. Build a representative system, such as a three-tier web application, without significant friction.

Phase 1 is successful when the saved graph is both pleasant to edit and valid input for the future simulation engine.

## 3. Scope

### Included

- Infinite canvas with pan, zoom, selection, and fit-to-view.
- Drag-and-drop component library.
- Sixteen MVP component types.
- Educational hover and expanded information for every component type.
- Node configuration in Basic and Advanced modes.
- Directed, configurable edges.
- Typed architecture notes.
- Multi-select, copy/paste, duplicate, and delete.
- Undo and redo.
- Local autosave and named local projects.
- Versioned JSON import and export.
- Validation with understandable error messages.
- One starter architecture demonstrating the editor.
- Keyboard shortcuts and basic accessibility.
- Unit, component, and end-to-end tests for critical flows.

### Explicitly excluded

- Traffic or failure simulation.
- Metrics, simulation timeline, and cost calculations.
- User accounts or cloud persistence.
- Real-time collaboration and Yjs.
- AI review or deterministic architecture scoring.
- Challenges and interview mode.
- Version comparison or branching.
- Cloud-provider imports.
- Custom canvas rendering or automatic layout.
- Mobile editing; mobile may be read-only or receive an unsupported-width message.

These exclusions prevent Phase 1 from becoming a premature version of every later phase.

## 4. MVP component library

| Category        | Components                                                    |
| --------------- | ------------------------------------------------------------- |
| Client and edge | Client, DNS, CDN, Load balancer, API gateway                  |
| Compute         | Application server, Worker                                    |
| Data            | Cache, Sharding, SQL database, NoSQL database, Object storage |
| Messaging       | Message queue                                                 |
| Operations      | Monitoring service                                            |
| Structure       | Region, Note                                                  |

Every component shares a small common contract:

- Stable ID and component type.
- Display name and optional description.
- Canvas position and dimensions where applicable.
- Basic operational configuration: capacity, base latency, failure rate, concurrency limit, queue limit, and hourly cost.
- Type-specific configuration stored in a typed `config` object.
- Optional parent container ID for a region.

Presets should provide useful defaults. Users should not need to understand every operational field just to draw an architecture.

## 5. Recommended tools

### Application foundation

- **React + TypeScript + Vite** for a fast, strongly typed single-page application.
- **React Flow (`@xyflow/react`)** for the node canvas, handles, edges, selection, viewport, and minimap primitives.
- **Zustand** for editor state and command/history coordination.
- **Zod** for runtime validation and migration of imported or locally stored JSON.
- **Dexie** over IndexedDB for local projects and autosaved drafts.
- **Tailwind CSS** plus a small token-based component layer for consistent styling without adopting a large UI framework prematurely.
- **Lucide React** for interface icons.

### Quality and development

- **Vitest** and **React Testing Library** for unit and component behavior.
- **Playwright** for browser-level critical flows.
- **ESLint** and **Prettier** for static checks and formatting.
- **Storybook** is optional; add it only if component development becomes difficult without isolated states.

### Deferred tools

- Web Workers are introduced in Phase 2 with the simulation engine.
- PostgreSQL, Redis, object storage, a backend framework, authentication, and WebSockets are unnecessary in Phase 1.
- Yjs is deferred until collaboration work begins.
- An LLM SDK is deferred until the rules engine and evaluation contracts exist.

## 6. Frontend architecture

Use a feature-oriented structure so editor behavior does not accumulate in one canvas component:

```text
src/
  app/                 application shell, routes, providers
  features/
    canvas/            React Flow adapter and canvas interactions
    component-library/ palette, categories, drag source
    inspector/         node and edge configuration forms
    notes/             typed note editing
    projects/          create, rename, open, autosave
    import-export/     file validation, migration, serialization
    history/           undo/redo commands and shortcuts
  domain/
    architecture/      schema, types, factories, invariants
    components/        component definitions and default configs
  storage/             IndexedDB repository and recovery draft
  shared/              reusable UI, hooks, utilities, design tokens
```

Key boundaries:

- The domain model must not import React or React Flow.
- React Flow node and edge objects are view adapters, not the persisted format.
- Storage receives and returns complete versioned architecture documents.
- Mutations pass through named store actions so history and autosave remain predictable.
- Component definitions drive palette entries, default configuration, inspector fields, and validation wherever practical.

This keeps the saved format independent from the canvas library and makes a later renderer migration possible.

## 7. Phase 1 data contract

Define the canonical document before building editor features:

```ts
interface ArchitectureDocumentV1 {
  schemaVersion: '1.2';
  id: string;
  metadata: {
    name: string;
    description?: string;
    createdAt: string;
    updatedAt: string;
  };
  viewport?: { x: number; y: number; zoom: number };
  nodes: ArchitectureNodeV1[];
  edges: ArchitectureEdgeV1[];
}

interface ArchitectureNodeV1 {
  id: string;
  type: ComponentType;
  position: { x: number; y: number };
  parentId?: string;
  data: {
    label: string;
    description?: string;
    implementationNotes?: string;
    config: Record<string, unknown>;
  };
}

interface ArchitectureEdgeV1 {
  id: string;
  source: string;
  target: string;
  label?: string;
  config: {
    protocol: 'HTTP' | 'gRPC' | 'TCP' | 'Async';
    mode: 'synchronous' | 'asynchronous';
    trafficType: 'read' | 'write' | 'mixed';
    encrypted: boolean;
    latencyMs: number;
    bandwidthMbps: number;
    timeoutMs: number;
    retryCount: number;
    trafficPercentage: number;
  };
}
```

Typed notes can initially be node types whose configuration contains `noteType` and Markdown/plain text. This keeps selection, movement, persistence, import, and export consistent with the rest of the graph.

Required invariants:

- Node and edge IDs are unique.
- Every edge references existing nodes.
- Values that cannot be negative are rejected or normalized.
- Traffic percentage is between 0 and 100.
- A node cannot be its own parent.
- Container relationships cannot form cycles.
- Unknown schema versions fail safely with an actionable message.
- Import never partially replaces the active project; validate first, then commit.

## 8. UX layout

### Top bar

- Project name.
- New, open, save status, import, and export.
- Undo and redo.
- Zoom controls and fit-to-view.

### Left panel

- Searchable component palette.
- Components grouped by category.
- Drag source plus click-to-add fallback.

### Canvas

- Dotted grid, pan/zoom, snap-to-grid, selection rectangle, and minimap.
- Clear source/target handles and directed edges.
- Empty-state instructions on a new project.

### Right inspector

- Nothing selected: architecture metadata and help.
- Node selected: identity and component-specific configuration.
- Edge selected: path properties and delete action.
- Multi-select: shared actions only.
- Basic/Advanced switch; Expert mode is deferred until its settings are meaningful.
- Hover for one second: educational summary and example.
- Double-click or press `I`: one expanded component information card.

Use a resizable or collapsible layout so the canvas remains the visual focus.

## 9. Work breakdown

### Milestone 0 — product and engineering contracts

- Confirm the Phase 1 scope and exclusions.
- Record architecture decisions for canvas library, persistence, state, and schema validation.
- Define `ArchitectureDocumentV1`, component definitions, defaults, and validation schemas.
- Create low-fidelity workspace and inspector wireframes.
- Define the acceptance architecture used for the final usability test.

Exit criteria: data contract and UX skeleton are agreed before canvas implementation begins.

### Milestone 1 — application shell and canvas spike

- Scaffold React, TypeScript, Vite, linting, formatting, and tests.
- Implement the workspace shell and responsive minimum-width behavior.
- Prove React Flow supports custom nodes, directed edges, nested Region nodes, drag-and-drop, selection, viewport restore, and minimap.
- Establish design tokens and base UI controls.

Exit criteria: the technical spike demonstrates every high-risk canvas interaction without persistence.

### Milestone 2 — domain model and core editing

- Build component registry and node factories for all 16 types.
- Add palette search and drag/click-to-add.
- Implement selection, movement, connection, deletion, duplication, copy/paste, and multi-select.
- Implement typed notes and Region containment.
- Keep all mutations behind explicit editor actions.

Exit criteria: a user can construct and revise the acceptance architecture in memory.

### Milestone 3 — configuration and validation

- Build inspector rendering from component definitions where practical.
- Add Basic and Advanced configuration modes.
- Implement edge configuration and labels.
- Validate on field commit and show specific inline messages.
- Prevent or safely handle invalid graph relationships.

Exit criteria: exported nodes and edges contain complete, valid, simulation-ready properties.

### Milestone 4 — history and keyboard workflow

- Implement bounded undo/redo history for meaningful graph mutations.
- Coalesce continuous drag and text-entry updates into single history operations.
- Add shortcuts for undo/redo, copy/paste, duplicate, delete, select all, and fit view.
- Ignore destructive shortcuts while a form field is active.

Exit criteria: common editing mistakes are recoverable and history behaves predictably.

### Milestone 5 — local projects and open format

- Implement IndexedDB project repository.
- Add debounced autosave, visible save status, and recovery behavior.
- Add new/open/rename/delete local project flows with confirmation where needed.
- Implement deterministic JSON serialization, download, import validation, and error reporting.
- Migrate schema `1.0` and `1.1` documents to the current `1.2` format during import and local loading.

Exit criteria: work survives a reload and completes a local save → export → import round trip without data loss.

### Milestone 6 — hardening and release candidate

- Add the starter three-tier architecture.
- Complete accessibility passes for keyboard navigation, labels, focus, and contrast.
- Test large-enough graphs (target: 100 nodes and 150 edges) for acceptable interaction performance.
- Add empty, loading, invalid-import, and storage-failure states.
- Run the acceptance test with representative users and resolve critical friction.
- Document the file format and editor shortcuts.

Exit criteria: all Phase 1 acceptance criteria pass and no critical defects remain.

## 10. Suggested delivery sequence

For a small team, target six two-week iterations. If one developer is working part-time, treat these as sequencing units rather than calendar promises.

| Iteration | Primary outcome                                                    |
| --------- | ------------------------------------------------------------------ |
| 1         | Contracts, wireframes, scaffold, and canvas risk spike             |
| 2         | Component palette, custom nodes, edges, and core editing           |
| 3         | Inspector, typed configuration, notes, and validation              |
| 4         | Multi-select, clipboard workflow, shortcuts, undo/redo             |
| 5         | IndexedDB projects, autosave, import/export, migration boundary    |
| 6         | Starter design, testing, accessibility, performance, documentation |

Do not estimate individual tickets until Milestone 0 resolves the schema and interaction decisions. Those choices materially affect most later work.

## 11. Testing strategy

### Unit tests

- Node and edge factories.
- Zod schemas and all graph invariants.
- Serialization and migration functions.
- History coalescing and undo/redo behavior.
- Store actions and selectors.

### Component tests

- Palette filtering and adding a component.
- Inspector forms and validation messages.
- Basic/Advanced mode behavior.
- Project picker and import error states.

### End-to-end tests

1. Create a project, add nodes, connect them, configure an edge, reload, and verify recovery.
2. Undo and redo add, move, connect, configure, and delete operations.
3. Export a project, import it under a new name, and compare the canonical documents.
4. Reject malformed JSON, dangling edges, unsupported schema versions, and invalid values without damaging the open project.
5. Build the acceptance architecture using pointer and keyboard workflows.

### Manual checks

- Canvas interaction at 100 nodes and 150 edges.
- Browser storage disabled or full.
- Long project, component, and edge names.
- High zoom, low zoom, and narrow desktop viewport.
- Keyboard focus and screen-reader labels for non-canvas controls.

## 12. Acceptance architecture

Use one realistic design to validate the complete Phase 1 workflow:

```text
Client → DNS → CDN → Load balancer → API gateway → Application servers
                                                   |→ Cache
                                                   |→ SQL database
                                                   |→ Message queue → Worker → Object storage
                                                   |→ Monitoring service
```

Place the backend components inside a Region and add notes for a traffic assumption, an asynchronous-processing decision, and a database single-point-of-failure risk.

A fresh user should be able to create this design, configure its important edges, save it, export it, and reopen it without developer assistance.

## 13. Definition of done

Phase 1 is complete only when:

- All 16 component types can be added and configured.
- Nodes and directed edges support the agreed editing interactions.
- Notes can capture at least assumption, decision, risk, question, constraint, requirement, trade-off, and improvement types.
- Undo/redo covers every supported graph mutation and does not create an entry for each drag frame or keystroke.
- Autosave and reload preserve graph, configuration, viewport, and metadata.
- A JSON round trip preserves the canonical architecture document.
- Invalid imports cannot corrupt or replace the active design.
- The acceptance architecture can be reproduced without significant friction.
- Critical automated flows pass in continuous integration.
- No known critical accessibility, data-loss, or editor-blocking defects remain.
- The README or product documentation explains local development, shortcuts, persistence, and the JSON format.

## 14. Risks and controls

| Risk                                        | Phase 1 control                                                                                         |
| ------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Editor becomes coupled to React Flow        | Keep a separate canonical domain document and mapping layer.                                            |
| Undo/redo becomes unreliable                | Centralize mutations and define history semantics before adding many interactions.                      |
| Configuration overwhelms beginners          | Provide good presets and Basic/Advanced modes.                                                          |
| Saved designs break after schema changes    | Version documents, validate at runtime, and create a migration boundary now.                            |
| Local save causes silent data loss          | Show save state, keep a recovery draft, and test storage failures.                                      |
| Region nesting adds excessive complexity    | Prove it in the initial spike; reduce Phase 1 nesting to one level if necessary.                        |
| The product feels like a generic diagrammer | Preserve operational properties on nodes and edges and use system-design-specific components and notes. |

## 15. Decisions needed before implementation

The following decisions should be resolved during Milestone 0:

1. Whether the initial visual language is neutral or resembles a particular cloud provider. Neutral is recommended for the MVP.
2. Whether Region containment supports only one nesting level in Phase 1. One level is recommended.
3. Whether imported projects create a new local project or replace the current project. Creating a new project is safer.
4. Whether note content is plain text or Markdown. Markdown storage with a safe preview is recommended.
5. Which browsers are supported. The latest two versions of Chrome, Edge, Firefox, and Safari are a reasonable target.

None of these decisions requires backend infrastructure, AI services, or simulation work.
