export interface Point3D {
  x: number
  y: number
  z: number
}

export type ShapeType =
  | 'gridSphere'
  | 'offsetSphere'
  | 'curvedArcs'
  | 'fibSphere'
  | 'orbit'
  | 'doubleOrbit'

export type ColorMode = 'sequential' | 'spatial' | 'shuffled'

export interface MorphingOrbGLProps {
  size?: number
  variant?: 'mono' | 'color'
  color?: string
  palette?: string[]
  colorMode?: ColorMode
  className?: string
  shapeSequence?: ShapeType[]
  autoMorph?: boolean
  morphDuration?: number
  holdDuration?: number
}
