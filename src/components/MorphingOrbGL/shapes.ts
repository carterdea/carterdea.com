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
    // Shapes that calculate their own counts internally
    case 'gridSphere':
    case 'curvedArcs':
    case 'cylinder':
    case 'capsule':
    case 'hourglass':
    case 'diabolo':
    case 'torus':
    case 'cube':
    case 'octahedron':
    case 'stellatedSphere':
    case 'blob':
    case 'pulseSphere':
      return -1

    case 'orbit': {
      const counts: Record<SizeCategory, number> = { tiny: 18, small: 20, medium: 22, large: 36 }
      return counts[category]
    }

    case 'doubleOrbit': {
      const counts: Record<SizeCategory, number> = { tiny: 26, small: 32, medium: 36, large: 56 }
      return counts[category]
    }

    case 'trefoilKnot': {
      const counts: Record<SizeCategory, number> = { tiny: 30, small: 45, medium: 60, large: 90 }
      return counts[category]
    }

    case 'torusKnot': {
      const counts: Record<SizeCategory, number> = { tiny: 40, small: 60, medium: 80, large: 120 }
      return counts[category]
    }

    case 'lemniscate': {
      const counts: Record<SizeCategory, number> = { tiny: 24, small: 36, medium: 50, large: 70 }
      return counts[category]
    }

    case 'helix': {
      const counts: Record<SizeCategory, number> = { tiny: 30, small: 44, medium: 60, large: 90 }
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

/**
 * Project a point onto a cylinder surface (capped)
 */
function projectToCylinder(
  p: Point3D,
  cylRadius: number,
  halfHeight: number
): Point3D {
  const horizontalDist = Math.sqrt(p.x * p.x + p.z * p.z)

  // Determine if point projects to cap or side
  if (Math.abs(p.y) > halfHeight && horizontalDist < cylRadius) {
    // Projects to top or bottom cap
    const capY = p.y > 0 ? halfHeight : -halfHeight
    return { x: p.x, y: capY, z: p.z }
  } else if (horizontalDist > 0) {
    // Projects to curved side - clamp y to cylinder height
    const clampedY = Math.max(-halfHeight, Math.min(halfHeight, p.y))
    const scale = cylRadius / horizontalDist
    return { x: p.x * scale, y: clampedY, z: p.z * scale }
  }
  // Point is on axis, project to nearest cap
  return { x: 0, y: p.y > 0 ? halfHeight : -halfHeight, z: 0 }
}

/**
 * Cylinder - Fibonacci-distributed dots projected onto cylinder surface
 */
export function cylinder(radius: number = 1, size: number = 500): Point3D[] {
  const category = getSizeCategory(size)

  const counts: Record<SizeCategory, number> = {
    tiny: 60,
    small: 100,
    medium: 160,
    large: 260,
  }

  const count = counts[category]
  const height = radius * 1.4
  const cylRadius = radius * 0.5
  const halfHeight = height / 2

  // Generate Fibonacci sphere points and project onto cylinder
  const points: Point3D[] = []
  const phi = Math.PI * (3 - Math.sqrt(5))

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const theta = phi * i

    // Sphere point scaled to encompass cylinder
    const spherePoint = {
      x: Math.cos(theta) * r * radius,
      y: y * radius,
      z: Math.sin(theta) * r * radius,
    }

    points.push(projectToCylinder(spherePoint, cylRadius, halfHeight))
  }

  return points
}

/**
 * Project a point onto a capsule surface (cylinder with hemisphere caps)
 */
function projectToCapsule(
  p: Point3D,
  capRadius: number,
  halfCylinderHeight: number
): Point3D {
  const horizontalDist = Math.sqrt(p.x * p.x + p.z * p.z)

  if (p.y > halfCylinderHeight) {
    // Top hemisphere - project to sphere centered at (0, halfCylinderHeight, 0)
    const dx = p.x
    const dy = p.y - halfCylinderHeight
    const dz = p.z
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
    if (dist > 0) {
      return {
        x: (dx / dist) * capRadius,
        y: halfCylinderHeight + (dy / dist) * capRadius,
        z: (dz / dist) * capRadius,
      }
    }
    return { x: 0, y: halfCylinderHeight + capRadius, z: 0 }
  } else if (p.y < -halfCylinderHeight) {
    // Bottom hemisphere
    const dx = p.x
    const dy = p.y + halfCylinderHeight
    const dz = p.z
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
    if (dist > 0) {
      return {
        x: (dx / dist) * capRadius,
        y: -halfCylinderHeight + (dy / dist) * capRadius,
        z: (dz / dist) * capRadius,
      }
    }
    return { x: 0, y: -halfCylinderHeight - capRadius, z: 0 }
  } else if (horizontalDist > 0) {
    // Cylinder section
    const scale = capRadius / horizontalDist
    return { x: p.x * scale, y: p.y, z: p.z * scale }
  }
  return { x: capRadius, y: p.y, z: 0 }
}

