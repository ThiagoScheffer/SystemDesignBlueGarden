# Design an API Rate Limiter

## Challenge Summary

Design a distributed API rate limiter that protects an existing API from excessive traffic while allowing configurable throttling policies for different users, API keys, IP addresses, or other client identifiers.

The rate limiter should make a decision for every incoming request:

* **Allow** the request when the client remains within its configured limit.
* **Reject** the request when the client has exceeded its limit.
* Return enough metadata for the client to understand the current limit and when requests may resume.

---

## Initial Requirements

### Functional requirements

The system should:

1. Define rate-limiting policies for individual users or groups of users.
2. Identify clients using one or more keys, such as:

   * User ID
   * API key
   * IP address
   * Tenant ID
   * Endpoint
3. Evaluate each incoming API request against the applicable policy.
4. Allow requests that remain within the configured limit.
5. Reject requests that exceed the limit.
6. Support creating, reading, updating, and deleting rate-limit policies.
7. Integrate with an existing API infrastructure.
8. Return rate-limit information in the API response.

### Possible response headers

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 24
X-RateLimit-Reset: 1750000123
```

When a limit is exceeded, the API should normally return:

```http
HTTP/1.1 429 Too Many Requests
Retry-After: 3
```

---

## Clarifying Questions

Before choosing an architecture, the candidate should clarify:

* What identifies a client: API key, account, tenant, IP address, or a combination?
* Are limits global or specific to individual endpoints?
* Do different customers have different quotas?
* What is the expected request volume?
* Must the limiter work across multiple API servers and regions?
* How accurate must enforcement be?
* Is a small amount of temporary over-admission acceptable?
* What should happen if the rate-limiting service is unavailable?
* Do policies need to change dynamically?
* Are burst requests allowed?
* Should rejected requests count against the quota?
* Are there separate short-term and long-term limits?

---

## Example Scale Assumptions

The following numbers are illustrative and should be replaced with interview-specific constraints:

* 1 million active clients
* 100,000 requests per second at peak
* Fewer than 5 milliseconds of additional rate-limiter latency
* Multiple stateless API servers
* Dynamically configurable policies
* Per-user and per-endpoint limits
* High availability across multiple availability zones

---

# Rate-Limiting Algorithm

## Recommended Algorithm: Token Bucket

A token bucket is a strong default because it supports a sustained request rate while permitting controlled bursts.

Each rate-limit key has a logical bucket containing:

* Maximum bucket capacity
* Current token count
* Token refill rate
* Timestamp of the last refill

For example:

```text
Capacity: 20 tokens
Refill rate: 10 tokens per second
Cost per request: 1 token
```

A client may send a burst of up to 20 requests when the bucket is full. After that burst, requests are admitted at an average rate of 10 requests per second.

## Request Evaluation

For each request:

1. Determine the applicable rate-limit key.
2. Load the bucket state.
3. Calculate how many tokens have accumulated since the previous request.
4. Cap the token count at the configured bucket capacity.
5. Check whether enough tokens remain.
6. If enough tokens exist:

   * Deduct the request cost.
   * Allow the request.
7. Otherwise:

   * Preserve the current state.
   * Reject the request with HTTP status `429`.

A conceptual calculation is:

```text
refilledTokens =
    min(
        bucketCapacity,
        previousTokens + elapsedTime × refillRate
    )
