import { useEffect, useRef, useState } from 'react';

import { IGNITION_SELECTORS, isTouchDevice } from './utils';

export interface IgnitionPoint {
  element: Element;
  rect: DOMRect;
  radius: number;
  intensity: number;
}

const SELECTOR_INTENSITY: Record<string, number> = {
  h1: 1.0,
  h2: 0.9,
  h3: 0.9,
  '.settings-orb': 0.8,
};

const DEFAULT_INTENSITY = 0.7;
const IGNITION_RADIUS = 150;

function getIntensityForSelector(selector: string): number {
  return SELECTOR_INTENSITY[selector] ?? DEFAULT_INTENSITY;
}

function buildIgnitionPoints(): IgnitionPoint[] {
  const points: IgnitionPoint[] = [];

  for (const selector of IGNITION_SELECTORS) {
    const elements = document.querySelectorAll(selector);
    for (const el of elements) {
      const rect = el.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) continue;

      points.push({
        element: el,
        rect,
        radius: IGNITION_RADIUS,
        intensity: getIntensityForSelector(selector),
      });
    }
  }

  return points;
}

export function getIgnitionInfluence(x: number, y: number, points: IgnitionPoint[]): number {
  let maxInfluence = 0;

  for (const point of points) {
    const centerX = point.rect.left + point.rect.width / 2;
    const centerY = point.rect.top + point.rect.height / 2;
    const distance = Math.hypot(x - centerX, y - centerY);

    if (distance < point.radius) {
      const influence = (1 - distance / point.radius) * point.intensity;
      maxInfluence = Math.max(maxInfluence, influence);
    }
  }

  return maxInfluence;
}

export function useIgnitionPoints(): IgnitionPoint[] {
  const [points, setPoints] = useState<IgnitionPoint[]>([]);
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    // Skip on touch devices - no cursor-based effects
    if (isTouchDevice()) {
      setPoints([]);
      return;
    }

    const updatePoints = () => {
      setPoints(buildIgnitionPoints());
    };

    updatePoints();

    // Observe all ignition elements for visibility changes
    observerRef.current = new IntersectionObserver(() => {
      updatePoints();
    });

    for (const selector of IGNITION_SELECTORS) {
      const elements = document.querySelectorAll(selector);
      for (const el of elements) {
        observerRef.current.observe(el);
      }
    }

    // Update on scroll and resize
    const handleUpdate = () => updatePoints();
    window.addEventListener('resize', handleUpdate);
    window.addEventListener('scroll', handleUpdate, { passive: true });

    return () => {
      observerRef.current?.disconnect();
      window.removeEventListener('resize', handleUpdate);
      window.removeEventListener('scroll', handleUpdate);
    };
  }, []);

  return points;
}
