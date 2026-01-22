import { useCallback, useEffect, useRef, useState } from 'react';
import { MorphingOrbGL } from '../MorphingOrbGL';
import { Ripple } from './Ripple';

interface BouncingOrbProps {
  size?: number;
  speed?: number;
  bounceRandomness?: number;
  onCornerHit?: () => void;
}

interface Position {
  x: number;
  y: number;
}

interface Velocity {
  x: number;
  y: number;
}

interface BounceTime {
  x: number;
  y: number;
}

interface RippleData {
  id: number;
  x: number;
  y: number;
  isCornerHit: boolean;
}

const DEFAULT_SPEED = 5.5;
const DEFAULT_RANDOMNESS = 0.05; // ±5%
const CORNER_HIT_THRESHOLD_MS = 100; // 100ms = ~6 frames at 60fps
const TRAJECTORY_CHECK_INTERVAL = 10; // Check every 10 bounces
const TRAJECTORY_NUDGE_AMOUNT = 0.03; // 3% velocity adjustment

const COLOR_PALETTE = [
  '#f87171', // red-400
  '#fb923c', // orange-400
  '#fbbf24', // amber-400
  '#a3e635', // lime-400
  '#4ade80', // green-400
  '#22d3ee', // cyan-400
  '#60a5fa', // blue-400
  '#a78bfa', // violet-400
  '#e879f9', // fuchsia-400
];

