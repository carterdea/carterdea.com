import { useRef, useEffect, useCallback, useState } from 'react'
import { Particle } from './particle'
import { generateShape } from './shapes'
import {
  getParticleCount,
  DEFAULT_SHAPE_SEQUENCE,
  MORPH_DURATION,
  SHAPE_HOLD_DURATION,
  IDLE_ROTATION_SPEED,
  HOVER_ROTATION_SPEED,
  BASE_DOT_SIZE_RATIO,
  MIN_DOT_SIZE,
  type ShapeType,
} from './constants'

const PERSPECTIVE = 2.0 // Lower = stronger perspective distortion

// Light direction (normalized) - upper-left-front
const LIGHT_DIR = { x: -0.5, y: -0.7, z: 0.5 }
const lightLen = Math.sqrt(LIGHT_DIR.x ** 2 + LIGHT_DIR.y ** 2 + LIGHT_DIR.z ** 2)
LIGHT_DIR.x /= lightLen
LIGHT_DIR.y /= lightLen
LIGHT_DIR.z /= lightLen

export interface MorphingOrbProps {
  size?: number
  variant?: 'mono' | 'color'
  color?: string
  palette?: string[]
  baseSpeed?: number
  hoverSpeed?: number
  hoverIntensity?: number
  className?: string
  shapeSequence?: ShapeType[]
  autoMorph?: boolean
}

