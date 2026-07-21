# Design a Marketplace Like Airbnb

## Challenge Summary

Design a two-sided accommodation marketplace where hosts can publish properties and guests can discover, evaluate, and book them.

The system should support:

* User accounts
* Host and guest profiles
* Property listings
* Listing media
* Location-based discovery
* Filtering and ranking
* Availability management
* Reservations
* Payments
* Reviews
* Notifications

The central technical challenge is not merely storing listings. It is maintaining correct availability and preventing conflicting reservations while supporting high-volume search traffic.

---

# Initial Scope

## Functional Requirements

### User management

Users should be able to:

* Create an account
* Authenticate
* Maintain a profile
* Act as a guest, host, or both
* Verify contact or identity information
* Manage payment and payout methods

### Listing management

Hosts should be able to:

* Create a listing
* Edit listing details
* Add property location
* Define room and occupancy information
* Add amenities
* Upload photos
* Configure pricing
* Set availability
* Define cancellation and house rules
* Publish or unpublish the listing

### Search and discovery

Guests should be able to:

* Search by destination
* Specify check-in and check-out dates
* Specify guest count
* Filter by price
* Filter by property type
* Filter by bedrooms and beds
* Filter by amenities
* Browse results on a map
* Sort or rank results

### Reservations

Guests should be able to:

* View listing availability
* Request or instantly confirm a booking
* Pay for the reservation
* Cancel according to policy
* View booking status and history

Hosts should be able to:

* Accept or reject requests when manual approval is enabled
* View upcoming reservations
* Block dates
* Cancel according to platform policy

### Reviews

Users should be able to:

* Submit reviews after a completed stay
* Rate the property and experience
* View aggregate ratings
* Report inappropriate content

---

# Clarifying Questions

Before selecting an architecture, the candidate should clarify:

* What geographic regions are supported?
* How many listings and users are expected?
* What is the peak search traffic?
* What is the peak booking traffic?
* Are bookings instant or host-approved?
* Can a property contain multiple independently bookable units?
* Must the system prevent every possible double booking?
* Are prices fixed or dynamically calculated?
* Are taxes and fees included in search results?
* Are cancellations and refunds in scope?
* Is payment processing in scope?
* Are reviews in scope?
* Is recommendation ranking required?
* How fresh must search availability be?
* Is multi-region operation required?
* Are hosts allowed to synchronize external calendars?

---

# Example Scale Assumptions

The following numbers are illustrative:

* 10 million registered users
* 2 million active listings
* 500,000 daily active users
* 50,000 peak search requests per second
* 2,000 peak booking attempts per second
* Hundreds of millions of listing photos
* Search latency below 300 milliseconds at P95
* Booking confirmation below 2 seconds at P95
* Listing availability updates reflected in search within several seconds
* Booking correctness prioritized over booking-path availability

Search traffic is expected to be much higher than booking traffic.

This suggests separating the read-heavy discovery path from the transactional reservation path.

---

# High-Level Architecture

```text
Clients
   |
   v
CDN / Edge
   |
   v
API Gateway
   |
   +--------------------+
   |                    |
   v                    v
User Service       Listing Service
                        |
                        +------> Relational Database
                        |
                        +------> Object Storage
                        |
                        +------> Search Index
   |
   +--------------------+
   |                    |
   v                    v
Search Service     Booking Service
                        |
                        +------> Reservation Database
                        |
                        +------> Payment Service
                        |
                        +------> Event Bus
                                   |
                                   +--> Notification Service
                                   +--> Search Indexer
                                   +--> Analytics
```

A single Node.js API server may be sufficient for an early prototype, but it is not the complete architecture for a production marketplace.

A production design should separate at least:

* User management
* Listings
* Search
* Availability
* Booking
* Payments
* Media
* Notifications

These can initially be implemented as modules within a modular monolith and separated into services only when scale or organizational requirements justify it.

---

# Core Domain Model

