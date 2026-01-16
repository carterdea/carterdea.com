export interface TrailCharacter {
  char: string;
  y: number;
}

export interface Column {
  x: number;
  y: number; // Current head position
  speed: number; // Multiplier for drop speed
  trail: TrailCharacter[]; // Characters in the trail
  nextStepTime: number; // When to advance this column
  stepInterval: number; // Ms between steps for this column
  trailLength: number; // Random trail length for this column
  brightness: number; // 0-1 multiplier for brightness variation
  fontSize: number; // Random font size for this column
}
