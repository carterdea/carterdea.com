export interface TrailCharacter {
  char: string;
  y: number;
}

export interface Column {
  x: number;
  y: number;
  trail: TrailCharacter[];
  nextStepTime: number;
  stepInterval: number;
  trailLength: number;
  brightness: number;
  fontSize: number;
}
