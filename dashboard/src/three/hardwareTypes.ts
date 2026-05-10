export type ScenarioKey = "clear" | "organic" | "anomaly" | "emission" | "energy";

export type EdgeStatus = "VERIFIED" | "WARNING" | "ANOMALY";

export type HardwareStage = "overview" | "ports" | "sense" | "validate" | "hash" | "upload" | "explode";
export type HardwarePartCategory = "fluid" | "sensor" | "controller" | "power" | "indicator" | "data" | "enclosure";

export type HardwareHotspotId =
  | "oled"
  | "led_valid"
  | "led_warning"
  | "led_anomaly"
  | "port_power"
  | "port_ph"
  | "port_turb"
  | "port_flow"
  | "port_temp"
  | "sample_chamber"
  | "esp32"
  | "hash_path";

export type Vec3 = [number, number, number];

export type HardwarePayload = {
  edge_status: EdgeStatus;
  ph: number;
  turbidity_raw: number;
  flow_rate_lpm: number;
  temperature_c: number;
  gas_raw: number;
  gas_risk_score: number;
  energy_power_w: number;
  data_quality_score: number;
  carbon_context_score: number;
  ai_match_confidence: number;
  payload_hash: string;
};

export type HardwareHotspot = {
  id: HardwareHotspotId;
  label: string;
  friendlyName: string;
  category: HardwarePartCategory;
  position: Vec3;
  detail: string;
  whyItMatters: string;
  stageKeys: HardwareStage[];
};

export type HardwareStageConfig = {
  key: HardwareStage;
  label: string;
  cameraPosition: Vec3;
  cameraTarget: Vec3;
  hotspotIds: HardwareHotspotId[];
  exploded: boolean;
  narrative: string;
};
