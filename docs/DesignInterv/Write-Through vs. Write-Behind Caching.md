# Write-Through vs. Write-Behind Caching

## Challenge Summary

Write requests are slow because the application waits for both the cache and the database to complete before responding.

The main concepts are:

* Write-through caching
* Write-behind caching
* Write latency
* Durability
* Asynchronous persistence
* Retry queues
* Data-loss risk

---

# Basic Architecture

```text
Client
   |
   v
Application Service
   |
   +----> Cache
   |
   +----> Database
```

The difference is when the database write happens and when the application responds.

---

# Write-Through Cache

In write-through caching, the application updates both the cache and the database before confirming success.

```text
Client
   |
   v
Application
   |
   +----> Cache
   |
   +----> Database
   |
   v
Return success after required writes complete
```

## Write Flow

1. Client sends a write request.
2. Application updates the cache.
3. Application updates the database.
4. Application waits for both operations.
5. Success is returned.

## Advantages

* Database is updated immediately.
* Cache and database are easier to keep synchronized.
* Lower risk of acknowledged data loss.
* Reads can use the updated cache immediately.

## Limitations

* Write latency includes the database write.
* Database slowdown affects user-facing latency.
* Partial failures require rollback or repair logic.

---

# Write-Behind Cache

In write-behind caching, the application confirms the write before the database is updated.

```text
Client
   |
   v
Application
   |
   v
Cache / Durable Buffer
   |
   v
Return success
   |
   v
Background Worker
   |
   v
Database
```

## Write Flow

1. Client sends a write request.
2. Application writes to the cache or buffer.
3. Application returns success.
4. A background worker writes the data to the database later.
5. Failed writes are retried.

## Advantages

* Lower user-facing write latency.
* Database writes can be batched.
* Traffic spikes can be buffered.
* The database is removed from the synchronous request path.

## Limitations

* Acknowledged data may not yet exist in the database.
* Cache or buffer failure can cause data loss.
* Ordering becomes more complex.
* Retries and duplicate writes must be handled.
* Reads must account for data not yet persisted.

---

# Important Correction

A normal cache is not automatically a safe write-behind buffer.

If the application acknowledges a write after storing it only in a volatile cache, data may be lost when:

* The cache process crashes
* The node is restarted
* The cache evicts the entry
* Replication has not completed
* The background worker fails permanently

A safer design uses a durable queue, log, or replicated cache with persistence.

```text
Application
   |
   v
Durable Queue or Log
   |
   v
Database Writer
```

Examples of suitable concepts:

* Message queue
* Append-only log
* Persistent Redis configuration
* Replicated event stream

---

# Required Components

## Application Service

Configuration:

* Request capacity
* Write timeout
* Acknowledgement policy
* Failure state

## Cache or Write Buffer

Configuration:

* Persistence enabled
* Replication factor
* Capacity
* Write latency
* Eviction behavior
* Failure state

## Database

Configuration:

* Write latency
* Write throughput
* Availability
* Failure state

## Write-Behind Worker

Configuration:

* Worker count
* Batch size
* Flush interval
* Retry count
* Retry backoff
* Maximum queue delay

## Dead-Letter Queue

Stores writes that cannot be persisted after repeated attempts.

---

# Acknowledgement Policies

## Synchronous Durable Write

Return success only after the database commits.

```text
Lowest data-loss risk
Highest latency
```

## Replicated Buffer Acknowledgement

Return success after the write reaches a durable replicated buffer.

```text
Lower latency
Good durability
Database persistence delayed
```

## Single Cache Acknowledgement

Return success after one volatile cache write.

```text
Lowest latency
Highest data-loss risk
```

The simulator should allow users to choose the acknowledgement level.

---

# Ordering

Write-behind systems must preserve the correct order of updates.

Example:

```text
1. Set account status to active
2. Set account status to suspended
```

If the second write reaches the database first, the final state may be wrong.

Possible solutions:

* Partition writes by entity ID
* Process each entity sequentially
* Attach version numbers
* Reject older versions
* Use ordered queues

---

# Idempotency

The worker may retry a database write after a timeout.

The database operation must be safe to repeat.

Example:

```text
Write ID: operation-123
```

