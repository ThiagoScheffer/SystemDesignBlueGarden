# Why Cache Invalidation Is Difficult

## Core Idea

A cache stores data in a faster location so requests do not need to query the original data source every time.

```text
Client
   |
   v
Application
   |
   +----> Cache
   |
   +----> Database
```

Caching is easy while the underlying data does not change.

The difficulty begins when the database is updated but older copies still exist in one or more caches.

---

# The Main Problem

Assume the database contains:

```text
Product price: $100
```

The cache also contains:

```text
Product price: $100
```

The database is updated:

```text
Product price: $80
```

If the cache is not updated or removed, users may continue seeing the old value:

```text
Cached product price: $100
```

This is stale data.

Cache invalidation is the process of deciding when cached data should be:

* Deleted
* Updated
* Refreshed
* Allowed to expire

---

# Cache Locations

A system may contain several cache layers:

```text
Browser Cache
      |
      v
CDN Cache
      |
      v
Application Cache
      |
      v
Distributed Cache
      |
      v
Database
```

Common cache locations include:

* Browser cache
* CDN cache
* Reverse proxy cache
* Application memory
* Distributed cache such as Redis
* Database page cache

Each layer may have different expiration and invalidation behavior.

---

# Basic Cache Strategies

## Cache-Aside

The application checks the cache first.

```text
1. Read cache
2. If found, return value
3. If missing, read database
4. Store result in cache
5. Return value
```

```text
Application
   |
   +----> Cache
   |
   +----> Database
```

Advantages:

* Simple
* Only requested data is cached
* Database remains the source of truth

Limitations:

* First request after a miss is slower
* Updated data may remain stale
* Many simultaneous misses can overload the database

---

## Time-to-Live Expiration

Each cache entry expires after a configured duration.

Example:

```text
Cache TTL: 5 minutes
```

Advantages:

* Simple invalidation model
* Stale data eventually disappears
* No explicit invalidation event required

Limitations:

* Data may remain stale until expiration
* Short TTLs reduce cache effectiveness
* Long TTLs increase staleness

---

## Invalidate on Write

When the database changes, the corresponding cache entry is deleted.

```text
1. Update database
2. Delete cached value
3. Next read reloads the cache
```

Advantages:

* Database remains authoritative
* Reduces stale reads
* Simple compared with updating every cached representation

Limitations:

* Invalidation can fail
* Related cache keys may be missed
* Concurrent reads can repopulate old data

---

## Write-Through

Writes update the cache and the database as part of the same request flow.

```text
Application
   |
   v
Cache
   |
   v
Database
```

Advantages:

* Cache contains recently written data
* Reads can remain fast

Limitations:

* Writes become slower
* Partial failures require careful handling
* Unused data may be cached

---

## Write-Behind

Writes are accepted by the cache and persisted to the database asynchronously.

```text
Application
   |
   v
Cache
   |
   v
Write Queue
   |
   v
Database
```

Advantages:

* Low write latency
* Writes can be batched

Limitations:

* Data may be lost if the cache fails
* Database updates are delayed
* Ordering and retry behavior are more complex

This strategy is unsuitable when durable confirmation is required immediately.

---

# Why Checking the Database Defeats the Cache

A cache improves performance by avoiding repeated access to a slower data source.

If every cache read also verifies the value against the database:

```text
Read cache
Read database
Compare values
Return result
```

the system still performs the expensive database operation.

This removes most of the latency and load reduction provided by caching.

A system normally accepts some bounded staleness or uses invalidation events rather than validating every read.

---

# Common Consistency Problems

## Stale Read

The cache contains an older value than the database.

## Lost Invalidation

The database update succeeds, but the cache invalidation fails.

## Race Condition

Example:

```text
1. Request A reads old database value
2. Request B updates database
3. Request B deletes cache
4. Request A writes old value back into cache
```

The cache now contains stale data again.

## Multiple Cache Keys

One database record may appear in many cached forms:

```text
product:123
search:shoes:page:1
category:footwear
homepage:featured
```

Updating the product may require invalidating all related keys.

## Multi-Layer Staleness

The application cache may be fresh while the CDN or browser still serves an older response.

---

# Browser and CDN Caching

Browsers and CDNs may cache:

* JavaScript
* CSS
* Images
* Videos
* API responses
* HTML pages

Useful HTTP headers include:

```http
Cache-Control: max-age=300
ETag: "version-42"
Last-Modified: Tue, 21 Jul 2026 10:00:00 GMT
```

For static assets, versioned filenames are often safer:

```text
app.v42.js
logo.8f3a2c.png
```

When the content changes, the filename changes, so clients request a new object instead of reusing the old cached version.

---

# Required Simulator Components

## Database

Configuration:

* Read latency
* Write latency
* Read capacity
* Write capacity
* Availability

## Distributed Cache

Configuration:

* Capacity
* Read latency
* Write latency
* TTL
* Eviction policy
* Failure state

## Application Cache

Configuration:

* Local capacity
* TTL
* Per-instance state

## CDN Cache

Configuration:

* TTL
* Cache hit ratio
* Invalidation delay
* Regional nodes

## Browser Cache

Configuration:

* Cache-control policy
* Maximum age
* Asset version

---

# Important Metrics

The simulator should display:

* Cache hit ratio
* Cache miss ratio
* Database request rate
* Cache latency
* Database latency
* Stale-read count
* Expired-entry count
* Eviction count
* Invalidation failures
* Cache memory utilization
* Database load
* Request latency

---

# Simulation Scenarios

## Scenario 1: Long TTL

Set a long cache lifetime and update the database.

Expected behavior:

* High cache hit ratio
* Low database load
* Longer stale-data period

## Scenario 2: Short TTL

Reduce the cache lifetime significantly.

Expected behavior:

* Fresher data
* More cache misses
* Higher database load

## Scenario 3: Lost Invalidation

Update the database but fail to delete the cache entry.

Expected behavior:

* Cache continues serving stale data
* Staleness lasts until expiration or manual correction

## Scenario 4: Cache Stampede

A popular cache key expires while many requests arrive.

Expected behavior:

* Many requests query the database simultaneously
* Database utilization spikes
* Request latency increases

Possible mitigation:

* Request coalescing
* Locking
* Early refresh
* Staggered expiration
* Random TTL jitter

## Scenario 5: Cache Failure

The distributed cache becomes unavailable.

Expected behavior:

* Requests fall back to the database
* Database load increases sharply
* The database may become overloaded

## Scenario 6: Multi-Layer Cache

Update content in the database and application cache, but leave the CDN cache unchanged.

Expected behavior:

* Some users continue seeing stale content
* Different regions may observe different versions

---

# Interview Questions

* What problem does caching solve?
* Why does cached data become stale?
* What is cache-aside?
* What is the difference between write-through and write-behind?
* How does TTL affect freshness and performance?
* Why not verify every cached value against the database?
* What is a cache stampede?
* How would you invalidate related cache keys?
* What happens when the cache fails?
* How do browser and CDN caches affect invalidation?

---

# Evaluation Criteria

The candidate should understand that:

* A cache stores copies of data.
* The database or primary store is usually the source of truth.
* Cached copies can become stale after writes.
* TTL trades freshness for performance.
* Explicit invalidation can fail.
* Multiple cache layers increase complexity.
* Cache failures can overload the database.
* Checking the database on every cache read removes most of the cache benefit.

---

# Common Weaknesses

* Assuming TTL guarantees fresh data
* Updating the database without invalidating the cache
* Treating the cache as durable storage without justification
* Ignoring race conditions during refresh
* Ignoring browser and CDN caches
* Using the same TTL for every type of data
* Allowing every request to refresh an expired popular key
* Assuming a high cache hit ratio always means correct behavior
* Failing to plan for cache outages

---

# Recommended Teaching Model

Use:

* One application service
* One database
* One distributed cache
* Optional browser or CDN cache
* Configurable TTL
* Cache-aside reads
* Invalidate-on-write behavior
* Optional invalidation failure

Allow the user to:

1. Run traffic without a cache.
2. Add a cache and observe lower latency.
3. Update database data.
4. Observe stale cached results.
5. Change the TTL.
6. Enable explicit invalidation.
7. Simulate an invalidation failure.
8. Trigger a cache stampede.

The central lesson is:

```text
Caching improves speed by serving copies.
Invalidation is difficult because every copy must become outdated safely.
```
