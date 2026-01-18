import { Canvas, useFrame, useLoader } from '@react-three/fiber';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  DoubleSide,
  DynamicDrawUsage,
  Matrix4,
  Object3D,
  PlaneGeometry,
  TextureLoader,
  Vector3,
} from 'three';
import type { InstancedMesh, Texture } from 'three';

const BILL_WIDTH = 2.35;
const BILL_HEIGHT = 1;
const SPAWN_HEIGHT = 60;
const DESPAWN_HEIGHT = -60;
const SPREAD_X = 80;

// Layer configurations
type Layer = 'back' | 'front';

interface LayerConfig {
  count: number;
  zRange: [number, number]; // min, max Z position (closer to camera = larger apparent size)
  scaleRange: [number, number]; // min, max scale multiplier
}

const LAYER_CONFIGS: Record<Layer, LayerConfig> = {
  back: {
    count: 2500,
    zRange: [-25, 5],
    scaleRange: [0.3, 1.2], // More variation: tiny to medium
  },
  front: {
    count: 800,
    zRange: [8, 20],
    scaleRange: [1.0, 2.5], // More variation: medium to very large
  },
};

interface BillState {
  positions: Float32Array;
  scales: Float32Array;
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
  const geometry = new PlaneGeometry(BILL_WIDTH, BILL_HEIGHT, 20, 1);
  const positions = geometry.attributes.position;

  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const normalizedX = x / (BILL_WIDTH / 2);
    const curve = 0.15 * Math.pow(normalizedX, 2);
    positions.setZ(i, curve);
  }

  geometry.computeVertexNormals();
  return geometry;
}

