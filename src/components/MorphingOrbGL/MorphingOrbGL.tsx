import { useRef, useEffect, useState, useCallback, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import type { Point3D, ShapeType, MorphingOrbGLProps, ColorMode } from './types'
import {
  gridSphere,
  offsetSphere,
  curvedArcs,
  fibSphere,
  orbit,
  doubleOrbit,
  getDotCount,
  lerpPoint,
  easeOutExpo,
} from './shapes'

const DEFAULT_SEQUENCE: ShapeType[] = ['gridSphere', 'curvedArcs', 'fibSphere', 'doubleOrbit']

const DEFAULT_PALETTE = [
  '#fca5a5',
  '#fdba74',
  '#fcd34d',
  '#fde047',
  '#bef264',
  '#86efac',
  '#6ee7b7',
  '#5eead4',
  '#67e8f9',
  '#7dd3fc',
  '#93c5fd',
  '#a5b4fc',
  '#c4b5fd',
  '#d8b4fe',
  '#f0abfc',
  '#f9a8d4',
  '#fda4af',
]

interface ParticlesProps {
  points: Point3D[]
  variant: 'mono' | 'color'
  color: string
  palette: string[]
  colorMode: ColorMode
  colorRotation: number
  dotSize: number
  groupRotationY: number
  groupRotationX: number
}

function Particles({
  points,
  variant,
  color,
  palette,
  colorMode,
  colorRotation,
  dotSize,
  groupRotationY,
  groupRotationX,
}: ParticlesProps) {
  const meshRef = useRef<THREE.InstancedMesh>(null)
  const tempColor = useMemo(() => new THREE.Color(), [])
  const tempMatrix = useMemo(() => new THREE.Matrix4(), [])
  const tempPosition = useMemo(() => new THREE.Vector3(), [])
  const tempQuaternion = useMemo(() => new THREE.Quaternion(), [])
  const tempScale = useMemo(() => new THREE.Vector3(), [])
  const upVector = useMemo(() => new THREE.Vector3(0, 0, 1), [])

  // Create shuffled palette (deterministic)
  const shuffledPalette = useMemo(() => {
    const shuffled = [...palette]
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor((i * 7919) % (i + 1))
      ;[shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]]
    }
    return shuffled
  }, [palette])

  // Get color for a dot
  const getDotColorHex = useCallback(
    (index: number, point: Point3D): string => {
      if (variant === 'mono') {
        return color
      }

      switch (colorMode) {
        case 'spatial': {
          const angle = Math.atan2(point.x, point.z)
          const offsetAngle = angle + colorRotation
          const normalizedAngle = ((offsetAngle + Math.PI) % (2 * Math.PI)) / (2 * Math.PI)
          const paletteIndex = Math.floor(normalizedAngle * palette.length)
          return palette[Math.abs(paletteIndex) % palette.length]
        }
        case 'shuffled':
          return shuffledPalette[index % shuffledPalette.length]
        default:
          return palette[index % palette.length]
      }
    },
    [variant, color, palette, shuffledPalette, colorMode, colorRotation]
  )

  useEffect(() => {
    if (!meshRef.current) return

    // Pre-calculate rotation matrices for transforming points to world space
    const cosY = Math.cos(groupRotationY)
    const sinY = Math.sin(groupRotationY)
    const cosX = Math.cos(groupRotationX)
    const sinX = Math.sin(groupRotationX)

    for (let i = 0; i < points.length; i++) {
      const point = points[i]

      // Apply group rotation to get world-space position
      // First rotate around Y
      const wx = point.x * cosY + point.z * sinY
      const wyBeforeX = point.y
      const wzBeforeX = -point.x * sinY + point.z * cosY
      // Then rotate around X
      const wy = wyBeforeX * cosX - wzBeforeX * sinX
      const wz = wyBeforeX * sinX + wzBeforeX * cosX

      // Calculate facing based on world-space z (after rotation)
      const len = Math.sqrt(wx * wx + wy * wy + wz * wz) || 1
      const nzWorld = wz / len

      // Use absolute value - both front-facing AND back-facing dots should be round
      // Only edge dots (nz near 0) should be squashed
      const facing = Math.abs(nzWorld)

      // Squash factor: dots at edges (facing = 0) are thin, dots facing/away from camera (facing = 1) are round
      const squash = 0.15 + facing * 0.85

      // Position (local space - the group handles rotation)
      tempPosition.set(point.x, point.y, point.z)

      // Calculate surface normal (for sphere, it's just the normalized position)
      const localLen = Math.sqrt(point.x * point.x + point.y * point.y + point.z * point.z) || 1
      const nx = point.x / localLen
      const ny = point.y / localLen
      const nz = point.z / localLen

      // Orient the disc to face outward from sphere center (along normal)
      const normalVector = new THREE.Vector3(nx, ny, nz)
      tempQuaternion.setFromUnitVectors(upVector, normalVector)

      // Scale: squash in one direction based on viewing angle
      tempScale.set(dotSize, dotSize * squash, 1)

      // Compose the matrix
      tempMatrix.compose(tempPosition, tempQuaternion, tempScale)
      meshRef.current.setMatrixAt(i, tempMatrix)

      // Set color with depth-based dimming
      const hex = getDotColorHex(i, point)
      tempColor.set(hex)

      // Back dots get darker (nzWorld ranges from -1 to 1, map to 0.35-1.0 brightness)
      const depthBrightness = 0.35 + (nzWorld + 1) * 0.325
      tempColor.multiplyScalar(depthBrightness)

      meshRef.current.setColorAt(i, tempColor)
    }

    meshRef.current.instanceMatrix.needsUpdate = true
    if (meshRef.current.instanceColor) {
      meshRef.current.instanceColor.needsUpdate = true
    }
  }, [points, getDotColorHex, tempColor, tempMatrix, tempPosition, tempQuaternion, tempScale, upVector, dotSize, groupRotationY, groupRotationX])

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, points.length]}>
      <circleGeometry args={[1, 16]} />
      <meshBasicMaterial side={THREE.DoubleSide} />
    </instancedMesh>
  )
}

