# Preventing Cache Stampedes

## Challenge Summary

A cache stampede happens when a popular cache entry expires and many requests attempt to rebuild it at the same time.

```text
Popular key expires
        |
        v
Many requests miss the cache
        |
        v
All requests query the database
        |
        v
Database overload
```

The main mitigation techniques are:

* Request coalescing
* Cache locking
* Stale-while-revalidate
* Background refresh
* TTL jitter

---

# Basic Architecture

```text
Clients
   |
   v
Application Service
   |
   +----> Distributed Cache
   |
   +----> Database
   |
   +----> Refresh Worker
```

## Required Components

### Application Service

Handles requests and checks the cache.

Configuration:

* Request capacity
* Cache timeout
* Database timeout
* Lock wait timeout
* Failure behavior

### Distributed Cache

Stores frequently accessed values.

Configuration:

* TTL
* Read latency
* Write latency
* Lock support
* Failure state

### Database

Stores the authoritative data.

Configuration:

* Read capacity
* Query latency
* Failure state

### Refresh Worker

Refreshes selected cache entries before or after expiration.

Configuration:

* Worker count
* Refresh interval
* Refresh throughput
* Hot-key list

---

# Cache Stampede Example

Assume a popular product entry receives:

```text
10,000 requests per second
```

The cache entry expires.

Without protection:

```text
10,000 cache misses
        |
        v
10,000 database queries
```

Even if the database normally handles only a small number of queries for that key, expiration can create a sudden load spike.

---

# Strategy 1: Cache Locking

Only one request is allowed to rebuild the cache.

```text
Cache miss
   |
   v
Acquire lock
   |
   +----> Lock acquired → query database and refresh cache
   |
   +----> Lock unavailable → wait, retry, or use stale data
```

## Advantages

* Prevents duplicate database queries
* Simple to understand
* Effective for expensive cache rebuilds

## Limitations

* Waiting requests may time out
* A failed request may leave the lock stuck
* Lock contention increases latency
* The lock needs an expiration time

Important configuration:

```text
Lock TTL: 5 seconds
Maximum wait: 500 milliseconds
```

The lock TTL should prevent a crashed request from blocking refresh indefinitely.

---

# Strategy 2: Request Coalescing

Request coalescing, also called single-flight deduplication, combines identical concurrent requests.

```text
Request A ─┐
Request B ─┼──> One database query
Request C ─┘          |
                      v
              Shared result returned
```

Only one request performs the backend operation. Other matching requests wait for the same result.

## Advantages

* Reduces duplicate backend work
* Does not require every request to acquire a distributed lock
* Effective for sudden bursts
* Works for cache misses and other expensive operations

## Limitations

* Usually operates only within one application instance unless coordination is distributed
* Waiting requests still depend on the original request
* A slow or failed request affects all grouped requests
* Requests must have an exact or compatible deduplication key

The correct term is **request coalescing**, not request coalition.

---

# Strategy 3: Stale-While-Revalidate

The system temporarily serves an expired value while refreshing it in the background.

```text
Cache entry becomes stale
        |
        +----> Return stale value
        |
        +----> Start one background refresh
```

## Advantages

* Users receive fast responses
* Database traffic remains controlled
* Requests do not wait for cache rebuilding

## Limitations

* Users may receive stale data
* Not appropriate for strongly consistent information
* The system must define how long stale data may be served

Example:

```text
Fresh TTL: 5 minutes
Stale window: 1 minute
```

During the stale window, the old value may be returned while one request refreshes it.

---

# Strategy 4: Background Refresh

A worker refreshes known hot keys before they expire.

```text
Refresh Worker
      |
      v
Detect key approaching expiration
      |
      v
Load fresh value
      |
      v
Update cache
```

## Advantages

* Popular keys remain warm
* User requests avoid rebuild latency
* Effective for predictable access patterns

## Limitations

* Requires identifying hot keys
* Wastes resources refreshing unused data
* Sudden new hot keys may still stampede
* Worker failure can allow entries to expire

Background refresh is useful, but it should not be the only protection.

---

# Strategy 5: TTL Jitter

If many cache entries receive the same TTL, they may expire simultaneously.

Poor configuration:

```text
All keys expire after exactly 5 minutes
```

Better configuration:

```text
TTL = 5 minutes ± random variation
```

Example:

```text
Base TTL: 300 seconds
Random jitter: 0–60 seconds
```

## Advantages

* Spreads cache misses over time
* Prevents synchronized expiration
* Simple to implement

## Limitations

* Does not protect one extremely popular key
* Does not eliminate cache misses
* Only reduces coordinated expiration

---

