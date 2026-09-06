# Historical Documentation

This folder contains documents that are useful for project history but are **not authoritative descriptions of the current implementation**.

They were moved here on **6 September 2026** when the documentation was rebuilt directly from the current source code.

## Classification

### `plans/`

Historical implementation/product plans whose implementation status is mixed or superseded:

- `MaindesignPlan.md` — original broad product vision and roadmap; useful for intent, not current architecture.
- `Phase1Plan.md` — editor foundation implementation plan; Phase 1 is already implemented and later evolved.
- `Phase2Plan.md` — deterministic simulator plan; refers to older schema/implementation state.
- `Phase3Plan.md` — Learning Studio phase snapshot; superseded by current learning implementation.
- `Phase-NewComponents.md` — large expansion implementation prompt with a mixture of implemented and unimplemented work; not safe as a current specification.

### `snapshots/`

- `Current_App_state.md` — application-state snapshot dated 21 July 2026; superseded by `docs/architecture/`.

### `reviews/`

- `NEED TO FIX Final conclusion.md` — architectural/documentation review that motivated several documentation improvements; retained as historical critique.
- `ui-readability-review.md` — implementation verification/review from 6 September 2026; useful as change history but not a current system specification.

## Usage rule

Do not use files in this folder to determine whether a feature exists today. Check the current source and `docs/architecture/` instead.

If an archived proposal is revived, rewrite it against current architecture rather than moving it back unchanged.
