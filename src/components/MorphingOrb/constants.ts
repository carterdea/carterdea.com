// Particle count thresholds based on canvas size
export function getParticleCount(size: number): number {
  if (size <= 32) return 16
  if (size <= 64) return 30
  if (size <= 100) return 50
  if (size <= 200) return 80
  if (size <= 300) return 110
  return 180
}

// Shape types for morphing
export type ShapeType =
  | 'sphere'
  | 'sphereSparse'
  | 'curvedDots'
  | 'orbit'
  | 'doubleOrbit'
  | 'flower'
  | 'star'
  | 'cluster'

// Default shape sequence for auto-morphing
export const DEFAULT_SHAPE_SEQUENCE: ShapeType[] = [
  'sphere',
  'curvedDots',
  'doubleOrbit',
  'flower',
  'star',
  'sphere',
]

// Animation timing
export const MORPH_DURATION = 2500 // ms
export const SHAPE_HOLD_DURATION = 4000 // ms before morphing to next shape
export const IDLE_ROTATION_SPEED = 0.0003 // radians per ms
export const HOVER_ROTATION_SPEED = 0.001

// Visual constants
export const PERSPECTIVE = 2.5
export const BASE_DOT_SIZE_RATIO = 0.03 // relative to canvas size
export const MIN_DOT_SIZE = 1
export const DEPTH_SIZE_SCALE = 0.6 // how much z affects size

// Easing function (ease-out-expo equivalent)
export function easeOutExpo(t: number): number {
  return t === 1 ? 1 : 1 - Math.pow(2, -10 * t)
}

export function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2
}
