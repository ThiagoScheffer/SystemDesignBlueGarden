# Persistence and Data Lifecycle

Last synchronized with source: **6 September 2026**

## 1. Storage model

Blue Garden is local-first. Persistent application data is stored in the browser through Dexie over IndexedDB database **`blue-garden`**.

There is no current server-side persistence.

## 2. IndexedDB schema

Current Dexie database version: **4**.

### 2.1 `projects`

```text
primary key: id
index: updatedAt
payload: ArchitectureDocumentV1
```

A stored project contains:

- project ID;
- updated timestamp;
- canonical architecture document.

### 2.2 `simulationRuns`

```text
primary key: runId
indexes:
- architectureId
- completedAt
- [architectureId+completedAt]
```

A stored run contains:

- run ID;
- architecture ID;
- completion time;
- `SimulationSummary`;
- retained `SimulationTick[]`.

### 2.3 `trainingAttempts`

```text
primary key: id
indexes:
- challengeId
- architectureId
- status
- updatedAt
- [challengeId+updatedAt]
```

Dexie database version 4 runs a migration that normalizes existing attempts through `normalizeChallengeAttempt`.

## 3. Project autosave lifecycle

At startup:

1. the most recently updated stored project is loaded;
2. it is parsed/migrated through the current architecture schema;
3. the editor store is hydrated;
4. persistence is marked ready.

After readiness, document changes are saved with a **500 ms debounce**.

The UI exposes save state as:

- Opening…;
- Saving…;
- Saved locally;
- Save unavailable.

## 4. Project identity

New projects receive IDs based on `crypto.randomUUID()`.

Importing an architecture JSON does **not** preserve the imported project identity as the active local project. The editor:

- clones the parsed document;
- assigns a new architecture ID;
- appends ` (imported)` to the name;
- resets created/updated timestamps;
- clears editor history/selection.

This avoids accidentally treating an imported external copy as the same local project record.

## 5. Architecture JSON export

Export serializes only the canonical architecture document as formatted JSON and downloads it with a `.blue-garden.json` suffix derived from a sanitized project name.

Export includes:

- architecture metadata;
- viewport;
- project settings;
- nodes;
- edges;
- saved scenarios.

Export excludes:

- undo/redo history;
- selection;
- open inspector/info/diagnostic state;
- simulation store state;
- completed simulation runs;
- Learning Studio attempts/comparisons;
- UI preferences.

## 6. Import validation and migration

Import performs:

1. file text read;
2. `JSON.parse`;
3. `parseArchitectureDocument`;
4. schema migration when version is 1.0–1.3;
5. current 1.4 validation;
6. replacement of active editor project only on success.

Malformed JSON, invalid documents, and unsupported versions are rejected.

## 7. Architecture schema migration policy currently implemented

Supported chain:

- 1.0 → 1.1;
- 1.1 → 1.2;
- 1.2 → 1.3;
- 1.3 → 1.4.

Every legacy load ends with a full parse against current schema 1.4.

The source does not currently maintain a separate simulation-semantics version inside exported project JSON. This is an important future governance gap if simulator formulas need long-term reproducibility across engine revisions.

## 8. Completed simulation-run retention

On successful completion:

- run summary and ticks are saved separately from project data;
- if a run has at most 900 ticks, all ticks are retained;
- if a run has more than 900 ticks, storage keeps every fifth tick;
- only the newest **10 completed runs per architecture** are retained;
- older runs are bulk-deleted.

The in-memory run still receives every tick during the current session; downsampling applies to persisted long runs.

## 9. Training-attempt lifecycle

Learning attempts are stored independently from architecture projects so challenge progress can survive UI navigation and application reload.

An attempt references `architectureId`. Resume therefore requires the corresponding project record to still exist.

The attempt stores snapshots needed for evidence/history, including its challenge definition version and completed learning runs.

## 10. LocalStorage

A small UI preference is stored outside IndexedDB:

- key: `blue-garden-learning-tips`;
- value: whether simulation learning tips are enabled.

If browser localStorage access fails, the preference still works for the current session.

## 11. Data ownership table

| Data | Owner | Persistent? | Exported with architecture? |
| --- | --- | --- | --- |
| Canonical architecture | Editor store / `projects` | Yes | Yes |
| Saved scenarios | Canonical architecture | Yes | Yes |
| Undo/redo | Editor store | No | No |
| Selection/open panels | UI stores | No | No |
| Live simulation ticks | Simulation store | Session | No |
| Completed simulation runs | `simulationRuns` | Yes | No |
| Learning attempt | `trainingAttempts` | Yes | No |
| Learning run snapshots | Inside attempt | Yes | No |
| Learning-tip preference | localStorage | Yes (browser) | No |

## 12. Current lifecycle limitations

- no user-controlled project browser/backup policy beyond JSON export;
- no remote backup/sync;
- no account ownership or permissions;
- no cross-device data model;
- no automatic export of learning progress;
- no storage quota management UI;
- no explicit simulation-engine version persisted with runs/projects;
- deleting browser site data removes local projects/attempts/runs.

## 13. Primary source files

- IndexedDB: `src/storage/database.ts`
- Autosave/load: `src/features/projects/useProjectPersistence.ts`
- Import/export: `src/features/import-export/files.ts`
- Architecture parse/migration: `src/domain/architecture/schema.ts`
- Learning attempt normalization: `src/domain/learning/attempts.ts`