```

The request is accepted when:

```text
refilledTokens >= requestCost
```

After an accepted request:

```text
remainingTokens = refilledTokens - requestCost
```

---

## Why Token Bucket?

Advantages:

* Supports short bursts.
* Enforces a stable long-term rate.
* Requires little state per client.
* Can be evaluated efficiently.
* Works well with atomic operations in Redis.
* Is configurable for different customer tiers.

Limitations:

* Distributed enforcement requires shared or coordinated state.
* Clock handling must be consistent.
* Very large numbers of inactive client keys require expiration policies.
* Cross-region enforcement introduces consistency and latency trade-offs.

---

## Alternative Algorithms

### Fixed Window Counter

Counts requests during fixed intervals, such as requests per minute.

Advantages:

* Simple to implement.
* Low storage and computation cost.

Disadvantages:

* Allows boundary bursts. A client may send a full quota at the end of one window and another full quota at the beginning of the next.

### Sliding Window Log

Stores the timestamp of every request within the active window.

Advantages:

* Accurate enforcement.

Disadvantages:

* High memory and processing cost at large scale.

### Sliding Window Counter

Combines counters from adjacent windows to approximate a sliding window.

Advantages:

* More accurate than fixed windows.
* Less expensive than maintaining individual request timestamps.

Disadvantages:

* Still approximate.

### Leaky Bucket

Processes requests at a controlled output rate, often using a queue.

Advantages:

* Produces smooth traffic.

Disadvantages:

* Less suitable when legitimate bursts should be accepted.
* Queueing introduces additional latency and operational complexity.

---

# Proposed Architecture

```text
Client
   |
   v
Load Balancer / API Gateway
   |
   v
Rate-Limiting Middleware
   |
   +----> Redis Cluster
   |
   v
Application API
```

## Request Path

1. A client sends a request.
2. The API gateway or middleware extracts the rate-limit identity.
3. The service determines the applicable policy.
4. An atomic token-bucket operation is executed in Redis.
5. Redis returns:

   * Whether the request is allowed
   * Remaining tokens
   * Reset or retry information
6. Allowed traffic continues to the application.
7. Rejected traffic receives an HTTP `429` response.

---

# Redis-Based State Management

Redis is appropriate for the request path because rate limiting requires:

* Very low latency
* High request throughput
* Atomic state transitions
* Expiring keys
* Shared state across multiple API servers

A possible Redis key is:

```text
rate_limit:{policy_id}:{client_id}:{endpoint}
```

Example:

```text
rate_limit:premium-user:user-123:create-order
```

Stored state may include:

```json
{
  "tokens": 14.5,
  "lastRefillTimestampMs": 1750000000000
}
```

The policy itself may define:

```json
{
  "capacity": 20,
  "refillRatePerSecond": 10,
  "requestCost": 1
}
```

---

## Atomic Evaluation with Lua

The read, refill, deduction, and write operations must be atomic.

Without atomic execution, concurrent API servers could:

1. Read the same token count.
2. Independently decide that tokens are available.
3. Admit more requests than the configured policy permits.

A Redis Lua script can perform the full token-bucket transition as one atomic operation:

```text
Read current bucket state
Calculate elapsed time
Refill tokens
Check available tokens
Deduct tokens when allowed
Write updated state
Set expiration
Return decision and metadata
```

Modern Redis deployments may also implement this through supported server-side functions or carefully designed atomic commands. The architectural requirement is atomicity, not Lua specifically.

---

# Why Redis Instead of PostgreSQL?

The primary reason is not simply that PostgreSQL uses disk while Redis uses memory.

Modern relational databases use memory caches, write-ahead logs, indexes, and optimized transaction processing. They do not necessarily perform a physical disk read for every request.

However, Redis remains the stronger choice for the synchronous rate-limiting path because:

* It is optimized for low-latency key-based access.
* It supports high operation throughput.
* It provides atomic commands and server-side execution.
* Key expiration is native.
* The data model is small and ephemeral.
* Rate-limit state does not normally require relational queries.
* It avoids adding high-frequency counter updates to the primary application database.

PostgreSQL may still be appropriate for storing durable configuration, audit history, billing plans, and administrative records.

A stronger architecture uses both systems:

```text
PostgreSQL
  Durable policies, customer plans, audit history

Redis
  Active counters and token-bucket state
