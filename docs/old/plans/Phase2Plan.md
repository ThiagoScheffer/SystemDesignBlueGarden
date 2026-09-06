# Phase 2 Plan — Deterministic Browser Simulator

Status: Implemented

## 1. Phase outcome

Phase 2 completes the product's first differentiating loop:

> Build an architecture → run traffic or an incident → observe the bottleneck → modify the design → rerun and verify the improvement.

At the end of this phase, a user can select or create a traffic scenario, run it against an immutable snapshot of the open architecture, watch utilization and failures on the canvas, inspect an explainable metric timeline, and identify the component or connection responsible for degraded performance.

The simulator is an educational approximation. Results must be labeled as estimates derived from the configured model, not production predictions.

## 2. Included and deferred scope

### Included

- Deterministic, aggregate discrete-event simulation in a Web Worker.
- One-second virtual-time resolution.
- Run, pause, resume, reset, and speed controls.
- Preflight validation and actionable warnings.
- Baseline traffic plus six incident presets.
- Custom scenario timeline editing using the supported event types.
- Capacity, utilization, queue, latency, failure, throughput, Cache, Sharding, and cost behavior.
- Global and per-node metrics.
- Canvas status overlays and a bottom simulation panel.
- Explainable event log and bottleneck findings.
- Scenario persistence in architecture JSON.
- Local persistence for the ten most recent completed runs per architecture.
- Deterministic unit fixtures, worker tests, component tests, and Playwright acceptance flows.

### Explicitly deferred

- Packet-level, protocol-level, or infrastructure emulation.
- Autoscaling, replicas, failover, consistency, and replication lag.
- Regional outage semantics beyond targeting the nodes contained by a Region.
- Security incidents, deployment incidents, and cost-budget enforcement.
- AI evaluation or deterministic architecture lint scoring.
- Multiplayer simulation and server-side execution.
- Cross-run visual comparison beyond showing the latest run and previous summary.
- Statistical confidence intervals or claims of production accuracy.

## 3. Technical approach

### Aggregate deterministic engine

The engine processes aggregate request batches instead of individual requests. A 20,000 requests/second workload creates one batch per source per virtual second rather than 20,000 request events. This bounds runtime and memory while preserving the relationships the product needs to teach.

Each virtual second executes these stages:

1. Apply scenario events scheduled for the current timestamp.
2. Generate traffic batches at configured Client nodes.
3. Traverse reachable operational nodes in topological order.
4. Apply available capacity, persistent backlog, queue limits, explicit failures, and configured failure rate.
5. Propagate accepted demand through outgoing edges.
6. Calculate synchronous dependency success and latency from downstream results.
7. Record metrics, bottlenecks, and explainable log events.
8. Emit a compact tick snapshot to the main thread.

The model uses deterministic expected values. A node with a `0.01` failure rate fails 1% of its processed demand; it does not use random sampling. Repeating the same architecture and scenario must produce byte-equivalent metric values after canonical serialization.

### Graph rules

- `Region` and `Note` nodes are excluded from traffic traversal.
- `Client` nodes are valid scenario traffic sources.
- Other connected nodes process traffic using their operational configuration.
- Outgoing `trafficPercentage` is the percentage of processed requests that invoke that dependency. Multiple ordinary outgoing edges may therefore fan out and do not need to total 100%.
- Synchronous dependencies contribute to source latency and failure. Multiple synchronous branches are treated as parallel; the slowest required branch determines added response latency.
- Asynchronous dependencies affect enqueue acceptance and downstream health but do not add worker-processing latency to the originating response.
- A Cache completes its hit percentage locally and sends only misses to its outgoing data dependency edges.
- A failed Cache operates in bypass mode: hit rate becomes zero and traffic flows to its configured fallback dependency. If no fallback exists, the requests fail.
- A Sharding node routes each request to exactly one outgoing SQL or NoSQL database. Edge percentages are normalized as routing weights; equal distribution is used when all weights are equal.
- The number of connected database targets should equal `shardCount`. A mismatch is a warning, and simulation uses the targets actually connected.
- A Message Queue stores accepted messages up to `queueLimit` and delivers up to its `capacity` each second. Multiple consumers divide deliveries using normalized edge weights rather than duplicating messages.
- Other nodes retain excess demand as backlog up to `queueLimit`; overflow is counted as failed demand.
- Directed operational cycles block a run during preflight. Supporting cyclic workloads is deferred.
- Retries add another attempt only for the failed fraction, up to `retryCount`, and consume downstream capacity. Retries stop at `timeoutMs` and are capped at three modeled attempts even if an imported value is higher; the event log explains the cap.

