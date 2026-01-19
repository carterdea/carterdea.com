import { useEffect, useRef } from 'react';

import {
  BACKGROUND_COLOR,
  COLUMN_WIDTH,
  DROPS_PER_COLUMN,
  FONT_FAMILY,
  getRandomCharacter,
  getTrailColor,
  LINE_HEIGHT_MULTIPLIER,
  MAX_BRIGHTNESS,
  MAX_FONT_SIZE,
  MAX_STEP_INTERVAL,
  MAX_TRAIL_LENGTH,
  MIN_BRIGHTNESS,
  MIN_FONT_SIZE,
  MIN_STEP_INTERVAL,
  MIN_TRAIL_LENGTH,
  MUTATION_CHANCE,
  MUTATION_THROTTLE_FRAMES,
  randomInRange,
} from './constants';
import type { Column } from './types';

// Threshold for detecting tab switches (ms)
// Must be high enough to not trigger on normal frame drops (GC, etc.)
const TAB_SWITCH_THRESHOLD = 500;

function randomizeColumnParams(): Pick<Column, 'stepInterval' | 'trailLength' | 'brightness' | 'fontSize'> {
  return {
    stepInterval: randomInRange(MIN_STEP_INTERVAL, MAX_STEP_INTERVAL),
    trailLength: randomInRange(MIN_TRAIL_LENGTH, MAX_TRAIL_LENGTH),
    brightness: randomInRange(MIN_BRIGHTNESS, MAX_BRIGHTNESS),
    fontSize: randomInRange(MIN_FONT_SIZE, MAX_FONT_SIZE),
  };
}

function createColumn(x: number, initialSpawn = false): Column {
  const params = randomizeColumnParams();
  const startY = -params.fontSize * Math.floor(Math.random() * 10 + 1);

  return {
    x,
    y: startY,
    trail: [],
    nextStepTime: performance.now() + (initialSpawn ? Math.random() * 8000 : 0),
    ...params,
  };
}

function initializeColumns(width: number): Column[] {
  const numColumns = Math.ceil(width / COLUMN_WIDTH);
  const columns: Column[] = [];

  for (let i = 0; i < numColumns; i++) {
    for (let d = 0; d < DROPS_PER_COLUMN; d++) {
      columns.push(createColumn(i * COLUMN_WIDTH, true));
    }
  }

  // Sort by fontSize once - smaller (distant) columns render first
  columns.sort((a, b) => a.fontSize - b.fontSize);

  return columns;
}

function mutateTrail(column: Column): void {
  for (let i = 1; i < column.trail.length; i++) {
    if (Math.random() < MUTATION_CHANCE) {
      column.trail[i].char = getRandomCharacter();
    }
  }
}

function updateColumn(column: Column, canvasHeight: number, currentTime: number, shouldMutate: boolean): void {
  if (currentTime < column.nextStepTime) {
    if (shouldMutate) mutateTrail(column);
    return;
  }

  column.y += column.fontSize * LINE_HEIGHT_MULTIPLIER;
  column.nextStepTime = currentTime + column.stepInterval;

  column.trail.unshift({
    char: getRandomCharacter(),
    y: column.y,
  });

  if (column.trail.length > column.trailLength) {
    column.trail.pop();
  }

  mutateTrail(column);

  const lowestTrailY = column.trail.length > 0 ? column.trail[column.trail.length - 1].y : column.y;
  const lineHeight = column.fontSize * LINE_HEIGHT_MULTIPLIER;
  const offscreenThreshold = canvasHeight + lineHeight * 5;

  if (lowestTrailY > offscreenThreshold) {
    const params = randomizeColumnParams();
    const newLineHeight = params.fontSize * LINE_HEIGHT_MULTIPLIER;
    column.y = -newLineHeight * Math.floor(Math.random() * 5 + 1);
    column.trail = [];
    column.nextStepTime = currentTime + Math.random() * 500;
    Object.assign(column, params);
  }
}

function drawColumn(ctx: CanvasRenderingContext2D, column: Column): void {
  const { trail, fontSize } = column;

  // Depth-based opacity: smaller (distant) drops are more transparent
  const sizeRange = MAX_FONT_SIZE - MIN_FONT_SIZE;
  const normalizedSize = (fontSize - MIN_FONT_SIZE) / sizeRange;
  const depthOpacity = 0.7 + normalizedSize * 0.3;

  const xPos = column.x + COLUMN_WIDTH / 4;
  const canvasHeight = ctx.canvas.height;

  for (let i = 0; i < trail.length; i++) {
    const { char, y } = trail[i];

    // Skip off-screen characters
    if (y < -fontSize || y > canvasHeight + fontSize) continue;

    const { color, glow, glowColor } = getTrailColor(i, column.trailLength, column.brightness);

    if (i === 0) {
      // Head character with glow effect
      ctx.globalAlpha = 0.8;
      ctx.shadowColor = glowColor;
      ctx.fillStyle = glowColor;

      ctx.shadowBlur = 40;
      ctx.fillText(char, xPos, y);
      ctx.shadowBlur = 15;
      ctx.fillText(char, xPos, y);

      // Sharp white text on top
      ctx.globalAlpha = depthOpacity;
      ctx.shadowBlur = 0;
      ctx.fillStyle = color;
      ctx.fillText(char, xPos, y);
    } else {
      // Trail characters
      ctx.globalAlpha = depthOpacity;
      ctx.shadowBlur = glow > 0.1 ? 20 * glow : 0;
      if (glow > 0.1) ctx.shadowColor = glowColor;
      ctx.fillStyle = color;
      ctx.fillText(char, xPos, y);
    }
  }
}

function render(ctx: CanvasRenderingContext2D, columns: Column[], currentTime: number, frameCount: number): void {
  const { width, height } = ctx.canvas;

  // Reset shadow state before clearing to prevent glow bleeding into background
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, width, height);
  ctx.textBaseline = 'top';

  const shouldMutate = frameCount % MUTATION_THROTTLE_FRAMES === 0;

  for (const column of columns) {
    updateColumn(column, height, currentTime, shouldMutate);
  }

  // Columns are pre-sorted by fontSize - batch font changes
  let currentFontSize = -1;

  for (const column of columns) {
    if (column.fontSize !== currentFontSize) {
      currentFontSize = column.fontSize;
      ctx.font = `bold ${currentFontSize}px ${FONT_FAMILY}`;
    }
    drawColumn(ctx, column);
  }
}

export default function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const columnsRef = useRef<Column[]>([]);
  const animationRef = useRef<number>(0);
  const lastFrameTimeRef = useRef<number>(0);
  const frameCountRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;

      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.scale(dpr, dpr);

      columnsRef.current = initializeColumns(window.innerWidth);
    };

    resize();
    window.addEventListener('resize', resize);

    const animate = (currentTime: number) => {
      // Detect tab switch and adjust timing to preserve stagger
      if (lastFrameTimeRef.current > 0) {
        const delta = currentTime - lastFrameTimeRef.current;
        if (delta > TAB_SWITCH_THRESHOLD) {
          for (const column of columnsRef.current) {
            column.nextStepTime += delta;
          }
        }
      }
      lastFrameTimeRef.current = currentTime;
      frameCountRef.current++;

      render(ctx, columnsRef.current, currentTime, frameCountRef.current);
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        background: '#000',
      }}
    >
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
        }}
      />
    </div>
  );
}
