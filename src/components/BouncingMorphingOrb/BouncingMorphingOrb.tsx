import { useCallback, useEffect, useRef, useState } from 'react';
import { MorphingOrbGL } from '../MorphingOrbGL';
import { Ripple } from './Ripple';

interface BouncingOrbProps {
  size?: number;
  speed?: number;
  bounceRandomness?: number;
  onCornerHit?: () => void;
}

interface Vector2D {
  x: number;
  y: number;
}

interface RippleData {
  id: number;
  x: number;
  y: number;
  isCornerHit: boolean;
}

const DEFAULT_SPEED = 3.5;
const DEFAULT_RANDOMNESS = 0.05;
const CORNER_HIT_THRESHOLD_MS = 100;
const TRAJECTORY_CHECK_INTERVAL = 10;
const TRAJECTORY_NUDGE_AMOUNT = 0.03;

const RESPONSIVE_SIZES: Array<{ breakpoint: number; size: number }> = [
  { breakpoint: 768, size: 150 },
  { breakpoint: 1024, size: 200 },
  { breakpoint: Infinity, size: 300 },
];

const COLOR_PALETTE = [
  '#f87171',
  '#fb923c',
  '#fbbf24',
  '#a3e635',
  '#4ade80',
  '#22d3ee',
  '#60a5fa',
  '#a78bfa',
  '#e879f9',
];

function getResponsiveSize(width: number): number {
  const match = RESPONSIVE_SIZES.find((entry) => width < entry.breakpoint);
  return match?.size ?? 300;
}

