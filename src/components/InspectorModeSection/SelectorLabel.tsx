import { useRef, useEffect, useState } from 'react';

interface SelectorLabelProps {
  selector: string;
  width: number;
  height: number;
  cursorX: number;
  cursorY: number;
}

const CURSOR_OFFSET = 12;
const EDGE_PADDING = 8;

function calculateTooltipPosition(
  tooltipRect: DOMRect,
  cursorX: number,
  cursorY: number
): { left: number; top: number } {
  const vw = window.innerWidth;
  const vh = window.innerHeight;

  let left = cursorX + CURSOR_OFFSET;
  let top = cursorY + CURSOR_OFFSET;

  if (left + tooltipRect.width > vw - EDGE_PADDING) {
    left = cursorX - tooltipRect.width - CURSOR_OFFSET;
  }
  if (top + tooltipRect.height > vh - EDGE_PADDING) {
    top = cursorY - tooltipRect.height - CURSOR_OFFSET;
  }

  return {
    left: Math.max(EDGE_PADDING, left),
    top: Math.max(EDGE_PADDING, top),
  };
}

export function SelectorLabel({ selector, width, height, cursorX, cursorY }: SelectorLabelProps): React.JSX.Element {
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [position, setPosition] = useState({ left: cursorX + CURSOR_OFFSET, top: cursorY + CURSOR_OFFSET });

  useEffect(() => {
    if (!tooltipRef.current) return;
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    setPosition(calculateTooltipPosition(tooltipRect, cursorX, cursorY));
  }, [cursorX, cursorY]);

  return (
    <div
      ref={tooltipRef}
      className="fixed z-9999 px-3 py-2 rounded-md bg-white text-zinc-900 text-xs font-mono shadow-lg border border-zinc-200 pointer-events-none"
      style={{ left: position.left, top: position.top }}
      data-inspector-overlay
    >
      <div className="font-medium">{selector}</div>
      <div className="text-zinc-500">{Math.round(width)} x {Math.round(height)}</div>
    </div>
  );
}
