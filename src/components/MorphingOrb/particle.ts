import type { Point3D } from './shapes'
import { easeOutExpo } from './constants'

export class Particle {
  // Current position
  x: number
  y: number
  z: number

  // Target position for morphing
  targetX: number
  targetY: number
  targetZ: number

  // Starting position for morphing
  startX: number
  startY: number
  startZ: number

  // Morph progress (0-1)
  morphProgress: number = 1

  // Individual morph delay for staggered effect
  morphDelay: number = 0

  // Size variation factor (0.8 - 1.2)
  sizeVariation: number

  // Wobble offset for idle animation
  wobbleOffset: number

  constructor(point: Point3D, index: number, total: number) {
    this.x = point.x
    this.y = point.y
    this.z = point.z
    this.targetX = point.x
    this.targetY = point.y
    this.targetZ = point.z
    this.startX = point.x
    this.startY = point.y
    this.startZ = point.z

    // Deterministic variation based on index
    this.sizeVariation = 0.85 + ((index * 7) % 30) / 100
    this.wobbleOffset = (index / total) * Math.PI * 2
  }

  setTarget(point: Point3D, delay: number = 0) {
    this.startX = this.x
    this.startY = this.y
    this.startZ = this.z
    this.targetX = point.x
    this.targetY = point.y
    this.targetZ = point.z
    this.morphProgress = 0
    this.morphDelay = delay
  }

  updateMorph(deltaProgress: number) {
    if (this.morphProgress >= 1) return

    // Apply delay
    if (this.morphDelay > 0) {
      this.morphDelay -= deltaProgress
      return
    }

    this.morphProgress = Math.min(1, this.morphProgress + deltaProgress)
    const t = easeOutExpo(this.morphProgress)

    this.x = this.startX + (this.targetX - this.startX) * t
    this.y = this.startY + (this.targetY - this.startY) * t
    this.z = this.startZ + (this.targetZ - this.startZ) * t
  }

  // Apply rotation around Y axis
  getRotatedPosition(rotationY: number): Point3D {
    const cos = Math.cos(rotationY)
    const sin = Math.sin(rotationY)
    return {
      x: this.x * cos + this.z * sin,
      y: this.y,
      z: -this.x * sin + this.z * cos,
    }
  }

  // Check if still morphing
  isMorphing(): boolean {
    return this.morphProgress < 1 || this.morphDelay > 0
  }
}
