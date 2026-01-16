import type { Point3D } from './types'

type SizeCategory = 'tiny' | 'small' | 'medium' | 'large'

/**
 * Get size category based on pixel size
 */
function getSizeCategory(size: number): SizeCategory {
  if (size <= 32) return 'tiny'
  if (size <= 64) return 'small'
  if (size <= 200) return 'medium'
  return 'large'
}

/**
 * Apply 3D rotation around X and Y axes
 */
function rotateXY(
  point: { x: number; y: number; z: number },
  tiltX: number,
  tiltY: number
): { x: number; y: number; z: number } {
  const cosX = Math.cos(tiltX * Math.PI)
  const sinX = Math.sin(tiltX * Math.PI)
  const cosY = Math.cos(tiltY * Math.PI)
  const sinY = Math.sin(tiltY * Math.PI)

  // Rotate around X
  const y1 = point.y * cosX - point.z * sinX
  const z1 = point.y * sinX + point.z * cosX

  // Rotate around Y
  const x2 = point.x * cosY + z1 * sinY
  const z2 = -point.x * sinY + z1 * cosY

  return { x: x2, y: y1, z: z2 }
}

/**
 * Grid Sphere - lat/long grid pattern
 */
export function gridSphere(radius: number = 1, size: number = 500): Point3D[] {
  const points: Point3D[] = []

  const config: Record<SizeCategory, { latitudes: number; maxDotsPerRing: number }> = {
    tiny: { latitudes: 7, maxDotsPerRing: 10 },
    small: { latitudes: 10, maxDotsPerRing: 14 },
    medium: { latitudes: 13, maxDotsPerRing: 20 },
    large: { latitudes: 16, maxDotsPerRing: 26 },
  }

  const { latitudes, maxDotsPerRing } = config[getSizeCategory(size)]

  for (let lat = 0; lat < latitudes; lat++) {
    const phi = (lat / (latitudes - 1)) * Math.PI
    const y = Math.cos(phi) * radius
    const ringRadius = Math.sin(phi) * radius
    const dotsInRing = Math.max(1, Math.round(maxDotsPerRing * Math.sin(phi)))

    for (let i = 0; i < dotsInRing; i++) {
      const theta = (i / dotsInRing) * Math.PI * 2
      points.push({
        x: Math.cos(theta) * ringRadius,
        y: y,
        z: Math.sin(theta) * ringRadius,
      })
    }
  }

  return points
}

/**
 * Offset Sphere - hexagonal close-packing distribution
 */
export function offsetSphere(radius: number = 1, size: number = 500): Point3D[] {
  const points: Point3D[] = []

  const targetCounts: Record<SizeCategory, number> = {
    tiny: 40,
    small: 65,
    medium: 120,
    large: 240,
  }
  const targetCount = targetCounts[getSizeCategory(size)]

  const a = (4 * Math.PI * radius * radius) / targetCount
  const d = Math.sqrt(a)

  let phi = 0
  while (phi < Math.PI) {
    const y = Math.cos(phi) * radius
    const ringRadius = Math.sin(phi) * radius
    const circumference = 2 * Math.PI * ringRadius
    const dotsInRing = Math.max(1, Math.round(circumference / d))
    const ringIndex = Math.round(phi / (d / radius))
    const offset = ringIndex % 2 === 1 ? Math.PI / dotsInRing : 0

    for (let i = 0; i < dotsInRing; i++) {
      const theta = (i / dotsInRing) * Math.PI * 2 + offset
      points.push({
        x: Math.cos(theta) * ringRadius,
        y: y,
        z: Math.sin(theta) * ringRadius,
      })
    }

    phi += d / radius
  }

  return points
}

/**
 * Curved Arcs - 3 spinning great circle arcs
 */
