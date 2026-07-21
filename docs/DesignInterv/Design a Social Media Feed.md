# Design a Social Media Feed

## Challenge Summary

Design the home feed for a social media application.

Users should be able to:

* Follow other users
* Publish posts
* Open the application and view recent posts
* Receive feed results with low latency
* Continue using the feed as the platform grows

The main design decision is whether feeds are generated when posts are written or when users request their feeds.

---

# Basic Architecture

```text
Client
   |
   v
Feed Service
   |
   +----> Post Database
   |
   +----> Social Graph
   |
   +----> Feed Cache
   |
   +----> Fan-Out Workers
```

## Required Components

### Post Service

Stores newly created posts.

Important fields:

```ts
interface Post {
  id: string;
  authorId: string;
  content: string;
  createdAt: number;
}
```

### Social Graph

Stores follower relationships.

Example:

```text
User A follows User B
User A follows User C
```

The system must support:

* Finding users followed by a user
* Finding followers of an author
* Reading follower counts

### Feed Service

Returns the ordered feed for a user.

Responsibilities:

* Load precomputed feed entries
* Retrieve posts from high-follower accounts
* Merge feed sources
* Sort results
* Apply pagination

### Feed Cache

Stores precomputed feed entries for users.

Redis or another fast key-value store may be used.

Example:

```text
feed:user-123
  post-900
  post-875
  post-821
```

A sorted set is more accurate than describing this structure as a queue because feed entries are usually ordered by time or score and may be read repeatedly.

### Fan-Out Workers

Distribute new posts to followers asynchronously.

Responsibilities:

* Read post-created events
* Find followers
* Add the post to follower feeds
* Retry failed updates
* Limit fan-out throughput

---

# Strategy 1: Fan-Out on Read

The feed is generated when the user requests it.

```text
User opens feed
      |
      v
Load followed accounts
      |
      v
Load recent posts
      |
      v
Merge and sort
```

## Request Flow

1. User opens the application.
2. Feed service retrieves the accounts they follow.
3. Recent posts from those accounts are loaded.
4. Posts are merged and ordered.
5. The first page is returned.

## Advantages

* New posts require little additional processing.
* No feed needs to be created for inactive users.
* Works well for authors with very large follower counts.
* Deletes and updates can be reflected more easily.

## Limitations

* Feed reads are expensive.
* Large follow lists require many data lookups.
* Sorting may be costly.
* Database and cache load increases with user activity.
* Request latency may become high.

---

# Strategy 2: Fan-Out on Write

The feed is updated when an author publishes a post.

```text
Author publishes post
        |
        v
Post-created event
        |
        v
Fan-Out Workers
        |
        +----> Follower Feed 1
        +----> Follower Feed 2
        +----> Follower Feed 3
```

## Write Flow

1. An author creates a post.
2. The post is stored in the post database.
3. A post-created event is published.
4. Workers retrieve the author's followers.
5. The post ID is added to each follower's feed.
6. Users later read their prepared feed directly.

## Advantages

* Feed reads are fast.
* Feed ordering can be prepared in advance.
* The post database receives fewer expensive feed queries.
* Works well when most authors have relatively few followers.

## Limitations

* Posting creates additional write load.
* Inactive users receive feed updates they may never read.
* A user with millions of followers creates a large fan-out operation.
* Feed updates are eventually consistent.
* Worker failures can delay feed delivery.

---

# Celebrity Problem

Suppose an account has 100 million followers.

Fan-out on write would require inserting the new post into up to 100 million feeds.

Possible effects:

* Large queue backlog
* Heavy cache write traffic
* Delayed feed updates
* High infrastructure cost
* Fan-out workers becoming overloaded

This makes pure fan-out on write unsuitable for extremely high-follower accounts.

---

# Hybrid Feed Strategy

A practical design combines both approaches.

## Normal Accounts

Use fan-out on write.

```text
Regular author posts
        |
        v
Post copied into follower feed caches
```

## High-Follower Accounts

Use fan-out on read.

```text
Celebrity author posts
        |
        v
Post stored in author timeline
```

When a user opens the feed:

1. Load their precomputed feed.
2. Identify high-follower accounts they follow.
3. Load recent posts from those accounts.
4. Merge all results.
5. Sort by timestamp or ranking score.
6. Return the requested page.

```text
Precomputed Feed
       +
Celebrity Posts
       |
       v
Merge and Rank
       |
       v
Final Feed
```

---

# Feed Data Model

## Author Timeline

Stores posts created by one author.

```text
timeline:author-42
  post-300
  post-298
  post-275
```

## User Feed

Stores candidate posts for one user.

```text
feed:user-123
  post-500
  post-430
  post-415
```

## Feed Entry

```ts
interface FeedEntry {
  userId: string;
  postId: string;
  authorId: string;
  createdAt: number;
  score?: number;
}
```

The feed cache should generally store post IDs and ranking metadata rather than full post contents.

The post service remains the source of truth for complete post data.

---

# Feed Read Flow

