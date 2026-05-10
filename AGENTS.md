# Repository Guidelines

## Project Structure & Module Organization

This repository packages the Eco-Cipher Edge Verifier prototype across hardware, firmware, CAD, and dashboard assets.

- `context/` is the source specification: blueprint, pinout, payload schema, validation rules, CAD prompts, demo flow, and shopping list.
- `firmware/EcoCipherEdgeVerifier/` contains the ESP32 Arduino sketch.
- `cad/` contains OpenSCAD and FreeCAD generators; exported CAD artifacts live in `cad/generated/`.
- `dashboard/` contains the Vite React dashboard. Source is in `dashboard/src/`, static models in `dashboard/public/models/`, and production output in `dashboard/dist/`.
- Root images are presentation/reference assets.

## Build, Test, and Development Commands

Run shell commands through `rtk`. Dashboard commands are run from `dashboard/`.

- `rtk bun install` installs dashboard dependencies.
- `rtk bun run dev` starts Vite on `127.0.0.1:5173`.
- `rtk bun run build` runs TypeScript build mode and writes `dashboard/dist/`.
- `rtk bun run preview` serves the built dashboard locally.
- `rtk /Applications/FreeCAD.app/Contents/Resources/bin/freecadcmd cad/eco_cipher_freecad_model.py` regenerates FreeCAD outputs when FreeCAD is installed.

## Coding Style & Naming Conventions

Dashboard code uses strict TypeScript, React function components, ES modules, and two-space indentation. Use `PascalCase` for React components, `camelCase` for functions and variables, and descriptive union types such as `ViewKey` or `ScenarioKey`.

Firmware code follows Arduino/C++ conventions: constants in `UPPER_SNAKE_CASE`, hardware pins grouped near the top, and small helper functions for sensor reads, validation, display, and payload generation.

## Testing Guidelines

There is no committed test runner yet. For dashboard changes, use `rtk bun run build` from `dashboard/` as the minimum verification. For firmware changes, compile in Arduino IDE or `arduino-cli` with the ESP32 board package and required libraries. For CAD changes, rerun the generator and inspect STL/STEP outputs.

## Commit & Pull Request Guidelines

This checkout has no Git history available, so no existing commit convention can be inferred. Use concise imperative commits, for example `Add dashboard hardware simulation` or `Update ESP32 validation thresholds`.

Pull requests should describe the changed subsystem, list verification commands run, and include screenshots or rendered model images when dashboard or CAD visuals change. Link related specs in `context/` when modifying firmware thresholds, payload fields, or wiring.

## Agent-Specific Instructions

Follow `/Users/willson/.codex/RTK.md`; prefix repository shell commands with `rtk`. Keep generated artifacts scoped to their existing output folders and avoid overwriting source specs in `context/` without a clear reason.
