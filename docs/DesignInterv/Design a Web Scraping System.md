# Design a Web Scraping System

## Challenge Summary

Design a system that periodically collects structured data from external websites.

The system should:

* Fetch pages or approved API responses
* Extract required data
* Store normalized results
* Retry temporary failures
* Detect scraper breakage
* Avoid repeatedly scraping unchanged data
* Respect site policies, access controls, and rate limits

The main design concepts are scheduling, crawling, parsing, rate limiting, retries, browser automation, data storage, and change detection.

---

# Core Architecture

```text
Scheduler
   |
   v
Job Queue
   |
   v
Scraper Workers
   |
   +----> HTTP Fetcher
   |
   +----> Browser Worker
   |
   v
Parser
   |
   v
Database
   |
   +----> Monitoring and Alerts
```

---

# Required Components

## Scheduler

Creates scraping jobs at configured intervals.

Example:

```text
Site A → every 1 hour
Site B → every 24 hours
Site C → every 7 days
```

Configuration:

* Scrape interval
* Priority
* Enabled status
* Last successful run
* Next scheduled run

---

## Job Queue

Stores pending scraping tasks.

Responsibilities:

* Buffer work
* Distribute jobs across workers
* Retry failed tasks
* Prevent one slow site from blocking others

Configuration:

* Queue capacity
* Retry count
* Retry delay
* Dead-letter queue
* Job priority

---

## HTTP Fetcher

Fetches content from simple pages or APIs.

Typical tools:

* HTTP client
* HTML parser
* JSON parser

Use this when the target content is available directly through:

* Static HTML
* Public APIs
* Documented data endpoints

HTTP fetching is faster and cheaper than running a full browser.

---

## Browser Worker

Uses browser automation for pages that require JavaScript rendering or interaction.

Typical capabilities:

* Render JavaScript
* Wait for dynamic content
* Click buttons
* Navigate pagination
* Handle approved authenticated sessions
* Extract rendered HTML

Browser automation should be used only when a normal HTTP request is insufficient because it consumes more CPU, memory, and time.

---

## Parser

Transforms raw content into structured records.

Example:

```ts
interface ScrapedItem {
  sourceId: string;
  externalId?: string;
  title: string;
  url: string;
  value?: number;
  scrapedAt: string;
}
```

Each website normally requires its own parser because HTML structures and field names differ.

---

## Database

Stores:

* Scraped records
* Source configuration
* Job status
* Scrape history
* Parsing errors
* Content versions

The database allows the application to serve previously collected data without scraping the source on every user request.

---

# Scraping Strategy

## Step 1: Check Available Access Methods

Preferred order:

1. Official API
2. Public structured endpoint
3. Static HTML
4. JavaScript-rendered page
5. Browser automation

The system should not bypass authentication, access restrictions, paywalls, CAPTCHAs, or other technical controls.

The scraper should review:

* Terms of service
* `robots.txt`
* API documentation
* Rate-limit policies
* Data licensing restrictions

`robots.txt` provides crawler guidance, but it is not the only legal or contractual consideration.

---

## Step 2: Fetch the Content

For a simple page:

```text
Scraper Worker
      |
      v
HTTP Request
      |
      v
HTML Response
```

For a dynamic page:

```text
Browser Worker
      |
      v
Load Page
      |
      v
Render JavaScript
      |
      v
Extract Content
```

---

## Step 3: Parse and Normalize

Raw website content should be converted into a stable internal format.

Example:

```text
Website field: product-title
Website field: item_name
Website field: heading

Normalized field: title
```

This prevents source-specific HTML structures from leaking into the rest of the application.

---

## Step 4: Store the Results

The scraper should:

1. Identify the record.
2. Compare it with the stored version.
3. Insert new data or update changed data.
4. Record the scrape timestamp.
5. Avoid creating duplicates.

Useful identifiers include:

* Source-provided ID
* Canonical URL
* Normalized composite key
* Content hash

---

# Fetching APIs Versus Parsing HTML

Some websites load data from a JSON endpoint used by their own frontend.

Using that endpoint may be more reliable than parsing rendered HTML when:

* The endpoint is public
* Its use is permitted
* It does not require bypassing access controls
* It provides stable structured data

Advantages:

* Lower processing cost
* Easier parsing
* Less browser automation
* Smaller responses

Limitations:

* Undocumented endpoints may change
* Authorization may be required
* Use may violate site policies
* The endpoint may not be intended for external clients

The scraper should prefer official and documented APIs whenever available.

---

# Rate Limiting

The system should control traffic per source.

Example:

```text
example.com:
Maximum 1 request per second
Maximum 2 concurrent requests
```

Configuration:

* Requests per second
* Maximum concurrency
* Delay between requests
* Daily request limit

Rate limiting reduces:

* Source-server load
* Blocking risk
* Retry storms
* Accidental denial-of-service behavior

---

# Retry Strategy

Temporary failures may include:

* Network timeout
* HTTP `429`
* HTTP `502`
* HTTP `503`
* Browser crash

Use exponential backoff:

```text
Attempt 1 → wait 1 second
Attempt 2 → wait 2 seconds
Attempt 3 → wait 4 seconds
Attempt 4 → wait 8 seconds
```

Add random jitter so many workers do not retry simultaneously.

Do not retry permanent failures indefinitely.

Examples of likely permanent failures:

* HTTP `401`
* HTTP `403`
* Removed page
* Invalid selector
* Unsupported content format

---

# Change Detection

Website changes can break a parser.

Possible signals:

* Expected selector missing
* Extracted record count drops sharply
* Required fields become empty
* Response structure changes
* Content hash pattern changes
* Error rate increases