### Capacity and latency formulas

For each node and virtual second:

```text
available demand = previous backlog + new incoming demand
processed demand = min(available demand, effective capacity)
new backlog      = min(available demand - processed demand, queue limit)
overflow         = max(0, available demand - processed demand - queue limit)
utilization      = processed demand / effective capacity
```

Explicit failure sets effective capacity to zero. Capacity-degradation incidents multiply configured capacity by the active scenario multiplier.

Queue delay uses the Phase 1 explainable approximation:

```text
queue delay = base latency × utilization / (1 - utilization)
```

For calculation, utilization is capped at `0.99`; queue delay is capped at ten times base latency plus `backlog / max(capacity, 1) × 1000 ms`. The event log reports when a cap is applied.

Metric latency estimates are:

```text
average node latency = base latency + queue delay
P95 node latency     = base latency + (2 × queue delay)
```

An edge adds its configured latency. Global average and P95 latency are weighted across Client workloads using the longest required synchronous path for each source. Asynchronous work is reported separately.

### Success and cost

- Local node success begins with `processed / incoming`, then applies the configured failure rate.
- Required synchronous child success is multiplied into parent success according to `trafficPercentage`.
- Global successful RPS is generated RPS multiplied by the computed Client-path success ratio.
- Error rate is `1 - successful requests / generated requests`.
- Monthly cost is `sum(costPerHour × 730)` for operational nodes in the run snapshot. Sharding does not multiply database cost; each connected database node contributes its own cost.

## 4. Public data contracts

### Architecture schema 1.2

Publish architecture schema `1.2` and migrate `1.0 → 1.1 → 1.2` during import and IndexedDB hydration. Add a `scenarios` array; completed results are not embedded in architecture JSON.

```ts
interface SimulationScenario {
  id: string;
  name: string;
  description?: string;
  durationSeconds: number; // 10–3600, default 120
  traffic: TrafficSource[];
  events: ScenarioEvent[];
}

interface TrafficSource {
  sourceNodeId: string; // must reference a Client
  requestsPerSecond: number;
}

type ScenarioEvent =
  | {
      id: string;
      atSecond: number;
      type: 'TRAFFIC_SET';
      sourceNodeId: string;
      requestsPerSecond: number;
    }
  | {
      id: string;
      atSecond: number;
      type: 'NODE_FAILURE';
      nodeId: string;
      durationSeconds: number;
    }
  | {
      id: string;
      atSecond: number;
      type: 'NODE_CAPACITY';
      nodeId: string;
      multiplier: number;
      durationSeconds: number;
    }
  | {
      id: string;
      atSecond: number;
      type: 'CACHE_BYPASS';
      nodeId: string;
      durationSeconds: number;
    }
  | {
      id: string;
      atSecond: number;
      type: 'QUEUE_INJECT';
      nodeId: string;
      messages: number;
    }
  | {
      id: string;
      atSecond: number;
      type: 'EDGE_LATENCY';
      edgeId: string;
      addedLatencyMs: number;
      durationSeconds: number;
    };
```

Validation rules:

- Scenario IDs and event IDs are unique within the document.
- Duration is an integer between 10 seconds and 60 minutes.
- RPS, messages, and added latency are non-negative finite values.
- Capacity multiplier is between 0 and 10.
- Timed events start within the scenario and end no later than its duration.
- Every target node or edge exists and supports the event type.
- Scenario migrations add `scenarios: []` to older documents without changing architecture IDs.

### Engine input and output

The engine receives a deep-cloned, validated snapshot:

```ts
interface SimulationInput {
  runId: string;
  architectureId: string;
  architectureUpdatedAt: string;
  nodes: ArchitectureNodeV1[];
  edges: ArchitectureEdgeV1[];
  scenario: SimulationScenario;
}
```

Each metric tick contains:

