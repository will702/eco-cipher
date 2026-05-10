# Eco-Cipher IoT Overview

Eco-Cipher uses an edge device called the Edge Verifier to read what is happening in the real world at the factory line. It measures the sample, checks whether the reading looks normal, and sends the result to the platform.

## In Simple Terms

```text
Factory sample
-> Sensors
-> ESP32 device
-> Local check
-> Status light and buzzer
-> Hashed payload
-> Dashboard and backend
```

The device looks at things like:

- pH
- turbidity
- flow
- temperature
- gas risk
- energy or current context

## What The Device Does

The device has three jobs:

1. Read the sensors.
2. Decide whether the stream looks `VERIFIED`, `WARNING`, or `ANOMALY`.
3. Send a digital payload with a hash so the record can be checked later.

It also shows the result locally with:

- a green light for verified
- a yellow light for warning
- a red light and buzzer for anomaly

## Why This Matters

The IoT device is the point where physical evidence becomes digital evidence. That is important because the dashboard and ERP should not guess what happened at the source. They should receive a trusted reading from the edge device.

## What Gets Sent

Each reading becomes one small JSON report with the device ID, factory name, sensor values, status, quality score, and payload hash.

That hash is the fingerprint of the reading. It helps the platform prove that the data has not changed.

## Bottom Line

Eco-Cipher IoT is a trust layer at the edge. It reads the factory signal, checks it locally, and sends a verified record to the rest of the system.

