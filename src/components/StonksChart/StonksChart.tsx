import { useEffect, useRef, useCallback, useImperativeHandle, forwardRef } from 'react';

const GREEN = '#22c55e';
const RED = '#ef4444';
const ZERO_LINE_COLOR = 'rgba(255, 255, 255, 0.2)';

const EXPAND_THRESHOLD = 0.1;
const CLIMB_DURATION_SECONDS = 45;
const CHART_PADDING = 40;
const CRASH_SPEED = 0.33;

type Phase = 'climb' | 'crash' | 'done';
type MicroPhase = 'rally' | 'consolidation' | 'pullback';

interface ChartState {
  points: number[];
  currentPrice: number;
  targetPeak: number;
  climbDuration: number;
  elapsedTime: number;
  phase: Phase;
  crashProgress: number;
  microPhase: MicroPhase;
  microProgress: number;
  microDuration: number;
  microStartPrice: number;
  microTargetDelta: number;
  noise: number;
  noiseVelocity: number;
}

function createInitialState(): ChartState {
  return {
    points: [0],
    currentPrice: 0,
    targetPeak: 100 + Math.random() * 200,
    climbDuration: CLIMB_DURATION_SECONDS,
    elapsedTime: 0,
    phase: 'climb',
    crashProgress: 0,
    microPhase: 'rally',
    microProgress: 0,
    microDuration: 1 + Math.random() * 2,
    microStartPrice: 0,
    microTargetDelta: 15 + Math.random() * 20,
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
      const state = stateRef.current;
      state.points = [0];
      state.currentPrice = 0;
      state.targetPeak = 100 + Math.random() * 200;
      state.climbDuration = CLIMB_DURATION_SECONDS;
      state.elapsedTime = 0;
      state.phase = 'climb';
      state.crashProgress = 0;
      state.microPhase = 'rally';
      state.microProgress = 0;
      state.microDuration = 1 + Math.random() * 2;
      state.microStartPrice = 0;
      state.microTargetDelta = 15 + Math.random() * 20; // Initial upward push
      state.noise = 0;
      state.noiseVelocity = 0;
      // Reset time ref to avoid large delta on first frame
      lastTimeRef.current = 0;
      onPhaseChange?.('climb');
    }, [onPhaseChange]);

    useImperativeHandle(ref, () => ({ reset }), [reset]);

    const draw = useCallback((ctx: CanvasRenderingContext2D, width: number, height: number) => {
      const state = stateRef.current;
      const padding = CHART_PADDING;
      const chartWidth = width - padding * 2;
      const chartHeight = height - padding * 2;

      // Clear
      ctx.clearRect(0, 0, width, height);

      // Calculate how many points represent the expand threshold
      const totalExpectedPoints = state.climbDuration * 60; // ~60fps
      const expandPoints = Math.floor(totalExpectedPoints * EXPAND_THRESHOLD);

      // Determine pixels per point based on current phase
      let pixelsPerPoint: number;
      if (state.points.length <= expandPoints) {
        // Expanding phase: line grows from left to right
        pixelsPerPoint = chartWidth / expandPoints;
      } else {
        // Zoom out phase: fit all points in chart width
        pixelsPerPoint = chartWidth / state.points.length;
      }

      // Calculate Y range - ensure line never goes below bottom
      const maxPrice = Math.max(...state.points, 1);
      const minPrice = Math.min(...state.points, 0);
      // Add padding above, but ensure 0 is at the bottom line
      const yMax = maxPrice * 1.1;
      const yMin = Math.min(minPrice, 0);

      const priceToY = (price: number) => {
        const range = yMax - yMin || 1;
        return padding + chartHeight - ((price - yMin) / range) * chartHeight;
      };

      // Draw solid bottom line
      const bottomY = height - padding;
      ctx.strokeStyle = ZERO_LINE_COLOR;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(padding, bottomY);
      ctx.lineTo(width - padding, bottomY);
      ctx.stroke();

      // Draw the line
      if (state.points.length > 1) {
        // Use red during crash/done phases
        const lineColor = state.phase === 'climb' ? GREEN : RED;
        ctx.strokeStyle = lineColor;
        ctx.lineWidth = 2;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';

        ctx.beginPath();

        for (let i = 0; i < state.points.length; i++) {
          const x = padding + i * pixelsPerPoint;
          // Clamp x to not exceed chart bounds
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

      // Draw dot at current position
      const dotIndex = Math.min(state.points.length - 1, Math.floor((width - padding * 2) / pixelsPerPoint));
      const dotX = Math.min(padding + dotIndex * pixelsPerPoint, width - padding);
      const dotY = priceToY(state.points[dotIndex] ?? state.currentPrice);

      // Color based on phase
      const dotColor = state.phase === 'climb' ? GREEN : RED;
      const dotRgba = state.phase === 'climb' ? 'rgba(34, 197, 94' : 'rgba(239, 68, 68';

      // Pulsing animation (always on)
      const pingDuration = 1000;
      const pingPhase = (Date.now() % pingDuration) / pingDuration;
      const easedPhase = pingPhase < 0.75 ? pingPhase / 0.75 : 1;
      const eased = 1 - (1 - easedPhase) ** 3;
      const pingScale = 1 + eased;
      const pingOpacity = 1 - eased;

      // Outer ping ring
      ctx.beginPath();
      ctx.arc(dotX, dotY, 6 * pingScale, 0, Math.PI * 2);
      ctx.fillStyle = `${dotRgba}, ${0.75 * pingOpacity})`;
      ctx.fill();

      // Inner dot with glow
      ctx.shadowColor = dotColor;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(dotX, dotY, 5, 0, Math.PI * 2);
      ctx.fillStyle = dotColor;
      ctx.fill();
      ctx.shadowBlur = 0;
    }, []);

    const update = useCallback((deltaTime: number) => {
      const state = stateRef.current;

      if (state.phase === 'climb') {
        state.elapsedTime += deltaTime;
        const progress = Math.min(state.elapsedTime / state.climbDuration, 1);

        // Base trend line (where price should be on average)
        const easedProgress = 0.5 * progress + 0.5 * progress * progress;
        const trendPrice = state.targetPeak * easedProgress;

        // Update micro-phase progress
        state.microProgress += deltaTime;

        // Check if micro-phase is complete
        if (state.microProgress >= state.microDuration) {
          state.microProgress = 0;
          state.microStartPrice = state.currentPrice;

          // Transition to next micro-phase (stair-step pattern)
          // Rally → Consolidation → (sometimes Pullback) → Rally
          if (state.microPhase === 'rally') {
            state.microPhase = 'consolidation';
            state.microDuration = 1 + Math.random() * 3; // 1-4 sec consolidation
            state.microTargetDelta = (Math.random() - 0.5) * 5; // Slight drift
          } else if (state.microPhase === 'consolidation') {
            // 15% chance of pullback, 85% chance of new rally
            if (Math.random() < 0.15) {
              state.microPhase = 'pullback';
              state.microDuration = 0.3 + Math.random() * 0.7; // 0.3-1 sec pullback (shorter)
              // Pull back 2-5% of current price relative to trend
              state.microTargetDelta = -(trendPrice * (0.02 + Math.random() * 0.03));
            } else {
              state.microPhase = 'rally';
              state.microDuration = 2 + Math.random() * 5; // 2-7 sec rally
              // Rally to catch up with trend + overshoot slightly
              state.microTargetDelta = (trendPrice - state.currentPrice) * (1.1 + Math.random() * 0.3);
            }
          } else if (state.microPhase === 'pullback') {
            state.microPhase = 'rally';
            state.microDuration = 2 + Math.random() * 5;
            state.microTargetDelta = (trendPrice - state.currentPrice) * (1.2 + Math.random() * 0.4);
          }
        }

        // Calculate micro-phase easing
        const microT = Math.min(state.microProgress / state.microDuration, 1);
        let microEase: number;

        if (state.microPhase === 'rally') {
          // Rally: ease-out (fast start, slow end)
          microEase = 1 - (1 - microT) ** 2;
        } else if (state.microPhase === 'consolidation') {
          // Consolidation: linear with small oscillation
          microEase = microT;
        } else {
          // Pullback: ease-in-out
          microEase = microT < 0.5 ? 2 * microT * microT : 1 - (-2 * microT + 2) ** 2 / 2;
        }

        // Base price from micro-phase
        const microPrice = state.microStartPrice + state.microTargetDelta * microEase;

        // Add noise (jitter within the movement) - more aggressive
        state.noiseVelocity += (Math.random() - 0.5) * 2.0 * deltaTime;
        state.noiseVelocity *= 0.92; // Less damping = more movement
        state.noise += state.noiseVelocity;
        state.noise *= 0.96; // Slower mean reversion

        // Scale noise with price level - larger scale
        const noiseScale = Math.max(5, trendPrice * 0.08);
        const finalNoise = state.noise * noiseScale;

        // Floor at 20% of trend price to prevent pullbacks going to 0
        const minPrice = Math.max(1, trendPrice * 0.2);
        state.currentPrice = Math.max(minPrice, microPrice + finalNoise);
        state.points.push(state.currentPrice);

        if (progress >= 1) {
          state.phase = 'crash';
          state.crashProgress = 0;
          onPhaseChange?.('crash');
        }
      } else if (state.phase === 'crash') {
        state.crashProgress += deltaTime * CRASH_SPEED;

        // Get peak price (first point of crash)
        const crashStartIndex = Math.floor(state.climbDuration * 60);
        const peakPrice = state.points[crashStartIndex] || state.points[state.points.length - 1] || state.currentPrice;

        // Main crash curve with organic wobble
        const t = Math.min(state.crashProgress, 1);
        // Ease-in-out for more dramatic feel
        const crashEase = t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2;

        // Add diminishing wobble (dead cat bounces)
        const wobbleDecay = 1 - t; // Wobble decreases as crash progresses
        const wobbleFreq = t * 8; // Speed up wobble over time
        const wobble = Math.sin(wobbleFreq * Math.PI) * wobbleDecay * 0.08;

        // Calculate base crash price with wobble
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
      // 'done' phase: no updates, wait for reset
    }, [onPhaseChange]);

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
        // Intensity based on current price relative to target peak (matches visual curve)
        let progress = 0;
        if (state.phase === 'climb') {
          progress = Math.min(state.currentPrice / state.targetPeak, 1);
        } else if (state.phase === 'crash') {
          // During crash, intensity drops with the price
          const peakPrice = state.targetPeak;
          progress = Math.max(0, state.currentPrice / peakPrice);
        }
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
