import { useCallback, useEffect, useState } from 'react';

import { type BoxSpacing, parseBoxSpacing } from './inspectorUtils';

export interface ElementInfo {
  element: Element | null;
  rect: DOMRect | null;
  padding: BoxSpacing;
  margin: BoxSpacing;
  cursorX: number;
  cursorY: number;
}

const EMPTY_SPACING: BoxSpacing = { top: 0, right: 0, bottom: 0, left: 0 };

function createEmptyInfo(cursorX: number, cursorY: number): ElementInfo {
  return {
    element: null,
    rect: null,
    padding: EMPTY_SPACING,
    margin: EMPTY_SPACING,
    cursorX,
    cursorY,
  };
}

function isInspectableElement(el: Element | null): el is Element {
  if (!el) return false;
  if (el.closest('[data-inspector-overlay]')) return false;
  if (el.tagName === 'HTML' || el.tagName === 'BODY') return false;
  return true;
}

export function useElementUnderCursor(enabled: boolean): ElementInfo {
  const [info, setInfo] = useState<ElementInfo>(createEmptyInfo(0, 0));

  const handleMouseMove = useCallback((e: MouseEvent) => {
    const el = document.elementFromPoint(e.clientX, e.clientY);

    if (!isInspectableElement(el)) {
      setInfo(createEmptyInfo(e.clientX, e.clientY));
      return;
    }

    const rect = el.getBoundingClientRect();
    const style = getComputedStyle(el);

    setInfo({
      element: el,
      rect,
      padding: parseBoxSpacing(style, 'padding'),
      margin: parseBoxSpacing(style, 'margin'),
      cursorX: e.clientX,
      cursorY: e.clientY,
    });
  }, []);

  useEffect(() => {
    if (!enabled) {
      setInfo(createEmptyInfo(0, 0));
      return;
    }

    let rafId: number;

    function throttledHandler(e: MouseEvent): void {
      cancelAnimationFrame(rafId);
      rafId = requestAnimationFrame(() => handleMouseMove(e));
    }

    document.addEventListener('mousemove', throttledHandler);
    return () => {
      document.removeEventListener('mousemove', throttledHandler);
      cancelAnimationFrame(rafId);
    };
  }, [enabled, handleMouseMove]);

  return info;
}
