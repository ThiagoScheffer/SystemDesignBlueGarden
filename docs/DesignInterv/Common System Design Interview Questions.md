# Common System Design Interview Questions

System design interviews commonly use familiar products to test whether candidates can identify requirements, choose appropriate components, explain trade-offs, and handle scale and failure.

Three frequently used challenge types are:

* URL shortener
* Chat application
* Social media platform

Each question emphasizes different system-design skills.

---

# 1. Design a URL Shortener

## Example Products

* TinyURL
* Bitly

## Core Requirements

Users should be able to:

* Submit a long URL
* Receive a short URL
* Redirect from the short URL to the original URL
* Optionally define a custom alias
* Optionally set an expiration time

## Main Components

```text
Client
   |
   v
Load Balancer
   |
   v
API Servers
   |
   +----> URL Database
   |
   +----> Cache
```

## Concepts Tested

* API design
* Unique identifier generation
* Database selection
* Read-heavy traffic
* Caching
* Redirection
* Collision handling
* Expiration
* Analytics

## Important Design Questions

* How are short IDs generated?
* How are collisions prevented?
* How long should generated IDs be?
* Should redirects use HTTP `301` or `302`?
* How should frequently accessed URLs be cached?
* What happens when a URL expires?
* How should abusive or malicious URLs be handled?

## Useful Simulation Scenarios

* Viral short URL
* Cache failure
* ID collision
* Database overload
* Expired URL
* Large traffic spike

---

# 2. Design a Chat Application

## Example Products

* WhatsApp
* Messenger
* Slack
* Discord

## Core Requirements

Users should be able to:

* Send direct messages
* Receive messages in real time
* View message history
* Receive messages after reconnecting
* See delivery status
* Participate in group conversations

## Main Components

```text
Client
   |
   v
WebSocket Gateway
   |
   v
Chat Service
   |
   +----> Message Database
   |
   +----> Message Queue
   |
   +----> Presence Store
   |
   +----> Notification Service
```

## Concepts Tested

* Persistent connections
* WebSockets
* Message ordering
* Offline delivery
* Fan-out
* Presence
* Delivery acknowledgements
* Database partitioning
* Push notifications
* Eventual consistency

## Important Design Questions

* How are real-time connections maintained?
* What happens when a user is offline?
* How are messages ordered?
* Can messages be delivered more than once?
* How are unread messages tracked?
* How are group messages distributed?
* How is message history partitioned?
* How are reconnecting clients synchronized?

## Useful Simulation Scenarios

* User disconnects
* User reconnects after a long period
* WebSocket server failure
* Duplicate message
* Out-of-order messages
* Large group chat
* Notification service failure

---

# 3. Design a Social Media Platform

## Example Products

* Instagram
* X
* YouTube
* TikTok

The exact architecture depends heavily on whether the platform primarily serves text, images, short videos, or long-form video.

## Core Requirements

Users should be able to:

* Create accounts
* Follow other users
* Publish content
* Upload media
* View a personalized feed
* Like and comment on content
* Receive notifications

## Main Components

```text
Client
   |
   v
API Gateway
   |
   +----> User Service
   +----> Content Service
   +----> Feed Service
   +----> Social Graph Service
   +----> Notification Service
   |
   +----> Object Storage
   |
   +----> CDN
   |
   +----> Media Processing Workers
```

## Concepts Tested

* Large-scale feeds
* Fan-out
* Social graphs
* Media storage
* Image and video processing
* Object storage
* CDNs
* Ranking
* Caching
* Event-driven processing
* Hot users and viral content

## Important Design Questions

* How is the user feed generated?
* Should feed items be precomputed or generated on demand?
* How are celebrity accounts handled?
* Where are images and videos stored?
* How are media files resized or transcoded?
* How are posts distributed through a CDN?
* How are likes and view counts updated?
* How is feed ranking performed?
* How quickly must deleted content disappear?

## Useful Simulation Scenarios

* Viral post
* Celebrity publishes content
* Media-processing backlog
* CDN failure
* Feed cache failure
* Sudden traffic increase
* Object-storage slowdown

---

# Comparison

| Challenge             | Primary Focus                                     |
| --------------------- | ------------------------------------------------- |
| URL shortener         | IDs, redirects, storage and caching               |
| Chat application      | Real-time communication and message delivery      |
| Social media platform | Feed generation, media delivery and massive scale |

---

# Recommended Learning Order

## Beginner

Start with:

* URL shortener
* Pastebin
* Simple rate limiter

These problems teach:

* Basic APIs
* Storage
* caching
* identifier generation
* simple scaling

## Intermediate

Continue with:

* Chat application
* Notification system
* File storage
* Search autocomplete

These introduce:

* asynchronous processing
* persistent connections
* queues
* delivery guarantees
* partitioning

## Advanced

Then study:

* Social media feed
* Video platform
* Ride-sharing system
* Payment system
* Multi-region marketplace

These require more complex reasoning about:

* massive scale
* ranking
* consistency
* geographic distribution
* failure recovery
* cost

---

# Required Application Content

Each challenge should include:

* Problem statement
* Functional requirements
* Non-functional requirements
* Suggested scale assumptions
* Required components
* Relevant concepts
* Interviewer follow-up questions
* Evaluation criteria
* Common mistakes
* Failure scenarios
* Editable starter template

---

# Recommended Initial Challenge Library

A practical initial library should include:

1. URL shortener
2. API rate limiter
3. Chat application
4. File storage system
5. Social media feed
6. Marketplace
7. Notification system
8. Search autocomplete
9. E-commerce checkout
10. Video streaming platform

These questions collectively cover most foundational system-design concepts without requiring the application to simulate every feature of the real products.