```text
User
HostProfile
GuestProfile
Listing
ListingUnit
ListingAddress
ListingAmenity
ListingMedia
AvailabilityCalendar
AvailabilityDay
PricingRule
Reservation
ReservationGuest
Payment
Payout
Review
CancellationPolicy
MessageThread
Notification
```

## Listing

```ts
interface Listing {
  id: string;
  hostId: string;

  title: string;
  description: string;
  propertyType: string;
  status: 'draft' | 'published' | 'suspended' | 'archived';

  maximumGuests: number;
  bedroomCount: number;
  bedCount: number;
  bathroomCount: number;

  latitude: number;
  longitude: number;
  city: string;
  region: string;
  countryCode: string;

  basePriceMinorUnits: number;
  currency: string;

  instantBookEnabled: boolean;
  cancellationPolicyId: string;

  createdAt: string;
  updatedAt: string;
}
```

## Reservation

```ts
interface Reservation {
  id: string;
  listingId: string;
  guestId: string;

  checkInDate: string;
  checkOutDate: string;
  guestCount: number;

  status:
    | 'pending'
    | 'confirmed'
    | 'cancelled'
    | 'completed'
    | 'expired';

  subtotalMinorUnits: number;
  serviceFeeMinorUnits: number;
  taxMinorUnits: number;
  totalMinorUnits: number;
  currency: string;

  paymentStatus:
    | 'unpaid'
    | 'authorized'
    | 'captured'
    | 'refunded'
    | 'failed';

  createdAt: string;
}
```

---

# Primary Data Storage

## Relational Database

A relational database is a strong default for:

* Users
* Listings
* Host relationships
* Reservation records
* Availability
* Prices
* Payments
* Reviews
* Cancellation policies

A managed relational service such as PostgreSQL or MySQL is appropriate because the booking domain requires:

* Transactions
* Referential integrity
* Unique constraints
* Concurrency control
* Consistent updates
* Auditable state transitions

Using a generic “RDS table” is imprecise. RDS is a managed database service category, not a database model. The design should specify an engine and explain why it fits the workload.

PostgreSQL is a strong choice because it supports:

* Transactions
* Rich indexing
* Geospatial extensions such as PostGIS
* JSON fields where limited flexibility is useful
* Mature replication and operational tooling

---

## Object Storage

Listing photos and videos should be stored in object storage rather than directly in the relational database.

Object storage should contain:

* Original media
* Resized image variants
* Thumbnails
* Processed video versions

The relational database should store media metadata:

```ts
interface ListingMedia {
  id: string;
  listingId: string;
  objectKey: string;
  mediaType: 'image' | 'video';
  width?: number;
  height?: number;
  sortOrder: number;
  moderationStatus: string;
}
```

Media should be delivered through a CDN.

A typical upload flow is:

1. Client requests an upload authorization.
2. Backend returns a signed upload URL.
3. Client uploads directly to object storage.
4. A media-processing job validates and transforms the file.
5. Metadata is written to the listing database.
6. Processed assets are served through the CDN.

This prevents large media payloads from flowing through the primary API servers.

---

# Search Architecture

Search should be treated as a separate read model rather than as direct queries against the transactional database at large scale.

## Search Inputs

A typical search request includes:

* Destination or map bounds
* Check-in date
* Check-out date
* Guest count
* Minimum and maximum price
* Property type
* Bedrooms
* Amenities
* Instant-book preference
* Rating
* Sort or ranking mode

Example:

```http
GET /search/listings
    ?north=40.92
    &south=40.49
    &east=-73.70
    &west=-74.25
    &checkIn=2026-08-10
    &checkOut=2026-08-15
    &guests=4
    &minPrice=10000
    &maxPrice=40000
    &amenities=wifi,kitchen
```

---

## Database Search Versus Search Engine

For an early product, PostgreSQL with:

* B-tree indexes
* Composite indexes
* PostGIS
* Carefully designed queries

may be sufficient.

At larger scale, a dedicated search engine such as Elasticsearch or OpenSearch is usually more appropriate for:

* Geospatial search
* Faceted filtering
* Relevance ranking
* Text matching
* Aggregations
* Denormalized search documents
* Large result sets
* Map-bound queries

