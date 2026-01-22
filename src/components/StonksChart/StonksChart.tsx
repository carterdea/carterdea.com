import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from 'react';
import type { Phase } from '../../lib/moneyFallIntensity';

const COLORS = {
  GREEN: '#22c55e',
  RED: '#ef4444',
  ZERO_LINE: 'rgba(255, 255, 255, 0.2)',
} as const;

const EXPAND_THRESHOLD = 0.18;
const CLIMB_DURATION_SECONDS = 45;
const CHART_PADDING = 40;
const CRASH_SPEED = 0.33;
const PING_DURATION_MS = 1000;
const PING_EASE_THRESHOLD = 0.75;
const TARGET_PEAK_BASE = 100;
const TARGET_PEAK_VARIANCE = 200;

function easeInQuad(t: number): number {
  return t * t;
}

function easeInOutQuad(t: number): number {
  return t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;
}

function easeOutCubic(t: number): number {
  return 1 - (1 - t) ** 3;
}

interface ChartState {
  points: number[];
  currentPrice: number;
  targetPeak: number;
  climbDuration: number;
  elapsedTime: number;
  phase: Phase;
  crashProgress: number;
  noise: number;
  noiseVelocity: number;
}

function createInitialState(): ChartState {
  return {
    points: [0],
    currentPrice: 0,
    targetPeak: TARGET_PEAK_BASE + Math.random() * TARGET_PEAK_VARIANCE,
    climbDuration: CLIMB_DURATION_SECONDS,
    elapsedTime: 0,
    phase: 'climb',
    crashProgress: 0,
    noise: 0,
    noiseVelocity: 0,
  };
}

export interface StonksChartHandle {
  reset: () => void;
}

interface StonksChartProps {
  onPriceChange?: (price: number, progress: number) => void;
  onPhaseChange?: (phase: 'climb' | 'crash' | 'done') => void;
}

