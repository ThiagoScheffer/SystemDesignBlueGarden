# Architecture Decision Records

These files record accepted architectural decisions and their original context. They explain **why** important choices were made; current implementation details are documented under `docs/architecture/`.

A decision record can contain historical version references. When a decision remains valid but a version number has advanced, the current architecture documents take precedence for current-state facts.

Current ADRs:

- `0001-editor-foundation.md` — canonical model independent of React Flow, Zod validation/migration, local Dexie persistence, and neutral component language.
- `0002-deterministic-browser-simulation.md` — deterministic aggregate model, reachable DAG execution, native Web Worker, and synchronous/asynchronous response semantics.
