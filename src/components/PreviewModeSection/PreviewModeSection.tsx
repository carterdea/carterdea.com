import { useState, useEffect, useCallback, useRef } from 'react';
import { useSiteMode } from '../../hooks/useSiteMode';
import PowerMacintosh from '../PowerMacintosh/PowerMacintosh';
import IMacG4 from '../IMacG4/IMacG4';
import { ArrowKeysController } from './ArrowKeysController';

const STORAGE_KEY = 'carterdea-preview-state';

const COMPUTERS = [
  { id: 'power-macintosh', name: 'Power Macintosh', Component: PowerMacintosh },
  { id: 'imac-g4', name: 'iMac G4', Component: IMacG4 },
] as const;

type ComputerId = (typeof COMPUTERS)[number]['id'];
type Position = { x: number; y: number };

interface PreviewState {
  computer: ComputerId;
  position: Position;
}

function getDefaultPosition(): Position {
  if (typeof window === 'undefined') return { x: 700, y: 280 };
  return {
    x: window.innerWidth * 0.55,
    y: window.innerHeight * 0.35,
  };
}

function getStoredState(): PreviewState | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.computer && parsed.position) {
        return {
          computer: parsed.computer,
          position: parsed.position,
        };
      }
    }
  } catch {
    // Invalid JSON
  }
  return null;
}

function saveState(state: PreviewState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function PreviewModeSection() {
  const [mode] = useSiteMode();
  const [computer, setComputer] = useState<ComputerId>('power-macintosh');
  const [position, setPosition] = useState<Position>({ x: 700, y: 280 });
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const dragOffset = useRef<Position>({ x: 0, y: 0 });

  useEffect(() => {
    const stored = getStoredState();
    if (stored) {
      setComputer(stored.computer);
      setPosition(stored.position);
    } else {
      setPosition(getDefaultPosition());
    }
    setHasMounted(true);
  }, []);

  useEffect(() => {
    if (mode === 'preview') {
      const timer = setTimeout(() => setIsVisible(true), 50);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
    }
  }, [mode]);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      // Don't drag if clicking on buttons (power button, arrow keys)
      if ((e.target as HTMLElement).closest('button')) return;

      setIsDragging(true);
      dragOffset.current = {
        x: e.clientX - position.x,
        y: e.clientY - position.y,
      };
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    },
    [position]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      setPosition({
        x: e.clientX - dragOffset.current.x,
        y: e.clientY - dragOffset.current.y,
      });
    },
    [isDragging]
  );

  const handlePointerUp = useCallback(() => {
    if (isDragging) {
      setIsDragging(false);
      saveState({ computer, position });
    }
  }, [isDragging, computer, position]);

  const cycleComputer = useCallback((direction: 1 | -1) => {
    setComputer((prev) => {
      const currentIndex = COMPUTERS.findIndex((c) => c.id === prev);
      const nextIndex = (currentIndex + direction + COMPUTERS.length) % COMPUTERS.length;
      const newComputer = COMPUTERS[nextIndex].id;
      saveState({ computer: newComputer, position });
      return newComputer;
    });
  }, [position]);

  const handlePrevComputer = useCallback(() => cycleComputer(-1), [cycleComputer]);
  const handleNextComputer = useCallback(() => cycleComputer(1), [cycleComputer]);

  // Keyboard navigation
  useEffect(() => {
    if (mode !== 'preview') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Don't capture if user is typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        handlePrevComputer();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        handleNextComputer();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, handlePrevComputer, handleNextComputer]);

  if (mode !== 'preview' || !hasMounted) return null;

  const currentComputer = COMPUTERS.find((c) => c.id === computer);
  const CurrentComponent = currentComputer?.Component ?? PowerMacintosh;

  const computerWidth = 428;
  const computerHeight = 450; // iMac G4 is taller
  const keyboardOffset = computerHeight + 8;
  const keyboardCenterX = computerWidth / 2;

  return (
    <div
      className="fixed inset-0 pointer-events-none z-40"
      style={{ isolation: 'isolate' }}
    >
      <div
        className={`
          absolute pointer-events-auto
          transition-opacity duration-300 ease-out
          ${isVisible ? 'opacity-100' : 'opacity-0'}
          ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
        `}
        style={{
          transform: `translate(${position.x}px, ${position.y}px)`,
          willChange: isDragging ? 'transform' : 'auto',
        }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        onMouseEnter={() => setIsHovering(true)}
        onMouseLeave={() => setIsHovering(false)}
      >
        <CurrentComponent
          screenshotSrc="/assets/previews/stussy-screenshot.png"
          initialPosition={{ x: 0, y: 0 }}
          disableDrag
        />

        <div
          className={`
            absolute pointer-events-auto
            transition-opacity duration-200
            md:opacity-0 md:hover:opacity-100
            ${isHovering || isDragging ? 'md:opacity-100!' : ''}
          `}
          style={{
            top: keyboardOffset,
            left: keyboardCenterX,
            transform: 'translateX(-50%)',
          }}
          onMouseEnter={() => setIsHovering(true)}
        >
          <ArrowKeysController
            onLeft={handlePrevComputer}
            onRight={handleNextComputer}
          />
        </div>
      </div>
    </div>
  );
}
