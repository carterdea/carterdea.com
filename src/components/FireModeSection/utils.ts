export type DeviceTier = 'high' | 'medium' | 'low';

export function isTouchDevice(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0;
}

export function getDeviceTier(): DeviceTier {
  if (typeof window === 'undefined') return 'medium';

  const isTouch = isTouchDevice();
  const cores = navigator.hardwareConcurrency || 4;
  const memory = (navigator as Navigator & { deviceMemory?: number }).deviceMemory || 4;

  // High-end phones (8+ cores, 4GB+ RAM) get full effects
  // Low-end phones (<=4 cores or <=2GB RAM) get reduced effects
  if (isTouch) {
    if (cores >= 8 && memory >= 4) return 'high';
    if (cores >= 6 && memory >= 3) return 'medium';
    return 'low';
  }

  // Desktop tiers
  if (cores >= 8) return 'high';
  if (cores >= 4) return 'medium';
  return 'low';
}

/** Resize a canvas to match window dimensions with device pixel ratio support */
export function resizeCanvasToWindow(canvas: HTMLCanvasElement): number {
  const dpr = window.devicePixelRatio || 1;
  canvas.width = window.innerWidth * dpr;
  canvas.height = window.innerHeight * dpr;
  canvas.style.width = `${window.innerWidth}px`;
  canvas.style.height = `${window.innerHeight}px`;
  return dpr;
}

/** Shared selectors for interactive/trackable elements */
export const TRACKABLE_TAGS = ['a', 'button', 'h1', 'h2', 'h3', 'h4', 'p', 'span', 'li'] as const;

/** Shared selectors for ignition source elements */
export const IGNITION_SELECTORS = [
  'a',
  'button',
  'h1',
  'h2',
  'h3',
  '.settings-orb',
  '.company-logo',
  '[data-ignition]',
] as const;