# Recommended Combined Strategy

A strong design combines several techniques:

```text
Cache hit
   |
   v
Return value

Cache stale
   |
   +----> Return stale value
   +----> Coalesce refresh request

Cache missing
   |
   +----> Coalesce identical requests
   +----> Query database once
   +----> Store with TTL jitter
```

For known hot keys:

```text
Background worker refreshes before expiration
```

This avoids relying on a single mitigation.

---

# Failure Behavior

## Rebuild Request Fails

Possible responses:

* Continue serving stale data
* Retry with backoff
* Release the lock
* Return an error if no stale value exists

## Lock Holder Crashes

The lock must expire automatically.

```text
Lock TTL prevents permanent lock
```

## Database Is Overloaded

The application may:

* Serve stale data
* Limit refresh concurrency
* Apply backpressure
* Reject low-priority requests
* Retry with exponential backoff

## Cache Is Unavailable

Requests may fall back to the database, but this can create a larger stampede.

The application should limit database concurrency during cache failure.

---

# Important Metrics

The simulator should display:

* Cache hit ratio
* Cache miss rate
* Database query rate
* Coalesced request count
* Lock acquisition rate
* Lock wait time
* Stale responses served
* Refresh failures
* Refresh duration
* Cache rebuild latency
* Database utilization
* Request timeout rate

---

# Simulation Scenarios

## Scenario 1: Popular Key Expiration

A highly requested key expires.

Without protection:

* Database request rate spikes
* Latency increases
* Requests may fail

## Scenario 2: Cache Locking

Enable locking.

Expected behavior:

* One request rebuilds the cache
* Other requests wait
* Database load remains controlled
* Request latency may increase

## Scenario 3: Slow Rebuild

The database query takes several seconds.

Expected behavior:

* Waiting requests may time out
* Stale-while-revalidate performs better

## Scenario 4: Request Coalescing

Enable request coalescing.

Expected behavior:

* Identical requests share one backend query
* Database load decreases
* All waiting requests receive the same result

## Scenario 5: Background Refresh Failure

The refresh worker stops.

Expected behavior:

* Hot keys eventually expire
* Request-time protection is still required

## Scenario 6: Synchronized Expiration

Thousands of cache keys expire at the same time.

Expected behavior:

* Database load spikes
* TTL jitter spreads the refresh workload

## Scenario 7: Cache Outage

The distributed cache fails.

Expected behavior:

* Requests fall back to the database
* Concurrency limits are needed to protect the database

---

# Interview Questions

* What is a cache stampede?
* Why does a popular key create more risk?
* How does cache locking work?
* What happens if the lock holder fails?
* What is request coalescing?
* How is request coalescing different from locking?
* What is stale-while-revalidate?
* When is serving stale data unacceptable?
* How does TTL jitter help?
* Why is background refresh insufficient by itself?
* What happens when the entire cache fails?

---

# Evaluation Criteria

The candidate should understand that:

* A cache miss can trigger many identical backend requests.
* Locking allows one request to rebuild the value.
* Locks require expiration and timeout behavior.
* Request coalescing deduplicates concurrent identical work.
* Stale-while-revalidate avoids making users wait.
* Background refresh works best for known hot keys.
* TTL jitter prevents synchronized expiration.
* Multiple techniques are usually combined.
* Cache failure can overload the database.

---

# Common Weaknesses

* Making every request wait indefinitely for a lock
* Using a lock without an expiration
* Assuming background refresh detects every future hot key
* Calling request coalescing “request coalition”
* Treating request coalescing as automatically distributed across all servers
* Serving stale data without defining a maximum stale period
* Giving every cache entry the same expiration time
* Retrying failed refreshes without backoff
* Allowing unlimited database fallback during cache outages
* Using only one stampede-prevention technique

---

# Recommended Teaching Model

Use:

* One application service
* One distributed cache
* One database
* One optional refresh worker
* One highly requested cache key
* Configurable TTL
* Optional locking
* Optional request coalescing
* Optional stale-while-revalidate
* Optional TTL jitter

Allow the user to:

1. Expire a popular key without protection.
2. Observe the database traffic spike.
3. Enable cache locking.
4. Increase rebuild latency.
5. Observe waiting-request timeouts.
6. Enable stale-while-revalidate.
7. Enable request coalescing.
8. Add background refresh.
9. Expire many keys simultaneously.
10. Enable TTL jitter.

The central lesson is:

```text
Cache locking → one request rebuilds the value
Request coalescing → identical requests share one result
Stale-while-revalidate → users receive old data during refresh
Background refresh → known hot keys are refreshed early
TTL jitter → keys do not expire at the same time
```
