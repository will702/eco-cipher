import React, { Suspense, lazy, useEffect, useMemo, useState } from "react";
import { createRoot } from "react-dom/client";
import "./styles.css";
import {
  demoPresets,
  operatorModeCopy,
  type DemoPreset,
  type ManualSensorOverrides,
  type OperatorEvent,
  type OperatorMode,
} from "./simulationContracts";

type EdgeStatus = "VERIFIED" | "WARNING" | "ANOMALY";
type ScenarioKey = "clear" | "organic" | "anomaly" | "emission" | "energy";
type ViewKey = "overview" | "edge-ai" | "hardware" | "matchmaker" | "zkgrid" | "exchange" | "proofs" | "reports";
type SimulationStepKey = "sense" | "validate" | "hash" | "upload" | "match" | "report";
type SimulationTone = "verified" | "warning" | "anomaly" | "neutral";
type SimulationActionTone = "verified" | "warning" | "anomaly" | "neutral";

type SimulationAction = {
  title: string;
  device: string;
  platform: string;
  tone: SimulationActionTone;
  timestamp: Date;
};

type ViewFeedback = {
  key: ViewKey;
  label: string;
  detail: string;
  timestamp: Date;
};

type NavItem = {
  key: ViewKey;
  label: string;
  plain: string;
  badge?: string;
};

type ViewPageMeta = {
  eyebrow: string;
  title: string;
  plain: string;
  primarySignal: string;
};

type TutorialStep = {
  id: string;
  view: ViewKey;
  targetId: string;
  eyebrow: string;
  title: string;
  body: string;
  action?: string;
};

type TutorialPosition = {
  mode: "anchored" | "center";
  cardStyle: React.CSSProperties;
  spotlightStyle?: React.CSSProperties;
};

const HardwareSimulationView = lazy(() => import("./three/HardwareSimulationView"));

function isViewKey(value: string | null): value is ViewKey {
  return value === "overview" ||
    value === "edge-ai" ||
    value === "hardware" ||
    value === "matchmaker" ||
    value === "zkgrid" ||
    value === "exchange" ||
    value === "proofs" ||
    value === "reports";
}

function resolveInitialView(): ViewKey {
  if (typeof window === "undefined") return "overview";

  const searchValue = new URLSearchParams(window.location.search).get("view");
  if (isViewKey(searchValue)) return searchValue;

  const hashValue = window.location.hash.replace(/^#/, "");
  if (isViewKey(hashValue)) return hashValue;

  return "overview";
}

type Payload = {
  device_id: string;
  factory_alias: string;
  timestamp: string;
  sensor_type: "wastewater_edge_verifier";
  ph: number;
  turbidity_raw: number;
  flow_rate_lpm: number;
  temperature_c: number;
  gas_raw: number;
  gas_risk_score: number;
  energy_current_a: number;
  energy_power_w: number;
  estimated_volume_l: number;
  edge_status: EdgeStatus;
  anomaly_flag: boolean;
  data_quality_score: number;
  carbon_context_score: number;
  ai_waste_class: string;
  ai_match_confidence: number;
  anomaly_reasons: string[];
  payload_hash: string;
};

type Scenario = {
  key: ScenarioKey;
  name: string;
  sample: string;
  composition: string;
  expected: string;
  narrative: string;
  downstream: string;
  base: Pick<Payload, "ph" | "turbidity_raw" | "flow_rate_lpm" | "temperature_c" | "gas_raw" | "energy_current_a">;
};

type Candidate = {
  id: string;
  factory: string;
  sector: string;
  material: string;
  volume: string;
  score: number;
  distance: string;
  impact: number;
};

type SimulationStep = {
  key: SimulationStepKey;
  label: string;
  detail: string;
};

const DEVICE_ID = "EC-EDGE-001";

const scenarios: Scenario[] = [
  {
    key: "clear",
    name: "Clear Water",
    sample: "Sample A",
    composition: "Clear water",
    expected: "Verified stream",
    narrative: "Baseline discharge stays within pH, flow, and gas thresholds for a clean proof cycle.",
    downstream: "Proof commits cleanly and the receiver shortlist remains open.",
    base: { ph: 7.12, turbidity_raw: 420, flow_rate_lpm: 2.4, temperature_c: 28.7, gas_raw: 318, energy_current_a: 1.42 }
  },
  {
    key: "organic",
    name: "Organic Turbidity",
    sample: "Sample B",
    composition: "Water + tea/coffee",
    expected: "Organic/turbid waste",
    narrative: "Turbidity and organic load rise, but the stream remains readable for a cautionary proof path.",
    downstream: "Platform keeps the match live with lower confidence and flagged handling notes.",
    base: { ph: 6.18, turbidity_raw: 720, flow_rate_lpm: 1.55, temperature_c: 34.2, gas_raw: 532, energy_current_a: 2.2 }
  },
  {
    key: "anomaly",
    name: "Chemical Anomaly",
    sample: "Sample C",
    composition: "Water + vinegar/soap",
    expected: "Warning/anomaly",
    narrative: "The stream breaches multiple safety bands and the device must stop pretending the signal is normal.",
    downstream: "Hash is preserved, but downstream proof acceptance routes to manual review.",
    base: { ph: 4.86, turbidity_raw: 930, flow_rate_lpm: 0, temperature_c: 52.5, gas_raw: 812, energy_current_a: 0.02 }
  },
  {
    key: "emission",
    name: "Emission Risk",
    sample: "Sample D",
    composition: "Turbid stream + gas spike",
    expected: "Emission-sensitive stream",
    narrative: "Gas risk is elevated while flow remains active, producing a warning-class verification story.",
    downstream: "Proof advances with caution and the AI match prioritizes emission-sensitive receivers.",
    base: { ph: 7.48, turbidity_raw: 590, flow_rate_lpm: 2.1, temperature_c: 32.6, gas_raw: 835, energy_current_a: 1.86 }
  },
  {
    key: "energy",
    name: "Energy Context",
    sample: "Sample E",
    composition: "High-energy process stream",
    expected: "Energy-linked process",
    narrative: "The waste stream looks stable, but energy draw becomes a meaningful trust signal for the platform.",
    downstream: "Carbon context improves and energy-aware receivers are ranked higher.",
    base: { ph: 7.02, turbidity_raw: 510, flow_rate_lpm: 3.4, temperature_c: 37.1, gas_raw: 428, energy_current_a: 4.2 }
  }
];

const navSections: Array<{
  label: string;
  items: NavItem[];
}> = [
  {
    label: "Platform",
    items: [
      { key: "overview", label: "Overview", plain: "See the complete factory-to-report story." },
      { key: "edge-ai", label: "Edge Verify", plain: "Watch sensors become a trusted device decision.", badge: "Live" },
      { key: "hardware", label: "Hardware CAD", plain: "Inspect the physical verifier and part groups.", badge: "3D" },
      { key: "matchmaker", label: "AI Matchmaker", plain: "Compare receiver options after proof is ready.", badge: "6" }
    ]
  },
  {
    label: "Cipher-Grid",
    items: [
      { key: "zkgrid", label: "Proof Ledger", plain: "Show public proof signals without raw factory data." },
      { key: "exchange", label: "Settlement", plain: "Confirm match and carbon credit consequences." }
    ]
  },
  {
    label: "Compliance",
    items: [
      { key: "proofs", label: "Evidence", plain: "Review the current hash and recent proof records." },
      { key: "reports", label: "Reports", plain: "Translate proof outcomes into compliance output." }
    ]
  }
];

const viewFeedbackCopy: Record<ViewKey, string> = {
  overview: "The overview connects the physical device, proof logic, AI matching, settlement, and reporting in one map.",
  "edge-ai": "The verifier page explains how live sensor readings become a local verified, warning, or anomaly decision.",
  hardware: "The CAD page shows the physical prototype and links each part group to the active proof stage.",
  matchmaker: "The matchmaker page ranks receiver options only after the device proof is usable.",
  zkgrid: "The proof ledger page shows what can be shared publicly while raw factory data stays private.",
  exchange: "The settlement page explains how confirmed proof becomes a matched exchange and credit movement.",
  proofs: "The evidence page shows the current hash, proof state, and recent ledger records.",
  reports: "The reports page translates proof outcomes into compliance-ready summaries.",
};

const TUTORIAL_STORAGE_KEYS = {
  completed: "ecoCipherTutorial.completed",
  dismissedAt: "ecoCipherTutorial.dismissedAt",
  lastStepId: "ecoCipherTutorial.lastStepId"
} as const;

const tutorialSteps: TutorialStep[] = [
  {
    id: "overview-nav",
    view: "overview",
    targetId: "nav-overview",
    eyebrow: "Overview",
    title: "Start with the complete factory-to-report story.",
    body: "The left rail is the platform map: Overview, Edge Verify, Hardware CAD, AI Matchmaker, Proof Ledger, Settlement, Evidence, and Reports.",
    action: "Use this tour when the audience needs the full picture before technical detail."
  },
  {
    id: "overview-story",
    view: "overview",
    targetId: "overview-story-header",
    eyebrow: "Platform map",
    title: "One story runs from factory reading to compliance report.",
    body: "The Overview page frames the device, proof logic, AI matching, settlement, and reporting as one end-to-end trust flow."
  },
  {
    id: "overview-status",
    view: "overview",
    targetId: "overview-status-strip",
    eyebrow: "Live proof state",
    title: "The current sample anchors the whole walkthrough.",
    body: "This strip shows the active sample, proof step, status, accepted proof state, hash, guided mode, operator state, and latest action.",
    action: "Watch these fields change when later pages perturb the device reading or settlement state."
  },
  {
    id: "overview-map",
    view: "overview",
    targetId: "overview-proof-map",
    eyebrow: "Proof Story Map",
    title: "Follow the trust chain before opening the technical pages.",
    body: "Factory Edge keeps raw readings local, the ZK Prover shares proof, AI Matchmaker ranks receivers, Smart Contract settles, and CBAM Report packages evidence."
  },
  {
    id: "overview-activity",
    view: "overview",
    targetId: "overview-recent-activity",
    eyebrow: "Recent Activity",
    title: "Live estate events make the demo feel operational.",
    body: "Recent proof, match, report, and payload events show the audience how Eco-Cipher moves from a single edge reading to estate-level compliance output."
  },
  {
    id: "edge-director",
    view: "edge-ai",
    targetId: "edge-demo-director",
    eyebrow: "Edge Verify",
    title: "Pick the audience and proof moment.",
    body: "Demo Director presets stage the simulator for investors, operators, or technical reviewers while keeping the same underlying proof model.",
    action: "Click a preset to jump the dashboard into that narrative."
  },
  {
    id: "edge-mode",
    view: "edge-ai",
    targetId: "edge-mission-control",
    eyebrow: "Interaction",
    title: "Switch between guided and manual proof control.",
    body: "Guided mode auto-advances through Sense, Validate, Hash, Upload, Match, and Report. Manual mode unlocks stage-by-stage inspection.",
    action: "Try Manual, then select a stage chip."
  },
  {
    id: "edge-scenarios",
    view: "edge-ai",
    targetId: "edge-scenario-list",
    eyebrow: "Interaction",
    title: "Sample scenarios recalculate the whole proof path.",
    body: "Each sample changes sensor readings, edge status, match confidence, anomaly handling, and reporting consequences.",
    action: "Select an anomaly or emission scenario to see downstream effects."
  },
  {
    id: "edge-proof-lab",
    view: "edge-ai",
    targetId: "edge-proof-lab",
    eyebrow: "Interaction",
    title: "The proof lab lets reviewers perturb sensor values.",
    body: "Moving sliders overrides live jitter and immediately recalculates classification, hash, AI class, and match confidence.",
    action: "Drag pH, gas, or flow to force a warning/anomaly."
  },
  {
    id: "hardware-scene",
    view: "hardware",
    targetId: "hardware-scene",
    eyebrow: "Hardware CAD",
    title: "Inspect the physical verifier behind the proof.",
    body: "The 3D scene uses the verifier model and overlays proof-stage context so the audience can connect physical parts to digital evidence."
  },
  {
    id: "hardware-presets",
    view: "hardware",
    targetId: "hardware-presets",
    eyebrow: "Interaction",
    title: "Hardware presets jump to important components.",
    body: "Fluid path, controller, data out, and operator face presets select relevant hotspots and switch the scene into manual inspection.",
    action: "Click a preset, then inspect the Stage and Hotspot panels."
  },
  {
    id: "matchmaker-table",
    view: "matchmaker",
    targetId: "matchmaker-candidates",
    eyebrow: "AI Matchmaker",
    title: "Receiver options are proof-gated.",
    body: "Candidate rows compare compatibility, distance, and carbon impact. If the current proof is quarantined, selection is disabled."
  },
  {
    id: "matchmaker-sort",
    view: "matchmaker",
    targetId: "matchmaker-sort",
    eyebrow: "Interaction",
    title: "Re-rank candidates by score or impact.",
    body: "The sort button changes the operator explanation without changing the underlying device proof.",
    action: "Toggle sorting and watch the Action Result update."
  },
  {
    id: "zk-generator",
    view: "zkgrid",
    targetId: "zk-proof-generator",
    eyebrow: "Proof Ledger",
    title: "Generate a public proof without revealing raw factory data.",
    body: "The proof generator demonstrates what becomes public: proof ID, public range signal, and verifier status.",
    action: "Click Generate ZK-Proof to update the public output."
  },
  {
    id: "zk-ledger",
    view: "zkgrid",
    targetId: "zk-live-ledger",
    eyebrow: "Proof Ledger",
    title: "The ledger view is intentionally sparse.",
    body: "Rows expose hashes, factories, signals, and validation states while keeping raw readings off the public surface."
  },
  {
    id: "exchange-confirm",
    view: "exchange",
    targetId: "exchange-confirm",
    eyebrow: "Settlement",
    title: "Matches need confirmation before settlement.",
    body: "Confirm buttons attach receiver intent to a proof-backed exchange and update the latest action console.",
    action: "Confirm a pending match."
  },
  {
    id: "exchange-commit",
    view: "exchange",
    targetId: "exchange-commit",
    eyebrow: "Interaction",
    title: "Commit turns the exchange into settlement state.",
    body: "The credit swap and timeline show the movement from proof evidence to smart-contract consequence.",
    action: "Click Commit to complete the settlement timeline."
  },
  {
    id: "evidence-current",
    view: "proofs",
    targetId: "evidence-current-proof",
    eyebrow: "Evidence",
    title: "Current proof state answers whether the payload is usable.",
    body: "This card shows the active device commitment, state, signal, and flow. Hash visibility depends on the current proof stage."
  },
  {
    id: "evidence-payload",
    view: "proofs",
    targetId: "evidence-payload",
    eyebrow: "Evidence",
    title: "Raw demo payload remains inspectable for reviewers.",
    body: "The JSON panel is the audit reference for the current simulated reading, including anomaly reasons and computed scores."
  },
  {
    id: "reports-readiness",
    view: "reports",
    targetId: "reports-readiness",
    eyebrow: "Reports",
    title: "Readiness translates proof state into filing language.",
    body: "This panel turns technical proof status, scenario, receiver intent, and operator mode into a compliance-facing summary."
  },
  {
    id: "reports-chain",
    view: "reports",
    targetId: "reports-chain",
    eyebrow: "Reports",
    title: "The evidence chain shows what is still missing.",
    body: "Sensor read, edge decision, payload hash, receiver link, and report output must all line up before a clean filing story."
  }
];

const viewPageMeta: Record<ViewKey, ViewPageMeta> = {
  overview: {
    eyebrow: "Platform map",
    title: "One story from factory reading to compliance report.",
    plain: "Use this page when the audience needs the full picture before seeing the technical details.",
    primarySignal: "End-to-end trust flow"
  },
  "edge-ai": {
    eyebrow: "Device decision",
    title: "Live readings become a local proof decision.",
    plain: "This page explains the sensor thresholds in plain language, then shows the payload the device would send.",
    primarySignal: "Sensor to status"
  },
  hardware: {
    eyebrow: "Physical prototype",
    title: "CAD-backed hardware view for the Edge Verifier.",
    plain: "Use this page to explain what the box contains, what each part does, and why the physical signal is believable.",
    primarySignal: "Part-level inspection"
  },
  matchmaker: {
    eyebrow: "Receiver ranking",
    title: "Proof-gated AI matching for industrial exchange.",
    plain: "This page shows how Eco-Cipher chooses a receiver only after the stream has trusted evidence.",
    primarySignal: "Match consequence"
  },
  zkgrid: {
    eyebrow: "Privacy proof",
    title: "Public proof without exposing raw factory data.",
    plain: "This page is for explaining the difference between private sensor inputs and public compliance signals.",
    primarySignal: "Raw data hidden"
  },
  exchange: {
    eyebrow: "Settlement",
    title: "Confirmed matches move into contract settlement.",
    plain: "This page shows what changes when both sides accept a proof-backed exchange.",
    primarySignal: "Contract timeline"
  },
  proofs: {
    eyebrow: "Evidence review",
    title: "Current proof state and ledger evidence.",
    plain: "Use this page to answer whether the current device reading has a usable tamper-evident record.",
    primarySignal: "Hash evidence"
  },
  reports: {
    eyebrow: "Compliance output",
    title: "Proof outcomes become reporting material.",
    plain: "This page translates the demo proof into carbon and CBAM-style reporting language.",
    primarySignal: "Report readiness"
  }
};

const simulationSteps: SimulationStep[] = [
  { key: "sense", label: "Sense", detail: "Sample chamber reads pH, turbidity, flow, gas, and energy." },
  { key: "validate", label: "Validate", detail: "Edge thresholds classify the stream and lock local indicators." },
  { key: "hash", label: "Hash", detail: "Payload fingerprint is generated on the device for tamper evidence." },
  { key: "upload", label: "Upload", detail: "Verified payload moves to the Eco-Cipher proof endpoint." },
  { key: "match", label: "Match", detail: "AI ranks compatible receivers against the verified signal." },
  { key: "report", label: "Report", detail: "Settlement and reporting consequences are updated." }
];

const stepDurations = [1600, 1400, 1300, 1100, 1300, 1100];

const initialAction: SimulationAction = {
  title: "Demo initialized",
  device: "Edge verifier is sampling the clear water baseline.",
  platform: "Proof route is ready for an automatic clean verification cycle.",
  tone: "verified",
  timestamp: new Date()
};

const wiringRows = [
  ["pH AO", "GPIO34", "ADC + divider"],
  ["Turbidity AO", "GPIO35", "ADC + divider"],
  ["Flow pulse", "GPIO27", "Interrupt"],
  ["DS18B20", "GPIO4", "OneWire + 4.7k"],
  ["MQ-135", "GPIO32", "ADC + divider"],
  ["ACS712/PZEM", "GPIO33", "ADC + divider"],
  ["OLED SDA/SCL", "GPIO21/22", "I2C 3V3"],
  ["LED/Buzzer/Button", "GPIO16-19/25", "Digital"]
];

const activities = [
  { state: "verified", title: "Match M-0041 confirmed", detail: "Factory A stream mapped to Factory B receiver", time: "4m ago" },
  { state: "pending", title: "Proof pending for Factory E-03", detail: "Deadline within 42 minutes", time: "12m ago" },
  { state: "neutral", title: "CBAM report generated", detail: "Q2 package exported with proof references", time: "28m ago" },
  { state: "verified", title: "Payload hash accepted", detail: "EC-EDGE-001 transmitted a clean reading", time: "36m ago" }
];

const proofs = [
  { hash: "0x4f3a91c821", factory: "Factory A-14", status: "valid", time: "2m", signal: "range_pass" },
  { hash: "0x8b12d3d094", factory: "Factory B-07", status: "valid", time: "7m", signal: "receiver_ready" },
  { hash: "0xe7c4411f3b", factory: "Factory E-03", status: "pending", time: "12m", signal: "range_check" },
  { hash: "0x2d91bd7a50", factory: "Factory C-22", status: "valid", time: "18m", signal: "category_pass" },
  { hash: "0x6e55abb337", factory: "Factory D-11", status: "valid", time: "24m", signal: "settlement_ok" }
];

const candidates: Candidate[] = [
  { id: "B-07", factory: "Factory B", sector: "Packaging", material: "PP Granules", volume: "15-20 t/wk", score: 92, distance: "3.2 km", impact: -24.8 },
  { id: "C-22", factory: "Factory C", sector: "Injection Molding", material: "Recycled PP Resin", volume: "12-16 t/wk", score: 78, distance: "6.7 km", impact: -18.8 },
  { id: "D-11", factory: "Material Supplier X", sector: "Compounder", material: "Mixed Polymer Input", volume: "8-10 t/wk", score: 64, distance: "8.1 km", impact: -11.5 },
  { id: "E-03", factory: "Factory E", sector: "Thermoforming", material: "PP Sheet Input", volume: "5-8 t/wk", score: 58, distance: "11.4 km", impact: -8.2 }
];

const reports = [
  { period: "Q2 2027", credits: "18.4 tCO2e", transactions: 14, hash: "0xbf2c31a", chain: "Polygon", status: "Ready" },
  { period: "Q1 2027", credits: "16.1 tCO2e", transactions: 11, hash: "0x9a3dc4f", chain: "Polygon", status: "Filed" },
  { period: "Q4 2026", credits: "14.8 tCO2e", transactions: 9, hash: "0x5d7780b", chain: "Polygon", status: "Filed" },
  { period: "Q3 2026", credits: "13.0 tCO2e", transactions: 8, hash: "0xe1ff22d", chain: "Polygon", status: "Filed" }
];

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function jitter(value: number, amount: number, precision = 2) {
  const factor = Math.pow(10, precision);
  const next = value + (Math.random() - 0.5) * amount;
  return Math.round(next * factor) / factor;
}

function classify(values: Pick<Payload, "ph" | "turbidity_raw" | "flow_rate_lpm" | "temperature_c" | "gas_raw">): EdgeStatus {
  if (
    values.ph < 5.5 ||
    values.ph > 9.5 ||
    values.turbidity_raw >= 900 ||
    values.flow_rate_lpm <= 0.05 ||
    values.temperature_c > 50 ||
    values.gas_raw >= 780
  ) {
    return "ANOMALY";
  }

  if (
    values.ph < 6.5 ||
    values.ph > 8.5 ||
    values.turbidity_raw >= 650 ||
    values.flow_rate_lpm < 0.2 ||
    values.temperature_c > 40 ||
    values.gas_raw >= 550
  ) {
    return "WARNING";
  }

  return "VERIFIED";
}

function scoreQuality(values: Pick<Payload, "ph" | "turbidity_raw" | "flow_rate_lpm" | "temperature_c" | "gas_raw">, status: EdgeStatus) {
  const sensorCompleteness = values.flow_rate_lpm <= 0.05 ? 0.75 : 1;
  const normalRangeScore = status === "VERIFIED" ? 1 : status === "WARNING" ? 0.62 : 0.28;
  const signalStability = values.turbidity_raw > 900 || values.gas_raw > 780 ? 0.45 : values.turbidity_raw > 650 ? 0.72 : 0.92;
  const uptime = 0.96;
  const transmission = status === "ANOMALY" ? 0.78 : 0.98;
  const score =
    0.3 * sensorCompleteness +
    0.25 * normalRangeScore +
    0.2 * signalStability +
    0.15 * uptime +
    0.1 * transmission;

  return Math.round(clamp(score, 0, 1) * 100) / 100;
}

function anomalyReasons(values: Pick<Payload, "ph" | "turbidity_raw" | "flow_rate_lpm" | "temperature_c" | "gas_raw" | "energy_power_w">) {
  const reasons: string[] = [];
  if (values.ph < 5.5 || values.ph > 9.5) reasons.push("pH outside safe demo band");
  if (values.turbidity_raw >= 900) reasons.push("extreme turbidity");
  if (values.flow_rate_lpm <= 0.05) reasons.push("zero flow while active");
  if (values.temperature_c > 50) reasons.push("temperature anomaly");
  if (values.gas_raw >= 780) reasons.push("emission/gas risk high");
  if (values.energy_power_w <= 1) reasons.push("energy context missing");
  return reasons;
}

function aiWasteClass(values: Pick<Payload, "edge_status" | "gas_risk_score" | "turbidity_raw" | "energy_power_w">) {
  if (values.edge_status === "ANOMALY") return "manual_review_required";
  if (values.gas_risk_score > 0.55) return "emission_sensitive_stream";
  if (values.turbidity_raw >= 650) return "organic_turbid_wastewater";
  if (values.energy_power_w > 600) return "energy_linked_process_stream";
  return "neutral_wastewater_stream";
}

async function hashPayload(payload: Omit<Payload, "payload_hash">) {
  const text = JSON.stringify(payload);
  if (window.crypto?.subtle) {
    const buffer = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(text));
    return Array.from(new Uint8Array(buffer))
      .map((byte) => byte.toString(16).padStart(2, "0"))
      .join("");
  }

  let hash = 0;
  for (let index = 0; index < text.length; index += 1) {
    hash = (hash << 5) - hash + text.charCodeAt(index);
    hash |= 0;
  }
  return `local-${Math.abs(hash).toString(16).padStart(8, "0")}`;
}

