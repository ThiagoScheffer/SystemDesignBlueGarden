# Evaluation of the Blue Garden Design Documents

## Executive assessment

The documents describe a coherent product and a technically sound implementation trajectory. The strongest aspect is the consistent separation between:

* canonical architecture data,
* React Flow presentation state,
* deterministic simulation,
* local persistence,
* structured learning content,
* and future evaluation logic.

The project has already moved substantially beyond the original MVP. The main problem is no longer lack of product direction. It is **documentation drift, incomplete architectural specifications, and an increasingly fragmented roadmap**.

The current documents mix four different purposes:

1. product vision,
2. implemented-state documentation,
3. historical phase plans,
4. future implementation prompts.

That makes it difficult to determine which statements are authoritative.

My overall assessment:

* **Product direction:** strong
* **Frontend and domain architecture:** strong
* **Simulation specification:** relatively mature
* **Learning-content architecture:** promising
* **Operational and security architecture:** underdeveloped
* **Roadmap consistency:** weak
* **Implementation traceability:** incomplete
* **Documentation governance:** currently the largest documentation-level risk

This review is based on the uploaded planning and current-state documents, not a direct audit of the source repository. Therefore, implementation claims are treated as reported state rather than independently verified facts.      

---

# 1. Highest-priority issue: establish a single source of truth

The documents currently contradict one another.

Examples:

* The Phase 1 plan describes schema `1.2`.
* The Phase 2 plan also presents schema `1.2`.
* The Phase 3 document says the schema remains `1.3`.
* The new-components document contains both a historical statement that the current schema is `1.3` and a status section saying the first vertical slice is implemented on `1.4`.
* The current-state document says the current architecture schema is `1.4`.

These contradictions are understandable historically, but they make the plans unsafe as implementation inputs.

## Improvement

Create a document hierarchy:

```text
/docs
  /product
    product-vision.md
    product-principles.md

  /architecture
    system-context.md
    frontend-architecture.md
    simulation-architecture.md
    persistence-architecture.md
    learning-domain.md
    security-model.md

  /contracts
    architecture-schema.md
    scenario-schema.md
    simulation-contracts.md
    learning-content-schema.md

  /roadmap
    current-roadmap.md
    completed-milestones.md

  /decisions
    ADR-001-react-flow.md
    ADR-002-local-first.md
    ADR-003-deterministic-simulation.md
    ...

  current-state.md
  changelog.md
```

Each document should have:

* status: draft, active, superseded, or historical,
* owner,
* last reviewed date,
* implementation version,
* related ADRs,
* superseded-by link.

The phase plans should be marked historical after implementation. They should not remain mixed with active specifications.

---

# 2. The master plan is too broad to remain an implementation specification

The master design document is useful as a product vision, but it contains many components and capabilities that are neither implemented nor near-term:

* WAF
* reverse proxy
* Kubernetes
* event bus
* durable log
* circuit breaker
* rate limiter
* identity provider
* secrets manager
* backup and disaster recovery
* collaboration
* presentation mode
* cloud imports
* advanced AI review

This is appropriate for a vision document but not for a current technical plan.

## Risk

Developers may interpret the master plan as a backlog commitment rather than an option space. This can cause component proliferation and premature abstractions.

## Improvement

Separate the product into explicit capability levels:

### Level A — canonical primitives

Components already central to the simulation model:

* Client
* DNS
* CDN
* Load Balancer
* API Gateway
* Application Server
* Worker
* Cache
* SQL
* NoSQL
* Object Storage
* Queue
* Sharding
* Monitoring
* Region
* Note

### Level B — extensions of existing primitives

Prefer extending current components where the behavior is not independently meaningful:

* tracing as Monitoring capability,
* durable ordered mode as Queue capability,
* shard-router behavior as Sharding capability,
* cache refresh as Worker role,
* replication as database or object-storage configuration.

### Level C — genuinely distinct simulation components

Add only when they have an independent model and educational value:

* External API
* WebSocket Gateway
* Search Engine
* Browser Worker
* Media Processor

### Level D — deferred visual abstractions

Add only after the product proves a concrete learning need:

* Kubernetes cluster
* VPC
* firewall
* secrets manager
* KMS
* identity provider
* disaster-recovery group

A new node type should require:

1. distinct configuration,
2. distinct simulation semantics,
3. at least one challenge using it,
4. deterministic diagnostics,
5. tests,
6. a migration/default strategy.

Without those six conditions, extend an existing component instead.

---

# 3. Missing end-to-end system architecture document

The documents describe individual areas well, but there is no single architecture document showing how the application works as a system.

A reader must infer the runtime architecture from multiple files.

## What should be added

### System context

```text
User
  │
Browser application
  ├── React editor
  ├── Zustand stores
  ├── Web Worker simulator
  ├── IndexedDB persistence
  └── Static learning-content registries
```

### Major runtime boundaries

Document:

* UI thread
* simulation worker
* canonical architecture domain
* React Flow adapter
* local persistence boundary
* static content initialization
* evaluation boundary
* import/export boundary

### Data-flow diagrams

At minimum:

#### Editor mutation flow

```text
User action
→ editor action
→ domain validation
→ canonical document update
→ history transaction
→ React Flow projection
→ debounced persistence
```

#### Simulation flow

```text
Canonical architecture
+ scenario
→ preflight validation
→ immutable snapshot
→ worker input
→ deterministic ticks
→ simulation store
→ diagnostics
→ completed-run persistence
```

#### Challenge flow

```text
Challenge definition
→ attempt
→ independent architecture project
→ scenario run
→ evidence extraction
→ comparison
→ persisted progress
```

This would make architectural dependencies and ownership much clearer.

---

# 4. Requirements are not sufficiently measurable

The documents contain extensive feature lists, but many requirements are expressed as capabilities rather than measurable acceptance criteria.

Examples:

* “without significant friction”
* “acceptable interaction performance”
* “material value”
* “technically consistent”
* “educationally useful”
* “real bottleneck”

These are directionally correct but insufficient for engineering validation.

## Improvement

Add measurable product and technical service-level objectives.

### Editor objectives

* P95 drag-frame processing below 16 ms for the supported reference graph.
* Autosave begins within 500–1,000 ms after the final transaction.
* Import of a 5 MB architecture document completes within a defined limit.
* Undo and redo complete within a defined interaction threshold.
* No canonical-state loss after forced reload during pending autosave.

### Simulation objectives

* Same canonical input produces identical normalized output.
* Worker cancellation acknowledged within a bounded wall-clock duration.
* Tick ingestion remains within main-thread budget.
* Maximum graph size and scenario duration are explicitly supported.
* Diagnostic generation remains deterministic.

### Learning objectives

* Challenge startup success rate.
* Percentage of attempts that reach first simulation.
* Percentage of users who perform a second run after changing the architecture.
* Before/after comparison usage.
* Challenge completion and return rates.

### Reliability objectives

Even for a local application:

* zero partial import commits,
* zero active-document replacement on invalid migration,
* recoverable storage failure behavior,
* backward-compatibility test coverage for every schema version.

---

# 5. No explicit domain invariants catalogue

The plans mention some invariants, but they are scattered across editor, simulation, scenario, and learning documents.

That becomes risky as schema complexity grows.

## Add a formal invariants document

It should cover:

### Architecture invariants

* unique node and edge IDs,
* no dangling edges,
* valid parent relationships,
* no containment cycles,
* valid configuration by component type,
* portable document independent from UI state,
* deterministic canonical serialization.

### Simulation invariants

* all numeric results finite and non-negative,
* identical input produces identical result,
* disabled edges carry no traffic,
* excluded structural nodes do not process traffic,
* editing cannot mutate an active run snapshot,
* speed affects presentation only,
* event ordering is total and deterministic.

### Learning invariants

* all referenced concept/template/rubric/question IDs exist,
* content versions are immutable after publication,
* attempts retain the challenge version they began with,
* static content is not stored as user data,
* submitted comparisons remain immutable,
* reference solutions are alternatives, not unique “correct” answers.

### Evaluation invariants

