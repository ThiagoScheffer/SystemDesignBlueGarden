# Load Balancer vs. API Gateway

## Core Difference

Both components can sit in front of backend services and route requests, but they solve different problems.

* A **load balancer** distributes traffic across multiple instances of the same service.
* An **API gateway** manages and routes API requests across different services while applying shared API policies.

They may overlap, especially when using an application-layer load balancer, but they are not interchangeable in every architecture.

---

# Load Balancer

## Purpose

A load balancer distributes incoming traffic across healthy backend instances.

```text
Client
   |
   v
Load Balancer
   |
   +----> API Server 1
   +----> API Server 2
   +----> API Server 3
```

The backend servers usually run the same application or service.

## Main Responsibilities

* Distribute requests
* Detect unhealthy instances
* Stop routing to failed instances
* Improve availability
* Support horizontal scaling
* Maintain connection distribution

## Routing Strategies

Common strategies include:

* Round robin
* Least connections
* Weighted routing
* Random selection
* Source-IP hashing
* Consistent hashing

## Layer 4 Load Balancer

Operates at the transport layer.

It can inspect:

* Source and destination IP
* Port
* TCP or UDP connection information

Advantages:

* High throughput
* Low latency
* Protocol flexibility

Limitations:

* Limited awareness of HTTP paths, headers, and methods

## Layer 7 Load Balancer

Operates at the application layer.

It can inspect:

* URL path
* Hostname
* HTTP method
* Headers
* Cookies

Example:

```text
/api/*       → API servers
/images/*    → Media servers
admin.app/*  → Admin servers
```

Advantages:

* Content-based routing
* HTTP-aware behavior
* More flexible policies

Limitations:

* More processing overhead than Layer 4 routing

---

# API Gateway

## Purpose

An API gateway provides a single entry point for APIs and routes requests to the appropriate backend service.

```text
Client
   |
   v
API Gateway
   |
   +----> User Service
   +----> Order Service
   +----> Payment Service
```

The backend services usually perform different business functions.

## Main Responsibilities

An API gateway may provide:

* Path-based routing
* Authentication
* Authorization
* Rate limiting
* Request validation
* Logging
* Metrics
* Response caching
* Request and response transformation
* API versioning
* Quota enforcement
* Protocol translation

Example routing rules:

```text
GET  /users/*     → User Service
POST /orders      → Order Service
POST /payments    → Payment Service
```

---

# Main Comparison

| Capability                         | Load Balancer | API Gateway |
| ---------------------------------- | ------------: | ----------: |
| Distribute traffic across replicas |           Yes |   Sometimes |
| Route to different services        |  Layer 7 only |         Yes |
| Health checks                      |           Yes |       Often |
| Authentication                     |    Usually no |      Common |
| Authorization                      |    Usually no |      Common |
| Rate limiting                      |     Sometimes |      Common |
| Request validation                 |          Rare |      Common |
| API versioning                     |          Rare |      Common |
| Response caching                   |     Sometimes |      Common |
| Layer 4 routing                    |           Yes |          No |
| Layer 7 routing                    |           Yes |         Yes |

The exact feature set depends on the selected product. Some modern load balancers provide gateway-like features, and some API gateways perform basic load distribution.

---

# Combined Architecture

A system may use both components.

```text
Client
   |
   v
API Gateway
   |
   +----> User Service Load Balancer
   |          |
   |          +--> User Instance 1
   |          +--> User Instance 2
   |
   +----> Order Service Load Balancer
              |
              +--> Order Instance 1
              +--> Order Instance 2
```

The API gateway selects the service.

The load balancer selects the instance inside that service.

---

# Example Request Flow

A client sends:

```http
POST /orders
Authorization: Bearer <token>
```

The API gateway may:

1. Validate the access token.
2. Apply a rate limit.
3. Validate the request format.
4. Route the request to the order service.

The order-service load balancer may then:

1. Check which instances are healthy.
2. Select one order-service instance.
3. Forward the request.

---

# Required Simulator Components

## Load Balancer

Configuration:

* Layer: `L4` or `L7`
* Routing strategy
* Backend instances
* Health-check interval
* Connection capacity
* Request capacity
* Failure state

Metrics:

* Requests per second
* Active connections
* Backend utilization
* Rejected requests
* Unhealthy backends
* Routing latency

## API Gateway

Configuration:

* Route definitions
* Authentication enabled
* Authorization rules
* Rate limits
* Cache enabled
* Request capacity
* Processing latency
* Backend services

Metrics:

* Requests per route
* Authentication failures
* Rate-limit rejections
* Cache hit ratio
* Gateway latency
* Backend errors
* Invalid requests

---

# Simulation Scenarios

## Scenario 1: Backend instance failure

One API server fails behind a load balancer.

Expected behavior:

* Health checks detect the failure.
* Traffic stops being routed to that instance.
* Remaining instances receive more traffic.

## Scenario 2: Uneven backend capacity

One instance has lower processing capacity.

Evaluate:

* Round-robin imbalance
* Least-connections routing
* Weighted routing

## Scenario 3: Service-specific traffic spike

Traffic to `/payments` increases sharply.

Expected behavior:

* The API gateway routes payment traffic correctly.
* Only the payment service becomes overloaded.
* Other services remain operational if isolated correctly.

## Scenario 4: Invalid authentication

A client sends a request with an invalid token.

Expected behavior:

* The API gateway rejects the request.
* The backend service does not receive it.

## Scenario 5: Rate-limit exceeded

One user sends too many API requests.

Expected behavior:

* The gateway returns HTTP `429`.
* Backend services are protected from the excess traffic.

## Scenario 6: API gateway failure

The gateway becomes unavailable.

Expected behavior:

* All APIs behind the gateway may become unreachable.
* Multiple gateway instances or managed redundancy are required.

---

# Interview Questions

* What problem does a load balancer solve?
* What problem does an API gateway solve?
* What is the difference between Layer 4 and Layer 7 load balancing?
* Can a Layer 7 load balancer route by URL?
* Why not use only an API gateway?
* Why not use only a load balancer?
* Can both components exist in the same architecture?
* Where should authentication happen?
* Where should rate limiting happen?
* What happens if the API gateway fails?

---

# Evaluation Criteria

The candidate should understand that:

* Load balancers distribute traffic across instances.
* API gateways route and manage API requests across services.
* Layer 4 load balancers use connection-level information.
* Layer 7 load balancers can inspect HTTP information.
* API gateways usually provide cross-cutting API policies.
* A system may use both components.
* Product features overlap, so architecture decisions should be based on required behavior rather than component names.

---

# Common Weaknesses

* Saying a load balancer can only route identical servers
* Saying every API gateway must use microservices
* Assuming API gateways are always serverless
* Treating authentication as a required load-balancer function
* Treating routing as the only API-gateway responsibility
* Ignoring Layer 4 load balancing
* Assuming an API gateway replaces all internal load balancing
* Confusing a product implementation with the architectural role

---

# Recommended Teaching Model

Use:

* One API gateway
* Two backend services
* Two instances per service
* One load balancer per service
* Authentication at the gateway
* Rate limiting at the gateway
* Health checks at the load balancers

This is enough to demonstrate the architectural difference:

```text
API Gateway → selects the service
Load Balancer → selects the service instance
```
