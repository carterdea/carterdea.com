import { Canvas, useFrame } from '@react-three/fiber';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { Group, InstancedMesh } from 'three';
import { Color, DoubleSide, Matrix4, Quaternion, Vector3 } from 'three';
import {
  curvedArcs,
  doubleOrbit,
  easeOutQuint,
  fibSphere,
  getDotCount,
  gridSphere,
  lemniscate,
  lerpPoint,
  offsetSphere,
  orbit,
  pulseSphere,
  torusKnot,
  trefoilKnot,
} from './shapes';
import type { ColorMode, MorphingOrbGLProps, Point3D, ShapeType } from './types';

const DEFAULT_SEQUENCE: ShapeType[] = ['gridSphere', 'curvedArcs', 'fibSphere', 'doubleOrbit'];

const ANIMATED_SHAPES: ReadonlySet<ShapeType> = new Set([
  'curvedArcs',
  'orbit',
  'doubleOrbit',
  'trefoilKnot',
  'torusKnot',
  'lemniscate',
  'pulseSphere',
]);

const SPHERE_SHAPES: ReadonlySet<ShapeType> = new Set(['gridSphere', 'offsetSphere', 'fibSphere']);

const COLOR_MODES: ColorMode[] = ['sequential', 'spatial', 'shuffled'];

const DEFAULT_PALETTE = [
  '#f87171', // red-400
  '#fb923c', // orange-400
  '#fbbf24', // amber-400
  '#facc15', // yellow-400
  '#a3e635', // lime-400
  '#4ade80', // green-400
  '#34d399', // emerald-400
  '#2dd4bf', // teal-400
  '#22d3ee', // cyan-400
  '#38bdf8', // sky-400
  '#60a5fa', // blue-400
  '#818cf8', // indigo-400
  '#a78bfa', // violet-400
  '#c084fc', // purple-400
  '#e879f9', // fuchsia-400
  '#f472b6', // pink-400
  '#fb7185', // rose-400
];

// Maximum instance count to avoid recreating instancedMesh on point count changes
const MAX_INSTANCES = 300;

interface ParticlesProps {
  points: Point3D[];
  variant: 'mono' | 'color';
  color: string;
  palette: string[];
  colorMode: ColorMode;
  colorRotation: number;
  dotSize: number;
  groupRotationY: number;
  groupRotationX: number;
  isHovered: boolean;
}

const tempColor = new Color();
const tempMatrix = new Matrix4();
const tempPosition = new Vector3();
const tempQuaternion = new Quaternion();
const tempScale = new Vector3(1, 1, 1);
const tempNormal = new Vector3();
const upVector = new Vector3(0, 0, 1);

function Particles({
  points,
  variant,
  color,
  palette,
  colorMode,
  colorRotation,
  dotSize,
  groupRotationY,
  groupRotationX,
  isHovered,
}: ParticlesProps) {
  const meshRef = useRef<InstancedMesh>(null);

  const shuffledPalette = useMemo(() => {
    const shuffled = [...palette];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor((i * 7919) % (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  }, [palette]);

  const getDotColorHex = useCallback(
    (index: number, point: Point3D): string => {
      if (variant === 'mono' && !isHovered) {
        return color;
      }

      switch (colorMode) {
        case 'spatial': {
          const angle = Math.atan2(point.x, point.z);
          const offsetAngle = angle + colorRotation;
          const normalizedAngle = ((offsetAngle + Math.PI) % (2 * Math.PI)) / (2 * Math.PI);
          const paletteIndex = Math.floor(normalizedAngle * palette.length);
          return palette[Math.abs(paletteIndex) % palette.length];
        }
        case 'shuffled':
          return shuffledPalette[index % shuffledPalette.length];
        case 'sequential':
          return palette[index % palette.length];
      }
    },
    [variant, color, palette, shuffledPalette, colorMode, colorRotation, isHovered]
  );

  useEffect(() => {
    if (!meshRef.current) return;

    const cosY = Math.cos(groupRotationY);
    const sinY = Math.sin(groupRotationY);
    const cosX = Math.cos(groupRotationX);
    const sinX = Math.sin(groupRotationX);

    // Hide unused instances by scaling to zero
    for (let i = points.length; i < MAX_INSTANCES; i++) {
      tempMatrix.makeScale(0, 0, 0);
      meshRef.current.setMatrixAt(i, tempMatrix);
    }

    for (let i = 0; i < points.length; i++) {
      const point = points[i];

      const wx = point.x * cosY + point.z * sinY;
      const wyBeforeX = point.y;
      const wzBeforeX = -point.x * sinY + point.z * cosY;
      const wy = wyBeforeX * cosX - wzBeforeX * sinX;
      const wz = wyBeforeX * sinX + wzBeforeX * cosX;

      const len = Math.sqrt(wx * wx + wy * wy + wz * wz) || 1;
      const nzWorld = wz / len;

      const facing = Math.abs(nzWorld);
      const squash = 0.15 + facing * 0.85;

      tempPosition.set(point.x, point.y, point.z);

      const localLen = Math.sqrt(point.x * point.x + point.y * point.y + point.z * point.z) || 1;
      tempNormal.set(point.x / localLen, point.y / localLen, point.z / localLen);
      tempQuaternion.setFromUnitVectors(upVector, tempNormal);

      tempScale.set(dotSize, dotSize * squash, 1);

      tempMatrix.compose(tempPosition, tempQuaternion, tempScale);
      meshRef.current.setMatrixAt(i, tempMatrix);

      const hex = getDotColorHex(i, point);
      tempColor.set(hex);

      const depthBrightness = 0.35 + (nzWorld + 1) * 0.325;

      const nxWorld = wx / len;
      const nyWorld = wy / len;
      const lightX = -0.577;
      const lightY = 0.577;
      const lightZ = 0.577;
      const lightDot = Math.max(0, nxWorld * lightX + nyWorld * lightY + nzWorld * lightZ);
      const directionalBrightness = 0.3 + lightDot * 0.7;

      tempColor.multiplyScalar(depthBrightness * directionalBrightness);

      meshRef.current.setColorAt(i, tempColor);
    }

    meshRef.current.instanceMatrix.needsUpdate = true;
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true;
    }
  }, [points, getDotColorHex, dotSize, groupRotationY, groupRotationX]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, MAX_INSTANCES]}>
      <circleGeometry args={[1, 16]} />
      <meshBasicMaterial side={DoubleSide} />
    </instancedMesh>
  );
}

