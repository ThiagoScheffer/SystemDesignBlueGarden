# Learning Studio Architecture

Last synchronized with source: **6 September 2026**

## 1. Purpose

The Learning Studio turns the architecture editor/simulator into a structured system-design practice environment. It adds challenge content, capacity estimation, guided/interview workflows, semantic incidents, run evidence, deterministic rubric observations, and neutral comparison with a curated reference architecture.

Learning state is not embedded into `ArchitectureDocumentV1`.

## 2. Current content families

The current code ships six template/challenge families:

| Template ID | Template | Challenge |
| --- | --- | --- |
| `cache-stampede` | Cache Stampede Lab | Prevent a Cache Stampede |
| `url-shortener` | URL Shortener | Design a URL Shortener |
| `rate-limiter` | Distributed Rate Limiter | Design a Rate Limiter |
| `news-feed` | News Feed | Design a News Feed |
| `file-storage` | File Storage Service | Design a File Storage Service |
| `ecommerce-checkout` | E-commerce Checkout | Design E-commerce Checkout |

The Cache Stampede family currently has the deepest dedicated simulation/evaluation semantics.

## 3. Learning domain model

The validated registry can contain:

- templates;
- challenges;
- concepts;
- lessons;
- interviewer questions;
- teaching tips;
- rubrics;
- local source references.

`validateLearningRegistryBundle` checks ID uniqueness and cross-reference integrity at module initialization.

IDs use lowercase kebab-case.

## 4. Active reference material

Structured learning sources currently reference documents under `docs/DesignInterv/`.

The registry schema explicitly requires source paths to begin with `docs/DesignInterv/`; this directory is therefore an active runtime/content contract, not an obsolete documentation folder.

Current structured source references include:

- Preventing Cache Stampedes;
- Why Cache Invalidation Is Difficult;
- Write-Through vs. Write-Behind Caching.

## 5. Challenge definition

A `ChallengeDefinition` contains:

- stable ID and content version;
- template ID;
- title/level/summary/prompt;
- concepts;
- functional requirements;
- non-functional requirements;
- guided steps;
- worksheet defaults;
- semantic incident blueprint;
- topology criteria;
- reference trade-offs;
- optional recommended components;
- optional lesson IDs;
- optional rubric ID.

Challenge level is `beginner`, `intermediate`, or `advanced`.

## 6. Learning modes

A challenge can start in:

- `guided` mode;
- `interview` mode.

Interview mode creates a soft deadline based on level:

- beginner: 30 minutes;
- intermediate: 45 minutes;
- advanced: 60 minutes.

The deadline is persisted in the attempt; it is not a server-enforced exam timer.

## 7. Challenge attempt lifecycle

A new challenge:

1. creates a new architecture document from the challenge template;
2. saves the previously active architecture project;
3. switches the editor to the challenge project;
4. creates a persisted `ChallengeAttempt` snapshotting the challenge definition/version;
5. opens the Learning Drawer.

Attempt statuses are:

- `in-progress`;
- `completed`;
- `abandoned`.

A persisted attempt stores its own immutable challenge snapshot so later content changes do not silently rewrite the original assignment.

## 8. Attempt data

`ChallengeAttempt` includes:

- learning schema version (current normalized value `2`);
- challenge ID/version/snapshot;
- associated architecture ID;
- mode/status/timestamps/deadline;
- incident reveal/run state;
- completed guided-step IDs;
- written answers;
- capacity worksheet;
- zero or more learning run snapshots;
- optional final comparison snapshot.

## 9. Written design evidence

Attempt answers currently have structured fields for:

- clarifying questions;
- functional requirements;
- non-functional requirements;
- data/API decisions;
- bottlenecks and trade-offs.

These fields preserve reasoning separately from the architecture graph.

## 10. Capacity worksheet

Inputs:

- active users;
- actions per user per day;
- read percentage;
- average payload KB;
- retention days;
- replication factor;
- peak multiplier.

Derived values:

