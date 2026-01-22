import { Canvas, useFrame, useLoader, useThree } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import type { InstancedMesh, PerspectiveCamera, Texture } from 'three';
import {
  DoubleSide,
  DynamicDrawUsage,
  InstancedBufferAttribute,
  Object3D,
  PlaneGeometry,
  TextureLoader,
} from 'three';
import {
  type Phase,
  subscribeToIntensity,
  subscribeToPhase,
  subscribeToReset,
} from '../../lib/moneyFallIntensity';

const BILL = {
  WIDTH: 2.35,
  HEIGHT: 1,
  DESPAWN_Y: -60,
  SPREAD_X: 80,
  CURVE_AMOUNT: 0.15,
  GEOMETRY_SEGMENTS: 20,
} as const;

const SPAWN = {
  HISTORY_SIZE: 50,
  MIN_SEPARATION: 3.5,
  MAX_RETRIES: 3,
  MAX_PER_FRAME: 3,
} as const;

const INTENSITY = {
  LERP_FACTOR: 0.15,
  INITIAL_FRONT: 0.3,
  INITIAL_BACK: 0.05,
  MIN_FRONT: 0.05,
  TRICKLE: 0.05,
  TRICKLE_DURATION_MS: 3000,
} as const;

const TWO_PI = Math.PI * 2;
const HALF_PI = Math.PI / 2;

interface SpawnHistory {
  positions: Float32Array;
  index: number;
  count: number;
}

function createSpawnHistory(): SpawnHistory {
  return {
    positions: new Float32Array(SPAWN.HISTORY_SIZE * 2),
    index: 0,
    count: 0,
  };
}

function addToSpawnHistory(history: SpawnHistory, x: number, z: number): void {
  history.positions[history.index * 2] = x;
  history.positions[history.index * 2 + 1] = z;
  history.index = (history.index + 1) % SPAWN.HISTORY_SIZE;
  if (history.count < SPAWN.HISTORY_SIZE) {
    history.count++;
  }
}

function isTooCloseToRecent(history: SpawnHistory, x: number, z: number): boolean {
  const minDistSq = SPAWN.MIN_SEPARATION * SPAWN.MIN_SEPARATION;
  for (let i = 0; i < history.count; i++) {
    const hx = history.positions[i * 2];
    const hz = history.positions[i * 2 + 1];
    const dx = x - hx;
    const dz = z - hz;
    if (dx * dx + dz * dz < minDistSq) {
      return true;
    }
  }
  return false;
}

type Layer = 'back' | 'front';

interface LayerConfig {
  count: number;
  zRange: [number, number];
  scaleRange: [number, number];
  opacityFadeScaleThreshold?: number;
  opacityMin?: number;
}

const LAYER_CONFIGS: Record<Layer, LayerConfig> = {
  back: {
    count: 2500,
    zRange: [-25, 5],
    scaleRange: [0.2, 2.2],
    opacityFadeScaleThreshold: 0.6,
    opacityMin: 0.5,
  },
  front: {
    count: 200,
    zRange: [8, 20],
    scaleRange: [1.4, 2.0],
  },
};

interface BillState {
  positions: Float32Array;
  scales: Float32Array;
  opacities: Float32Array;
  baseRotZ: Float32Array;
  velocitiesX: Float32Array;
  fallSpeeds: Float32Array;
  phaseX: Float32Array;
  phaseY: Float32Array;
  phaseZ: Float32Array;
  freqX: Float32Array;
  freqY: Float32Array;
  freqZ: Float32Array;
  ampX: Float32Array;
  ampY: Float32Array;
  ampZ: Float32Array;
  baseRotY: Float32Array;
  spinSpeed: Float32Array;
  driftSpeed: Float32Array;
  driftPhase: Float32Array;
}

function createCurvedBillGeometry(): PlaneGeometry {
  const geometry = new PlaneGeometry(BILL.WIDTH, BILL.HEIGHT, BILL.GEOMETRY_SEGMENTS, 1);
  const positions = geometry.attributes.position;

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const normalizedX = x / (BILL.WIDTH / 2);
    const curve = BILL.CURVE_AMOUNT * normalizedX ** 2;
    positions.setZ(i, curve);
  }

  geometry.computeVertexNormals();
  return geometry;
}

