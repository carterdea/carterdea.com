import type { Point3D } from './types';

type SizeCategory = 'tiny' | 'small' | 'medium' | 'large';

function getSizeCategory(size: number): SizeCategory {
  if (size <= 32) return 'tiny';
  if (size <= 64) return 'small';
  if (size <= 200) return 'medium';
  return 'large';
}

function rotateXY(
  point: { x: number; y: number; z: number },
  tiltX: number,
  tiltY: number
): { x: number; y: number; z: number } {
  const cosX = Math.cos(tiltX * Math.PI);
  const sinX = Math.sin(tiltX * Math.PI);
  const cosY = Math.cos(tiltY * Math.PI);
  const sinY = Math.sin(tiltY * Math.PI);

  // Rotate around X
  const y1 = point.y * cosX - point.z * sinX;
  const z1 = point.y * sinX + point.z * cosX;

  // Rotate around Y
  const x2 = point.x * cosY + z1 * sinY;
  const z2 = -point.x * sinY + z1 * cosY;

  return { x: x2, y: y1, z: z2 };
}

export function gridSphere(radius: number = 1, size: number = 500): Point3D[] {
  const points: Point3D[] = [];

  const config: Record<SizeCategory, { latitudes: number; maxDotsPerRing: number }> = {
    tiny: { latitudes: 14, maxDotsPerRing: 19 },
    small: { latitudes: 11, maxDotsPerRing: 16 },
    medium: { latitudes: 13, maxDotsPerRing: 20 },
    large: { latitudes: 16, maxDotsPerRing: 26 },
  };

  const { latitudes, maxDotsPerRing } = config[getSizeCategory(size)];

  for (let lat = 0; lat < latitudes; lat++) {
    const phi = (lat / (latitudes - 1)) * Math.PI;
    const y = Math.cos(phi) * radius;
    const ringRadius = Math.sin(phi) * radius;
    const dotsInRing = Math.max(1, Math.round(maxDotsPerRing * Math.sin(phi)));

    for (let i = 0; i < dotsInRing; i++) {
      const theta = (i / dotsInRing) * Math.PI * 2;
      points.push({
        x: Math.cos(theta) * ringRadius,
        y: y,
        z: Math.sin(theta) * ringRadius,
      });
    }
  }

  return points;
}

export function offsetSphere(radius: number = 1, size: number = 500): Point3D[] {
  const points: Point3D[] = [];

  const targetCounts: Record<SizeCategory, number> = {
    tiny: 120,
    small: 65,
    medium: 120,
    large: 240,
  };
  const targetCount = targetCounts[getSizeCategory(size)];

  const a = (4 * Math.PI * radius * radius) / targetCount;
  const d = Math.sqrt(a);

  let phi = 0;
  while (phi < Math.PI) {
    const y = Math.cos(phi) * radius;
    const ringRadius = Math.sin(phi) * radius;
    const circumference = 2 * Math.PI * ringRadius;
    const dotsInRing = Math.max(1, Math.round(circumference / d));
    const ringIndex = Math.round(phi / (d / radius));
    const offset = ringIndex % 2 === 1 ? Math.PI / dotsInRing : 0;

    for (let i = 0; i < dotsInRing; i++) {
      const theta = (i / dotsInRing) * Math.PI * 2 + offset;
      points.push({
        x: Math.cos(theta) * ringRadius,
        y: y,
        z: Math.sin(theta) * ringRadius,
      });
    }

    phi += d / radius;
  }

  return points;
}

export function curvedArcs(radius: number = 1, time: number = 0, size: number = 500): Point3D[] {
  const points: Point3D[] = [];

  const arcs = [
    { tiltX: 0.15, tiltY: 0, spinSpeed: 0.00015 },
    { tiltX: 0.5, tiltY: 0.7, spinSpeed: -0.00012 },
    { tiltX: -0.25, tiltY: -0.5, spinSpeed: 0.00018 },
  ];

  const dotsPerArcConfig: Record<SizeCategory, number> = {
    tiny: 18,
    small: 14,
    medium: 16,
    large: 26,
  };
  const dotsPerArc = dotsPerArcConfig[getSizeCategory(size)];

  for (const arc of arcs) {
    const arcRotation = time * arc.spinSpeed;

    for (let i = 0; i < dotsPerArc; i++) {
      const t = i / dotsPerArc + arcRotation;
      const theta = t * Math.PI * 2;

      const base = { x: Math.cos(theta) * radius, y: Math.sin(theta) * radius, z: 0 };
      const rotated = rotateXY(base, arc.tiltX, arc.tiltY);
      points.push(rotated);
    }
  }

  return points;
}

export function fibSphere(count: number, radius: number = 1): Point3D[] {
  const points: Point3D[] = [];
  const phi = Math.PI * (3 - Math.sqrt(5));

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2;
    const r = Math.sqrt(1 - y * y);
    const theta = phi * i;

    points.push({
      x: Math.cos(theta) * r * radius,
      y: y * radius,
      z: Math.sin(theta) * r * radius,
    });
  }

  return points;
}

