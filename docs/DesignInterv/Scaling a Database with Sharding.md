# Scaling a Database with Sharding

## Challenge Summary

Explain how a database can scale horizontally by splitting data across multiple database nodes.

The main concepts are:

* Sharding
* Shard-key selection
* Hash-based partitioning
* Consistent hashing
* Virtual nodes
* Rebalancing
* Hot shards
* Node failure

---

# Start with the Bottleneck

Before sharding, determine what resource is limiting the database:

* Read throughput
* Write throughput
* Storage capacity
* CPU
* Memory
* Connections
* Query latency

Sharding is mainly useful when one database node can no longer support the required write load or data volume.

Read replicas may be sufficient when the primary problem is read traffic.

---

# Basic Sharding

Sharding divides a dataset across multiple database nodes.

```text
Application
     |
     v
Shard Router
     |
     +----> Database Shard 1
     +----> Database Shard 2
     +----> Database Shard 3
```

Each shard stores only part of the total data.

Example:

```text
Shard 1 → Users 1–1,000,000
Shard 2 → Users 1,000,001–2,000,000
Shard 3 → Users 2,000,001–3,000,000
```

---

# Shard Key

The shard key determines where each record is stored.

Possible shard keys include:

* User ID
* Tenant ID
* Customer ID
* Geographic region
* Order ID
* Time range

A good shard key should:

* Distribute data evenly
* Distribute traffic evenly
* Match common access patterns
* Avoid frequent cross-shard queries
* Remain stable over time

User ID is common, but it is not always the correct choice.

For example, if most queries are organized by tenant, then tenant ID may be a better shard key.

---

# Simple Hash Partitioning

A basic strategy is:

```text
shard = hash(shardKey) mod numberOfShards
```

Example:

```text
hash(user-123) mod 3 = shard 2
```

## Advantages

* Simple
* Usually distributes random keys reasonably well
* Fast routing decision

## Limitation

Changing the number of shards changes the result for many keys.

For example:

```text
hash(key) mod 3
```

may map to a different shard than:

```text
hash(key) mod 4
```

Adding or removing a shard can therefore require moving a large portion of the dataset.

---

# Consistent Hashing

Consistent hashing reduces the amount of data movement when nodes are added or removed.

The hash space is represented as a ring.

```text
                 Shard A
              /           \
         keys                 keys
       /                         \
  Shard D                       Shard B
       \                         /
         keys                 keys
              \           /
                 Shard C
```

## Placement

1. Hash the shard key.
2. Place the hash value on the ring.
3. Move clockwise.
4. Store the record on the first shard encountered.

```text
hash(userId)
      |
      v
Position on ring
      |
      v
Next shard clockwise
```

## Adding a Node

When a new shard is added, only part of the ring changes ownership.

```text
Before:
Shard A owns a large range.

After:
New Shard E takes part of Shard A's range.
```

Only records in the affected range need to move.

## Removing a Node

When a shard is removed, its keys move to the next shard on the ring.

This is cheaper than recalculating every key using a new modulus.

---

# Virtual Nodes

Using one ring position per physical database can create uneven distribution.

Virtual nodes solve this by assigning several ring positions to each physical shard.

```text
Physical Shard A:
- Virtual Node A1
- Virtual Node A2
- Virtual Node A3

Physical Shard B:
- Virtual Node B1
- Virtual Node B2
- Virtual Node B3
```

The ring contains the virtual nodes:

```text
A1 → B2 → C1 → A3 → C2 → B1 → A2
```

## Advantages

* More even data distribution
* More even traffic distribution
* Smaller ownership ranges
* Easier rebalancing
* Easier redistribution after node failure
* Supports different node capacities

A larger database node may be assigned more virtual nodes than a smaller one.

---

# Required Components

## Shard Router

Determines which database shard should receive a request.

Responsibilities:

* Hash the shard key
* Read the shard map
* Route reads and writes
* Handle shard-map changes
* Retry during migration

Configuration:

* Hashing strategy
* Shard-key field
* Shard map
* Routing latency
* Failure behavior

## Database Shard

Stores one partition of the data.

Configuration:

* Storage capacity
* Read capacity
* Write capacity
* CPU capacity
* Replication factor
* Current utilization
* Status

## Shard Map

Stores the relationship between hash ranges and shards.

Example:

```text
Range 0–999       → Shard A
Range 1000–1999   → Shard B
Range 2000–2999   → Shard C
```

The shard map must be versioned so routers can detect changes.

## Rebalancing Worker

Moves data when shards are added, removed, or overloaded.

Responsibilities:

* Copy records
* Track migration progress
* Verify copied data
* Switch ownership
* Delete old copies safely
* Limit migration bandwidth

---

# Request Flow

## Write

1. Application identifies the shard key.
2. Shard router hashes the key.
3. Router selects the responsible shard.
4. Write is sent to that shard.
5. Shard persists and replicates the data.
6. Result is returned.

## Read

1. Application provides the shard key.
2. Router finds the responsible shard.
3. Query is sent to that shard.
4. Result is returned.

Queries without the shard key may need to contact many shards.

---

# Cross-Shard Queries

Some queries cannot be answered by one shard.

Example:

```text
Find the 100 largest orders across all customers
```

The system may need to:

1. Query every shard.
2. Collect partial results.
3. Merge and sort them.
4. Return the final result.

This is called a scatter-gather query.