export function curvedArcs(radius: number = 1, time: number = 0, size: number = 500): Point3D[] {
  const points: Point3D[] = []

  const arcs = [
    { tiltX: 0.15, tiltY: 0, spinSpeed: 0.00015 },
    { tiltX: 0.5, tiltY: 0.7, spinSpeed: -0.00012 },
    { tiltX: -0.25, tiltY: -0.5, spinSpeed: 0.00018 },
  ]

  const dotsPerArcConfig: Record<SizeCategory, number> = {
    tiny: 14,
    small: 14,
    medium: 16,
    large: 26,
  }
  const dotsPerArc = dotsPerArcConfig[getSizeCategory(size)]

  for (const arc of arcs) {
    const arcRotation = time * arc.spinSpeed

    for (let i = 0; i < dotsPerArc; i++) {
      const t = i / dotsPerArc + arcRotation
      const theta = t * Math.PI * 2

      const base = { x: Math.cos(theta) * radius, y: Math.sin(theta) * radius, z: 0 }
      const rotated = rotateXY(base, arc.tiltX, arc.tiltY)
      points.push(rotated)
    }
  }

  return points
}

/**
 * Fibonacci Sphere - golden angle distribution
 */
export function fibSphere(count: number, radius: number = 1): Point3D[] {
  const points: Point3D[] = []
  const phi = Math.PI * (3 - Math.sqrt(5))

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

/**
 * Single tilted orbit ring with spinning dots
 */
export function orbit(count: number, radius: number = 1, time: number = 0): Point3D[] {
  const points: Point3D[] = []
  const tiltX = 0.15 * Math.PI
  const tiltZ = 0.1 * Math.PI
  const spinSpeed = 0.0002

  for (let i = 0; i < count; i++) {
    const theta = (i / count + time * spinSpeed) * Math.PI * 2
    let x = Math.cos(theta) * radius
    let y = Math.sin(theta) * radius
    let z = 0

    const y1 = y * Math.cos(tiltX)
    const z1 = y * Math.sin(tiltX)
    y = y1
    z = z1

    const x2 = x * Math.cos(tiltZ) - y * Math.sin(tiltZ)
    const y2 = x * Math.sin(tiltZ) + y * Math.cos(tiltZ)
    x = x2
    y = y2

    points.push({ x, y, z })
  }

  return points
}

/**
 * Double intersecting orbits with spinning dots
 */
export function doubleOrbit(count: number, radius: number = 1, time: number = 0): Point3D[] {
  const points: Point3D[] = []
  const perOrbit = Math.floor(count / 2)

  const orbits = [
    { tiltX: 0.2, tiltY: 0, spinSpeed: 0.00018 },
    { tiltX: -0.15, tiltY: 0.5, spinSpeed: -0.00015 },
  ]

  for (const orb of orbits) {
    for (let i = 0; i < perOrbit; i++) {
      const theta = (i / perOrbit + time * orb.spinSpeed) * Math.PI * 2
      const base = { x: Math.cos(theta) * radius, y: Math.sin(theta) * radius, z: 0 }
      const rotated = rotateXY(base, orb.tiltX, orb.tiltY)
      points.push(rotated)
    }
  }

  return points
}

/**
 * Get appropriate dot count for shape and size
 * Returns -1 for shapes that calculate their own counts internally
 */
export function getDotCount(shape: string, size: number): number {
  const category = getSizeCategory(size)

  switch (shape) {
    case 'gridSphere':
    case 'curvedArcs':
      return -1

    case 'orbit': {
      const counts: Record<SizeCategory, number> = { tiny: 18, small: 20, medium: 22, large: 36 }
      return counts[category]
    }

    case 'doubleOrbit': {
      const counts: Record<SizeCategory, number> = { tiny: 26, small: 32, medium: 36, large: 56 }
      return counts[category]
    }

    default: {
      // Fibonacci sphere and others
      const counts: Record<SizeCategory, number> = { tiny: 40, small: 80, medium: 160, large: 260 }
      return counts[category]
    }
  }
}

/**
 * Interpolate between two points
 */
export function lerpPoint(a: Point3D, b: Point3D, t: number): Point3D {
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t,
    z: a.z + (b.z - a.z) * t,
  }
}

/**
 * Ease out expo
 */
export function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
}
