// Half-width katakana characters (U+FF66 to U+FF9D)
const KATAKANA = 'ｦｧｨｩｪｫｬｭｮｯｰｱｲｳｴｵｶｷｸｹｺｻｼｽｾｿﾀﾁﾂﾃﾄﾅﾆﾇﾈﾉﾊﾋﾌﾍﾎﾏﾐﾑﾒﾓﾔﾕﾖﾗﾘﾙﾚﾛﾜﾝ';

// Latin letters and numerals
const LATIN = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

// Combined character set
export const CHARACTERS = KATAKANA + LATIN;

// Typography
export const FONT_FAMILY = '"MS Gothic", "Osaka-Mono", "Yu Gothic", monospace';
export const MIN_FONT_SIZE = 12;
export const MAX_FONT_SIZE = 22;
export const COLUMN_WIDTH = 24; // Wide enough for largest font
export const LINE_HEIGHT_MULTIPLIER = 1.3; // Extra vertical spacing between characters

// Density - number of drops per column (allows overlapping drops)
export const DROPS_PER_COLUMN = 2;

// Trail configuration
export const MIN_TRAIL_LENGTH = 8;
export const MAX_TRAIL_LENGTH = 30;
export const MUTATION_CHANCE = 0.1; // 10% chance per frame for trail chars to change

// Brightness variation
export const MIN_BRIGHTNESS = 0.4;
export const MAX_BRIGHTNESS = 1.0;

// Colors (Tailwind equivalents)
export const HEAD_COLOR = '#ffffff'; // white
export const BRIGHT_GREEN = '#22c55e'; // green-500
export const BACKGROUND_COLOR = '#000000'; // black

// Glow configuration - strong bloom effect like the movie
export const MAX_GLOW_BLUR = 40;
export const HEAD_GLOW_BLUR = 60; // Extra strong glow for white heads
export const GLOW_COLOR = '#22c55e'; // green-500 for glow
export const HEAD_GLOW_COLOR = '#bbffbb'; // slight green tint to white glow

// Animation timing (ms per step) - tuned for film authenticity
// Wider range for more speed variation between columns
export const MIN_STEP_INTERVAL = 25;
export const MAX_STEP_INTERVAL = 120;

// Trail color gradient - returns color, glow intensity, and glow color
// Now takes trailLength and brightness as parameters for per-column variation
export function getTrailColor(
  position: number,
  trailLength: number,
  brightness: number
): { color: string; glow: number; glowColor: string } {
  // Normalize position to 0-1 based on this column's trail length
  const normalizedPos = position / trailLength;

  if (position === 0) {
    // Head - white with high white glow (brightness affects glow intensity)
    return { color: HEAD_COLOR, glow: brightness, glowColor: HEAD_GLOW_COLOR };
  }

  if (normalizedPos <= 0.15) {
    // Bright trail (first 15%)
    const r = Math.round(34 * brightness);
    const g = Math.round(197 * brightness);
    const b = Math.round(94 * brightness);
    return { color: `rgb(${r}, ${g}, ${b})`, glow: 0.8 * brightness, glowColor: GLOW_COLOR };
  }

  if (normalizedPos <= 0.5) {
    // Mid trail - gradually darken (15% to 50%)
    const t = (normalizedPos - 0.15) / 0.35;
    const r = Math.round((34 - t * 13) * brightness);
    const g = Math.round((197 - t * 69) * brightness);
    const b = Math.round((94 - t * 33) * brightness);
    return { color: `rgb(${r}, ${g}, ${b})`, glow: (0.4 - t * 0.4) * brightness, glowColor: GLOW_COLOR };
  }

  // Fade trail (50% to 100%)
  const t = (normalizedPos - 0.5) / 0.5;
  const r = Math.round((21 - t * 16) * brightness);
  const g = Math.round((128 - t * 82) * brightness);
  const b = Math.round((61 - t * 39) * brightness);
  return { color: `rgb(${r}, ${g}, ${b})`, glow: 0, glowColor: GLOW_COLOR };
}

// Get a random character from the set
export function getRandomCharacter(): string {
  return CHARACTERS[Math.floor(Math.random() * CHARACTERS.length)];
}