interface SceneProps {
  size: number;
  variant: 'mono' | 'color';
  color: string;
  palette: string[];
  colorMode: ColorMode;
  shapeSequence: ShapeType[];
  autoMorph: boolean;
  morphDuration: number;
  holdDuration: number;
  isHovered: boolean;
}

function Scene({
  size,
  variant,
  color,
  palette,
  colorMode,
  shapeSequence,
  autoMorph,
  morphDuration,
  holdDuration,
  isHovered,
}: SceneProps) {
  const groupRef = useRef<Group>(null);
  const [points, setPoints] = useState<Point3D[]>([]);
  const [colorRotation, setColorRotation] = useState(0);
  const [groupRotation, setGroupRotation] = useState({ y: 0, x: 0 });

  const currentPointsRef = useRef<Point3D[]>([]);
  const targetPointsRef = useRef<Point3D[]>([]);
  const currentShapeRef = useRef<ShapeType>(shapeSequence[0]);
  const morphProgressRef = useRef(1);
  const holdTimerRef = useRef(0);
  const arcTimeRef = useRef(0);
  const colorRotationRef = useRef(0);
  const rotationRef = useRef({ y: 0, x: 0 });

  const radius = 1;

  const dotSize = useMemo(() => {
    const sizes = { tiny: 0.07, small: 0.09, medium: 0.08, large: 0.065 };
    if (size <= 32) return sizes.tiny;
    if (size <= 64) return sizes.small;
    if (size <= 200) return sizes.medium;
    return sizes.large;
  }, [size]);

  const getValidNextShapes = useCallback(
    (currentShape: ShapeType): ShapeType[] => {
      const allShapes = shapeSequence;
      const isSphere = SPHERE_SHAPES.has(currentShape);

      return allShapes.filter((shape) => {
        if (shape === currentShape) return false;
        // pulseSphere can go anywhere and anything can go to pulseSphere
        if (currentShape === 'pulseSphere' || shape === 'pulseSphere') return true;
        // Non-spheres can go anywhere
        if (!isSphere) return true;
        // Spheres can only go to non-spheres
        return !SPHERE_SHAPES.has(shape);
      });
    },
    [shapeSequence]
  );

  const generateShapePoints = useCallback(
    (shapeType: ShapeType, time: number = 0): Point3D[] => {
      const count = getDotCount(shapeType, size);

      switch (shapeType) {
        case 'gridSphere':
          return gridSphere(radius, size);
        case 'offsetSphere':
          return offsetSphere(radius, size);
        case 'curvedArcs':
          return curvedArcs(radius, time, size);
        case 'fibSphere':
          return fibSphere(count, radius);
        case 'orbit':
          return orbit(count, radius, time);
        case 'doubleOrbit':
          return doubleOrbit(count, radius, time);
        case 'trefoilKnot':
          return trefoilKnot(count, radius, time);
        case 'torusKnot':
          return torusKnot(count, radius, time);
        case 'lemniscate':
          return lemniscate(count, radius, time);
        case 'pulseSphere':
          return pulseSphere(radius, time, size);
        default:
          return gridSphere(radius, size);
      }
    },
    [size]
  );

  useEffect(() => {
    const initialShape = shapeSequence[0];
    const pts = generateShapePoints(initialShape);
    currentPointsRef.current = pts;
    targetPointsRef.current = pts;
    morphProgressRef.current = 1;
    setPoints(pts);
  }, [generateShapePoints, shapeSequence]);

  const morphToNextShape = useCallback(() => {
    const validNextShapes = getValidNextShapes(currentShapeRef.current);
    const nextShape = validNextShapes[Math.floor(Math.random() * validNextShapes.length)];
    currentShapeRef.current = nextShape;
    const newTarget = generateShapePoints(nextShape);

    const currentCount = currentPointsRef.current.length;
    const targetCount = newTarget.length;

    if (targetCount > currentCount) {
      while (currentPointsRef.current.length < targetCount) {
        const idx = currentPointsRef.current.length % currentCount;
        currentPointsRef.current.push({ ...currentPointsRef.current[idx] });
      }
    } else if (targetCount < currentCount) {
      currentPointsRef.current = currentPointsRef.current.slice(0, targetCount);
    }

    targetPointsRef.current = newTarget;
    morphProgressRef.current = 0;
    holdTimerRef.current = 0;
  }, [generateShapePoints, getValidNextShapes]);

  useFrame((state, delta) => {
    const deltaMs = delta * 1000;
    const speedMultiplier = isHovered ? 2.5 : 1;

    rotationRef.current.y += 0.0005 * deltaMs * speedMultiplier;
    rotationRef.current.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.1;

    arcTimeRef.current += deltaMs * speedMultiplier;
    colorRotationRef.current += 0.0001875 * deltaMs * speedMultiplier;

    const currentShapeType = currentShapeRef.current;
    const isAnimated = ANIMATED_SHAPES.has(currentShapeType);

    if (morphProgressRef.current < 1) {
      morphProgressRef.current = Math.min(
        1,
        morphProgressRef.current + (deltaMs / morphDuration) * speedMultiplier
      );

      const easedProgress = easeOutQuint(morphProgressRef.current);

      if (isAnimated) {
        targetPointsRef.current = generateShapePoints(currentShapeType, arcTimeRef.current);
      }

      currentPointsRef.current = currentPointsRef.current.map((point, i) => {
        const target = targetPointsRef.current[i] || point;
        return lerpPoint(point, target, easedProgress);
      });
    } else {
      if (isAnimated) {
        currentPointsRef.current = generateShapePoints(currentShapeType, arcTimeRef.current);
      }

      if (autoMorph) {
        holdTimerRef.current += deltaMs * speedMultiplier;
        if (holdTimerRef.current >= holdDuration) {
          morphToNextShape();
        }
      }
    }

    if (groupRef.current) {
      groupRef.current.rotation.y = rotationRef.current.y;
      groupRef.current.rotation.x = rotationRef.current.x;
    }

    setPoints([...currentPointsRef.current]);
    setColorRotation(colorRotationRef.current);
    setGroupRotation({ y: rotationRef.current.y, x: rotationRef.current.x });
  });

  return (
    <group ref={groupRef}>
      <Particles
        points={points}
        variant={variant}
        color={color}
        palette={palette}
        colorMode={colorMode}
        colorRotation={colorRotation}
        dotSize={dotSize}
        groupRotationY={groupRotation.y}
        groupRotationX={groupRotation.x}
        isHovered={isHovered}
      />
    </group>
  );
}

