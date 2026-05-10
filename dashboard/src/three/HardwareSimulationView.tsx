import React, { Suspense, useEffect, useMemo, useState } from "react";

import {
  hardwareCategoryMeta,
  hardwareHotspotMap,
  hardwareStageFromStepIndex,
  hardwareStages,
  hardwareStatusAccent,
  scenarioHardwareCopy,
} from "./hardwareMeta";
import { HardwareScene } from "./HardwareScene";
import type { HardwareHotspotId, HardwarePayload, HardwareStage, ScenarioKey } from "./hardwareTypes";

type HardwareSimulationViewProps = {
  scenarioKey: ScenarioKey;
  payload: HardwarePayload;
  activeStepIndex: number;
};

type SceneErrorBoundaryProps = {
  children: React.ReactNode;
  fallback: React.ReactNode;
};

class SceneErrorBoundary extends React.Component<
  SceneErrorBoundaryProps,
  { hasError: boolean }
> {
  constructor(props: SceneErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidUpdate(prevProps: SceneErrorBoundaryProps) {
    if (prevProps.children !== this.props.children && this.state.hasError) {
      this.setState({ hasError: false });
    }
  }

  render() {
    if (this.state.hasError) return this.props.fallback;
    return this.props.children;
  }
}

export default function HardwareSimulationView({
  scenarioKey,
  payload,
  activeStepIndex,
}: HardwareSimulationViewProps) {
  const [guidedMode, setGuidedMode] = useState(true);
  const [selectedStage, setSelectedStage] = useState<HardwareStage>(hardwareStageFromStepIndex(activeStepIndex));
  const [selectedHotspotId, setSelectedHotspotId] = useState<HardwareHotspotId | null>(null);
  const [sceneResetKey, setSceneResetKey] = useState(0);

  const activeStage = guidedMode ? hardwareStageFromStepIndex(activeStepIndex) : selectedStage;
  const stageConfig = useMemo(
    () => hardwareStages.find((item) => item.key === activeStage) ?? hardwareStages[0],
    [activeStage],
  );
  const copy = scenarioHardwareCopy[scenarioKey];
  const accent = hardwareStatusAccent(payload);
  const selectedHotspot = selectedHotspotId ? hardwareHotspotMap[selectedHotspotId] : null;

  useEffect(() => {
    if (!guidedMode) return;
    setSelectedStage(hardwareStageFromStepIndex(activeStepIndex));
  }, [activeStepIndex, guidedMode]);

  useEffect(() => {
    if (selectedHotspotId && !selectedHotspot?.stageKeys.includes(activeStage)) {
      setSelectedHotspotId(null);
    }
  }, [activeStage, selectedHotspot, selectedHotspotId]);

  return (
    <section className="hardware-view">
      <div className="hardware-view__hero">
        <div>
          <p className="eyeline">Hardware Simulation</p>
          <h2>Real CAD viewer with proof-stage overlays.</h2>
          <p className="hardware-copy">
            {stageConfig.narrative} {copy.note}
          </p>
        </div>
        <div className={`hardware-status-card ${accent}`}>
          <span>Current state</span>
          <strong>{payload.edge_status}</strong>
          <small>{copy.title}</small>
        </div>
      </div>

      <div className="hardware-summary-strip">
        <div className="hardware-summary-item">
          <span>Scenario</span>
          <strong>{scenarioKey}</strong>
        </div>
        <div className="hardware-summary-item">
          <span>Quality</span>
          <strong>{Math.round(payload.data_quality_score * 100)}%</strong>
        </div>
        <div className="hardware-summary-item">
          <span>Match confidence</span>
          <strong>{Math.round(payload.ai_match_confidence * 100)}%</strong>
        </div>
        <div className="hardware-summary-item">
          <span>Payload hash</span>
          <strong>{payload.payload_hash.slice(0, 12)}</strong>
        </div>
      </div>

      <div className="hardware-legend" aria-label="prototype part color legend">
        {Object.entries(hardwareCategoryMeta).map(([key, item]) => (
          <div className="hardware-legend__item" key={key}>
            <span style={{ background: item.color }} />
            <strong>{item.label}</strong>
            <small>{item.plain}</small>
          </div>
        ))}
      </div>

      <div className="hardware-stage-toolbar">
        <div className="hardware-mode-toggle" role="tablist" aria-label="hardware scene mode">
          <button
            className={guidedMode ? "mode-pill active" : "mode-pill"}
            onClick={() => setGuidedMode(true)}
          >
            Guided sync
          </button>
          <button
            className={!guidedMode ? "mode-pill active" : "mode-pill"}
            onClick={() => setGuidedMode(false)}
          >
            Manual stage
          </button>
        </div>
        <button
          className="utility-button"
          onClick={() => {
            setGuidedMode(true);
            setSelectedHotspotId(null);
            setSelectedStage(hardwareStageFromStepIndex(activeStepIndex));
          }}
        >
          Reset to guided
        </button>
        <button
          className="utility-button"
          onClick={() => {
            setGuidedMode(false);
            setSelectedHotspotId(null);
            setSelectedStage("explode");
          }}
        >
          Exploded view
        </button>
      </div>

      <div className="hardware-preset-row" aria-label="hardware inspection presets" data-tour-id="hardware-presets">
        {[
          ["sample_chamber", "Fluid path", "sense"],
          ["esp32", "Controller", "hash"],
          ["hash_path", "Data out", "upload"],
          ["oled", "Operator face", "validate"],
        ].map(([hotspotId, label, stage]) => (
          <button
            key={hotspotId}
            className={selectedHotspotId === hotspotId ? "hardware-preset active" : "hardware-preset"}
            onClick={() => {
              setGuidedMode(false);
              setSelectedStage(stage as HardwareStage);
              setSelectedHotspotId(hotspotId as HardwareHotspotId);
            }}
          >
            <span>{label}</span>
            <strong>{stage}</strong>
          </button>
        ))}
      </div>

      <div className="hardware-stage-chips" role="tablist" aria-label="hardware stages">
        {hardwareStages.map((stage) => (
          <button
            key={stage.key}
            className={stage.key === activeStage ? "hardware-stage-chip active" : "hardware-stage-chip"}
            onClick={() => {
              setGuidedMode(false);
              setSelectedStage(stage.key);
              setSelectedHotspotId(null);
            }}
          >
            <span>{stage.label}</span>
            <strong>{stage.key}</strong>
          </button>
        ))}
      </div>

      <div className="hardware-layout">
        <div className="hardware-scene-panel" data-tour-id="hardware-scene">
          <div className="panel-head">
            <h2>CAD Simulation Surface</h2>
            <span>{guidedMode ? "guided sync active" : "manual inspection"}</span>
          </div>

          <div className="hardware-scene-shell">
            <SceneErrorBoundary
              fallback={
                <div className="hardware-scene-fallback">
                  <strong>3D model failed to load.</strong>
                  <p>The scene asset or loader did not initialize cleanly in this browser context.</p>
                  <button className="utility-button" onClick={() => setSceneResetKey((value) => value + 1)}>
                    Retry scene
                  </button>
                </div>
              }
            >
              <Suspense
                fallback={
                  <div className="hardware-scene-fallback">
                    <strong>Loading CAD mesh…</strong>
                    <p>Preparing the real enclosure geometry and overlay guides.</p>
                  </div>
                }
              >
                <HardwareScene
                  key={sceneResetKey}
                  stage={activeStage}
                  scenarioKey={scenarioKey}
                  payload={payload}
                  selectedHotspotId={selectedHotspotId}
                  onSelectHotspot={setSelectedHotspotId}
                />
              </Suspense>
            </SceneErrorBoundary>
          </div>
        </div>

        <aside className="hardware-detail-stack">
          <section className="panel hardware-inspector">
            <div className="panel-head">
              <h2>Stage Inspector</h2>
              <span>{stageConfig.label}</span>
            </div>
            <div className="hardware-detail-body">
              <span>Focus</span>
              <strong>{stageConfig.label}</strong>
              <p>{stageConfig.narrative}</p>
            </div>
            <div className="status-table">
              <div className="row">
                <span>Camera mode</span>
                <strong>{guidedMode ? "Guided" : "Manual"}</strong>
              </div>
              <div className="row">
                <span>Exploded</span>
                <strong>{stageConfig.exploded ? "Enabled" : "Hidden"}</strong>
              </div>
              <div className="row">
                <span>Chamber tone</span>
                <strong>{copy.chamberTone}</strong>
              </div>
            </div>
          </section>

          <section className="panel hardware-inspector">
            <div className="panel-head">
              <h2>Hotspot Detail</h2>
              <span>{selectedHotspot ? "selected" : "tap a marker"}</span>
            </div>
            {selectedHotspot ? (
              <div className="hardware-detail-body">
                <span>{selectedHotspot.id}</span>
                <strong>{selectedHotspot.friendlyName}</strong>
                <p>{selectedHotspot.detail}</p>
                <p className="hardware-why">{selectedHotspot.whyItMatters}</p>
              </div>
            ) : (
              <div className="hardware-detail-body">
                <span>Selection</span>
                <strong>No hotspot selected</strong>
                <p>Click a visible marker in the scene to inspect the physical component and its proof role.</p>
              </div>
            )}
          </section>

          <section className="panel hardware-inspector">
            <div className="panel-head">
              <h2>Live Hardware Inputs</h2>
              <span>scene-linked</span>
            </div>
            <div className="status-table">
              <div className="row">
                <span>pH</span>
                <strong>{payload.ph.toFixed(2)}</strong>
              </div>
              <div className="row">
                <span>Turbidity</span>
                <strong>{payload.turbidity_raw}</strong>
              </div>
              <div className="row">
                <span>Flow</span>
                <strong>{payload.flow_rate_lpm.toFixed(2)} L/min</strong>
              </div>
              <div className="row">
                <span>Gas risk</span>
                <strong>{Math.round(payload.gas_risk_score * 100)}%</strong>
              </div>
              <div className="row">
                <span>Energy</span>
                <strong>{payload.energy_power_w.toFixed(0)} W</strong>
              </div>
            </div>
          </section>
        </aside>
      </div>
    </section>
  );
}
