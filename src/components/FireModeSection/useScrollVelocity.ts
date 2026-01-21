import { useEffect, useRef } from 'react';

const BASE_INTENSITY = 0.5;
const MAX_INTENSITY = 1.0;
const VELOCITY_SCALE = 0.015;
const DECAY_RATE = 0.95;
const IDLE_PULSE_PERIOD = 3000; // 3 second sine wave
const IDLE_PULSE_AMPLITUDE = 0.15;

export function useScrollVelocity(): void {
  const lastScrollYRef = useRef(0);
  const velocityRef = useRef(0);
  const animationIdRef = useRef<number>(0);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    lastScrollYRef.current = window.scrollY;
    const startTime = performance.now();

    function updateGlowIntensity() {
      const currentScrollY = window.scrollY;
      const delta = Math.abs(currentScrollY - lastScrollYRef.current);
      lastScrollYRef.current = currentScrollY;

      // Add velocity and decay
      velocityRef.current = Math.max(velocityRef.current * DECAY_RATE, delta);

      // Calculate scroll-based intensity
      const scrollIntensity = Math.min(
        BASE_INTENSITY + velocityRef.current * VELOCITY_SCALE,
        MAX_INTENSITY
      );

      // Add idle pulse when not scrolling
      const elapsed = performance.now() - startTime;
      const idlePulse =
        velocityRef.current < 1
          ? Math.sin((elapsed / IDLE_PULSE_PERIOD) * Math.PI * 2) * IDLE_PULSE_AMPLITUDE
          : 0;

      const finalIntensity = Math.max(0, Math.min(1, scrollIntensity + idlePulse));
      document.documentElement.style.setProperty(
        '--fire-glow-intensity',
        finalIntensity.toString()
      );

      animationIdRef.current = requestAnimationFrame(updateGlowIntensity);
    }

    animationIdRef.current = requestAnimationFrame(updateGlowIntensity);

    return () => {
      cancelAnimationFrame(animationIdRef.current);
      document.documentElement.style.removeProperty('--fire-glow-intensity');
    };
  }, []);
}