function computeOpacity(scale: number, config: LayerConfig): number {
  const { scaleRange, opacityFadeScaleThreshold, opacityMin } = config;
  if (opacityFadeScaleThreshold === undefined || opacityMin === undefined) {
    return 1.0;
  }
  if (scale >= opacityFadeScaleThreshold) {
    return 1.0;
  }
  const t = (scale - scaleRange[0]) / (opacityFadeScaleThreshold - scaleRange[0]);
  return opacityMin + t * (1.0 - opacityMin);
}

function randomInRange(min: number, max: number): number {
  return min + Math.random() * (max - min);
}

function initializeBillState(config: LayerConfig): BillState {
  const { count, zRange, scaleRange } = config;
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count);
  const opacities = new Float32Array(count);
  const baseRotZ = new Float32Array(count);
  const velocitiesX = new Float32Array(count);
  const fallSpeeds = new Float32Array(count);
  const phaseX = new Float32Array(count);
  const phaseY = new Float32Array(count);
  const phaseZ = new Float32Array(count);
  const freqX = new Float32Array(count);
  const freqY = new Float32Array(count);
  const freqZ = new Float32Array(count);
  const ampX = new Float32Array(count);
  const ampY = new Float32Array(count);
  const ampZ = new Float32Array(count);
  const baseRotY = new Float32Array(count);
  const spinSpeed = new Float32Array(count);
  const driftSpeed = new Float32Array(count);
  const driftPhase = new Float32Array(count);

  for (let i = 0; i < count; i++) {
    positions[i * 3] = (Math.random() - 0.5) * BILL.SPREAD_X;
    positions[i * 3 + 1] = BILL.DESPAWN_Y - 10 - Math.random() * 50;
    positions[i * 3 + 2] = randomInRange(zRange[0], zRange[1]);

    scales[i] = randomInRange(scaleRange[0], scaleRange[1]);
    opacities[i] = computeOpacity(scales[i], config);
    baseRotZ[i] = Math.random() * HALF_PI;
    velocitiesX[i] = 0;
    const rotationFactor = baseRotZ[i] / HALF_PI;
    fallSpeeds[i] = 0.06 + Math.random() * 0.08 + rotationFactor * 0.16;

    phaseX[i] = Math.random() * TWO_PI;
    phaseY[i] = Math.random() * TWO_PI;
    phaseZ[i] = Math.random() * TWO_PI;

    freqX[i] = 1.5 + Math.random() * 2;
    freqY[i] = 0.8 + Math.random() * 1.2;
    freqZ[i] = 1.2 + Math.random() * 1.5;

    ampX[i] = 0.4 + Math.random() * 0.5;
    ampY[i] = 0.3 + Math.random() * 0.4;
    ampZ[i] = 0.2 + Math.random() * 0.3;

    baseRotY[i] = Math.random() * TWO_PI;
    spinSpeed[i] = Math.random() < 0.3 ? 0.01 + Math.random() * 0.02 : 0;

    driftSpeed[i] = 0.3 + Math.random() * 0.4;
    driftPhase[i] = Math.random() * TWO_PI;
  }

  return {
    positions,
    scales,
    opacities,
    baseRotZ,
    velocitiesX,
    fallSpeeds,
    phaseX,
    phaseY,
    phaseZ,
    freqX,
    freqY,
    freqZ,
    ampX,
    ampY,
    ampZ,
    baseRotY,
    spinSpeed,
    driftSpeed,
    driftPhase,
  };
}

const FLUTTER_PRESETS = [
  {
    threshold: 0.2,
    amp: [
      [0.05, 0.1],
      [0.05, 0.1],
      [0.02, 0.05],
    ],
    freq: [
      [0.5, 0.5],
      [0.3, 0.3],
      [0.4, 0.4],
    ],
  },
  {
    threshold: 0.6,
    amp: [
      [0.3, 0.3],
      [0.2, 0.3],
      [0.15, 0.2],
    ],
    freq: [
      [1.2, 1.5],
      [0.6, 0.8],
      [0.9, 1.0],
    ],
  },
  {
    threshold: 1.0,
    amp: [
      [0.6, 0.6],
      [0.4, 0.5],
      [0.3, 0.4],
    ],
    freq: [
      [2.0, 2.5],
      [1.0, 1.5],
      [1.5, 2.0],
    ],
  },
] as const;