/**
 * Capsule - Fibonacci-distributed dots projected onto capsule surface
 */
export function capsule(radius: number = 1, size: number = 500): Point3D[] {
  const category = getSizeCategory(size)

  const counts: Record<SizeCategory, number> = {
    tiny: 60,
    small: 100,
    medium: 160,
    large: 260,
  }

  const count = counts[category]
  const cylinderHeight = radius * 0.6
  const capRadius = radius * 0.5
  const halfCylinderHeight = cylinderHeight / 2

  const points: Point3D[] = []
  const phi = Math.PI * (3 - Math.sqrt(5))

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const theta = phi * i

    const spherePoint = {
      x: Math.cos(theta) * r * radius,
      y: y * radius,
      z: Math.sin(theta) * r * radius,
    }

    points.push(projectToCapsule(spherePoint, capRadius, halfCylinderHeight))
  }

  return points
}

/**
 * Project a point onto an hourglass surface
 * Hourglass: pinched cylinder with radius varying by height
 */
function projectToHourglass(
  p: Point3D,
  halfHeight: number,
  maxRadius: number,
  minRadius: number
): Point3D {
  const horizontalDist = Math.sqrt(p.x * p.x + p.z * p.z)

  // Clamp y to height bounds
  const clampedY = Math.max(-halfHeight, Math.min(halfHeight, p.y))

  // Calculate hourglass radius at this y position
  const normalizedY = Math.abs(clampedY) / halfHeight
  const targetRadius = minRadius + (maxRadius - minRadius) * (normalizedY ** 0.8)

  // Check if point should be on cap (beyond height and inside radius)
  if (Math.abs(p.y) > halfHeight && horizontalDist < maxRadius) {
    const capY = p.y > 0 ? halfHeight : -halfHeight
    return { x: p.x, y: capY, z: p.z }
  }

  // Project to curved surface
  if (horizontalDist > 0) {
    const scale = targetRadius / horizontalDist
    return { x: p.x * scale, y: clampedY, z: p.z * scale }
  }
  return { x: targetRadius, y: clampedY, z: 0 }
}

/**
 * Hourglass - Fibonacci-distributed dots projected onto hourglass surface
 */
export function hourglass(radius: number = 1, size: number = 500): Point3D[] {
  const category = getSizeCategory(size)

  const counts: Record<SizeCategory, number> = {
    tiny: 70,
    small: 120,
    medium: 180,
    large: 280,
  }

  const count = counts[category]
  const height = radius * 1.5
  const halfHeight = height / 2
  const maxRadius = radius * 0.5
  const minRadius = radius * 0.15

  const points: Point3D[] = []
  const phi = Math.PI * (3 - Math.sqrt(5))

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const theta = phi * i

    const spherePoint = {
      x: Math.cos(theta) * r * radius,
      y: y * radius,
      z: Math.sin(theta) * r * radius,
    }

    points.push(projectToHourglass(spherePoint, halfHeight, maxRadius, minRadius))
  }

  return points
}

/**
 * Project a point onto a diabolo surface
 * Diabolo: hourglass with concave bowl caps
 */