```ts
interface SimulationTick {
  second: number;
  global: {
    generatedRps: number;
    successfulRps: number;
    failedRps: number;
    errorRate: number;
    averageLatencyMs: number;
    p95LatencyMs: number;
    queueDepth: number;
    estimatedMonthlyCost: number;
  };
  nodes: Record<string, NodeMetric>;
  edges: Record<string, EdgeMetric>;
  events: SimulationLogEntry[];
}
```

`NodeMetric` includes incoming RPS, processed RPS, utilization, backlog, overflow, average latency, P95 latency, failed RPS, effective capacity, and status. Cache metrics add hit/miss RPS; Sharding metrics add per-target routed RPS; Queue metrics add enqueued, delivered, and depth. `EdgeMetric` includes transferred RPS, effective latency, retries, timeouts, and failed RPS.

### Worker protocol

Use a native typed Web Worker created through Vite; do not add a worker abstraction dependency.

Main-thread commands:

```text
START(input, speed)
PAUSE(runId)
RESUME(runId, speed)
SET_SPEED(runId, speed)
CANCEL(runId)
```

Worker messages:

```text
READY(runId)
TICK(runId, tick)
COMPLETE(runId, summary)
CANCELLED(runId)
ERROR(runId, code, message)
```

Supported presentation speeds are `1×`, `4×`, `16×`, and `MAX`. Speed controls wall-clock emission only and never alter virtual results. `MAX` computes without delays but yields periodically so cancellation remains responsive.

## 5. Preflight validation

Preflight runs on the main thread before a worker is started and returns blocking errors separately from warnings.

### Blocking errors

- Architecture or scenario fails schema validation.
- No traffic source is configured.
- Traffic source is missing or is not a Client.
- A traffic source has no reachable operational target.
- Reachable operational graph contains a directed cycle.
- Scenario event target does not exist or has the wrong component type.
- Required numeric configuration is non-finite or outside schema limits.

### Warnings

- Disconnected operational node.
- Sharding target count differs from `shardCount`.
- Sharding has a non-database target.
- Cache has no downstream fallback for misses.
- Message Queue has no downstream consumer.
- Synchronous dependency has `Async` protocol, or asynchronous dependency uses a synchronous protocol.
- Outgoing ordinary dependency percentages create more than 300% fan-out.
- Retry count above the modeled cap.
- Node has zero capacity without an explicit scenario reason.

The scenario dialog lists all findings and links node/edge findings back to canvas selection. Warnings require acknowledgement but do not block Run.

## 6. Scenario presets

All presets use a 120-second duration and an initial 1,000 RPS unless the user changes them. When several compatible targets exist, the dialog selects the first reachable target and requires confirmation.

| Preset                   | Timeline                                                          |
| ------------------------ | ----------------------------------------------------------------- |
| Traffic spike            | At 30s set traffic to 5,000 RPS; at 90s restore 1,000 RPS.        |
| Server failure           | Fail one Application Server at 30s and recover it at 75s.         |
| Database overload        | Reduce one SQL/NoSQL database to 25% capacity from 30s to 90s.    |
| Cache failure            | Bypass one Cache from 30s to 75s so all reads reach its fallback. |
| Queue backlog            | Inject 50,000 messages into one Message Queue at 30s.             |
| Network latency increase | Add 250 ms to one selected edge from 30s to 90s.                  |

A separate Baseline scenario contains no incident and is the default for a new architecture.

The scenario editor supports adding, editing, ordering, and deleting only the six event types in the public contract. Events are always executed in `atSecond`, then event-ID order to guarantee deterministic ties.

## 7. User experience

### Top-bar controls

- `Configure scenario` opens the scenario drawer.
- `Run` performs preflight and starts a snapshot.
- Active runs expose Pause/Resume, Reset, and speed selection.
- Structural and configuration editing is locked while a run is active or paused. Reset or completion unlocks the editor.
- Editing after completion marks the previous result as based on an older snapshot.

### Canvas overlays

- Nodes show a compact utilization percentage and status color during a run.
- Status thresholds: normal below 70%, warning at 70–89%, critical at 90% or backlog growth, failed for explicit failure.
- Cache shows hit rate; Queue shows depth; Sharding shows routed load per connected target in its expanded metric popover.
- Edges animate only while carrying traffic and display effective RPS when selected.
- Selecting a node or edge during simulation focuses its metric series in the bottom panel.
- Simulation overlays are presentation state and never enter architecture history or JSON.

