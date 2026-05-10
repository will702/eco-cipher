# Eco-Cipher Design Context

## Design Strategy

Use a restrained product UI with industrial neutrals, safety-state color, and clear proof-stage hierarchy. Non-technical users should be able to follow the story in this order: physical reading, local decision, tamper-evident hash, receiver match, proof/report outcome.

## Color

- Canvas: tinted light neutral, not pure white.
- Ink: charcoal/slate neutral, not pure black.
- Verified: muted green.
- Warning: ochre/amber.
- Anomaly: controlled red.
- Accent: rust/safety orange, reserved for active navigation, page transitions, and primary actions.

## Typography

Use a practical sans-serif UI stack for readability and a monospace stack for hashes, pins, scores, and payload fragments. Avoid decorative display type in dashboard controls.

## Components

- Navigation buttons must include a plain-language destination hint and selected-state feedback.
- Scenario buttons must explain what the sample means before the user clicks.
- Status panels should show both machine labels and human meaning.
- Loading, retry, and empty states should be written for a demo audience, not only engineers.

## Motion

Motion should confirm state changes: page switching, proof-stage progress, CAD loading, and button activation. Keep transitions short and respect `prefers-reduced-motion`.

## Responsive Behavior

Desktop can use a persistent left rail and multi-column proof workspace. Tablet and mobile should collapse to a single-column flow with horizontal navigation where needed and no hidden content.
