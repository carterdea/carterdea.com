import { useCallback, useEffect, useLayoutEffect, useRef } from 'react';

import { getDeviceTier } from './utils';

interface EmberZone {
  x: number; // Center position as percentage (0-1)
  width: number; // Width as percentage (0-1)
  baseIntensity: number; // Base heat level (0.4-0.8)
  // Multiple frequencies for organic flicker
  freq1: number; // Primary slow pulse
  freq2: number; // Secondary medium flicker
  freq3: number; // Tertiary fast flicker
  phase1: number;
  phase2: number;
  phase3: number;
  // Flicker characteristics
  flickerAmount: number; // How much this zone flickers (0.1-0.3)
  jitterRate: number; // Stepped jitter updates per second
  sparkRate: number; // Spark event checks per second
  lastFlicker: number; // For random flicker events
  lastUpdate: number; // Last time intensity was updated
  jitterValue: number; // Current stepped jitter value (-1 to 1)
  flickerDecay: number; // Current flicker intensity decaying
}

interface HeadingState {
  element: HTMLElement;
  zones: EmberZone[];
}

const EMBER_COLORS = {
  coolEmber: { r: 180, g: 60, b: 20 }, // Deep red-orange (cooler ember)
  warmEmber: { r: 220, g: 100, b: 30 }, // Orange (warm)
  hotEmber: { r: 245, g: 125, b: 40 }, // Deeper orange (hot)
  glowingEmber: { r: 250, g: 160, b: 60 }, // Orange-gold (very hot)
  whiteHot: { r: 255, g: 190, b: 90 }, // Soft white-hot (reduced yellow)
} as const;

const EMBER_TEXT_ATTR = 'data-ember-text';
const HEADING_SELECTORS = 'h1, h2, h3';
const EMBER_CLASS = 'ember-text';
const FLICKER_BOOST = 1.25;
const FIRE_TICK_EVENT = 'firemode:tick';
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

function lerpColor(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number },
  t: number
): { r: number; g: number; b: number } {
  return {
    r: Math.round(c1.r + (c2.r - c1.r) * t),
    g: Math.round(c1.g + (c2.g - c1.g) * t),
    b: Math.round(c1.b + (c2.b - c1.b) * t),
  };
}

function intensityToColor(intensity: number): { r: number; g: number; b: number } {
  const i = Math.max(0, Math.min(1, intensity));

  if (i <= 0.3) {
    const t = i / 0.25;
    return lerpColor(EMBER_COLORS.coolEmber, EMBER_COLORS.warmEmber, t);
  } else if (i <= 0.6) {
    const t = (i - 0.3) / 0.3;
    return lerpColor(EMBER_COLORS.warmEmber, EMBER_COLORS.hotEmber, t);
  } else if (i <= 0.85) {
    const t = (i - 0.6) / 0.25;
    return lerpColor(EMBER_COLORS.hotEmber, EMBER_COLORS.glowingEmber, t);
  } else {
    const t = Math.min(1, (i - 0.85) / 0.15);
    return lerpColor(EMBER_COLORS.glowingEmber, EMBER_COLORS.whiteHot, t);
  }
}

function generateZones(level: 1 | 2 | 3): EmberZone[] {
  const zones: EmberZone[] = [];
  const zoneCounts: Record<1 | 2 | 3, number> = {
    1: 6,
    2: 5,
    3: 4,
  };

  const count = zoneCounts[level];
  const baseWidth = 1 / count;

  for (let i = 0; i < count; i++) {
    const centerX = (i + 0.5) / count + (Math.random() - 0.5) * 0.08;
    const width = baseWidth * (1.2 + Math.random() * 0.4);

    zones.push({
      x: Math.max(0, centerX - width / 2),
      width: Math.min(width, 1 - Math.max(0, centerX - width / 2)),
      baseIntensity: 0.5 + Math.random() * 0.3,
      freq1: 0.35 + Math.random() * 0.35,
      freq2: 1.4 + Math.random() * 0.8,
      freq3: 9.0 + Math.random() * 7.0,
      phase1: Math.random() * Math.PI * 2,
      phase2: Math.random() * Math.PI * 2,
      phase3: Math.random() * Math.PI * 2,
      flickerAmount: 0.45 + Math.random() * 0.25,
      jitterRate: 24 + Math.random() * 16,
      sparkRate: 7 + Math.random() * 6,
      lastFlicker: 0,
      lastUpdate: 0,
      jitterValue: 0,
      flickerDecay: 0,
    });
  }

  return zones;
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed * 12.9898) * 43758.5453;
  return x - Math.floor(x);
}