### Bottom simulation panel

The resizable panel contains:

1. Global KPI row: generated RPS, successful RPS, error rate, average latency, P95 latency, total queue depth, and monthly cost estimate.
2. Lightweight SVG timeline for traffic, error rate, latency, utilization, and queue depth. Do not add a chart library for Phase 2.
3. Node/edge detail tab for the current canvas selection.
4. Chronological event log with severity, timestamp, evidence, and linked target.

The log emits entries only on state transitions or threshold crossings, not every tick. Examples:

```text
00:30 Traffic increased from 1,000 to 5,000 requests/second.
00:34 API service utilization crossed 90%.
00:38 SQL database queue reached 4,200 requests.
00:43 Checkout estimated P95 latency exceeded 1,000 ms.
00:75 Application server recovered.
```

### Explainable bottlenecks

At completion, show up to five findings ranked by impact:

- Capacity saturation and overflow.
- Sustained queue growth.
- Highest contribution to synchronous P95 latency.
- Explicit failure with the greatest propagated error rate.
- Retry amplification.

Each finding includes the affected component, evidence window, formula inputs, and a neutral experiment suggestion. This is deterministic engine output, not AI scoring.

## 8. State and persistence

- Add a separate Zustand simulation store for run status, active scenario, ticks, overlays, selected metric series, and preflight results.
- Keep the editor store responsible only for architecture and scenario mutations.
- Starting a run deep-clones the current validated architecture so later UI state cannot mutate engine input.
- Extend Dexie with a `simulationRuns` table keyed by run ID and indexed by architecture ID and completion time.
- Persist only completed summaries and compressed/downsampled ticks; retain the ten newest runs per architecture.
- Never autosave each incoming worker tick through the editor's project persistence path.
- Cancelling or reloading during a run discards the incomplete run.
- Worker errors terminate the worker, unlock the editor, preserve the last valid tick, and display a recoverable error state.

## 9. Recommended structure and tools

```text
src/
  domain/simulation/       contracts, schemas, preflight, formulas
  engine/                  deterministic graph engine and worker entry
  features/simulation/     store, controller, controls, panel, overlays
  features/scenarios/      presets and scenario editor
  storage/                 simulation-run repository
```

Use existing React, TypeScript, Zustand, Zod, Dexie, Vitest, and Testing Library dependencies. Add `@playwright/test` as a development dependency for browser acceptance tests. Use native `Worker`, `structuredClone`, SVG, and a small internal binary-heap or sorted-event utility; no backend, chart library, random-number library, or worker wrapper is required.

## 10. Delivery milestones

### Milestone 0 — contracts and deterministic fixtures

- Define schema 1.2, migration, engine contracts, formulas, graph semantics, and preflight results.
- Create three small hand-calculated graph fixtures and expected metric snapshots.
- Record an architecture decision describing aggregate simulation and its accuracy limits.

Exit condition: the fixtures and formulas can be reviewed without running the UI.

### Milestone 1 — engine core

- Implement graph compilation, topological validation, node state, backlog, capacity, failure rate, edge propagation, and global metrics.
- Implement Cache, Sharding, Message Queue, synchronous, and asynchronous special behavior.
- Implement deterministic event ordering, retries, latency, and cost.

Exit condition: pure engine tests pass for baseline, overload, cache miss, sharding, queue, and failure fixtures.

### Milestone 2 — worker and run controller

- Add typed worker protocol, pause/resume/cancel/speed behavior, snapshot isolation, and error recovery.
- Add the simulation Zustand store and controller hook.
- Ensure stale worker messages from previous run IDs are ignored.

Exit condition: the main thread remains responsive and identical input produces identical output at every speed.

### Milestone 3 — scenarios and preflight

- Publish schema 1.2 and migrations.
- Add Baseline plus six presets and the supported timeline editor.
- Add blocking errors, warnings, target selection, and canvas linking.

Exit condition: users cannot start an invalid run and can configure every MVP incident without editing JSON.

### Milestone 4 — visualization

- Add top-bar controls, editing lock, canvas overlays, KPI row, SVG timeline, details, and event log.
- Add threshold transitions and completed-run bottleneck findings.
- Add empty, paused, completed, cancelled, and worker-error states.