* every finding includes evidence,
* rule output is reproducible,
* hard failures are separate from recommendations,
* scores never replace diagnostic feedback,
* rules may not infer configuration that is not represented in the architecture.

This is particularly important because the transcript-derived critique was that architecture intentions cannot remain “in the designer’s head.” Blue Garden should enforce that principle in its own domain model.

---

# 6. API and interaction semantics are under-specified

Although this is currently a client-only application, it still has internal APIs:

* store actions,
* worker messages,
* persistence repositories,
* content registries,
* simulation contracts,
* import/export contracts.

The worker protocol is documented relatively well. The other internal boundaries are not.

## Missing specifications

* Editor command contract
* History transaction semantics
* Autosave conflict/revision behavior
* Repository error model
* Content-registry initialization behavior
* Evaluation trigger model
* Canonical serialization ordering
* Project identity and duplication semantics
* Template instantiation semantics
* Attempt-to-architecture ownership rules

## Improvement

Document each internal boundary as if it were a service API:

```ts
type ProjectRepositoryResult<T> =
  | { ok: true; value: T }
  | {
      ok: false;
      code:
        | 'storage-unavailable'
        | 'quota-exceeded'
        | 'validation-failed'
        | 'migration-failed'
        | 'not-found';
      message: string;
      recoverable: boolean;
    };
```

This prevents inconsistent UI-level exception handling and swallowed failures.

---

# 7. Schema evolution needs a stronger governance model

Version migrations are mentioned repeatedly, but the long-term schema strategy is incomplete.

## Missing decisions

* Is the schema version global or capability-based?
* Can migration functions mutate IDs?
* Are migrations required to be reversible?
* Are imported future versions rejected or retained read-only?
* Is schema canonicalization performed after migration?
* How are deprecated component types handled?
* What happens when challenge content expects a newer capability than the architecture schema supports?
* How long are versions supported?
* Are completed runs tied to the exact engine model version?

## Critical improvement: version simulation semantics

Architecture schema version alone is insufficient.

A completed run should record something like:

```ts
interface SimulationProvenance {
  engineVersion: string;
  modelVersion: string;
  architectureSchemaVersion: string;
  scenarioSchemaVersion: string;
  challengeId?: string;
  challengeVersion?: number;
  generatedAt: string;
}
```

Otherwise, after formula changes, two runs may look comparable even though they were produced by different models.

For educational comparison, that is a material correctness issue.

---

# 8. Simulation accuracy boundaries need formal treatment

The documents correctly state that the simulator is educational and approximate. However, this warning should be operationalized rather than left as prose.

## Missing model specification

For each modeled component, document:

* input variables,
* output variables,
* formulas,
* caps,
* assumptions,
* unsupported behavior,
* diagnostic thresholds,
* expected pedagogical interpretation.

Example:

```text
Model: Cache

Represents:
- local hit completion
- miss propagation
- bypass
- key-expiration amplification
- request coalescing
- stale serving

Does not represent:
- key-level eviction policy
- distributed cache topology
- network partition between cache nodes
- memory fragmentation
- realistic Redis command scheduling
```

## Add confidence classifications

Each metric could be categorized:

* **Directly configured:** cost per hour, capacity
* **Deterministically derived:** utilization, queue depth
* **Heuristic estimate:** average latency, P95 latency
* **Educational signal:** bottleneck severity, architecture recommendation

This sharply reduces false precision.

---

# 9. The latency model is useful but too simplistic for expanding scope

The existing queue-delay approximation is adequate for a basic educational engine, but future component models will expose its limits.

Current concerns:

* utilization is based on aggregate capacity,
* P95 is derived through a fixed multiplier,
* synchronous paths use a longest-required-path approximation,
* timeout and retry behavior are simplified,
* correlation between downstream failures is not modeled,
* no service-time distribution exists,
* fan-out tail amplification is only partially represented.

## Improvement

Do not replace the model immediately. Introduce explicit model tiers:

### Tier 1 — simple deterministic

Current formula-based model.

### Tier 2 — component-specific approximation

Different queue and latency formulas for:

* database connection pools,
* queues,
* external APIs,
* browser workers,
* media processors,
* fan-out workers.

### Tier 3 — advanced educational model

Optional deterministic distributions or fixed quantile profiles.

The key is to version these semantics and keep outputs explainable.

---

# 10. Missing workload model

Traffic is currently dominated by RPS and percentages. That is insufficient for many future challenges.

## Additional workload dimensions needed

* request class or operation,
* payload size,
* read/write ratio,
* key distribution,
* tenant distribution,
* object size,
* follower distribution,
* cache-key popularity,
* message size,
* concurrency duration,
* connection lifetime,
* burstiness.

Without a workload abstraction, future models risk adding challenge-specific fields directly into unrelated nodes.

## Recommended contract

```ts
interface WorkloadProfile {
  operations: Array<{
    id: string;
    name: string;
    requestsPerSecond: number;
    payloadBytes?: number;
    responseBytes?: number;
    trafficType: 'read' | 'write' | 'mixed';
    keyDistribution?: 'uniform' | 'zipfian' | 'hot-key' | 'hot-tenant';
    consistencyRequirement?: 'strong' | 'eventual' | 'session';
  }>;
}
```

This should be added only when at least two simulation capability packs require it, but the design decision should be made now.

---

# 11. Data architecture and lifecycle are not fully documented

The current state describes architecture documents, attempts, and simulation runs, but the overall local data model is incomplete.

## Missing topics

* Dexie table definitions and relations
* deletion cascade behavior
* project duplication semantics
* orphaned attempts
* orphaned simulation runs
* retention policies
* storage quota handling
* exportability of learning attempts
* user-requested reset/delete-all behavior
* corruption recovery
* backup and restore
* local data privacy

## Add a persistence model

```text
ArchitectureProject
  ├── SavedScenarios
  ├── CompletedSimulationRuns
  └── ChallengeAttempt reference

ChallengeAttempt
  ├── Challenge/version reference
  ├── ArchitectureProject reference
  ├── Answers
  ├── Submitted snapshot
  └── Comparison snapshot
```

Document ownership and cascade rules explicitly.

Example:

* deleting an active challenge project should prompt whether to retain or abandon the attempt;
* deleting a project should delete or detach completed runs;
* static templates must never be mutated;
* submitted snapshots must remain immutable.

---

# 12. Security is materially under-specified

The current application is local-only, which reduces the attack surface, but it does not eliminate security requirements.

## Missing areas

### Import security

* maximum file size,
* JSON parsing limits,
* deep-nesting limits,
* string-length limits,
* denial-of-service protection,
* malicious Markdown sanitization,
* unsafe URL handling,
* prototype-pollution resistance.

### Browser security

* Content Security Policy
* external-link policy
* download generation safety
* worker message validation
* dependency vulnerability management
* IndexedDB data exposure model

### Future backend readiness

Before accounts or collaboration are introduced, define:

* identity boundary,
* authorization model,
* tenant isolation,
* sharing permissions,
* public-template moderation,
* rate limiting,
* audit logs,
* deletion/export rights.

## Immediate recommendation

Add a security design document now, even if most controls are local.

---

# 13. Accessibility is present as a requirement but not as an architecture

The phase plans mention accessibility and keyboard support, but there is no systematic specification.

React Flow canvases are difficult to make accessible. “Keyboard accessible” needs more precision.

## Missing acceptance criteria

* keyboard creation and connection of nodes,
* canvas focus order,
* screen-reader representation of graph structure,
* nonvisual relationship inspection,
* status announcements during simulation,
* accessible chart summaries,
* high-contrast mode,
* zoom-independent text readability,
* reduced-motion handling,
* focus restoration after drawers and dialogs close.

## Improvement

Define two accessibility layers:

1. **UI accessibility** for panels, forms, menus, dialogs, and controls.
2. **Graph accessibility** through an alternate structured outline of nodes, edges, statuses, and diagnostics.

The second layer is essential. A visual canvas alone cannot satisfy meaningful nonvisual access.

---

# 14. The learning model needs stronger pedagogical specification

