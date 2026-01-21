import { useEffect, useRef } from 'react';

import { getIgnitionInfluence, type IgnitionPoint } from './useIgnitionPoints';
import { getDeviceTier, isTouchDevice, resizeCanvasToWindow } from './utils';

interface Ember {
  x: number;
  y: number;
  prevX: number;
  prevY: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

const PARTICLE_SPEED = 1;
const MAX_LIFE = 100;
const SPAWN_SPREAD = 50;
const UPWARD_DRIFT = 0.05;
const BURST_CHANCE = 0.2;
const IGNITION_SPAWN_THRESHOLD = 0.3;
const TOUCH_EMBER_REDUCTION = 0.5;

const EMBER_CONFIG = {
  MIN_COUNT: 25,
  MAX_COUNT: 50,
  IGNITION_SPAWN_BOOST: 15,
} as const;

function createEmber(
  width: number,
  height: number,
  spawnX?: number,
  spawnY?: number,
  randomizeLife?: boolean
): Ember {
  const x =
    spawnX !== undefined ? spawnX + (Math.random() - 0.5) * SPAWN_SPREAD : Math.random() * width;
  const y = spawnY !== undefined ? spawnY : height + Math.random() * 20;

  // Randomize lifetime 50-150% of MAX_LIFE
  const lifeVariance = 0.5 + Math.random() * 1.0;
  const maxLife = Math.floor(MAX_LIFE * lifeVariance);

  // Vary speed per-ember (0.5x to 2x)
  const speedMult = 0.5 + Math.random() * 1.5;

  return {
    x,
    y,
    prevX: x,
    prevY: y,
    vx: (Math.random() - 0.5) * PARTICLE_SPEED * speedMult,
    vy: (Math.random() - 0.5) * PARTICLE_SPEED * speedMult,
    life: randomizeLife ? Math.floor(maxLife * Math.random()) : maxLife,
    maxLife: maxLife,
  };
}

function updateEmber(ember: Ember): boolean {
  // Store previous position for line drawing
  ember.prevX = ember.x;
  ember.prevY = ember.y;

  ember.vx += (Math.random() - 0.5) * PARTICLE_SPEED;
  ember.vy += (Math.random() - 0.5 - UPWARD_DRIFT) * PARTICLE_SPEED;

  ember.x += ember.vx;
  ember.y += ember.vy;
  ember.life -= 1;

  return ember.life > 0;
}

function drawEmber(ctx: CanvasRenderingContext2D, ember: Ember, dpr: number): void {
  const lifeRatio = ember.life / ember.maxLife;

  // Color fades from yellow-orange to red as life decreases
  const r = 255;
  const g = Math.floor(200 * lifeRatio);
  const b = 0;

  // Opacity uses cosine curve for smoother fade
  const alpha = 1 - Math.cos(lifeRatio * Math.PI) * 0.5;

  ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
  ctx.lineWidth = 2 * dpr;
  ctx.lineCap = 'round';

  ctx.beginPath();
  ctx.moveTo(ember.prevX * dpr, ember.prevY * dpr);
  ctx.lineTo(ember.x * dpr, ember.y * dpr);
  ctx.stroke();
}

interface EmberCanvasProps {
  ignitionPoints?: IgnitionPoint[];
}

export function EmberCanvas({ ignitionPoints = [] }: EmberCanvasProps): React.JSX.Element | null {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const embersRef = useRef<Ember[]>([]);
  const animationRef = useRef<number>(0);
  const mouseRef = useRef({ x: 0, y: 0 });
  const isVisibleRef = useRef(true);
  const ignitionPointsRef = useRef(ignitionPoints);

  // Keep ignition points ref updated
  useEffect(() => {
    ignitionPointsRef.current = ignitionPoints;
  }, [ignitionPoints]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const tier = getDeviceTier();
    const isTouch = isTouchDevice();
    const maxEmbers = tier === 'high' ? EMBER_CONFIG.MAX_COUNT : EMBER_CONFIG.MIN_COUNT;
    const reducedEmbers = isTouch ? Math.floor(maxEmbers * TOUCH_EMBER_REDUCTION) : maxEmbers;

    const resize = () => resizeCanvasToWindow(canvas);
    resize();
    window.addEventListener('resize', resize);

    // Track mouse position for ignition-based spawning
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    if (!isTouch) {
      window.addEventListener('mousemove', handleMouseMove);
    }

    // Visibility API - pause when tab is hidden
    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initialize embers with staggered life phases
    embersRef.current = [];
    for (let i = 0; i < reducedEmbers; i++) {
      embersRef.current.push(
        createEmber(window.innerWidth, window.innerHeight, undefined, undefined, true)
      );
    }

    const animate = () => {
      // Skip if tab is hidden
      if (!isVisibleRef.current) {
        animationRef.current = requestAnimationFrame(animate);
        return;
      }

      const dpr = window.devicePixelRatio || 1;
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw embers
      embersRef.current = embersRef.current.filter((ember) => updateEmber(ember));

      for (const ember of embersRef.current) {
        drawEmber(ctx, ember, dpr);
      }

      // Calculate ignition influence at cursor position
      const ignitionInfluence = isTouch
        ? 0
        : getIgnitionInfluence(mouseRef.current.x, mouseRef.current.y, ignitionPointsRef.current);

      // Spawn new embers to maintain count
      const targetCount =
        reducedEmbers + Math.floor(ignitionInfluence * EMBER_CONFIG.IGNITION_SPAWN_BOOST);
      while (embersRef.current.length < targetCount) {
        const burstCount = Math.random() < BURST_CHANCE ? Math.floor(2 + Math.random() * 2) : 1;

        for (let i = 0; i < burstCount && embersRef.current.length < targetCount; i++) {
          if (ignitionInfluence > IGNITION_SPAWN_THRESHOLD && Math.random() < ignitionInfluence) {
            embersRef.current.push(
              createEmber(
                window.innerWidth,
                window.innerHeight,
                mouseRef.current.x,
                mouseRef.current.y
              )
            );
          } else {
            embersRef.current.push(createEmber(window.innerWidth, window.innerHeight));
          }
        }
      }

      // Update glow intensity based on ignition influence
      if (!isTouch && ignitionInfluence > 0) {
        const currentIntensity = parseFloat(
          getComputedStyle(document.documentElement).getPropertyValue('--fire-glow-intensity') ||
            '0.3'
        );
        const boostedIntensity = Math.min(currentIntensity + ignitionInfluence * 0.3, 1);
        document.documentElement.style.setProperty(
          '--fire-glow-intensity',
          boostedIntensity.toString()
        );
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 40,
      }}
    />
  );
}
