# Current Application State

Last updated: 21 July 2026

## Purpose

Blue Garden is a browser-based system-design learning tool. Users build an architecture on a visual canvas, configure components and connections, run deterministic traffic simulations, inspect bottlenecks and failures, and receive educational explanations and architecture recommendations.

This document is a simple snapshot of the implemented application. Use it as the starting point when planning new features.

## Current Working State

The application is functional as a local desktop-oriented web application. Its main editor, persistence, import/export, project configuration, simulation, diagnostics, and learning guidance are implemented.

- Current application version: `0.1.0`
- Current architecture document schema: `1.3`
- Runtime: client-side React application
- Backend and user accounts: not implemented
- Project sharing visibility is metadata only; it does not publish a project
- Editing is locked while a simulation is running or paused
- The interface expects a desktop or wide browser viewport

## Technology Stack

- React 19 and TypeScript
- Vite for development and production builds
- React Flow for the architecture canvas
- Zustand for editor and simulation state
- Zod for runtime document and scenario validation
- Dexie and IndexedDB for local persistence
- Web Worker for simulation execution
- Lucide React for icons
- Vitest and Testing Library for unit/component tests
- Playwright for browser end-to-end tests
- ESLint and Prettier for code quality

## Application Layout

The main screen contains:

1. Top bar with project name, project settings, history, import/export, and simulation controls.
2. Searchable component library on the left.
3. React Flow architecture canvas in the center.
4. Component or connection Inspector on the right.
5. Simulation results panel below the workspace.
6. Project Settings and Scenario configuration drawers when opened.

## Implemented Editor Features

- Infinite canvas with pan, zoom, snap-to-grid, controls, and colored MiniMap.
- Add components by clicking or dragging from the component library.
- Move, select, configure, connect, reconnect, and delete nodes and connections.
- Transactional undo and redo, including coalesced drag and form edits.
- Keyboard shortcuts for undo, redo, deletion, information display, and Escape actions.
- Basic and advanced Inspector configuration for nodes and connections.
- JSON import with schema validation and safe rejection of invalid files.
- JSON export of the current architecture document.
- Automatic local save and restoration through IndexedDB.
- Typed design notes for assumptions, decisions, risks, questions, constraints, requirements, trade-offs, and improvements.

## Available Components

The component library currently contains 16 component types:

| Category      | Components                                                    |
| ------------- | ------------------------------------------------------------- |
| Client & edge | Client, DNS, CDN, Load balancer, API gateway                  |
| Compute       | Application server, Worker                                    |
| Data          | Cache, Sharding, SQL database, NoSQL database, Object storage |
| Messaging     | Message queue                                                 |
| Operations    | Monitoring service                                            |
| Structure     | Region, Note                                                  |

Every component definition includes a label, category, icon, color, description, educational summary, example, and default operational configuration.

Special component configuration includes:

- Cache hit-rate percentage, defaulting to 80%.
- Sharding count, shard key, and hash/range/directory strategy.
- Note type and content.
- Per-node implementation notes.

## Component Education

- Hovering over a node for one second shows a short educational tooltip.
- Double-clicking a node opens an information card below it.
- Selecting a node and pressing `I` toggles the same information card.
- Information cards contain a summary, example, and implementation notes.
- Cache information cards also contain an editable hit-rate control.
- Only one information or diagnostic card is displayed at a time.

## Connections

Connections are directed and support:

- HTTP, gRPC, TCP, or asynchronous protocols.
- Synchronous or asynchronous modes.
- Read, write, or mixed traffic.
- Encryption, latency, bandwidth, timeout, retry, and traffic-percentage configuration.
- Optional labels.
- Monitored and disabled states.
- Reverse, duplicate, reconnect, and remove operations.
- Parallel duplicated connections with deterministic visual offsets.
- Port-specific context menus and bulk port disconnection with confirmation.
- Endpoint-drag reconnection; dropping an endpoint on empty canvas removes the connection.

Disabled connections are visually faded and excluded from reachability, routing, fan-out, latency incidents, shard targets, and simulation metrics.

## Project Settings and Assessment

Project Settings are persisted in the architecture document and include:

- Project name and description.
- Expected scale: small, medium, large, or custom.
- Expected users and complexity.
- Custom user, traffic, transaction, and storage requirements.
- Initial RPS, peak RPS, ambient failure probability, and simulation duration defaults.
- Private, shared, or public-template visibility metadata.

