import type { ShapeType } from './constants'

export interface Point3D {
  x: number
  y: number
  z: number
}

// Fibonacci sphere for even distribution
function fibonacciSphere(count: number, radius: number = 1): Point3D[] {
  const points: Point3D[] = []
  const phi = Math.PI * (3 - Math.sqrt(5)) // golden angle

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const theta = phi * i
    points.push({
      x: Math.cos(theta) * r * radius,
      y: y * radius,
      z: Math.sin(theta) * r * radius,
    })
  }
  return points
}

// Sparse sphere - dots only on certain latitude rings
function sparseSphere(count: number, radius: number = 1): Point3D[] {
  const points: Point3D[] = []
  const rings = 5
  const dotsPerRing = Math.floor(count / rings)

  for (let ring = 0; ring < rings; ring++) {
    const y = -0.8 + (ring / (rings - 1)) * 1.6
    const ringRadius = Math.sqrt(1 - y * y) * radius

    for (let i = 0; i < dotsPerRing; i++) {
      const theta = (i / dotsPerRing) * Math.PI * 2
      points.push({
        x: Math.cos(theta) * ringRadius,
        y: y * radius,
        z: Math.sin(theta) * ringRadius,
      })
    }
  }
  return points
}

// Curved dots - great circles at angles
function curvedDots(count: number, radius: number = 1): Point3D[] {
  const points: Point3D[] = []
  const circles = 3
  const dotsPerCircle = Math.floor(count / circles)

  for (let c = 0; c < circles; c++) {
    const tiltX = (c / circles) * Math.PI * 0.6
    const tiltZ = (c / circles) * Math.PI * 0.4

    for (let i = 0; i < dotsPerCircle; i++) {
      const theta = (i / dotsPerCircle) * Math.PI * 2
      let x = Math.cos(theta) * radius
      let y = Math.sin(theta) * radius
      let z = 0

      // Rotate around X axis
      const y1 = y * Math.cos(tiltX) - z * Math.sin(tiltX)
      const z1 = y * Math.sin(tiltX) + z * Math.cos(tiltX)
      y = y1
      z = z1

      // Rotate around Z axis
      const x2 = x * Math.cos(tiltZ) - y * Math.sin(tiltZ)
      const y2 = x * Math.sin(tiltZ) + y * Math.cos(tiltZ)
      x = x2
      y = y2

      points.push({ x, y, z })
    }
  }
  return points
}

// Single orbit ellipse
function orbit(count: number, radius: number = 1): Point3D[] {
  const points: Point3D[] = []
  const a = radius * 1.2
  const b = radius * 0.6

  for (let i = 0; i < count; i++) {
    const theta = (i / count) * Math.PI * 2
    const x = Math.cos(theta) * a
    const z = Math.sin(theta) * b

    // Tilt the ellipse
    const tilt = Math.PI * 0.2
    const y = z * Math.sin(tilt)
    const z2 = z * Math.cos(tilt)

    points.push({ x, y, z: z2 })
  }
  return points
}

// Double orbit - two intersecting ellipses
function doubleOrbit(count: number, radius: number = 1): Point3D[] {
  const points: Point3D[] = []
  const dotsPerOrbit = Math.floor(count / 2)
  const a = radius * 1.1
  const b = radius * 0.5

  for (let orbit = 0; orbit < 2; orbit++) {
    const rotationY = orbit * Math.PI * 0.5

    for (let i = 0; i < dotsPerOrbit; i++) {
      const theta = (i / dotsPerOrbit) * Math.PI * 2
      let x = Math.cos(theta) * a
      let z = Math.sin(theta) * b

      // Rotate around Y
      const x2 = x * Math.cos(rotationY) + z * Math.sin(rotationY)
      const z2 = -x * Math.sin(rotationY) + z * Math.cos(rotationY)

      // Slight tilt
      const tilt = Math.PI * 0.15
      const y = z2 * Math.sin(tilt)
      const z3 = z2 * Math.cos(tilt)

      points.push({ x: x2, y, z: z3 })
    }
  }
  return points
}

// Rose curve / flower pattern
function flower(count: number, radius: number = 1): Point3D[] {
  const points: Point3D[] = []
  const k = 5 // 5 petals

  for (let i = 0; i < count; i++) {
    const theta = (i / count) * Math.PI * 2
    const r = Math.cos(k * theta) * radius

    // Distribute points along multiple "layers" for depth
    const layer = i % 3
    const zOffset = (layer - 1) * 0.15

    points.push({
      x: r * Math.cos(theta),
      y: r * Math.sin(theta),
      z: zOffset * radius,
    })
  }
  return points
}

// Star burst - radial lines from center
function star(count: number, radius: number = 1): Point3D[] {
  const points: Point3D[] = []
  const rays = 6
  const dotsPerRay = Math.floor(count / rays)

  for (let ray = 0; ray < rays; ray++) {
    const theta = (ray / rays) * Math.PI * 2
    const phi = (ray % 2 === 0 ? 0.3 : -0.3) * Math.PI

    for (let i = 0; i < dotsPerRay; i++) {
      const t = (i + 1) / dotsPerRay
      const r = t * radius

      // Direction in 3D
      const x = Math.cos(theta) * Math.cos(phi) * r
      const y = Math.sin(phi) * r
      const z = Math.sin(theta) * Math.cos(phi) * r

      points.push({ x, y, z })
    }
  }
  return points
}

// Loose organic cluster
function cluster(count: number, radius: number = 1): Point3D[] {
  const points: Point3D[] = []

  // Use deterministic pseudo-random for consistency
  const seed = 12345
  let rand = seed

  function nextRand() {
    rand = (rand * 1103515245 + 12345) & 0x7fffffff
    return rand / 0x7fffffff
  }

  for (let i = 0; i < count; i++) {
    // Gaussian-ish distribution using Box-Muller
    const u1 = nextRand()
    const u2 = nextRand()
    const r = Math.sqrt(-2 * Math.log(u1 || 0.001)) * 0.4 * radius

    const theta = nextRand() * Math.PI * 2
    const phi = Math.acos(2 * nextRand() - 1)

    points.push({
      x: r * Math.sin(phi) * Math.cos(theta),
      y: r * Math.sin(phi) * Math.sin(theta),
      z: r * Math.cos(phi),
    })
  }
  return points
}

// Main shape generator
export function generateShape(
  type: ShapeType,
  count: number,
  radius: number = 1
): Point3D[] {
  switch (type) {
    case 'sphere':
      return fibonacciSphere(count, radius)
    case 'sphereSparse':
      return sparseSphere(count, radius)
    case 'curvedDots':
      return curvedDots(count, radius)
    case 'orbit':
      return orbit(count, radius)
    case 'doubleOrbit':
      return doubleOrbit(count, radius)
    case 'flower':
      return flower(count, radius)
    case 'star':
      return star(count, radius)
    case 'cluster':
      return cluster(count, radius)
    default:
      return fibonacciSphere(count, radius)
  }
}