The system should alert when:

```text
Expected records: 1,000
Extracted records: 12
```

This may indicate that the website changed rather than that the data disappeared.

---

# Duplicate Prevention

Repeated scraping should not create duplicate records.

Possible approaches:

* Unique database constraint
* External source ID
* Canonical URL
* Content checksum
* Upsert operation

Example:

```text
sourceId + externalId → unique record
```

---

# Incremental Scraping

The system should avoid downloading everything on every run when possible.

Useful techniques:

* Last-modified timestamp
* ETag
* Pagination checkpoint
* Last processed ID
* Updated-since parameter
* Content hash

Example:

```http
If-None-Match: "content-version-42"
```

If the content has not changed, the server may return:

```http
304 Not Modified
```

This reduces bandwidth and processing.

---

# Required Simulator Components

## Scheduler

Configuration:

* Interval
* Number of sources
* Job priority

## Job Queue

Configuration:

* Capacity
* Retry policy
* Consumer count
* Dead-letter queue

## HTTP Scraper Worker

Configuration:

* Worker count
* Request latency
* Maximum concurrency
* Failure probability

## Browser Worker

Configuration:

* Worker count
* Memory usage
* Page-load latency
* Failure probability

## Rate Limiter

Configuration:

* Requests per second per domain
* Concurrent requests
* Backoff behavior

## Parser

Configuration:

* Processing latency
* Failure probability
* Expected field count

## Database

Configuration:

* Write capacity
* Storage capacity
* Deduplication enabled
* Read latency

---

# Important Metrics

The simulator should display:

* Pages fetched
* Successful jobs
* Failed jobs
* Queue depth
* Requests per domain
* HTTP response codes
* Retry count
* Browser-worker utilization
* Parsing failures
* Records extracted
* Duplicate records prevented
* Database write rate
* Average scrape duration
* Data freshness
* Source-change alerts

---

# Simulation Scenarios

## Scenario 1: Static HTML Site

Use a normal HTTP worker and HTML parser.

Expected behavior:

* Low processing cost
* Fast scraping
* Minimal worker usage

---

## Scenario 2: JavaScript-Rendered Site

The HTTP fetcher receives incomplete content.

Expected behavior:

* Normal parser extracts no records
* Browser automation is required
* Scrape latency and resource usage increase

---

## Scenario 3: Rate Limit Response

The source returns HTTP `429`.

Expected behavior:

* Worker reduces request rate
* Retry uses exponential backoff
* Queue depth may increase

---

## Scenario 4: Website Layout Change

A required HTML selector disappears.

Expected behavior:

* Parser failures increase
* Extracted record count drops
* Alert is generated
* Failed jobs may move to a dead-letter queue

---

## Scenario 5: Source Outage

The external site returns HTTP `503`.

Expected behavior:

* Jobs retry with backoff
* Workers do not retry continuously
* Existing stored data remains available

---

## Scenario 6: Browser Worker Overload

Many sources require JavaScript rendering.

Expected behavior:

* CPU and memory usage increase
* Queue depth grows
* Browser workers become the bottleneck

---

## Scenario 7: Duplicate Data

The same page is scraped repeatedly.

Expected behavior:

* Existing records are updated
* Duplicate rows are not created

---

## Scenario 8: Scrape Every User Request

Users trigger a new external scrape whenever they request data.

Expected behavior:

* High latency
* Excess external traffic
* Greater blocking risk

Better behavior:

```text
User reads stored data
Scheduler refreshes it separately
```

---

# Interview Questions

* When should you use an HTTP client instead of browser automation?
* Why store scraped data in a database?
* How do you prevent duplicate records?
* How do you respect per-site rate limits?
* How should HTTP `429` be handled?
* How do you detect that a website changed?
* How do you prevent retries from overwhelming a source?
* How do you scrape JavaScript-rendered pages?
* How do you make scraping incremental?
* What happens when a parser fails?
* Why should scraping be separated from user requests?

---

# Evaluation Criteria

The candidate should understand:

* Simple pages should use normal HTTP fetching.
* Browser automation is more expensive and should be selective.
* Scraping jobs should be scheduled and queued.
* Each source needs rate limits.
* Retries require exponential backoff and jitter.
* Scraped data should be normalized and deduplicated.
* Stored results should serve application reads.
* Parser breakage must be monitored.
* Site access policies and technical controls must be respected.

---

# Common Weaknesses

* Using browser automation for every website
* Scraping the source on every application request
* Ignoring rate limits
* Retrying failures without backoff
* Treating `robots.txt` as the only access consideration
* Bypassing authentication or anti-bot controls
* Assuming undocumented APIs are stable or permitted
* Storing unstructured HTML without normalized fields
* Creating duplicate records on every run
* Ignoring parser changes
* Running every scrape at the same time
* Allowing one slow source to block the full pipeline

---

# Recommended Teaching Model

Use:

* One scheduler
* One job queue
* One HTTP scraper worker
* One optional browser worker
* One parser
* One rate limiter
* One database
* One alerting component

Allow the user to:

1. Scrape a static HTML source.
2. Switch to a JavaScript-rendered source.
3. Add a browser worker.
4. Increase scrape frequency.
5. Trigger HTTP `429` responses.
6. Enable exponential backoff.
7. Change the page structure.
8. Observe parser failures and alerts.
9. Enable deduplication.
10. Compare live scraping with reading stored data.

The central lesson is:

```text
Scheduler → decides when to scrape
Queue → distributes the work
Fetcher or browser → retrieves content
Parser → extracts structured data
Database → stores reusable results
Rate limits and retries → protect both systems
```
