import { useEffect, useRef } from 'react';

import {
  BACKGROUND_COLOR,
  COLUMN_WIDTH,
  DROPS_PER_COLUMN,
  FONT_FAMILY,
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
  getRandomCharacter,
  getTrailColor,
  randomInRange,
} from './constants';
import type { Column } from './types';

const createColumn = (x: number, initialSpawn = false): Column => {
  const fontSize = randomInRange(MIN_FONT_SIZE, MAX_FONT_SIZE);
  const startY = -fontSize * Math.floor(Math.random() * 10 + 1);

  return {
    x,
    y: startY,
    trail: [],
    nextStepTime: performance.now() + (initialSpawn ? Math.random() * 8000 : 0),
    stepInterval: randomInRange(MIN_STEP_INTERVAL, MAX_STEP_INTERVAL),
    trailLength: randomInRange(MIN_TRAIL_LENGTH, MAX_TRAIL_LENGTH),
    brightness: randomInRange(MIN_BRIGHTNESS, MAX_BRIGHTNESS),
    fontSize,
  };
};

const initializeColumns = (width: number): Column[] => {
  const numColumns = Math.ceil(width / COLUMN_WIDTH);
  const columns: Column[] = [];

  for (let i = 0; i < numColumns; i++) {
    for (let d = 0; d < DROPS_PER_COLUMN; d++) {
      columns.push(createColumn(i * COLUMN_WIDTH, true));
    }
  }

  return columns;
};

const mutateTrail = (column: Column): void => {
  for (let i = 1; i < column.trail.length; i++) {
    if (Math.random() < MUTATION_CHANCE) {
      column.trail[i].char = getRandomCharacter();
    }
  }
};

const updateColumn = (column: Column, canvasHeight: number, currentTime: number): void => {
  if (currentTime < column.nextStepTime) {
    mutateTrail(column);
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

  const lowestTrailY =
    column.trail.length > 0 ? column.trail[column.trail.length - 1].y : column.y;

  const lineHeight = column.fontSize * LINE_HEIGHT_MULTIPLIER;

  if (lowestTrailY > canvasHeight + lineHeight * 5) {
    column.y = -lineHeight * Math.floor(Math.random() * 5 + 1);
    column.trail = [];
    column.nextStepTime = currentTime + Math.random() * 500;
    column.stepInterval = randomInRange(MIN_STEP_INTERVAL, MAX_STEP_INTERVAL);
    column.trailLength = randomInRange(MIN_TRAIL_LENGTH, MAX_TRAIL_LENGTH);
    column.brightness = randomInRange(MIN_BRIGHTNESS, MAX_BRIGHTNESS);
    column.fontSize = randomInRange(MIN_FONT_SIZE, MAX_FONT_SIZE);
  }
};

const drawColumn = (ctx: CanvasRenderingContext2D, column: Column): void => {
  const { trail, fontSize } = column;

  ctx.font = `bold ${fontSize}px ${FONT_FAMILY}`;

  // Depth-based opacity: smaller (distant) drops are more transparent
  const sizeRange = MAX_FONT_SIZE - MIN_FONT_SIZE;
  const normalizedSize = (fontSize - MIN_FONT_SIZE) / sizeRange;
  const depthOpacity = 0.7 + normalizedSize * 0.3;

  for (let i = 0; i < trail.length; i++) {
    const { char, y } = trail[i];

    if (y < -fontSize || y > ctx.canvas.height + fontSize) {
      continue;
    }

    const { color, glow, glowColor } = getTrailColor(i, column.trailLength, column.brightness);

    ctx.save();
    ctx.translate(column.x + COLUMN_WIDTH / 2, y);
    ctx.scale(-1, 1);
    ctx.globalAlpha = depthOpacity;

    if (i === 0) {
      // Multiple glow passes for strong bloom effect
      ctx.globalAlpha = 0.6;
      ctx.shadowColor = glowColor;
      ctx.fillStyle = glowColor;

      ctx.shadowBlur = 60;
      ctx.fillText(char, -COLUMN_WIDTH / 4, 0);
      ctx.shadowBlur = 30;
      ctx.fillText(char, -COLUMN_WIDTH / 4, 0);
      ctx.shadowBlur = 15;
      ctx.fillText(char, -COLUMN_WIDTH / 4, 0);

      // Sharp white text on top
      ctx.globalAlpha = depthOpacity;
      ctx.shadowBlur = 0;
      ctx.fillStyle = color;
      ctx.fillText(char, -COLUMN_WIDTH / 4, 0);
    } else {
      if (glow > 0.1) {
        ctx.shadowColor = glowColor;
        ctx.shadowBlur = 20 * glow;
      }
      ctx.fillStyle = color;
      ctx.fillText(char, -COLUMN_WIDTH / 4, 0);
    }

    ctx.restore();
  }
};

const render = (ctx: CanvasRenderingContext2D, columns: Column[], currentTime: number) => {
  const { width, height } = ctx.canvas;

  ctx.fillStyle = BACKGROUND_COLOR;
  ctx.fillRect(0, 0, width, height);
  ctx.textBaseline = 'top';

  for (const column of columns) {
    updateColumn(column, height, currentTime);
  }

  const sortedColumns = [...columns].sort((a, b) => a.fontSize - b.fontSize);

  for (const column of sortedColumns) {
    drawColumn(ctx, column);
  }
};

export default function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const columnsRef = useRef<Column[]>([]);
  const animationRef = useRef<number>(0);

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
      render(ctx, columnsRef.current, currentTime);
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