function projectToDiabolo(
  p: Point3D,
  halfHeight: number,
  maxRadius: number,
  minRadius: number,
  concaveDepth: number
): Point3D {
  const horizontalDist = Math.sqrt(p.x * p.x + p.z * p.z)

  // Top bowl region
  if (p.y > halfHeight) {
    // Concave bowl: curves from rim (at halfHeight + concaveDepth at edge) down to center
    const t = horizontalDist / maxRadius // 0 at center, 1 at rim
    const clampedT = Math.min(1, t)
    const bowlY = halfHeight + concaveDepth * (1 - Math.cos(clampedT * Math.PI / 2))

    if (horizontalDist > 0 && horizontalDist <= maxRadius) {
      return { x: p.x, y: bowlY, z: p.z }
    } else if (horizontalDist > maxRadius) {
      // Beyond rim, project to rim edge
      const scale = maxRadius / horizontalDist
      return { x: p.x * scale, y: halfHeight + concaveDepth, z: p.z * scale }
    }
    return { x: 0, y: halfHeight, z: 0 }
  }

  // Bottom bowl region
  if (p.y < -halfHeight) {
    const t = horizontalDist / maxRadius
    const clampedT = Math.min(1, t)
    const bowlY = -halfHeight - concaveDepth * (1 - Math.cos(clampedT * Math.PI / 2))

    if (horizontalDist > 0 && horizontalDist <= maxRadius) {
      return { x: p.x, y: bowlY, z: p.z }
    } else if (horizontalDist > maxRadius) {
      const scale = maxRadius / horizontalDist
      return { x: p.x * scale, y: -halfHeight - concaveDepth, z: p.z * scale }
    }
    return { x: 0, y: -halfHeight, z: 0 }
  }

  // Body region - hourglass profile
  const normalizedY = Math.abs(p.y) / halfHeight
  const targetRadius = minRadius + (maxRadius - minRadius) * (normalizedY ** 0.8)

  if (horizontalDist > 0) {
    const scale = targetRadius / horizontalDist
    return { x: p.x * scale, y: p.y, z: p.z * scale }
  }
  return { x: targetRadius, y: p.y, z: 0 }
}

/**
 * Diabolo - Fibonacci-distributed dots projected onto diabolo surface
 */
export function diabolo(radius: number = 1, size: number = 500): Point3D[] {
  const category = getSizeCategory(size)

  const counts: Record<SizeCategory, number> = {
    tiny: 70,
    small: 120,
    medium: 180,
    large: 280,
  }

  const count = counts[category]
  const height = radius * 1.6
  const halfHeight = height / 2
  const maxRadius = radius * 0.5
  const minRadius = radius * 0.12
  const concaveDepth = radius * 0.2

  const points: Point3D[] = []
  const phi = Math.PI * (3 - Math.sqrt(5))

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const theta = phi * i

    const spherePoint = {
      x: Math.cos(theta) * r * radius,
      y: y * radius,
      z: Math.sin(theta) * r * radius,
    }

    points.push(projectToDiabolo(spherePoint, halfHeight, maxRadius, minRadius, concaveDepth))
  }

  return points
}

/**
 * Torus - dots distributed directly on torus surface using parametric sampling
 */
export function torus(radius: number = 1, size: number = 500): Point3D[] {
  const category = getSizeCategory(size)

  // Grid dimensions for torus sampling (major x minor)
  const gridConfig: Record<SizeCategory, { major: number; minor: number }> = {
    tiny: { major: 12, minor: 5 },   // 60 total
    small: { major: 14, minor: 6 },  // 84 total
    medium: { major: 16, minor: 7 }, // 112 total
    large: { major: 20, minor: 8 },  // 160 total
  }

  const { major, minor } = gridConfig[category]
  const majorRadius = radius * 0.45
  const minorRadius = radius * 0.25

  const points: Point3D[] = []

  // Sample directly on torus surface using parametric form:
  // x = (R + r*cos(v)) * cos(u)
  // y = r * sin(v)
  // z = (R + r*cos(v)) * sin(u)
  for (let i = 0; i < major; i++) {
    const u = (i / major) * Math.PI * 2

    for (let j = 0; j < minor; j++) {
      const v = (j / minor) * Math.PI * 2

      const x = (majorRadius + minorRadius * Math.cos(v)) * Math.cos(u)
      const y = minorRadius * Math.sin(v)
      const z = (majorRadius + minorRadius * Math.cos(v)) * Math.sin(u)

      points.push({ x, y, z })
    }
  }

  return points
}

/**
 * Cube - dots distributed directly on cube faces using grid sampling
 * Each face gets an equal number of dots in a grid pattern
 */