The claim that full-text search is unnecessary is too strong.

Users often search using:

* City names
* Neighborhoods
* Landmarks
* Property titles
* Descriptions
* Informal destination terms

A mature marketplace typically needs both:

* Structured filtering
* Geospatial filtering
* Text-based destination interpretation

---

# Geospatial Search

## Basic Problem

Calculating the distance between the user’s search area and every listing would require scanning an impractically large number of records.

A geospatial index reduces the candidate set before precise filtering.

## Spatial Partitioning

The world can be divided into hierarchical cells.

Common approaches include:

* Geohash
* S2 cells
* H3 cells
* R-tree or GiST indexes
* Quadtrees

A listing is mapped to one or more spatial cells based on its coordinates.

A map search can then identify cells intersecting the requested area and examine only listings in those cells.

Conceptually:

```text
World
  └── Region
       └── Subregion
            └── Local cell
                 └── Listings
```

This is more precise than saying that the world is merely divided into progressively smaller segments. The implementation depends on the selected indexing system.

---

## Bounding-Box Search

For map browsing, the client commonly sends visible map boundaries:

```text
north latitude
south latitude
east longitude
west longitude
```

The search system returns listings inside or near that box.

A second-stage exact distance or polygon check may remove false positives.

---

## Radius Search

For a search centered on a destination:

```text
center = latitude, longitude
radius = 10 kilometers
```

The index finds candidate listings in relevant cells, followed by an exact distance calculation.

---

## Important Geospatial Edge Cases

The design should account for:

* Search areas crossing the international date line
* Very large map bounds
* Dense urban areas
* Sparse rural areas
* Listings near cell boundaries
* Privacy restrictions on exact property coordinates
* Map clustering
* Pagination consistency while the map moves

Exact listing coordinates should generally not be shown publicly before booking. Search results may expose an approximate map location.

---

# Search Document

A denormalized search document may look like:

```json
{
  "listingId": "listing-123",
  "status": "published",
  "latitude": 40.7128,
  "longitude": -74.006,
  "city": "New York",
  "countryCode": "US",
  "propertyType": "apartment",
  "maximumGuests": 4,
  "bedroomCount": 2,
  "amenities": [
    "wifi",
    "kitchen",
    "air-conditioning"
  ],
  "basePriceMinorUnits": 24000,
  "currency": "USD",
  "averageRating": 4.83,
  "reviewCount": 214,
  "instantBookEnabled": true
}
```

This document should be optimized for search queries rather than normalized transactional updates.

The relational database remains the source of truth.

---

# Search Index Synchronization

When a listing changes:

1. The listing service commits the change to the relational database.
2. It publishes a listing-updated event.
3. An indexing consumer transforms the listing into a search document.
4. The search index is updated asynchronously.

```text
Listing Database
      |
      v
Transactional Outbox
      |
      v
Event Bus
      |
      v
Search Indexer
      |
      v
Search Engine
```

A transactional outbox reduces the risk that the database update succeeds but the event is lost.

Search can be eventually consistent. Booking cannot rely solely on search-index state.

---

# Availability Model

Availability is one of the most important parts of the system.

A listing should not appear bookable when it is already reserved or blocked.

## Availability-Day Model

One approach stores one row per listing per date:

```ts
interface AvailabilityDay {
  listingId: string;
  date: string;

  status:
    | 'available'
    | 'held'
    | 'booked'
    | 'blocked';

  priceMinorUnits: number;
  minimumStay: number;
  reservationId?: string;
  version: number;
}
```

Advantages:

* Simple date-range lookup
* Supports daily prices
* Supports minimum-stay rules
* Supports blocked dates
* Easy to reason about

Disadvantages:

* Large row count
* Requires batch updates for long periods
* Needs partitioning and retention strategy at scale

For 2 million listings and 365 future days, the system could hold approximately 730 million availability rows.

That is feasible only with careful partitioning, storage design, and retention boundaries.

---

## Interval Model

An alternative stores intervals:

```text
Available: 1 August–12 August
Booked: 13 August–17 August
Available: 18 August–30 August
```

Advantages:

* More compact in sparse calendars.

Disadvantages:

* More complex overlap logic
* Harder daily pricing
* More difficult concurrent mutation

For a marketplace with variable daily price and policy data, per-day records are often easier to manage despite their volume.

---

# Preventing Double Bookings

Search availability may be stale. The booking service must revalidate availability transactionally.

## Incorrect Approach

```text
1. Read availability.
2. See that dates are free.
3. Insert reservation.
```

Two concurrent requests may both observe the dates as free and create overlapping reservations.

## Safer Transactional Approach

Within a database transaction:

1. Lock the relevant availability rows.
2. Confirm every requested date remains available.
3. Mark the dates as held or booked.
4. Create the reservation.
5. Commit atomically.

Possible implementation techniques include:

* Row-level locks
* Serializable transactions
* Optimistic concurrency with version columns
* Exclusion constraints
* Unique inventory records
* Conditional updates

---

## Temporary Holds

Payments may take time. The booking service can create a short-lived hold:

```text
available → held → booked
```

Example flow:

1. Guest selects dates.
2. Booking service places a five-minute hold.
3. Payment is authorized.
4. Hold becomes a confirmed reservation.
5. If payment fails or the timer expires, the hold is released.

The system must ensure expired holds are reliably cleaned up.

This can use:

* Expiration timestamps
* Background workers
* Delayed messages
* Periodic reconciliation

---

## Booking State Machine

```text
PENDING
   |
   +--> PAYMENT_AUTHORIZED
   |         |
   |         +--> CONFIRMED
   |         |
   |         +--> PAYMENT_FAILED
   |
   +--> EXPIRED
   |
   +--> CANCELLED
```

Every transition should be explicit and auditable.

---

# Booking Workflow

## Instant Booking

1. Guest selects listing and dates.
2. Booking service validates guest count and policies.
3. Availability rows are locked.
4. Dates are placed on hold.
5. Payment is authorized.
6. Reservation is confirmed.
7. Availability becomes booked.
8. Confirmation events are emitted.
9. Guest and host are notified.

## Host-Approval Booking

1. Guest submits a request.
2. Dates may be temporarily blocked.
3. Host accepts or rejects.
4. Payment is authorized or captured.
5. Reservation is confirmed.
6. Hold expires if the host does not respond.

The design must define whether multiple pending requests may exist for the same dates.

---

# Idempotency

Booking and payment requests require idempotency.

A client retry must not create multiple reservations or charges.

Example:

```http
POST /reservations
Idempotency-Key: 48a97e0d-ff44-4e39-b0dc-5bcb7c351c52
```

The server stores the result associated with the idempotency key and returns the same result for repeated requests.

Idempotency should apply to:

* Reservation creation
* Payment authorization
* Cancellation
* Refunds
* Host payouts

---

# Pricing

The price shown to the guest may depend on:

* Base nightly price
* Date-specific price
* Weekend pricing
* Seasonal pricing
* Length-of-stay discounts
* Cleaning fees
* Service fees
* Taxes
* Currency conversion
* Promotions
* Additional guest fees

Search results may use an estimated price, but the booking service must calculate and persist an authoritative price quote.

```ts
interface PriceQuote {
  id: string;
  listingId: string;
  checkInDate: string;
  checkOutDate: string;

  nightlyAmounts: Array<{
    date: string;
    amountMinorUnits: number;
  }>;

  cleaningFeeMinorUnits: number;
  serviceFeeMinorUnits: number;
  taxMinorUnits: number;
  totalMinorUnits: number;

  currency: string;
  expiresAt: string;
}
```

The reservation should reference the accepted quote so later price changes do not modify an existing booking.

---

# Search Ranking

Filtering determines which listings qualify. Ranking determines their order.

Potential ranking signals include:

* Geographic relevance
* Availability
* Price
* Rating
* Review count
* Booking conversion
* Listing quality
* Host response rate
* Cancellation rate
* Instant-book availability
* Personalization
* Sponsored placement
* New-listing exploration