function applyFlutterPreset(state: BillState, index: number): void {
  const roll = Math.random();
  const preset = FLUTTER_PRESETS.find((p) => roll < p.threshold) ?? FLUTTER_PRESETS[2];

  state.ampX[index] = preset.amp[0][0] + Math.random() * preset.amp[0][1];
  state.ampY[index] = preset.amp[1][0] + Math.random() * preset.amp[1][1];
  state.ampZ[index] = preset.amp[2][0] + Math.random() * preset.amp[2][1];
  state.freqX[index] = preset.freq[0][0] + Math.random() * preset.freq[0][1];
  state.freqY[index] = preset.freq[1][0] + Math.random() * preset.freq[1][1];
  state.freqZ[index] = preset.freq[2][0] + Math.random() * preset.freq[2][1];
}

function resetBill(
  state: BillState,
  index: number,
  config: LayerConfig,
  spawnHistory: SpawnHistory,
  spawnYForZ: (z: number) => number
): void {
  const { zRange, scaleRange } = config;

  let x: number;
  let z: number;
  let retries = 0;

  do {
    x = (Math.random() - 0.5) * BILL.SPREAD_X;
    z = randomInRange(zRange[0], zRange[1]);
    retries++;
  } while (retries <= SPAWN.MAX_RETRIES && isTooCloseToRecent(spawnHistory, x, z));

  addToSpawnHistory(spawnHistory, x, z);

  state.positions[index * 3] = x;
  state.positions[index * 3 + 1] = spawnYForZ(z) + Math.random() * 3;
  state.positions[index * 3 + 2] = z;
  state.scales[index] = randomInRange(scaleRange[0], scaleRange[1]);
  state.opacities[index] = computeOpacity(state.scales[index], config);
  state.baseRotZ[index] = Math.random() * HALF_PI;
  state.velocitiesX[index] = 0;
  const rotationFactor = state.baseRotZ[index] / HALF_PI;
  state.fallSpeeds[index] = 0.06 + Math.random() * 0.08 + rotationFactor * 0.16;

  state.phaseX[index] = Math.random() * TWO_PI;
  state.phaseY[index] = Math.random() * TWO_PI;
  state.phaseZ[index] = Math.random() * TWO_PI;

  applyFlutterPreset(state, index);

  state.baseRotY[index] = Math.random() * TWO_PI;
  state.spinSpeed[index] = Math.random() < 0.25 ? 0.01 + Math.random() * 0.025 : 0;

  state.driftSpeed[index] = 0.3 + Math.random() * 0.5;
  state.driftPhase[index] = Math.random() * TWO_PI;
}

interface BillsProps {
  frontTexture: Texture;
  backTexture: Texture;
  layer: Layer;
  intensityRef: React.RefObject<number>;
}

