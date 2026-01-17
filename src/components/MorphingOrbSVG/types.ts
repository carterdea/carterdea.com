export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface ProjectedDot {
  cx: number;
  cy: number;
  rx: number;
  ry: number;
  rotation: number; // degrees
  opacity: number;
  z: number; // for sorting
  originalIndex: number; // stable index for color assignment
  point3D: Point3D; // original rotated 3D point for spatial coloring
}

export type ShapeType =
  | 'gridSphere' // lat/long grid like icon 363881
  | 'offsetSphere' // staggered grid - alternating rows offset
  | 'curvedArcs' // 3 great circle arcs like icon 363882
  | 'fibSphere' // fibonacci distribution like icon 363875
  | 'orbit'
  | 'doubleOrbit';

export type ColorMode = 'sequential' | 'spatial' | 'shuffled';

export interface MorphingOrbSVGProps {
  size?: number;
  variant?: 'mono' | 'color';
  color?: string;
  palette?: string[];
  colorMode?: ColorMode;
  className?: string;
  shapeSequence?: ShapeType[];
  autoMorph?: boolean;
  morphDuration?: number;
  holdDuration?: number;
}