function calculateZoneIntensity(zone: EmberZone, time: number): number {
  const dt = zone.lastUpdate === 0 ? 0 : Math.max(0, time - zone.lastUpdate);
  zone.lastUpdate = time;

  const breathing = Math.sin(time * zone.freq1 + zone.phase1);
  const pulse = Math.sin(time * zone.freq2 + zone.phase2);
  const fastFlicker = Math.sin(time * zone.freq3 + zone.phase3);

  const jitterInterval = 1 / zone.jitterRate;
  if (time - zone.lastFlicker >= jitterInterval) {
    const steps = Math.floor((time - zone.lastFlicker) / jitterInterval);
    zone.lastFlicker += steps * jitterInterval;
    const jitterSeed = Math.floor(zone.lastFlicker * 1000 + zone.phase3 * 1000);
    zone.jitterValue = (seededRandom(jitterSeed) - 0.5) * 2;
  }

  const spikeSeed = Math.floor(time * zone.sparkRate) + Math.floor(zone.phase2 * 1000);
  const spikeRand = seededRandom(spikeSeed);
  if (spikeRand > 0.92) {
    const spikeStrength = 0.6 + 0.6 * seededRandom(spikeSeed + 2);
    zone.flickerDecay = Math.max(zone.flickerDecay, spikeStrength);
  }
  if (dt > 0) {
    zone.flickerDecay = Math.max(0, zone.flickerDecay - dt * (3.4 + zone.sparkRate * 0.35));
  }

  const combined =
    zone.baseIntensity +
    breathing * 0.14 +
    pulse * 0.12 +
    fastFlicker * 0.05 +
    zone.jitterValue * zone.flickerAmount * (FLICKER_BOOST * 1.35) +
    zone.flickerDecay * 0.85 * FLICKER_BOOST;

  const clamped = Math.max(0.05, Math.min(1, combined));
  return clamped ** 0.8;
}

function buildGradientString(zones: EmberZone[], time: number): string {
  const sampleCount = 14;
  const stops: string[] = [];
  const zoneIntensities = zones.map((zone) => calculateZoneIntensity(zone, time));

  for (let i = 0; i <= sampleCount; i++) {
    const position = i / sampleCount;

    let totalIntensity = 0;
    let totalWeight = 0;
    let maxIntensity = 0;

    for (const [index, zone] of zones.entries()) {
      const zoneCenter = zone.x + zone.width / 2;
      const distance = Math.abs(position - zoneCenter);
      const halfWidth = zone.width / 2;

      if (distance < halfWidth * 1.5) {
        const weight = Math.exp((-distance * distance) / (halfWidth * halfWidth * 0.3));
        const zoneIntensity = zoneIntensities[index] ?? zone.baseIntensity;
        totalIntensity += zoneIntensity * weight;
        totalWeight += weight;
        if (zoneIntensity > maxIntensity) maxIntensity = zoneIntensity;
      }
    }

    const avgIntensity = totalWeight > 0 ? totalIntensity / totalWeight : 0.4;
    const blended = avgIntensity * 0.3 + maxIntensity * 0.7;
    const intensity = Math.min(0.88, Math.max(0, blended ** 1.15));
    const color = intensityToColor(intensity);
    const colorStr = `rgb(${color.r}, ${color.g}, ${color.b})`;

    stops.push(`${colorStr} ${(position * 100).toFixed(1)}%`);
  }

  return `linear-gradient(90deg, ${stops.join(', ')})`;
}