function createPayload(scenario: Scenario, volume: number, overrides?: ManualSensorOverrides | null): Omit<Payload, "payload_hash"> {
  const noisyValues = {
    ph: overrides ? clamp(overrides.ph, 0, 14) : clamp(jitter(scenario.base.ph, 0.12), 0, 14),
    turbidity_raw: Math.round(overrides ? clamp(overrides.turbidity_raw, 0, 1023) : clamp(jitter(scenario.base.turbidity_raw, 34, 0), 0, 1023)),
    flow_rate_lpm: overrides ? clamp(overrides.flow_rate_lpm, 0, 8) : clamp(jitter(scenario.base.flow_rate_lpm, scenario.base.flow_rate_lpm <= 0.05 ? 0.03 : 0.18), 0, 8),
    temperature_c: overrides ? clamp(overrides.temperature_c, -10, 90) : clamp(jitter(scenario.base.temperature_c, 0.7), -10, 90),
    gas_raw: Math.round(overrides ? clamp(overrides.gas_raw, 0, 1023) : clamp(jitter(scenario.base.gas_raw, 26, 0), 0, 1023)),
    energy_current_a: overrides ? clamp(overrides.energy_current_a, 0, 12) : clamp(jitter(scenario.base.energy_current_a, 0.12), 0, 12)
  };
  const status = classify(noisyValues);
  const gasRisk = Math.round(clamp(noisyValues.gas_raw / 1023, 0, 1) * 100) / 100;
  const power = Math.round(noisyValues.energy_current_a * 220 * 10) / 10;
  const quality = scoreQuality(noisyValues, status);
  const carbonContext = Math.round(
    clamp(0.35 * (noisyValues.flow_rate_lpm / 5) + 0.3 * (power / 1000) + 0.2 * (1 - gasRisk) + 0.15 * quality, 0, 1) * 100
  ) / 100;
  const klass = aiWasteClass({ edge_status: status, gas_risk_score: gasRisk, turbidity_raw: noisyValues.turbidity_raw, energy_power_w: power });
  const matchConfidence = Math.round(
    clamp(0.55 * quality + 0.25 * carbonContext + 0.2 * (status === "VERIFIED" ? 0.96 : status === "WARNING" ? 0.72 : 0.38), 0, 1) * 100
  ) / 100;

  return {
    device_id: DEVICE_ID,
    factory_alias: "Factory_A",
    timestamp: new Date().toISOString(),
    sensor_type: "wastewater_edge_verifier",
    ...noisyValues,
    gas_risk_score: gasRisk,
    energy_power_w: power,
    estimated_volume_l: Math.round(volume * 100) / 100,
    edge_status: status,
    anomaly_flag: status === "ANOMALY",
    data_quality_score: quality,
    carbon_context_score: carbonContext,
    ai_waste_class: klass,
    ai_match_confidence: matchConfidence,
    anomaly_reasons: anomalyReasons({ ...noisyValues, energy_power_w: power })
  };
}

function initialVolume(key: ScenarioKey) {
  if (key === "clear") return 16.8;
  if (key === "organic") return 9.2;
  if (key === "emission") return 11.6;
  if (key === "energy") return 21.4;
  return 3.4;
}

function statusTone(status: EdgeStatus): SimulationTone {
  if (status === "VERIFIED") return "verified";
  if (status === "WARNING") return "warning";
  return "anomaly";
}

function stepIndexFromKey(key: SimulationStepKey) {
  return simulationSteps.findIndex((step) => step.key === key);
}