The Learning Studio is implemented, but the documents focus mostly on content structure and UI flow.

## Missing educational design elements

* prerequisite graph,
* concept mastery model,
* challenge difficulty calibration,
* hint escalation,
* misconception taxonomy,
* challenge versioning policy,
* content review workflow,
* source quality criteria,
* learning outcome measurement,
* spaced repetition or revisit strategy,
* rubric inter-rater consistency.

## Improvement

Each challenge should define:

```ts
interface ChallengePedagogy {
  prerequisites: string[];
  targetConcepts: string[];
  misconceptionIds: string[];
  evidenceRequired: string[];
  hintLevels: Array<{
    level: 1 | 2 | 3;
    content: string;
    disclosureCost: 'low' | 'medium' | 'high';
  }>;
  masterySignals: string[];
}
```

A challenge should not merely detect whether a cache exists. It should test whether the user understands:

* why it exists,
* what failure mode it introduces,
* how invalidation is handled,
* what happens when it is bypassed,
* which consistency tradeoff was chosen.

---

# 15. Evaluation rules need conflict and uncertainty handling

The new-components plan correctly prioritizes deterministic evaluation and evidence. However, a rule engine can still make incorrect recommendations when context is missing.

Example:

* “Database has no replication” may be acceptable for a deliberately low-cost prototype.
* “No cache” is not always a flaw.
* “Queue has no dead-letter behavior” may be irrelevant if the modeled queue is explicitly ephemeral.
* “Single region” may be acceptable under the defined availability target.

## Improvement

Every rule should contain:

```ts
interface EvaluationRule {
  id: string;
  appliesWhen: Predicate;
  findingWhen: Predicate;
  severity: 'info' | 'warning' | 'critical';
  confidence: 'high' | 'medium' | 'low';
  evidenceRequirements: string[];
  exceptions: string[];
  relatedRequirementTypes: string[];
}
```

Findings should distinguish:

* violated explicit requirement,
* structural risk,
* missing documentation,
* optional improvement,
* design ambiguity.

This is superior to scoring an architecture against a universal “best” topology.

---

# 16. Architecture Decision Records are referenced but not operationalized

The master plan recognizes decisions, assumptions, risks, and trade-offs. Typed notes exist. However, there is no documented lifecycle for design decisions.

## Missing functionality and semantics

* superseding a decision,
* linking decisions to nodes/edges,
* recording alternatives,
* recording consequences,
* recording decision status,
* filtering unresolved decisions,
* evaluation treatment of intentional tradeoffs.

## Recommended structured ADR

```ts
interface ArchitectureDecision {
  id: string;
  title: string;
  status: 'proposed' | 'accepted' | 'rejected' | 'superseded';
  context: string;
  decision: string;
  alternatives: string[];
  consequences: string[];
  relatedNodeIds: string[];
  relatedEdgeIds: string[];
  supersedesId?: string;
}
```

Typed free-form notes are useful, but they do not fully replace ADRs.

---

# 17. Missing explicit request and data-flow documentation in challenges

The earlier System Design extraction emphasized that diagrams alone are incomplete. Blue Garden currently models topology and operations well, but the plans do not clearly require users to describe full application flows.

A design can contain correct components while leaving critical behavior unspecified.

## Add flow definitions

Examples:

```ts
interface ArchitectureFlow {
  id: string;
  name: string;
  type: 'read' | 'write' | 'background' | 'failure' | 'recovery';
  steps: Array<{
    nodeId: string;
    edgeId?: string;
    operation: string;
    expectedOutcome: string;
  }>;
  consistencyExpectation?: string;
  failurePolicy?: string;
}
```

For a URL shortener, require at least:

* create-short-URL flow,
* redirect flow,
* analytics flow,
* collision retry flow.

This would improve both TDD quality and deterministic evaluation.

---

# 18. Missing API and data-model worksheets

The Learning Studio includes requirements and capacity estimation, but the documents do not describe equivalent structured support for:

* API design,
* data schema,
* indexing,
* partition keys,
* consistency,
* retention,
* idempotency.

These are central to system design and were specifically identified as missing in the source critique.

## Recommended additions

### API worksheet

* endpoint or operation,
* method,
* request structure,
* response structure,
* authentication,
* idempotency,
* pagination,
* error model,
* rate limits.

### Data-model worksheet

* entity,
* key,
* partition key,
* indexes,
* relationships,
* retention,
* consistency,
* expected access patterns.

These should remain optional in free-canvas mode but become challenge completion criteria when relevant.

---

# 19. Missing cost-model specification

The current simulator calculates estimated monthly cost as hourly component cost multiplied by 730 hours. This is transparent, but future plans mention bandwidth, storage, processing, and cloud-like behavior.

## Risk

The cost metric may appear more meaningful than it is.

## Improvement

Explicitly define cost model levels:

### Current

```text
Fixed provisioned component cost
= hourly configured cost × 730
```

### Future optional dimensions

* request cost,
* storage cost,
* transfer cost,
* processing cost,
* idle versus utilization-based cost.

Do not add cloud-provider-specific pricing until there is a clear product requirement. The current neutral model is superior for education.

Label the metric as **configured infrastructure estimate**, not “monthly cloud cost.”

---

# 20. Missing observability of the application itself

The product teaches observability but the documents do not specify how Blue Garden itself is monitored.

For a purely local application, this may initially be limited, but quality engineering still requires:

* error boundaries,
* structured client logs,
* performance marks,
* worker crash reporting,
* migration-failure diagnostics,
* storage-error diagnostics,
* test telemetry,
* optional privacy-preserving product analytics.

## Improvement

Define an internal diagnostics layer that works without a backend and can export a support bundle:

```text
Application version
Schema version
Browser
Feature flags
Recent non-sensitive errors
Storage status
Worker state
Document validation summary
```

Do not include project content unless explicitly approved by the user.

---

# 21. Testing documentation is strong but lacks a traceability matrix

The phase plans include extensive test categories, which is a strength. However, there is no visible mapping from requirement to implementation to test.

## Add traceability

| Requirement                                   | Design component            | Acceptance test | Status      |
| --------------------------------------------- | --------------------------- | --------------- | ----------- |
| Invalid import cannot replace active project  | Import transaction boundary | E2E-IMPORT-004  | Implemented |
| Same input yields same simulation             | Deterministic engine        | ENG-DET-001     | Implemented |
| Attempt resumes after reload                  | Dexie attempt repository    | E2E-LEARN-003   | Implemented |
| Cache expiration amplification is explainable | Cache model + diagnostics   | ENG-CACHE-012   | Implemented |

This is especially useful because the project spans product, domain, worker, UI, and content code.

---

# 22. Missing release and compatibility strategy

The current application reports version `0.1.0` despite several implemented phases and schema migrations. That may be intentional, but the release strategy is unspecified.

## Missing decisions

* semantic versioning policy,
* migration support window,
* feature flag policy,
* release channels,
* rollback strategy,
* schema compatibility guarantees,
* deprecation handling,
* release notes format.

## Recommendation

Use separate versions:

* application version,
* architecture schema version,
* simulation engine version,
* learning-content bundle version,
* IndexedDB schema version.

Do not conflate them.

---

# 23. Current backlog items should be reprioritized

The current-state document lists several incomplete editor capabilities. Some are more important than adding new simulation components.

## Recommended priority order

### Priority 0 — correctness and documentation

1. Consolidate documentation.
2. Add engine/model provenance.
3. Formalize schema and migration governance.
4. Complete missing automated coverage around current schema `1.4`.
5. Add persistence lifecycle and failure documentation.

### Priority 1 — core editor completeness

1. Full project-management screen.
2. Complete multi-select.
3. Copy/cut/paste and duplication.
4. Complete Region containment.
5. Version/run comparison UX.
6. Large-graph performance profiling.

These directly affect the core “build → modify → compare” loop.

### Priority 2 — TDD completeness

1. Functional/non-functional requirements worksheet.
2. API design worksheet.
3. Data-model worksheet.
4. Structured architecture flows.
5. Structured ADRs.
6. Explicit tradeoff and failure-analysis sections.

