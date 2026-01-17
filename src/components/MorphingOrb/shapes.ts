import type { ShapeType } from './constants';

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

// Fibonacci sphere for even distribution
function fibonacciSphere(count: number, radius: number = 1): Point3D[] {
  const points: Point3D[] = [];
  const phi = Math.PI * (3 - Math.sqrt(5)); // golden angle

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

// Sparse sphere - dots only on certain latitude rings
function sparseSphere(count: number, radius: number = 1): Point3D[] {
  const points: Point3D[] = [];
  const rings = 5;
  const dotsPerRing = Math.floor(count / rings);

  for (let ring = 0; ring < rings; ring++) {
    const y = -0.8 + (ring / (rings - 1)) * 1.6;
    const ringRadius = Math.sqrt(1 - y * y) * radius;

    for (let i = 0; i < dotsPerRing; i++) {
      const theta = (i / dotsPerRing) * Math.PI * 2;
      points.push({
        x: Math.cos(theta) * ringRadius,
        y: y * radius,
        z: Math.sin(theta) * ringRadius,
      });
    }
  }
  return points;
}

// Curved dots - great circles at angles
function curvedDots(count: number, radius: number = 1): Point3D[] {
  const points: Point3D[] = [];
  const circles = 3;
  const dotsPerCircle = Math.floor(count / circles);

  for (let c = 0; c < circles; c++) {
    const tiltX = (c / circles) * Math.PI * 0.6;
    const tiltZ = (c / circles) * Math.PI * 0.4;

    for (let i = 0; i < dotsPerCircle; i++) {
      const theta = (i / dotsPerCircle) * Math.PI * 2;
      let x = Math.cos(theta) * radius;
      let y = Math.sin(theta) * radius;
      let z = 0;

      // Rotate around X axis
      const y1 = y * Math.cos(tiltX) - z * Math.sin(tiltX);
      const z1 = y * Math.sin(tiltX) + z * Math.cos(tiltX);
      y = y1;
      z = z1;

      // Rotate around Z axis
      const x2 = x * Math.cos(tiltZ) - y * Math.sin(tiltZ);
      const y2 = x * Math.sin(tiltZ) + y * Math.cos(tiltZ);
      x = x2;
      y = y2;

      points.push({ x, y, z });
    }
  }
  return points;
}

// Single orbit ellipse
function orbit(count: number, radius: number = 1): Point3D[] {
  const points: Point3D[] = [];
  const a = radius * 1.2;
  const b = radius * 0.6;

  for (let i = 0; i < count; i++) {
    const theta = (i / count) * Math.PI * 2;
    const x = Math.cos(theta) * a;
    const z = Math.sin(theta) * b;

    // Tilt the ellipse
    const tilt = Math.PI * 0.2;
    const y = z * Math.sin(tilt);
    const z2 = z * Math.cos(tilt);

    points.push({ x, y, z: z2 });
  }
  return points;
}

// Double orbit - two intersecting ellipses
function doubleOrbit(count: number, radius: number = 1): Point3D[] {
  const points: Point3D[] = [];
  const dotsPerOrbit = Math.floor(count / 2);
  const a = radius * 1.1;
  const b = radius * 0.5;

  for (let orbit = 0; orbit < 2; orbit++) {
    const rotationY = orbit * Math.PI * 0.5;

    for (let i = 0; i < dotsPerOrbit; i++) {
      const theta = (i / dotsPerOrbit) * Math.PI * 2;
      const x = Math.cos(theta) * a;
      const z = Math.sin(theta) * b;

      // Rotate around Y
      const x2 = x * Math.cos(rotationY) + z * Math.sin(rotationY);
      const z2 = -x * Math.sin(rotationY) + z * Math.cos(rotationY);

      // Slight tilt
      const tilt = Math.PI * 0.15;
      const y = z2 * Math.sin(tilt);
      const z3 = z2 * Math.cos(tilt);

      points.push({ x: x2, y, z: z3 });
    }
  }
  return points;
}

// Main shape generator
export function generateShape(type: ShapeType, count: number, radius: number = 1): Point3D[] {
  switch (type) {
    case 'sphere':
      return fibonacciSphere(count, radius);
    case 'sphereSparse':
      return sparseSphere(count, radius);
    case 'curvedDots':
      return curvedDots(count, radius);
    case 'orbit':
      return orbit(count, radius);
    case 'doubleOrbit':
      return doubleOrbit(count, radius);
    default:
      return fibonacciSphere(count, radius);
  }
}
