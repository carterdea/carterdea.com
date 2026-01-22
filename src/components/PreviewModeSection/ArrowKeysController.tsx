import { useState } from 'react';

type Direction = 'up' | 'down' | 'left' | 'right';

interface ArrowKeysControllerProps {
  onLeft: () => void;
  onRight: () => void;
  onUp?: () => void;
  onDown?: () => void;
}

interface KeyProps {
  direction: Direction;
  onClick?: () => void;
  disabled?: boolean;
}

const KEY_SIZE = 36;

// SA profile keycap dimensions
const SA_PROFILE = {
  bevelTop: 3,
  bevelSide: 6,
  bevelBottom: 8,
  radiusBase: 2,
  radiusTop: 4,
};

// White keycaps with directional lighting (light from top-left)
const SA_COLORS = {
  legend: '#3e3e3e',
  base: '#f8f8f8',
  topHighlight: '#ffffff',
  bevelTop: '#e8e8e8',
  bevelLeft: '#e0e0e0',
  bevelRight: '#c8c8c8',
  bevelBottom: '#b8b8b8',
  shadow: '#2a2a2a',
};

const KEY_CONFIG: Record<
  Direction,
  { label: string; width: number; height: number; path: string }
> = {
  up: { label: 'Previous site', width: 10, height: 6, path: 'M1.5 4.5L5 1.5L8.5 4.5' },
  down: { label: 'Next site', width: 10, height: 6, path: 'M1.5 1.5L5 4.5L8.5 1.5' },
  left: { label: 'Previous computer', width: 6, height: 10, path: 'M4.5 1.5L1.5 5L4.5 8.5' },
  right: { label: 'Next computer', width: 6, height: 10, path: 'M1.5 1.5L4.5 5L1.5 8.5' },
};

function Key({ direction, onClick, disabled }: KeyProps) {
  const [isPressed, setIsPressed] = useState(false);

  const { label, width, height, path } = KEY_CONFIG[direction];
  const { bevelTop, bevelSide, bevelBottom, radiusBase, radiusTop } = SA_PROFILE;
  const pressedOffset = isPressed && !disabled ? 2 : 0;

  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      disabled={disabled}
      aria-label={label}
      onPointerDown={(e) => {
        e.stopPropagation();
        setIsPressed(true);
      }}
      onPointerUp={(e) => {
        e.stopPropagation();
        setIsPressed(false);
      }}
      onPointerLeave={() => setIsPressed(false)}
      className="relative cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
      style={{
        width: KEY_SIZE,
        height: KEY_SIZE,
        overflow: 'hidden',
      }}
    >
      {/* Shadow under key - visible when key is pressed down */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          backgroundColor: SA_COLORS.shadow,
          borderRadius: radiusBase,
        }}
      />

      {/* Key body with 4-sided bevel */}
      <div
        style={{
          position: 'absolute',
          left: 0,
          right: 0,
          top: pressedOffset,
          height: KEY_SIZE - pressedOffset,
          borderStyle: 'solid',
          borderWidth: `${bevelTop}px ${bevelSide}px ${bevelBottom - pressedOffset}px ${bevelSide}px`,
          borderColor: `${SA_COLORS.bevelTop} ${SA_COLORS.bevelRight} ${SA_COLORS.bevelBottom} ${SA_COLORS.bevelLeft}`,
          borderRadius: radiusBase,
          backgroundColor: SA_COLORS.bevelTop,
          transition: 'all 50ms ease-out',
        }}
      />

      {/* Key top surface */}
      <div
        style={{
          position: 'absolute',
          left: bevelSide,
          right: bevelSide,
          top: bevelTop + pressedOffset,
          height: KEY_SIZE - bevelTop - bevelBottom,
          background: `linear-gradient(135deg, ${SA_COLORS.topHighlight} 0%, ${SA_COLORS.base} 100%)`,
          borderRadius: radiusTop,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: disabled ? '#bbb' : SA_COLORS.legend,
          transition: 'all 50ms ease-out',
          // Accent line on top edge
          borderTop: `1px solid ${SA_COLORS.topHighlight}`,
        }}
      >
        <svg
          width={width}
          height={height}
          viewBox={`0 0 ${width} ${height}`}
          fill="none"
          aria-hidden="true"
        >
          <path
            d={path}
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </button>
  );
}

export function ArrowKeysController({ onLeft, onRight, onUp, onDown }: ArrowKeysControllerProps) {
  return (
    <div
      className="flex flex-col items-center"
      style={{
        // Dark keyboard base plate
        background: '#1a1a1a',
        padding: '6px 8px 8px',
        gap: 2,
        borderRadius: 6,
        boxShadow: `
          0 4px 12px rgba(0,0,0,0.5),
          inset 0 1px 0 rgba(255,255,255,0.05)
        `,
      }}
    >
      <Key direction="up" onClick={onUp} disabled={!onUp} />
      <div className="flex" style={{ gap: 2 }}>
        <Key direction="left" onClick={onLeft} />
        <Key direction="down" onClick={onDown} disabled={!onDown} />
        <Key direction="right" onClick={onRight} />
      </div>
    </div>
  );
}
