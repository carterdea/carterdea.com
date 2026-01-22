import { useEffect, useState } from 'react';

interface RippleProps {
  x: number;
  y: number;
  size: number;
  color: string;
  isCornerHit?: boolean;
}

export function Ripple({ x, y, size, color, isCornerHit = false }: RippleProps): React.ReactNode {
  const [isVisible, setIsVisible] = useState(true);

  const duration = isCornerHit ? 1000 : 600;
  const animationDuration = isCornerHit ? '1s' : '0.6s';
  const scaleFactor = isCornerHit ? 3 : 1.5;

  useEffect(() => {
    const timer = setTimeout(() => setIsVisible(false), duration);
    return () => clearTimeout(timer);
  }, [duration]);

  if (!isVisible) return null;

  return (
    <div
      style={{
        position: 'fixed',
        left: x,
        top: y,
        width: size,
        height: size,
        pointerEvents: 'none',
        zIndex: 2,
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          border: `2px solid ${color}`,
          transform: 'translate(-50%, -50%)',
          animation: `ripple-expand ${animationDuration} ease-out forwards`,
          opacity: 0.8,
        }}
      />
      <style>{`
        @keyframes ripple-expand {
          from {
            transform: translate(-50%, -50%) scale(1);
            opacity: 0.8;
          }
          to {
            transform: translate(-50%, -50%) scale(${scaleFactor});
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}