### Priority 3 — learning depth

1. Rubric/evidence evaluator.
2. Comparison mode.
3. Challenge prerequisites and misconception model.
4. Additional challenge packs using existing components.

### Priority 4 — new component capability packs

1. External API + slow-request tracing
2. Direct-upload/file-transfer behavior
3. Consistent-hashing/rebalancing enhancement
4. Feed fan-out model
5. WebSocket Gateway
6. Search Engine
7. Browser Worker / scraper
8. Media Processor
9. Repair Worker

### Priority 5 — platform expansion

* backend accounts,
* cloud sync,
* real sharing,
* collaboration,
* public ecosystem,
* AI coach.

This order is superior because it improves the existing core before increasing the component surface area.

---

# 24. Specific contradictions to resolve

## Phase 1 scope versus current state

Phase 1 says multi-select, copy/paste, duplication, named projects, and Region containment are included and required for completion. The current-state document says several of these remain incomplete.

Therefore one of these must be true:

* Phase 1 was not actually completed against its original definition of done, or
* the Phase 1 document no longer represents the accepted scope.

Do not leave this ambiguous. Mark each original acceptance criterion:

```text
Implemented
Partially implemented
Deferred by decision
Superseded
```

## Phase 3 challenge count

The Phase 3 plan describes five challenges. Current state describes six, including Cache Stampede. The active learning-content catalogue should be documented in one registry-derived table rather than manually repeated.

## Schema version

The new-components file contains historical `1.3` instructions and an implemented `1.4` status. Split this file into:

* completed milestone report,
* active next-milestone plan.

## AI evaluation

The master vision includes an AI evaluator. Later documents explicitly exclude AI and prioritize deterministic evaluation. The active roadmap should state:

> AI explanation remains optional and deferred. Deterministic evidence-based evaluation is the authoritative assessment layer.

This is a materially better product and engineering position.

---

# 25. Recommended next milestone

The best next milestone is **not** adding all deferred components.

It should be:

# Architecture Specification and Evaluation Foundation

## Deliverables

### Documentation consolidation

* authoritative current architecture,
* canonical data contracts,
* simulation model catalogue,
* persistence lifecycle,
* schema/version matrix,
* active roadmap,
* superseded-document markers.

### TDD-support structures

* functional and non-functional requirement records,
* API worksheet,
* data-model worksheet,
* architecture flow definitions,
* structured ADRs.

### Provenance

* engine version in completed runs,
* challenge/content version,
* scenario model version,
* comparison compatibility checks.

### Deterministic evaluation foundation

* reusable rules,
* explicit applicability conditions,
* evidence references,
* confidence,
* exceptions,
* no universal topology assumptions.

### Comparison mode

* only compare runs with compatible engine/model versions,
* show absolute and percentage differences,
* attribute major changes to nodes, edges, and configuration changes.

### Complete current editor gaps

* project management,
* multi-select,
* clipboard operations,
* Region containment,
* test coverage.

This milestone produces greater leverage than adding WebSocket, Search Engine, or Media Processor immediately. It makes future capability packs safer, more testable, and easier to evaluate.

---

# 26. Proposed authoritative TDD structure

A project-level TDD should contain:

## 1. Context and objective

* user problem,
* product scope,
* non-goals,
* current application constraints.

## 2. Functional requirements

* editor,
* simulation,
* learning,
* evaluation,
* persistence.

## 3. Non-functional requirements

* determinism,
* performance,
* compatibility,
* accessibility,
* security,
* recoverability,
* explainability.

## 4. System architecture

* runtime context,
* module boundaries,
* main-thread/worker separation,
* state ownership.

## 5. Domain model

* architecture document,
* components,
* edges,
* scenarios,
* runs,
* learning content,
* attempts,
* evaluations.

## 6. Data flows

* editing,
* persistence,
* import/export,
* simulation,
* challenge completion,
* comparison.

## 7. Contracts and schemas

* schema versions,
* migration rules,
* worker protocol,
* repository interfaces,
* content validation.

## 8. Simulation models

* formulas,
* assumptions,
* caps,
* unsupported behavior,
* provenance.

## 9. Security and privacy

* import safety,
* Markdown sanitization,
* local storage,
* future account boundary.

## 10. Failure handling

* worker crash,
* storage failure,
* invalid migration,
* corrupt project,
* quota exhaustion,
* partial challenge state.

## 11. Observability

* application diagnostics,
* simulation evidence,
* support bundle.

## 12. Testing and traceability

* unit,
* component,
* engine,
* migration,
* E2E,
* performance,
* requirement-to-test matrix.

## 13. Rollout and compatibility

* release versions,
* migration support,
* feature flags,
* rollback.

## 14. Risks and unresolved decisions

* explicit owners,
* decision deadline,
* impact.

---

# Final conclusion

Blue Garden does not primarily lack features. It lacks a consolidated architectural contract that accurately reflects what is already implemented and controls how future features are added.

The most important improvements are:

1. establish one authoritative current specification;
2. version simulation semantics, not only document schemas;
3. add explicit architecture flows, API design, data models, and ADRs;
4. formalize persistence, security, accessibility, and failure behavior;
5. complete current editor gaps before expanding the component catalogue;
6. build deterministic evaluation with applicability, evidence, exceptions, and confidence;
7. require every new component to ship as a complete simulation-and-learning capability pack.

**Confidence:** high for the document-level findings; medium for conclusions about actual code completeness because the repository itself was not inspected.
# Codex Implementation Prompt: Expand Blue Garden into a Structured System-Design Learning and Simulation Platform

## Implementation status — first vertical slice

The first deep-integration milestone is implemented on architecture schema `1.4`:

- Typed, Zod-validated registries cover challenges, templates, concepts, lessons, rubrics, questions, tips, and local source references.
- The five Phase 3 challenges remain compatible; Cache Stampede is the sixth challenge and template.
- Cache configuration includes TTL, stale window, TTL jitter, request coalescing, distributed locking, bounded lock timing, and background refresh.
- Worker supports a `cache-refresh` role.
- `CACHE_KEY_EXPIRATION` models origin amplification, protected rebuilds, stale serving, synchronized expiration, and refresh-worker availability.
- Learning attempts persist run snapshots and expose neutral before/after metrics and rubric evidence.
- Recommended components and contextual Learning guidance are integrated into the component library and Inspector.

WebSocket Gateway, Search Engine, Media Processor, External API, Browser Worker, and Repair Worker remain deferred until their simulator capability packs. Existing Sharding, Monitoring, and Message Queue types remain the canonical shard-router, observability, and durable asynchronous primitives.

## Role

Act as a senior TypeScript, React, system-design simulation, and educational-product engineer.

You are modifying an existing, functional application named **Blue Garden**. Do not rebuild the project, replace its architecture, or introduce unnecessary infrastructure.

Your task is to extend the existing application so it can support a growing library of system-design interview questions, guided tutorials, reusable teaching content, deterministic simulations, challenge evaluation, and automated tests.

Implement production-quality code incrementally and preserve compatibility with existing saved architecture documents.

---

# 1. Existing Application Context

Blue Garden is a browser-based system-design learning application.

Users currently can:

* Build architectures on a React Flow canvas
* Add and configure components
* Connect components using operational edges
* Create scenarios
* Run deterministic simulations in a Web Worker
* Inspect latency, load, failures, bottlenecks, retries, queues, caching, sharding, and cost
* Receive diagnostic and educational guidance
* Save locally in IndexedDB
* Import and export architecture JSON
* Review recent simulation runs

Current stack:

* React 19
* TypeScript
* Vite
* React Flow
* Zustand
* Zod
* Dexie and IndexedDB
* Web Workers
* Vitest
* Testing Library
* Playwright
* ESLint
* Prettier

Existing major code areas:

```text
src/app/App.tsx
src/domain/architecture/
src/domain/components/
src/domain/simulation/
src/features/canvas/
src/features/component-library/
src/features/inspector/
src/features/projects/
src/features/scenarios/
src/features/simulation/
src/engine/
src/storage/database.ts
tests/e2e/
```

