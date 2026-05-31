# Contributing to Eco-Cipher

Thank you for your interest in contributing to Eco-Cipher! We welcome contributions to improve the hardware blueprints, firmware, dashboard, and documentation.

## Project Structure

- `context/`: Source specifications, including hardware blueprints, wiring, and payload schemas.
- `firmware/`: ESP32 Arduino firmware for the Edge Verifier.
- `dashboard/`: Vite React dashboard for visualizing proof flows and sensor data.
- `cad/`: OpenSCAD and FreeCAD source files for the device enclosure.
- `docs/`: Technical documentation and system overviews.

## Getting Started

### Dashboard Development
1. Navigate to the `dashboard/` directory.
2. Install dependencies: `bun install`.
3. Start the development server: `bun run dev`.
4. Build for production: `bun run build`.

### Firmware Development
1. Open `firmware/EcoCipherEdgeVerifier/EcoCipherEdgeVerifier.ino` in the Arduino IDE or use `arduino-cli`.
2. Ensure you have the ESP32 board package installed.
3. Install required libraries for sensors (pH, Turbidity, DS18B20, etc.) and the OLED display.

### CAD Modifications
1. Source files are located in `cad/`.
2. To regenerate FreeCAD outputs: `/Applications/FreeCAD.app/Contents/Resources/bin/freecadcmd cad/eco_cipher_freecad_model.py`.
3. Keep generated artifacts in `cad/generated/`.

## How to Contribute

1. **Report Bugs:** Open an issue with a detailed description and steps to reproduce.
2. **Feature Requests:** Open an issue to discuss new ideas or improvements.
3. **Pull Requests:** 
    - Fork the repository.
    - Create a new branch for your changes.
    - Ensure your code follows the existing style and conventions.
    - Run the verification steps (e.g., `bun run build` for the dashboard).
    - Submit a pull request with a clear description of your changes.

## Verification

Before submitting a PR, please verify your changes:

| Subsystem | Verification Command |
|---|---|
| Dashboard | `bun run build` in `dashboard/` |
| Firmware | Compile in Arduino IDE or `arduino-cli` |
| CAD | Regenerate outputs and inspect artifacts |
| Docs | Ensure links and formatting are correct |