export function MorphingOrb({
  size = 500,
  variant = 'mono',
  color = '#ffffff',
  palette = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7'],
  baseSpeed = 1,
  hoverSpeed = 2.5,
  hoverIntensity = 1.3,
  className = '',
  shapeSequence = DEFAULT_SHAPE_SEQUENCE,
  autoMorph = true,
}: MorphingOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const animationRef = useRef<number>(0)
  const rotationRef = useRef(0)
  const lastTimeRef = useRef(0)
  const shapeIndexRef = useRef(0)
  const timeSinceLastMorphRef = useRef(0)
  const isHoveredRef = useRef(false)
  const [isHovered, setIsHovered] = useState(false)

  const particleCount = getParticleCount(size)
  const radius = size * 0.4

  // Initialize particles
  const initParticles = useCallback(() => {
    const shape = generateShape(shapeSequence[0], particleCount, radius)
    particlesRef.current = shape.map(
      (point, i) => new Particle(point, i, shape.length)
    )
    shapeIndexRef.current = 0
    timeSinceLastMorphRef.current = 0
  }, [particleCount, radius, shapeSequence])

  // Morph to next shape
  const morphToNextShape = useCallback(() => {
    shapeIndexRef.current =
      (shapeIndexRef.current + 1) % shapeSequence.length
    const nextShape = generateShape(
      shapeSequence[shapeIndexRef.current],
      particleCount,
      radius
    )

    // Assign targets with staggered delays
    particlesRef.current.forEach((particle, i) => {
      const target = nextShape[i % nextShape.length]
      const delay = (i / particlesRef.current.length) * 0.3 // 0-0.3 stagger
      particle.setTarget(target, delay)
    })

    timeSinceLastMorphRef.current = 0
  }, [particleCount, radius, shapeSequence])

  // Project 3D to 2D with ellipse deformation (matching SVG approach exactly)
  const project = useCallback(
    (x: number, y: number, z: number) => {
      // Perspective projection (camera looks down -Z axis, positive Z = closer)
      const depth = PERSPECTIVE - z / radius
      const scale = PERSPECTIVE / Math.max(0.5, depth)
      // Use smaller scale than SVG to fit within canvas bounds
      // (SVG has overflow:visible, canvas clips at boundary)
      // SVG uses 0.8, we use 0.65 to ensure all dots fit with padding
      const screenScale = (size / 2 / radius) * 0.65
      const screenX = size / 2 + x * scale * screenScale
      const screenY = size / 2 + y * scale * screenScale

      // Calculate surface normal (normalized position for sphere)
      const len = Math.sqrt(x * x + y * y + z * z) || 1
      const nx = x / len
      const ny = y / len
      const nz = z / len

      // How much is the dot facing the camera (dot product with view direction [0,0,1])
      const facing = Math.abs(nz)

      // Lambert shading: dot product of normal with light direction
      const lightDot = nx * LIGHT_DIR.x + ny * LIGHT_DIR.y + nz * LIGHT_DIR.z
      const lighting = Math.max(0, lightDot)

      // Ellipse squash: 1.0 when facing camera, 0.15 when on edge
      const squash = 0.15 + facing * 0.85

      // Ellipse rotation based on 3D surface normal direction
      // The ellipse squashes in the direction the surface tilts away from camera
      // For a sphere, the normal's x,y components indicate the tilt direction
      const rotation = Math.atan2(ny, nx)

      // Lit dots are slightly larger
      const lightSizeBoost = 1 + lighting * 0.12

      return {
        screenX,
        screenY,
        scale,
        squash,
        rotation,
        lightSizeBoost,
      }
    },
    [size, radius]
  )

  // Animation loop
  const animate = useCallback(
    (timestamp: number) => {
      const canvas = canvasRef.current
      if (!canvas) return

      const ctx = canvas.getContext('2d')
      if (!ctx) return

      const deltaTime = lastTimeRef.current ? timestamp - lastTimeRef.current : 16
      lastTimeRef.current = timestamp

      const hovered = isHoveredRef.current
      const currentSpeed = hovered ? hoverSpeed : baseSpeed
      const intensity = hovered ? hoverIntensity : 1

      // Update rotation
      const rotationSpeed = hovered ? HOVER_ROTATION_SPEED : IDLE_ROTATION_SPEED
      rotationRef.current += rotationSpeed * deltaTime * currentSpeed

      // Update morph progress
      const morphDelta = (deltaTime / MORPH_DURATION) * intensity
      let anyMorphing = false
      particlesRef.current.forEach((particle) => {
        particle.updateMorph(morphDelta)
        if (particle.isMorphing()) anyMorphing = true
      })

      // Auto morph timing
      if (autoMorph && !anyMorphing) {
        timeSinceLastMorphRef.current += deltaTime
        if (timeSinceLastMorphRef.current >= SHAPE_HOLD_DURATION / currentSpeed) {
          morphToNextShape()
        }
      }

      // Clear canvas
      ctx.clearRect(0, 0, size, size)

      // Calculate projected positions and sort by depth
      const baseDotSize = Math.max(MIN_DOT_SIZE, size * BASE_DOT_SIZE_RATIO)

      const projected = particlesRef.current.map((particle, index) => {
        const rotated = particle.getRotatedPosition(rotationRef.current)
        const { screenX, screenY, scale, squash, rotation, lightSizeBoost } = project(
          rotated.x,
          rotated.y,
          rotated.z
        )

        return {
          index,
          screenX,
          screenY,
          scale,
          squash,
          rotation,
          lightSizeBoost,
          z: rotated.z,
          particle,
        }
      })

      // Sort by z (back to front)
      projected.sort((a, b) => a.z - b.z)

      // Draw particles as ellipses with flat fill
      projected.forEach(({ index, screenX, screenY, scale, squash, rotation, lightSizeBoost, particle }) => {
        const dotSize = baseDotSize * scale * particle.sizeVariation * lightSizeBoost
        const rx = Math.max(0.5, dotSize)
        const ry = Math.max(0.3, dotSize * squash)

        // Get color
        let fillColor: string
        if (variant === 'mono') {
          fillColor = color
        } else {
          fillColor = palette[index % palette.length]
        }

        ctx.beginPath()
        // Use ellipse's built-in rotation parameter (5th param) instead of ctx.rotate()
        // rx is major axis (tangent to sphere edge), ry is minor axis (toward center)
        ctx.ellipse(screenX, screenY, rx, ry, rotation, 0, Math.PI * 2)
        ctx.fillStyle = fillColor
        ctx.fill()
      })

      animationRef.current = requestAnimationFrame(animate)
    },
    [
      size,
      baseSpeed,
      hoverSpeed,
      hoverIntensity,
      autoMorph,
      morphToNextShape,
      project,
      variant,
      color,
      palette,
    ]
  )

  // Setup and cleanup
  useEffect(() => {
    initParticles()
    animationRef.current = requestAnimationFrame(animate)

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [initParticles, animate])

  // Handle hover state sync
  useEffect(() => {
    isHoveredRef.current = isHovered
  }, [isHovered])

  // Handle resize
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    // Set actual pixel size for retina displays
    const dpr = window.devicePixelRatio || 1
    canvas.width = size * dpr
    canvas.height = size * dpr

    const ctx = canvas.getContext('2d')
    if (ctx) {
      ctx.scale(dpr, dpr)
    }
  }, [size])

  return (
    <canvas
      ref={canvasRef}
      width={size}
      height={size}
      className={className}
      style={{ width: size, height: size }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    />
  )
}

export default MorphingOrb
