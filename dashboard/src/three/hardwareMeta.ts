import type {
  HardwareHotspot,
  HardwareHotspotId,
  HardwarePartCategory,
  HardwarePayload,
  HardwareStage,
  HardwareStageConfig,
  ScenarioKey,
} from "./hardwareTypes";

export const hardwareCategoryMeta: Record<HardwarePartCategory, { label: string; color: string; plain: string }> = {
  fluid: {
    label: "Sample path",
    color: "#22a8b8",
    plain: "Where wastewater enters and becomes measurable.",
  },
  sensor: {
    label: "Sensors",
    color: "#d9a42f",
    plain: "The inputs that turn physical waste into numbers.",
  },
  controller: {
    label: "Controller",
    color: "#2f8f69",
    plain: "The local computer that decides if the reading is trustworthy.",
  },
  power: {
    label: "Power",
    color: "#d66a2f",
    plain: "The electrical support that keeps the prototype running safely.",
  },
  indicator: {
    label: "User signals",
    color: "#8a6ee8",
    plain: "The lights and screen a non-technical operator can read.",
  },
  data: {
    label: "Proof data",
    color: "#1f6fd6",
    plain: "The path from local evidence to platform proof.",
  },
  enclosure: {
    label: "Protective body",
    color: "#59645e",
    plain: "The shell that separates wet, dry, and serviceable areas.",
  },
};

export const hardwareHotspots: HardwareHotspot[] = [
  {
    id: "oled",
    label: "OLED Display",
    friendlyName: "Operator screen",
    category: "indicator",
    position: [-16, -38, 4],
    detail: "The front OLED mirrors the current proof phase and shows local edge classification before upload.",
    whyItMatters: "This is the first place an operator sees whether the device is clean, cautious, or blocked.",
    stageKeys: ["overview", "validate"],
  },
  {
    id: "led_valid",
    label: "Valid LED",
    friendlyName: "Green accept light",
    category: "indicator",
    position: [22, -38, 4],
    detail: "Green indicator confirms the stream remains inside the clean verification band.",
    whyItMatters: "A non-technical user can treat this as the automatic proceed signal.",
    stageKeys: ["overview", "validate"],
  },
  {
    id: "led_warning",
    label: "Warning LED",
    friendlyName: "Amber caution light",
    category: "indicator",
    position: [33, -38, 4],
    detail: "Amber indicator signals caution: the stream stays readable, but downstream handling needs qualifiers.",
    whyItMatters: "The platform can continue, but the exchange and report must carry a caution note.",
    stageKeys: ["overview", "validate"],
  },
  {
    id: "led_anomaly",
    label: "Anomaly LED",
    friendlyName: "Red stop light",
    category: "indicator",
    position: [44, -38, 4],
    detail: "Red indicator marks a threshold breach and routes the proof path to manual review.",
    whyItMatters: "This prevents a bad or unsafe sample from being treated as a normal tradeable stream.",
    stageKeys: ["overview", "validate"],
  },
  {
    id: "port_power",
    label: "PWR Port",
    friendlyName: "Power input",
    category: "power",
    position: [61, -18, 1],
    detail: "Primary power entry for the enclosure and local regulation stack.",
    whyItMatters: "Stable power keeps the sensor story credible; missing power can create false data.",
    stageKeys: ["ports", "sense"],
  },
  {
    id: "port_ph",
    label: "pH Port",
    friendlyName: "Acidity sensor input",
    category: "sensor",
    position: [61, -8, 1],
    detail: "Analog pH input enters here before local threshold validation on the controller.",
    whyItMatters: "pH is the clearest first warning for chemical anomaly in the demo.",
    stageKeys: ["ports", "sense"],
  },
  {
    id: "port_turb",
    label: "Turbidity Port",
    friendlyName: "Cloudiness sensor input",
    category: "sensor",
    position: [61, 2, 1],
    detail: "Optical turbidity channel provides the strongest organic-load signal in the current demo set.",
    whyItMatters: "It helps distinguish clean water from organic/turbid wastewater.",
    stageKeys: ["ports", "sense"],
  },
  {
    id: "port_flow",
    label: "Flow Port",
    friendlyName: "Flow sensor input",
    category: "sensor",
    position: [61, 12, 1],
    detail: "Pulse flow sensor determines whether the sample is active, paused, or inconsistent with the proof story.",
    whyItMatters: "A zero-flow reading can invalidate the story even if other sensors look normal.",
    stageKeys: ["ports", "sense"],
  },
  {
    id: "port_temp",
    label: "Temperature Port",
    friendlyName: "Temperature sensor input",
    category: "sensor",
    position: [61, 22, 1],
    detail: "Temperature is a secondary trust signal and an important anomaly gate for live industrial discharge.",
    whyItMatters: "High temperature can signal unsafe or abnormal industrial discharge.",
    stageKeys: ["ports", "sense"],
  },
  {
    id: "sample_chamber",
    label: "Sample Chamber",
    friendlyName: "Visible wastewater tube",
    category: "fluid",
    position: [-8, 0, -8],
    detail: "The simulated chamber represents the live fluid path where sensing begins before any proof is generated.",
    whyItMatters: "This makes the invisible sensor readings understandable by showing the sample color and level.",
    stageKeys: ["overview", "sense", "explode"],
  },
  {
    id: "esp32",
    label: "ESP32 Control Zone",
    friendlyName: "Local decision computer",
    category: "controller",
    position: [0, 6, 7],
    detail: "The local controller classifies the stream, computes the payload fingerprint, and locks the evidence state.",
    whyItMatters: "It keeps raw readings local while producing a trustworthy proof signal.",
    stageKeys: ["hash", "explode"],
  },
  {
    id: "hash_path",
    label: "Verified Data Out",
    friendlyName: "Proof upload path",
    category: "data",
    position: [24, 28, 10],
    detail: "This path represents the transition from local edge evidence into the Eco-Cipher proof endpoint.",
    whyItMatters: "Only the proof story leaves the prototype; the raw factory data stays protected.",
    stageKeys: ["hash", "upload", "explode"],
  },
];