export function cube(radius: number = 1, size: number = 500): Point3D[] {
  const category = getSizeCategory(size)

  // Dots per face (total will be 6x this)
  const dotsPerFaceConfig: Record<SizeCategory, number> = {
    tiny: 9,    // 54 total
    small: 16,  // 96 total
    medium: 25, // 150 total
    large: 36,  // 216 total
  }

  const dotsPerFace = dotsPerFaceConfig[category]
  const gridSize = Math.ceil(Math.sqrt(dotsPerFace))
  const halfSize = radius * 0.55

  const points: Point3D[] = []

  // Define 6 faces: +X, -X, +Y, -Y, +Z, -Z
  const faces = [
    { axis: 'x', sign: 1 },
    { axis: 'x', sign: -1 },
    { axis: 'y', sign: 1 },
    { axis: 'y', sign: -1 },
    { axis: 'z', sign: 1 },
    { axis: 'z', sign: -1 },
  ] as const

  for (const face of faces) {
    for (let i = 0; i < gridSize; i++) {
      for (let j = 0; j < gridSize; j++) {
        // Map grid to [-halfSize, halfSize] with slight inset to show edges
        const u = ((i + 0.5) / gridSize) * 2 - 1
        const v = ((j + 0.5) / gridSize) * 2 - 1

        const coord1 = u * halfSize
        const coord2 = v * halfSize
        const fixedCoord = face.sign * halfSize

        let point: Point3D
        if (face.axis === 'x') {
          point = { x: fixedCoord, y: coord1, z: coord2 }
        } else if (face.axis === 'y') {
          point = { x: coord1, y: fixedCoord, z: coord2 }
        } else {
          point = { x: coord1, y: coord2, z: fixedCoord }
        }

        points.push(point)
      }
    }
  }

  return points
}

/**
 * Octahedron - dots distributed directly on triangular faces
 * Uses barycentric coordinates to sample each triangular face
 */
export function octahedron(radius: number = 1, size: number = 500): Point3D[] {
  const category = getSizeCategory(size)

  // Dots per triangular face (total will be 8x this)
  const dotsPerFaceConfig: Record<SizeCategory, number> = {
    tiny: 3,    // 24 total
    small: 6,   // 48 total
    medium: 10, // 80 total
    large: 15,  // 120 total
  }

  const dotsPerFace = dotsPerFaceConfig[category]
  const s = radius * 0.7

  const points: Point3D[] = []

  // 6 vertices of octahedron
  const vertices: Point3D[] = [
    { x: s, y: 0, z: 0 },
    { x: -s, y: 0, z: 0 },
    { x: 0, y: s, z: 0 },
    { x: 0, y: -s, z: 0 },
    { x: 0, y: 0, z: s },
    { x: 0, y: 0, z: -s },
  ]

  // 8 triangular faces defined by vertex indices
  // Each face connects one vertex from each axis
  const faces = [
    [0, 2, 4], // +x, +y, +z
    [0, 4, 3], // +x, +z, -y
    [0, 3, 5], // +x, -y, -z
    [0, 5, 2], // +x, -z, +y
    [1, 4, 2], // -x, +z, +y
    [1, 3, 4], // -x, -y, +z
    [1, 5, 3], // -x, -z, -y
    [1, 2, 5], // -x, +y, -z
  ]

  // Generate points using triangular grid pattern for each face
  // For n dots per face, use a triangular number approach
  const subdivisions = Math.ceil(Math.sqrt(dotsPerFace * 2))

  for (const faceIndices of faces) {
    const v0 = vertices[faceIndices[0]]
    const v1 = vertices[faceIndices[1]]
    const v2 = vertices[faceIndices[2]]

    // Generate triangular grid of barycentric coordinates
    for (let i = 0; i <= subdivisions; i++) {
      for (let j = 0; j <= subdivisions - i; j++) {
        const k = subdivisions - i - j

        // Skip vertices to avoid duplicates
        if ((i === subdivisions && j === 0 && k === 0) ||
            (i === 0 && j === subdivisions && k === 0) ||
            (i === 0 && j === 0 && k === subdivisions)) {
          continue
        }

        // Barycentric coordinates
        const u = i / subdivisions
        const v = j / subdivisions
        const w = k / subdivisions

        // Interpolate position
        points.push({
          x: v0.x * u + v1.x * v + v2.x * w,
          y: v0.y * u + v1.y * v + v2.y * w,
          z: v0.z * u + v1.z * v + v2.z * w,
        })
      }
    }
  }

  return points
}

/**
 * Project a point onto a stellated sphere surface
 * Base sphere with spikes extending from icosahedron vertices
 */