export const StonksChart = forwardRef<StonksChartHandle, StonksChartProps>(
  ({ onPriceChange, onPhaseChange }, ref) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const stateRef = useRef<ChartState>(createInitialState());
    const animationRef = useRef<number>(0);
    const lastTimeRef = useRef<number>(0);

    const reset = useCallback(() => {
      Object.assign(stateRef.current, createInitialState());
      lastTimeRef.current = 0;
      onPhaseChange?.('climb');
    }, [onPhaseChange]);

    useImperativeHandle(ref, () => ({ reset }), [reset]);

    const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const state = stateRef.current;
      const padding = CHART_PADDING;
      const chartWidth = width - padding * 2;
      const chartHeight = height - padding * 2;

      ctx.clearRect(0, 0, width, height);

      const totalExpectedPoints = state.climbDuration * 60;
      const expandPoints = Math.floor(totalExpectedPoints * EXPAND_THRESHOLD);

      let pixelsPerPoint: number;
      if (state.points.length <= expandPoints) {
        pixelsPerPoint = chartWidth / expandPoints;
      } else {
        pixelsPerPoint = chartWidth / state.points.length;
      }

      const maxPrice = Math.max(...state.points, 1);
      const minPrice = Math.min(...state.points, 0);
      const yMax = maxPrice * 1.1;
      const yMin = Math.min(minPrice, 0);

      const priceToY = (price: number) => {
        const range = yMax - yMin || 1;
        return padding + chartHeight - ((price - yMin) / range) * chartHeight;
      };

      const bottomY = height - padding;
      ctx.strokeStyle = COLORS.ZERO_LINE;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding, bottomY);
      ctx.lineTo(width - padding, bottomY);
      ctx.stroke();

      if (state.points.length > 1) {
        const lineColor = state.phase === 'climb' ? COLORS.GREEN : COLORS.RED;
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();

        for (let i = 0; i < state.points.length; i++) {
          const x = padding + i * pixelsPerPoint;
          if (x > width - padding) break;
          const y = priceToY(state.points[i]);

          if (i === 0) {
            ctx.moveTo(x, y);
          } else {
            ctx.lineTo(x, y);
          }
        }

        ctx.stroke();
      }

      const dotIndex = Math.min(
        state.points.length - 1,
        Math.floor((width - padding * 2) / pixelsPerPoint)
      );
      const dotX = Math.min(padding + dotIndex * pixelsPerPoint, width - padding);
      const dotY = priceToY(state.points[dotIndex] ?? state.currentPrice);

      const dotColor = state.phase === 'climb' ? COLORS.GREEN : COLORS.RED;
      const dotRgba = state.phase === 'climb' ? 'rgba(34, 197, 94' : 'rgba(239, 68, 68';

      const pingPhase = (Date.now() % PING_DURATION_MS) / PING_DURATION_MS;
      const normalizedPhase = pingPhase < PING_EASE_THRESHOLD ? pingPhase / PING_EASE_THRESHOLD : 1;
      const eased = easeOutCubic(normalizedPhase);
      const pingScale = 1 + eased;
      const pingOpacity = 1 - eased;

      ctx.beginPath();
      ctx.arc(dotX, dotY, 6 * pingScale, 0, Math.PI * 2);
      ctx.fillStyle = `${dotRgba}, ${0.75 * pingOpacity})`;
      ctx.fill();

      ctx.shadowColor = dotColor;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
      ctx.fillStyle = dotColor;
      ctx.fill();
      ctx.shadowBlur = 0;
    }, []);

    const update = useCallback(
      (deltaTime: number) => {
        const state = stateRef.current;

        if (state.phase === 'climb') {
          state.elapsedTime += deltaTime;
          const progress = Math.min(state.elapsedTime / state.climbDuration, 1);

          const trendPrice = state.targetPeak * easeInQuad(progress);

          state.noiseVelocity += (Math.random() - 0.5) * 3.0 * deltaTime;
          state.noiseVelocity *= 0.9;
          state.noise += state.noiseVelocity;
          state.noise *= 0.95;

          const noiseScale = Math.max(8, trendPrice * 0.12);
          const finalNoise = state.noise * noiseScale;

          const minPrice = Math.max(0, trendPrice * 0.5);
          state.currentPrice = Math.max(minPrice, trendPrice + finalNoise);
          state.points.push(state.currentPrice);

          if (progress >= 1) {
            state.phase = 'crash';
            state.crashProgress = 0;
            onPhaseChange?.('crash');
          }
        } else if (state.phase === 'crash') {
          state.crashProgress += deltaTime * CRASH_SPEED;

          const crashStartIndex = Math.floor(state.climbDuration * 60);
          const peakPrice =
            state.points[crashStartIndex] ||
            state.points[state.points.length - 1] ||
            state.currentPrice;

          const t = Math.min(state.crashProgress, 1);
          const crashEase = easeInOutQuad(t);

          const wobbleDecay = 1 - t;
          const wobbleFreq = t * 8;
          const wobble = Math.sin(wobbleFreq * Math.PI) * wobbleDecay * 0.08;

          const crashedPrice = peakPrice * (1 - crashEase);
          state.currentPrice = Math.max(0, crashedPrice + crashedPrice * wobble);
          state.points.push(state.currentPrice);

          if (state.crashProgress >= 1) {
            state.phase = 'done';
            state.currentPrice = 0;
            state.points.push(0);
            onPhaseChange?.('done');
          }
        }
      },
      [onPhaseChange]
    );

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const resize = () => {
        const dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        ctx.scale(dpr, dpr);
      };

      resize();
      window.addEventListener('resize', resize);

      const animate = (time: number) => {
        const deltaTime = lastTimeRef.current ? (time - lastTimeRef.current) / 1000 : 0.016;
        lastTimeRef.current = time;

        update(Math.min(deltaTime, 0.1));

        const state = stateRef.current;
        // Intensity based on current price relative to target peak
        const progress =
          state.phase === 'done'
            ? 0
            : Math.max(0, Math.min(1, state.currentPrice / state.targetPeak));
        onPriceChange?.(state.currentPrice, progress);

        const rect = canvas.getBoundingClientRect();
        draw(ctx, rect.width, rect.height);

        animationRef.current = requestAnimationFrame(animate);
      };

      animationRef.current = requestAnimationFrame(animate);

      return () => {
        window.removeEventListener('resize', resize);
        cancelAnimationFrame(animationRef.current);
      };
    }, [draw, update, onPriceChange]);

    return (
      <canvas
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          pointerEvents: 'none',
        }}
      />
    );
  }
);

StonksChart.displayName = 'StonksChart';

export default StonksChart;
