# Slide 12 Notes — IoT Hardware Showcase

## Slide Title

Eco-Cipher Edge Verifier: Physical Trust Layer

## Suggested Layout

Left side:
- Photo/CAD of device
- Labeled hardware components

Right side:
- Sensor → ESP32 → Edge Validation → Backend
- 3 key bullets:
  1. Captures physical waste parameters
  2. Performs edge-level anomaly detection
  3. Sends hashed verified payloads to Eco-Cipher AI

## Caption

The device prevents manual greenwashing by verifying waste data directly from industrial output points.

## Hardware-to-Software Mapping

| Hardware Data | Software Meaning | AI Use |
|---|---|---|
| pH | Chemical characteristic | Waste classification |
| Turbidity | Contamination level | Processing suitability |
| Flow rate | Quantity / volume | Exchange feasibility |
| Temperature | Process condition | Validity context |
| Edge status | Trust level | Match confidence |
| Payload hash | Audit proof | ZK/smart contract reference |

## Pitch Script

The Eco-Cipher Edge Verifier is installed near a factory’s waste output line. It uses pH, turbidity, flow, and temperature sensors to capture real physical data. The ESP32 validates these readings at the edge, detects anomalies, and sends a hashed payload to the Eco-Cipher platform. This turns physical industrial output into trusted input for AI matchmaking and privacy-preserving carbon or material exchange.
