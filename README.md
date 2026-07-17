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

Region containment, full clipboard/multi-select behavior, named-project management, and browser end-to-end tests remain in the Phase 1 backlog.

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

The canonical document is independent of React Flow. Its current schema version is `1.2`, defined in `src/domain/architecture/schema.ts`, and its TypeScript contract is in `src/domain/architecture/types.ts`.

Schema `1.0` and `1.1` files and IndexedDB projects are validated and migrated to `1.2` when loaded. Schema 1.2 adds saved simulation scenarios; completed run results remain in IndexedDB rather than architecture JSON. Unknown versions are rejected before the active design is replaced.

## Simulator

Configure a scenario from the top bar, then run it against an immutable architecture snapshot. Editing is locked while a run is active or paused. Results are educational estimates derived from configured assumptions and should not be treated as production guarantees.

## Component education

Hover over any canvas component for one second to see its description and a small example. Double-click it, or select it and press `I`, to open the full information card below the node. Cache cards include a persisted hit-rate control, and every component card accepts Markdown-compatible implementation notes.

## Product documents

- [Main product design](docs/MaindesignPlan.md)
- [Phase 1 implementation plan](docs/Phase1Plan.md)
- [Phase 2 simulator plan](docs/Phase2Plan.md)