function Bills({ frontTexture, backTexture, layer, intensityRef }: BillsProps): React.JSX.Element {
  const config = LAYER_CONFIGS[layer];
  const meshRef = useRef<InstancedMesh>(null);
  const stateRef = useRef<BillState>(initializeBillState(config));
  const spawnHistoryRef = useRef<SpawnHistory>(createSpawnHistory());
  const timeRef = useRef(0);
  const dummy = useMemo(() => new Object3D(), []);
  const camera = useThree((s) => s.camera);

  const opacityAttr = useMemo(() => {
    const attr = new InstancedBufferAttribute(stateRef.current.opacities, 1);
    attr.setUsage(DynamicDrawUsage);
    return attr;
  }, []);

  const geometry = useMemo(() => {
    const geom = createCurvedBillGeometry();
    geom.setAttribute('instanceOpacity', opacityAttr);
    return geom;
  }, [opacityAttr]);

  useEffect(() => {
    if (!meshRef.current) return;
    meshRef.current.instanceMatrix.setUsage(DynamicDrawUsage);
  }, []);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    const state = stateRef.current;
    const currentIntensity = intensityRef.current ?? 0;
    const deltaScale = Math.min(delta, 1 / 30) * 60;
    timeRef.current += delta;
    const t = timeRef.current;

    const targetActiveBills = Math.floor(config.count * currentIntensity);
    let visibleCount = 0;
    let spawnsThisFrame = 0;

    const spawnYForZ = (z: number) => {
      const fov = (camera as PerspectiveCamera).fov ?? 60;
      const fovRad = fov * (Math.PI / 180);
      const dist = Math.max(0.1, camera.position.z - z);
      const halfHeight = Math.tan(fovRad / 2) * dist;
      return halfHeight + BILL.HEIGHT * 2.5;
    };

    for (let i = 0; i < config.count; i++) {
      const y = state.positions[i * 3 + 1];

      if (y > BILL.DESPAWN_Y) {
        visibleCount++;
        state.positions[i * 3 + 1] -= state.fallSpeeds[i] * deltaScale;

        const drift = Math.sin(t * state.driftSpeed[i] + state.driftPhase[i]) * 0.02 * deltaScale;
        state.positions[i * 3] += drift;

        state.baseRotY[i] += state.spinSpeed[i] * deltaScale;

        const rotX = Math.sin(t * state.freqX[i] + state.phaseX[i]) * state.ampX[i];
        const rotY =
          state.baseRotY[i] + Math.sin(t * state.freqY[i] + state.phaseY[i]) * state.ampY[i];
        const rotZ =
          Math.sin(t * state.freqZ[i] + state.phaseZ[i]) * state.ampZ[i] + state.baseRotZ[i];

        const scale = state.scales[i];
        dummy.position.set(
          state.positions[i * 3],
          state.positions[i * 3 + 1],
          state.positions[i * 3 + 2]
        );
        dummy.rotation.set(rotX, rotY, rotZ);
        dummy.scale.set(scale, scale, scale);
      } else {
        if (visibleCount < targetActiveBills && spawnsThisFrame < SPAWN.MAX_PER_FRAME) {
          resetBill(state, i, config, spawnHistoryRef.current, spawnYForZ);
          visibleCount++;
          spawnsThisFrame++;

          const scale = state.scales[i];
          dummy.position.set(
            state.positions[i * 3],
            state.positions[i * 3 + 1],
            state.positions[i * 3 + 2]
          );
          dummy.rotation.set(0, state.baseRotY[i], state.baseRotZ[i]);
          dummy.scale.set(scale, scale, scale);
        } else {
          dummy.scale.set(0, 0, 0);
        }
      }

      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    opacityAttr.needsUpdate = true;
  });

  const hasOpacityFade = config.opacityFadeScaleThreshold !== undefined;

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, config.count]}>
      <meshStandardMaterial
        side={DoubleSide}
        map={frontTexture}
        roughness={0.8}
        metalness={0.1}
        transparent={hasOpacityFade}
        onBeforeCompile={(shader) => {
          shader.uniforms.backTexture = { value: backTexture };

          shader.vertexShader = shader.vertexShader.replace(
            '#include <common>',
            `
            #include <common>
            attribute float instanceOpacity;
            varying float vInstanceOpacity;
            `
          );

          shader.vertexShader = shader.vertexShader.replace(
            '#include <begin_vertex>',
            `
            #include <begin_vertex>
            vInstanceOpacity = instanceOpacity;
            `
          );

          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            `
            #include <common>
            uniform sampler2D backTexture;
            varying float vInstanceOpacity;
            `
          );

          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <map_fragment>',
            `
            #ifdef USE_MAP
              vec4 frontColor = texture2D(map, vMapUv);
              vec2 backUv = vec2(1.0 - vMapUv.x, vMapUv.y);
              vec4 backColor = texture2D(backTexture, backUv);
              diffuseColor *= gl_FrontFacing ? frontColor : backColor;
            #endif
            `
          );

          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <output_fragment>',
            `
            diffuseColor.a *= vInstanceOpacity;
            #include <output_fragment>
            `
          );
        }}
      />
    </instancedMesh>
  );
}

interface SceneProps {
  layer: Layer;
  intensityRef: React.RefObject<number>;
}

