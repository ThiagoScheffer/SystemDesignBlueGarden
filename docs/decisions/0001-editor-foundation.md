# ADR 0001: Phase 1 editor foundation

Status: Accepted

## Context

The architecture editor must be useful before simulation exists, while its saved data must remain stable enough to become simulation input in Phase 2. Coupling the persisted graph to a canvas library would make file migration and future renderer changes unnecessarily difficult.

## Decision

- Use a neutral visual language rather than cloud-provider-specific components.
- Use React Flow as the Phase 1 interaction and rendering layer.
- Keep `ArchitectureDocumentV1` as the canonical model with no React or React Flow imports.
- Map canonical nodes and edges into React Flow view objects at the canvas boundary.
- Validate all imported documents with Zod before changing editor state.
- Store projects locally in IndexedDB through Dexie; no backend is introduced.
- Limit Region containment to one level when containment is implemented.
- Store note content as Markdown-compatible text without rendering untrusted HTML.
- Keep educational component content in the static registry and persist only user-authored implementation notes.
- Validate and migrate schema `1.0` documents to `1.1` before hydration.

## Consequences

The editor needs an explicit adapter between its domain document and React Flow. This is a small initial cost, but it keeps persistence, simulation, and later migrations independent of the chosen renderer. Cloud-specific icon packs, accounts, collaboration infrastructure, and server persistence remain deferred.