Scale recommendations are applied only when the user selects **Apply recommended defaults**. Changing scale does not silently overwrite manual simulation settings.

The application produces advisory, non-blocking findings for issues such as insufficient application capacity, missing redundancy, load balancing, caching, monitoring, regional resilience, encryption, database redundancy, or saved failure scenarios. Findings appear in Project Settings, the empty Inspector state, and simulation preflight.

## Simulation

The simulator runs a deterministic, one-second aggregate model in a cancellable Web Worker.

Implemented controls:

- Run, pause, resume, and reset.
- `1×`, `4×`, `16×`, and `MAX` speeds.
- Scenario creation, editing, saving, and reuse.
- Baseline plus traffic spike, server failure, database overload, cache failure, queue backlog, and network latency presets.

Supported scenario events:

- Traffic changes.
- Component outage.
- Temporary component-capacity changes.
- Cache bypass.
- Queue message injection.
- Temporary edge latency.

The model currently calculates traffic, capacity, utilization, uncapped load ratio, queue depth, rejection, processing failures, retries, timeouts, average and P95 latency, cache hits/misses, shard routing, throughput, error rate, and estimated monthly cost.

Ambient and component failure probabilities are combined independently. Disabled connections carry no simulated traffic.

## Live Diagnostics and Learning Guidance

- Nodes display current load and P95 latency during and after a run.
- ERROR is shown for qualifying failures, rejected requests, outages, or timeouts.
- BOTTLENECK is shown for saturation, backlog, excessive latency, cache miss amplification, hot shards, or retry amplification.
- Critical bottlenecks receive a red border and reduced-motion-safe warning treatment.
- Failed paths are red; bottleneck-only affected paths are amber.
- Diagnostic popovers explain measured causes and affected request rates.
- Learning tips are optional, enabled by default, and stored as a local UI preference.
- Study links are selected from a static reviewed catalog according to the component and active problem.
- The Twitter case study appears only when local metadata, topology, and active diagnostics match a Twitter/feed architecture.

## Persistence and Compatibility

The canonical `ArchitectureDocumentV1` contains metadata, project settings, nodes, edges, viewport data, and saved scenarios. It is independent of React Flow UI state.

- Schema versions `1.0`, `1.1`, and `1.2` migrate to `1.3` during import or IndexedDB loading.
- Unknown or malformed versions are rejected without replacing the active design.
- Simulation UI state, open cards, diagnostics, and completed results are not exported in architecture JSON.
- Completed simulation runs are stored separately in IndexedDB.
- Up to ten recent runs are retained per architecture.
- Long result sets are downsampled before storage.

## Main Code Areas

| Area                                      | Location                          |
| ----------------------------------------- | --------------------------------- |
| Application composition                   | `src/app/App.tsx`                 |
| Architecture types, schema, and migration | `src/domain/architecture/`        |
| Component definitions and education       | `src/domain/components/`          |
| Canvas and editor state                   | `src/features/canvas/`            |
| Component library                         | `src/features/component-library/` |
| Inspector                                 | `src/features/inspector/`         |
| Project settings and persistence          | `src/features/projects/`          |
| Scenario editor and presets               | `src/features/scenarios/`         |
| Simulation UI and controller              | `src/features/simulation/`        |
| Deterministic simulation engine           | `src/engine/`                     |
| Diagnostics, preflight, and learning tips | `src/domain/simulation/`          |
| IndexedDB storage                         | `src/storage/database.ts`         |
| Browser tests                             | `tests/e2e/`                      |

## Known Limitations and Backlog

The following areas are not yet complete or are suitable candidates for future phases:

- Full multi-select behavior.
- Clipboard copy, cut, paste, and general node duplication workflows.
- Complete Region containment editing and interaction.
- Full project-management screen for browsing, renaming, duplicating, or deleting saved projects.
- Backend accounts, collaboration, permissions, and real publishing.
- Native starter architecture templates and case-study designs.
- Mobile editor layout.
- More extensive Playwright coverage for the newer Project Settings and connection-menu workflows.
- Production-grade performance profiling for very large diagrams.
- The simulator is educational and deterministic; it is not a distributed-systems emulator or production capacity planner.

## Quality Commands

```bash
npm run lint
npm test
npm run test:e2e
npm run format:check
npm run build
```

These checks should be run after new feature work. Any schema change should include migration coverage, and simulator changes should include deterministic engine tests.
