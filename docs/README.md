# Blue Garden Documentation

Last synchronized with source: **6 September 2026**  
Application version: **0.1.0**  
Canonical architecture schema: **1.4**

This directory is organized so that the current TypeScript source is the implementation source of truth and the documents below describe that implementation as it exists today.

## Documentation authority

When documents disagree, use this order:

1. Current TypeScript source under `src/`.
2. Current architecture documentation under `docs/architecture/`.
3. Accepted architecture decision records under `docs/decisions/`.
4. Active learning/reference material under `docs/DesignInterv/`.
5. Historical documents under `docs/old/`.

Historical phase plans and reviews are retained for context but must not be used as a specification of the current system.

## Current architecture documentation

| Document | Purpose |
| --- | --- |
| [System overview](architecture/00-system-overview.md) | Product boundary, runtime topology, major subsystems, and current scope. |
| [Runtime architecture](architecture/01-runtime-architecture.md) | Application composition, UI/state boundaries, worker boundary, and execution flows. |
| [Domain model and schema](architecture/02-domain-model-and-schema.md) | Canonical document model, components, edges, project settings, scenarios, validation, and migrations. |
| [Editor, UI, and state](architecture/03-editor-ui-and-state.md) | Canvas behavior, inspector interactions, history semantics, project actions, and simulation locking. |
| [Simulation engine](architecture/04-simulation-engine.md) | Deterministic model, preflight, formulas, routing semantics, cache model, metrics, diagnostics, and model limits. |
| [Learning Studio](architecture/05-learning-studio.md) | Learning domain, challenges/templates, attempts, incidents, worksheets, rubrics, and comparison workflow. |
| [Persistence and data lifecycle](architecture/06-persistence-and-data-lifecycle.md) | IndexedDB schema, autosave, import/export, run retention, and compatibility. |
| [Invariants and extension rules](architecture/07-invariants-and-extension-rules.md) | Cross-cutting invariants, current limitations, and rules for adding new capabilities safely. |
| [Testing and quality](architecture/08-testing-and-quality.md) | Test layers, quality commands, required coverage, and documentation synchronization rules. |

## Decision records

`docs/decisions/` contains accepted architectural decisions. These are decision history, not a replacement for the current architecture documents.

- `0001-editor-foundation.md` — renderer/domain separation, local persistence, validation, and portability.
- `0002-deterministic-browser-simulation.md` — deterministic aggregate simulation and Web Worker execution.

## Active learning/reference corpus

`docs/DesignInterv/` is intentionally not archived. The learning registry validates source paths beginning with `docs/DesignInterv/`, and current structured learning content references files in this directory. Moving it without a coordinated source/schema change would break registry validation.

## Historical documentation

`docs/old/` contains superseded plans, snapshots, and reviews. See [docs/old/README.md](old/README.md) for classification rules and contents.

## Synchronization rule

Any change to the following implementation contracts must update the relevant current document in the same change:

- `ArchitectureDocumentV1` or schema migration behavior;
- component types/defaults or edge semantics;
- scenario events or simulator formulas;
- worker protocol or execution lifecycle;
- IndexedDB schema/retention behavior;
- learning schemas, challenge workflow, or evaluation rules;
- current runtime boundaries or state ownership.