function stepNarrative(step: SimulationStepKey, payload: Payload) {
  const quality = Math.round(payload.data_quality_score * 100);
  const confidence = Math.round(payload.ai_match_confidence * 100);

  if (step === "sense") return `Flow ${payload.flow_rate_lpm.toFixed(2)} L/min, gas ${payload.gas_raw}, power ${payload.energy_power_w.toFixed(0)} W.`;
  if (step === "validate") return payload.edge_status === "ANOMALY" ? "Threshold breach detected locally." : `Edge quality score locked at ${quality}%.`;
  if (step === "hash") return `Payload fingerprint ${payload.payload_hash.slice(0, 18)}... committed on device.`;
  if (step === "upload") return payload.edge_status === "ANOMALY" ? "Upload moved with review flag." : "Secure payload transfer acknowledged.";
  if (step === "match") return payload.edge_status === "ANOMALY" ? "AI ranking paused for manual review." : `Top receiver confidence ${confidence}%.`;
  return payload.edge_status === "ANOMALY" ? "Reporting marked as quarantined evidence." : "Reporting and settlement context updated.";
}

function stageCopy(step: SimulationStepKey, payload: Payload) {
  if (step === "sense") return "Sampling chamber active";
  if (step === "validate") return payload.edge_status === "ANOMALY" ? "Threshold breach" : payload.edge_status === "WARNING" ? "Caution band detected" : "Thresholds clean";
  if (step === "hash") return "Hashing payload";
  if (step === "upload") return payload.edge_status === "ANOMALY" ? "Flagged upload" : "Secure upload";
  if (step === "match") return payload.edge_status === "ANOMALY" ? "Manual routing" : "Receiver ranking";
  return payload.edge_status === "ANOMALY" ? "Evidence held" : "Report synchronized";
}

function stepVisualState(index: number, activeIndex: number, payload: Payload) {
  if (payload.edge_status === "ANOMALY" && index >= stepIndexFromKey("match")) {
    if (index < activeIndex) return "blocked";
    if (index === activeIndex) return "active blocked";
    return "blocked waiting";
  }
  if (index < activeIndex) return "complete";
  if (index === activeIndex) return "active";
  return "waiting";
}

function currentProofState(activeIndex: number, payload: Payload) {
  if (activeIndex < stepIndexFromKey("hash")) return "collecting";
  if (payload.edge_status === "ANOMALY") return activeIndex >= stepIndexFromKey("match") ? "manual_review" : "flagged";
  if (payload.edge_status === "WARNING") return activeIndex >= stepIndexFromKey("match") ? "caution" : "processing";
  return activeIndex >= stepIndexFromKey("report") ? "accepted" : "processing";
}

function actionToneFromPayload(payload: Payload): SimulationActionTone {
  if (payload.edge_status === "ANOMALY") return "anomaly";
  if (payload.edge_status === "WARNING") return "warning";
  return "verified";
}

function scenarioAction(scenario: Scenario): SimulationAction {
  const tone: SimulationActionTone =
    scenario.key === "anomaly" ? "anomaly" : scenario.key === "organic" || scenario.key === "emission" ? "warning" : "verified";

  return {
    title: `${scenario.sample} selected: ${scenario.name}`,
    device: `The chamber and sensors are re-seeded for ${scenario.composition}.`,
    platform: scenario.downstream,
    tone,
    timestamp: new Date()
  };
}

function OverviewView() {
  const overviewMetrics = [
    { label: "Waste Diverted · Month", value: "2,840 t", note: "+12% vs last month", tone: "verified" },
    { label: "Carbon Credits Traded", value: "1,203 tCO2e", note: "+8%", tone: "verified" },
    { label: "Active Symbiosis Pairs", value: "38", note: "6 new matches pending", tone: "neutral" },
    { label: "Compliance Rate", value: "94.2%", note: "3 factories pending proof", tone: "warning" }
  ];
  const overviewFlow = [
    ["Factory Edge", "Sensors classify the stream while raw readings stay local."],
    ["ZK Prover", "The device turns private readings into a shareable proof."],
    ["AI Matchmaker", "Receiver ranking uses trusted signals, not factory secrets."],
    ["Smart Contract", "Accepted proof becomes settlement and credit movement."],
    ["CBAM Report", "The proof trail becomes compliance-ready evidence."]
  ];

  return (
    <section className="overview-layout">
      <section className="overview-metrics" aria-label="estate proof summary">
        {overviewMetrics.map((metric) => (
          <div className={`metric metric--${metric.tone}`} key={metric.label}>
            <span>{metric.label}</span>
            <strong>{metric.value}</strong>
            <small>{metric.note}</small>
          </div>
        ))}
      </section>

      <Panel title="Proof Story Map" action="Factory to report" className="overview-flow-panel" tourId="overview-proof-map">
        <div className="proof-map">
          {overviewFlow.map(([title, desc], index) => (
            <React.Fragment key={title}>
              <FlowNode title={title} desc={desc} active={index === 0} index={index + 1} />
              {index < overviewFlow.length - 1 ? <div className="flow-connector" aria-hidden="true" /> : null}
            </React.Fragment>
          ))}
        </div>
      </Panel>

      <Panel title="Recent Activity" action="Live estate events" className="overview-activity" tourId="overview-recent-activity">
        <ActivityList />
      </Panel>
      
      <Panel title="Carbon by Category" className="overview-carbon">
        <div className="v-stack">
          {[
            { label: "Organic solvent", pct: 78, val: "412t" },
            { label: "Process heat", pct: 65, val: "344t" },
            { label: "Metal slag", pct: 52, val: "276t" },
            { label: "Organic residue", pct: 38, val: "201t" },
            { label: "Polymer offcuts", pct: 22, val: "116t" }
          ].map(c => (
            <MeterRow key={c.label} label={c.label} pct={c.pct} val={c.val} color="var(--ink)" />
          ))}
        </div>
      </Panel>
    </section>
  );
}

function FlowNode({ title, desc, active = false, index }: { title: string; desc: string; active?: boolean; index?: number }) {
  return (
    <div className={active ? "flow-node active" : "flow-node"}>
      {index ? <span>{String(index).padStart(2, "0")}</span> : null}
      <h3>{title}</h3>
      <p>{desc}</p>
    </div>
  );
}

function ZkGridView({ onAction }: { onAction: (action: SimulationAction) => void }) {
  const [proofGenerated, setProofGenerated] = useState(false);
  const [proofSeed, setProofSeed] = useState("pending");

  function generateProof() {
    const seed = `0x${Math.random().toString(16).slice(2, 10)}${Date.now().toString(16).slice(-6)}`;
    setProofSeed(seed);
    setProofGenerated(true);
    onAction({
      title: "ZK proof generated",
      device: "The edge node converted local readings into a privacy-preserving proof.",
      platform: "Only public range signals and the proof ID are visible to the ledger.",
      tone: "verified",
      timestamp: new Date()
    });
  }

  return (
    <section className="view-grid">
      <div className="route-step-strip">
        <ZkStep num={1} title="Private Input" desc="Actual volume, salt, category ID, stays on factory edge node. Never transmitted." tone="warning" />
        <ZkStep num={2} title="Proof Generation" desc="Groth16 circuit computes π_A, π_B, π_C from private inputs in ~2.1s on edge node." />
        <ZkStep num={3} title="Cipher-Grid Verify" desc="Only 128-byte proof + public signals transmitted. Verifier returns valid/invalid." />
        <ZkStep num={4} title="Compliance Signal" desc="TRUE/FALSE signal available to regulators. No raw data ever on-chain." tone="verified" />
      </div>

      <div className="route-main-stack">
        <Panel title="Manual Proof Generator" action="Simulate ZK proof" tourId="zk-proof-generator">
          <div className="proof-input-row">
            <input type="text" className="input-field" placeholder="Actual volume" defaultValue="5000 kg" />
            <input type="text" className="input-field" placeholder="Range lo" defaultValue="4000" />
            <input type="text" className="input-field" placeholder="Range hi" defaultValue="6000" />
          </div>
          <button
            className="utility-button utility-button--primary proof-generate-button"
            onClick={generateProof}
          >
            Generate ZK-Proof
          </button>
          <div className="proof-output-box">
            <span>Proof output (public signals only)</span>
            <code>
              {proofGenerated
                ? `proof=${proofSeed}; public_signal=range_pass; raw_factory_data=hidden; verifier_status=valid`
                : "Click Generate to compute proof..."}
            </code>
          </div>
        </Panel>

        <Panel title="Live Proof Ledger" action="Validating" tourId="zk-live-ledger">
          <ProofRows />
        </Panel>
      </div>

      <div className="route-side-stack">
        <Panel title="Estate Compliance Status">
          <div className="route-score-card">
            <strong>94.2%</strong>
            <span>47 factories · this epoch</span>
          </div>
          <div className="v-stack">
            <MeterRow label="Compliant" pct={94} val="44" color="var(--green-deep)" />
            <MeterRow label="Pending" pct={6} val="3" color="var(--amber)" />
            <MeterRow label="Non-compliant" pct={0} val="0" color="var(--red)" />
          </div>
        </Panel>

        <Panel title="CBAM Integration">
          <p className="panel-copy">
            ZK proofs are <strong>MRV-ready</strong> - each verified proof satisfies Measurement, Reporting, and Verification requirements for Carbon Border Adjustment Mechanism (CBAM) automatically.
          </p>
          <div className="v-stack">
            <div className="fact-row">
              <span>MRV standard</span>
              <strong>ISO 14064</strong>
            </div>
            <div className="fact-row">
              <span>Proof on-chain</span>
              <strong>Polygon PoS</strong>
            </div>
            <div className="fact-row">
              <span>Circuit type</span>
              <strong>Groth16 SNARK</strong>
            </div>
          </div>
        </Panel>
      </div>
    </section>
  );
}

function ZkStep({ num, title, desc, tone = "neutral" }: { num: number; title: string; desc: string; tone?: "warning" | "verified" | "neutral" }) {
  return (
    <div className={`zk-step ${tone}`}>
      <span>{num}</span>
      <strong>{title}</strong>
      <p>{desc}</p>
    </div>
  );
}

function MeterRow({ label, pct, val, color }: { label: string; pct: number; val: string; color: string }) {
  return (
    <div className="meter-row">
      <span>{label}</span>
      <div className="meter-track">
        <div className="meter-fill" style={{ width: `${pct}%`, background: color }} />
      </div>
      <strong style={{ color }}>{val}</strong>
    </div>
  );
}

const exchangeMatches = [
  { prodId: "A-14", prodWaste: "Organic solvent · 80–120t", recId: "B-07", recNeeds: "Solvent feedstock · 60–130t", score: 97.3, credits: 142, status: "active" },
  { prodId: "C-22", prodWaste: "Metal slag · 40–60t", recId: "D-11", recNeeds: "Aggregate fill · 30–70t", score: 88.1, credits: 87, status: "active" },
  { prodId: "E-03", prodWaste: "Process heat · continuous", recId: "F-18", recNeeds: "Thermal energy · 200–400kW", score: 91.7, credits: 210, status: "pending" },
];

const timelineStepsMock = [
  { marker: "OK", title: "Payload Hash", desc: "Data hashed and committed", time: "10:21 UTC", state: "done" },
  { marker: "OK", title: "ZK Proof Generated", desc: "Compliance proof ready", time: "10:22 UTC", state: "done" },
  { marker: "RUN", title: "Contract Ready", desc: "Smart contract prepared, awaiting both confirmations", time: "10:24 UTC", state: "active" },
  { marker: "WAIT", title: "Verified Exchange", desc: "Exchange recorded on-chain", time: "Pending", state: "pending" },
];

