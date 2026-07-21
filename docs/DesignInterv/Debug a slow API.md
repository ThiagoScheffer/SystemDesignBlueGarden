# Debugging a Slow API Request

## Challenge Summary

Explain how to identify and fix the cause of a slow API request.

The main lesson is:

```text
Measure first.
Find the slow dependency.
Fix the bottleneck.
Validate the result.
```

Adding more servers may help when the application layer is overloaded, but it will not fix a slow database query, external dependency, lock, or network call.

---

# Basic Request Path

```text
Client
   |
   v
Load Balancer
   |
   v
API Service
   |
   +----> Cache
   |
   +----> Database
   |
   +----> Third-Party API
   |
   +----> Message Queue
```

A slow request may be caused by any component in this path.

---

# First Step: Measure the Request

Use distributed tracing to divide the request into timed operations.

Example:

```text
Total request latency: 1,240 ms

API processing:          40 ms
Cache lookup:             5 ms
Database query:         820 ms
Third-party API call:   340 ms
Response serialization: 35 ms
```

This immediately shows where most of the time is being spent.

---

# Required Observability Components

## Metrics

Track:

* Request rate
* Error rate
* P50 latency
* P95 latency
* P99 latency
* CPU utilization
* Memory utilization
* Active connections
* Queue depth
* Database latency
* Cache hit ratio
* Third-party latency

Averages alone are insufficient because they can hide slow outliers.

---

## Distributed Tracing

A trace records the operations performed during one request.

```text
API request
   |
   +---- Authentication: 12 ms
   +---- Cache lookup: 4 ms
   +---- Database query: 730 ms
   +---- External API: 180 ms
```

Tracing helps identify:

* Slow database queries
* Repeated calls
* Sequential dependencies
* Network delays
* Retry behavior
* Lock contention

---

## Structured Logging

Logs should include:

* Request ID
* Trace ID
* Endpoint
* User or tenant identifier
* Dependency name
* Duration
* Response status
* Error details

Example:

```json
{
  "traceId": "trace-123",
  "endpoint": "GET /orders",
  "dependency": "orders-database",
  "durationMs": 820,
  "status": "success"
}
```

Sensitive data should not be logged.

---

# Diagnostic Workflow

## 1. Confirm the Problem

Determine:

* Which endpoint is slow
* When the issue started
* Whether all users are affected
* Whether only one region or tenant is affected
* Whether latency is constant or intermittent
* Whether traffic recently increased

---

## 2. Check Application Saturation

Inspect:

* CPU
* Memory
* Worker threads
* Event-loop delay
* Connection pools
* Request queue
* Garbage collection
* Instance count

Adding servers is appropriate only when application instances are saturated and the downstream systems can support more traffic.

---

## 3. Inspect Database Calls

Check:

* Query duration
* Query plan
* Missing indexes
* Rows scanned
* Lock waits
* Connection-pool exhaustion
* Repeated queries
* Large result sets

Possible fixes:

* Add or improve indexes
* Rewrite inefficient queries
* Reduce selected columns
* Add pagination
* Batch queries
* Remove repeated queries
* Increase connection capacity carefully
* Cache frequently read results

---

## 4. Inspect External Dependencies

Check:

* Third-party latency
* Timeout configuration
* Retry count
* Failure rate
* DNS and connection setup time

Possible fixes:

* Set strict timeouts
* Use connection pooling
* Cache responses
* Retry only safe operations
* Use exponential backoff
* Add a circuit breaker
* Move nonessential calls out of the request path

---

## 5. Inspect Cache Behavior

Check:

* Cache hit ratio
* Cache latency
* Expired keys
* Hot keys
* Cache failures
* Stampedes

A cache helps only when the data can tolerate its consistency model and the cache actually serves a meaningful percentage of requests.

---

## 6. Inspect Sequential Work

Slow requests often contain independent tasks executed one after another.

Poor design:

```text
Database call:       300 ms
External API call:   400 ms
Second database call:200 ms

Total: approximately 900 ms
```

When operations are independent, they may run concurrently:

```text
Database call ───────┐
External call ───────┼──> Wait for all
Second query ────────┘

Total: approximately 400 ms
```

Parallel work increases dependency load and should be bounded.

---

## 7. Move Noncritical Work Asynchronously

The user should not wait for work that is not required to produce the response.

Examples:

* Email delivery
* Analytics events
* Audit export
* Report generation
* Image processing
* Search indexing

```text
API Service
   |
   +----> Return response
   |
   +----> Message Queue
              |
              v
          Worker
```

Do not move work asynchronously when the result is required for correctness.

---

# Common Root Causes

## Missing Database Index

Symptoms:

* High query latency
* Large row scans
* Database CPU increase

Fix:

* Add an index aligned with the query filter and sort pattern

---

## N+1 Query Problem

Example:

```text
Load 100 orders
Then query customer data 100 separate times
```

Fixes:

* Join data
* Batch lookup
* Preload related records

---

## Slow Third-Party API