Current architecture schema version:

```text
1.3
```

Any document schema modification must:

* Increment the schema version
* Include migration logic
* Preserve import compatibility for versions `1.0` through `1.3`
* Include deterministic migration tests
* Reject malformed documents safely

---

# 2. Primary Objective

Create the reusable domain structures, UI components, simulation capabilities, content system, tutorial system, and tests required to support system-design learning challenges.

The application must be able to represent questions such as:

* API rate limiter
* Marketplace like Airbnb
* Object storage like S3
* Load balancer versus API gateway
* Horizontal versus vertical scaling
* Cache invalidation
* URL shortener
* Chat application
* Social media feed
* Database sharding
* Cache stampede prevention
* File upload service
* Web scraper
* Slow API debugging
* Write-through versus write-behind caching

Do not hardcode each challenge directly into React components.

Build a reusable, validated content and simulation framework that allows future challenges to be added primarily through structured content files.

---

# 3. Product Principle

The application should teach through this loop:

```text
Read challenge
→ inspect concepts
→ build architecture
→ configure components
→ run scenario
→ observe behavior
→ diagnose problems
→ modify design
→ compare result
→ answer follow-up questions
```

The simulator remains:

* Deterministic
* Educational
* Explainable
* Approximate
* Not a production capacity planner
* Not a full distributed-systems emulator

Never present estimated simulation results as guaranteed production behavior.

---

# 4. Non-Goals

Do not implement:

* Backend accounts
* Cloud synchronization
* Real-time collaboration
* Public publishing
* AI-generated scoring
* LLM integration
* Infrastructure-as-code import
* Exact cloud-provider cost replication
* Full mobile canvas editing
* A new graph-rendering engine
* A second persistence system
* A second simulation engine

Do not replace React Flow, Zustand, Zod, Dexie, or the existing Web Worker engine.

---

# 5. Implementation Strategy

Implement the work in phases.

Each phase must leave the project compilable and testable.

Prefer small, cohesive modules over one large challenge engine.

Use strict TypeScript.

Avoid `any`.

Use discriminated unions where appropriate.

All content entering the application must be validated with Zod.

---

# 6. Phase 1: Structured Learning Content Domain

Create a new domain area:

```text
src/domain/learning/
```

Recommended structure:

```text
src/domain/learning/
  challengeTypes.ts
  challengeSchema.ts
  challengeRegistry.ts

  conceptTypes.ts
  conceptSchema.ts
  conceptRegistry.ts

  lessonTypes.ts
  lessonSchema.ts

  rubricTypes.ts
  rubricSchema.ts

  questionTypes.ts
  questionSchema.ts

  teachingTipTypes.ts
  teachingTipSchema.ts

  validation.ts
  selectors.ts
```

Create content directories:

```text
src/content/
  challenges/
  concepts/
  lessons/
  rubrics/
  questions/
  tips/
  templates/
```

Content may initially be authored as TypeScript objects or JSON imported into TypeScript, but all content must pass Zod validation at application startup or test time.

---

## 6.1 Challenge Schema

Implement a reusable challenge definition.

```ts
export interface LearningChallenge {
  id: string;
  slug: string;
  title: string;
  summary: string;
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  estimatedMinutes: number;
  status: 'draft' | 'reviewed' | 'published';
  version: number;

  learningObjectives: string[];
  prompt: string;

  functionalRequirements: string[];
  nonFunctionalRequirements: string[];
  clarifyingQuestions: ClarifyingQuestion[];

  scaleAssumptions?: ScaleAssumption[];
  conceptIds: string[];
  recommendedComponentTypes: string[];

  starterTemplateId?: string;
  scenarioPresetIds: string[];
  rubricId: string;

  interviewerQuestionIds: string[];
  teachingTipIds: string[];

  commonWeaknesses: string[];
  completionCriteria: ChallengeCompletionCriterion[];

  tags: string[];
}
```

Create supporting types for:

* Clarifying questions
* Scale assumptions
* Completion criteria
* Challenge phases
* Optional hidden scenario triggers
* Optional required design-note categories

The schema must validate referenced IDs through registry-level validation.

---

## 6.2 Concept Schema

Create reusable concept definitions.

Examples:

* Fan-out on read
* Fan-out on write
* Token bucket
* Write-through caching
* Write-behind caching
* Consistent hashing
* Virtual nodes
* Cache stampede
* Request coalescing
* Stale-while-revalidate
* Signed URLs
* Strong consistency
* Eventual consistency
* Replication
* Sharding
* Temporary booking hold
* Distributed tracing

Suggested shape:

```ts
export interface LearningConcept {
  id: string;
  title: string;
  summary: string;
  explanation: string;

  advantages: string[];
  limitations: string[];
  useCases: string[];
  unsuitableUseCases: string[];

  relatedConceptIds: string[];
  relatedComponentTypes: string[];

  simulatorImplications?: string[];
  commonMisconceptions: string[];
}
```

Concepts must be reusable across challenges.

Do not duplicate the same explanation inside multiple challenge files.

---

## 6.3 Interviewer Question Schema

Create reusable follow-up questions.

```ts
export interface InterviewerQuestion {
  id: string;
  category:
    | 'requirements'
    | 'architecture'
    | 'scalability'
    | 'reliability'
    | 'consistency'
    | 'security'
    | 'operations'
    | 'trade-offs';

  question: string;
  expectedSignals: string[];
  warningSignals: string[];
  relatedConceptIds: string[];
}
```

These questions are educational prompts, not AI-generated dialogue.

---

## 6.4 Teaching Tip Schema

Tips must be contextual and optionally triggered by architecture or simulation evidence.

```ts
export interface TeachingTip {
  id: string;
  title: string;
  content: string;
  severity: 'info' | 'warning' | 'critical';

  challengeIds?: string[];
  conceptIds?: string[];
  componentTypes?: string[];

  trigger?: TeachingTipTrigger;
}
```

Supported trigger categories should include:

* Missing component type
* Missing redundancy
* Node utilization threshold
* Edge latency threshold
* Queue depth threshold
* Cache hit-rate threshold
* Cache failure
* Hot shard
* Retry amplification
* Database bottleneck
* Fan-out backlog
* Persistence lag
* Stale-read event
* Missing design note type

Keep trigger evaluation deterministic.

---

# 7. Phase 2: Challenge Workspace and Tutorial Mode

Add a challenge-learning mode without replacing the existing free canvas.

Recommended feature directory:

```text
src/features/learning/
  ChallengeBrowser.tsx
  ChallengeWorkspace.tsx
  ChallengeOverview.tsx
  ChallengeRequirements.tsx
  ChallengeProgress.tsx
  ConceptDrawer.tsx
  InterviewerQuestionsPanel.tsx
  ChallengeResults.tsx
  useChallengeSession.ts
```

---

## 7.1 Challenge Browser

Create a screen or drawer where users can:

* Browse available challenges
* Search by title
* Filter by difficulty
* Filter by concept
* View estimated completion time
* Start a challenge
* Resume an existing local attempt

Initially include only a small curated set, not every possible challenge.

Recommended first challenges:

1. API rate limiter
2. Social media feed
3. Database sharding
4. Cache stampede
5. File upload service
6. Slow API request debugging

These collectively exercise most new components and simulation capabilities.

---

## 7.2 Challenge Session

A challenge attempt must store:

```ts
export interface ChallengeAttempt {
  id: string;
  challengeId: string;
  challengeVersion: number;
  architectureId: string;

  startedAt: string;
  updatedAt: string;
  completedAt?: string;

  currentPhase:
    | 'overview'
    | 'requirements'
    | 'design'
    | 'simulation'
    | 'review';

  answeredQuestionIds: string[];
  acknowledgedConceptIds: string[];
  completedScenarioIds: string[];

  status: 'active' | 'completed' | 'abandoned';
}
```

Persist attempts in IndexedDB separately from architecture documents.

Do not add transient challenge UI state to exported architecture JSON.

---

## 7.3 Guided Phases

Support these phases:

### Overview

Show:

* Challenge summary
* Learning objectives
* Difficulty
* Expected time
* Main concepts

### Requirements

Show:

* Functional requirements
* Non-functional requirements
* Clarifying questions
* Scale assumptions

Users should be able to add selected requirements and assumptions as typed design notes.

### Design

Open the normal canvas with:

* Recommended components highlighted in the library
* Optional starter template
* Relevant concepts available in a drawer
* No forced architecture solution

### Simulation

Show:

* Recommended scenario presets
* Why each scenario matters
* Required observable metrics
* Completion state for scenarios already run

### Review

Show:

* Deterministic findings
* Rubric coverage
* Common weaknesses detected
* Unanswered interviewer questions
* Before-and-after simulation comparison

---

# 8. Phase 3: Reusable Starter Templates

Implement native architecture templates.

Create:

```text
src/domain/templates/
src/content/templates/
src/features/templates/
```

A template should include:

```ts
export interface ArchitectureTemplate {
  id: string;
  title: string;
  description: string;
  challengeIds: string[];
  conceptIds: string[];

  architecture: ArchitectureDocument;
  explanation: string;
  assumptions: string[];
}
```

Templates must:

* Be immutable source assets
* Be copied into a new project when selected
* Never be edited in place
* Pass architecture schema validation
* Include deterministic node and edge IDs
* Be independently testable

Initial templates:

* Basic cached API
* Horizontally scaled API
* Feed fan-out architecture
* Sharded database
* Direct file upload
* Observable API request path

---

# 9. Phase 4: Expand Component Definitions

The current component registry must remain the single source of component definitions.

Extend component definitions with optional structured capabilities.

```ts
export interface ComponentLearningMetadata {
  conceptIds: string[];
  primaryUseCases: string[];
  limitations: string[];
  failureModes: string[];
  commonMisconfigurations: string[];
  relevantChallengeIds: string[];
}
```

Do not place challenge-specific behavior inside React node components.

Add the following new component types only where they provide distinct simulation or teaching behavior.

---

## 9.1 New Components to Add

### WebSocket Gateway

Teaching purpose:

* Persistent connections
* Real-time message delivery
* Connection capacity

Configuration:

* Maximum concurrent connections
* Messages per second
* Connection setup latency
* Failure state

---

### Search Engine

Teaching purpose:

* Text search
* Geospatial queries
* Faceted filtering
* Eventually consistent indexing

Configuration:

* Query capacity
* Index write capacity
* Query latency
* Indexing delay
* Replica count

---

### Media Processor

Teaching purpose:

* Image resizing
* Video transcoding
* Processing queues

Configuration:

* Worker count
* Processing throughput
* Processing latency
* Failure probability

---

### External API

Teaching purpose:

* Third-party latency
* Timeouts
* retries
* circuit breaking

Configuration:

* Base latency
* Failure probability
* Timeout
* Rate limit
* Availability

---

### Browser Worker

Teaching purpose:

* JavaScript rendering
* Expensive scraping workload

Configuration:

* Worker count
* Page-load latency
* Memory capacity
* Maximum concurrent sessions

---

### Shard Router

Teaching purpose:

* Shard-key routing
* Modulo hashing
* Consistent hashing
* Shard-map lookup

Configuration:

* Strategy
* Shard key
* Virtual-node count
* Routing latency

---

### Repair Worker

Teaching purpose:

* Replica repair
* Under-replicated object recovery

Configuration:

* Worker count
* Repair throughput
* Maximum concurrent repairs
* Bandwidth limit

---

### Observability / Tracing Service

The current monitoring component may be extended rather than duplicated.

Add optional configuration:

* Metrics enabled
* Logs enabled
* Tracing enabled
* Trace sampling rate
* Retention

Teaching purpose:

* Request-span analysis
* Dependency latency diagnosis
* P95 and P99 analysis

---

### Optional Durable Log

Only add this as a distinct component if the current message queue cannot represent durable ordered write-behind behavior clearly.

Teaching purpose:

* Durable buffering
* Ordered event processing
* Persistence lag

Otherwise, extend the existing message queue with an ordered durable mode.

---

## 9.2 Components That Should Be Extended

Extend existing component definitions where appropriate.

### Cache

Add optional fields:

```ts
cacheStrategy:
  | 'cache-aside'
  | 'write-through'
  | 'write-behind'
  | 'read-through';

ttlSeconds: number;
staleWindowSeconds: number;
ttlJitterPercent: number;
requestCoalescingEnabled: boolean;
lockingEnabled: boolean;
lockTimeoutMs: number;
backgroundRefreshEnabled: boolean;
persistent: boolean;
replicationFactor: number;
```

Do not show all fields in Basic mode.

Use Basic, Advanced, and Expert inspector sections where necessary.

---

### SQL Database

Add optional fields:

```ts
indexEnabled: boolean;
connectionPoolSize: number;
baseQueryLatencyMs: number;
replicaCount: number;
shardCount: number;
writeDurability:
  | 'memory'
  | 'single-node'
  | 'replicated';
```

---

### Application Server

Add optional fields:

```ts
stateless: boolean;
localSessionState: boolean;
eventLoopCapacity?: number;
maximumConcurrentRequests: number;
```

---

### Object Storage

Add optional fields:

```ts
directUploadEnabled: boolean;
multipartUploadEnabled: boolean;
replicationFactor: number;
writeAcknowledgements: number;
checksumValidationEnabled: boolean;
```

---

### Worker

Add optional fields:

```ts
workerRole:
  | 'generic'
  | 'fan-out'
  | 'cache-refresh'
  | 'write-behind'
  | 'repair'
  | 'media-processing'
  | 'scraper';

batchSize: number;
maximumConcurrency: number;
```

Use presets to reduce inspector complexity.

---

# 10. Phase 5: Expand Edge Semantics

Preserve the current edge model and add optional semantics only where needed.

Suggested additions:

```ts
export interface ExtendedEdgeConfig {
  operationType?:
    | 'request'
    | 'replication'
    | 'refresh'
    | 'repair'
    | 'indexing'
    | 'upload'
    | 'download';

  acknowledgementRequired?: boolean;
  durableDelivery?: boolean;
  orderingKey?: string;
}
```

Do not make every edge require these fields.

Defaults must preserve current simulation behavior.

---

# 11. Phase 6: Simulation Engine Extensions

Extend the existing deterministic aggregate simulation engine.

Do not create a separate challenge simulator.

Each new model must be:

* Deterministic for the same input
* Explainable
* Unit tested
* Bounded against numerical explosion
* Compatible with existing scenarios

Create explicit engine modules rather than embedding logic in UI components.

Recommended structure:

```text
src/engine/models/
  cacheModel.ts
  databaseModel.ts
  fanOutModel.ts
  shardingModel.ts
  writeBehindModel.ts
  objectStorageModel.ts
  scrapingModel.ts
  tracingModel.ts
```

---

## 11.1 Cache Stampede Model

Support:

* Cache expiration
* Cache misses
* Stale window
* Request locking
* Request coalescing
* Background refresh
* TTL jitter
* Cache failure
* Database fallback

Metrics:

* Coalesced request count
* Lock wait time
* Stale responses
* Rebuild count
* Rebuild failures
* Cache stampede amplification
* Database fallback load

Important behavior:

```text
effective backend refresh requests
=
miss requests
without protection

or

approximately one request per matching key and coordination scope
with request coalescing
```

Model request coalescing scope explicitly:

* Per application instance by default
* Distributed only when configured

---

## 11.2 Feed Fan-Out Model

Support:

* Fan-out on read
* Fan-out on write
* Hybrid strategy
* Configurable celebrity threshold
* Follower count
* Fan-out worker throughput
* Queue backlog
* Feed freshness delay

Metrics:

* Fan-out operations
* Queue depth
* Feed freshness delay
* Feed-cache writes
* Feed read latency
* Database read load

Hybrid behavior:

* Accounts below threshold use fan-out on write
* Accounts above threshold remain in author timelines
* Feed reads merge precomputed and high-follower content

---

## 11.3 Sharding Model