function projectToStellatedSphere(
  p: Point3D,
  baseRadius: number,
  spikeLength: number,
  spikeDirections: Point3D[],
  spikeWidth: number
): Point3D {
  const dist = Math.sqrt(p.x * p.x + p.y * p.y + p.z * p.z)
  if (dist === 0) return { x: 0, y: baseRadius, z: 0 }

  // Normalize point direction
  const nx = p.x / dist
  const ny = p.y / dist
  const nz = p.z / dist

  // Check if point is near any spike direction
  let maxDot = -1
  let nearestSpike: Point3D | null = null

  for (const spike of spikeDirections) {
    const dot = nx * spike.x + ny * spike.y + nz * spike.z
    if (dot > maxDot) {
      maxDot = dot
      nearestSpike = spike
    }
  }

  // If pointing strongly toward a spike, project onto spike
  // spikeWidth controls how wide the spike influence is (cosine of angle)
  if (nearestSpike && maxDot > spikeWidth) {
    // Interpolate between base sphere and spike tip based on alignment
    const spikeInfluence = (maxDot - spikeWidth) / (1 - spikeWidth)
    const r = baseRadius + spikeLength * spikeInfluence

    return {
      x: nx * r,
      y: ny * r,
      z: nz * r,
    }
  }

  // Otherwise, project to base sphere
  return {
    x: nx * baseRadius,
    y: ny * baseRadius,
    z: nz * baseRadius,
  }
}

/**
 * Stellated Sphere - Fibonacci-distributed dots projected onto stellated surface
 */
export function stellatedSphere(radius: number = 1, size: number = 500): Point3D[] {
  const category = getSizeCategory(size)

  const counts: Record<SizeCategory, number> = {
    tiny: 70,
    small: 120,
    medium: 200,
    large: 320,
  }

  const count = counts[category]
  const baseRadius = radius * 0.5
  const spikeLength = radius * 0.5
  const spikeWidth = 0.85 // How wide the spike influence is (higher = narrower spikes)

  // 12 spike directions based on icosahedron vertices
  const goldenRatio = (1 + Math.sqrt(5)) / 2
  const spikeDirections: Point3D[] = [
    { x: 0, y: 1, z: goldenRatio },
    { x: 0, y: -1, z: goldenRatio },
    { x: 0, y: 1, z: -goldenRatio },
    { x: 0, y: -1, z: -goldenRatio },
    { x: 1, y: goldenRatio, z: 0 },
    { x: -1, y: goldenRatio, z: 0 },
    { x: 1, y: -goldenRatio, z: 0 },
    { x: -1, y: -goldenRatio, z: 0 },
    { x: goldenRatio, y: 0, z: 1 },
    { x: goldenRatio, y: 0, z: -1 },
    { x: -goldenRatio, y: 0, z: 1 },
    { x: -goldenRatio, y: 0, z: -1 },
  ]

  // Normalize spike directions
  const normalizedSpikes = spikeDirections.map(d => {
    const len = Math.sqrt(d.x * d.x + d.y * d.y + d.z * d.z)
    return { x: d.x / len, y: d.y / len, z: d.z / len }
  })

  const points: Point3D[] = []
  const phi = Math.PI * (3 - Math.sqrt(5))

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const theta = phi * i

    const spherePoint = {
      x: Math.cos(theta) * r * radius,
      y: y * radius,
      z: Math.sin(theta) * r * radius,
    }

    points.push(projectToStellatedSphere(spherePoint, baseRadius, spikeLength, normalizedSpikes, spikeWidth))
  }

  return points
}

/**
 * Trefoil Knot - classic 3-looped knot (animated)
 */
export function trefoilKnot(count: number, radius: number = 1, time: number = 0): Point3D[] {
  const points: Point3D[] = []
  const spinSpeed = 0.00012
  const offset = time * spinSpeed

  for (let i = 0; i < count; i++) {
    const t = ((i / count) + offset) * Math.PI * 2

    // Trefoil parametric equations
    const x = Math.sin(t) + 2 * Math.sin(2 * t)
    const y = Math.cos(t) - 2 * Math.cos(2 * t)
    const z = -Math.sin(3 * t)

    // Scale to fit within radius
    const scale = radius * 0.28

    points.push({
      x: x * scale,
      y: y * scale,
      z: z * scale,
    })
  }

  return points
}

/**
 * Torus Knot - knot wrapping around a torus (animated)
 */
export function torusKnot(count: number, radius: number = 1, time: number = 0): Point3D[] {
  const points: Point3D[] = []
  const spinSpeed = 0.0001
  const offset = time * spinSpeed

  // p and q determine the knot type (2,3 is a trefoil variant)
  const p = 2
  const q = 3
  const tubeRadius = 0.4

  for (let i = 0; i < count; i++) {
    const t = ((i / count) + offset) * Math.PI * 2 * p

    const r = radius * 0.5 * (2 + Math.cos(q * t / p))
    const x = r * Math.cos(t)
    const y = r * Math.sin(t)
    const z = radius * 0.5 * tubeRadius * Math.sin(q * t / p) * 2

    points.push({ x, y, z })
  }

  return points
}

