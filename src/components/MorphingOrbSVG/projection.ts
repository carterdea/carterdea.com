import type { Point3D, ProjectedDot } from './types'

const PERSPECTIVE = 2.0 // Lower = stronger perspective distortion

// Light direction (normalized) - upper-left-front
const LIGHT_DIR = {
  x: -0.5,
  y: -0.7,
  z: 0.5,
}
// Normalize light direction
const lightLen = Math.sqrt(LIGHT_DIR.x ** 2 + LIGHT_DIR.y ** 2 + LIGHT_DIR.z ** 2)
LIGHT_DIR.x /= lightLen
LIGHT_DIR.y /= lightLen
LIGHT_DIR.z /= lightLen

/**
 * Project a 3D point to 2D with ellipse distortion and hemispheric lighting
 *
 * The key insight from the reference icons:
 * - Dots are drawn as ellipses, not circles
 * - The ellipse squash direction follows the surface normal
 * - Dots facing the camera are circular
 * - Dots on the edge are highly elliptical (seen edge-on)
 * - Dots facing the light are brighter and larger
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
  const depth = PERSPECTIVE - z / radius
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

  // Lambert shading: dot product of normal with light direction
  // Clamped to [0, 1] - negative means facing away from light
  const lightDot = nx * LIGHT_DIR.x + ny * LIGHT_DIR.y + nz * LIGHT_DIR.z
  const lighting = Math.max(0, lightDot)

  // Ellipse squash: more aggressive at edges (0.15-1.0 range)
  const squash = 0.15 + facing * 0.85

  // Size affected by perspective scale only (no depth-based shrinking)
  const lightSizeBoost = 1 + lighting * 0.12 // lit dots up to 12% larger
  const dotSize = baseDotSize * scale * lightSizeBoost

  const rx = dotSize
  const ry = dotSize * squash

  // Rotation: the ellipse should be oriented so its minor axis points toward
  // the center of the sphere (in screen space). This means the major axis
  // is perpendicular to the radial direction from center.
  // For a point at (cx, cy) relative to center, the radial direction is atan2(cy-center, cx-center)
  // The ellipse major axis should be perpendicular to this (rotated 90°)
  const screenCenterX = canvasSize / 2
  const screenCenterY = canvasSize / 2
  const radialAngle = Math.atan2(cy - screenCenterY, cx - screenCenterX)
  const rotation = (radialAngle * 180) / Math.PI + 90 // perpendicular to radial

  // Opacity: full opacity, lighting only affects color brightness (handled in component)
  const opacity = 1

  return {
    cx,
    cy,
    rx,
    ry,
    rotation,
    opacity,
    z,
    originalIndex,
    point3D: point,
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
