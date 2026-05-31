# Eco-Cipher Edge Verifier

Eco-Cipher Edge Verifier is a prototype hardware-to-platform package for turning factory waste, emission, and energy readings into trusted digital evidence.

The repository contains the full demo stack:

- Hardware blueprint and wiring specs for an ESP32 edge device.
- Arduino firmware for local sensor reading, validation, hashing, and upload.
- CAD and enclosure assets for the physical verifier.
- A Vite React dashboard that explains the proof flow, hardware, matching, settlement, and reporting story.
- Documentation for IoT behavior, ERP integration, and dashboard operation.

## System Flow

```text
Wastewater / emission / energy sample
-> Sensors
-> ESP32 Edge Verifier
-> Local validation
-> OLED, LEDs, buzzer
-> Hashed JSON payload
-> Backend / dashboard
-> Proof ledger
-> AI matchmaker
-> Settlement and reporting
-> ERP adapter
```

The device is designed to make the physical stream auditable before Eco-Cipher uses it for AI matching or compliance reporting.

## Repository Structure

| Path | Purpose |
|---|---|
| `context/` | Source specification: hardware blueprint, wiring, validation rules, payload schema, CAD dimensions, demo flow, and shopping list |
| `firmware/EcoCipherEdgeVerifier/` | ESP32 Arduino firmware |
| `cad/` | OpenSCAD and FreeCAD source/generator files |
| `cad/generated/` | Generated CAD outputs when present |
| `dashboard/` | Vite React dashboard |
| `dashboard/src/` | Dashboard application source |
| `dashboard/public/models/` | Static 3D model assets for the hardware view |
| `docs/` | Human-readable system documentation |
| `PRODUCT.md` | Product context for the dashboard and demo story |
| `DESIGN.md` | Design direction for the dashboard interface |

## Documentation

Start with these docs depending on what you need:

| Document | Use it for |
|---|---|
| [`docs/iot-system-overview.md`](docs/iot-system-overview.md) | Understanding the ESP32 device, sensors, validation, payload, hash, and upload flow |
| [`docs/erp-integration-flow.md`](docs/erp-integration-flow.md) | Understanding how Eco-Cipher should connect to ERP through a backend adapter |
| [`docs/dashboard-flow.md`](docs/dashboard-flow.md) | Understanding the dashboard views, proof stages, scenarios, and operator flow |
| [`context/README.md`](context/README.md) | Original hardware blueprint package overview |
| [`context/04_payload_schema.json`](context/04_payload_schema.json) | Current example payload shape |

## Hardware Summary

The MVP Edge Verifier uses:

- ESP32 DevKit V1
- pH sensor
- Turbidity sensor
- Water flow sensor
- DS18B20 waterproof temperature sensor
- Optional MQ-135 gas sensor
- Optional ACS712/PZEM current or energy sensor
- OLED I2C display
- Green, yellow, and red LEDs
- Buzzer
- Push button
- Industrial enclosure and pipe/sample chamber demo setup

The ESP32 classifies readings into:

| Status | Meaning | Local output |
|---|---|---|
| `VERIFIED` | Sensor readings are inside the clean demo band | Green LED, buzzer off |
| `WARNING` | Readings are usable but carry caution | Yellow LED, short beep |
| `ANOMALY` | Severe threshold breach, zero flow, sensor risk, or missing context | Red LED, repeated buzzer |

## Dashboard

The dashboard is a Vite React application in `dashboard/`. It simulates the platform view of the device and includes:

- proof-stage walkthrough: Sense, Validate, Hash, Upload, Match, Report
- live sensor-style values and status classification
- mock upload payload
- proof ledger/evidence views
- CAD-backed hardware inspection view
- AI receiver matching
- exchange/settlement consequence
- compliance and MRV-style reporting output

Available dashboard views:

```text
overview
edge-ai
hardware
matchmaker
zkgrid
exchange
proofs
reports
```

The hardware view is directly addressable with:

```text
http://127.0.0.1:5173/?view=hardware
```

## Development Commands

Run repository shell commands through `rtk`.

Dashboard commands are run from `dashboard/`:

```bash
rtk bun install
rtk bun run dev --host 127.0.0.1
rtk bun run build
rtk bun run preview
```

If the local shell picks an old Node runtime, use Node 22 before running Bun/Vite commands. A previously verified local Node path was:

```bash
/Users/willson/.nvm/versions/node/v22.21.1/bin
```

## Firmware

Firmware lives at:

```text
firmware/EcoCipherEdgeVerifier/EcoCipherEdgeVerifier.ino
```

The sketch:

- reads pH, turbidity, flow, temperature, gas, and energy/current context
- calculates status and quality scores
- generates `payload_hash` using SHA-256
- updates OLED, LEDs, and buzzer
- posts JSON to the configured API endpoint

Compile it with Arduino IDE or `arduino-cli` using the ESP32 board package and the required sensor/display libraries.

## CAD

CAD source files live in `cad/`. FreeCAD output can be regenerated when FreeCAD is installed:

```bash
rtk /Applications/FreeCAD.app/Contents/Resources/bin/freecadcmd cad/eco_cipher_freecad_model.py
```

Keep generated CAD artifacts scoped to `cad/generated/`.

## ERP Integration Position

ERP integration should happen through a backend adapter, not directly from the ESP32 or browser UI.

Recommended boundary:

```text
Device payload
-> Eco-Cipher ingestion API
-> validation/proof service
-> ERP adapter
-> ERP records
```

Typical ERP outputs include:

- IoT measurement event
- waste batch or material lot
- quality inspection record
- nonconformance or exception ticket
- receiver recommendation
- transfer or recycling order
- settlement or credit event
- ESG/MRV/compliance report line

See [`docs/erp-integration-flow.md`](docs/erp-integration-flow.md) for the detailed mapping.

## Verification

Minimum checks by subsystem:

| Subsystem | Verification |
|---|---|
| Dashboard | `rtk bun run build` from `dashboard/` |
| Firmware | Compile with Arduino IDE or `arduino-cli` for ESP32 |
| CAD | Regenerate FreeCAD/OpenSCAD outputs and inspect STL/STEP files |
| Docs | Review Markdown rendering and links |