The ranking system should avoid allowing popularity alone to permanently suppress new listings.

A simple initial ranking formula may combine normalized signals:

```text
score =
    locationRelevance
  + qualityScore
  + ratingScore
  + priceCompetitiveness
  + availabilityScore
```

A mature system may use machine-learned ranking, but the first version should remain explainable.

---

# Caching

Potential cache targets include:

* Listing detail pages
* Listing summaries
* Destination metadata
* Filter definitions
* Popular search queries
* Price estimates
* User session data

Availability should be cached carefully because stale data can produce misleading search results.

The final booking decision must always validate authoritative availability.

Cache invalidation events should be emitted when:

* Listing status changes
* Listing details change
* Prices change
* Availability changes
* A reservation is confirmed or cancelled

---

# Reviews

A review should normally be allowed only after a completed reservation.

```ts
interface Review {
  id: string;
  reservationId: string;
  authorUserId: string;
  targetType: 'listing' | 'guest' | 'host';
  targetId: string;

  rating: number;
  text: string;
  moderationStatus: string;

  createdAt: string;
}
```

Important controls include:

* One review per eligible reservation and target
* Review eligibility windows
* Abuse reporting
* Moderation
* Aggregate rating updates
* Protection against fraudulent reviews

---

# Payments and Payouts

The payment domain should generally integrate with an external payment processor rather than store raw card data.

Typical flow:

1. Guest payment method is tokenized by the payment provider.
2. Payment is authorized when booking is created.
3. Funds are captured according to booking policy.
4. Platform fees are deducted.
5. Host payout occurs according to payout rules.
6. Refunds and chargebacks are handled asynchronously.

The design should address:

* Payment authorization failure
* Duplicate callbacks
* Delayed webhook delivery
* Partial refunds
* Cancellations
* Chargebacks
* Currency conversion
* Host payout failures
* Reconciliation

Payment provider webhooks must be idempotent and authenticated.

---

# Consistency Model

Different parts of the system require different consistency guarantees.

## Strong consistency required

* Booking confirmation
* Availability reservation
* Payment state transitions
* Refund accounting
* Host payouts
* Reservation cancellation

## Eventual consistency acceptable

* Search indexing
* Rating aggregates
* Analytics
* Recommendations
* Notification delivery
* Listing view counters

This distinction is central to a strong system-design answer.

---

# Reliability

## Database failure

The primary relational database requires:

* Replication
* Automated failover
* Point-in-time recovery
* Backups
* Connection pooling
* Query monitoring
* Schema migration controls

## Search-engine failure

If search is unavailable:

* Existing bookings should remain manageable.
* Listing detail pages may still work.
* The platform may degrade to cached or limited search.
* Booking should not depend on the search engine.

## Object-storage failure

Media delivery may degrade, but booking records and listing metadata should remain intact.

## Payment-provider failure

The system should:

* Preserve booking holds temporarily
* Retry safe operations
* Avoid duplicate charges
* Surface pending payment states
* Reconcile later

---

# Event-Driven Processing

Useful domain events include:

```text
UserCreated
ListingCreated
ListingUpdated
ListingPublished
ListingAvailabilityChanged
ReservationHeld
ReservationConfirmed
ReservationCancelled
PaymentAuthorized
PaymentCaptured
PaymentFailed
ReviewCreated
```

Consumers may include:

* Search indexer
* Notification service
* Analytics pipeline
* Fraud detection
* Recommendation system
* Host payout service
* Audit system

Events should use stable schemas and include unique event IDs for idempotent consumption.

---

# API Examples

## Create a listing

```http
POST /listings
```

```json
{
  "title": "Two-bedroom apartment near city center",
  "propertyType": "apartment",
  "maximumGuests": 4,
  "bedroomCount": 2,
  "latitude": 40.7128,
  "longitude": -74.006,
  "basePriceMinorUnits": 24000,
  "currency": "USD",
  "amenities": [
    "wifi",
    "kitchen"
  ]
}
```

