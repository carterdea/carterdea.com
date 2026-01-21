import { Canvas, extend, useFrame, useThree } from '@react-three/fiber';
import { shaderMaterial } from '@react-three/drei';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';
import { getDeviceTier } from './utils';

// Simplex noise GLSL - adapted from stegu/webgl-noise
const SIMPLEX_NOISE_GLSL = /*glsl*/ `
  vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
  vec3 permute(vec3 x) { return mod289(((x*34.0)+1.0)*x); }

  float snoise(vec2 v) {
    const vec4 C = vec4(0.211324865405187, 0.366025403784439,
                       -0.577350269189626, 0.024390243902439);
    vec2 i  = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;
    i = mod289(i);
    vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0))
                     + i.x + vec3(0.0, i1.x, 1.0));
    vec3 m = max(0.5 - vec3(dot(x0,x0), dot(x12.xy,x12.xy),
                            dot(x12.zw,x12.zw)), 0.0);
    m = m*m; m = m*m;
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;
    m *= 1.79284291400159 - 0.85373472095314 * (a0*a0 + h*h);
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;
    return 130.0 * dot(m, g);
  }
`;

const HeatDistortionMaterial = shaderMaterial(
  {
    time: 0,
    intensity: 0.5,
  },
  // Vertex shader
  /*glsl*/ `
    varying vec2 vUv;
    void main() {
      vUv = uv;
      gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
  `,
  // Fragment shader
  /*glsl*/ `
    uniform float time;
    uniform float intensity;
    varying vec2 vUv;

    ${SIMPLEX_NOISE_GLSL}

    void main() {
      vec2 uv = vUv;

      // Vertical wave distortion (heat shimmer) - stronger at bottom
      float wave = sin(uv.y * 40.0 + time * 2.0) * 0.002;
      wave *= intensity * (1.0 - uv.y);

      // Noise-based turbulence
      float noise = snoise(vec2(uv.x * 10.0, uv.y * 10.0 + time * 0.5)) * 0.003;
      noise *= intensity;

      // Distortion amount based on screen position
      vec2 distortion = vec2(wave + noise, 0.0);

      // Output distortion for post-processing
      // Red/Green channels encode distortion offset
      gl_FragColor = vec4(
        0.5 + distortion.x * 10.0,
        0.5 + distortion.y * 10.0,
        0.0,
        intensity * 0.15
      );
    }
  `
);

extend({ HeatDistortionMaterial });

// Type augmentation for JSX
declare global {
  namespace JSX {
    interface IntrinsicElements {
      heatDistortionMaterial: THREE.ShaderMaterialParameters & {
        time?: number;
        intensity?: number;
        ref?: React.RefObject<THREE.ShaderMaterial>;
      };
    }
  }
}

function HeatDistortionMesh(): React.JSX.Element {
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { viewport } = useThree();

  useFrame((state) => {
    if (materialRef.current) {
      materialRef.current.uniforms.time.value = state.clock.elapsedTime;

      // Get glow intensity from CSS variable
      const intensity = parseFloat(
        getComputedStyle(document.documentElement).getPropertyValue('--fire-glow-intensity') || '0.3'
      );
      materialRef.current.uniforms.intensity.value = intensity;
    }
  });

  return (
    <mesh scale={[viewport.width, viewport.height, 1]}>
      <planeGeometry args={[1, 1]} />
      <heatDistortionMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </mesh>
  );
}

export function HeatDistortion(): React.JSX.Element | null {
  const tier = getDeviceTier();

  // Only render on high-tier devices
  if (tier !== 'high') return null;

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 20,
      }}
    >
      <Canvas
        dpr={1}
        gl={{ alpha: true, antialias: false }}
        camera={{ position: [0, 0, 1] }}
        style={{ pointerEvents: 'none' }}
      >
        <HeatDistortionMesh />
      </Canvas>
    </div>
  );
}
