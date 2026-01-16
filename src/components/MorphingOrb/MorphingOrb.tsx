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
  PERSPECTIVE,
  BASE_DOT_SIZE_RATIO,
  MIN_DOT_SIZE,
  DEPTH_SIZE_SCALE,
  type ShapeType,
} from './constants'

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
  const radius = size * 0.35

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

  // Project 3D to 2D
  const project = useCallback(
    (x: number, y: number, z: number) => {
      const scale = PERSPECTIVE / (PERSPECTIVE + z / radius)
      return {
        screenX: size / 2 + x * scale,
        screenY: size / 2 + y * scale,
        scale,
      }
    },
    [size, radius]
  )

  // Get dot color
  const getDotColor = useCallback(
    (index: number, z: number): string => {
      if (variant === 'mono') {
        // Slight opacity variation based on depth
        const depthFactor = 0.5 + ((z / radius + 1) / 2) * 0.5
        // Parse hex color and apply opacity
        const hex = color.replace('#', '')
        const r = parseInt(hex.slice(0, 2), 16)
        const g = parseInt(hex.slice(2, 4), 16)
        const b = parseInt(hex.slice(4, 6), 16)
        return `rgba(${r}, ${g}, ${b}, ${depthFactor})`
      } else {
        return palette[index % palette.length]
      }
    },
    [variant, color, palette, radius]
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
      const projected = particlesRef.current.map((particle, index) => {
        const rotated = particle.getRotatedPosition(rotationRef.current)

        // Add subtle wobble
        const wobbleTime = timestamp * 0.001
        const wobbleAmp = 0.02 * radius * (hovered ? intensity : 1)
        const wobbleX =
          Math.sin(wobbleTime + particle.wobbleOffset) * wobbleAmp
        const wobbleY =
          Math.cos(wobbleTime * 0.7 + particle.wobbleOffset) * wobbleAmp

        const { screenX, screenY, scale } = project(
          rotated.x + wobbleX,
          rotated.y + wobbleY,
          rotated.z
        )

        return {
          index,
          screenX,
          screenY,
          scale,
          z: rotated.z,
          particle,
        }
      })

      // Sort by z (back to front)
      projected.sort((a, b) => a.z - b.z)

      // Draw particles
      const baseDotSize = Math.max(MIN_DOT_SIZE, size * BASE_DOT_SIZE_RATIO)

      projected.forEach(({ index, screenX, screenY, scale, z, particle }) => {
        const dotSize =
          baseDotSize *
          scale *
          particle.sizeVariation *
          (1 + (z / radius) * DEPTH_SIZE_SCALE * 0.3)

        ctx.beginPath()
        ctx.arc(screenX, screenY, Math.max(0.5, dotSize), 0, Math.PI * 2)
        ctx.fillStyle = getDotColor(index, z)
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
      getDotColor,
      radius,
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