1. Client requests the first feed page.
2. Feed service reads precomputed feed entries.
3. Recent posts from high-follower accounts are loaded.
4. Candidate posts are merged.
5. Removed or inaccessible posts are filtered.
6. Posts are sorted.
7. Post details are loaded.
8. Results are returned with a pagination cursor.

---

# Pagination

Cursor-based pagination is preferable to offset pagination because new posts may arrive while the user is browsing.

Example:

```http
GET /feed?cursor=score_1740001234_post_500
```

The cursor may contain:

* Last ranking score
* Last timestamp
* Last post ID

This provides more stable pagination as the feed changes.

---

# Feed Ordering

The simplest version orders posts by creation time.

```text
Newest post first
```

A more advanced version may use a ranking score based on:

* Recency
* Relationship strength
* Engagement
* Content type
* User preferences

For the initial simulator, chronological ordering is sufficient.

---

# Required Simulator Components

## Feed Service

Configuration:

* Request capacity
* Merge latency
* Maximum candidates per request
* Failure state

## Post Database

Configuration:

* Read capacity
* Write capacity
* Read latency
* Replication

## Social Graph Store

Configuration:

* Follower lookup latency
* Maximum followers returned
* Read capacity

## Feed Cache

Configuration:

* Read capacity
* Write capacity
* Maximum feed size
* Entry TTL
* Failure state

## Message Queue

Configuration:

* Queue capacity
* Consumer throughput
* Delivery delay
* Retry behavior

## Fan-Out Workers

Configuration:

* Worker count
* Followers processed per second
* Maximum concurrent jobs
* Failure probability

---

# Important Metrics

The simulator should display:

* Feed request latency
* Feed requests per second
* Post creation latency
* Fan-out operations per second
* Fan-out queue depth
* Feed-cache reads
* Feed-cache writes
* Cache hit ratio
* Database read load
* Delayed feed entries
* Number of followers processed
* Feed freshness delay

---

# Simulation Scenarios

## Scenario 1: Read-heavy traffic

Millions of users repeatedly open their feeds.

Compare:

* Fan-out on read
* Fan-out on write

Expected result:

* Fan-out on read creates more database and social-graph load.
* Precomputed feeds reduce read latency.

## Scenario 2: Celebrity post

An account with millions of followers publishes a post.

Expected behavior:

* Pure fan-out on write creates a large queue.
* Hybrid mode avoids copying the post to every follower feed.

## Scenario 3: Fan-out worker slowdown

Worker throughput decreases.

Expected effects:

* Queue depth increases
* Feed updates are delayed
* Older cached feeds remain available

## Scenario 4: Feed-cache failure

The feed cache becomes unavailable.

Possible behavior:

* Fall back to fan-out-on-read generation
* Return a degraded feed
* Temporarily reject feed requests

## Scenario 5: Viral posting event

Many users publish at the same time.

Expected effects:

* Post database write load increases
* Fan-out queue grows
* Feed freshness decreases

## Scenario 6: Inactive users

Many users do not open the application for several months.

Evaluate whether:

* Their feeds should continue receiving updates
* Old feed entries should expire
* Their feeds should be rebuilt when they return

---

# Interview Questions

* What is fan-out on read?
* What is fan-out on write?
* Why is fan-out on write faster for feed reads?
* Why is fan-out on write expensive for celebrity accounts?
* How would a hybrid strategy work?
* What should be stored in the feed cache?
* How do you paginate a changing feed?
* What happens if the fan-out queue is delayed?
* What happens if the feed cache fails?
* How do deleted posts disappear from cached feeds?

---

# Evaluation Criteria

The candidate should understand:

* Feed generation can happen during writes or reads.
* Fan-out on read increases read-time computation.
* Fan-out on write increases post-time processing.
* High-follower accounts create a fan-out problem.
* A hybrid strategy handles different account sizes.
* Feed generation may be eventually consistent.
* The post database remains the source of truth.
* Queues and workers isolate fan-out work from the post request.

---

# Common Weaknesses

* Querying every followed account directly on each feed request
* Copying celebrity posts into hundreds of millions of feeds
* Performing fan-out synchronously before confirming the post
* Storing complete post contents in every user feed
* Treating the feed cache as the source of truth
* Ignoring queue backlog
* Ignoring feed pagination
* Assuming every user needs an unlimited precomputed feed
* Ignoring deleted or private posts
* Calling an ordered feed structure a simple queue without considering ranking or repeated reads

---

# Recommended Teaching Model

Use:

* One post service
* One post database
* One social graph
* One feed cache
* One message queue
* One or more fan-out workers
* One feed service
* Configurable celebrity threshold

Allow the user to:

1. Run fan-out on read.
2. Observe database load as feed traffic grows.
3. Enable fan-out on write.
4. Observe faster reads and increased write traffic.
5. Create a high-follower account.
6. Observe the fan-out queue backlog.
7. Enable hybrid feed generation.
8. Compare feed latency, queue depth, and freshness.

The central lesson is:

```text
Fan-out on read → more work when feeds are opened
Fan-out on write → more work when posts are created
Hybrid strategy → choose based on follower scale
```