```

---

# Control Plane and Data Plane

Rate-limit policy management should be separated from request enforcement.

## Control Plane

Responsible for:

* Creating policies
* Updating limits
* Assigning policies to users or plans
* Auditing changes
* Validating policy configuration
* Publishing configuration updates

Example endpoints:

```http
POST   /rate-limit-policies
GET    /rate-limit-policies/{policyId}
PATCH  /rate-limit-policies/{policyId}
DELETE /rate-limit-policies/{policyId}
PUT    /users/{userId}/rate-limit-policy
```

Durable policy configuration should generally be stored in a persistent database such as PostgreSQL.

## Data Plane

Responsible for evaluating requests at runtime.

It should:

* Remain on the critical request path
* Avoid expensive database queries
* Cache policy configuration
* Execute atomic rate-limit decisions
* Return decisions with minimal latency

Administrative APIs should not directly manipulate raw Redis keys as the primary management mechanism. Doing so bypasses validation, authorization, versioning, auditing, and safe rollout controls.

---

# Policy Model

```ts
interface RateLimitPolicy {
  id: string;
  name: string;

  keyStrategy:
    | 'user'
    | 'api-key'
    | 'ip-address'
    | 'tenant'
    | 'user-and-endpoint';

  algorithm: 'token-bucket';

  capacity: number;
  refillRatePerSecond: number;
  requestCost: number;

  endpointPattern?: string;
  enabled: boolean;

  failureMode: 'fail-open' | 'fail-closed';
  version: number;
}
```

Different operations may have different costs:

```text
GET /products       = 1 token
POST /search        = 2 tokens
POST /reports       = 10 tokens
POST /video/export  = 50 tokens
```

Weighted requests prevent computationally expensive endpoints from being treated like inexpensive reads.

---

# Reliability Decisions

## Redis Failure

The system must explicitly decide what happens when Redis becomes unavailable.

### Fail open

Allow the request when the limiter cannot be reached.

Advantages:

* Preserves API availability.

Risks:

* The API may receive uncontrolled traffic.
* Abuse protection temporarily disappears.

Suitable for:

* Low-risk endpoints
* Internal systems
* Services where availability is more important than strict enforcement

### Fail closed

Reject requests when the limiter cannot be reached.

Advantages:

* Preserves strict protection.

Risks:

* A rate-limiter failure becomes an API outage.

Suitable for:

* Expensive operations
* Security-sensitive endpoints
* Strict contractual quotas

A hybrid policy is usually superior. Critical endpoints can fail closed, while less sensitive traffic fails open with local emergency limits.

---

## Redis Deployment

Production considerations include:

* Replication
* Automatic failover
* Sharding
* Multi-availability-zone deployment
* Connection pooling
* Timeouts
* Circuit breakers
* Monitoring
* Key expiration
* Capacity planning

Redis should not become a single point of failure.

---

## Local Fallback Limiting

API instances may maintain a temporary local rate limiter when Redis is degraded.

This reduces uncontrolled traffic, but local limits are approximate because each server maintains independent state.

For example, a global limit of 1,000 requests per second across 10 servers cannot be enforced exactly using isolated local counters unless traffic distribution is perfectly balanced.

---

# Distributed-System Considerations

## Multiple API Servers

All API servers should consult shared state or use an explicitly partitioned ownership model. Independent in-memory counters cannot enforce an accurate global limit.

## Multiple Regions

Possible approaches include:

### Centralized global Redis

Advantages:

* Stronger global enforcement.

Disadvantages:

* High cross-region latency.
* Central dependency.
* Reduced regional resilience.

### Independent regional limits

Advantages:

* Low latency.
* Better regional availability.

Disadvantages:

* The client may consume the quota independently in multiple regions.
* The global limit becomes approximate.

### Regional quota allocation

A global quota is divided among regions.

Example:

```text
Global quota: 10,000 requests per second

