# Deterministic Simulation Engine

Last synchronized with source: **6 September 2026**

## 1. Purpose and fidelity boundary

The simulator is an **educational deterministic aggregate model**. It is designed to make relationships between load, capacity, queueing, failures, retries, caching, partitioning, and dependency topology visible and reproducible.

It is not a packet simulator, a discrete-event production emulator, a cloud cost calculator, or a statistical capacity planner.

## 2. Execution contract

The engine input contains an immutable run snapshot:

```text
runId
architectureId
architectureUpdatedAt
nodes[]
edges[]
scenario
```

The simulation controller passes cloned node/edge/scenario data to a module Web Worker.

The worker calls `runSimulation` once to calculate all ticks and the summary, then emits ticks to the UI according to presentation speed. Consequently, speed never changes computed values.

## 3. Virtual time

Simulation time advances in integer seconds from `0` through `durationSeconds - 1`.

For each virtual second, the engine:

1. applies traffic-set events starting at that second;
2. initializes source demand;
3. traverses the preflight topological order;
4. calculates node capacity/backlog/failures/latency;
5. applies component-specific routing semantics;
6. calculates edge transfer/retries/latency;
7. derives downstream edge failures;
8. builds diagnostics;
9. evaluates end-to-end synchronous success/latency from each traffic source;
10. emits global metrics and events.

## 4. Preflight

`runPreflight` uses only active edges (`disabled === false`) for graph execution.

### 4.1 Blocking errors

Examples include:

- invalid scenario schema;
- no traffic source;
- traffic source that is not a Client;
- Client traffic with no outgoing operational target;
- reachable directed cycle;
- event targeting a missing/wrong entity.

The simulator only executes the operational graph reachable from configured traffic sources.

`region` and `note` are non-operational and do not participate as traffic-processing nodes.

### 4.2 Warnings

Current warnings include:

- disconnected operational node;
- Cache without fallback target;
- Message Queue without consumer;
- Sharding declared shard count not matching database targets;
- Sharding connected to non-database targets;
- excessive dependency fan-out over 300% for ordinary nodes;
- protocol/mode mismatch;
- retry count above the engine's modeled cap of three attempts.

Project-assessment advisories are appended as preflight warnings by the controller.

## 5. Core node capacity model

For a node at a given second:

```text
effectiveCapacity = configured capacity × active capacity multipliers
                    (or 0 during NODE_FAILURE)

available = previous backlog + new incoming + injected queue messages
processed = min(available, effectiveCapacity)
remaining = max(0, available - processed)
backlog   = min(remaining, queueLimit)
overflow  = max(0, remaining - queueLimit)
```

Overflow is treated as rejected work.

### 5.1 Utilization/status

```text
utilization = processed / effectiveCapacity, capped at 1
loadRatio   = available / effectiveCapacity, uncapped
```

Status rules:

- `failed` during explicit node outage;
- `critical` if overflow/backlog exists or utilization ≥ 90%;
- `warning` if utilization ≥ 70%;
- otherwise `normal`.

## 6. Queue-delay approximation

The model derives a deterministic queue-delay approximation from utilization:

```text
queueUtilization = min(utilization, 0.99)

theoreticalDelay = baseLatency × queueUtilization / (1 - queueUtilization)

delayCap = baseLatency × 10
           + backlog/effectiveCapacity × 1000

queueDelay = min(theoreticalDelay, delayCap)
```

Node average latency is `baseLatency + queueDelay`.

Node P95 is approximated as `baseLatency + 2 × queueDelay`.

These are intentionally simple educational heuristics rather than latency distributions.

## 7. Failure model

Configured node failure probability and scenario ambient failure probability are combined as independent probabilities:

```text
effectiveFailureRate = 1 - (1 - nodeFailureRate) × (1 - ambientFailureRate)
```

Expected failed throughput is deterministic:

```text
processingFailureRps = processed × effectiveFailureRate
```

There is no random sampling.

## 8. Cost model

Estimated monthly cost is constant across a run and calculated as:

```text
sum(costPerHour × 730)
```

for all nodes except `region` and `note`.

The cost field is an educational configured estimate. There is no provider pricing model, traffic cost, storage pricing, autoscaling, or tiered billing model.

## 9. Routing semantics

### 9.1 Ordinary nodes

For ordinary nodes, each outgoing edge independently receives:

```text
routable × trafficPercentage / 100
```

This intentionally permits fan-out/duplication. A node with two 100% outgoing edges sends the successful output to both branches.

### 9.2 Message Queue

Message Queue outgoing percentages are normalized across active outgoing targets. Queue therefore distributes delivered work rather than duplicating it simply because percentages sum above 100.

Queue metrics include enqueued and delivered counts/RPS plus normal backlog metrics.

### 9.3 Sharding

Sharding also normalizes outgoing weights. If total configured weight is zero, active targets receive equal shares.

The node records per-target `routedRps` for diagnostics. Preflight expects the number of database targets to match `shardCount` and expects only SQL/NoSQL targets.

Current shard strategy/key fields are configuration/learning semantics; the engine's routing calculation is weight-normalization rather than hashing actual request keys.

## 10. Cache model

Cache is currently the deepest component-specific simulation model.

### 10.1 Normal hit/miss behavior

Unless bypassed:

```text
base miss RPS = successful cache processing × (1 - hit rate)
```

Only origin/miss traffic is routable downstream from the Cache; cache-hit traffic terminates at the Cache for downstream-load purposes.

