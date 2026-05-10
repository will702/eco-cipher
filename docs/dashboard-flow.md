# Eco-Cipher Dashboard Flow

The dashboard is the screen that explains the whole Eco-Cipher story. It shows the device reading, the proof state, the receiver match, and the report outcome.

## Main Story

```text
Sense
-> Validate
-> Hash
-> Upload
-> Match
-> Report
```

That is the normal flow when the sample looks good. If the reading is bad, the dashboard still keeps the evidence, but it blocks or holds the later steps.

## What The Dashboard Shows

- the live device state
- the current sensor values
- the payload hash
- the proof record
- the receiver match
- the settlement result
- the reporting result

## Main Views

- `Overview` shows the full story.
- `Edge Verify` shows how the device decides locally.
- `Hardware CAD` shows the physical device in 3D.
- `AI Matchmaker` shows which receiver fits best.
- `Proof Ledger` shows the public proof record.
- `Settlement` shows the exchange result.
- `Evidence` shows the current hash and proof state.
- `Reports` shows the compliance output.

## How People Use It

The dashboard has two common modes:

- guided mode for demos and presentations
- manual mode for checking sensor changes and operator decisions

It also has preset sample scenarios, such as clean water, organic turbidity, anomaly, emission risk, and energy context.

## Bottom Line

The dashboard is the place where Eco-Cipher makes the system easy to understand. It connects the physical device to the proof trail, the matching logic, and the final report.

