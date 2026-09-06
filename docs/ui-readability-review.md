# Architecture designer readability review

Implemented on 2026-09-06. The dark green identity and architecture/simulation workflow are preserved.

## Findings addressed

| ID | Priority / confidence | Evidence before the change | Resolution |
| --- | --- | --- | --- |
| UI-01 | P1 / high | Preflight paragraphs used 9px text. | 16px prose, separated severity-labeled entries, and a larger acknowledgment control in the existing scenario drawer. |
| UI-02 | P1 / high | Diagnostic popovers used 8–10px text in 340px containers inside the zoomable canvas. | Screen-space right panel with a fixed header, scrollable explanations, severity, affected traffic, causes, and existing learning resources. |
| UI-03 | P1 / high | Four 150px result cards competed inside a fixed 290px panel; selected metrics stopped at ten fields. | Full-width tabs, normal/expanded/collapsed sizes, complete typed metric labels and units, and separate reset. |
| UI-04 | P1 / high | The editor disappeared below 900 CSS pixels. | Collapsible sidebars and full-width reading surfaces, with explicit navigation back to the canvas. |
| UI-05 | P2 / high | Browser testing showed the minimap covering warning buttons after opening simulation results. | The minimap defaults to collapsed during simulation and can be reopened explicitly. Inspector actions also expose node diagnostics. |

The inspector remains mounted behind temporary details so its mode survives. Component-guide editing retains transaction behavior and simulation locks. Cleared live diagnostics show an empty state instead of closing abruptly. Canvas zoom does not scale the reading panel, and changing panels does not automatically fit or reposition the diagram.

## Verification

- Production build and ESLint pass. Vite retains its large-bundle advisory.
- 86 unit tests pass, including guide editing, inspector-mode restoration, cleared diagnostics, reset, empty/error results, and metric formatting.
- Full Playwright run: 11 passed, 1 failed. All five new readability browser tests passed.
- Screenshots inspected at 1280×800, 1920×1080, and 2560×1440, plus 320px reading width and doubled root text size. The 960×540 check models the effective layout width of a 1920×1080 desktop at 200% zoom; it does not automate the browser's native zoom setting.
- Browser checks cover tabs and keyboard navigation, diagnostic categories, canvas-zoom independence, collapse without reset, metrics and event access, scenario focus trapping/restoration, long labels, and horizontal overflow in reading panels. The doubled-text check also verifies that the palette count does not overlap search.

Screenshots are generated under `test-results/ui-final/`; the final doubled-text screenshot is under `test-results/ui-text-final/`. These are local ignored test artifacts and may be replaced by later test runs.

## Existing regression-test failure

`compares unprotected and coalesced cache-expiration runs` expects the cache peak origin row to contain `920`, but receives `1,378.62` for both columns. The identical assertion and values were reproduced against an isolated archive of unchanged `HEAD`. This redesign does not alter simulation calculations or relax that assertion.

This is a focused readability and interaction review, not a claim of full WCAG conformance or a security audit. No dependencies or saved-document schema changes were introduced.
