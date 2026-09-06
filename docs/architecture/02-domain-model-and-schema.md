# Domain Model and Architecture Schema

Last synchronized with source: **6 September 2026**

## 1. Canonical contract

The portable project contract is `ArchitectureDocumentV1` from `src/domain/architecture/types.ts`.

Despite the TypeScript name `V1`, the current serialized `schemaVersion` is **`1.4`**.

```text
ArchitectureDocumentV1
├─ schemaVersion: "1.4"
├─ id
├─ metadata
│  ├─ name
│  ├─ description?
│  ├─ createdAt
│  └─ updatedAt
├─ viewport?
├─ projectSettings
├─ nodes[]
├─ edges[]
└─ scenarios[]
```

React Flow state, simulation results, diagnostics, selection, history, learning attempts, and panel state are intentionally outside this contract.

## 2. Component types

There are currently **16 canonical component types**.

| Category | Type IDs |
| --- | --- |
| Client & edge | `client`, `dns`, `cdn`, `load-balancer`, `api-gateway` |
| Compute | `application-server`, `worker` |
| Data | `cache`, `sharding`, `sql-database`, `nosql-database`, `object-storage` |
| Messaging | `message-queue` |
| Operations | `monitoring-service` |
| Structure | `region`, `note` |

The display metadata, educational content, icons, colors, and defaults live in `src/domain/components/definitions.ts`.

## 3. Common operational configuration

Every node stores an `OperationalConfig`. Common fields are:

- `capacity`;
- `baseLatencyMs`;
- `failureRate` in `[0,1]`;
- `concurrencyLimit`;
- `queueLimit`;
- `costPerHour`.

`OperationalConfig` permits additional string/number/boolean keys for forward-compatible component-specific configuration, but known fields are explicitly validated.

### 3.1 Cache-specific configuration

A Cache requires:

- `hitRatePercent`;
- `ttlSeconds`;
- `staleWindowSeconds`;
- `ttlJitterPercent`;
- `requestCoalescing`;
- `cacheLocking`;
- `lockWaitTimeoutMs`;
- `lockTtlMs`;
- `backgroundRefresh`.

If locking is enabled, `lockTtlMs` must be strictly greater than `lockWaitTimeoutMs`.

Current defaults are:

```text
hit rate             80%
TTL                  300 s
stale window         0 s
TTL jitter           0%
request coalescing   false
cache locking        false
lock wait timeout    500 ms
lock TTL             5000 ms
background refresh   false
```

### 3.2 Worker-specific configuration

Workers require `workerRole`:

- `general`;
- `cache-refresh`.

Default is `general`.

### 3.3 Sharding-specific configuration

Sharding requires:

- positive `shardCount`;
- non-empty `shardKey`;
- strategy `hash`, `range`, or `directory`.

Current default is four hash shards keyed by `userId`.

### 3.4 Note-specific configuration

Notes can be typed as:

- assumption;
- decision;
- risk;
- question;
- constraint;
- requirement;
- trade-off;
- improvement.

Note content is stored as text/Markdown-compatible content. Untrusted HTML is not part of the canonical rendering contract.

## 4. Node contract

Each node contains:

```text
id
canonical type
{x,y} position
optional parentId
user-facing data
├─ label
├─ description?
├─ implementationNotes?
└─ config
```

`parentId` is reserved for Region containment. Current validation permits only one containment level:

- a child parent must exist;
- the parent must be a `region`;
- a Region cannot itself be contained;
- a parent Region cannot itself have a parent;
- containment cycles are rejected.

The schema supports this model even though complete Region editing UX is not yet implemented.

## 5. Edge contract

Edges are directed and contain:

- `id`;
- `source` node ID;
- `target` node ID;
- optional `label`;
- typed `config`.

Current edge configuration:

| Field | Values / meaning |
| --- | --- |
| `protocol` | `HTTP`, `gRPC`, `TCP`, `Async` |
| `mode` | `synchronous`, `asynchronous` |
| `trafficType` | `read`, `write`, `mixed` |
| `encrypted` | boolean metadata/advisory input |
| `latencyMs` | non-negative base edge latency |
| `bandwidthMbps` | non-negative metadata; currently not a throughput limiter in engine |
| `timeoutMs` | non-negative timeout threshold |
| `retryCount` | non-negative; engine models at most three attempts |
| `trafficPercentage` | `0..100` |
| `disabled` | excludes path from active graph/simulation |
| `monitored` | UI/design metadata; currently not a simulation formula input |

Default newly created connection:

```text
HTTP / synchronous / mixed
encrypted = true
latency = 5 ms
bandwidth = 100 Mbps
timeout = 1000 ms
retryCount = 1
traffic = 100%
disabled = false
monitored = false
```

## 6. Project settings

Project settings are part of the portable architecture document.

### 6.1 Expected scale

- `small`;
- `medium`;
- `large`;
- `custom`.

Recommended simulation defaults:

