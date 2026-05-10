# Implementation Plan: Total Redesign (High-End Light Grid)

## Objective
Execute a comprehensive redesign of the Eco-Cipher dashboard using a "High-end Light Grid" (Swiss Grid) aesthetic. This aligns with the user's request for a total reordering and polish, applying principles from the `impeccable`, `huashu-design`, and `ui-ux-pro-max` skills.

## Huashu-Design 4 Questions
1. **Narrative Role**: The central control room and physical simulation hub.
2. **Audience Distance**: 1m Laptop (desktop-first focus).
3. **Visual Temperature**: Industrial, Credible, Highly Structured (Swiss design).
4. **Capacity**: High density, handled by strict grid boundaries rather than floating cards.

## Key Files & Context
- `dashboard/src/styles.css`: Complete overhaul of layout variables, typography, and grid structures.
- `dashboard/src/main.tsx`: Restructuring DOM to fit the new Swiss Grid layout.
- `index.html`: Updating font imports.

## Implementation Steps

### 1. Typography & Theme Polish (`index.html` & `styles.css`)
- **Typography**: Import `Inter` for ultra-clean UI text alongside the existing `Geist Mono`.
- **Colors**: Refine OKLCH values to ensure no pure #fff or #000. Strengthen the contrast of borders (`--line-strong`) to emphasize the grid.
- **Background**: Remove the gradient mesh background pattern and replace it with a clean, solid, tinted neutral to let the grid lines stand out.

### 2. The Swiss Grid Layout (`styles.css`)
- Rebuild the `.workspace` and `.hero-grid` into a true CSS Grid with visible gutters.
- We will remove the concept of floating "panels" with padding and shadows, and instead use flush borders (e.g., a container with `background: var(--line-strong); gap: 1px;` where children have `background: var(--surface);`).
- Establish a 3-column or 4-column master grid for the hero section.

### 3. Total Component Reordering (`main.tsx`)
- Dismantle the current `.hero-stack` approach.
- Place widgets into specific grid areas to create a dense but organized control panel:
  - **Area A (Span 2 cols)**: `DevicePanel` (The physical hardware simulation)
  - **Area B (Span 1 col)**: `NarrativePanel` + `ActionConsequencePanel` (Story and Logs)
  - **Area C (Span 1 col)**: `MissionControl` + `ScenarioList` (Controls and Triggers)
- Ensure all inner padding inside these panels is mathematically consistent (e.g., strictly 24px everywhere).

### 4. Component Polish (Impeccable & UI-UX-Pro-Max)
- **Buttons**: Make them flush, with sharp corners and strong hover states (no scaling, just color/opacity changes).
- **Icons**: Ensure any SVGs are sharp and sized consistently.
- **Data Points**: Use monospace fonts heavily for numbers and hashes to reinforce the "industrial simulator" vibe.

## Verification & Testing
- Run the local Vite server (`npm run dev`).
- Take Playwright snapshots at 1440x900 to ensure the grid aligns perfectly down to the pixel.
- Verify that light mode contrast meets WCAG AAA standards.