function Scene({ layer, intensityRef }: SceneProps) {
  const [frontTexture, backTexture] = useLoader(TextureLoader, [
    '/assets/images/bills/100-front.jpg',
    '/assets/images/bills/100-rear.jpg',
  ]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1} />
      <directionalLight position={[-5, -5, -5]} intensity={0.3} />
      <Bills
        frontTexture={frontTexture}
        backTexture={backTexture}
        layer={layer}
        intensityRef={intensityRef}
      />
    </>
  );
}

interface MoneyFallProps {
  zIndex?: number;
  layer?: Layer;
}

function getInitialIntensity(layer: Layer): number {
  return layer === 'front' ? INTENSITY.INITIAL_FRONT : INTENSITY.INITIAL_BACK;
}

export function MoneyFall({ zIndex = 1, layer = 'back' }: MoneyFallProps): React.JSX.Element {
  const [isEnabled, setIsEnabled] = useState(true);
  const initialIntensity = getInitialIntensity(layer);
  const intensityStateRef = useRef({ target: initialIntensity, current: initialIntensity });
  const billsIntensityRef = useRef(initialIntensity);
  const phaseRef = useRef<Phase>('climb');
  const hasSeenNonZeroIntensityRef = useRef(false);
  const canvasDpr: [number, number] | number = layer === 'front' ? 1 : [1, 2];
  const canvasAntialias = layer !== 'front';

  useEffect(() => {
    const state = intensityStateRef.current;
    let trickleTimeoutId: ReturnType<typeof setTimeout> | null = null;
    let currentPhase: Phase = 'climb';

    const unsubscribeIntensity = subscribeToIntensity((newTarget) => {
      if (currentPhase === 'climb') {
        if (newTarget > 0) {
          hasSeenNonZeroIntensityRef.current = true;
        }
        if (hasSeenNonZeroIntensityRef.current) {
          state.target = newTarget;
        }
      }
    });

    const unsubscribePhase = subscribeToPhase((phase) => {
      currentPhase = phase;
      phaseRef.current = phase;

      if (phase === 'crash') {
        state.target = 0;
        state.current = 0;
        billsIntensityRef.current = 0;
      } else if (phase === 'done') {
        state.target = INTENSITY.TRICKLE;
        trickleTimeoutId = setTimeout(() => {
          state.target = 0;
        }, INTENSITY.TRICKLE_DURATION_MS);
        if (layer === 'front') {
          setIsEnabled(false);
        }
      }
    });

    const unsubscribeReset = subscribeToReset(() => {
      if (trickleTimeoutId) {
        clearTimeout(trickleTimeoutId);
        trickleTimeoutId = null;
      }
      currentPhase = 'climb';
      phaseRef.current = 'climb';
      hasSeenNonZeroIntensityRef.current = false;
      const resetIntensity = getInitialIntensity(layer);
      state.target = resetIntensity;
      state.current = resetIntensity;
      billsIntensityRef.current = resetIntensity;
      setIsEnabled(true);
    });

    let animationId: number;
    const animate = () => {
      state.current += (state.target - state.current) * INTENSITY.LERP_FACTOR;
      const phase = phaseRef.current;
      const shouldApplyFrontFloor = layer === 'front' && phase === 'climb';
      billsIntensityRef.current = shouldApplyFrontFloor
        ? Math.max(state.current, INTENSITY.MIN_FRONT)
        : state.current;

      animationId = requestAnimationFrame(animate);
    };

    animationId = requestAnimationFrame(animate);

    return () => {
      unsubscribeIntensity();
      unsubscribePhase();
      unsubscribeReset();
      if (trickleTimeoutId) {
        clearTimeout(trickleTimeoutId);
      }
      cancelAnimationFrame(animationId);
    };
  }, [layer]);

  return (
    <div
      style={{
        width: '100vw',
        height: '100vh',
        position: 'fixed',
        top: 0,
        left: 0,
        zIndex,
        pointerEvents: 'none',
      }}
    >
      {isEnabled && (
        <Canvas
          dpr={canvasDpr}
          camera={{ position: [0, 0, 30], fov: 60 }}
          gl={{ alpha: true, antialias: canvasAntialias }}
          style={{ pointerEvents: 'none' }}
        >
          <Scene layer={layer} intensityRef={billsIntensityRef} />
        </Canvas>
      )}
    </div>
  );
}

export default MoneyFall;
