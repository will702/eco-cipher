# Eco-Cipher ERP Integration

Eco-Cipher should connect to ERP through the backend, not straight from the sensor or the dashboard button.

## Simple Flow

```text
Edge device
-> Eco-Cipher backend
-> Proof check
-> ERP adapter
-> ERP record
```

## What The ERP Needs

The ERP system does not need the full sensor story. It needs business-ready records such as:

- a measurement event
- a waste batch or material lot
- an inspection result
- an exception ticket
- a receiver recommendation
- a transfer or recycling order
- a settlement or credit event
- a compliance report line

## How Status Changes ERP Behavior

- `VERIFIED` means the reading can move forward.
- `WARNING` means the reading can move forward, but with caution and operator review if needed.
- `ANOMALY` means the reading should be held, quarantined, or sent to manual review.

## Why The Backend Matters

The backend is the place where Eco-Cipher checks the payload, stores the hash, and decides what is safe to pass on. ERP should only receive the approved result, not raw UI state.

## Bottom Line

ERP is where Eco-Cipher turns trusted evidence into business action. The edge device creates the evidence, the backend validates it, and the ERP system records the outcome.

