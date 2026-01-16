import { useRef, useEffect, useState, useCallback } from 'react'
import type { Point3D, ProjectedDot, ShapeType, MorphingOrbSVGProps, ColorMode } from './types'
import {
  gridSphere,
  curvedArcs,
  fibSphere,
  orbit,
  doubleOrbit,
  getDotCount,
} from './shapes'
import { projectPoint, rotateY, rotateX, lerpPoint, easeOutExpo } from './projection'

const DEFAULT_SEQUENCE: ShapeType[] = ['gridSphere', 'curvedArcs', 'fibSphere', 'doubleOrbit']

export function MorphingOrbSVG({
  size = 500,
  variant = 'mono',
  color = '#ffffff',
  palette = [
    '#fca5a5', // red-300
    '#fdba74', // orange-300
    '#fcd34d', // amber-300
    '#fde047', // yellow-300
    '#bef264', // lime-300
    '#86efac', // green-300
    '#6ee7b7', // emerald-300
    '#5eead4', // teal-300
    '#67e8f9', // cyan-300
    '#7dd3fc', // sky-300
    '#93c5fd', // blue-300
    '#a5b4fc', // indigo-300
    '#c4b5fd', // violet-300
    '#d8b4fe', // purple-300
    '#f0abfc', // fuchsia-300
    '#f9a8d4', // pink-300
    '#fda4af', // rose-300
  ],
  colorMode = 'sequential',
  className = '',
  shapeSequence = DEFAULT_SEQUENCE,
  autoMorph = true,
  morphDuration = 2000,
  holdDuration = 3000,
}: MorphingOrbSVGProps) {
  const [dots, setDots] = useState<ProjectedDot[]>([])
  const [isHovered, setIsHovered] = useState(false)

  const currentPointsRef = useRef<Point3D[]>([])
  const targetPointsRef = useRef<Point3D[]>([])
  const shapeIndexRef = useRef(0)
  const rotationRef = useRef({ y: 0, x: 0 })
  const morphProgressRef = useRef(1)
  const holdTimerRef = useRef(0)
  const animationRef = useRef<number>(0)
  const lastTimeRef = useRef(0)
  const arcTimeRef = useRef(0) // Track time for arc spinning

  const radius = size * 0.4
  // Scale dot size - smaller dots for tiny sizes
  const baseDotSize = size <= 32 ? size * 0.025 : size <= 64 ? size * 0.03 : Math.max(2, size * 0.04)

  // Generate shape points
  const generateShapePoints = useCallback(
    (shapeType: ShapeType): Point3D[] => {
      const count = getDotCount(shapeType, size)

      switch (shapeType) {
        case 'gridSphere':
          return gridSphere(radius, size)
        case 'curvedArcs':
          return curvedArcs(radius)
        case 'fibSphere':
          return fibSphere(count > 0 ? count : 40, radius)
        case 'orbit':
          return orbit(count > 0 ? count : 16, radius)
        case 'doubleOrbit':
          return doubleOrbit(count > 0 ? count : 24, radius)
        default:
          return gridSphere(radius)
      }
    },
    [radius, size]
  )

  // Initialize
  useEffect(() => {
    const initialShape = shapeSequence[0]
    const points = generateShapePoints(initialShape)
    currentPointsRef.current = points
    targetPointsRef.current = points
    morphProgressRef.current = 1
  }, [generateShapePoints, shapeSequence])

  // Morph to next shape
  const morphToNextShape = useCallback(() => {
    shapeIndexRef.current = (shapeIndexRef.current + 1) % shapeSequence.length
    const nextShape = shapeSequence[shapeIndexRef.current]
    const newTarget = generateShapePoints(nextShape)

    // Match point counts by repeating/truncating
    const currentCount = currentPointsRef.current.length
    const targetCount = newTarget.length

    if (targetCount > currentCount) {
      // Add more points by duplicating existing ones
      while (currentPointsRef.current.length < targetCount) {
        const idx = currentPointsRef.current.length % currentCount
        currentPointsRef.current.push({ ...currentPointsRef.current[idx] })
      }
    } else if (targetCount < currentCount) {
      // Truncate or collapse extras to center
      currentPointsRef.current = currentPointsRef.current.slice(0, targetCount)
    }

    targetPointsRef.current = newTarget
    morphProgressRef.current = 0
    holdTimerRef.current = 0
  }, [generateShapePoints, shapeSequence])

  // Animation loop
  const animate = useCallback(
    (timestamp: number) => {
      const deltaTime = lastTimeRef.current ? timestamp - lastTimeRef.current : 16
      lastTimeRef.current = timestamp

      const speedMultiplier = isHovered ? 2.5 : 1

      // Update rotation
      rotationRef.current.y += 0.0005 * deltaTime * speedMultiplier
      rotationRef.current.x = Math.sin(timestamp * 0.0002) * 0.1

      // Update arc spinning time
      arcTimeRef.current += deltaTime * speedMultiplier

      // Get current shape type
      const currentShapeType = shapeSequence[shapeIndexRef.current]

      // Update morph
      if (morphProgressRef.current < 1) {
        morphProgressRef.current = Math.min(
          1,
          morphProgressRef.current + (deltaTime / morphDuration) * speedMultiplier
        )

        const easedProgress = easeOutExpo(morphProgressRef.current)

        // For spinning shapes, regenerate target points each frame
        if (currentShapeType === 'curvedArcs') {
          targetPointsRef.current = curvedArcs(radius, arcTimeRef.current)
        } else if (currentShapeType === 'orbit') {
          targetPointsRef.current = orbit(getDotCount('orbit', size), radius, arcTimeRef.current)
        } else if (currentShapeType === 'doubleOrbit') {
          targetPointsRef.current = doubleOrbit(getDotCount('doubleOrbit', size), radius, arcTimeRef.current)
        }

        // Interpolate points
        currentPointsRef.current = currentPointsRef.current.map((point, i) => {
          const target = targetPointsRef.current[i] || point
          return lerpPoint(point, target, easedProgress)
        })
      } else {
        // Not morphing - update spinning shapes directly
        if (currentShapeType === 'curvedArcs') {
          currentPointsRef.current = curvedArcs(radius, arcTimeRef.current)
        } else if (currentShapeType === 'orbit') {
          currentPointsRef.current = orbit(getDotCount('orbit', size), radius, arcTimeRef.current)
        } else if (currentShapeType === 'doubleOrbit') {
          currentPointsRef.current = doubleOrbit(getDotCount('doubleOrbit', size), radius, arcTimeRef.current)
        }

        if (autoMorph) {
          // Hold timer
          holdTimerRef.current += deltaTime * speedMultiplier
          if (holdTimerRef.current >= holdDuration) {
            morphToNextShape()
          }
        }
      }

      // Project all points with original index preserved
      const projected = currentPointsRef.current.map((point, index) => {
        // Apply rotation
        let rotated = rotateY(point, rotationRef.current.y)
        rotated = rotateX(rotated, rotationRef.current.x)

        return projectPoint(rotated, size, radius, baseDotSize, index)
      })

      // Sort by z (back to front) - lower z = further back = render first
      projected.sort((a, b) => a.z - b.z)

      setDots(projected)

      animationRef.current = requestAnimationFrame(animate)
    },
    [
      size,
      radius,
      baseDotSize,
      isHovered,
      autoMorph,
      morphDuration,
      holdDuration,
      morphToNextShape,
    ]
  )

  // Start animation
  useEffect(() => {
    animationRef.current = requestAnimationFrame(animate)
    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current)
      }
    }
  }, [animate])

  // Create shuffled palette (stable per component instance)
  const shuffledPaletteRef = useRef<string[]>([])
  if (shuffledPaletteRef.current.length !== palette.length) {
    // Fisher-Yates shuffle with deterministic seed based on palette
    const shuffled = [...palette]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor((i * 7919) % (i + 1)) // deterministic pseudo-random
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    shuffledPaletteRef.current = shuffled
  }

  // Get dot color based on mode
  const getDotColor = useCallback(
    (index: number, point?: Point3D): string => {
      if (variant === 'mono') {
        return color
      }

      switch (colorMode) {
        case 'spatial': {
          // Color based on angle around Y-axis (hue follows position)
          if (point) {
            const angle = Math.atan2(point.x, point.z) // -PI to PI
            const normalizedAngle = (angle + Math.PI) / (2 * Math.PI) // 0 to 1
            const paletteIndex = Math.floor(normalizedAngle * palette.length)
            return palette[paletteIndex % palette.length]
          }
          return palette[index % palette.length]
        }
        case 'shuffled':
          return shuffledPaletteRef.current[index % shuffledPaletteRef.current.length]
        case 'sequential':
        default:
          return palette[index % palette.length]
      }
    },
    [variant, color, palette, colorMode]
  )

  // Small orbs scale up slightly on hover
  const hoverScale = size <= 64 ? 1.15 : 1

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        overflow: 'visible',
        transform: isHovered ? `scale(${hoverScale})` : 'scale(1)',
        transition: 'transform 200ms ease-out',
      }}
    >
      {dots.map((dot, renderIndex) => (
        <ellipse
          key={renderIndex}
          cx={dot.cx}
          cy={dot.cy}
          rx={dot.rx}
          ry={dot.ry}
          transform={`rotate(${dot.rotation} ${dot.cx} ${dot.cy})`}
          fill={getDotColor(dot.originalIndex, dot.point3D)}
          fillOpacity={variant === 'mono' ? dot.opacity : 1}
        />
      ))}
    </svg>
  )
}

export default MorphingOrbSVG