Symptoms:

* Trace shows large external span
* Latency varies significantly
* Timeouts and retries increase

Fixes:

* Cache results
* Set timeouts
* Use circuit breakers
* Remove the dependency from the synchronous path

---

## Connection Pool Exhaustion

Symptoms:

* Requests wait before executing queries
* Database queries themselves appear fast
* Active connection count reaches the limit

Fixes:

* Reduce connection duration
* Correct leaked connections
* Tune pool size
* Reduce query latency
* Control concurrency

---

## Application Saturation

Symptoms:

* High CPU
* Increasing queue delay
* Multiple endpoints slow simultaneously

Fixes:

* Optimize processing
* Scale horizontally
* Apply backpressure
* Reduce expensive work

---

## Large Response

Symptoms:

* Serialization and transfer dominate the trace
* Response size is unusually large

Fixes:

* Pagination
* Field selection
* Compression
* Smaller payloads

---

# Required Simulator Components

## API Service

Configuration:

* Instance count
* Request capacity
* Processing latency
* Worker or event-loop capacity
* Failure state

## Database

Configuration:

* Query latency
* Read capacity
* Index enabled
* Connection-pool size
* Lock contention

## Cache

Configuration:

* Hit ratio
* Read latency
* TTL
* Failure state

## External API

Configuration:

* Base latency
* Timeout
* Failure rate
* Retry count

## Message Queue

Configuration:

* Queue depth
* Worker throughput
* Delivery delay

## Observability

Configuration:

* Metrics enabled
* Logging enabled
* Tracing enabled
* Sampling rate

---

# Important Metrics

The simulator should display:

* Total request latency
* Per-component latency
* P50, P95, and P99 latency
* Request queue delay
* Database query time
* Database connection wait time
* Cache hit ratio
* External API latency
* Retry count
* Response size
* CPU utilization
* Error rate

---

# Simulation Scenarios

## Scenario 1: Missing Index

Disable a database index.

Expected behavior:

* Query latency increases
* Rows scanned increase
* API latency increases

---

## Scenario 2: Add More API Servers

Increase API instance count while the database query remains slow.

Expected behavior:

* Application utilization decreases
* Database latency remains high
* Total request latency improves little or may worsen from additional database traffic

---

## Scenario 3: Slow Third-Party API

Increase external dependency latency.

Expected behavior:

* Trace shows a slow external span
* Request latency rises
* Timeouts may occur

---

## Scenario 4: Add Cache

Cache frequently read database results.

Expected behavior:

* Database request rate decreases
* Cache hits return faster
* Overall latency improves

---

## Scenario 5: Connection Pool Exhaustion

Reduce available database connections.

Expected behavior:

* Requests wait for connections
* Queue delay increases
* Database execution time may remain unchanged

---

## Scenario 6: Move Work to a Queue

Move notification or processing work out of the request path.

Expected behavior:

* User-facing latency decreases
* Queue depth increases
* Background completion is delayed

---

## Scenario 7: N+1 Queries

Enable repeated database lookups for each returned record.

Expected behavior:

* Database query count increases
* Latency grows with result size

---

# Interview Questions

* Why is adding more servers not always the correct fix?
* Which metrics would you inspect first?
* Why are P95 and P99 latency important?
* How does distributed tracing help?
* How would you identify a missing database index?
* What is the N+1 query problem?
* How does connection-pool exhaustion appear?
* When should caching be added?
* Which work can be moved asynchronously?
* How should slow third-party APIs be handled?
* How would you validate that a fix worked?

---

# Evaluation Criteria

The candidate should understand that:

* Diagnosis should precede scaling.
* End-to-end latency must be divided into component-level spans.
* Application, database, cache, network, and external services can all be bottlenecks.
* More API servers do not fix downstream bottlenecks.
* Database indexes should match actual query patterns.
* Noncritical slow work can move to asynchronous workers.
* Tail latency is more informative than averages.
* Every change should be validated with before-and-after measurements.

---

# Common Weaknesses

* Adding servers before identifying the bottleneck
* Looking only at average latency
* Adding indexes without examining query patterns
* Adding caching without considering invalidation
* Retrying slow dependencies without limits
* Ignoring connection-pool wait time
* Moving correctness-critical work to a queue
* Logging without request or trace identifiers
* Optimizing one component without measuring total latency
* Declaring success without comparing metrics before and after

---

# Recommended Teaching Model

Use:

* One client
* One load balancer
* One or more API instances
* One database
* One optional cache
* One external API
* One optional message queue
* One tracing component

Allow the user to:

1. Run a normal API request.
2. Increase database query latency.
3. Inspect the trace.
4. Add API instances and observe limited improvement.
5. Enable a database index.
6. Add a cache.
7. Slow the external API.
8. Configure timeouts and a circuit breaker.
9. Move noncritical work to a queue.
10. Compare P95 latency before and after each change.

The central lesson is:

```text
Do not guess which component is slow.
Measure the complete request path and fix the dominant bottleneck.
```
