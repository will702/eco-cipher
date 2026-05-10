import { Html, Line, OrbitControls } from "@react-three/drei";
import { Canvas, ThreeEvent, useLoader, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import { BufferGeometry, MeshStandardMaterial, Vector3 } from "three";
import type { OrbitControls as OrbitControlsImpl } from "three-stdlib";
import { STLLoader } from "three/examples/jsm/loaders/STLLoader.js";

import {
  hardwareCategoryMeta,
  hardwareHotspotMap,
  hardwareStageMap,
  hardwareStatusAccent,
  scenarioHardwareCopy,
} from "./hardwareMeta";
import type { HardwareHotspotId, HardwarePayload, HardwareStage, ScenarioKey, Vec3 } from "./hardwareTypes";

const MODEL_URL = "/models/eco-cipher-edge-verifier.stl";

type HardwareSceneProps = {
  stage: HardwareStage;
  scenarioKey: ScenarioKey;
  payload: HardwarePayload;
  selectedHotspotId: HardwareHotspotId | null;
  onSelectHotspot: (id: HardwareHotspotId | null) => void;
};

function useReducedMotion() {
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  return reduce.matches;
}

export function HardwareScene({
  stage,
  scenarioKey,
  payload,
  selectedHotspotId,
  onSelectHotspot,
}: HardwareSceneProps) {
  const reduceMotion = useReducedMotion();
  const dpr = typeof window !== "undefined" && window.innerWidth < 760 ? 1 : 1.6;
  const controlsRef = useRef<OrbitControlsImpl | null>(null);

  return (
    <Canvas
      camera={{ position: [150, 110, 130], fov: 32, near: 0.1, far: 1000 }}
      dpr={dpr}
      gl={{ antialias: true }}
      onPointerMissed={() => onSelectHotspot(null)}
    >
      <color attach="background" args={["#edf1ec"]} />
      <fog attach="fog" args={["#edf1ec", 210, 420]} />
      <ambientLight intensity={1.1} />
      <directionalLight position={[180, 160, 140]} intensity={2.4} castShadow={false} />
      <directionalLight position={[-120, -60, 80]} intensity={1.3} />
      <HardwareCameraRig
        stage={stage}
        selectedHotspotId={selectedHotspotId}
        reduceMotion={reduceMotion}
        controlsRef={controlsRef}
      />
      <SceneFloor />
      <HardwareModel
        stage={stage}
        scenarioKey={scenarioKey}
        payload={payload}
        selectedHotspotId={selectedHotspotId}
        onSelectHotspot={onSelectHotspot}
      />
      <OrbitControls
        ref={controlsRef}
        enablePan
        enableDamping
        dampingFactor={0.08}
        minDistance={70}
        maxDistance={320}
        maxPolarAngle={Math.PI * 0.9}
        minPolarAngle={Math.PI * 0.05}
        autoRotate={!reduceMotion && stage === "overview" && !selectedHotspotId}
        autoRotateSpeed={0.35}
      />
    </Canvas>
  );
}

function HardwareCameraRig({
  stage,
  selectedHotspotId,
  reduceMotion,
  controlsRef,
}: {
  stage: HardwareStage;
  selectedHotspotId: HardwareHotspotId | null;
  reduceMotion: boolean;
  controlsRef: { current: OrbitControlsImpl | null };
}) {
  const { camera } = useThree();
  const animationRef = useRef<number | null>(null);

  useEffect(() => {
    const stageConfig = hardwareStageMap[stage];
    const hotspot = selectedHotspotId ? hardwareHotspotMap[selectedHotspotId] : null;
    const target = hotspot ? hotspot.position : stageConfig.cameraTarget;
    const nextPosition = hotspot
      ? ([target[0] + 54, target[1] + 46, target[2] + 32] as Vec3)
      : stageConfig.cameraPosition;
    const controls = controlsRef.current;

    if (!controls) return;
    if (animationRef.current !== null) {
      window.cancelAnimationFrame(animationRef.current);
      animationRef.current = null;
    }

    if (reduceMotion) {
      camera.position.set(...nextPosition);
      controls.target.set(...target);
      controls.update();
      return;
    }

    const startPosition = camera.position.clone();
    const startTarget = controls.target.clone();
    const endPosition = new Vector3(...nextPosition);
    const endTarget = new Vector3(...target);
    const startedAt = performance.now();
    const durationMs = 520;

    const animate = (now: number) => {
      const progress = Math.min((now - startedAt) / durationMs, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      camera.position.copy(startPosition.clone().lerp(endPosition, eased));
      controls.target.copy(startTarget.clone().lerp(endTarget, eased));
      controls.update();

      if (progress < 1) {
        animationRef.current = window.requestAnimationFrame(animate);
      } else {
        animationRef.current = null;
      }
    };

    animationRef.current = window.requestAnimationFrame(animate);
  }, [camera, controlsRef, reduceMotion, selectedHotspotId, stage]);

  useEffect(() => {
    return () => {
      if (animationRef.current !== null) {
        window.cancelAnimationFrame(animationRef.current);
      }
    };
  }, []);

  return null;
}

function HardwareModel({
  stage,
  scenarioKey,
  payload,
  selectedHotspotId,
  onSelectHotspot,
}: HardwareSceneProps) {
  const geometry = useLoader(STLLoader, MODEL_URL);
  const stageConfig = hardwareStageMap[stage];
  const scenarioCopy = scenarioHardwareCopy[scenarioKey];
  const statusAccent = hardwareStatusAccent(payload);
  const hotspotAccent = selectedHotspotId ? hardwareHotspotMap[selectedHotspotId] : null;

  const shellGeometry = useMemo(() => {
    const next = (geometry as BufferGeometry).clone();
    next.computeVertexNormals();
    next.center();
    return next;
  }, [geometry]);

  const shellMaterial = useMemo(() => {
    const color =
      statusAccent === "anomaly" ? "#4f3936" : statusAccent === "warning" ? "#505048" : hardwareCategoryMeta.enclosure.color;
    return new MeshStandardMaterial({
      color,
      roughness: 0.78,
      metalness: 0.12,
    });
  }, [statusAccent]);

  const chamberColor =
    scenarioCopy.accentClass === "anomaly"
      ? "#b54c41"
      : scenarioCopy.accentClass === "warning"
        ? "#c08f3e"
        : "#3ca57d";
  const shellOffset = stageConfig.exploded ? ([0, 0, 18] as Vec3) : ([0, 0, 0] as Vec3);
  const internalsOffset = stageConfig.exploded ? ([0, 0, -10] as Vec3) : ([0, 0, 0] as Vec3);
  const chamberHeight = Math.min(Math.max((payload.turbidity_raw / 1023) * 18, 6), 18);

  return (
    <group rotation={[-0.26, 0.84, 0]}>
      <group position={shellOffset}>
        <mesh geometry={shellGeometry} material={shellMaterial} />
        {stageConfig.exploded ? (
          <mesh geometry={shellGeometry} position={[0, 0, -10]}>
            <meshStandardMaterial color="#d8ddd6" transparent opacity={0.14} wireframe />
          </mesh>
        ) : null}
      </group>

      <group position={internalsOffset}>
        <mesh position={[-18, 0, -8]}>
          <cylinderGeometry args={[12, 12, 24, 40]} />
          <meshStandardMaterial color={chamberColor} transparent opacity={0.35} />
        </mesh>
        <mesh position={[-18, 0, -13 + chamberHeight / 2]}>
          <cylinderGeometry args={[11.2, 11.2, chamberHeight, 36]} />
          <meshStandardMaterial color={chamberColor} emissive={chamberColor} emissiveIntensity={0.24} transparent opacity={0.52} />
        </mesh>
        <mesh position={[0, 8, 8]}>
          <boxGeometry args={[34, 18, 3]} />
          <meshStandardMaterial color={hardwareCategoryMeta.controller.color} emissive={hardwareCategoryMeta.controller.color} emissiveIntensity={0.1} />
        </mesh>
        <mesh position={[-15, -37.5, 4]}>
          <boxGeometry args={[28, 10, 1.6]} />
          <meshStandardMaterial color={hardwareCategoryMeta.indicator.color} emissive={hardwareCategoryMeta.indicator.color} emissiveIntensity={0.12} />
        </mesh>
        <Line
          points={[
            [-2, 8, 8],
            [18, 14, 11],
            [38, 22, 13],
            [56, 28, 15],
          ]}
          color={statusAccent === "anomaly" ? "#c4574a" : hardwareCategoryMeta.data.color}
          lineWidth={3}
        />
      </group>

      <PortMarkers />
      <LedMarkers payload={payload} />
      <HotspotMarkers
        stage={stage}
        selectedHotspotId={selectedHotspotId}
        payload={payload}
        onSelectHotspot={onSelectHotspot}
      />

      {hotspotAccent ? (
        <Html position={hotspotAccent.position} center distanceFactor={10}>
          <div className="hardware-inline-caption">{hotspotAccent.friendlyName}</div>
        </Html>
      ) : null}
    </group>
  );
}

function HotspotMarkers({
  stage,
  selectedHotspotId,
  payload,
  onSelectHotspot,
}: {
  stage: HardwareStage;
  selectedHotspotId: HardwareHotspotId | null;
  payload: HardwarePayload;
  onSelectHotspot: (id: HardwareHotspotId | null) => void;
}) {
  const accent = hardwareStatusAccent(payload);

  return (
    <>
      {Object.values(hardwareHotspotMap).map((hotspot) => {
        const active = hotspot.stageKeys.includes(stage);
        if (!active) return null;

        const selected = hotspot.id === selectedHotspotId;
        const scale = selected ? 1.45 : 1;
        const tone = selected ? hardwareCategoryMeta[hotspot.category].color : accent === "anomaly" ? "#c4574a" : hardwareCategoryMeta[hotspot.category].color;

        return (
          <group key={hotspot.id} position={hotspot.position}>
            <Line
              points={[
                [0, 0, 0],
                [0, 8, 6],
              ]}
              color={tone}
              lineWidth={selected ? 2.4 : 1.2}
              transparent
              opacity={selected ? 0.9 : 0.45}
            />
            <mesh
              scale={scale}
              onClick={(event: ThreeEvent<MouseEvent>) => {
                event.stopPropagation();
                onSelectHotspot(selected ? null : hotspot.id);
              }}
            >
              <sphereGeometry args={[selected ? 2.25 : 1.6, 20, 20]} />
              <meshStandardMaterial color={selected ? "#0f1511" : tone} emissive={tone} emissiveIntensity={selected ? 0.6 : 0.28} />
            </mesh>
            <mesh position={[0, 0, -2.6]}>
              <cylinderGeometry args={[0.4, 0.4, 5.2, 12]} />
              <meshStandardMaterial color="#4e5952" />
            </mesh>
            <Html position={[0, 10, 7]} center distanceFactor={13}>
              {selected ? (
                <button className="hardware-hotspot-tag" onClick={() => onSelectHotspot(null)}>
                  {hotspot.friendlyName}
                </button>
              ) : (
                <div className="hardware-hotspot-mini">{hotspot.friendlyName}</div>
              )}
            </Html>
          </group>
        );
      })}
    </>
  );
}

function LedMarkers({ payload }: { payload: HardwarePayload }) {
  const states = [
    { position: [22, -38, 4] as Vec3, active: payload.edge_status === "VERIFIED", color: "#3ca57d" },
    { position: [33, -38, 4] as Vec3, active: payload.edge_status === "WARNING", color: "#c08f3e" },
    { position: [44, -38, 4] as Vec3, active: payload.edge_status === "ANOMALY", color: "#c4574a" },
  ];

  return (
    <>
      {states.map((item) => (
        <mesh key={item.position.join("-")} position={item.position}>
          <cylinderGeometry args={[2.3, 2.3, 1.4, 24]} />
          <meshStandardMaterial color={item.active ? item.color : "#6e766d"} emissive={item.active ? item.color : "#050807"} emissiveIntensity={item.active ? 0.5 : 0} />
        </mesh>
      ))}
    </>
  );
}

function PortMarkers() {
  const ports = [
    { y: -18, color: hardwareCategoryMeta.power.color },
    { y: -8, color: hardwareCategoryMeta.sensor.color },
    { y: 2, color: hardwareCategoryMeta.sensor.color },
    { y: 12, color: hardwareCategoryMeta.sensor.color },
    { y: 22, color: hardwareCategoryMeta.sensor.color },
  ];

  return (
    <>
      {ports.map((port) => (
        <mesh key={port.y} position={[61, port.y, 1]} rotation={[0, 0, Math.PI / 2]}>
          <cylinderGeometry args={[2.5, 2.5, 5.6, 16]} />
          <meshStandardMaterial color={port.color} emissive={port.color} emissiveIntensity={0.12} metalness={0.18} roughness={0.68} />
        </mesh>
      ))}
    </>
  );
}

function SceneFloor() {
  return (
    <>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -42]}>
        <planeGeometry args={[600, 600]} />
        <meshStandardMaterial color="#dde4dc" />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, -41.6]}>
        <ringGeometry args={[75, 128, 80]} />
        <meshBasicMaterial color="#bcc6bc" transparent opacity={0.45} />
      </mesh>
    </>
  );
}

export function preloadHardwareModel() {
  useLoader.preload(STLLoader, MODEL_URL);
}
