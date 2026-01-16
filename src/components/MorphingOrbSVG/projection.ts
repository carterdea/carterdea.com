import type { Point3D, ProjectedDot } from './types'

const PERSPECTIVE = 2.5

/**
 * Project a 3D point to 2D with ellipse distortion
 *
 * The key insight from the reference icons:
 * - Dots are drawn as ellipses, not circles
 * - The ellipse squash direction follows the surface normal
 * - Dots facing the camera are circular
 * - Dots on the edge are highly elliptical (seen edge-on)
 */
export function projectPoint(
  point: Point3D,
  canvasSize: number,
  radius: number,
  baseDotSize: number,
  originalIndex: number
): ProjectedDot {
  const { x, y, z } = point

  // Perspective projection
  // Camera looks down -Z axis, so positive Z = closer to camera
  // Objects closer to camera should be larger
  const depth = PERSPECTIVE - z / radius // higher z = smaller depth = closer
  const scale = PERSPECTIVE / Math.max(0.5, depth)
  const cx = canvasSize / 2 + x * scale * (canvasSize / 2 / radius) * 0.8
  const cy = canvasSize / 2 + y * scale * (canvasSize / 2 / radius) * 0.8

  // Calculate surface normal direction (for a sphere, it's just the normalized position)
  const len = Math.sqrt(x * x + y * y + z * z) || 1
  const nx = x / len
  const ny = y / len
  const nz = z / len

  // How much is the dot facing the camera (dot product with view direction [0,0,1])
  const facing = Math.abs(nz)

  // Ellipse dimensions:
  // - When facing camera (nz = 1): circle (rx = ry)
  // - When on edge (nz = 0): very flat ellipse
  const dotSize = baseDotSize * scale

  // The "squash" amount - how elliptical the dot becomes
  // facing=1 means circle, facing=0 means max squash
  const squash = 0.2 + facing * 0.8 // range from 0.2 to 1.0

  // rx is always the full size, ry is squashed
  const rx = dotSize
  const ry = dotSize * squash

  // Rotation: the ellipse long axis should be tangent to the sphere surface
  // This is perpendicular to the projection of the normal onto the XY plane
  const projNormalAngle = Math.atan2(ny, nx)
  const rotation = (projNormalAngle * 180) / Math.PI + 90

  // Opacity based on depth (back dots slightly faded)
  // z ranges from -radius to +radius, normalize to 0-1 where 1 = front (positive z)
  const depthFactor = (z / radius + 1) / 2
  const opacity = 0.35 + depthFactor * 0.65

  return {
    cx,
    cy,
    rx,
    ry,
    rotation,
    opacity,
    z,
    originalIndex,
  }
}

/**
 * Rotate a point around the Y axis
 */
export function rotateY(point: Point3D, angle: number): Point3D {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return {
    x: point.x * cos + point.z * sin,
    y: point.y,
    z: -point.x * sin + point.z * cos,
  }
}

/**
 * Rotate a point around the X axis
 */
export function rotateX(point: Point3D, angle: number): Point3D {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return {
    x: point.x,
    y: point.y * cos - point.z * sin,
    z: point.y * sin + point.z * cos,
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