function initializeBillState(config: LayerConfig): BillState {
  const { count, zRange, scaleRange } = config;
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count);
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
    positions[i * 3] = (Math.random() - 0.5) * SPREAD_X;
    positions[i * 3 + 1] = Math.random() * (SPAWN_HEIGHT - DESPAWN_HEIGHT) + DESPAWN_HEIGHT;
    positions[i * 3 + 2] = zRange[0] + Math.random() * (zRange[1] - zRange[0]);

    scales[i] = scaleRange[0] + Math.random() * (scaleRange[1] - scaleRange[0]);
    velocitiesX[i] = 0;
    fallSpeeds[i] = 0.03 + Math.random() * 0.04; // 50% slower

    phaseX[i] = Math.random() * Math.PI * 2;
    phaseY[i] = Math.random() * Math.PI * 2;
    phaseZ[i] = Math.random() * Math.PI * 2;

    freqX[i] = 1.5 + Math.random() * 2;
    freqY[i] = 0.8 + Math.random() * 1.2;
    freqZ[i] = 1.2 + Math.random() * 1.5;

    ampX[i] = 0.4 + Math.random() * 0.5;
    ampY[i] = 0.3 + Math.random() * 0.4;
    ampZ[i] = 0.2 + Math.random() * 0.3;

    baseRotY[i] = Math.random() * Math.PI * 2;
    spinSpeed[i] = Math.random() < 0.3 ? (0.01 + Math.random() * 0.02) : 0;

    driftSpeed[i] = 0.3 + Math.random() * 0.4;
    driftPhase[i] = Math.random() * Math.PI * 2;
  }

  return {
    positions,
    scales,
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

function resetBill(state: BillState, index: number, config: LayerConfig) {
  const { zRange, scaleRange } = config;

  state.positions[index * 3] = (Math.random() - 0.5) * SPREAD_X;
  state.positions[index * 3 + 1] = SPAWN_HEIGHT + Math.random() * 20;
  state.positions[index * 3 + 2] = zRange[0] + Math.random() * (zRange[1] - zRange[0]);
  state.scales[index] = scaleRange[0] + Math.random() * (scaleRange[1] - scaleRange[0]);
  state.velocitiesX[index] = 0;
  state.fallSpeeds[index] = 0.03 + Math.random() * 0.04; // 50% slower

  state.phaseX[index] = Math.random() * Math.PI * 2;
  state.phaseY[index] = Math.random() * Math.PI * 2;
  state.phaseZ[index] = Math.random() * Math.PI * 2;

  const flutterIntensity = Math.random();
  if (flutterIntensity < 0.2) {
    state.ampX[index] = 0.05 + Math.random() * 0.1;
    state.ampY[index] = 0.05 + Math.random() * 0.1;
    state.ampZ[index] = 0.02 + Math.random() * 0.05;
    state.freqX[index] = 0.5 + Math.random() * 0.5;
    state.freqY[index] = 0.3 + Math.random() * 0.3;
    state.freqZ[index] = 0.4 + Math.random() * 0.4;
  } else if (flutterIntensity < 0.6) {
    state.ampX[index] = 0.3 + Math.random() * 0.3;
    state.ampY[index] = 0.2 + Math.random() * 0.3;
    state.ampZ[index] = 0.15 + Math.random() * 0.2;
    state.freqX[index] = 1.2 + Math.random() * 1.5;
    state.freqY[index] = 0.6 + Math.random() * 0.8;
    state.freqZ[index] = 0.9 + Math.random() * 1.0;
  } else {
    state.ampX[index] = 0.6 + Math.random() * 0.6;
    state.ampY[index] = 0.4 + Math.random() * 0.5;
    state.ampZ[index] = 0.3 + Math.random() * 0.4;
    state.freqX[index] = 2.0 + Math.random() * 2.5;
    state.freqY[index] = 1.0 + Math.random() * 1.5;
    state.freqZ[index] = 1.5 + Math.random() * 2.0;
  }

  state.baseRotY[index] = Math.random() * Math.PI * 2;
  state.spinSpeed[index] = Math.random() < 0.25 ? (0.01 + Math.random() * 0.025) : 0;

  state.driftSpeed[index] = 0.3 + Math.random() * 0.5;
  state.driftPhase[index] = Math.random() * Math.PI * 2;
}

interface BillsProps {
  frontTexture: Texture;
  backTexture: Texture;
  layer: Layer;
}

function Bills({ frontTexture, backTexture, layer }: BillsProps) {
  const config = LAYER_CONFIGS[layer];
  const meshRef = useRef<InstancedMesh>(null);
  const stateRef = useRef<BillState>(initializeBillState(config));
  const timeRef = useRef(0);
  const dummy = useMemo(() => new Object3D(), []);

  const geometry = useMemo(() => createCurvedBillGeometry(), []);

  useEffect(() => {
    if (!meshRef.current) return;
    meshRef.current.instanceMatrix.setUsage(DynamicDrawUsage);
  }, []);

  useFrame((_, delta) => {
    if (!meshRef.current) return;

    const state = stateRef.current;
    const deltaScale = delta * 60;
    timeRef.current += delta;
    const t = timeRef.current;

    for (let i = 0; i < config.count; i++) {
      state.positions[i * 3 + 1] -= state.fallSpeeds[i] * deltaScale;

      const drift = Math.sin(t * state.driftSpeed[i] + state.driftPhase[i]) * 0.02 * deltaScale;
      state.positions[i * 3] += drift;

      state.baseRotY[i] += state.spinSpeed[i] * deltaScale;

      const rotX = Math.sin(t * state.freqX[i] + state.phaseX[i]) * state.ampX[i];
      const rotY = state.baseRotY[i] + Math.sin(t * state.freqY[i] + state.phaseY[i]) * state.ampY[i];
      const rotZ = Math.sin(t * state.freqZ[i] + state.phaseZ[i]) * state.ampZ[i];

      if (state.positions[i * 3 + 1] < DESPAWN_HEIGHT) {
        resetBill(state, i, config);
      }

      const scale = state.scales[i];
      dummy.position.set(
        state.positions[i * 3],
        state.positions[i * 3 + 1],
        state.positions[i * 3 + 2]
      );
      dummy.rotation.set(rotX, rotY, rotZ);
      dummy.scale.set(scale, scale, scale);
      dummy.updateMatrix();
      meshRef.current.setMatrixAt(i, dummy.matrix);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
  });

  return (
    <instancedMesh ref={meshRef} args={[geometry, undefined, config.count]}>
      <meshStandardMaterial
        side={DoubleSide}
        map={frontTexture}
        roughness={0.8}
        metalness={0.1}
        onBeforeCompile={(shader) => {
          shader.uniforms.backTexture = { value: backTexture };

          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <common>',
            `
            #include <common>
            uniform sampler2D backTexture;
            `
          );

          shader.fragmentShader = shader.fragmentShader.replace(
            '#include <map_fragment>',
            `
            #ifdef USE_MAP
              vec4 frontColor = texture2D(map, vMapUv);
              vec4 backColor = texture2D(backTexture, vMapUv);
              diffuseColor *= gl_FrontFacing ? frontColor : backColor;
            #endif
            `
          );
        }}
      />
    </instancedMesh>
  );
}

interface SceneProps {
  layer: Layer;
}

function Scene({ layer }: SceneProps) {
  const [frontTexture, backTexture] = useLoader(TextureLoader, [
    '/100-front.jpg',
    '/100-rear.jpg',
  ]);

  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 10, 5]} intensity={1} />
      <directionalLight position={[-5, -5, -5]} intensity={0.3} />
      <Bills frontTexture={frontTexture} backTexture={backTexture} layer={layer} />
    </>
  );
}

interface MoneyFallProps {
  zIndex?: number;
  layer?: Layer;
}

export function MoneyFall({ zIndex = 1, layer = 'back' }: MoneyFallProps) {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { rootMargin: '100px' }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
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
      {isVisible && (
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 0, 30], fov: 60 }}
          gl={{ alpha: true, antialias: true }}
        >
          <Scene layer={layer} />
        </Canvas>
      )}
    </div>
  );
}

export default MoneyFall;
