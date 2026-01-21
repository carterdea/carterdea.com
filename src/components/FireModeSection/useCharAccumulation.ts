import { useEffect, useRef } from 'react';

import { isTouchDevice, TRACKABLE_TAGS } from './utils';

const SINGE_CLASSES = ['singed-1', 'singed-2', 'singed-3'] as const;
const MAX_SINGE_LEVEL = 3;

interface CharState {
  singedElements: Set<Element>;
  singeLevel: Map<Element, number>;
  hoverCount: number;
}

function cleanupElement(el: Element): void {
  for (const cls of SINGE_CLASSES) {
    el.classList.remove(cls);
  }
}

export function useCharAccumulation(): () => void {
  const stateRef = useRef<CharState>({
    singedElements: new Set(),
    singeLevel: new Map(),
    hoverCount: 0,
  });
  const cleanupRef = useRef<() => void>(() => {});

  useEffect(() => {
    // Skip on touch devices
    if (isTouchDevice()) return;

    const state = stateRef.current;

    const handleMouseOver = (event: MouseEvent) => {
      const target = event.target as Element;
      if (!target || target === document.body || target === document.documentElement) return;

      // Only track interactive/text elements
      const tagName = target.tagName.toLowerCase();
      const isTrackable =
        (TRACKABLE_TAGS as readonly string[]).includes(tagName) ||
        target.hasAttribute('data-ignition');

      if (!isTrackable) return;

      if (!state.singedElements.has(target)) {
        state.singedElements.add(target);
        state.singeLevel.set(target, 1);
        state.hoverCount++;
      } else {
        const current = state.singeLevel.get(target) || 0;
        if (current < MAX_SINGE_LEVEL) {
          state.singeLevel.set(target, current + 1);
        }
      }

      // Apply visual class
      cleanupElement(target);
      const level = state.singeLevel.get(target) || 1;
      target.classList.add(`singed-${level}`);
    };

    document.addEventListener('mouseover', handleMouseOver);

    cleanupRef.current = () => {
      // Remove all singed classes
      for (const el of state.singedElements) {
        cleanupElement(el);
      }
      state.singedElements.clear();
      state.singeLevel.clear();
      state.hoverCount = 0;
    };

    return () => {
      document.removeEventListener('mouseover', handleMouseOver);
      cleanupRef.current();
    };
  }, []);

  return cleanupRef.current;
}