function ExchangeView({ onAction }: { onAction: (action: SimulationAction) => void }) {
  const [committed, setCommitted] = useState(false);
  const [confirmedMatchIds, setConfirmedMatchIds] = useState<string[]>([]);

  function confirmMatch(match: (typeof exchangeMatches)[number]) {
    setConfirmedMatchIds((current) => current.includes(match.prodId) ? current : [...current, match.prodId]);
    onAction({
      title: `Match ${match.prodId} to ${match.recId} confirmed`,
      device: "The edge proof is now linked to a receiver-side intent.",
      platform: `${match.credits} tCO2e is staged for contract settlement once both sides commit.`,
      tone: match.status === "pending" ? "warning" : "verified",
      timestamp: new Date()
    });
  }

  function commitSettlement() {
    setCommitted(true);
    onAction({
      title: "Smart contract settlement committed",
      device: "The verifier proof is locked as the evidence anchor.",
      platform: "The exchange timeline moved from awaiting confirmation to completed settlement.",
      tone: "verified",
      timestamp: new Date()
    });
  }

  return (
    <section className="view-grid">
      <div className="wide-panel exchange-stack">
        <Panel title="Active Matches, Awaiting Confirmation" tourId="exchange-confirm">
          <div className="exchange-match-list">
            {exchangeMatches.map((m) => (
              <div className="exchange-match-row" key={m.prodId}>
                <div className="exchange-party">
                  <span>Producer</span>
                  <strong>Factory #{m.prodId}</strong>
                  <small>{m.prodWaste}</small>
                </div>
                <div className="exchange-link" aria-hidden="true">LINK</div>
                <div className="exchange-party">
                  <span>Receiver</span>
                  <strong>Factory #{m.recId}</strong>
                  <small>{m.recNeeds}</small>
                </div>
                <div className="exchange-actions">
                  <span className={confirmedMatchIds.includes(m.prodId) || m.status === "active" ? "settlement-badge verified" : "settlement-badge warning"}>
                    {confirmedMatchIds.includes(m.prodId) ? "confirmed" : m.status}
                  </span>
                  <button
                    className="utility-button utility-button--compact"
                    onClick={() => confirmMatch(m)}
                    disabled={confirmedMatchIds.includes(m.prodId)}
                  >
                    {confirmedMatchIds.includes(m.prodId) ? "Confirmed" : "Confirm"}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </Panel>

        <Panel title="Carbon Credit Swap" action="Atomic transfer" tourId="exchange-commit">
          <div className="credit-swap">
            <div className="credit-box">
              <span>Available Credits</span>
              <strong>124.6</strong>
              <small>tCO2e in wallet</small>
            </div>
            <div className="credit-transfer" aria-hidden="true">SWAP</div>
            <div className="credit-box credit-box--accent">
              <span>Credits to Commit</span>
              <strong>24.8</strong>
              <small>tCO2e this swap</small>
            </div>
          </div>
          <div className="flex-between">
            <span className="settlement-time">
              {committed ? "Settlement completed: 10:35 UTC, May 4, 2026" : "Est. settlement: 10:35 UTC, May 4, 2026"}
            </span>
            <button
              className={committed ? "utility-button utility-button--success" : "utility-button utility-button--primary"}
              onClick={commitSettlement}
              disabled={committed}
            >
              {committed ? "Committed" : "Commit"}
            </button>
          </div>
        </Panel>
      </div>

      <Panel title="Contract Execution Timeline">
        <div className="settlement-timeline">
          <div className="settlement-timeline__rail" />
          {timelineStepsMock.map((step, i) => {
            const isDone = committed || step.state === "done";
            const isActive = !committed && step.state === "active";

            let stepMarker = step.marker;
            if (committed) stepMarker = "OK";
            else if (isActive) stepMarker = "RUN";

            return (
              <div className="settlement-step" key={step.title}>
                <div className={isDone ? "settlement-marker done" : isActive ? "settlement-marker active" : "settlement-marker"}>
                  {stepMarker}
                </div>
                <div>
                  <div className="flex-between">
                    <strong className="settlement-step__title">{step.title}</strong>
                    <time className="settlement-step__time">{committed && i === 3 ? "10:35 UTC" : step.time}</time>
                  </div>
                  <p className="settlement-step__desc">{step.desc}</p>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>
    </section>
  );
}

function EcoCipherLogo() {
  return (
    <svg className="brand-logo" viewBox="0 0 96 96" role="img" aria-label="Eco-Cipher logo">
      <defs>
        <linearGradient id="logoGreen" x1="15" y1="10" x2="78" y2="86" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#0b7b58" />
          <stop offset="1" stopColor="#034a37" />
        </linearGradient>
        <linearGradient id="logoInk" x1="48" y1="20" x2="82" y2="76" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="#142126" />
          <stop offset="1" stopColor="#071114" />
        </linearGradient>
      </defs>
      <path d="M48 5 85 27v42L48 91 11 69V27L48 5Z" fill="none" stroke="url(#logoGreen)" strokeWidth="9" strokeLinejoin="round" />
      <path d="M46 22 25 37v22l21 13V22Z" fill="url(#logoGreen)" />
      <path d="M50 22 72 38v31L50 82V22Z" fill="url(#logoInk)" />
      <path d="M24 39 48 55 72 39M24 58 48 73 72 58M48 22v60" fill="none" stroke="#f7faf7" strokeWidth="5" strokeLinejoin="round" />
      <path d="M60 55h12M60 73h12" stroke="#f7faf7" strokeWidth="5" strokeLinecap="round" />
      <circle cx="75" cy="55" r="7" fill="none" stroke="#f7faf7" strokeWidth="5" />
      <circle cx="75" cy="73" r="7" fill="none" stroke="#f7faf7" strokeWidth="5" />
    </svg>
  );
}

function NavGlyph({ active }: { active: boolean }) {
  return (
    <svg className="nav-glyph" viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h14" />
      <path d="M13 6l6 6-6 6" className={active ? "nav-glyph__arrow active" : "nav-glyph__arrow"} />
      <circle cx="5" cy="12" r="2.5" />
    </svg>
  );
}

function ViewChangeNotice({ feedback, switching }: { feedback: ViewFeedback; switching: boolean }) {
  return (
    <section className={`view-change-notice ${switching ? "switching" : ""}`} aria-live="polite">
      <div className="view-change-notice__signal">
        <span />
      </div>
      <div>
        <span>{switching ? "Page is changing" : "Current page"}</span>
        <strong>{switching ? `Opening ${feedback.label}` : feedback.label}</strong>
        <p>{feedback.detail}</p>
      </div>
      <time>
        {feedback.timestamp.toLocaleTimeString("en-GB", {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit"
        })}
      </time>
    </section>
  );
}

function GlobalStatusStrip({
  payload,
  scenario,
  currentStep,
  activeStepIndex,
  proofStateLabel,
  latestAction,
  guidedMode,
  operatorMode,
  tourId
}: {
  payload: Payload;
  scenario: Scenario;
  currentStep: SimulationStep;
  activeStepIndex: number;
  proofStateLabel: string;
  latestAction: SimulationAction;
  guidedMode: boolean;
  operatorMode: OperatorMode;
  tourId?: string;
}) {
  const hashValue = activeStepIndex >= stepIndexFromKey("hash") ? payload.payload_hash.slice(0, 12) : "pending";

  return (
    <section className={`global-status-strip ${statusTone(payload.edge_status)}`} aria-label="current simulation status" data-tour-id={tourId}>
      <div className="global-status-strip__primary">
        <span>{scenario.sample} · {scenario.name}</span>
        <strong>{String(activeStepIndex + 1).padStart(2, "0")} · {currentStep.label}</strong>
        <small>{stageCopy(currentStep.key, payload)}</small>
      </div>
      <div className="global-status-strip__facts">
        <div>
          <span>Status</span>
          <strong>{payload.edge_status}</strong>
        </div>
        <div>
          <span>Proof</span>
          <strong>{proofStateLabel}</strong>
        </div>
        <div>
          <span>Hash</span>
          <strong>{hashValue}</strong>
        </div>
        <div>
          <span>Mode</span>
          <strong>{guidedMode ? "Guided" : "Manual"}</strong>
        </div>
        <div>
          <span>Operator</span>
          <strong>{operatorModeCopy[operatorMode].label}</strong>
        </div>
      </div>
      <div className={`global-status-strip__action ${latestAction.tone}`}>
        <span>Latest action</span>
        <strong>{latestAction.title}</strong>
      </div>
    </section>
  );
}

function readTutorialStepIndex() {
  if (typeof window === "undefined") return 0;
  const savedStepId = window.localStorage.getItem(TUTORIAL_STORAGE_KEYS.lastStepId);
  const savedIndex = tutorialSteps.findIndex((step) => step.id === savedStepId);
  return savedIndex >= 0 ? savedIndex : 0;
}

function clampTutorialStepIndex(index: number) {
  return clamp(index, 0, tutorialSteps.length - 1);
}

function shouldOpenTutorialInitially() {
  if (typeof window === "undefined") return false;
  return (
    window.localStorage.getItem(TUTORIAL_STORAGE_KEYS.completed) !== "true" &&
    !window.localStorage.getItem(TUTORIAL_STORAGE_KEYS.dismissedAt)
  );
}

function computeTutorialPosition(targetId: string): TutorialPosition {
  if (typeof window === "undefined") {
    return { mode: "center", cardStyle: {} };
  }

  const target = document.querySelector<HTMLElement>(`[data-tour-id="${targetId}"]`);
  if (!target) {
    return { mode: "center", cardStyle: {} };
  }

  const rect = target.getBoundingClientRect();
  if (rect.width <= 0 || rect.height <= 0) {
    return { mode: "center", cardStyle: {} };
  }

  const padding = 16;
  const cardWidth = Math.min(380, window.innerWidth - padding * 2);
  const cardHeightEstimate = 268;
  const canFitRight = rect.right + padding + cardWidth <= window.innerWidth;
  const canFitLeft = rect.left - padding - cardWidth >= 0;
  const canFitBelow = rect.bottom + padding + cardHeightEstimate <= window.innerHeight;
  const canFitAbove = rect.top - padding - cardHeightEstimate >= 0;
  const left = canFitRight
    ? rect.right + padding
    : canFitLeft
      ? rect.left - padding - cardWidth
      : clamp(rect.left + rect.width / 2 - cardWidth / 2, padding, window.innerWidth - cardWidth - padding);
  const top = canFitBelow
    ? rect.bottom + padding
    : canFitAbove
      ? rect.top - padding - cardHeightEstimate
      : clamp(rect.top + rect.height / 2 - cardHeightEstimate / 2, padding, window.innerHeight - cardHeightEstimate - padding);

  return {
    mode: "anchored",
    cardStyle: { left, top, width: cardWidth },
    spotlightStyle: {
      left: Math.max(rect.left - 8, 8),
      top: Math.max(rect.top - 8, 8),
      width: Math.min(rect.width + 16, window.innerWidth - 16),
      height: Math.min(rect.height + 16, window.innerHeight - 16)
    }
  };
}

function TutorialOverlay({
  open,
  step,
  stepIndex,
  totalSteps,
  onBack,
  onNext,
  onSkip,
  onFinish
}: {
  open: boolean;
  step: TutorialStep;
  stepIndex: number;
  totalSteps: number;
  onBack: () => void;
  onNext: () => void;
  onSkip: () => void;
  onFinish: () => void;
}) {
  const [position, setPosition] = useState<TutorialPosition>({ mode: "center", cardStyle: {} });
  const isLastStep = stepIndex >= totalSteps - 1;

  useEffect(() => {
    if (!open) return undefined;

    let frame = 0;
    let retryTimeout = 0;
    let attempts = 0;

    const syncPosition = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        setPosition(computeTutorialPosition(step.targetId));
      });
    };

    const findAndMeasure = () => {
      const target = document.querySelector<HTMLElement>(`[data-tour-id="${step.targetId}"]`);
      if (target) {
        target.scrollIntoView({ behavior: "smooth", block: "center", inline: "center" });
        syncPosition();
        retryTimeout = window.setTimeout(syncPosition, 260);
        return;
      }

      setPosition({ mode: "center", cardStyle: {} });
      attempts += 1;
      if (attempts < 30) {
        retryTimeout = window.setTimeout(findAndMeasure, 100);
      }
    };

    setPosition({ mode: "center", cardStyle: {} });
    findAndMeasure();
    window.addEventListener("resize", syncPosition);
    window.addEventListener("scroll", syncPosition, true);

    return () => {
      window.clearTimeout(retryTimeout);
      window.cancelAnimationFrame(frame);
      window.removeEventListener("resize", syncPosition);
      window.removeEventListener("scroll", syncPosition, true);
    };
  }, [open, step.targetId]);

  useEffect(() => {
    if (!open) return undefined;

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        event.preventDefault();
        onSkip();
      }
      if (event.key === "ArrowRight") {
        event.preventDefault();
        isLastStep ? onFinish() : onNext();
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        onBack();
      }
    }

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [isLastStep, onBack, onFinish, onNext, onSkip, open]);

  if (!open) return null;

  return (
    <div className={`tutorial-layer ${position.mode}`} role="dialog" aria-modal="true" aria-labelledby="tutorial-title">
      <div className="tutorial-scrim" />
      {position.spotlightStyle ? <div className="tutorial-spotlight" style={position.spotlightStyle} /> : null}
      <section className="tutorial-card" style={position.cardStyle}>
        <div className="tutorial-card__meta">
          <span>{step.eyebrow}</span>
          <strong>{String(stepIndex + 1).padStart(2, "0")} / {String(totalSteps).padStart(2, "0")}</strong>
        </div>
        <h2 id="tutorial-title">{step.title}</h2>
        <p>{step.body}</p>
        {step.action ? <div className="tutorial-action">{step.action}</div> : null}
        <div className="tutorial-progress" aria-hidden="true">
          <span style={{ width: `${((stepIndex + 1) / totalSteps) * 100}%` }} />
        </div>
        <div className="tutorial-controls">
          <button className="utility-button" onClick={onSkip}>Skip</button>
          <div>
            <button className="utility-button" onClick={onBack} disabled={stepIndex === 0}>Back</button>
            <button className="utility-button utility-button--primary" onClick={isLastStep ? onFinish : onNext}>
              {isLastStep ? "Finish" : "Next"}
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}

function EdgeVerifyView({
  payload,
  scenario,
  currentStep,
  activeStepIndex,
  guidedMode,
  proofStateLabel,
  activePresetKey,
  operatorMode,
  operatorEvents,
  manualOverrides,
  latestAction,
  selectedCandidate,
  onModeChange,
  onReplay,
  onStepSelect,
  onChooseScenario,
  onApplyPreset,
  onSensorChange,
  onResetProofLab,
  onOperatorEvent
}: {
  payload: Payload;
  scenario: Scenario;
  currentStep: SimulationStep;
  activeStepIndex: number;
  guidedMode: boolean;
  proofStateLabel: string;
  activePresetKey: DemoPreset["key"];
  operatorMode: OperatorMode;
  operatorEvents: OperatorEvent[];
  manualOverrides: ManualSensorOverrides | null;
  latestAction: SimulationAction;
  selectedCandidate: Candidate;
  onModeChange: (value: boolean) => void;
  onReplay: () => void;
  onStepSelect: (step: SimulationStepKey) => void;
  onChooseScenario: (key: ScenarioKey) => void;
  onApplyPreset: (preset: DemoPreset) => void;
  onSensorChange: (key: keyof ManualSensorOverrides, value: number) => void;
  onResetProofLab: () => void;
  onOperatorEvent: (mode: OperatorMode, title: string, detail: string) => void;
}) {
  return (
    <section className="edge-verify-page">
      <section className="hero-grid edge-verify-control-grid">
        <div className="hero-command-row">
          <DevicePanel
            payload={payload}
            scenario={scenario}
            currentStep={currentStep}
            activeStepIndex={activeStepIndex}
            guidedMode={guidedMode}
          />
          <MissionControl
            guidedMode={guidedMode}
            activeStepIndex={activeStepIndex}
            onModeChange={onModeChange}
            onReplay={onReplay}
            onStepSelect={onStepSelect}
          />
          <ActionConsequencePanel action={latestAction} />
        </div>
        <ScenarioList scenarioKey={scenario.key} onChoose={onChooseScenario} className="span-2" />
        <NarrativePanel
          scenario={scenario}
          currentStep={currentStep}
          activeStepIndex={activeStepIndex}
          payload={payload}
          proofStateLabel={proofStateLabel}
          className="span-2"
        />
        <GuidedCommandCenter
          activePresetKey={activePresetKey}
          activeStepIndex={activeStepIndex}
          guidedMode={guidedMode}
          operatorMode={operatorMode}
          payload={payload}
          onApplyPreset={onApplyPreset}
          onReplay={onReplay}
          onStepSelect={onStepSelect}
          onModeChange={onModeChange}
        />
        <ProofLabPanel
          payload={payload}
          scenario={scenario}
          overrides={manualOverrides}
          onChange={onSensorChange}
          onReset={onResetProofLab}
        />
        <OperatorConsole
          mode={operatorMode}
          events={operatorEvents}
          payload={payload}
          onEvent={onOperatorEvent}
        />
      </section>

      <section className="view-grid edge-verify-details">
        <Panel title="Guided Proof Sequence" action={stageCopy(currentStep.key, payload)} className="wide-panel">
          <FlowPanel payload={payload} activeStepIndex={activeStepIndex} onStepSelect={onStepSelect} guidedMode={guidedMode} />
        </Panel>
        <Panel title="Live Sensor Stream" action="5s refresh">
          <MetricGrid payload={payload} />
        </Panel>
        <Panel title="Local Decision" action={proofStateLabel}>
          <OutcomeCard payload={payload} candidate={selectedCandidate} activeStepIndex={activeStepIndex} />
        </Panel>
        <Panel title="ESP32 Wiring Map">
          <WiringMap />
        </Panel>
      </section>
    </section>
  );
}

function App() {
  const [activeView, setActiveView] = useState<ViewKey>(() => resolveInitialView());
  const [scenarioKey, setScenarioKey] = useState<ScenarioKey>("clear");
  const [guidedMode, setGuidedMode] = useState(true);
  const [activeStepIndex, setActiveStepIndex] = useState(0);
  const [cycleToken, setCycleToken] = useState(0);
  const [activePresetKey, setActivePresetKey] = useState<DemoPreset["key"]>("pitch");
  const [manualOverrides, setManualOverrides] = useState<ManualSensorOverrides | null>(null);
  const [operatorMode, setOperatorMode] = useState<OperatorMode>("normal");
  const [operatorEvents, setOperatorEvents] = useState<OperatorEvent[]>([]);
  const [sortByImpact, setSortByImpact] = useState(false);
  const [selectedCandidateId, setSelectedCandidateId] = useState("B-07");
  const [volume, setVolume] = useState(16.8);
  const [clock, setClock] = useState(() => new Date());
  const [latestAction, setLatestAction] = useState<SimulationAction>(initialAction);
  const [viewFeedback, setViewFeedback] = useState<ViewFeedback>({
    key: resolveInitialView(),
    label: "Overview",
    detail: viewFeedbackCopy.overview,
    timestamp: new Date()
  });
  const [switchingViewKey, setSwitchingViewKey] = useState<ViewKey | null>(null);
  const [tutorialOpen, setTutorialOpen] = useState(() => shouldOpenTutorialInitially());
  const [tutorialStepIndex, setTutorialStepIndex] = useState(() => readTutorialStepIndex());
  const [tutorialCompleted, setTutorialCompleted] = useState(() => (
    typeof window !== "undefined" &&
    window.localStorage.getItem(TUTORIAL_STORAGE_KEYS.completed) === "true"
  ));
  const [payload, setPayload] = useState<Payload>({
    ...createPayload(scenarios[0], 16.8),
    payload_hash: "calculating"
  });

  const scenario = useMemo(() => scenarios.find((item) => item.key === scenarioKey) ?? scenarios[0], [scenarioKey]);
  const statusClass = payload.edge_status.toLowerCase();
  const currentStep = simulationSteps[activeStepIndex];
  const qualityPct = Math.round(payload.data_quality_score * 100);
  const matchConfidence = Math.round(payload.ai_match_confidence * 100);
  const carbonPct = Math.round(payload.carbon_context_score * 100);
  const sortedCandidates = useMemo(() => {
    return [...candidates].sort((a, b) => (sortByImpact ? a.impact - b.impact : b.score - a.score));
  }, [sortByImpact]);
  const selectedCandidate = sortedCandidates.find((candidate) => candidate.id === selectedCandidateId) ?? sortedCandidates[0];
  const validProofs = proofs.filter((proof) => proof.status === "valid").length;
  const proofState = currentProofState(activeStepIndex, payload);
  const proofStateLabel =
    proofState === "accepted"
      ? "Accepted"
      : proofState === "processing"
        ? "Processing"
        : proofState === "caution"
          ? "Accepted with caution"
          : proofState === "flagged"
            ? "Flagged"
            : proofState === "manual_review"
              ? "Manual review"
              : "Collecting";
  const automationBlocked = operatorMode === "quarantined" || operatorMode === "maintenance";
  const outcomeTitle =
    automationBlocked
      ? `Operator hold: ${operatorModeCopy[operatorMode].label}`
      : payload.edge_status === "ANOMALY"
      ? "Manual review required"
      : payload.edge_status === "WARNING"
        ? `Conditional match: ${selectedCandidate.factory}`
        : `AI match ready: ${selectedCandidate.factory}`;
  const reportTitle =
    automationBlocked
      ? `Report held by ${operatorModeCopy[operatorMode].label.toLowerCase()} state`
      : payload.edge_status === "ANOMALY"
      ? "Report held as quarantined evidence"
      : payload.edge_status === "WARNING"
        ? "Report updated with caution state"
        : "Report synchronized with verified proof";
  const currentViewMeta = viewPageMeta[activeView];
  const safeTutorialStepIndex = clampTutorialStepIndex(tutorialStepIndex);
  const activeTutorialStep = tutorialSteps[safeTutorialStepIndex];

  useEffect(() => {
    const interval = window.setInterval(() => setClock(new Date()), 1000);
    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    const nextUrl = new URL(window.location.href);
    nextUrl.searchParams.set("view", activeView);
    window.history.replaceState({}, "", nextUrl);
  }, [activeView]);

  useEffect(() => {
    if (!switchingViewKey) return undefined;
    const timeout = window.setTimeout(() => setSwitchingViewKey(null), 720);
    return () => window.clearTimeout(timeout);
  }, [switchingViewKey]);

  useEffect(() => {
    if (!tutorialOpen) return;
    if (tutorialStepIndex !== safeTutorialStepIndex) {
      setTutorialStepIndex(safeTutorialStepIndex);
      return;
    }

    window.localStorage.setItem(TUTORIAL_STORAGE_KEYS.lastStepId, activeTutorialStep.id);
    if (activeView !== activeTutorialStep.view) {
      openView(activeTutorialStep.view);
    }
  }, [activeTutorialStep, activeView, safeTutorialStepIndex, tutorialOpen, tutorialStepIndex]);

  useEffect(() => {
    let cancelled = false;
    let currentVolume = initialVolume(scenario.key);

    async function refresh() {
      const flowIncrement = scenario.base.flow_rate_lpm > 0 ? scenario.base.flow_rate_lpm / 12 : 0;
      currentVolume = Math.round((currentVolume + flowIncrement) * 100) / 100;
      setVolume(currentVolume);
      const nextBase = createPayload(scenario, currentVolume, manualOverrides);
      const payloadHash = await hashPayload(nextBase);
      if (!cancelled) {
        setPayload({ ...nextBase, payload_hash: payloadHash });
      }
    }

    refresh();
    const interval = window.setInterval(refresh, 5000);
    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, [scenario, cycleToken, manualOverrides]);

  useEffect(() => {
    if (!guidedMode) return undefined;
    if (activeStepIndex >= simulationSteps.length - 1) return undefined;

    const timeout = window.setTimeout(() => {
      setActiveStepIndex((current) => Math.min(current + 1, simulationSteps.length - 1));
    }, stepDurations[activeStepIndex]);

    return () => window.clearTimeout(timeout);
  }, [activeStepIndex, guidedMode, cycleToken]);

  function restartCycle(nextScenarioKey?: ScenarioKey) {
    const resolvedScenario = nextScenarioKey ?? scenarioKey;
    const resolvedScenarioConfig = scenarios.find((item) => item.key === resolvedScenario) ?? scenarios[0];
    setScenarioKey(resolvedScenario);
    setManualOverrides(null);
    setOperatorMode("normal");
    setActiveView("overview");
    setActiveStepIndex(0);
    setVolume(initialVolume(resolvedScenario));
    setCycleToken((value) => value + 1);
    setLatestAction(nextScenarioKey ? scenarioAction(resolvedScenarioConfig) : {
      title: "Simulation replayed",
      device: `The verifier restarted at ${resolvedScenarioConfig.sample} from the sensing stage.`,
      platform: "All proof and matching consequences are recalculated from the beginning.",
      tone: actionToneFromPayload(payload),
      timestamp: new Date()
    });
  }

  function chooseScenario(key: ScenarioKey) {
    restartCycle(key);
  }

  function changeGuidedMode(nextValue: boolean) {
    setGuidedMode(nextValue);
    setActiveStepIndex(0);
    setCycleToken((value) => value + 1);
    setLatestAction({
      title: nextValue ? "Guided mode enabled" : "Manual diagnostic mode enabled",
      device: nextValue ? "The device will advance through the proof stages automatically." : "The user can inspect one proof stage at a time.",
      platform: nextValue ? "Dashboard panels synchronize to the cinematic proof story." : "Dashboard panels wait for explicit step selection.",
      tone: "neutral",
      timestamp: new Date()
    });
  }

  function selectStep(stepKey: SimulationStepKey) {
    if (guidedMode) return;
    const nextIndex = stepIndexFromKey(stepKey);
    const step = simulationSteps[nextIndex];
    setActiveStepIndex(nextIndex);
    setLatestAction({
      title: `Manual stage selected: ${step.label}`,
      device: stageCopy(step.key, payload),
      platform: stepNarrative(step.key, payload),
      tone: actionToneFromPayload(payload),
      timestamp: new Date()
    });
  }

  function openView(view: ViewKey) {
    const label = navSections.flatMap((section) => section.items).find((item) => item.key === view)?.label ?? view;
    setSwitchingViewKey(view);
    setViewFeedback({
      key: view,
      label,
      detail: viewFeedbackCopy[view],
      timestamp: new Date()
    });
    setActiveView(view);
    setLatestAction({
      title: `${label} opened`,
      device: view === "hardware" ? "The physical prototype view is now the active simulator." : `The verifier remains at ${currentStep.label}.`,
      platform: viewFeedbackCopy[view],
      tone: actionToneFromPayload(payload),
      timestamp: new Date()
    });
  }

  function selectCandidate(id: string) {
    const candidate = candidates.find((item) => item.id === id) ?? selectedCandidate;
    setSelectedCandidateId(id);
    setLatestAction({
      title: `Receiver candidate selected: ${candidate.factory}`,
      device: "The edge proof stays unchanged while the AI match explanation is recalculated.",
      platform: `${candidate.material} is now compared against ${candidate.distance} distance and ${candidate.impact.toFixed(1)} tCO2e/yr impact.`,
      tone: payload.edge_status === "ANOMALY" ? "anomaly" : "verified",
      timestamp: new Date()
    });
  }

  function applyPreset(preset: DemoPreset) {
    setActivePresetKey(preset.key);
    setScenarioKey(preset.scenarioKey);
    setGuidedMode(preset.guidedMode);
    setActiveStepIndex(preset.stepIndex);
    setActiveView(preset.view);
    setManualOverrides(null);
    setOperatorMode("normal");
    setVolume(initialVolume(preset.scenarioKey));
    setCycleToken((value) => value + 1);
    setViewFeedback({
      key: preset.view,
      label: viewPageMeta[preset.view].eyebrow,
      detail: `Loaded ${preset.label} for ${preset.audience}.`,
      timestamp: new Date()
    });
    setLatestAction({
      title: `${preset.label} preset loaded`,
      device: `The verifier is staged for ${preset.scenarioKey} at proof step ${preset.stepIndex + 1}.`,
      platform: `The dashboard opened ${viewPageMeta[preset.view].primarySignal.toLowerCase()} for ${preset.audience}.`,
      tone: "neutral",
      timestamp: new Date()
    });
  }

  function updateSensorOverride(key: keyof ManualSensorOverrides, value: number) {
    const base = manualOverrides ?? scenario.base;
    const nextOverrides = { ...base, [key]: value };
    setManualOverrides(nextOverrides);
    setGuidedMode(false);
    setActivePresetKey("technical");
    setActiveStepIndex((current) => Math.max(current, stepIndexFromKey("validate")));
    setLatestAction({
      title: `Proof lab adjusted ${key.replace("_", " ")}`,
      device: "Manual sensor input overrides the live jitter for this demo cycle.",
      platform: "Classification, payload hash, match confidence, and reporting consequences are recalculated from the adjusted reading.",
      tone: "neutral",
      timestamp: new Date()
    });
  }

  function resetProofLab() {
    setManualOverrides(null);
    setCycleToken((value) => value + 1);
    setLatestAction({
      title: "Proof lab reset",
      device: `The verifier returned to the ${scenario.sample} preset readings.`,
      platform: "The proof story is synchronized back to the scenario model.",
      tone: "neutral",
      timestamp: new Date()
    });
  }

  function pushOperatorEvent(mode: OperatorMode, title: string, detail: string) {
    const event: OperatorEvent = {
      id: `${mode}-${Date.now()}`,
      title,
      detail,
      mode,
      timestamp: new Date()
    };
    setOperatorMode(mode);
    setOperatorEvents((current) => [event, ...current].slice(0, 5));
    setLatestAction({
      title,
      device: operatorModeCopy[mode].plain,
      platform: detail,
      tone: mode === "quarantined" ? "anomaly" : mode === "acknowledged" || mode === "maintenance" ? "warning" : "neutral",
      timestamp: event.timestamp
    });
  }

  function startTutorial() {
    const completed = window.localStorage.getItem(TUTORIAL_STORAGE_KEYS.completed) === "true";
    window.localStorage.removeItem(TUTORIAL_STORAGE_KEYS.dismissedAt);
    if (completed) {
      window.localStorage.removeItem(TUTORIAL_STORAGE_KEYS.completed);
      window.localStorage.removeItem(TUTORIAL_STORAGE_KEYS.lastStepId);
      setTutorialCompleted(false);
      setTutorialStepIndex(0);
    } else {
      setTutorialStepIndex(clampTutorialStepIndex(readTutorialStepIndex()));
    }
    setTutorialOpen(true);
  }

  function skipTutorial() {
    window.localStorage.setItem(TUTORIAL_STORAGE_KEYS.lastStepId, activeTutorialStep.id);
    window.localStorage.setItem(TUTORIAL_STORAGE_KEYS.dismissedAt, new Date().toISOString());
    setTutorialOpen(false);
  }

  function finishTutorial() {
    window.localStorage.setItem(TUTORIAL_STORAGE_KEYS.completed, "true");
    window.localStorage.removeItem(TUTORIAL_STORAGE_KEYS.dismissedAt);
    window.localStorage.removeItem(TUTORIAL_STORAGE_KEYS.lastStepId);
    setTutorialCompleted(true);
    setTutorialOpen(false);
    setTutorialStepIndex(0);
  }

  function nextTutorialStep() {
    setTutorialStepIndex((index) => clampTutorialStepIndex(index + 1));
  }

  function previousTutorialStep() {
    setTutorialStepIndex((index) => clampTutorialStepIndex(index - 1));
  }

  return (
    <main className="app-shell">
      <aside className="command-rail" aria-label="Eco-Cipher demo navigation">
        <div className="brand-block">
          <div className="brand-mark">
            <EcoCipherLogo />
          </div>
          <div>
            <strong>Eco-Cipher</strong>
            <span>industrial proof simulator</span>
          </div>
        </div>

        <div className="rail-story">
          <span>Demo mode</span>
          <strong>{guidedMode ? "Guided cinematic flow" : "Manual diagnostic review"}</strong>
          <small>{scenario.sample} · {scenario.name}</small>
        </div>

        <nav className="rail-nav">
          {navSections.map((section) => (
            <div className="nav-section" key={section.label}>
              <div className="nav-section-label">{section.label}</div>
              {section.items.map((item) => (
                <button
                  className={`${activeView === item.key ? "nav-item active" : "nav-item"} ${switchingViewKey === item.key ? "switching" : ""}`}
                  key={item.key}
                  onClick={() => openView(item.key)}
                  aria-current={activeView === item.key ? "page" : undefined}
                  data-tour-id={`nav-${item.key}`}
                >
                  <div className="nav-icon"><NavGlyph active={activeView === item.key} /></div>
                  <div className="nav-copy">
                    <span>{item.label}</span>
                    <small>{item.plain}</small>
                  </div>
                  <div className="nav-state">
                    {switchingViewKey === item.key ? <small className="nav-feedback">Opening</small> : null}
                    {activeView === item.key && switchingViewKey !== item.key ? <small className="nav-feedback current">Here</small> : null}
                    {item.badge && <span className="nav-badge">{item.badge}</span>}
                  </div>
                </button>
              ))}
            </div>
          ))}
        </nav>

        <div className="rail-node">
          <span>Factory Node</span>
          <strong>#021 Karawang</strong>
          <small>{proofStateLabel}</small>
          <button className="tour-launch" onClick={startTutorial} data-tour-id="tour-launch">
            {tutorialCompleted ? "Restart tour" : "Resume tour"}
          </button>
        </div>
      </aside>

      <section className="workspace">
        <header className="topbar" data-tour-id={activeView === "overview" ? "overview-story-header" : undefined}>
          <div>
            <p className="eyeline">{currentViewMeta.eyebrow} · Eco-Cipher Node: {DEVICE_ID}</p>
            <h1>{currentViewMeta.title}</h1>
            <p className="topbar-plain">{currentViewMeta.plain}</p>
            <div className="page-signal-row" aria-label="active page signals">
              <span>{currentViewMeta.primarySignal}</span>
              <span>{scenario.sample} · {scenario.name}</span>
              <span>{guidedMode ? "Guided proof flow" : "Manual stage review"}</span>
            </div>
          </div>
          <div className="topbar-stack">
            <div className={`status-chip ${statusClass}`}>{payload.edge_status}</div>
            <div className="clock-readout">
              {clock.toLocaleTimeString("en-GB", {
                hour: "2-digit",
                minute: "2-digit",
                second: "2-digit",
                timeZone: "UTC"
              })}{" "}
              UTC
            </div>
          </div>
        </header>

        <ViewChangeNotice feedback={viewFeedback} switching={switchingViewKey !== null} />

        <GlobalStatusStrip
          payload={payload}
          scenario={scenario}
          currentStep={currentStep}
          activeStepIndex={activeStepIndex}
          proofStateLabel={proofStateLabel}
          latestAction={latestAction}
          guidedMode={guidedMode}
          operatorMode={operatorMode}
          tourId={activeView === "overview" ? "overview-status-strip" : undefined}
        />

        {activeView === "overview" && <OverviewView />}
        {activeView === "zkgrid" && <ZkGridView onAction={setLatestAction} />}
        {activeView === "exchange" && <ExchangeView onAction={setLatestAction} />}
        {activeView === "hardware" && (
          <Suspense
            fallback={
              <section className="hardware-view">
                <div className="hardware-scene-fallback hardware-scene-fallback--inline">
                  <strong>Loading hardware simulation…</strong>
                  <p>Preparing the real CAD mesh and scene overlays.</p>
                </div>
              </section>
            }
          >
            <HardwareSimulationView
              scenarioKey={scenarioKey}
              payload={payload}
              activeStepIndex={activeStepIndex}
            />
          </Suspense>
        )}

        {activeView === "edge-ai" && (
          <EdgeVerifyView
            payload={payload}
            scenario={scenario}
            currentStep={currentStep}
            activeStepIndex={activeStepIndex}
            guidedMode={guidedMode}
            proofStateLabel={proofStateLabel}
            activePresetKey={activePresetKey}
            operatorMode={operatorMode}
            operatorEvents={operatorEvents}
            manualOverrides={manualOverrides}
            latestAction={latestAction}
            selectedCandidate={selectedCandidate}
            onModeChange={changeGuidedMode}
            onReplay={() => restartCycle()}
            onStepSelect={selectStep}
            onChooseScenario={chooseScenario}
            onApplyPreset={applyPreset}
            onSensorChange={updateSensorOverride}
            onResetProofLab={resetProofLab}
            onOperatorEvent={pushOperatorEvent}
          />
        )}

        {activeView === "proofs" && (
          <section className="view-grid">
            <Panel title="Current Proof Ledger Entry" action={proofStateLabel} className="wide-panel" tourId="evidence-current-proof">
              <CurrentProofCard payload={payload} activeStepIndex={activeStepIndex} proofStateLabel={proofStateLabel} />
            </Panel>
            <Panel title="Tamper Evidence" action="current payload" className="wide-panel payload-panel" tourId="evidence-payload">
              <pre>{JSON.stringify(payload, null, 2)}</pre>
            </Panel>
            <Panel title="Device Commitment">
              <CommitPanel payload={payload} activeStepIndex={activeStepIndex} />
            </Panel>
            <Panel title="Evidence Summary">
              <SummaryStack
                rows={[
                  ["Device", DEVICE_ID],
                  ["Scenario", `${scenario.sample} · ${scenario.name}`],
                  ["Hash", activeStepIndex >= stepIndexFromKey("hash") ? payload.payload_hash.slice(0, 18) : "pending"],
                  ["Proof state", proofStateLabel]
                ]}
              />
            </Panel>
          </section>
        )}

        {activeView === "matchmaker" && (
          <section className="view-grid">
            <Panel title="Receiver Recommendation" action={payload.edge_status === "ANOMALY" ? "quarantined" : "live ranking"} className="wide-panel">
              <MatchHero payload={payload} candidate={selectedCandidate} volume={volume} activeStepIndex={activeStepIndex} />
            </Panel>
            <Panel title="All Match Candidates" action={sortByImpact ? "sorted by impact" : "sorted by score"} className="wide-panel" tourId="matchmaker-candidates">
              <div className="table-actions" data-tour-id="matchmaker-sort">
                <button
                  className="utility-button"
                  onClick={() => {
                    setSortByImpact((value) => !value);
                    setLatestAction({
                      title: sortByImpact ? "Candidate table sorted by score" : "Candidate table sorted by impact",
                      device: "The verified payload remains the same.",
                      platform: sortByImpact ? "Receiver ranking prioritizes AI compatibility again." : "Receiver ranking prioritizes carbon reduction impact.",
                      tone: "neutral",
                      timestamp: new Date()
                    });
                  }}
                >
                  {sortByImpact ? "Sort by score" : "Sort by impact"}
                </button>
              </div>
              <CandidateTable
                candidates={sortedCandidates}
                selectedCandidateId={selectedCandidateId}
                onSelect={selectCandidate}
                disabled={automationBlocked || (payload.edge_status === "ANOMALY" && activeStepIndex >= stepIndexFromKey("match"))}
              />
            </Panel>
            <Panel title="Decision Summary" action={outcomeTitle}>
              <SummaryStack
                rows={[
                  ["AI confidence", `${matchConfidence}%`],
                  ["Carbon context", `${carbonPct}%`],
                  ["Distance", selectedCandidate.distance],
                  ["Annual impact", `${selectedCandidate.impact.toFixed(1)} tCO2e/yr`]
                ]}
              />
            </Panel>
          </section>
        )}

        {activeView === "reports" && (
          <section className="reports-briefing">
            <ReportReadinessPanel
              payload={payload}
              activeStepIndex={activeStepIndex}
              candidate={selectedCandidate}
              scenario={scenario}
              operatorMode={operatorMode}
              proofStateLabel={proofStateLabel}
              reportTitle={reportTitle}
            />

            <ReportMetricStrip
              payload={payload}
              qualityPct={qualityPct}
              carbonPct={carbonPct}
              matchConfidence={matchConfidence}
            />

            <ReportEvidenceChain
              payload={payload}
              activeStepIndex={activeStepIndex}
              currentStep={currentStep}
              candidate={selectedCandidate}
            />

            <ReportBlockers
              payload={payload}
              activeStepIndex={activeStepIndex}
              operatorMode={operatorMode}
            />

            <Panel title="CBAM / MRV Fields" action="current cycle" className="report-fields-panel">
              <SummaryStack
                rows={[
                  ["Current step", currentStep.label],
                  ["Scenario", `${scenario.sample} · ${scenario.name}`],
                  ["Quality score", `${qualityPct}%`],
                  ["Carbon context", `${carbonPct}%`],
                  ["Receiver intent", payload.edge_status === "ANOMALY" ? "held" : selectedCandidate.factory],
                  ["Report state", reportTitle]
                ]}
              />
            </Panel>

            <Panel title="Filed Reports" action="audit trail" className="report-table-panel">
              <ReportTable />
            </Panel>
          </section>
        )}
      </section>

      <TutorialOverlay
        open={tutorialOpen}
        step={activeTutorialStep}
        stepIndex={safeTutorialStepIndex}
        totalSteps={tutorialSteps.length}
        onBack={previousTutorialStep}
        onNext={nextTutorialStep}
        onSkip={skipTutorial}
        onFinish={finishTutorial}
      />
    </main>
  );
}

function Panel({
  title,
  action,
  className = "",
  tourId,
  children
}: {
  title: string;
  action?: string;
  className?: string;
  tourId?: string;
  children: React.ReactNode;
}) {
  return (
    <section className={`panel ${className}`} data-tour-id={tourId}>
      <div className="panel-head">
        <h2>{title}</h2>
        {action ? <span>{action}</span> : null}
      </div>
      {children}
    </section>
  );
}

function DevicePanel({
  payload,
  scenario,
  currentStep,
  activeStepIndex,
  guidedMode
}: {
  payload: Payload;
  scenario: Scenario;
  currentStep: SimulationStep;
  activeStepIndex: number;
  guidedMode: boolean;
}) {
  const statusClass = payload.edge_status.toLowerCase();
  const chamberFill = clamp(Math.round((payload.turbidity_raw / 1023) * 100), 16, 92);
  const gasHeight = clamp(Math.round(payload.gas_risk_score * 100), 10, 98);
  const energyHeight = clamp(Math.round((payload.energy_power_w / 1000) * 100), 12, 98);
  const flowActive = activeStepIndex >= stepIndexFromKey("sense");
  const sampleCue = scenarioReadingCue(scenario.key);

  return (
    <section className={`device-stage ${statusClass}`} aria-label="Eco-Cipher Edge Verifier simulation">
      <div className={`scan-wash ${statusClass}`} />
      <div className="device-backdrop" />

      <div className="sample-chamber">
        <div className={`chamber-liquid ${statusClass}`} style={{ height: `${chamberFill}%` }} />
        <div className="chamber-ruler" />
        <div className={`flow-stream ${flowActive ? "active" : ""}`} />
      </div>

      <div className="device-render">
        <div className="lid-screw screw-a" />
        <div className="lid-screw screw-b" />
        <div className="lid-screw screw-c" />
        <div className="lid-screw screw-d" />
        <div className="device-title">ECO-CIPHER EDGE VERIFIER</div>

        <div className="oled">
          <span>{guidedMode ? "Guided mode" : "Manual mode"} · {currentStep.label}</span>
          <strong>{stageCopy(currentStep.key, payload)}</strong>
          <small>{stepNarrative(currentStep.key, payload)}</small>
        </div>

        <div className="sensor-bars" aria-label="Live sensor activity">
          <SensorBar label="pH" value={Math.round((payload.ph / 14) * 100)} tone={statusTone(payload.edge_status)} />
          <SensorBar label="Turb" value={Math.round((payload.turbidity_raw / 1023) * 100)} tone={statusTone(payload.edge_status)} />
          <SensorBar label="Gas" value={gasHeight} tone={payload.gas_risk_score > 0.55 ? "warning" : "neutral"} />
          <SensorBar label="Pwr" value={energyHeight} tone={payload.energy_power_w > 600 ? "verified" : "neutral"} />
        </div>

        <div className="led-row">
          <span className={payload.edge_status === "VERIFIED" ? "active green led" : "green led"} />
          <span className={payload.edge_status === "WARNING" ? "active yellow led" : "yellow led"} />
          <span className={payload.edge_status === "ANOMALY" ? "active red led" : "red led"} />
        </div>

        <div className="port-stack">
          {["PWR", "PH", "TURB", "FLOW", "TEMP", "GAS", "ENERGY"].map((port) => <span key={port}>{port}</span>)}
        </div>

        <div className="id-plate">ID: {DEVICE_ID}</div>
      </div>

      <div className="device-sidecard">
        <div>
          <span>Current sample</span>
          <strong>{scenario.sample}: {scenario.composition}</strong>
          <small>{scenario.narrative}</small>
        </div>
        <div className="sample-proof-row" aria-label="sample proof effect">
          <div>
            <span>What changes</span>
            <b>{sampleCue}</b>
          </div>
          <div>
            <span>Proof outcome</span>
            <b>{scenario.expected}</b>
          </div>
        </div>
      </div>
    </section>
  );
}

function scenarioReadingCue(key: ScenarioKey) {
  switch (key) {
    case "clear":
      return "pH, flow, and gas stay inside the safe baseline.";
    case "organic":
      return "Turbidity rises, but the stream is still readable.";
    case "anomaly":
      return "pH, flow, heat, and gas break the normal proof band.";
    case "emission":
      return "Gas risk becomes the dominant warning signal.";
    case "energy":
      return "Energy draw becomes the trust signal to watch.";
  }
}

function SensorBar({ label, value, tone }: { label: string; value: number; tone: SimulationTone }) {
  return (
    <div className={`sensor-bar ${tone}`}>
      <small>{label}</small>
      <div className="sensor-bar-track">
        <div className="sensor-bar-fill" style={{ height: `${clamp(value, 4, 100)}%` }} />
      </div>
    </div>
  );
}

function MissionControl({
  guidedMode,
  activeStepIndex,
  onModeChange,
  onReplay,
  onStepSelect,
  className = ""
}: {
  guidedMode: boolean;
  activeStepIndex: number;
  onModeChange: (value: boolean) => void;
  onReplay: () => void;
  onStepSelect: (step: SimulationStepKey) => void;
  className?: string;
}) {
  return (
    <section className={`mission-control ${className}`} data-tour-id="edge-mission-control">
      <div className="mission-head">
        <div>
          <span>Mission control</span>
          <strong>{guidedMode ? "Guided flow active" : "Manual review active"}</strong>
          <p>
            {guidedMode
              ? "Auto-advance the proof story from sensor reading to report."
              : "Select a stage to inspect the device and platform response."}
          </p>
        </div>
        <button className="utility-button" onClick={onReplay}>Replay</button>
      </div>

      <div className="mode-switch" role="tablist" aria-label="simulation mode">
        <button className={guidedMode ? "mode-pill active" : "mode-pill"} onClick={() => onModeChange(true)}>
          <span>Guided</span>
          <small>Auto story</small>
        </button>
        <button className={!guidedMode ? "mode-pill active" : "mode-pill"} onClick={() => onModeChange(false)}>
          <span>Manual</span>
          <small>Step control</small>
        </button>
      </div>

      <div className="step-chip-row">
        {simulationSteps.map((step, index) => (
          <button
            key={step.key}
            className={index === activeStepIndex ? "step-chip active" : "step-chip"}
            onClick={() => onStepSelect(step.key)}
            disabled={guidedMode}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{step.label}</strong>
            <small>{guidedMode ? "Auto" : "Select"}</small>
          </button>
        ))}
      </div>
    </section>
  );
}

function ActionConsequencePanel({ action, className = "" }: { action: SimulationAction; className?: string }) {
  return (
    <section
      className={["action-console", action.tone, className].filter(Boolean).join(" ")}
      aria-live="polite"
    >
      <div className="panel-head compact">
        <h2>Action Result</h2>
        <span>{action.timestamp.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</span>
      </div>
      <div className="action-console__body">
        <strong>{action.title}</strong>
        <div className="action-path">
          <div>
            <span>Device reaction</span>
            <p>{action.device}</p>
          </div>
          <div>
            <span>Platform result</span>
            <p>{action.platform}</p>
          </div>
        </div>
      </div>
    </section>
  );
}

function ScenarioList({ scenarioKey, onChoose, className = "" }: { scenarioKey: ScenarioKey; onChoose: (key: ScenarioKey) => void; className?: string }) {
  return (
    <section className={`scenario-panel ${className}`} data-tour-id="edge-scenario-list">
      <div className="panel-head compact">
        <h2>Sample Scenarios</h2>
        <span>resets proof</span>
      </div>
      <p className="scenario-help">Select a sample to reseed the device and recalculate proof consequences.</p>
      <div className="scenario-list">
        {scenarios.map((item) => (
          <button
            className={item.key === scenarioKey ? "scenario selected" : "scenario"}
            key={item.key}
            onClick={() => onChoose(item.key)}
            aria-pressed={item.key === scenarioKey}
          >
            <span>{item.sample} · {item.expected}</span>
            <strong>{item.name}</strong>
            <small>{item.composition}</small>
            <div className="scenario-reading">
              <b>Reading shift</b>
              <p>{scenarioReadingCue(item.key)}</p>
            </div>
            <em>{item.downstream}</em>
          </button>
        ))}
      </div>
    </section>
  );
}

function NarrativePanel({
  scenario,
  currentStep,
  activeStepIndex,
  payload,
  proofStateLabel,
  className = ""
}: {
  scenario: Scenario;
  currentStep: SimulationStep;
  activeStepIndex: number;
  payload: Payload;
  proofStateLabel: string;
  className?: string;
}) {
  const tone = statusTone(payload.edge_status);
  const nextStep = simulationSteps[Math.min(activeStepIndex + 1, simulationSteps.length - 1)];
  const atFinalStep = activeStepIndex >= simulationSteps.length - 1;
  const qualityPct = Math.round(payload.data_quality_score * 100);
  const carbonPct = Math.round(payload.carbon_context_score * 100);
  const gasPct = Math.round(payload.gas_risk_score * 100);

  return (
    <section className={`narrative-card stage-widget ${tone} ${className}`}>
      <div className="stage-widget__header">
        <div>
          <span>Current stage</span>
          <strong>{String(activeStepIndex + 1).padStart(2, "0")} · {currentStep.label}</strong>
        </div>
        <b>{payload.edge_status}</b>
      </div>

      <div className="stage-widget__body">
        <h2>{stageCopy(currentStep.key, payload)}</h2>
        <p>{currentStep.detail}</p>
        <p>{stepNarrative(currentStep.key, payload)}</p>
      </div>

      <div className="stage-rail" aria-label="current proof stage progress">
        {simulationSteps.map((step, index) => (
          <div
            key={step.key}
            className={index === activeStepIndex ? "stage-rail__item active" : index < activeStepIndex ? "stage-rail__item complete" : "stage-rail__item"}
          >
            <span>{index + 1}</span>
            <small>{step.label}</small>
          </div>
        ))}
      </div>

      <div className="stage-widget__metrics">
        <div>
          <span>Proof</span>
          <strong>{proofStateLabel}</strong>
        </div>
        <div>
          <span>Quality</span>
          <strong>{qualityPct}%</strong>
        </div>
        <div>
          <span>Carbon</span>
          <strong>{carbonPct}%</strong>
        </div>
        <div>
          <span>Gas</span>
          <strong>{gasPct}%</strong>
        </div>
      </div>

      <div className="stage-widget__footer">
        <div>
          <span>AI class</span>
          <strong>{payload.ai_waste_class}</strong>
        </div>
        <div>
          <span>{atFinalStep ? "Outcome" : "Next"}</span>
          <strong>{atFinalStep ? scenario.downstream : nextStep.label}</strong>
        </div>
      </div>
    </section>
  );
}

function GuidedCommandCenter({
  activePresetKey,
  activeStepIndex,
  guidedMode,
  operatorMode,
  payload,
  onApplyPreset,
  onReplay,
  onStepSelect,
  onModeChange
}: {
  activePresetKey: DemoPreset["key"];
  activeStepIndex: number;
  guidedMode: boolean;
  operatorMode: OperatorMode;
  payload: Payload;
  onApplyPreset: (preset: DemoPreset) => void;
  onReplay: () => void;
  onStepSelect: (step: SimulationStepKey) => void;
  onModeChange: (value: boolean) => void;
}) {
  return (
    <section className="command-center-panel span-2" data-tour-id="edge-demo-director">
      <div className="panel-head compact">
        <h2>Demo Director</h2>
        <span>{guidedMode ? "auto narrative" : "manual scrub"}</span>
      </div>
      <div className="preset-row">
        {demoPresets.map((preset) => (
          <button
            key={preset.key}
            className={preset.key === activePresetKey ? "preset-card active" : "preset-card"}
            onClick={() => onApplyPreset(preset)}
          >
            <span>{preset.audience}</span>
            <strong>{preset.label}</strong>
            <small>{preset.scenarioKey} · step {preset.stepIndex + 1}</small>
          </button>
        ))}
      </div>
      <div className="director-controls">
        <button className="utility-button utility-button--primary" onClick={onReplay}>Replay</button>
        <button className="utility-button" onClick={() => onModeChange(!guidedMode)}>
          {guidedMode ? "Unlock" : "Guide"}
        </button>
        <div className={`director-state ${operatorMode}`}>
          <span>{operatorModeCopy[operatorMode].label}</span>
          <strong>{payload.edge_status}</strong>
        </div>
      </div>
      <div className="stage-scrubber" aria-label="presentation stage scrubber">
        {simulationSteps.map((step, index) => (
          <button
            key={step.key}
            className={index === activeStepIndex ? "scrub-step active" : index < activeStepIndex ? "scrub-step complete" : "scrub-step"}
            onClick={() => onStepSelect(step.key)}
            disabled={guidedMode}
          >
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{step.label}</strong>
          </button>
        ))}
      </div>
    </section>
  );
}

function ProofLabPanel({
  payload,
  scenario,
  overrides,
  onChange,
  onReset
}: {
  payload: Payload;
  scenario: Scenario;
  overrides: ManualSensorOverrides | null;
  onChange: (key: keyof ManualSensorOverrides, value: number) => void;
  onReset: () => void;
}) {
  const values = overrides ?? scenario.base;
  const thresholdRows = [
    ["pH band", payload.ph < 5.5 || payload.ph > 9.5 ? "breach" : payload.ph < 6.5 || payload.ph > 8.5 ? "caution" : "clean"],
    ["Turbidity", payload.turbidity_raw >= 900 ? "breach" : payload.turbidity_raw >= 650 ? "caution" : "clean"],
    ["Flow", payload.flow_rate_lpm <= 0.05 ? "breach" : payload.flow_rate_lpm < 0.2 ? "caution" : "clean"],
    ["Gas", payload.gas_raw >= 780 ? "breach" : payload.gas_raw >= 550 ? "caution" : "clean"],
  ];

  return (
    <section className="proof-lab-panel span-1" data-tour-id="edge-proof-lab">
      <div className="panel-head compact">
        <h2>Proof Lab</h2>
        <span>{overrides ? "manual inputs" : "scenario inputs"}</span>
      </div>
      <div className="slider-stack">
        <SensorSlider label="pH" value={values.ph} min={0} max={14} step={0.01} onChange={(value) => onChange("ph", value)} />
        <SensorSlider label="Turbidity" value={values.turbidity_raw} min={0} max={1023} step={1} onChange={(value) => onChange("turbidity_raw", value)} />
        <SensorSlider label="Flow" value={values.flow_rate_lpm} min={0} max={8} step={0.01} onChange={(value) => onChange("flow_rate_lpm", value)} />
        <SensorSlider label="Temp" value={values.temperature_c} min={0} max={90} step={0.1} onChange={(value) => onChange("temperature_c", value)} />
        <SensorSlider label="Gas" value={values.gas_raw} min={0} max={1023} step={1} onChange={(value) => onChange("gas_raw", value)} />
        <SensorSlider label="Current" value={values.energy_current_a} min={0} max={12} step={0.01} onChange={(value) => onChange("energy_current_a", value)} />
      </div>
      <div className="threshold-grid">
        {thresholdRows.map(([label, state]) => (
          <div className={`threshold-pill ${state}`} key={label}>
            <span>{label}</span>
            <strong>{state}</strong>
          </div>
        ))}
      </div>
      <div className="payload-diff">
        <span>Proof output</span>
        <code>{payload.payload_hash.slice(0, 24)}...</code>
        <small>{payload.ai_waste_class} · {Math.round(payload.ai_match_confidence * 100)}% match confidence</small>
      </div>
      <button className="utility-button" onClick={onReset}>Reset</button>
    </section>
  );
}

function SensorSlider({
  label,
  value,
  min,
  max,
  step,
  onChange
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (value: number) => void;
}) {
  return (
    <label className="sensor-slider">
      <span>{label}</span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
      />
      <strong>{Number.isInteger(value) ? value : value.toFixed(2)}</strong>
    </label>
  );
}

function OperatorConsole({
  mode,
  events,
  payload,
  onEvent
}: {
  mode: OperatorMode;
  events: OperatorEvent[];
  payload: Payload;
  onEvent: (mode: OperatorMode, title: string, detail: string) => void;
}) {
  const suggestedMode: OperatorMode =
    payload.edge_status === "ANOMALY" ? "quarantined" : payload.edge_status === "WARNING" ? "acknowledged" : "normal";

  return (
    <section className={`operator-console ${mode} span-1`} data-tour-id="edge-operator-console">
      <div className="panel-head compact">
        <h2>Operator Console</h2>
        <span>{operatorModeCopy[mode].label}</span>
      </div>
      <div className="operator-status">
        <span>Suggested action</span>
        <strong>{operatorModeCopy[suggestedMode].label}</strong>
        <p>{operatorModeCopy[suggestedMode].plain}</p>
      </div>
      <div className="operator-actions">
        <button className="utility-button" onClick={() => onEvent("acknowledged", "Warning acknowledged", "Automation remains available with a caution note.")}>Acknowledge</button>
        <button className="utility-button" onClick={() => onEvent("quarantined", "Proof quarantined", "Matching, exchange, and automatic reporting are blocked for review.")}>Quarantine</button>
        <button className="utility-button" onClick={() => onEvent("maintenance", "Maintenance enabled", "The device is treated as service hardware until the next reset.")}>Service</button>
      </div>
      <div className="operator-log">
        {(events.length ? events : [{
          id: "empty",
          title: "No operator actions yet",
          detail: "Use an action above to show the human review path.",
          mode: "normal" as OperatorMode,
          timestamp: new Date()
        }]).map((event) => (
          <div className={`operator-event ${event.mode}`} key={event.id}>
            <strong>{event.title}</strong>
            <small>{event.detail}</small>
            <time>{event.timestamp.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}</time>
          </div>
        ))}
      </div>
    </section>
  );
}

function MetricGrid({ payload }: { payload: Payload }) {
  return (
    <div className="metric-grid">
      <Metric label="pH" value={payload.ph.toFixed(2)} />
      <Metric label="Turbidity" value={payload.turbidity_raw.toString()} />
      <Metric label="Flow" value={`${payload.flow_rate_lpm.toFixed(2)} L/min`} />
      <Metric label="Temp" value={`${payload.temperature_c.toFixed(1)} C`} />
      <Metric label="Gas" value={payload.gas_raw.toString()} />
      <Metric label="Power" value={`${payload.energy_power_w.toFixed(1)} W`} />
      <Metric label="Volume" value={`${payload.estimated_volume_l.toFixed(1)} L`} />
      <Metric label="Quality" value={`${Math.round(payload.data_quality_score * 100)}%`} />
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function FlowPanel({
  payload,
  activeStepIndex,
  onStepSelect,
  guidedMode
}: {
  payload: Payload;
  activeStepIndex: number;
  onStepSelect: (step: SimulationStepKey) => void;
  guidedMode: boolean;
}) {
  return (
    <div className="flow-panel">
      <div className="flow-track">
        {simulationSteps.map((step, index) => (
          <button
            key={step.key}
            className={`flow-step ${stepVisualState(index, activeStepIndex, payload)}`}
            onClick={() => onStepSelect(step.key)}
            disabled={guidedMode}
          >
            <span>{index + 1}</span>
            <strong>{step.label}</strong>
            <small>{stepNarrative(step.key, payload)}</small>
          </button>
        ))}
      </div>

      <div className="status-table">
        <Row label="OLED" value={payload.edge_status === "ANOMALY" ? "Manual review banner" : stageCopy(simulationSteps[activeStepIndex].key, payload)} />
        <Row label="LED state" value={payload.edge_status === "VERIFIED" ? "Green steady" : payload.edge_status === "WARNING" ? "Yellow pulse" : "Red alarm"} />
        <Row label="Buzzer" value={payload.edge_status === "ANOMALY" ? "Repeated alert" : payload.edge_status === "WARNING" ? "Short caution tone" : "Off"} />
        <Row label="Proof route" value={payload.edge_status === "ANOMALY" ? "Quarantine queue" : payload.edge_status === "WARNING" ? "Caution accepted" : "Automatic accept"} />
        <Row label="Carbon context" value={`${Math.round(payload.carbon_context_score * 100)}%`} />
      </div>
    </div>
  );
}

function OutcomeCard({
  payload,
  candidate,
  activeStepIndex
}: {
  payload: Payload;
  candidate: Candidate;
  activeStepIndex: number;
}) {
  const readyForMatch = activeStepIndex >= stepIndexFromKey("match");

  return (
    <div className={`outcome-card ${payload.edge_status.toLowerCase()}`}>
      <span>Platform consequence</span>
      <strong>
        {!readyForMatch
          ? "Receiver ranking waiting for proof"
          : payload.edge_status === "ANOMALY"
            ? "Receiver ranking halted"
            : `${candidate.factory} remains the strongest receiver`}
      </strong>
      <p>
        {payload.edge_status === "ANOMALY"
          ? "The platform preserves the edge evidence, but settlement cannot proceed without review."
          : payload.edge_status === "WARNING"
            ? "The receiver remains viable, but the exchange carries a caution note tied to proof quality."
            : "Proof is strong enough to support an automated receiver recommendation and reporting update."}
      </p>
      <div className="confidence">
        <span>Match confidence</span>
        <strong>{readyForMatch && payload.edge_status !== "ANOMALY" ? `${Math.round(payload.ai_match_confidence * 100)}%` : "held"}</strong>
      </div>
    </div>
  );
}

function CommitPanel({ payload, activeStepIndex }: { payload: Payload; activeStepIndex: number }) {
  const hashReady = activeStepIndex >= stepIndexFromKey("hash");
  const uploadReady = activeStepIndex >= stepIndexFromKey("upload");

  return (
    <div className="commit-panel">
      <div className="hash-card">
        <span>payload hash</span>
        <strong>{hashReady ? payload.payload_hash : "pending-local-fingerprint"}</strong>
      </div>
      <SummaryStack
        rows={[
          ["Data quality", `${Math.round(payload.data_quality_score * 100)}%`],
          ["Upload state", !uploadReady ? "queued" : payload.edge_status === "ANOMALY" ? "flagged" : "accepted"],
          ["Carbon context", `${Math.round(payload.carbon_context_score * 100)}%`],
          ["Anomaly flag", payload.anomaly_flag ? "true" : "false"]
        ]}
      />
    </div>
  );
}

function WiringMap() {
  return (
    <div className="wiring-table">
      {wiringRows.map(([module, pin, type]) => (
        <div className="wiring-row" key={module}>
          <span>{module}</span>
          <strong>{pin}</strong>
          <small>{type}</small>
        </div>
      ))}
    </div>
  );
}

function CurrentProofCard({
  payload,
  activeStepIndex,
  proofStateLabel
}: {
  payload: Payload;
  activeStepIndex: number;
  proofStateLabel: string;
}) {
  return (
    <div className="current-proof-card">
      <div>
        <span>Current device commitment</span>
        <strong>{activeStepIndex >= stepIndexFromKey("hash") ? payload.payload_hash : "pending"}</strong>
      </div>
      <div className="proof-pill-row">
        <Pill label="State" value={proofStateLabel} tone={statusTone(payload.edge_status)} />
        <Pill label="Signal" value={payload.ai_waste_class} tone="neutral" />
        <Pill label="Flow" value={`${payload.flow_rate_lpm.toFixed(2)} L/min`} tone="neutral" />
      </div>
    </div>
  );
}

function Pill({ label, value, tone }: { label: string; value: string; tone: SimulationTone }) {
  return (
    <div className={`pill ${tone}`}>
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function ProofRows() {
  return (
    <div className="proof-rows">
      {proofs.map((proof) => (
        <div className="proof-row" key={proof.hash}>
          <span className={`state-dot ${proof.status === "valid" ? "verified" : "pending"}`} />
          <code>{proof.hash}</code>
          <strong>{proof.factory}</strong>
          <small>{proof.signal}</small>
          <b>{proof.status}</b>
          <time>{proof.time} ago</time>
        </div>
      ))}
    </div>
  );
}

function ActivityList() {
  return (
    <div className="activity-list">
      {activities.map((activity) => (
        <div className="activity-row" key={activity.title}>
          <span className={`state-dot ${activity.state}`} />
          <div>
            <strong>{activity.title}</strong>
            <small>{activity.detail}</small>
          </div>
          <time>{activity.time}</time>
        </div>
      ))}
    </div>
  );
}

function MatchHero({
  payload,
  candidate,
  volume,
  activeStepIndex
}: {
  payload: Payload;
  candidate: Candidate;
  volume: number;
  activeStepIndex: number;
}) {
  const matchLocked = activeStepIndex >= stepIndexFromKey("match");

  return (
    <div className="match-hero">
      <FactoryBlock label="Waste producer" id="Factory A #021" material={payload.ai_waste_class} volume={`${volume.toFixed(1)} L verified`} />
      <div className="exchange-glyph">{matchLocked && payload.edge_status !== "ANOMALY" ? "to" : "hold"}</div>
      <FactoryBlock
        label="Receiver"
        id={`${candidate.factory} #${candidate.id}`}
        material={payload.edge_status === "ANOMALY" ? "manual review required" : candidate.material}
        volume={payload.edge_status === "ANOMALY" ? "routing paused" : candidate.volume}
      />
    </div>
  );
}

function FactoryBlock({ label, id, material, volume }: { label: string; id: string; material: string; volume: string }) {
  return (
    <div className="factory-block">
      <span>{label}</span>
      <strong>{id}</strong>
      <small>{material}</small>
      <b>{volume}</b>
    </div>
  );
}

function CandidateTable({
  candidates,
  selectedCandidateId,
  onSelect,
  disabled
}: {
  candidates: Candidate[];
  selectedCandidateId: string;
  onSelect: (id: string) => void;
  disabled: boolean;
}) {
  return (
    <div className="candidate-table">
      {candidates.map((candidate, index) => (
        <button
          className={candidate.id === selectedCandidateId ? "candidate-row selected" : "candidate-row"}
          key={candidate.id}
          onClick={() => onSelect(candidate.id)}
          disabled={disabled}
        >
          <span>{String(index + 1).padStart(2, "0")}</span>
          <strong>{candidate.factory}</strong>
          <small>{candidate.material}</small>
          <b>{candidate.score}%</b>
          <em>{candidate.distance}</em>
          <i>{candidate.impact.toFixed(1)} tCO2e/yr</i>
        </button>
      ))}
    </div>
  );
}

function ReportReadinessPanel({
  payload,
  activeStepIndex,
  candidate,
  scenario,
  operatorMode,
  proofStateLabel,
  reportTitle
}: {
  payload: Payload;
  activeStepIndex: number;
  candidate: Candidate;
  scenario: Scenario;
  operatorMode: OperatorMode;
  proofStateLabel: string;
  reportTitle: string;
}) {
  const ready = activeStepIndex >= stepIndexFromKey("report") && payload.edge_status !== "ANOMALY" && operatorMode !== "quarantined" && operatorMode !== "maintenance";
  const tone = ready ? "verified" : payload.edge_status === "ANOMALY" || operatorMode === "quarantined" ? "anomaly" : "warning";

  return (
    <section className={`report-readiness ${tone}`} data-tour-id="reports-readiness">
      <div className="report-readiness__copy">
        <span className="metric-label dark">Compliance briefing</span>
        <h2>{ready ? "Report package is ready for filing." : "Report package needs review before filing."}</h2>
        <p>{reportTitle}</p>
      </div>
      <div className="report-readiness__facts">
        <div>
          <span>Proof state</span>
          <strong>{proofStateLabel}</strong>
        </div>
        <div>
          <span>Sample</span>
          <strong>{scenario.sample}</strong>
        </div>
        <div>
          <span>Receiver</span>
          <strong>{payload.edge_status === "ANOMALY" ? "Held" : candidate.factory}</strong>
        </div>
        <div>
          <span>Operator</span>
          <strong>{operatorModeCopy[operatorMode].label}</strong>
        </div>
      </div>
    </section>
  );
}

function ReportMetricStrip({
  payload,
  qualityPct,
  carbonPct,
  matchConfidence
}: {
  payload: Payload;
  qualityPct: number;
  carbonPct: number;
  matchConfidence: number;
}) {
  const metrics = [
    ["Quality", `${qualityPct}%`, "MRV data quality", qualityPct >= 80 ? "verified" : qualityPct >= 55 ? "warning" : "anomaly"],
    ["Carbon", `${carbonPct}%`, "Context confidence", carbonPct >= 70 ? "verified" : "neutral"],
    ["Match", payload.edge_status === "ANOMALY" ? "Held" : `${matchConfidence}%`, "Receiver confidence", payload.edge_status === "ANOMALY" ? "anomaly" : "verified"],
    ["Evidence", payload.payload_hash.slice(0, 10), "Current hash", "neutral"],
  ] as const;

  return (
    <div className="report-brief-metrics">
      {metrics.map(([label, value, note, tone]) => (
        <div className={`report-brief-metric ${tone}`} key={label}>
          <span>{label}</span>
          <strong>{value}</strong>
          <small>{note}</small>
        </div>
      ))}
    </div>
  );
}

function ReportEvidenceChain({
  payload,
  activeStepIndex,
  currentStep,
  candidate
}: {
  payload: Payload;
  activeStepIndex: number;
  currentStep: SimulationStep;
  candidate: Candidate;
}) {
  const evidenceSteps = [
    ["Sensor read", activeStepIndex >= stepIndexFromKey("sense"), currentStep.label],
    ["Edge decision", activeStepIndex >= stepIndexFromKey("validate"), payload.edge_status],
    ["Payload hash", activeStepIndex >= stepIndexFromKey("hash"), payload.payload_hash.slice(0, 12)],
    ["Receiver link", activeStepIndex >= stepIndexFromKey("match") && payload.edge_status !== "ANOMALY", payload.edge_status === "ANOMALY" ? "held" : candidate.factory],
    ["Report output", activeStepIndex >= stepIndexFromKey("report") && payload.edge_status !== "ANOMALY", payload.edge_status === "ANOMALY" ? "exception" : "ready"],
  ] as const;

  return (
    <section className="report-chain-panel" data-tour-id="reports-chain">
      <div className="panel-head compact">
        <h2>Evidence Chain</h2>
        <span>factory to filing</span>
      </div>
      <div className="report-chain">
        {evidenceSteps.map(([label, complete, value], index) => (
          <div className={complete ? "report-chain-step complete" : "report-chain-step"} key={label}>
            <span>{String(index + 1).padStart(2, "0")}</span>
            <strong>{label}</strong>
            <small>{value}</small>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReportBlockers({
  payload,
  activeStepIndex,
  operatorMode
}: {
  payload: Payload;
  activeStepIndex: number;
  operatorMode: OperatorMode;
}) {
  const blockers = [
    ...(activeStepIndex < stepIndexFromKey("report") ? ["Finish report stage"] : []),
    ...(payload.edge_status === "ANOMALY" ? ["Resolve anomaly review"] : []),
    ...(operatorMode === "quarantined" ? ["Clear operator quarantine"] : []),
    ...(operatorMode === "maintenance" ? ["Exit maintenance mode"] : []),
  ];
  const rows = blockers.length ? blockers : ["No filing blockers"];

  return (
    <section className={blockers.length ? "report-blockers warning" : "report-blockers verified"}>
      <div className="panel-head compact">
        <h2>{blockers.length ? "Open Blockers" : "Next Actions"}</h2>
        <span>{blockers.length ? `${blockers.length} active` : "ready"}</span>
      </div>
      <div className="report-action-list">
        {rows.map((item, index) => (
          <div className="report-action-item" key={item}>
            <span>{blockers.length ? String(index + 1).padStart(2, "0") : "OK"}</span>
            <strong>{item}</strong>
          </div>
        ))}
      </div>
    </section>
  );
}

function ReportingCard({
  payload,
  activeStepIndex,
  candidate
}: {
  payload: Payload;
  activeStepIndex: number;
  candidate: Candidate;
}) {
  const ready = activeStepIndex >= stepIndexFromKey("report");

  return (
    <div className="reporting-card">
      <span>Reporting consequence</span>
      <strong>
        {!ready
          ? "Report waiting for final stage"
          : payload.edge_status === "ANOMALY"
            ? "Evidence routed to exception reporting"
            : `Report linked to ${candidate.factory} settlement context`}
      </strong>
      <p>
        {payload.edge_status === "ANOMALY"
          ? "The current payload remains auditable, but it is isolated from automatic settlement and filed for manual review."
          : "The reporting layer receives hash, quality, carbon context, and receiver intent as one evidence trail."}
      </p>
    </div>
  );
}

function ReportTable() {
  return (
    <div className="report-table">
      <div className="report-row report-row--head">
        <strong>Period</strong>
        <span>Credits</span>
        <small>Transactions</small>
        <code>Evidence</code>
        <em>Chain</em>
        <b>Status</b>
      </div>
      {reports.map((report) => (
        <div className="report-row" key={report.period}>
          <strong>{report.period}</strong>
          <span>{report.credits}</span>
          <small>{report.transactions} transactions</small>
          <code>{report.hash}</code>
          <em>{report.chain}</em>
          <b>{report.status}</b>
        </div>
      ))}
    </div>
  );
}

function SummaryStack({ rows }: { rows: Array<[string, string]> }) {
  return (
    <div className="status-table">
      {rows.map(([label, value]) => (
        <Row key={label} label={label} value={value} />
      ))}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="row">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