```text
actions/day = activeUsers × actionsPerUserPerDay
average RPS = actions/day / 86400
peak RPS = average RPS × peakMultiplier
read RPS = peak RPS × read ratio
write RPS = peak RPS × write ratio

daily storage GB = actions/day × payloadKB / 1,048,576
retained storage GB = daily storage × retentionDays × replicationFactor
monthly traffic GB = daily storage × 30
```

Worksheet application is explicit. The learner can apply estimates to project requirements or simulation defaults; editing the worksheet alone does not silently mutate the architecture project.

## 11. Semantic incident compilation

Incidents are defined using semantic roles such as component types and source/target type pairs, not hard-coded template node IDs.

`compileIncident`:

- sorts current nodes/active edges for deterministic selection;
- resolves each blueprint event to a matching current component/edge;
- reports missing semantic roles instead of creating invalid events;
- builds a runnable scenario using the current project's Client and simulation defaults.

This allows the learner to substantially edit the template topology while keeping the incident meaningful when required roles still exist.

## 12. Learning run snapshots

When a simulation completes for the active challenge architecture, the controller persists a `LearningRunSnapshot` containing:

- run ID/time;
- full architecture snapshot;
- scenario snapshot;
- simulation summary;
- selected learning metrics.

Current learning metrics include:

- database peak offered RPS;
- cache peak origin RPS;
- cache peak lock-wait RPS;
- total cache lock timeouts;
- total stale responses;
- total coalesced requests;
- global peak P95 latency;
- global peak error rate.

This allows before/after evidence even if the live architecture later changes.

## 13. Deterministic rubric engine

The learning evaluation domain supports typed rules:

- component count;
- active path through required component types;
- enabled configuration keys;
- run observation threshold;
- run metric improvement percentage;
- cache lock safety;
- cache refresh-worker connection.

Each rule produces one of:

- `observed`;
- `partial`;
- `not-represented`.

The result is evidence-oriented and explainable rather than an opaque numeric AI score.

## 14. Comparison model

The final challenge comparison stores:

- submitted architecture snapshot;
- curated reference architecture snapshot;
- aligned scenario;
- user global metric;
- reference global metric;
- topology evidence observations;
- reference trade-offs.

The current topology comparison checks challenge criteria by component presence. It is intentionally neutral and does not claim the curated reference is the only correct architecture.

Reference scenario traffic/duration/failure assumptions are aligned with the user's scenario before comparison so the two designs are evaluated under comparable high-level conditions.

## 15. Learning persistence

Training attempts are stored in IndexedDB table `trainingAttempts`. The database currently normalizes existing attempts during Dexie database version 4 migration.

Attempt history can be resumed as long as the associated architecture project still exists.

Deleting an attempt/project is handled explicitly by the learning controller; missing project data produces an error instead of inventing a replacement design.

## 16. Learning UI integration

Learning surfaces interact with the normal editor rather than using a separate graph implementation:

- challenge/template browser in Learning Hub;
- active workflow in Learning Drawer;
- Challenge HUD in top bar;
- component recommendations in palette;
- contextual learning content in inspector;
- simulation used directly for incident evidence.

This reuse is important: learning semantics operate on the same canonical architecture model used everywhere else.

## 17. Current learning limitations

- only six challenge/template families;
- deep deterministic evaluation is concentrated in a subset of concepts, especially Cache Stampede;
- no AI interviewer/coach;
- no remote progress/account sync;
- comparison criteria are not yet a general formal architecture-verification system;
- semantic incident resolution currently chooses the first deterministic matching role, not a user-selected role mapping;
- no formal score/pass/fail is produced by current comparison.

## 18. Primary source files

- Types: `src/domain/learning/types.ts`
- Content/templates/challenges: `src/domain/learning/content.ts`
- Structured registry content: `src/domain/learning/structuredContent.ts`
- Registry validation: `src/domain/learning/registry.ts`
- Incidents: `src/domain/learning/incidents.ts`
- Worksheet: `src/domain/learning/worksheet.ts`
- Evaluation: `src/domain/learning/evaluation.ts`
- Comparison: `src/domain/learning/comparison.ts`
- Attempt normalization: `src/domain/learning/attempts.ts`
- Controller: `src/features/learning/useLearningController.ts`
