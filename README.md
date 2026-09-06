# Blue Garden

Blue Garden is an interactive system-design laboratory with a structured architecture editor and deterministic browser-based simulator.

## Current implementation

The first editor foundation includes:

- React 19, TypeScript, and Vite application scaffold.
- Infinite React Flow canvas with pan, zoom, minimap, snap-to-grid, and directed connections.
- Searchable library containing all 16 Phase 1 components, including a configurable Sharding router.
- Component and connection inspectors with Basic and Advanced configuration.
- One-second educational node tooltips and double-click information cards.
- Cache hit-rate controls and per-node implementation notes.
- Typed architecture notes.
- Library-independent, versioned `ArchitectureDocumentV1` schema with Zod validation.
- Transactional undo and redo that coalesces continuous editor input.
- IndexedDB autosave using Dexie.
- Validated JSON import and JSON export.
- Keyboard shortcuts for undo, redo, and deletion.
- Aggregate one-second simulation in a cancellable Web Worker.
- Baseline traffic plus six configurable incident presets.
- Capacity, backlog, Cache, Sharding, Queue, retry, failure, latency, throughput, and cost modeling.
- Run, pause, resume, reset, and `1×`, `4×`, `16×`, or `MAX` speed controls.
- Live canvas utilization overlays, KPI timelines, event navigation, and explainable bottleneck findings.
- Scenario JSON persistence and retention of the ten newest completed runs per architecture.
- Undoable Project Settings for scale, audience, complexity, simulation defaults, and export-only visibility metadata.
- Advisory architecture assessment driven by project requirements.
- Port and connection context menus with disconnect, reverse, duplicate, label, monitoring, disable, and endpoint reconnection operations.
- Disabled-path simulation exclusion and independently combined ambient failure probability.
- Local Learning Studio with six editable templates and six guided/interview challenges, including the Cache Stampede Lab.
- Structured learning registries and persisted, score-free before/after run evidence.
- Capacity-estimation worksheets, soft interview timers, semantic hidden incidents, and resumable attempt history.
- Neutral evidence comparison between submitted and curated reference architectures without scoring.

Region containment and full clipboard/multi-select behavior remain in the editor backlog.

## Run locally

Requirements: Node.js 22 or newer and npm.

```bash
npm install
npm run dev
```

Vite prints the local development URL in the terminal.

## Quality commands

```bash
npm run lint
npm test
npm run test:e2e
npm run build
npm run format:check
```

## Editor shortcuts

| Action                | Windows/Linux              | macOS                   |
| --------------------- | -------------------------- | ----------------------- |
| Undo                  | `Ctrl+Z`                   | `Cmd+Z`                 |
| Redo                  | `Ctrl+Y` or `Ctrl+Shift+Z` | `Cmd+Shift+Z`           |
| Component information | `I`                        | `I`                     |
| Close information     | `Escape`                   | `Escape`                |
| Delete selection      | `Delete` or `Backspace`    | `Delete` or `Backspace` |

## Architecture format

The canonical document is independent of React Flow. Its current schema version is `1.4`, defined in `src/domain/architecture/schema.ts`, and its TypeScript contract is in `src/domain/architecture/types.ts`.

Schema `1.0` through `1.3` files and IndexedDB projects are validated and migrated to `1.4` when loaded. Schema 1.4 adds explicit Cache Stampede configuration and cache-refresh Worker roles. Completed run results remain in IndexedDB rather than architecture JSON. Unknown versions are rejected before the active design is replaced.

## Simulator

Configure a scenario from the top bar, then run it against an immutable architecture snapshot. Editing is locked while a run is active or paused. Results are educational estimates derived from configured assumptions and should not be treated as production guarantees.

## Component education

Hover over any canvas component for one second to see its description and a small example. Double-click it, or select it and press `I`, to open the full information card below the node. Cache cards include a persisted hit-rate control, and every component card accepts Markdown-compatible implementation notes.

During a learning attempt, recommended components are highlighted in the library. The Inspector Learning tab shows contextual concepts, questions, and deterministic evidence. Cache nodes expose TTL, stale-window, jitter, coalescing, locking, and background-refresh settings; Workers can be assigned the Cache refresh role.

## Product documents

- [Main product design](docs/MaindesignPlan.md)
- [Phase 1 implementation plan](docs/Phase1Plan.md)
- [Phase 2 simulator plan](docs/Phase2Plan.md)
- [Phase 3 learning plan](docs/Phase3Plan.md)
- [Current application state](docs/Current_App_state.md)
