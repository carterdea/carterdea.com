import { useEffect, useRef } from 'react';

import { resizeCanvasToWindow } from './utils';

interface GlowBlob {
  x: number;
  baseX: number;
  phase: number;
  phaseX: number; // separate phase for X movement
  phaseY: number; // separate phase for Y movement
  phaseScale: number; // separate phase for scale
  speedX: number;
  speedY: number;
  speedScale: number;
  amplitudeX: number;
  amplitudeY: number;
  baseRadius: number;
  opacity: number;
  flickerPhase: number;
  flickerSpeed: number;
}

export function AmbientFireLight(): React.JSX.Element {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number>(0);
  const blobsRef = useRef<GlowBlob[]>([]);
  const isVisibleRef = useRef(true);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    blobsRef.current = [
      {
        x: 0.5,
        baseX: 0.5,
        phase: 0,
        phaseX: 0,
        phaseY: Math.PI * 0.3,
        phaseScale: Math.PI * 0.7,
        speedX: 0.0008,
        speedY: 0.0005,
        speedScale: 0.0012,
        amplitudeX: 0.08,
        amplitudeY: 0.03,
        baseRadius: 1.0,
        opacity: 0.45,
        flickerPhase: 0,
        flickerSpeed: 0.015,
      },
      {
        x: 0.3,
        baseX: 0.3,
        phase: Math.PI * 0.5,
        phaseX: Math.PI * 1.2,
        phaseY: Math.PI * 0.8,
        phaseScale: 0,
        speedX: 0.0006,
        speedY: 0.0009,
        speedScale: 0.0008,
        amplitudeX: 0.1,
        amplitudeY: 0.04,
        baseRadius: 0.8,
        opacity: 0.35,
        flickerPhase: Math.PI * 0.5,
        flickerSpeed: 0.018,
      },
      {
        x: 0.7,
        baseX: 0.7,
        phase: Math.PI * 1.1,
        phaseX: Math.PI * 0.4,
        phaseY: Math.PI * 1.5,
        phaseScale: Math.PI * 1.2,
        speedX: 0.001,
        speedY: 0.0007,
        speedScale: 0.0015,
        amplitudeX: 0.07,
        amplitudeY: 0.025,
        baseRadius: 0.7,
        opacity: 0.3,
        flickerPhase: Math.PI,
        flickerSpeed: 0.022,
      },
    ];

    const resize = () => resizeCanvasToWindow(canvas);
    resize();
    window.addEventListener('resize', resize);

    const handleVisibilityChange = () => {
      isVisibleRef.current = !document.hidden;
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    let lastTime = 0;
    const targetFPS = 30; // Throttle to 30fps for glow - no need for 60
    const frameInterval = 1000 / targetFPS;

    const animate = (currentTime: number) => {
      animationRef.current = requestAnimationFrame(animate);

      if (!isVisibleRef.current) return;

      // Throttle frame rate
      const delta = currentTime - lastTime;
      if (delta < frameInterval) return;
      lastTime = currentTime - (delta % frameInterval);

      const width = canvas.width;
      const height = canvas.height;

      ctx.clearRect(0, 0, width, height);
      ctx.globalCompositeOperation = 'screen';

      window.dispatchEvent(new CustomEvent('firemode:tick', { detail: { time: currentTime } }));

      for (const blob of blobsRef.current) {
        blob.phaseX += blob.speedX * delta;
        blob.phaseY += blob.speedY * delta;
        blob.phaseScale += blob.speedScale * delta;
        blob.flickerPhase += blob.flickerSpeed * delta;

        const xOffset = Math.sin(blob.phaseX) * blob.amplitudeX;
        const yOffset = Math.sin(blob.phaseY) * blob.amplitudeY;
        const scaleOscillation = 0.85 + Math.sin(blob.phaseScale) * 0.15;

        const flicker1 = Math.sin(blob.flickerPhase * 7.3) * 0.15;
        const flicker2 = Math.sin(blob.flickerPhase * 11.7) * 0.1;
        const flicker3 = Math.sin(blob.flickerPhase * 3.1) * 0.08;
        const flickerAmount = 0.7 + flicker1 + flicker2 + flicker3;

        const centerX = (blob.baseX + xOffset) * width;
        const centerY = height + height * 0.1 - yOffset * height;
        const radiusX = width * 0.4 * blob.baseRadius * scaleOscillation;
        const radiusY = height * 0.5 * blob.baseRadius * scaleOscillation;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.scale(radiusX / radiusY, 1);

        const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, radiusY);
        const alpha = blob.opacity * flickerAmount;
        gradient.addColorStop(0, `rgba(255, 100, 0, ${alpha})`);
        gradient.addColorStop(0.4, `rgba(255, 50, 0, ${alpha * 0.5})`);
        gradient.addColorStop(0.7, `rgba(255, 30, 0, ${alpha * 0.2})`);
        gradient.addColorStop(1, 'rgba(255, 0, 0, 0)');

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(0, 0, radiusY, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      }
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        width: '100vw',
        height: '100vh',
        pointerEvents: 'none',
        zIndex: 1,
      }}
    />
  );
}