US region: 5,000
Europe region: 3,000
Asia-Pacific region: 2,000
```

Advantages:

* Low-latency regional enforcement.
* Bounded global overuse.

Disadvantages:

* Capacity may be stranded in one region while another region exhausts its allocation.
* Rebalancing adds complexity.

For most systems, regional enforcement with bounded approximation is preferable to placing a cross-region database call on every API request.

---

# Key Expiration and Storage Control

Inactive buckets should expire automatically.

A reasonable expiration period is based on the time required for an empty bucket to refill:

```text
timeToFull = capacity / refillRate
```

The expiration may be set to a multiple of that duration:

```text
TTL = max(minimumTTL, timeToFull × safetyFactor)
```

This prevents Redis from retaining permanent state for millions of inactive clients.

---

# Security Considerations

The design should address:

* API-key authentication
* IP spoofing and trusted proxy headers
* Administrative API authorization
* Tenant isolation
* Policy-change auditing
* Protection against Redis key injection
* DDoS mitigation before the application layer
* Limits on policy values
* Encryption in transit
* Secret management

IP-based limits alone are unreliable because:

* Many users may share a NAT address.
* Attackers may distribute traffic across many addresses.
* Proxy headers can be forged unless only trusted infrastructure may set them.

---

# Observability

Important metrics include:

* Allowed requests
* Rejected requests
* Rejection rate
* Redis latency
* Rate-limit decision latency
* Redis errors and timeouts
* Fail-open and fail-closed events
* Active bucket count
* Memory consumption
* Hot keys
* Policy-cache hit ratio
* Requests by policy
* Requests by endpoint
* Estimated over-admission

Logs should include the policy and decision context without exposing sensitive API keys or personal data.

---

# API Integration Options

## API Gateway Integration

Advantages:

* Rejects traffic before it reaches application services.
* Centralizes enforcement.
* Simplifies adoption across multiple services.

Disadvantages:

* May be constrained by gateway capabilities.
* Can become a centralized bottleneck.

## Application Middleware

Advantages:

* Flexible application-specific policy logic.
* Easy access to authenticated user context.

Disadvantages:

* Every service must integrate correctly.
* Enforcement may become inconsistent.

## Dedicated Rate-Limiting Service

Advantages:

* Centralized policies and reusable enforcement.
* Independent scaling.
* Consistent behavior across services.

Disadvantages:

* Adds a network call to the request path.
* Becomes a critical dependency.
* Requires careful failure handling.

For an initial implementation, gateway or middleware enforcement backed by Redis is usually the lowest-complexity solution. A dedicated service is justified when many independently deployed services require centralized policy and consistent enforcement.

---

# Strong Candidate Answer

A strong interview response could be:

> I would implement the limiter at the API gateway or middleware layer so traffic can be rejected before expensive application work occurs. Policies would support keys such as user ID, API key, tenant, and endpoint.
>
> For the initial algorithm, I would use a token bucket because it enforces a sustained rate while allowing controlled bursts. The active bucket state would be stored in Redis and evaluated atomically using a server-side script or equivalent atomic operation.
>
> Durable policy definitions and audit history would be stored in PostgreSQL, while Redis would hold only the low-latency runtime state. Administrative APIs would update the durable policy store and publish validated changes to the enforcement layer.
>
> The design must also define failure behavior. Low-risk endpoints could fail open with a conservative local fallback, while expensive or security-sensitive operations could fail closed. Redis would require replication, failover, monitoring, key expiration, and capacity planning.
>
> For a multi-region deployment, I would prefer regional enforcement with allocated quotas or bounded approximation rather than adding a cross-region request to every API call.

---

# Interviewer Follow-Up Questions

## Algorithm

* Why did you choose token bucket instead of a sliding-window algorithm?
* How does the algorithm permit bursts?
* How do you prevent race conditions?
* How do you calculate the retry time?
* How would you support requests with different costs?

## Architecture

* Where should the rate limiter run?
* Why use Redis?
* What information belongs in Redis versus PostgreSQL?
* Would you create a dedicated rate-limiting service?
* How would you avoid making the limiter a single point of failure?

## Distributed operation

* How would this work across multiple API servers?
* How would you enforce a global limit across regions?
* What consistency guarantees are required?
* How much over-admission is acceptable?
* What happens during a network partition?

## Reliability

* Should the system fail open or fail closed?
* What happens when Redis is slow?
* How would local fallback limiting work?
* How would you perform a Redis migration without disrupting enforcement?

## Security

* Is an IP address a reliable client identifier?
* How would you protect administrative policy endpoints?
* How would the design mitigate distributed abuse?
* How would you prevent attackers from creating unbounded numbers of Redis keys?

---

# Evaluation Criteria

## Requirements discovery

The candidate should identify:

* Client identity
* Policy granularity
* Expected traffic
* Burst behavior
* Accuracy expectations
* Multi-region requirements
* Failure behavior
* Dynamic policy management

## Algorithm selection

The candidate should:

* Explain the selected algorithm
* Describe its state
* Explain burst handling
* Discuss atomicity
* Compare at least one alternative

## Data architecture

The candidate should distinguish between:

* Durable policy configuration
* Ephemeral request counters
* Runtime bucket state
* Audit history

## Scalability

The candidate should address:

* Shared state across API servers
* Redis sharding
* Hot keys
* Key expiration
* Multi-region enforcement

## Reliability

The candidate should discuss:

* Redis replication and failover
* Timeouts
* Fail-open versus fail-closed behavior
* Local fallback strategies
* Single points of failure

## Security

The candidate should discuss:

* Authentication
* Trusted client identity
* Administrative authorization
* DDoS protection
* Abuse of high-cardinality keys

## Observability

The candidate should define:

* Decision latency
* Rejection metrics
* Storage health
* Failure-mode activation
* Policy-level monitoring

---

# Common Weaknesses

* Using an in-memory counter independently on every API server
* Treating Redis as durable policy storage without justification
* Performing separate read and write operations without atomicity
* Ignoring Redis failure behavior
* Claiming that relational databases always read from physical disk
* Using only an IP address as the client identity
* Ignoring key expiration
* Requiring a synchronous cross-region data-store call for every request
* Providing only one global rate limit
* Omitting HTTP `429` and retry metadata
* Treating Lua as the architecture rather than an implementation mechanism
* Allowing administrators to edit raw Redis keys directly
* Ignoring bursts, expensive endpoints, and customer-specific policies

---

# Hidden Failure Scenarios

## Scenario 1: Redis outage

Redis becomes unavailable for 45 seconds.

Evaluate whether the candidate has defined:

* Fail-open or fail-closed behavior
* Local fallback enforcement
* Timeouts and circuit breakers
* Recovery behavior

## Scenario 2: Hot API key

One enterprise customer generates 20% of total system traffic using a single API key.

Evaluate:

* Redis hot-key risk
* Partitioning limitations
* Customer-specific policies
* Whether the application infrastructure can absorb allowed traffic

## Scenario 3: Multi-region bypass

A client sends traffic through three regions and receives the full quota in each region.

Evaluate:

* Global versus regional semantics
* Quota allocation
* Acceptable over-admission
* Cross-region coordination trade-offs

## Scenario 4: High-cardinality attack

An attacker generates requests with millions of unique fake identifiers.

Evaluate:

* Key creation controls
* Expiration
* Authentication before rate-limit key creation
* Memory protection
* Edge-level DDoS filtering

## Scenario 5: Policy rollout error

An administrator accidentally changes a premium policy from 10,000 requests per minute to 10.

Evaluate:

* Policy validation
* Versioning
* Audit logs
* Staged rollout
* Fast rollback

---

# Recommended Architecture Decision

Use:

* **Token bucket** for runtime enforcement
* **Redis** for active bucket state
* **Atomic server-side evaluation** for concurrency correctness
* **PostgreSQL** for durable policy configuration and audit history
* **API gateway or middleware** for the first implementation
* **Administrative APIs** for policy management
* **Regional enforcement with explicit approximation** for multi-region deployments
* **Hybrid fail-open/fail-closed policies** based on endpoint risk

This architecture offers the best balance of latency, scalability, operational simplicity, and interview depth for an initial system-design solution.
