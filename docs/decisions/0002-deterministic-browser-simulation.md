# ADR 0002: Deterministic aggregate browser simulation

Status: Accepted

## Context

Blue Garden must demonstrate how capacity, latency, queues, failures, caching, and partitioning interact without claiming to reproduce a production infrastructure environment. Simulating every request would make high-RPS educational scenarios expensive and would add apparent precision without improving the learning outcome.

## Decision

- Simulate one aggregate demand batch per Client per virtual second.
- Use deterministic expected failure values rather than random sampling.
- Compile reachable operational nodes into topological order and reject directed cycles during preflight.
- Run the pure engine in a native typed Web Worker and keep presentation speed independent of virtual results.
- Treat synchronous branches as parallel required dependencies and stop originating response latency at asynchronous edges.
- Model Cache misses, Sharding routing, and Message Queue delivery as explicit component rules.
- Persist scenarios in architecture schema 1.2 and retain completed run summaries separately in IndexedDB.
- Label every result as an educational estimate derived from configured assumptions.

## Consequences

Runs are reproducible, explainable, cancellable, and inexpensive enough for interactive use. The model intentionally omits packet behavior, distributions, replicas, autoscaling, and provider-specific infrastructure semantics. More realistic models can be added later behind versioned engine contracts without changing the editor renderer.
