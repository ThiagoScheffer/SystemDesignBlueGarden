# Horizontal vs. Vertical Scaling

## Core Difference

Both approaches increase system capacity, but they do so differently:

* **Vertical scaling** increases the resources of one machine.
* **Horizontal scaling** adds more machines or service instances.

---

# Vertical Scaling

Vertical scaling means upgrading an existing server.

Examples:

* Add more CPU
* Add more memory
* Use faster storage
* Increase network capacity
* Move to a larger database instance

```text
Before:
Application → Server
              4 CPU
              8 GB RAM

After:
Application → Larger Server
              16 CPU
              64 GB RAM
```

## Advantages

* Simple architecture
* Few application changes
* No load balancing required
* Useful for databases and stateful systems
* Fast way to increase capacity initially

## Limitations

* Hardware has a maximum size
* Larger machines become increasingly expensive
* Upgrades may require downtime
* One machine can remain a single point of failure
* Capacity cannot always be increased gradually

---

# Horizontal Scaling

Horizontal scaling means running more instances of the application.

```text
Client
   |
   v
Load Balancer
   |
   +----> Application Instance 1
   +----> Application Instance 2
   +----> Application Instance 3
```

Traffic is distributed across the available instances.

## Advantages

* Supports higher total traffic
* Capacity can be added incrementally
* Improves fault tolerance
* Failed instances can be replaced
* Works well with stateless services

## Limitations

* Requires load balancing
* Introduces distributed-system complexity
* Shared state must be handled carefully
* Sessions may need external storage
* Databases and other stateful systems are harder to scale horizontally

---

# Example

Assume one application server can process:

```text
1,000 requests per second
```

## Vertical scaling

Upgrade the server so it can process:

```text
3,000 requests per second
```

## Horizontal scaling

Run three equivalent servers:

```text
3 servers × 1,000 requests per second
= approximately 3,000 requests per second
```

Actual capacity may be lower because of shared database limits, network overhead, and uneven traffic distribution.

---

# Stateless Services

Horizontal scaling works best when application instances do not store important state locally.

Poor design:

```text
User session stored inside Application Instance 1
```

If the next request reaches Instance 2, the session may not be available.

Better design:

```text
Application Instances
        |
        v
Shared Session Store
```

Shared state may be stored in:

* Redis
* A database
* Object storage
* Another dedicated stateful service

---

# Scaling the Application Is Not Enough

Adding more application instances does not automatically scale the entire system.

```text
Load Balancer
   |
   +--> App 1
   +--> App 2
   +--> App 3
   +--> App 4
          |
          v
      One Database
```

The database may become the bottleneck even when the application layer scales horizontally.

A complete scaling analysis should also consider:

* Database capacity
* Cache capacity
* Network bandwidth
* Message queues
* External dependencies
* Storage throughput

---

# Required Simulator Components

## Compute Instance

Configuration:

* CPU capacity
* Memory capacity
* Request capacity
* Processing latency
* Failure state

## Load Balancer

Configuration:

* Routing strategy
* Backend instances
* Health checks
* Request capacity

## Shared State Store

Configuration:

* Read capacity
* Write capacity
* Latency
* Availability

---

# Simulation Scenarios

## Scenario 1: Vertical upgrade

Increase the CPU and memory of one application server.

Expected behavior:

* Higher request capacity
* Lower utilization
* No increase in redundancy

## Scenario 2: Horizontal expansion

Add additional application instances behind a load balancer.

Expected behavior:

* Traffic is distributed
* Total capacity increases
* Failure of one instance does not stop the service

## Scenario 3: Single-instance failure

One horizontally scaled application instance fails.

Expected behavior:

* The load balancer stops routing traffic to it
* Remaining instances receive more traffic
* The system remains available if capacity is sufficient

## Scenario 4: Database bottleneck

Add more application instances while keeping the same database capacity.

Expected behavior:

* Application utilization decreases
* Database utilization increases
* Overall throughput eventually stops improving

## Scenario 5: Local session failure

A user session is stored on one application instance.

Expected behavior:

* Requests routed to other instances may lose session state
* Shared session storage or sticky routing is required

---

# Interview Questions

* What is vertical scaling?
* What is horizontal scaling?
* What are the limits of vertical scaling?
* Why does horizontal scaling require a load balancer?
* Why are stateless services easier to scale horizontally?
* Can databases scale horizontally?
* Does adding more application servers always increase throughput?
* When is vertical scaling preferable?
* Can both approaches be used together?

---

# Evaluation Criteria

The candidate should understand that:

* Vertical scaling increases resources on one machine.
* Horizontal scaling adds more machines or instances.
* Vertical scaling is simpler but has physical and economic limits.
* Horizontal scaling improves capacity and resilience but adds complexity.
* Stateless services are easier to scale horizontally.
* Shared dependencies can remain bottlenecks.
* Horizontal scaling is not automatically superior in every situation.

---

# Common Weaknesses

* Saying horizontal scaling is always the correct choice
* Ignoring the cost and complexity of distributed systems
* Assuming more application servers automatically solve database bottlenecks
* Storing sessions locally without considering request routing
* Treating vertical scaling as useless
* Ignoring load-balancer capacity
* Assuming every component can scale horizontally in the same way

---

# Recommended Teaching Model

Use:

* One load balancer
* One to four application instances
* One shared database
* Optional shared session storage

Allow the user to:

1. Increase the capacity of one instance.
2. Add more application instances.
3. Inject an instance failure.
4. increase traffic.
5. Observe when the database becomes the next bottleneck.

The key lesson is:

```text
Vertical scaling → make one machine larger
Horizontal scaling → add more machines
```

Neither approach is universally superior. Most production systems combine both.