## Search listings

```http
GET /listings/search
    ?destination=New%20York
    &checkIn=2026-08-10
    &checkOut=2026-08-15
    &guests=4
```

## Create a reservation

```http
POST /reservations
Idempotency-Key: 48a97e0d-ff44-4e39-b0dc-5bcb7c351c52
```

```json
{
  "listingId": "listing-123",
  "checkInDate": "2026-08-10",
  "checkOutDate": "2026-08-15",
  "guestCount": 4,
  "priceQuoteId": "quote-456",
  "paymentMethodToken": "payment-token"
}
```

## Cancel a reservation

```http
POST /reservations/{reservationId}/cancel
```

---

# Security and Trust

The system should address:

* Account authentication
* Authorization for listing modification
* Payment-token protection
* Host and guest identity verification
* Fraudulent listings
* Account takeover
* Review manipulation
* Malicious media uploads
* Exact-location privacy
* Message abuse
* Administrative access control
* Audit logging

Uploaded media should be scanned and validated before publication.

Sensitive fields should be encrypted where appropriate.

---

# Observability

Important metrics include:

## Search

* Search request rate
* Search latency
* Zero-result rate
* Search error rate
* Index freshness
* Click-through rate
* Search-to-booking conversion

## Booking

* Booking attempt rate
* Confirmation rate
* Double-booking conflicts
* Hold expiration rate
* Payment failure rate
* Booking latency
* Cancellation rate

## Listings

* Listing publication rate
* Media-processing failures
* Search-index synchronization delay
* Availability update delay

## Infrastructure

* Database latency
* Lock contention
* Search-cluster latency
* Cache hit ratio
* Event-consumer lag
* Object-storage errors

---

# Strong Candidate Answer

> I would separate the marketplace into a read-heavy discovery path and a strongly consistent booking path.
>
> Listing, user, pricing, availability, and reservation records would be stored in a relational database such as PostgreSQL. Photos and videos would be stored in object storage and delivered through a CDN. Listing metadata would contain references to those media objects.
>
> For an early version, PostgreSQL with PostGIS and conventional indexes may support location and structured filtering. At larger scale, I would maintain a denormalized search index in OpenSearch or Elasticsearch for geospatial queries, filtering, faceting, and ranking. The relational database would remain the source of truth, and listing changes would propagate through an event bus and transactional outbox.
>
> Search results may show eventually consistent availability, but the booking service must revalidate dates transactionally. I would lock or conditionally update the relevant availability records, create a temporary hold, authorize payment, and then confirm the reservation. Idempotency keys would prevent duplicate bookings and charges.
>
> The most important consistency boundary is that search may be stale, but booking confirmation cannot be. That separation lets the discovery system scale independently without weakening reservation correctness.

---

# Interviewer Follow-Up Questions

## Requirements

* Are bookings instant or host-approved?
* Can a property contain multiple rentable units?
* How far in advance may guests book?
* How accurate must search availability be?
* Are payments and refunds in scope?

## Data model

* How would you model listings with multiple rooms?
* How would you represent daily pricing?
* How would you store blocked dates?
* Would availability use rows per day or intervals?
* How would you partition a very large availability table?

## Search

* Why not query the relational database directly?
* When is a dedicated search engine justified?
* How would geospatial indexing work?
* How would you search by map boundaries?
* How would text search and structured filtering interact?
* How would search results remain available during indexing delays?

## Booking

* How do you prevent double booking?
* What happens when two users reserve the same dates concurrently?
* How do temporary holds expire?
* How do you handle payment success after a hold expires?
* How do idempotency keys work?

## Reliability

* What happens if the search engine is unavailable?
* What happens if payment authorization is delayed?
* What happens if an event consumer misses an update?
* How do you recover expired but unreleased holds?

## Scale

* Which path receives more traffic: search or booking?
* How would you shard listings?
* How would you handle a popular city during a major event?
* How would you prevent one dense map area from returning millions of results?

---

# Evaluation Criteria

## Requirements discovery