export function useEmberText(): () => void {
  const headingsRef = useRef<Map<HTMLElement, HeadingState>>(new Map());
  const animationRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0);
  const isInitializedRef = useRef(false);
  const allowMotionRef = useRef(true);
  const lastExternalTickRef = useRef<number>(0);

  const cleanup = useCallback(() => {
    for (const [element] of headingsRef.current) {
      element.removeAttribute(EMBER_TEXT_ATTR);
      element.classList.remove(EMBER_CLASS);
      element.style.removeProperty('--ember-gradient');
      element.style.removeProperty('background-image');
      element.style.removeProperty('-webkit-text-fill-color');
      element.style.removeProperty('color');
      element.style.background = '';
      element.style.backgroundClip = '';
      element.style.webkitBackgroundClip = '';
      element.style.color = '';
      element.style.textShadow = '';
    }
    headingsRef.current.clear();
    isInitializedRef.current = false;
    if (animationRef.current) {
      cancelAnimationFrame(animationRef.current);
      animationRef.current = 0;
    }
  }, []);

  useIsomorphicLayoutEffect(() => {
    const tier = getDeviceTier();

    if (tier === 'low') {
      return cleanup;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    allowMotionRef.current = !prefersReducedMotion;

    const initializeHeadings = () => {
      if (isInitializedRef.current) return;

      const headings = document.querySelectorAll<HTMLElement>(HEADING_SELECTORS);
      let count = 0;
      const fadeInTargets: HTMLElement[] = [];

      headings.forEach((element) => {
        // Skip if already initialized or inside settings
        if (element.hasAttribute(EMBER_TEXT_ATTR)) return;
        if (element.closest('[data-settings]')) return;

        // Determine heading level
        const tagName = element.tagName.toLowerCase();
        const levelMap: Record<string, 1 | 2 | 3> = { h1: 1, h2: 2, h3: 3 };
        const level = levelMap[tagName] ?? 3;

        const zones = generateZones(level);

        // Style the heading with background-clip: text
        element.setAttribute(EMBER_TEXT_ATTR, 'true');
        element.classList.add(EMBER_CLASS);
        element.style.setProperty('--ember-gradient', buildGradientString(zones, 0));
        element.style.setProperty('background-image', 'var(--ember-gradient)', 'important');
        element.style.backgroundClip = 'text';
        element.style.webkitBackgroundClip = 'text';
        element.style.setProperty('-webkit-text-fill-color', 'transparent', 'important');
        element.style.setProperty('color', 'transparent', 'important');
        element.style.textShadow = 'none';
        element.style.opacity = '0';
        element.style.transition = 'opacity 260ms var(--ease-out-expo, ease-out)';

        const state: HeadingState = {
          element,
          zones,
        };

        headingsRef.current.set(element, state);
        fadeInTargets.push(element);
        count++;
      });

      if (count > 0) {
        isInitializedRef.current = true;
        requestAnimationFrame(() => {
          fadeInTargets.forEach((element) => {
            element.style.opacity = '1';
          });
        });
      }
    };

    const initFrame = requestAnimationFrame(initializeHeadings);

    startTimeRef.current = performance.now();

    const tick = (now: number) => {
      const time = allowMotionRef.current ? (now - startTimeRef.current) / 1000 : 0;

      // Update gradient for all headings
      for (const state of headingsRef.current.values()) {
        const gradient = buildGradientString(state.zones, time);
        state.element.style.setProperty('--ember-gradient', gradient);
        state.element.style.setProperty('background-image', 'var(--ember-gradient)', 'important');
        state.element.style.setProperty('-webkit-text-fill-color', 'transparent', 'important');
        state.element.style.setProperty('color', 'transparent', 'important');
        state.element.style.setProperty('text-shadow', 'none', 'important');
      }
    };

    const animate = (now: number) => {
      if (now - lastExternalTickRef.current > 250) {
        tick(now);
      }
      animationRef.current = requestAnimationFrame(animate);
    };

    const handleFireTick = (event: Event) => {
      const customEvent = event as CustomEvent<{ time?: number }>;
      const now = customEvent.detail?.time ?? performance.now();
      lastExternalTickRef.current = now;
      tick(now);
    };

    window.addEventListener(FIRE_TICK_EVENT, handleFireTick as EventListener);
    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(initFrame);
      window.removeEventListener(FIRE_TICK_EVENT, handleFireTick as EventListener);
      cleanup();
    };
  }, [cleanup]);

  return cleanup;
}
