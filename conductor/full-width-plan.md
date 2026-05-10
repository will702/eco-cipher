# Layout Full-Width Refinement Plan

## Objective
Remove `max-width` limitations across the dashboard layout to make the interface fill the screen entirely ("full-bleed"), matching the Huashu Design / UI-UX Pro Max control room aesthetic. The user explicitly requested to eliminate empty space.

## Key Files & Context
- `dashboard/src/styles.css`

## Implementation Steps
1. Remove `max-width: 1480px;` and `margin: 0 auto...;` from `.topbar`, `.view-grid`, `.overview-layout`, and `.hardware-view`.
2. Remove any remaining `max-width: 900px;` from `h1` if it prevents the title from flowing correctly.
3. Ensure `.hero-grid` stretches 100% without horizontal margins.
4. Check media queries to ensure no other `max-width: 1360px` is constraining the layout on large screens.

## Verification & Testing
- Use Playwright to capture a screenshot and confirm that the grid spans edge-to-edge seamlessly.