export function MorphingOrbGL({
  size = 500,
  variant = 'mono',
  color = '#ffffff',
  palette = DEFAULT_PALETTE,
  colorMode = 'sequential',
  className = '',
  shapeSequence = DEFAULT_SEQUENCE,
  autoMorph = true,
  morphDuration = 2800,
  holdDuration = 3000,
}: MorphingOrbGLProps) {
  const [isHovered, setIsHovered] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [activeColorMode, setActiveColorMode] = useState<ColorMode>(colorMode);
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

  useEffect(() => {
    if (!isHovered || variant !== 'mono') {
      setActiveColorMode(colorMode);
      return;
    }

    const randomMode = COLOR_MODES[Math.floor(Math.random() * COLOR_MODES.length)];
    setActiveColorMode(randomMode);

    const interval = setInterval(() => {
      const newMode = COLOR_MODES[Math.floor(Math.random() * COLOR_MODES.length)];
      setActiveColorMode(newMode);
    }, 1500);

    return () => clearInterval(interval);
  }, [isHovered, variant, colorMode]);

  const cameraZ = 3.5;
  const hoverScale = size <= 64 ? 1.15 : 1;

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="Animated morphing sphere"
      style={{
        width: size,
        height: size,
        transform: isHovered ? `scale(${hoverScale})` : 'scale(1)',
        transition: 'transform 200ms ease-out',
      }}
      className={className}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isVisible && (
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 0, cameraZ], fov: 45 }}
          style={{ background: 'transparent' }}
          gl={{ alpha: true, antialias: true }}
        >
          <ambientLight intensity={0.4} />
          <directionalLight position={[-2, 3, 2]} intensity={1.2} />
          <directionalLight position={[1, -1, -1]} intensity={0.3} />
          <Scene
            size={size}
            variant={variant}
            color={color}
            palette={palette}
            colorMode={activeColorMode}
            shapeSequence={shapeSequence}
            autoMorph={autoMorph}
            morphDuration={morphDuration}
            holdDuration={holdDuration}
            isHovered={isHovered}
          />
        </Canvas>
      )}
    </div>
  );
}

export default MorphingOrbGL;