export function BouncingMorphingOrb({
  size: sizeProp,
  speed = DEFAULT_SPEED,
  bounceRandomness = DEFAULT_RANDOMNESS,
  onCornerHit,
}: BouncingOrbProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [position, setPosition] = useState<Vector2D>({ x: 100, y: 100 });
  const [currentColorIndex, setCurrentColorIndex] = useState(0);
  const [isCornerHit, setIsCornerHit] = useState(false);
  const [ripples, setRipples] = useState<RippleData[]>([]);
  const [size, setSize] = useState(300);
  const rippleIdRef = useRef(0);

  const velocityRef = useRef<Vector2D>({
    x: speed * (Math.random() > 0.5 ? 1 : -1),
    y: speed * (Math.random() > 0.5 ? 1 : -1),
  });
  const positionRef = useRef<Vector2D>(position);
  const lastBounceTimeRef = useRef<Vector2D>({ x: 0, y: 0 });
  const bounceCountRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    if (sizeProp) {
      setSize(sizeProp);
      return;
    }

    function updateSize(): void {
      setSize(getResponsiveSize(window.innerWidth));
    }

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [sizeProp]);

  const applyRandomness = useCallback(
    (value: number): number => {
      const randomFactor = 1 + (Math.random() * 2 - 1) * bounceRandomness;
      return value * randomFactor;
    },
    [bounceRandomness]
  );

  const checkAndAdjustTrajectory = useCallback((): void => {
    const { x: vx, y: vy } = velocityRef.current;
    const ratio = Math.abs(vx / vy);

    const nearInteger = Math.abs(ratio - Math.round(ratio)) < 0.1;
    const nearHalf = Math.abs(ratio - 0.5) < 0.05;
    const nearDouble = Math.abs(ratio - 2) < 0.1;

    if (!nearInteger && !nearHalf && !nearDouble) return;

    const nudgeX = (Math.random() * 2 - 1) * TRAJECTORY_NUDGE_AMOUNT;
    const nudgeY = (Math.random() * 2 - 1) * TRAJECTORY_NUDGE_AMOUNT;

    velocityRef.current.x *= 1 + nudgeX;
    velocityRef.current.y *= 1 + nudgeY;

    const currentSpeed = Math.sqrt(vx * vx + vy * vy);
    const newSpeed = Math.sqrt(velocityRef.current.x ** 2 + velocityRef.current.y ** 2);
    const speedRatio = currentSpeed / newSpeed;
    velocityRef.current.x *= speedRatio;
    velocityRef.current.y *= speedRatio;
  }, []);

  const cycleColor = useCallback((): void => {
    setCurrentColorIndex((prev) => (prev + 1) % COLOR_PALETTE.length);
  }, []);

  const addRipple = useCallback((x: number, y: number, isCornerHit: boolean): void => {
    const id = rippleIdRef.current++;
    setRipples((prev) => [...prev, { id, x, y, isCornerHit }]);

    const duration = isCornerHit ? 1100 : 700;
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, duration);
  }, []);

  useEffect(() => {
    audioRef.current = new Audio('/assets/sounds/bonk.mp3');
    audioRef.current.preload = 'auto';
  }, []);

  useEffect(() => {
    function handleBounce(
      pos: number,
      velocity: number,
      minBound: number,
      maxBound: number
    ): { pos: number; velocity: number; bounced: boolean } {
      if (pos <= minBound) {
        return {
          pos: minBound,
          velocity: Math.abs(applyRandomness(velocity)),
          bounced: true,
        };
      }
      if (pos >= maxBound) {
        return {
          pos: maxBound,
          velocity: -Math.abs(applyRandomness(velocity)),
          bounced: true,
        };
      }
      return { pos, velocity, bounced: false };
    }

    function handleCornerHit(x: number, y: number): void {
      setIsCornerHit(true);
      onCornerHit?.();
      addRipple(x + size / 2, y + size / 2, true);

      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
      }

      setTimeout(() => setIsCornerHit(false), 2000);
    }

    function updatePhysics(): void {
      if (!containerRef.current) {
        animationFrameRef.current = requestAnimationFrame(updatePhysics);
        return;
      }

      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;
      const now = Date.now();

      let { x, y } = positionRef.current;
      const { x: vx, y: vy } = velocityRef.current;

      x += vx;
      y += vy;

      const padding = size * 0.15;
      const xResult = handleBounce(x, vx, -padding, viewportWidth - size + padding);
      const yResult = handleBounce(y, vy, -padding, viewportHeight - size + padding);

      x = xResult.pos;
      y = yResult.pos;
      velocityRef.current.x = xResult.velocity;
      velocityRef.current.y = yResult.velocity;

      if (xResult.bounced) {
        lastBounceTimeRef.current.x = now;
        bounceCountRef.current++;
        cycleColor();
      }

      if (yResult.bounced) {
        lastBounceTimeRef.current.y = now;
        bounceCountRef.current++;
        cycleColor();
      }

      const timeSinceXBounce = now - lastBounceTimeRef.current.x;
      const timeSinceYBounce = now - lastBounceTimeRef.current.y;
      const isCorner =
        xResult.bounced &&
        yResult.bounced &&
        timeSinceXBounce <= CORNER_HIT_THRESHOLD_MS &&
        timeSinceYBounce <= CORNER_HIT_THRESHOLD_MS;

      if (isCorner) {
        handleCornerHit(x, y);
      }

      if (bounceCountRef.current > 0 && bounceCountRef.current % TRAJECTORY_CHECK_INTERVAL === 0) {
        checkAndAdjustTrajectory();
      }

      positionRef.current = { x, y };
      setPosition({ x, y });

      animationFrameRef.current = requestAnimationFrame(updatePhysics);
    }

    animationFrameRef.current = requestAnimationFrame(updatePhysics);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [size, applyRandomness, checkAndAdjustTrajectory, cycleColor, addRipple, onCornerHit]);

  const currentColor = COLOR_PALETTE[currentColorIndex];

  return (
    <>
      <div
        ref={containerRef}
        style={{
          position: 'fixed',
          left: position.x,
          top: position.y,
          width: size,
          height: size,
          zIndex: 1,
          pointerEvents: 'none',
        }}
      >
        <MorphingOrbGL
          size={size}
          variant={isCornerHit ? 'color' : 'mono'}
          color={currentColor}
          palette={COLOR_PALETTE}
          colorMode="spatial"
          autoMorph={isCornerHit}
          morphDuration={1500}
          holdDuration={500}
        />
      </div>

      {ripples.map((ripple) => (
        <Ripple
          key={ripple.id}
          x={ripple.x}
          y={ripple.y}
          size={size}
          color={currentColor}
          isCornerHit={ripple.isCornerHit}
        />
      ))}
    </>
  );
}

export default BouncingMorphingOrb;
