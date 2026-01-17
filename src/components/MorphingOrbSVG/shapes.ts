import type { Point3D } from './types';

/**
 * Grid Sphere (like icon 363881)
 * Dots at intersections of latitude rings and longitude lines
 * Creates the classic "disco ball" look
 * @param radius - sphere radius
 * @param size - canvas size, used to scale dot density
 */
export function gridSphere(radius: number = 1, size: number = 500): Point3D[] {
  const points: Point3D[] = [];

  // Scale latitude bands and dots per ring based on size
  let latitudes: number;
  let maxDotsPerRing: number;

  if (size <= 32) {
    latitudes = 6;
    maxDotsPerRing = 8;
  } else if (size <= 64) {
    latitudes = 8;
    maxDotsPerRing = 12;
  } else if (size <= 200) {
    latitudes = 11;
    maxDotsPerRing = 17;
  } else {
    latitudes = 14;
    maxDotsPerRing = 22;
  }

  for (let lat = 0; lat < latitudes; lat++) {
    // phi goes from 0 (top) to PI (bottom)
    const phi = (lat / (latitudes - 1)) * Math.PI;
    const y = Math.cos(phi) * radius;
    const ringRadius = Math.sin(phi) * radius;

    // Fewer dots near poles, more at equator
    // This creates even visual spacing on the sphere surface
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

/**
 * Offset Sphere - hexagonal close-packing distribution
 * Uses consistent angular spacing to create a honeycomb pattern on the sphere surface
 * No vertical or horizontal alignment
 * @param radius - sphere radius
 * @param size - canvas size, used to scale dot density
 */
export function offsetSphere(radius: number = 1, size: number = 500): Point3D[] {
  const points: Point3D[] = [];

  // Target number of points based on size
  let targetCount: number;
  if (size <= 32) {
    targetCount = 30;
  } else if (size <= 64) {
    targetCount = 50;
  } else if (size <= 200) {
    targetCount = 90;
  } else {
    targetCount = 180;
  }

  // Hexagonal close-packing on sphere surface
  // Use a spiral with consistent angular increment that creates hex-like spacing
  const a = (4 * Math.PI * radius * radius) / targetCount; // area per point
  const d = Math.sqrt(a); // approximate spacing

  let phi = 0;
  while (phi < Math.PI) {
    // Ring at this latitude
    const y = Math.cos(phi) * radius;
    const ringRadius = Math.sin(phi) * radius;
    const circumference = 2 * Math.PI * ringRadius;

    // Number of points in this ring (at least 1)
    const dotsInRing = Math.max(1, Math.round(circumference / d));

    // Offset alternating rings by half spacing for hex pattern
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

    // Move to next latitude band - spacing based on target density
    phi += d / radius;
  }

  return points;
}

/**
 * Curved Arcs (like icon 363882)
 * 3 great circle arcs at different angles, each spinning independently
 * @param radius - sphere radius
 * @param time - animation time for spinning (optional, 0 = static)
 * @param size - canvas size for scaling dot count
 */
export function curvedArcs(radius: number = 1, time: number = 0, size: number = 500): Point3D[] {
  const points: Point3D[] = [];

  // 3 arcs at different tilts, with spin speeds (alternating directions)
  const arcs = [
    { tiltX: 0.15, tiltY: 0, spinSpeed: 0.0003 },
    { tiltX: 0.5, tiltY: 0.7, spinSpeed: -0.00025 },
    { tiltX: -0.25, tiltY: -0.5, spinSpeed: 0.00035 },
  ];

  // More dots per arc for larger sizes
  const dotsPerArc = size > 200 ? 20 : 12;

  for (let arcIndex = 0; arcIndex < arcs.length; arcIndex++) {
    const arc = arcs[arcIndex];
    // Each arc spins based on time
    const arcRotation = time * arc.spinSpeed;

    for (let i = 0; i < dotsPerArc; i++) {
      // Position along arc (full circle, evenly spaced)
      const t = i / dotsPerArc + arcRotation;
      const theta = t * Math.PI * 2;

      // Start on XY plane
      let x = Math.cos(theta) * radius;
      let y = Math.sin(theta) * radius;
      let z = 0;

      // Rotate around X axis (tilt the orbit)
      const cosX = Math.cos(arc.tiltX * Math.PI);
      const sinX = Math.sin(arc.tiltX * Math.PI);
      const y1 = y * cosX - z * sinX;
      const z1 = y * sinX + z * cosX;
      y = y1;
      z = z1;

      // Rotate around Y axis (tilt the orbit more)
      const cosY = Math.cos(arc.tiltY * Math.PI);
      const sinY = Math.sin(arc.tiltY * Math.PI);
      const x2 = x * cosY + z * sinY;
      const z2 = -x * sinY + z * cosY;
      x = x2;
      z = z2;

      points.push({ x, y, z });
    }
  }

  return points;
}

/**
 * Fibonacci Sphere (like icon 363875)
 * Golden angle distribution for organic, even coverage
 */
export function fibSphere(count: number, radius: number = 1): Point3D[] {
  const points: Point3D[] = [];
  const phi = Math.PI * (3 - Math.sqrt(5)); // golden angle ~2.4 radians

  for (let i = 0; i < count; i++) {
    // y goes from 1 to -1
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

/**
 * Single tilted orbit ring with spinning dots
 * @param time - animation time for dot spinning along the orbit
 */
export function orbit(count: number, radius: number = 1, time: number = 0): Point3D[] {
  const points: Point3D[] = [];
  const tiltX = 0.15 * Math.PI;
  const tiltZ = 0.1 * Math.PI;
  const spinSpeed = 0.0004; // dots spin along the orbit

  for (let i = 0; i < count; i++) {
    const theta = (i / count + time * spinSpeed) * Math.PI * 2;
    let x = Math.cos(theta) * radius;
    let y = Math.sin(theta) * radius;
    let z = 0;

    // Tilt
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

/**
 * Double intersecting orbits with spinning dots
 * Each orbit spins in opposite directions
 * @param time - animation time for dot spinning
 */
export function doubleOrbit(count: number, radius: number = 1, time: number = 0): Point3D[] {
  const points: Point3D[] = [];
  const perOrbit = Math.floor(count / 2);

  const orbits = [
    { tiltX: 0.2, tiltY: 0, spinSpeed: 0.00035 },
    { tiltX: -0.15, tiltY: 0.5, spinSpeed: -0.0003 },
  ];

  for (const orb of orbits) {
    for (let i = 0; i < perOrbit; i++) {
      const theta = (i / perOrbit + time * orb.spinSpeed) * Math.PI * 2;
      let x = Math.cos(theta) * radius;
      let y = Math.sin(theta) * radius;
      let z = 0;

      // Tilt around X
      const cosX = Math.cos(orb.tiltX * Math.PI);
      const sinX = Math.sin(orb.tiltX * Math.PI);
      const y1 = y * cosX;
      const z1 = y * sinX;
      y = y1;
      z = z1;

      // Tilt around Y
      const cosY = Math.cos(orb.tiltY * Math.PI);
      const sinY = Math.sin(orb.tiltY * Math.PI);
      const x2 = x * cosY + z * sinY;
      const z2 = -x * sinY + z * cosY;
      x = x2;
      z = z2;

      points.push({ x, y, z });
    }
  }

  return points;
}

/**
 * Get appropriate dot count for shape and size
 */
export function getDotCount(shape: string, size: number): number {
  // Grid sphere and curved arcs have fixed structure
  if (shape === 'gridSphere') return -1;
  if (shape === 'curvedArcs') return -1;

  // Orbits - more dots for larger sizes
  if (shape === 'orbit') {
    if (size <= 32) return 14;
    if (size <= 64) return 16;
    if (size <= 200) return 16;
    return 28;
  }

  if (shape === 'doubleOrbit') {
    if (size <= 32) return 20;
    if (size <= 64) return 24;
    if (size <= 200) return 26;
    return 44;
  }

  // Fibonacci sphere - match grid sphere dot counts
  // Grid sphere counts: size<=32: ~30, size<=64: ~60, size<=200: ~120, size>200: ~200
  if (size <= 32) return 30;
  if (size <= 64) return 60;
  if (size <= 200) return 120;
  return 200;
}