The candidate should identify:

* User roles
* Listing lifecycle
* Search dimensions
* Reservation semantics
* Payment scope
* Availability guarantees
* Geographic scale
* Instant versus requested booking

## Data architecture

The candidate should:

* Use relational storage for transactional entities
* Use object storage for media
* Separate normalized source data from search documents
* Explain availability storage
* Identify the source of truth

## Search architecture

The candidate should discuss:

* Structured filtering
* Geospatial indexing
* Text search
* Search-engine synchronization
* Eventual consistency
* Ranking

## Booking correctness

The candidate should address:

* Concurrent booking attempts
* Atomic availability changes
* Temporary holds
* Payment interaction
* Idempotency
* Expiration and recovery

## Scalability

The candidate should distinguish:

* High-volume search traffic
* Lower-volume transactional booking traffic
* Index scaling
* Database partitioning
* Cache use
* Media delivery

## Reliability

The candidate should discuss:

* Search degradation
* Database failover
* Payment-provider failure
* Event delivery
* Reconciliation
* Hold cleanup

## Security

The candidate should address:

* Authorization
* Payment protection
* Listing fraud
* Media safety
* User identity
* Location privacy

---

# Common Weaknesses

* Treating a single Node.js server as the entire production architecture
* Referring to “RDS” as though it were a database model
* Storing media directly in the relational database
* Assuming structured database indexes eliminate all need for text search
* Explaining geospatial indexes only as vague map segmentation
* Using the search index as the booking source of truth
* Failing to address concurrent reservations
* Omitting temporary booking holds
* Ignoring idempotency
* Failing to separate search consistency from booking consistency
* Treating availability as a simple listing field
* Ignoring dynamic pricing and authoritative price quotes
* Ignoring payment failures and asynchronous webhooks
* Returning exact property coordinates before booking
* Updating the search index directly without reliable event delivery

---

# Hidden Failure Scenarios

## Scenario 1: Concurrent booking

Two guests attempt to reserve the same property and dates at nearly the same time.

Evaluate:

* Transaction boundaries
* Locking or conditional updates
* Hold behavior
* User-facing conflict handling

## Scenario 2: Stale search index

A reservation is confirmed, but the search index still shows the listing as available for 20 seconds.

Evaluate:

* Final booking revalidation
* Eventual-consistency assumptions
* Index-update monitoring
* User experience after booking rejection

## Scenario 3: Payment timeout

The payment provider authorizes the payment, but the marketplace times out before receiving the response.

Evaluate:

* Idempotency
* Payment reconciliation
* Reservation state
* Safe retry behavior

## Scenario 4: Popular-event traffic

A major event causes a 20-times increase in searches for one city.

Evaluate:

* Search-cluster scaling
* Query caching
* Map-result limits
* Hot geographic partitions
* Graceful degradation

## Scenario 5: High-resolution media abuse

A host uploads hundreds of extremely large files.

Evaluate:

* Signed uploads
* File-size limits
* Media validation
* Processing queues
* Storage quotas
* Malware scanning

## Scenario 6: Calendar synchronization delay

A host books the property through an external platform, but the calendar import is delayed.

Evaluate:

* External calendar semantics
* Conflict handling
* Overbooking risk
* Synchronization frequency
* Host accountability

---

# Recommended Architecture Decision

Use:

* **PostgreSQL** as the transactional source of truth
* **PostGIS** for initial geospatial capability
* **Object storage and CDN** for listing media
* **OpenSearch or Elasticsearch** when discovery scale and ranking complexity justify it
* **Event-driven indexing with a transactional outbox**
* **Transactional availability validation**
* **Temporary reservation holds**
* **Idempotent booking and payment APIs**
* **Strong consistency for reservations**
* **Eventual consistency for search and analytics**
* **A modular monolith initially**, with service extraction driven by scale and ownership boundaries

The superior design separates discovery from reservation correctness. Search can be optimized for speed, ranking, and eventual consistency; booking must be optimized for atomicity, auditability, and prevention of conflicting reservations.
