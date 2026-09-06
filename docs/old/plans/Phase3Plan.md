# Phase 3 — Learning Studio

Phase 3 adds a local learning workflow on top of the architecture editor and deterministic simulator. It intentionally avoids AI scoring and backend accounts.

## Delivered learning loop

1. Open the Learning Studio.
2. Start one of five editable templates or a Guided/Interview challenge.
3. Clarify requirements and estimate capacity.
4. Build and configure the architecture.
5. Reveal and run a deterministic hidden incident.
6. Record bottlenecks and trade-offs.
7. Finish the attempt and compare neutral evidence with one curated reference approach.

## Content

- URL Shortener
- Distributed Rate Limiter
- News Feed
- File Storage Service
- E-commerce Checkout

The content uses the existing 16 architecture components. Rate limiting is modeled through API Gateway and Cache.

## Persistence and compatibility

Architecture schema remains `1.3`. Learning attempts are stored separately in IndexedDB and reference independent architecture projects. Completed comparisons freeze the submitted architecture, reference architecture, scenario, metrics, evidence, and recorded reasoning.

## Quality expectations

Learning content, generated templates, capacity formulas, incident targeting, history integration, UI workflows, reload recovery, and browser completion flows are covered by automated tests. All standard lint, format, test, Playwright, and production build commands remain required.