## Problems

* Higher latency
* More database work
* More network traffic
* Partial failure handling
* Difficult transactions

A good shard key reduces the frequency of cross-shard operations.

---

# Hot Shards

Even data distribution does not guarantee even traffic distribution.

Example:

* Most users generate little traffic.
* One large tenant generates 40% of all requests.
* All of that tenant's data is stored on one shard.

That shard becomes hot.

Possible mitigations:

* Use a more granular shard key
* Split large tenants
* Add a secondary partition key
* Cache frequently read data
* Assign more capacity
* Use dedicated shards for large tenants

---

# Replication and Sharding

Sharding and replication solve different problems.

* **Sharding** divides data across nodes for capacity.
* **Replication** copies data for availability and read scaling.

```text
Shard A
   |
   +----> Primary
   +----> Replica 1
   +----> Replica 2

Shard B
   |
   +----> Primary
   +----> Replica 1
   +----> Replica 2
```

A production sharded database usually uses both.

---

# Rebalancing Flow

When a new shard is added:

1. Add the shard to the ring.
2. Calculate the ranges it will own.
3. Copy matching data from existing shards.
4. Keep writes synchronized during migration.
5. Verify the copied data.
6. Update the shard map.
7. Route traffic to the new owner.
8. Remove old copies after a safe period.

Rebalancing should be gradual because migration traffic competes with normal database traffic.

---

# Important Metrics

The simulator should display:

* Records per shard
* Storage usage per shard
* Read throughput per shard
* Write throughput per shard
* CPU utilization
* Query latency
* Hot-shard ratio
* Cross-shard query count
* Data moved during rebalancing
* Rebalancing progress
* Migration bandwidth
* Failed requests
* Shard-map version

---

# Simulation Scenarios

## Scenario 1: Vertical Scaling

Increase the resources of one database node.

Expected behavior:

* Capacity increases
* No sharding complexity
* The database still has a maximum size

## Scenario 2: Simple Modulo Sharding

Distribute data using:

```text
hash(key) mod shardCount
```

Then add a new shard.

Expected behavior:

* Many records map to different shards
* Large data migration is required

## Scenario 3: Consistent Hashing

Add a shard to a consistent-hashing ring.

Expected behavior:

* Only part of the data moves
* Migration cost is lower than modulo rehashing

## Scenario 4: Uneven Ring Distribution

Use one ring position per shard.

Expected behavior:

* Some shards own much larger ranges
* Storage and traffic become uneven

## Scenario 5: Enable Virtual Nodes

Assign multiple virtual nodes to each physical shard.

Expected behavior:

* Distribution becomes more balanced
* Rebalancing is divided into smaller ranges

## Scenario 6: Hot Tenant

One tenant generates significantly more traffic than others.

Expected behavior:

* One shard becomes overloaded
* Even record distribution does not prevent traffic imbalance

## Scenario 7: Shard Failure

One shard becomes unavailable.

Expected behavior:

* Data on other shards remains accessible
* Requests for the failed shard require replicas or failover
* Sharding alone does not provide availability

## Scenario 8: Rebalancing Overload

Add a node while the system is under high traffic.

Expected behavior:

* Migration consumes network and database capacity
* Normal request latency may increase
* Rebalancing should be throttled

---

# Interview Questions

* What problem does sharding solve?
* How do you select a shard key?
* Why is user ID not always the best shard key?
* What is wrong with `hash(key) mod shardCount`?
* How does consistent hashing reduce data movement?
* Why are virtual nodes useful?
* What is a hot shard?
* What is a scatter-gather query?
* How do sharding and replication differ?
* How is data moved safely during rebalancing?
* What happens when a shard fails?
* How would you handle a very large tenant?

---

# Evaluation Criteria

The candidate should understand:

* Sharding divides data across multiple databases.
* The shard key must match access patterns.
* Modulo hashing causes expensive reshuffling when shard count changes.
* Consistent hashing reduces data movement.
* Virtual nodes improve distribution and rebalancing.
* Even data distribution does not guarantee even traffic.
* Queries without the shard key may require scatter-gather.
* Replication is still required for availability.
* Rebalancing must be controlled and observable.

---

# Common Weaknesses

* Sharding before identifying the actual bottleneck
* Assuming user ID is always the correct shard key
* Rehashing the entire dataset whenever a node is added
* Using consistent hashing without virtual nodes
* Ignoring hot tenants
* Ignoring cross-shard queries
* Assuming sharding automatically provides replication
* Moving data without controlling migration traffic
* Updating the shard map without versioning
* Ignoring transactions across shards
* Assuming data volume and request traffic are distributed identically

---

# Recommended Teaching Model

Use:

* One shard router
* Two to six database shards
* Configurable shard key
* Modulo hashing
* Optional consistent hashing
* Configurable virtual-node count
* One rebalancing worker
* Optional replicas

Allow the user to:

1. Start with one database.
2. Increase traffic and data volume.
3. Add shards using modulo hashing.
4. Observe the amount of data moved.
5. Switch to consistent hashing.
6. Add or remove a shard again.
7. Enable virtual nodes.
8. Create a hot tenant.
9. Simulate a shard failure.
10. Compare distribution, latency, and migration cost.

The central lesson is:

```text
Sharding increases capacity by dividing data.
The shard key determines whether the system scales well.
Consistent hashing reduces movement.
Virtual nodes improve balance.
```
