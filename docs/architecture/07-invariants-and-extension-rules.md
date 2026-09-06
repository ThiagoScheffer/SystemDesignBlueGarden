# Invariants, Limitations, and Extension Rules

Last synchronized with source: **6 September 2026**

This document makes implicit implementation rules explicit so future changes do not weaken the architecture while adding features.

## 1. Canonical architecture invariants

1. The persisted architecture model is independent of React/React Flow.
2. Every node and edge ID is unique inside a document.
3. Every edge endpoint references an existing node.
4. Region containment, when present, is one level deep and has no cycles.
5. Cache and Sharding nodes satisfy their required component-specific configuration.
6. Worker nodes have a valid worker role.
7. Saved scenario references resolve to valid canonical entities.
8. Imported/loaded projects must pass current schema validation before editor hydration.
9. Unknown architecture schema versions are rejected, not guessed.
10. Completed simulation output is not part of architecture JSON.

## 2. Editor invariants

1. Canonical document mutations occur through the editor store.
2. Discrete edits are undoable unless deliberately classified as non-document UI state.
3. Continuous edits should coalesce into a transaction rather than flooding history.
4. Selection, information cards, diagnostics, and reading-view state are not persisted into project JSON.
5. Editing is disabled by the UI while simulation status is running or paused.
6. Node deletion also removes connected edges.
7. Self-connections are not created by editor operations.

## 3. Simulation invariants

1. The active simulation graph excludes disabled edges.
2. Region and Note are non-operational.
3. A runnable simulation has at least one valid Client traffic source.
4. The reachable operational graph must be acyclic for the current engine.
5. Runs use deterministic expected values; identical inputs should produce identical numeric ticks except timestamp/UUID metadata outside engine calculations.
6. Worker presentation speed must not affect simulation results.
7. Synchronous dependencies affect origin response success/latency; asynchronous dependencies do not.
8. Cache routes only origin/miss work downstream.
9. Message Queue and Sharding normalize outgoing route weights; ordinary nodes can fan out/duplicate demand.
10. Disabled paths receive no simulated traffic/latency incidents.
11. Diagnostic claims must be derivable from measured metrics/configuration.
12. Results remain educational estimates and must not be represented as production guarantees.

## 4. Learning invariants

1. Learning uses the same canonical architecture model as the normal editor.
2. Starting a challenge creates/uses a separate architecture project.
3. Attempt definitions are versioned/snapshotted so content edits do not rewrite historical assignments.
4. Hidden incidents resolve semantic roles rather than relying on fixed node IDs.
5. Run evidence stores architecture/scenario snapshots so later edits do not change historical evidence.
6. Current comparison is evidence/trade-off oriented, not a universal correctness claim.
7. Structured learning registries must validate IDs and cross-references at load time.
8. Active local source paths under `docs/DesignInterv/` are part of the learning content contract.

## 5. Evaluation invariants

1. Deterministic evaluation rules must expose why a criterion is observed/partial/not represented.
2. Rules should inspect structured architecture/run data, not screenshots or visual coordinates.
3. Reference architectures are alternatives, not automatically the single correct topology.
4. Any future AI explanation should consume structured evidence and should not replace deterministic facts with ungrounded scoring.

## 6. Current known implementation limitations

### Editor/product

- single selection only;
- no general copy/cut/paste;
- no general node duplication workflow;
- incomplete Region containment editor;
- no full saved-project manager;
- no backend/accounts/collaboration;
- visibility is metadata only;
- desktop/wide editor is primary.

### Simulation

- reachable directed cycles unsupported;
- no bandwidth saturation despite edge bandwidth field;
- `concurrencyLimit` is stored but not a separate limiting formula;
- no request/payload/workload classes;
- no stochastic distributions;
- no autoscaling;
- no replica/consistency model;
- no real shard-key distribution;
- no detailed circuit breaker/backoff;
- limited component-specific semantics beyond Cache/Sharding/Queue;
- no simulation semantics version persisted with projects/runs.

### Learning

- six challenge packs;
- specialized rubric depth is uneven;
- no AI interviewer/coach;
- no remote progress sync;
- no numeric pass/fail score;
- incident role resolution is simple deterministic first-match behavior.

### Security/operations

- no formal CSP/import-size/threat-model document implemented in source;
- no backend security boundary because no backend exists;
- no application telemetry/production observability subsystem.

## 7. Rule for introducing a new canonical component

A new node type should be added only when it has a distinct system-design role that cannot be cleanly represented as configuration/role semantics on an existing primitive.

Before adding one, require all of the following:

1. **Distinct configuration** — fields that materially differ from existing components.
2. **Distinct simulation behavior** — deterministic semantics beyond a label/icon.
3. **Educational value** — the distinction matters in system-design reasoning.
4. **Diagnostics/evidence** — the simulator/learning layer can explain meaningful behavior.
5. **Schema defaults and migration story** — old documents remain loadable.
6. **Tests** — domain, engine, and relevant UI behavior are covered.

If the feature is primarily a role, mode, or option of an existing primitive, extending that primitive is preferred.

Examples already following this principle:

- Cache stampede controls extend `cache` rather than creating several cache node types;
- cache refresh is a `workerRole` rather than a separate Refresh Worker component;
- Sharding is a canonical router primitive with shard configuration;
- edge disabled/monitored behavior is edge configuration, not separate connector types.

## 8. Rule for simulation extensions

Every new simulation behavior should define:

1. input/configuration contract;
2. preflight requirements/warnings;
3. deterministic formula/algorithm;
4. emitted metrics;
5. diagnostics and explanation thresholds;
6. interaction with synchronous/asynchronous routing;
7. scenario-event behavior if applicable;
8. persistence/schema impact;
9. backward-compatibility/default behavior;
10. deterministic tests with explicit expected values;
11. model-fidelity limitations.

Avoid adding formulas only in UI components. Simulation semantics belong in domain/engine code.

## 9. Rule for schema evolution

For any future architecture schema version:

- increment serialized `schemaVersion`;
- retain parser support for intentionally supported legacy versions;
- implement explicit deterministic migration;
- validate migrated output against the newest schema;
- add migration tests from every supported previous path;
- document the new field/default/semantic meaning;
- reject unknown versions.

A future simulation-semantics version should be considered separately from architecture schema version because formula changes can alter historical results without changing project structure.

## 10. Rule for learning content extensions

New challenges should use the existing validated registries and should define:

- stable/content-versioned IDs;
- template;
- clear functional/NFR prompts;
- worksheet assumptions;
- semantic incident roles;
- deterministic criteria/rubric rules where possible;
- curated trade-offs;
- source references;
- evidence that can be observed in architecture/run data.

Avoid challenge logic that hard-codes template-generated node IDs.

## 11. Documentation invariant

Current architecture documents must describe implemented source, not aspirational plans.

Future proposals should be placed in a clearly marked proposal/roadmap document, and once implemented, the current architecture docs must be updated and the obsolete proposal moved to `docs/old/` or marked superseded.