The database records processed write IDs or uses an upsert with a version.

Without idempotency, retries may create:

* Duplicate records
* Duplicate payments
* Incorrect counters
* Repeated side effects

---

# Read Consistency

After a write-behind acknowledgement, the database may still contain the old value.

Possible approaches:

## Read from Cache First

The user sees the latest buffered value.

Risk:

* Cache failure exposes older database state.

## Read-Your-Writes Session

Route the user’s reads to the cache until persistence completes.

## Version Check

Store versions in both cache and database and return the newest available version.

The consistency requirement should be explicit.

---

# Failure Scenarios

## Scenario 1: Slow Database

Increase database write latency.

Write-through result:

* User-facing latency increases.

Write-behind result:

* User-facing latency remains low.
* Queue depth increases.

---

## Scenario 2: Worker Failure

Stop the write-behind worker.

Expected behavior:

* New writes continue entering the buffer.
* Persistence delay increases.
* Queue capacity may eventually be exhausted.

---

## Scenario 3: Cache Failure Before Flush

Fail the cache before buffered data reaches the database.

Expected behavior depends on configuration:

* Volatile cache: acknowledged writes may be lost.
* Replicated persistent buffer: writes may survive.

---

## Scenario 4: Database Outage

The database becomes unavailable.

Expected behavior:

* Write-through requests fail or time out.
* Write-behind requests may continue until the buffer fills.
* Worker retries with backoff.
* Persistence lag increases.

---

## Scenario 5: Duplicate Retry

The worker times out after the database committed a write and retries it.

Expected behavior:

* Idempotent write: no duplicate effect.
* Non-idempotent write: duplicate data or side effects.

---

## Scenario 6: Out-of-Order Writes

Two updates for the same record are processed in the wrong order.

Expected behavior:

* Final database state may become stale.
* Versioning or partitioned ordering prevents the error.

---

## Scenario 7: Buffer Capacity Exhaustion

Traffic exceeds worker throughput.

Expected behavior:

* Queue depth grows.
* Persistence delay increases.
* The system eventually applies backpressure or rejects writes.

---

# Important Metrics

The simulator should display:

* User-facing write latency
* Database write latency
* Buffer depth
* Persistence lag
* Worker throughput
* Retry count
* Failed writes
* Dead-letter queue size
* Data-loss count
* Duplicate-write count
* Out-of-order-write count
* Buffer utilization

---

# Interview Questions

* What is write-through caching?
* What is write-behind caching?
* Why is write-behind faster?
* When is it safe to acknowledge a write?
* What happens if the cache fails?
* How do you preserve write ordering?
* How do you make retries idempotent?
* What happens when the database is unavailable?
* How do users read their latest write?
* When should write-behind not be used?

---

# Evaluation Criteria

The candidate should understand:

* Write-through waits for synchronous persistence.
* Write-behind moves database writes out of the request path.
* Lower latency is exchanged for delayed persistence and additional complexity.
* A volatile cache is not a reliable durable queue.
* Retries require idempotency.
* Related writes may require ordering.
* Buffer capacity and worker throughput must be monitored.
* Write-behind is inappropriate when immediate durable confirmation is required.

---

# Common Weaknesses

* Treating any cache as a durable write buffer
* Ignoring cache eviction
* Acknowledging critical writes before durable replication
* Ignoring worker failure
* Retrying non-idempotent writes
* Ignoring write ordering
* Allowing the buffer to grow without limits
* Assuming the database and cache are always synchronized
* Using write-behind for payments or other irreversible operations without stronger guarantees

---

# Recommended Teaching Model

Use:

* One application service
* One cache or durable buffer
* One database
* One write-behind worker
* One retry queue
* Optional replication and persistence

Allow the user to:

1. Run writes using write-through.
2. Increase database latency.
3. Observe higher request latency.
4. Enable write-behind.
5. Compare request latency and persistence lag.
6. Stop the worker.
7. Fail the cache before flushing.
8. Enable persistence and replication.
9. Trigger duplicate retries.
10. Enable idempotency and ordered processing.

The central lesson is:

```text
Write-through → persist before responding
Write-behind → respond before database persistence
```

Write-behind improves latency only by accepting delayed durability and greater operational complexity.