Exit condition: a user can locate the first overloaded component from the canvas and panel without inspecting raw JSON.

### Milestone 5 — persistence and hardening

- Persist scenarios and recent completed runs.
- Add browser tests, accessibility behavior, performance profiling, documentation, and model-limit disclosures.
- Verify cleanup on navigation, reset, worker error, and component unmount.

Exit condition: all acceptance scenarios pass with no editor data loss or main-thread stalls.

## 11. Test strategy

### Pure engine tests

- Same input produces identical ticks and summary across repeated runs and all speeds.
- Single-node capacity below, at, and above saturation.
- Backlog growth, drain, and overflow at queue limits.
- Cache 0%, 80%, and 100% hit rate and bypass behavior.
- Sharding distribution across four equal and weighted targets.
- Queue injection, delivery capacity, and consumer slowdown.
- Synchronous failure propagation versus asynchronous acceptance.
- Retry load amplification, timeout, and three-attempt cap.
- Traffic spike, node failure/recovery, capacity reduction, and edge latency restoration.
- Latency cap and bottleneck evidence calculations.
- Cost remains stable across traffic changes.
- All counts, rates, latency, cost, and utilization remain finite and non-negative.

### Schema and preflight tests

- `1.0 → 1.1 → 1.2` migration preserves architecture content and adds an empty scenario list.
- Invalid event targets, durations, numeric values, and duplicate IDs are rejected.
- Cycles and invalid traffic sources block execution.
- Cache fallback, Queue consumer, Sharding target count, and protocol mismatches produce warnings.

### Worker and store tests

- Start, pause, resume, speed change, cancel, complete, and error messages.
- No ticks emitted while paused.
- Stale run IDs do not alter current state.
- Reset unlocks the editor and terminates the worker.
- Tick ingestion does not create editor undo entries or project autosaves.

### UI and Playwright tests

- Configure and run every preset.
- Select a saturated node from a log entry and display its metrics.
- Editing is locked during active/paused runs and restored afterward.
- Reload preserves scenarios and completed summaries but not incomplete runs.
- Keyboard and screen-reader labels cover all controls and chart summaries.

### Performance targets

- A 15-minute scenario with 100 nodes and 150 edges completes in `MAX` mode within two seconds on the reference development machine.
- Worker tick processing does not block the main thread.
- Main-thread tick ingestion and rendering stays below 16 ms at 4× presentation speed and below 50 ms at 16×.
- Stored completed-run data remains below 2 MB per run after downsampling.

## 12. Acceptance experiment

Use an e-commerce checkout architecture:

```text
Client → Load balancer → API gateway → Application server
                                         |→ Cache → SQL database
                                         |→ Message queue → Worker → Object storage
```

Run these steps:

1. Baseline at 2,000 RPS completes with no sustained backlog.
2. Traffic increases to 15,000 RPS at 30 seconds.
3. The SQL database becomes the highest-impact bottleneck; utilization, queue, error rate, and P95 latency visibly rise.
4. Stop the run and add Sharding with four SQL database targets.
5. Rerun the identical scenario.
6. The new run shows lower per-database utilization, queue depth, error rate, and estimated P95 latency.

Phase 2 is complete when a user can perform this experiment, understand why the metrics changed from the evidence shown, and reproduce identical results from the same saved architecture and scenario.

## 13. Risks and controls

| Risk                                    | Control                                                                                     |
| --------------------------------------- | ------------------------------------------------------------------------------------------- |
| Per-request simulation is too expensive | Use one-second aggregate batches and bounded tick data.                                     |
| Results imply false precision           | Label estimates, expose formulas, cap unstable values, and document model limits.           |
| Graph semantics are ambiguous           | Enforce the routing, Cache, Sharding, Queue, sync, and async rules in this plan.            |
| Simulation freezes the editor           | Execute the pure engine in a cancellable Web Worker.                                        |
| Metric UI overwhelms beginners          | Lead with seven KPIs, threshold colors, and ranked evidence; keep raw details in tabs.      |
| Architecture changes invalidate a run   | Simulate an immutable snapshot and lock editing until completion/reset.                     |
| Run results bloat local storage         | Store summaries plus downsampled ticks and retain only ten runs per architecture.           |
| Engine and UI disagree                  | Share contracts and calculation functions; test pure fixtures before worker/UI integration. |