export function orbit(count: number, radius: number = 1, time: number = 0): Point3D[] {
  const points: Point3D[] = [];
  const tiltX = 0.15 * Math.PI;
  const tiltZ = 0.1 * Math.PI;
  const spinSpeed = 0.0002;

  for (let i = 0; i < count; i++) {
    const theta = (i / count + time * spinSpeed) * Math.PI * 2;
    let x = Math.cos(theta) * radius;
    let y = Math.sin(theta) * radius;
    let z = 0;

    const y1 = y * Math.cos(tiltX);
    const z1 = y * Math.sin(tiltX);
    y = y1;
    z = z1;

    const x2 = x * Math.cos(tiltZ) - y * Math.sin(tiltZ);
    const y2 = x * Math.sin(tiltZ) + y * Math.cos(tiltZ);
    x = x2;
    y = y2;

    points.push({ x, y, z });
  }

  return points;
}

export function doubleOrbit(count: number, radius: number = 1, time: number = 0): Point3D[] {
  const points: Point3D[] = [];
  const perOrbit = Math.floor(count / 2);

  const orbits = [
    { tiltX: 0.2, tiltY: 0, spinSpeed: 0.00018 },
    { tiltX: -0.15, tiltY: 0.5, spinSpeed: -0.00015 },
  ];

  for (const orb of orbits) {
    for (let i = 0; i < perOrbit; i++) {
      const theta = (i / perOrbit + time * orb.spinSpeed) * Math.PI * 2;
      const base = { x: Math.cos(theta) * radius, y: Math.sin(theta) * radius, z: 0 };
      const rotated = rotateXY(base, orb.tiltX, orb.tiltY);
      points.push(rotated);
    }
  }

  return points;
}

type DotCountConfig = Record<SizeCategory, number>;

const DOT_COUNTS: Record<string, DotCountConfig> = {
  orbit: { tiny: 24, small: 20, medium: 22, large: 36 },
  doubleOrbit: { tiny: 36, small: 32, medium: 36, large: 56 },
  trefoilKnot: { tiny: 20, small: 20, medium: 28, large: 42 },
  torusKnot: { tiny: 32, small: 38, medium: 48, large: 70 },
  lemniscate: { tiny: 14, small: 14, medium: 18, large: 26 },
  default: { tiny: 120, small: 80, medium: 160, large: 260 },
};

const INTERNAL_COUNT_SHAPES = new Set(['gridSphere', 'curvedArcs', 'pulseSphere']);

export function getDotCount(shape: string, size: number): number {
  if (INTERNAL_COUNT_SHAPES.has(shape)) return -1;
  const config = DOT_COUNTS[shape] ?? DOT_COUNTS.default;
  return config[getSizeCategory(size)];
}

export function lerpPoint(a: Point3D, b: Point3D, t: number): Point3D {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  };
}

export function cubicBezier(x1: number, y1: number, x2: number, y2: number) {
  return (t: number): number => {
    if (t === 0 || t === 1) return t;

    let low = 0;
    let high = 1;
    let mid = t;

    for (let i = 0; i < 10; i++) {
      const x = 3 * (1 - mid) ** 2 * mid * x1 + 3 * (1 - mid) * mid ** 2 * x2 + mid ** 3;
      if (Math.abs(x - t) < 0.0001) break;
      if (x < t) low = mid;
      else high = mid;
      mid = (low + high) / 2;
    }

    return 3 * (1 - mid) ** 2 * mid * y1 + 3 * (1 - mid) * mid ** 2 * y2 + mid ** 3;
  };
}

export const easeOutQuint = cubicBezier(0.22, 0.61, 0.36, 1);

export function trefoilKnot(count: number, radius: number = 1, time: number = 0): Point3D[] {
  const points: Point3D[] = [];
  const spinSpeed = 0.00012;
  const offset = time * spinSpeed;

  for (let i = 0; i < count; i++) {
    const t = (i / count + offset) * Math.PI * 2;
    const x = Math.sin(t) + 2 * Math.sin(2 * t);
    const y = Math.cos(t) - 2 * Math.cos(2 * t);
    const z = -Math.sin(3 * t);
    const scale = radius * 0.28;

    points.push({
      x: x * scale,
      y: y * scale,
      z: z * scale,
    });
  }

  return points;
}

export function torusKnot(count: number, radius: number = 1, time: number = 0): Point3D[] {
  const points: Point3D[] = [];
  const spinSpeed = 0.0001;
  const offset = time * spinSpeed;
  const p = 2;
  const q = 3;
  const tubeRadius = 0.4;

  for (let i = 0; i < count; i++) {
    const t = (i / count + offset) * Math.PI * 2 * p;

    const r = radius * 0.4 * (2 + Math.cos((q * t) / p));
    const x = r * Math.cos(t);
    const y = r * Math.sin(t);
    const z = radius * 0.4 * tubeRadius * Math.sin((q * t) / p) * 2;

    points.push({ x, y, z });
  }

  return points;
}

export function lemniscate(count: number, radius: number = 1, time: number = 0): Point3D[] {
  const points: Point3D[] = [];
  const spinSpeed = 0.00015;
  const offset = time * spinSpeed;

  for (let i = 0; i < count; i++) {
    const t = (i / count + offset) * Math.PI * 2;
    const a = radius * 0.7;
    const x = a * Math.cos(t);
    const y = a * Math.sin(t) * Math.cos(t);
    const z = a * Math.sin(t) * 0.6;

    points.push({ x, y, z });
  }

  return points;
}

export function pulseSphere(radius: number = 1, time: number = 0, size: number = 500): Point3D[] {
  const count = DOT_COUNTS.default[getSizeCategory(size)];
  const pulseScale = 1 + Math.sin(time * 0.002) * 0.2;
  return fibSphere(count, radius * pulseScale);
}