Extend existing sharding support.

Add:

* Modulo hashing
* Consistent hashing
* Virtual-node count
* Shard capacity
* Hot-key or hot-tenant traffic
* Rebalancing data movement
* Rebalancing bandwidth
* Shard-map version

Metrics:

* Distribution imbalance
* Traffic imbalance
* Records per shard
* Data moved
* Rebalancing duration
* Hot-shard ratio
* Scatter-gather requests

The model does not need to hash millions of real keys.

Use deterministic aggregate buckets or synthetic key distributions.

---

## 11.4 Write-Behind Model

Support:

* Write-through
* Write-behind
* Buffer durability
* Worker throughput
* Flush interval
* Batch size
* Persistence lag
* Retry behavior
* Dead-letter count
* Buffer capacity
* Database outage

Metrics:

* User-facing write latency
* Persistence lag
* Buffer depth
* Data-loss estimate
* Retry count
* Duplicate-write count
* Out-of-order-write count

Only report data loss when the configured acknowledgement policy permits it.

Do not imply that every cache is durable.

---

## 11.5 File Upload Model

Support two paths:

### Proxy upload

```text
Client → API server → object storage
```

### Direct upload

```text
Client → signed URL control request
Client → object storage data transfer
```

Metrics:

* API bandwidth
* Object-storage bandwidth
* Upload latency
* Active upload connections
* Failed uploads
* Multipart retry volume

Add optional multipart behavior without modeling individual file bytes.

---

## 11.6 Object Storage Replication Model

Support:

* Placement across storage nodes
* Replication factor
* Write acknowledgements
* Node failure
* Under-replicated objects
* Repair throughput
* Repair bandwidth
* Checksum corruption event

Metrics:

* Under-replicated objects
* Unavailable objects
* Repair queue
* Repair completion time
* Storage utilization
* Failed reads and writes

---

## 11.7 Slow Request and Tracing Model

Add per-request-path latency attribution using aggregate spans.

Example output:

```ts
export interface TraceBreakdown {
  totalLatencyMs: number;
  spans: Array<{
    componentId: string;
    edgeId?: string;
    operation: string;
    latencyMs: number;
    contributionPercent: number;
  }>;
}
```

The system may generate a representative trace from aggregate simulation state.

It does not need to store every simulated request.

Support diagnosis of:

* Slow database query
* Missing index
* Connection-pool waiting
* Slow external API
* Cache miss
* Retry amplification
* Sequential dependency chain
* Application saturation

---

## 11.8 Web Scraper Model

Support:

* Scheduler
* Queue
* HTTP scraper worker
* Browser worker
* Parser
* Per-domain rate limiter
* Retry with backoff
* Parser failure
* Source outage

Metrics:

* Queue depth
* Fetch success rate
* HTTP status distribution
* Retry count
* Browser-worker utilization
* Parser failures
* Records extracted
* Data freshness

Keep the implementation generic and educational.

Do not implement real web scraping or external network access.

---

# 12. Phase 7: New Scenario Event Types

Extend scenario event schemas with optional new event types.

Recommended additions:

```ts
type ScenarioEvent =
  | ExistingScenarioEvent
  | {
      type: 'cache-key-expiration';
      componentId: string;
      popularityMultiplier: number;
    }
  | {
      type: 'component-latency-change';
      componentId: string;
      latencyMs: number;
      durationSeconds?: number;
    }
  | {
      type: 'worker-throughput-change';
      componentId: string;
      throughputMultiplier: number;
      durationSeconds?: number;
    }
  | {
      type: 'follower-count-change';
      componentId: string;
      followerCount: number;
    }
  | {
      type: 'shard-topology-change';
      componentId: string;
      shardCount: number;
    }
  | {
      type: 'cache-invalidation-failure';
      componentId: string;
    }
  | {
      type: 'data-corruption';
      componentId: string;
      affectedPercent: number;
    };
```

Only add events that can produce visible educational behavior.

Every event must include:

* Zod validation
* Editor support
* Engine handling
* Deterministic tests
* User-readable description

---

# 13. Phase 8: Evaluation and Rubric Engine

Build a deterministic challenge evaluator.

Recommended directory:

```text
src/domain/evaluation/
  evaluationTypes.ts
  evaluationRules.ts
  evaluateChallenge.ts
  evidenceSelectors.ts
  rubricScoring.ts
```

The evaluator must inspect structured data:

* Architecture nodes
* Edges
* Configuration
* Design notes
* Saved scenarios
* Simulation results
* Challenge completion data

Do not inspect screenshots or canvas images.

---

## 13.1 Evaluation Result

```ts
export interface ChallengeEvaluation {
  challengeId: string;
  attemptId: string;

  completedCriteria: EvaluationFinding[];
  missingCriteria: EvaluationFinding[];
  warnings: EvaluationFinding[];
  strengths: EvaluationFinding[];

  rubricScores: RubricDimensionScore[];
  totalScore?: number;

  evidence: EvaluationEvidence[];
}
```

The score is secondary.

The primary output is diagnostic evidence.

---

## 13.2 Evaluation Rule Examples

Implement reusable rules such as:

* Required component exists
* Required component is connected
* Database has replication
* Application layer has horizontal redundancy
* Load balancer has multiple backends
* Cache has explicit invalidation or TTL
* Queue has retry or dead-letter behavior
* Retry path lacks circuit breaker
* Write-behind buffer is not durable
* Feed uses pure fan-out on write for extreme follower count
* Sharding uses weak shard-key distribution
* Consistent hashing has too few virtual nodes
* File bytes pass through API server
* Slow external dependency lacks timeout
* Cache outage overloads database
* No monitoring or tracing component
* No relevant failure scenario saved
* No trade-off design note

Rules should return evidence referencing component or edge IDs.

---

# 14. Phase 9: Comparison Mode

Add a lightweight simulation comparison capability.

Users should be able to compare two completed runs from the same architecture or challenge attempt.

Display:

* P95 latency difference
* Throughput difference
* Error-rate difference
* Queue-depth difference
* Database-load difference
* Cost difference
* Challenge-specific metrics

Examples:

* Fan-out on read versus fan-out on write
* Cache locking disabled versus enabled
* Proxy upload versus direct upload
* Write-through versus write-behind
* Modulo sharding versus consistent hashing

Do not build a complex branching/version-control system in this phase.

Use the existing recent-run storage where possible.

---

# 15. Phase 10: Initial Curated Content

After the framework is implemented, add six complete challenges.

---

## Challenge A: API Rate Limiter

Concepts:

* Token bucket
* Redis-style cache
* Atomic operation
* Fail-open versus fail-closed
* Control plane versus data plane

Required components:

* Client
* API gateway or load balancer
* Application server
* Cache
* SQL database
* Monitoring

Scenarios:

* Traffic spike
* Cache failure
* Hot API key

---

## Challenge B: Social Media Feed

Concepts:

* Fan-out on read
* Fan-out on write
* Hybrid fan-out
* Queue backlog
* Eventual consistency

Required components:

* Post service
* Social graph representation
* Feed cache
* Message queue
* Fan-out worker
* Feed service

Scenarios:

* Celebrity post
* Fan-out worker slowdown
* Feed cache failure

---

## Challenge C: Database Sharding

Concepts:

* Shard key
* Modulo hashing
* Consistent hashing
* Virtual nodes
* Hot shards
* Rebalancing

Required components:

* Application server
* Shard router
* Multiple SQL or NoSQL shards
* Monitoring

Scenarios:

* Add shard
* Remove shard
* Hot tenant
* Shard outage

---

## Challenge D: Prevent Cache Stampede

Concepts:

* Cache locking
* Request coalescing
* Stale-while-revalidate
* Background refresh
* TTL jitter

Required components:

* Application server
* Cache
* SQL database
* Worker
* Monitoring

Scenarios:

* Popular-key expiration
* Slow rebuild
* Cache outage
* Synchronized key expiration

---

## Challenge E: File Upload Service

Concepts:

* Metadata versus file content
* Signed URL
* Direct upload
* Multipart upload
* Authorization