| Scale | Initial RPS | Peak RPS | Duration |
| --- | ---: | ---: | ---: |
| small | 100 | 300 | 120 s |
| medium | 1,000 | 3,000 | 180 s |
| large | 10,000 | 50,000 | 300 s |

Ambient failure defaults to zero unless configured separately.

For custom scale, simulation defaults can derive initial RPS from `customScale.requestsPerSecond` and peak RPS from the configured peak multiplier.

### 6.2 Expected users

- `under-100`;
- `100-1000`;
- `1000-100000`;
- `over-100000`;
- `custom`.

When supplied, the user-count hierarchy is validated so the narrower population cannot exceed the broader population:

`concurrent ≤ daily active ≤ monthly active ≤ registered`.

### 6.3 Complexity

- `low`;
- `medium`;
- `high`;
- `very-high`.

These values inform advisory architecture assessment. They do not automatically change simulation formulas.

### 6.4 Visibility

- `private`;
- `shared`;
- `public-template`.

This is metadata only. There is no backend publication or permission system today.

## 7. Scenarios

A saved `SimulationScenario` contains:

- ID/name/optional description;
- duration `1..86400` seconds;
- optional ambient failure rate;
- one or more client traffic sources for runnable scenarios;
- zero or more typed events.

Supported event types:

| Event | Target/meaning |
| --- | --- |
| `TRAFFIC_SET` | Change RPS for a Client from a given second onward |
| `NODE_FAILURE` | Make a node unavailable temporarily |
| `NODE_CAPACITY` | Multiply node capacity temporarily |
| `CACHE_BYPASS` | Force cache hit rate to zero temporarily |
| `CACHE_KEY_EXPIRATION` | Model synchronized/partial key expiration and rebuild |
| `QUEUE_INJECT` | Inject messages into a Message Queue at one second |
| `EDGE_LATENCY` | Add latency to an edge temporarily |

Scenario schema ensures timed events start and end inside scenario duration.

Architecture-level validation additionally ensures:

- traffic sources reference Clients;
- traffic-set events reference Clients;
- edge-latency events reference existing edges;
- cache events target Cache nodes;
- queue injection targets Message Queue nodes;
- other node-targeting events reference existing nodes;
- scenario IDs are unique within a document.

## 8. Graph invariants

The schema rejects:

- duplicate node IDs;
- duplicate edge IDs;
- edges with missing endpoints;
- invalid Region parents/containment cycles;
- invalid component-specific required configuration;
- invalid project settings;
- invalid scenario references.

Directed operational cycles are **not** rejected by the architecture file schema. They are rejected by simulation preflight when reachable from configured traffic, because the editor can represent designs the current simulator cannot execute.

Parallel edges are valid. The editor prevents a normal duplicate add operation, but explicit edge duplication creates valid parallel edges with distinct IDs.

## 9. Schema migration chain

`parseArchitectureDocument` supports versions `1.0`, `1.1`, `1.2`, `1.3`, and `1.4`.

```text
1.0
 └─> 1.1: add Cache hitRatePercent = 80 when missing
      └─> 1.2: add scenarios = []
           └─> 1.3: add projectSettings, disabled/monitored edge flags,
                    normalize scenario ambientFailureRate
                └─> 1.4: add deep Cache defaults and Worker role
```

Unknown versions throw an explicit unsupported-version error.

Migration always finishes by validating against the current 1.4 schema.

## 10. Component defaults

Defaults are educational baseline assumptions rather than vendor specifications. Examples:

| Component | Capacity | Base latency | Cost/hour |
| --- | ---: | ---: | ---: |
| Client | 5,000 | 0 ms | 0 |
| DNS | 100,000 | 12 ms | 0.02 |
| CDN | 100,000 | 8 ms | 0.20 |
| Load balancer | 20,000 | 2 ms | 0.04 |
| API gateway | 10,000 | 5 ms | 0.08 |
| Application server | 1,500 | 25 ms | 0.18 |
| Worker | 500 | 80 ms | 0.12 |
| Cache | 50,000 | 1 ms | 0.15 |
| Sharding | 10,000 | 3 ms | 0.12 |
| SQL database | 3,000 | 12 ms | 0.32 |
| NoSQL database | 10,000 | 8 ms | 0.28 |
| Object storage | 5,000 | 35 ms | 0.03 |
| Message queue | 20,000 | 4 ms | 0.10 |
| Monitoring service | 50,000 | 10 ms | 0.08 |

Region and Note are structural/non-traffic components with zero processing capacity/cost in the current model.

## 11. Source files

- Types: `src/domain/architecture/types.ts`
- Validation/migrations: `src/domain/architecture/schema.ts`
- Factories/default new object creation: `src/domain/architecture/factories.ts`
- Component definitions: `src/domain/components/definitions.ts`
- Project settings: `src/domain/architecture/projectSettings.ts`
- Scenario types/schema: `src/domain/simulation/types.ts`, `src/domain/simulation/schema.ts`