`CACHE_BYPASS` temporarily forces hit rate to zero.

### 10.2 Key-expiration incident

`CACHE_KEY_EXPIRATION` provides:

- key count;
- affected traffic percentage;
- rebuild duration;
- active duration.

The engine derives forced misses for the affected hit traffic and can spread multi-key expiration over a deterministic jitter window based on `ttlSeconds × ttlJitterPercent`.

### 10.3 Protection behaviors

The current model supports:

- request coalescing;
- cache locking;
- lock wait timeout;
- lock TTL/expiry;
- stale serving;
- background refresh;
- connected `cache-refresh` Workers;
- refresh-worker outage.

The engine records:

- cache hits;
- cache misses;
- origin RPS;
- coalesced RPS;
- lock-wait RPS;
- lock-timeout RPS;
- stale-served RPS;
- refresh RPS;
- refresh-failure RPS;
- cache rebuild latency.

When coalescing/locking causes request waiting, the model adds a deterministic rebuild-duration latency penalty. Lock timeouts also contribute to failed request rate.

### 10.4 Background refresh

Background refresh is considered operational when a `worker` with `workerRole = cache-refresh` is actively connected to the Cache and is not failed by an active node-failure event.

This is a deliberately simple semantic relation; there is no job scheduler or separate refresh queue model.

## 11. Retry model

For each edge, the engine caps modeled `retryCount` to three attempts.

Expected retries are currently approximated linearly from the target's combined failure probability:

```text
retries = baseTransferred × targetFailureRate × attempts
transferred = baseTransferred + retries
```

This is an amplification model, not a full sequential retry/backoff/circuit-breaker model.

## 12. Edge latency and timeout

Active `EDGE_LATENCY` events add to configured edge latency.

```text
effectiveEdgeLatency = configuredLatency + activeAddedLatency
```

If effective edge latency exceeds the configured timeout, all base transferred traffic on that edge is counted as timed out for that second.

`bandwidthMbps` is retained in the canonical model but is not currently used as an engine transfer-capacity constraint.

## 13. Downstream edge failure attribution

After node processing, each active edge derives:

- unavailable traffic when destination status is failed;
- rejected traffic proportional to destination rejected/incoming traffic;
- processing failures proportional to destination processing-failure/incoming traffic;
- timeouts from edge latency.

Edge failed RPS is capped at transferred RPS.

## 14. End-to-end success and response latency

Only **synchronous** outgoing edges participate in the originating response success/latency calculation. Asynchronous traffic is still routed and can create downstream load/backlog, but does not extend the initiating response path.

### 14.1 Ordinary synchronous dependencies

For an ordinary node, the edge `trafficPercentage` acts as the probability/fraction of requests requiring that synchronous child. Child success therefore contributes proportionally.

For latency, synchronous branches are treated as parallel dependencies and the engine uses the maximum child path contribution rather than summing siblings.

### 14.2 Cache synchronous dependencies

For Cache, the effective probability of the downstream dependency is further multiplied by the measured origin/miss fraction. Cache hits therefore do not pay the backing-store response path.

### 14.3 Sharding synchronous dependencies

For Sharding, child success is weighted across normalized shard routes. Latency still uses the maximum shard path contribution.

### 14.4 Global metrics

The engine evaluates every active Client traffic source and aggregates:

- generated RPS;
- successful RPS;
- failed RPS;
- error rate;
- average latency;
- P95 latency;
- total queue depth;
- estimated monthly cost.

## 15. Diagnostics

### 15.1 Node diagnostic topics

- capacity;
- latency;
- cache;
- queue;
- sharding;
- failure.

### 15.2 Examples of deterministic diagnostic rules

- component unavailable;
- capacity rejection;
- processing failure;
- cache lock timeout;
- capacity saturation at ≥80% load ratio for diagnostic purposes;
- growing/high queue;
- P95 ≥500 ms;
- cache miss amplification when ≥50% of processed cache traffic misses;
- cache stampede/origin amplification;
- lock contention;
- hot shard when hottest route is ≥1.5× average;
- edge timeout/unavailable/rejection/downstream failure;
- retry amplification.

Runtime diagnostics keep quantitative `affectedRps` and `affectedPercent` evidence.

## 16. Summary findings

At completion the engine derives up to five highest-impact findings from peak node/edge states, covering:

- capacity;
- queue buildup;
- latency;
- retries.

The summary stores final and peak global metrics plus these findings.

## 17. Known fidelity limitations

The current model does not yet model, among other things:

- stochastic latency/failure distributions;
- request classes or payload-specific service times;
- bandwidth saturation;
- autoscaling;
- replicas/consistency/quorums;
- circuit breakers/backoff;
- real shard-key distributions;
- multi-region network/failure semantics;
- provider-specific resources;
- storage capacity growth during a run;
- real concurrency scheduling despite `concurrencyLimit` being stored;
- actual monitoring/tracing overhead;
- packet/network congestion.

These omissions are part of the model boundary and should not be hidden behind more decimal precision.

## 18. Primary source files

- Engine: `src/engine/simulationEngine.ts`
- Worker: `src/engine/simulation.worker.ts`
- Preflight: `src/domain/simulation/preflight.ts`
- Diagnostics: `src/domain/simulation/diagnostics.ts`
- Types: `src/domain/simulation/types.ts`
- Scenario schema: `src/domain/simulation/schema.ts`
- Controller: `src/features/simulation/useSimulationController.ts`
