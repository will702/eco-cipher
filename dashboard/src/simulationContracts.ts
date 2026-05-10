export type OperatorMode = "normal" | "acknowledged" | "quarantined" | "maintenance";

export type DemoPresetKey = "pitch" | "operator" | "technical";

export type ManualSensorOverrides = {
  ph: number;
  turbidity_raw: number;
  flow_rate_lpm: number;
  temperature_c: number;
  gas_raw: number;
  energy_current_a: number;
};

export type OperatorEvent = {
  id: string;
  title: string;
  detail: string;
  mode: OperatorMode;
  timestamp: Date;
};

export type DemoPreset = {
  key: DemoPresetKey;
  label: string;
  audience: string;
  scenarioKey: "clear" | "organic" | "anomaly" | "emission" | "energy";
  guidedMode: boolean;
  stepIndex: number;
  view: "overview" | "edge-ai" | "hardware" | "matchmaker" | "zkgrid" | "exchange" | "proofs" | "reports";
};

export const demoPresets: DemoPreset[] = [
  {
    key: "pitch",
    label: "Pitch walkthrough",
    audience: "Judges / investors",
    scenarioKey: "clear",
    guidedMode: true,
    stepIndex: 0,
    view: "overview",
  },
  {
    key: "operator",
    label: "Operator review",
    audience: "Factory operator",
    scenarioKey: "anomaly",
    guidedMode: false,
    stepIndex: 1,
    view: "edge-ai",
  },
  {
    key: "technical",
    label: "Proof lab",
    audience: "Technical reviewer",
    scenarioKey: "emission",
    guidedMode: false,
    stepIndex: 2,
    view: "proofs",
  },
];

export const operatorModeCopy: Record<OperatorMode, { label: string; plain: string }> = {
  normal: {
    label: "Normal",
    plain: "Automation is allowed to continue when the proof state permits it.",
  },
  acknowledged: {
    label: "Acknowledged",
    plain: "The operator has seen the latest warning and left the proof path active.",
  },
  quarantined: {
    label: "Quarantined",
    plain: "Settlement and matching are blocked until manual review clears the event.",
  },
  maintenance: {
    label: "Maintenance",
    plain: "The device is treated as serviceable hardware, not production evidence.",
  },
};