/**
 * Lemniscate - 3D figure-eight/infinity symbol (animated)
 */
export function lemniscate(count: number, radius: number = 1, time: number = 0): Point3D[] {
  const points: Point3D[] = []
  const spinSpeed = 0.00015
  const offset = time * spinSpeed

  for (let i = 0; i < count; i++) {
    const t = ((i / count) + offset) * Math.PI * 2

    // 3D lemniscate (Viviani's curve variant)
    const a = radius * 0.7
    const x = a * Math.cos(t)
    const y = a * Math.sin(t) * Math.cos(t)
    const z = a * Math.sin(t) * 0.6

    points.push({ x, y, z })
  }

  return points
}

/**
 * Helix - DNA-like double spiral (animated)
 */
export function helix(count: number, radius: number = 1, time: number = 0): Point3D[] {
  const points: Point3D[] = []
  const spinSpeed = 0.0002
  const offset = time * spinSpeed

  const turns = 2.5
  const helixRadius = radius * 0.45
  const height = radius * 1.4
  const perHelix = Math.floor(count / 2)

  // Two interleaved helices
  for (let h = 0; h < 2; h++) {
    const helixOffset = h * Math.PI

    for (let i = 0; i < perHelix; i++) {
      const t = (i / perHelix) * turns * Math.PI * 2 + offset + helixOffset
      const y = ((i / perHelix) - 0.5) * height

      points.push({
        x: Math.cos(t) * helixRadius,
        y: y,
        z: Math.sin(t) * helixRadius,
      })
    }
  }

  return points
}

/**
 * Blob - sphere with animated noise deformation (animated)
 */
export function blob(radius: number = 1, time: number = 0, size: number = 500): Point3D[] {
  const category = getSizeCategory(size)

  const counts: Record<SizeCategory, number> = {
    tiny: 45,
    small: 80,
    medium: 150,
    large: 260,
  }

  const count = counts[category]
  const points: Point3D[] = []
  const phi = Math.PI * (3 - Math.sqrt(5))
  const amplitude = 0.25
  const frequency = 0.0003

  // 3D noise function (simplified Perlin-like)
  const noise3D = (x: number, y: number, z: number, t: number): number => {
    const n1 = Math.sin(x * 2.1 + t) * Math.cos(y * 1.9 - t * 0.7) * Math.sin(z * 2.3 + t * 0.5)
    const n2 = Math.sin(x * 3.7 - t * 0.3) * Math.sin(y * 2.8 + t) * Math.cos(z * 1.7 - t * 0.8)
    return (n1 + n2) * 0.5
  }

  const animTime = time * frequency

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const theta = phi * i

    const baseX = Math.cos(theta) * r
    const baseY = y
    const baseZ = Math.sin(theta) * r

    const noiseVal = noise3D(baseX * 2, baseY * 2, baseZ * 2, animTime)
    const blobRadius = radius * (1 + amplitude * noiseVal)

    points.push({
      x: baseX * blobRadius,
      y: baseY * blobRadius,
      z: baseZ * blobRadius,
    })
  }

  return points
}

/**
 * Pulse Sphere - sphere that breathes in/out (animated)
 */
export function pulseSphere(radius: number = 1, time: number = 0, size: number = 500): Point3D[] {
  const category = getSizeCategory(size)

  const counts: Record<SizeCategory, number> = {
    tiny: 40,
    small: 80,
    medium: 160,
    large: 260,
  }

  const count = counts[category]
  const points: Point3D[] = []
  const phi = Math.PI * (3 - Math.sqrt(5))
  const pulseFrequency = 0.002
  const pulseAmplitude = 0.2

  const pulseScale = 1 + Math.sin(time * pulseFrequency) * pulseAmplitude

  for (let i = 0; i < count; i++) {
    const y = 1 - (i / (count - 1)) * 2
    const r = Math.sqrt(1 - y * y)
    const theta = phi * i

    points.push({
      x: Math.cos(theta) * r * radius * pulseScale,
      y: y * radius * pulseScale,
      z: Math.sin(theta) * r * radius * pulseScale,
    })
  }

  return points
}
