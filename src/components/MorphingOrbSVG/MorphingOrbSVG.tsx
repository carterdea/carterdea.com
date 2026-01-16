import { useRef, useEffect, useState, useCallback } from 'react'
import type { Point3D, ProjectedDot, ShapeType, MorphingOrbSVGProps } from './types'
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
  palette = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7'],
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
          return gridSphere(radius)
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

  // Get dot color
  const getDotColor = useCallback(
    (index: number): string => {
      if (variant === 'mono') {
        return color
      }
      return palette[index % palette.length]
    },
    [variant, color, palette]
  )

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      className={className}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{ overflow: 'visible' }}
    >
      {dots.map((dot, renderIndex) => (
        <ellipse
          key={renderIndex}
          cx={dot.cx}
          cy={dot.cy}
          rx={dot.rx}
          ry={dot.ry}
          transform={`rotate(${dot.rotation} ${dot.cx} ${dot.cy})`}
          fill={getDotColor(dot.originalIndex)}
          fillOpacity={variant === 'mono' ? dot.opacity : 1}
        />
      ))}
    </svg>
  )
}

export default MorphingOrbSVG