interface SceneProps {
  size: number
  variant: 'mono' | 'color'
  color: string
  palette: string[]
  colorMode: ColorMode
  shapeSequence: ShapeType[]
  autoMorph: boolean
  morphDuration: number
  holdDuration: number
  isHovered: boolean
}

function Scene({
  size,
  variant,
  color,
  palette,
  colorMode,
  shapeSequence,
  autoMorph,
  morphDuration,
  holdDuration,
  isHovered,
}: SceneProps) {
  const groupRef = useRef<THREE.Group>(null)
  const [points, setPoints] = useState<Point3D[]>([])
  const [colorRotation, setColorRotation] = useState(0)
  const [groupRotation, setGroupRotation] = useState({ y: 0, x: 0 })

  const currentPointsRef = useRef<Point3D[]>([])
  const targetPointsRef = useRef<Point3D[]>([])
  const shapeIndexRef = useRef(0)
  const morphProgressRef = useRef(1)
  const holdTimerRef = useRef(0)
  const arcTimeRef = useRef(0)
  const colorRotationRef = useRef(0)
  const rotationRef = useRef({ y: 0, x: 0 })

  const radius = 1 // Normalized radius for 3D space
  // Dot sizes proportional to sphere - increased by 25%
  const dotSize = size <= 32 ? 0.075 : size <= 64 ? 0.0625 : size <= 200 ? 0.056 : 0.044

  // Generate shape points
  const generateShapePoints = useCallback(
    (shapeType: ShapeType): Point3D[] => {
      const count = getDotCount(shapeType, size)

      switch (shapeType) {
        case 'gridSphere':
          return gridSphere(radius, size)
        case 'offsetSphere':
          return offsetSphere(radius, size)
        case 'curvedArcs':
          return curvedArcs(radius, 0, size)
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
    [size]
  )

  // Initialize
  useEffect(() => {
    const initialShape = shapeSequence[0]
    const pts = generateShapePoints(initialShape)
    currentPointsRef.current = pts
    targetPointsRef.current = pts
    morphProgressRef.current = 1
    setPoints(pts)
  }, [generateShapePoints, shapeSequence])

  // Morph to next shape
  const morphToNextShape = useCallback(() => {
    shapeIndexRef.current = (shapeIndexRef.current + 1) % shapeSequence.length
    const nextShape = shapeSequence[shapeIndexRef.current]
    const newTarget = generateShapePoints(nextShape)

    const currentCount = currentPointsRef.current.length
    const targetCount = newTarget.length

    if (targetCount > currentCount) {
      while (currentPointsRef.current.length < targetCount) {
        const idx = currentPointsRef.current.length % currentCount
        currentPointsRef.current.push({ ...currentPointsRef.current[idx] })
      }
    } else if (targetCount < currentCount) {
      currentPointsRef.current = currentPointsRef.current.slice(0, targetCount)
    }

    targetPointsRef.current = newTarget
    morphProgressRef.current = 0
    holdTimerRef.current = 0
  }, [generateShapePoints, shapeSequence])

  // Animation frame
  useFrame((state, delta) => {
    const deltaMs = delta * 1000
    const speedMultiplier = isHovered ? 2.5 : 1

    // Update rotation
    rotationRef.current.y += 0.0005 * deltaMs * speedMultiplier
    rotationRef.current.x = Math.sin(state.clock.elapsedTime * 0.2) * 0.1

    // Update arc time and color rotation
    arcTimeRef.current += deltaMs * speedMultiplier
    colorRotationRef.current += 0.0001875 * deltaMs * speedMultiplier

    const currentShapeType = shapeSequence[shapeIndexRef.current]

    // Update morph
    if (morphProgressRef.current < 1) {
      morphProgressRef.current = Math.min(
        1,
        morphProgressRef.current + (deltaMs / morphDuration) * speedMultiplier
      )

      const easedProgress = easeOutExpo(morphProgressRef.current)

      // Regenerate spinning shapes during morph
      if (currentShapeType === 'curvedArcs') {
        targetPointsRef.current = curvedArcs(radius, arcTimeRef.current, size)
      } else if (currentShapeType === 'orbit') {
        targetPointsRef.current = orbit(getDotCount('orbit', size), radius, arcTimeRef.current)
      } else if (currentShapeType === 'doubleOrbit') {
        targetPointsRef.current = doubleOrbit(
          getDotCount('doubleOrbit', size),
          radius,
          arcTimeRef.current
        )
      }

      currentPointsRef.current = currentPointsRef.current.map((point, i) => {
        const target = targetPointsRef.current[i] || point
        return lerpPoint(point, target, easedProgress)
      })
    } else {
      // Not morphing - update spinning shapes
      if (currentShapeType === 'curvedArcs') {
        currentPointsRef.current = curvedArcs(radius, arcTimeRef.current, size)
      } else if (currentShapeType === 'orbit') {
        currentPointsRef.current = orbit(getDotCount('orbit', size), radius, arcTimeRef.current)
      } else if (currentShapeType === 'doubleOrbit') {
        currentPointsRef.current = doubleOrbit(
          getDotCount('doubleOrbit', size),
          radius,
          arcTimeRef.current
        )
      }

      if (autoMorph) {
        holdTimerRef.current += deltaMs * speedMultiplier
        if (holdTimerRef.current >= holdDuration) {
          morphToNextShape()
        }
      }
    }

    // Update group rotation
    if (groupRef.current) {
      groupRef.current.rotation.y = rotationRef.current.y
      groupRef.current.rotation.x = rotationRef.current.x
    }

    setPoints([...currentPointsRef.current])
    setColorRotation(colorRotationRef.current)
    setGroupRotation({ y: rotationRef.current.y, x: rotationRef.current.x })
  })

  return (
    <group ref={groupRef}>
      <Particles
        points={points}
        variant={variant}
        color={color}
        palette={palette}
        colorMode={colorMode}
        colorRotation={colorRotation}
        dotSize={dotSize}
        groupRotationY={groupRotation.y}
        groupRotationX={groupRotation.x}
      />
    </group>
  )
}

export function MorphingOrbGL({
  size = 500,
  variant = 'mono',
  color = '#ffffff',
  palette = DEFAULT_PALETTE,
  colorMode = 'sequential',
  className = '',
  shapeSequence = DEFAULT_SEQUENCE,
  autoMorph = true,
  morphDuration = 2000,
  holdDuration = 3000,
}: MorphingOrbGLProps) {
  const [isHovered, setIsHovered] = useState(false)
  const [isVisible, setIsVisible] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Lazy load canvas only when visible
  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.disconnect()
        }
      },
      { rootMargin: '100px' }
    )

    if (containerRef.current) {
      observer.observe(containerRef.current)
    }

    return () => observer.disconnect()
  }, [])

  // Camera distance - far enough to prevent cropping
  const cameraZ = 3.5

  // Small orbs scale up on hover
  const hoverScale = size <= 64 ? 1.15 : 1

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label="Animated morphing sphere"
      style={{
        width: size,
        height: size,
        transform: isHovered ? `scale(${hoverScale})` : 'scale(1)',
        transition: 'transform 200ms ease-out',
      }}
      className={className}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {isVisible && (
        <Canvas
          dpr={[1, 2]}
          camera={{ position: [0, 0, cameraZ], fov: 45 }}
          style={{ background: 'transparent' }}
          gl={{ alpha: true, antialias: true }}
        >
          <ambientLight intensity={0.4} />
          <directionalLight position={[-2, 3, 2]} intensity={1.2} />
          <directionalLight position={[1, -1, -1]} intensity={0.3} />
          <Scene
            size={size}
            variant={variant}
            color={color}
            palette={palette}
            colorMode={colorMode}
            shapeSequence={shapeSequence}
            autoMorph={autoMorph}
            morphDuration={morphDuration}
            holdDuration={holdDuration}
            isHovered={isHovered}
          />
        </Canvas>
      )}
    </div>
  )
}

export default MorphingOrbGL
