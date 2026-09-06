# Testing and Quality Architecture

Last synchronized with source: **6 September 2026**

## 1. Quality toolchain

The repository defines these primary commands:

```bash
npm run lint
npm test
npm run test:e2e
npm run build
npm run format:check
```

`npm run build` runs TypeScript project compilation followed by Vite production build.

## 2. Test layers

### 2.1 Domain/unit tests

Current unit tests cover areas including:

- architecture factories;
- architecture schema/migrations;
- project assessment;
- component definitions;
- learning registry/evaluation/content behavior;
- scenario presets/schema;
- preflight;
- diagnostics;
- learning tips;
- simulation engine;
- metric presentation.

### 2.2 Store/component tests

Current tests also exercise:

- editor history/state behavior;
- architecture node UI behavior;
- keyboard shortcuts;
- simulation store/panel behavior.

### 2.3 End-to-end tests

Playwright coverage lives under `tests/e2e/` and currently includes simulation and readability/workspace interaction scenarios.

## 3. Testing requirements by change type

### Architecture schema change

Require:

- current-schema acceptance/rejection tests;
- migration test from every supported predecessor affected by the change;
- graph invariant tests;
- import behavior verification if the failure mode is user-visible.

### New component or component configuration

Require:

- component registry/default test;
- schema validation/default/migration behavior;
- inspector/editor test where configuration is user-editable;
- engine tests if it changes traffic semantics;
- learning/evaluation tests if it is referenced by challenges.

### Simulation formula/event change

Require:

- deterministic engine fixture with explicit expected output;
- preflight validation/warning tests;
- diagnostics tests;
- scenario-schema tests;
- regression test proving presentation speed does not change computed semantics when relevant.

### Learning change

Require:

- registry validation;
- attempt normalization/version compatibility;
- semantic incident compilation behavior;
- rubric/evidence behavior;
- persistence/controller behavior when state transitions change.

## 4. Determinism requirement

Simulation tests should prefer exact deterministic fixtures over probabilistic assertions. If a formula changes and an existing expected value changes, the change should be explained and tested as a semantic change rather than merely updating a snapshot without analysis.

## 5. Compatibility requirement

Architecture import compatibility is a product contract. A new schema should not silently drop legacy fields. Migration should be explicit, typed, and tested.

Likewise, learning attempts are persisted user data and require normalization/migration when their shape changes.

## 6. UI regression principles

Important UI regressions to protect include:

- editor remains accessible at supported wide/narrow reading layouts;
- diagnostics are readable independently of canvas zoom;
- simulation lock prevents editing;
- opening/closing detail surfaces does not corrupt editor transaction state;
- long labels/text do not hide critical controls;
- reset clears simulation state without altering architecture;
- import failure does not replace the active project.

## 7. Formatting/linting

Current repository conventions are enforced through:

- ESLint;
- Prettier;
- TypeScript strict project compilation as configured by repository tsconfigs.

Documentation Markdown should also be passed through `npm run format`/`format:check` when possible so tables and wrapping remain stable.

## 8. Documentation synchronization as quality control

A source change is incomplete if it changes a documented contract but leaves current architecture docs stale.

The most drift-sensitive source files are:

- `src/domain/architecture/types.ts`;
- `src/domain/architecture/schema.ts`;
- `src/domain/components/definitions.ts`;
- `src/domain/simulation/types.ts`;
- `src/domain/simulation/schema.ts`;
- `src/engine/simulationEngine.ts`;
- `src/storage/database.ts`;
- `src/domain/learning/types.ts`;
- `src/domain/learning/registry.ts`;
- `src/domain/learning/content.ts`.

When these change, review `docs/architecture/` in the same pull request/change set.

## 9. Current quality caveat

Historical quality results and one previously documented Cache Stampede comparison regression were moved to `docs/old/reviews/`. They are not treated here as current truth. Current test status must be established by running the repository's quality commands against the current working tree.
