# Codex Implementation Prompt: Expand Blue Garden into a Structured System-Design Learning and Simulation Platform

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