Required components:

* Client
* API service
* SQL database
* Object storage
* Optional worker

Scenarios:

* Proxy upload
* Direct upload
* Expired upload URL
* Interrupted multipart upload
* Unauthorized download

---

## Challenge F: Debug Slow API

Concepts:

* Metrics
* Distributed tracing
* Database indexes
* Connection pools
* External dependency timeouts
* Asynchronous processing

Required components:

* Load balancer
* Application server
* SQL database
* Cache
* External API
* Optional message queue
* Monitoring or tracing

Scenarios:

* Missing index
* Slow external API
* Connection-pool exhaustion
* Add servers without fixing database
* Move noncritical work to queue

---

# 16. UX Requirements

Maintain the current desktop-oriented layout.

Do not overcrowd the canvas.

Use:

* Drawers
* Collapsible panels
* Tabs
* Contextual cards
* Progressive configuration

Recommended integration:

## Top Bar

Add:

* Challenge selector
* Current challenge progress
* Exit challenge mode

## Left Panel

Add:

* Recommended component indicator
* Challenge-relevant filter
* Concept associations

## Right Inspector

Add a `Learning` tab containing:

* Why this component matters
* Relevant concepts
* Common failure modes
* Challenge-specific tips

Do not mix simulation configuration with long educational prose in one section.

## Bottom Panel

Add tabs:

* Metrics
* Events
* Diagnostics
* Challenge review
* Run comparison

## Challenge Drawer

Show:

* Requirements
* Concepts
* Scenarios
* Interviewer questions
* Progress

---

# 17. Accessibility and Interaction

All new UI must:

* Be keyboard accessible
* Use semantic controls
* Preserve visible focus
* Include labels for icons
* Avoid color-only state communication
* Respect reduced-motion preferences
* Support scrolling without trapping focus

Do not reduce existing canvas accessibility.

---

# 18. Persistence Requirements

Add Dexie tables for:

* Challenge attempts
* Challenge progress
* Optional local content completion state

Do not store static challenge definitions in IndexedDB.

Static curated content should ship with the application.

Persist only user-specific progress.

Suggested schema:

```ts
challengeAttempts: '&id, challengeId, architectureId, updatedAt, status'
```

Add a Dexie migration if the database schema changes.

---

# 19. Architecture Document Schema

Only add fields to the architecture document when they are part of the portable architecture itself.

Potential additions:

```ts
learningMetadata?: {
  sourceTemplateId?: string;
  challengeId?: string;
  challengeVersion?: number;
};
```

Do not export:

* Open challenge panel
* Current tutorial phase UI
* Temporary question answers
* Active diagnostics
* Current trace selection
* Run comparison selection

Challenge attempt state belongs in IndexedDB.

If architecture schema changes, increment from `1.3` to `1.4`.

---

# 20. Testing Requirements

Every phase must include tests.

---

## 20.1 Unit Tests

Add tests for:

* Every new Zod schema
* Registry reference validation
* Challenge completion logic
* Evaluation rules
* Scenario-event validation
* Content selectors
* Template validation
* Migration logic

---

## 20.2 Engine Tests

Add deterministic tests for:

* Cache stampede without protection
* Request coalescing
* Stale-while-revalidate
* TTL jitter
* Fan-out queue growth
* Hybrid celebrity handling
* Modulo rebalancing
* Consistent-hashing rebalancing
* Virtual-node balance
* Write-through latency
* Write-behind persistence lag
* Buffer failure
* Direct-upload bandwidth
* Storage-node repair
* Slow dependency trace attribution

Every engine test must use fixed inputs and exact or bounded expected outputs.

---

## 20.3 Component Tests

Add tests for:

* Challenge browser
* Challenge workspace
* Requirements panel
* Concept drawer
* Scenario recommendations
* Evaluation results
* Inspector learning tab
* Run comparison view

---

## 20.4 End-to-End Tests

Add Playwright tests for at least these workflows:

### Cache Stampede Challenge

1. Open challenge
2. Load starter template
3. Run popular-key expiration
4. Observe database overload
5. Enable request coalescing
6. Re-run
7. Confirm improved backend load

### File Upload Challenge

1. Open challenge
2. Run proxy-upload scenario
3. Enable direct upload
4. Re-run
5. Confirm lower API bandwidth

### Database Sharding Challenge

1. Start with modulo hashing
2. Add a shard
3. Observe high data movement
4. Switch to consistent hashing
5. Add a shard again
6. Confirm reduced movement

Use stable test IDs only where semantic selectors are insufficient.

---

# 21. Performance Requirements

Avoid recomputing all challenge evaluations on every pointer movement.

Use memoized selectors.

Evaluation may run when:

* Architecture transaction completes
* Simulation completes
* Challenge panel opens
* Relevant settings change

Simulation logic must remain in the Web Worker.

Do not place simulation loops in React components.

Large content registries should not cause repeated deep parsing during rendering.

Validate static content once during initialization or tests.

---

# 22. Code Quality Rules

Follow the existing project conventions.

Required:

* Strict TypeScript
* Named domain types
* Small pure functions
* No hidden mutation
* Zod validation at boundaries
* Deterministic simulation
* Clear error states
* No swallowed exceptions
* No duplicated challenge logic
* No business logic inside visual components
* No direct IndexedDB calls from presentation components

Use comments only for non-obvious reasoning.

Do not create abstractions without at least two real consumers unless needed for architectural boundaries.

---

# 23. Delivery Order

Implement in this exact order:

1. Learning content schemas and validation
2. Challenge registry with one sample challenge
3. Challenge browser and workspace shell
4. Challenge-attempt persistence
5. Template domain and one starter template
6. Learning metadata extensions for existing components
7. Cache simulation extensions
8. Cache stampede challenge end-to-end
9. Sharding simulation extensions
10. Database sharding challenge
11. Feed fan-out simulation
12. Social feed challenge
13. Direct-upload simulation
14. File upload challenge
15. Tracing and slow-request diagnostics
16. Slow API challenge
17. Evaluation rubric engine
18. Run comparison
19. Remaining curated challenge content
20. Broader tests and cleanup

Do not attempt all features in one large change.

---

# 24. First Implementation Milestone

For the first milestone, implement only:

* Learning content schemas
* Registry validation
* Challenge browser
* Challenge workspace shell
* Challenge-attempt IndexedDB persistence
* Learning tab in the Inspector
* Cache stampede simulation extensions
* Cache stampede challenge
* Cache stampede starter template
* Evaluation rules for that challenge
* Unit, engine, component, and Playwright tests

The first milestone is complete when a user can:

1. Open the cache stampede challenge.
2. Read its requirements and concepts.
3. Load a starter architecture.
4. Run a popular-key expiration scenario.
5. Observe cache misses and database amplification.
6. Enable cache locking, request coalescing, stale-while-revalidate, or TTL jitter.
7. Re-run the simulation.
8. Compare the result.
9. See deterministic educational findings.
10. Resume the challenge after refreshing the browser.

---

# 25. Acceptance Criteria

The implementation is acceptable only when:

* Existing free-canvas functionality still works
* Existing architecture files import correctly
* Invalid content is rejected with actionable errors
* Challenge content is independent from React UI code
* Simulation remains deterministic
* New components integrate with the existing registry
* New scenarios use the existing scenario editor architecture
* Challenge progress persists locally
* Starter templates produce independent editable projects
* Evaluation findings include evidence
* No AI or external backend is required
* All quality commands pass

Run:

```bash
npm run lint
npm test
npm run test:e2e
npm run format:check
npm run build
```

---

# 26. Required Output from Codex

Before modifying code:

1. Inspect the repository structure.
2. Identify the exact existing types and extension points.
3. Summarize the proposed file changes.
4. Note any conflict between this prompt and the current code.
5. Choose the smallest compatible implementation.

Then implement the first milestone.

After implementation, report:

* Files added
* Files modified
* Schema changes
* Migration behavior
* Engine behavior added
* Tests added
* Commands executed
* Remaining limitations
* Recommended next milestone

Do not claim tests passed unless they were executed successfully.