export const hardwareStages: HardwareStageConfig[] = [
  {
    key: "overview",
    label: "Overview",
    cameraPosition: [150, 110, 130],
    cameraTarget: [0, 0, 0],
    hotspotIds: ["oled", "led_valid", "sample_chamber"],
    exploded: false,
    narrative: "Full enclosure view with the sample path, validation outputs, and front-panel proof indicators visible together.",
  },
  {
    key: "ports",
    label: "Ports",
    cameraPosition: [170, 30, 52],
    cameraTarget: [60, 6, 0],
    hotspotIds: ["port_power", "port_ph", "port_turb", "port_flow", "port_temp"],
    exploded: false,
    narrative: "Sensor and power ports show where physical signals enter the verifier before classification.",
  },
  {
    key: "sense",
    label: "Sense",
    cameraPosition: [118, 78, 62],
    cameraTarget: [-4, 0, -6],
    hotspotIds: ["sample_chamber", "port_ph", "port_turb", "port_flow", "port_temp"],
    exploded: false,
    narrative: "The hardware story starts at the chamber and input ports, where fluid and electrical signals are first read.",
  },
  {
    key: "validate",
    label: "Validate",
    cameraPosition: [0, -168, 62],
    cameraTarget: [8, -28, 4],
    hotspotIds: ["oled", "led_valid", "led_warning", "led_anomaly"],
    exploded: false,
    narrative: "Front-panel indicators expose the local classification result before any cloud or chain handoff.",
  },
  {
    key: "hash",
    label: "Hash",
    cameraPosition: [116, 88, 96],
    cameraTarget: [4, 8, 8],
    hotspotIds: ["esp32", "hash_path"],
    exploded: true,
    narrative: "The enclosure opens visually to show where the controller turns sensor state into tamper-evident proof data.",
  },
  {
    key: "upload",
    label: "Upload",
    cameraPosition: [86, 146, 72],
    cameraTarget: [22, 24, 8],
    hotspotIds: ["hash_path", "esp32"],
    exploded: false,
    narrative: "Verified evidence exits the device as a structured payload ready for Eco-Cipher’s proof and matching layers.",
  },
  {
    key: "explode",
    label: "Explode",
    cameraPosition: [156, 128, 116],
    cameraTarget: [0, 4, 4],
    hotspotIds: ["sample_chamber", "esp32", "hash_path"],
    exploded: true,
    narrative: "Exploded mode separates shell and internals so the sample path, controller zone, and output path can be inspected together.",
  },
];

export const hardwareStageMap = Object.fromEntries(
  hardwareStages.map((stage) => [stage.key, stage]),
) as Record<HardwareStage, HardwareStageConfig>;

export const hardwareHotspotMap = Object.fromEntries(
  hardwareHotspots.map((hotspot) => [hotspot.id, hotspot]),
) as Record<HardwareHotspotId, HardwareHotspot>;

export const scenarioHardwareCopy: Record<
  ScenarioKey,
  {
    title: string;
    accentClass: "verified" | "warning" | "anomaly";
    chamberTone: string;
    note: string;
  }
> = {
  clear: {
    title: "Clean verification band",
    accentClass: "verified",
    chamberTone: "Clear sample path",
    note: "Signals remain within nominal range and the device stays in a clean proof posture.",
  },
  organic: {
    title: "Organic turbidity load",
    accentClass: "warning",
    chamberTone: "Dense organic reading",
    note: "Turbidity rises but the chamber remains interpretable enough for a cautionary proof route.",
  },
  anomaly: {
    title: "Chemical anomaly isolate",
    accentClass: "anomaly",
    chamberTone: "Threshold breach state",
    note: "The enclosure shifts into defensive mode and downstream automation should not treat the stream as normal.",
  },
  emission: {
    title: "Emission-sensitive stream",
    accentClass: "warning",
    chamberTone: "Gas-biased warning state",
    note: "The chamber and intake path are acceptable, but gas risk becomes the dominant trust signal.",
  },
  energy: {
    title: "Energy-linked context",
    accentClass: "verified",
    chamberTone: "Stable stream with power context",
    note: "The physical stream is stable while the controller weighs energy draw as part of trust scoring.",
  },
};

export function hardwareStageFromStepIndex(stepIndex: number): HardwareStage {
  if (stepIndex <= 0) return "sense";
  if (stepIndex === 1) return "validate";
  if (stepIndex === 2) return "hash";
  if (stepIndex === 3) return "upload";
  if (stepIndex === 4) return "explode";
  return "overview";
}

export function hardwareStatusAccent(payload: HardwarePayload): "verified" | "warning" | "anomaly" {
  if (payload.edge_status === "ANOMALY") return "anomaly";
  if (payload.edge_status === "WARNING") return "warning";
  return "verified";
}
