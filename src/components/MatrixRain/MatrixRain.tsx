import { useEffect, useRef, useCallback } from 'react';
import type { Column } from './types';
import {
  FONT_FAMILY,
  MIN_FONT_SIZE,
  MAX_FONT_SIZE,
  COLUMN_WIDTH,
  LINE_HEIGHT_MULTIPLIER,
  DROPS_PER_COLUMN,
  MIN_TRAIL_LENGTH,
  MAX_TRAIL_LENGTH,
  MUTATION_CHANCE,
  BACKGROUND_COLOR,
  MIN_STEP_INTERVAL,
  MAX_STEP_INTERVAL,
  MIN_BRIGHTNESS,
  MAX_BRIGHTNESS,
  getTrailColor,
  getRandomCharacter,
} from './constants';

export default function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const columnsRef = useRef<Column[]>([]);
  const animationRef = useRef<number>(0);

  const initializeColumns = useCallback((width: number, height: number): Column[] => {
    const numColumns = Math.ceil(width / COLUMN_WIDTH);
    const columns: Column[] = [];

    // Create multiple drops per column position for higher density
    for (let i = 0; i < numColumns; i++) {
      for (let d = 0; d < DROPS_PER_COLUMN; d++) {
        columns.push(createColumn(i * COLUMN_WIDTH, height));
      }
    }

    return columns;
  }, []);

  const createColumn = (x: number, canvasHeight: number): Column => {
    // Start at random position, some above screen for staggered effect
    const startY = Math.random() * canvasHeight - canvasHeight * 0.5;
    const stepInterval = MIN_STEP_INTERVAL + Math.random() * (MAX_STEP_INTERVAL - MIN_STEP_INTERVAL);
    const trailLength = MIN_TRAIL_LENGTH + Math.random() * (MAX_TRAIL_LENGTH - MIN_TRAIL_LENGTH);
    const brightness = MIN_BRIGHTNESS + Math.random() * (MAX_BRIGHTNESS - MIN_BRIGHTNESS);
    const fontSize = MIN_FONT_SIZE + Math.random() * (MAX_FONT_SIZE - MIN_FONT_SIZE);

    return {
      x,
      y: startY,
      speed: 1,
      trail: [],
      nextStepTime: performance.now() + Math.random() * stepInterval,
      stepInterval,
      trailLength,
      brightness,
      fontSize,
    };
  };

  const updateColumn = (column: Column, canvasHeight: number, currentTime: number): void => {
    if (currentTime < column.nextStepTime) {
      // Mutate random trail characters even when not stepping
      mutateTrail(column);
      return;
    }

    // Advance the column (use column's font size * line height for step distance)
    column.y += column.fontSize * LINE_HEIGHT_MULTIPLIER;
    column.nextStepTime = currentTime + column.stepInterval;

    // Add new character to trail at current head position
    column.trail.unshift({
      char: getRandomCharacter(),
      y: column.y,
    });

    // Trim trail to this column's max length
    if (column.trail.length > column.trailLength) {
      column.trail.pop();
    }

    // Mutate trail characters
    mutateTrail(column);

    // Reset column when trail is fully off screen
    const lowestTrailY = column.trail.length > 0
      ? column.trail[column.trail.length - 1].y
      : column.y;

    const lineHeight = column.fontSize * LINE_HEIGHT_MULTIPLIER;
    if (lowestTrailY - column.trailLength * lineHeight > canvasHeight) {
      // Random delay before restarting
      const delay = Math.random() * 2000;
      column.y = -lineHeight * Math.floor(Math.random() * 10);
      column.trail = [];
      column.nextStepTime = currentTime + delay;
      column.stepInterval = MIN_STEP_INTERVAL + Math.random() * (MAX_STEP_INTERVAL - MIN_STEP_INTERVAL);
      // New random trail length, brightness, and font size for this cycle
      column.trailLength = MIN_TRAIL_LENGTH + Math.random() * (MAX_TRAIL_LENGTH - MIN_TRAIL_LENGTH);
      column.brightness = MIN_BRIGHTNESS + Math.random() * (MAX_BRIGHTNESS - MIN_BRIGHTNESS);
      column.fontSize = MIN_FONT_SIZE + Math.random() * (MAX_FONT_SIZE - MIN_FONT_SIZE);
    }
  };

  const mutateTrail = (column: Column): void => {
    // Skip the head (index 0), only mutate trailing characters
    for (let i = 1; i < column.trail.length; i++) {
      if (Math.random() < MUTATION_CHANCE) {
        column.trail[i].char = getRandomCharacter();
      }
    }
  };

  const render = useCallback((ctx: CanvasRenderingContext2D, columns: Column[], currentTime: number) => {
    const { width, height } = ctx.canvas;

    // Clear with black background
    ctx.fillStyle = BACKGROUND_COLOR;
    ctx.fillRect(0, 0, width, height);

    ctx.textBaseline = 'top';

    // Update all columns first
    for (const column of columns) {
      updateColumn(column, height, currentTime);
    }

    // Sort by font size (smallest first, so larger ones render on top)
    const sortedColumns = [...columns].sort((a, b) => a.fontSize - b.fontSize);

    // Draw columns in z-order
    for (const column of sortedColumns) {
      drawColumn(ctx, column);
    }
  }, []);

  const drawColumn = (ctx: CanvasRenderingContext2D, column: Column): void => {
    const { trail, fontSize } = column;

    // Set font for this column's size
    ctx.font = `bold ${fontSize}px ${FONT_FAMILY}`;

    for (let i = 0; i < trail.length; i++) {
      const { char, y } = trail[i];

      // Skip if off screen
      if (y < -fontSize || y > ctx.canvas.height + fontSize) {
        continue;
      }

      const { color } = getTrailColor(i, column.trailLength, column.brightness);

      ctx.save();
      ctx.translate(column.x + COLUMN_WIDTH / 2, y);
      ctx.scale(-1, 1);

      ctx.fillStyle = color;
      ctx.fillText(char, -COLUMN_WIDTH / 4, 0);

      ctx.restore();
    }
  };

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

      // Reinitialize columns on resize
      columnsRef.current = initializeColumns(window.innerWidth, window.innerHeight);
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
  }, [initializeColumns, render]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        display: 'block',
        filter: `
          drop-shadow(0 0 2px #4ade80)
          drop-shadow(0 0 5px #22c55e)
          drop-shadow(0 0 10px #22c55e)
          drop-shadow(0 0 20px #16a34a)
          drop-shadow(0 0 40px #166534)
        `,
      }}
    />
  );
}