export function BouncingMorphingOrb({
  size: sizeProp,
  speed = DEFAULT_SPEED,
  bounceRandomness = DEFAULT_RANDOMNESS,
  onCornerHit,
}: BouncingOrbProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [position, setPosition] = useState<Position>({ x: 100, y: 100 });
  const [currentColorIndex, setCurrentColorIndex] = useState(0);
  const [isCornerHit, setIsCornerHit] = useState(false);
  const [ripples, setRipples] = useState<RippleData[]>([]);
  const [size, setSize] = useState(300);
  const rippleIdRef = useRef(0);

  // Responsive sizing
  useEffect(() => {
    if (sizeProp) {
      setSize(sizeProp);
      return;
    }

    const updateSize = () => {
      const width = window.innerWidth;
      if (width < 768) {
        setSize(150); // Mobile
      } else if (width < 1024) {
        setSize(200); // Tablet
      } else {
        setSize(300); // Desktop
      }
    };

    updateSize();
    window.addEventListener('resize', updateSize);
    return () => window.removeEventListener('resize', updateSize);
  }, [sizeProp]);

  const velocityRef = useRef<Velocity>({
    x: speed * (Math.random() > 0.5 ? 1 : -1),
    y: speed * (Math.random() > 0.5 ? 1 : -1),
  });
  const positionRef = useRef<Position>(position);
  const lastBounceTimeRef = useRef<BounceTime>({ x: 0, y: 0 });
  const bounceCountRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);

  // Apply randomness to velocity
  const applyRandomness = useCallback(
    (value: number): number => {
      const randomFactor = 1 + (Math.random() * 2 - 1) * bounceRandomness;
      return value * randomFactor;
    },
    [bounceRandomness]
  );

  // Check if trajectory needs adjustment to enable corner hits
  const checkAndAdjustTrajectory = useCallback(() => {
    const { x: vx, y: vy } = velocityRef.current;

    // If velocity ratio is too close to certain values, we might never hit corners
    // Nudge the velocity slightly to improve corner hit probability
    const ratio = Math.abs(vx / vy);

    // Check if we're in a problematic ratio range
    // Ratios too close to integers or simple fractions can cause loops
    const isProblematic =
      Math.abs(ratio - Math.round(ratio)) < 0.1 || // Close to integer
      Math.abs(ratio - 0.5) < 0.05 || // Close to 1:2
      Math.abs(ratio - 2) < 0.1; // Close to 2:1

    if (isProblematic) {
      // Apply small nudge to break the pattern
      const nudgeX = (Math.random() * 2 - 1) * TRAJECTORY_NUDGE_AMOUNT;
      const nudgeY = (Math.random() * 2 - 1) * TRAJECTORY_NUDGE_AMOUNT;

      velocityRef.current.x *= 1 + nudgeX;
      velocityRef.current.y *= 1 + nudgeY;

      // Maintain speed after nudge
      const currentSpeed = Math.sqrt(vx * vx + vy * vy);
      const newSpeed = Math.sqrt(
        velocityRef.current.x ** 2 + velocityRef.current.y ** 2
      );
      const speedRatio = currentSpeed / newSpeed;
      velocityRef.current.x *= speedRatio;
      velocityRef.current.y *= speedRatio;
    }
  }, []);

  // Preload audio
  useEffect(() => {
    audioRef.current = new Audio('/assets/sounds/bonk.mp3');
    audioRef.current.preload = 'auto';
  }, []);

  // Cycle to next color
  const cycleColor = useCallback(() => {
    setCurrentColorIndex((prev) => (prev + 1) % COLOR_PALETTE.length);
  }, []);

  // Add ripple effect
  const addRipple = useCallback((x: number, y: number, isCornerHit: boolean) => {
    const id = rippleIdRef.current++;
    setRipples((prev) => [...prev, { id, x, y, isCornerHit }]);

    // Remove ripple after animation
    setTimeout(() => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    }, isCornerHit ? 1100 : 700);
  }, []);

  // Physics update loop
  useEffect(() => {
    const updatePhysics = () => {
      const container = containerRef.current;
      if (!container) {
        animationFrameRef.current = requestAnimationFrame(updatePhysics);
        return;
      }

      const bounds = container.getBoundingClientRect();
      const viewportWidth = window.innerWidth;
      const viewportHeight = window.innerHeight;

      let { x, y } = positionRef.current;
      const { x: vx, y: vy } = velocityRef.current;

      // Update position
      x += vx;
      y += vy;

      const now = Date.now();
      let hitX = false;
      let hitY = false;

      // Check X bounds (left/right walls)
      if (x <= 0) {
        x = 0;
        velocityRef.current.x = Math.abs(applyRandomness(vx));
        lastBounceTimeRef.current.x = now;
        hitX = true;
        bounceCountRef.current++;
        cycleColor();
        addRipple(x + size / 2, y + size / 2, false);
      } else if (x + size >= viewportWidth) {
        x = viewportWidth - size;
        velocityRef.current.x = -Math.abs(applyRandomness(vx));
        lastBounceTimeRef.current.x = now;
        hitX = true;
        bounceCountRef.current++;
        cycleColor();
        addRipple(x + size / 2, y + size / 2, false);
      }

      // Check Y bounds (top/bottom walls)
      if (y <= 0) {
        y = 0;
        velocityRef.current.y = Math.abs(applyRandomness(vy));
        lastBounceTimeRef.current.y = now;
        hitY = true;
        bounceCountRef.current++;
        cycleColor();
        addRipple(x + size / 2, y + size / 2, false);
      } else if (y + size >= viewportHeight) {
        y = viewportHeight - size;
        velocityRef.current.y = -Math.abs(applyRandomness(vy));
        lastBounceTimeRef.current.y = now;
        hitY = true;
        bounceCountRef.current++;
        cycleColor();
        addRipple(x + size / 2, y + size / 2, false);
      }

      // Check for corner hit (both walls hit within threshold)
      const timeSinceXBounce = now - lastBounceTimeRef.current.x;
      const timeSinceYBounce = now - lastBounceTimeRef.current.y;

      if (
        hitX &&
        hitY &&
        timeSinceXBounce <= CORNER_HIT_THRESHOLD_MS &&
        timeSinceYBounce <= CORNER_HIT_THRESHOLD_MS
      ) {
        setIsCornerHit(true);
        onCornerHit?.();
        addRipple(x + size / 2, y + size / 2, true);

        // Play bonk sound
        if (audioRef.current) {
          audioRef.current.currentTime = 0;
          audioRef.current.play().catch(() => {
            // Ignore errors if audio playback fails
          });
        }

        // Reset corner hit state after celebration
        setTimeout(() => setIsCornerHit(false), 2000);
      }

      // Periodic trajectory check
      if (bounceCountRef.current > 0 && bounceCountRef.current % TRAJECTORY_CHECK_INTERVAL === 0) {
        checkAndAdjustTrajectory();
      }

      positionRef.current = { x, y };
      setPosition({ x, y });

      animationFrameRef.current = requestAnimationFrame(updatePhysics);
    };

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
