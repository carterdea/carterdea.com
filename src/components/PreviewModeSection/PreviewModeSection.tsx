import { useCallback, useEffect, useRef, useState } from 'react';
import { getPreviewPath, getViewportWidth, type SiteId, siteIds } from '../../config/preview-sites';
import { useSiteMode } from '../../hooks/useSiteMode';
import IMacG4 from '../IMacG4/IMacG4';
import PowerMacintosh from '../PowerMacintosh/PowerMacintosh';
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
  site: SiteId;
  position: Position;
}

function loadPreviewState(): PreviewState | null {
  if (typeof window === 'undefined') return null;
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    const parsed = JSON.parse(stored);
    if (parsed.computer && parsed.position) {
      return {
        computer: parsed.computer,
        site: parsed.site ?? 'stussy',
        position: parsed.position,
      };
    }
  } catch {
    // Ignore parse errors
  }
  return null;
}

function savePreviewState(state: PreviewState): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function PreviewModeSection() {
  const [mode] = useSiteMode();
  const [computer, setComputer] = useState<ComputerId>('power-macintosh');
  const [site, setSite] = useState<SiteId>('stussy');
  const [position, setPosition] = useState<Position>({ x: 700, y: 280 });
  const [isDragging, setIsDragging] = useState(false);
  const [isHovering, setIsHovering] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const dragOffset = useRef<Position>({ x: 0, y: 0 });

  // Load saved state on mount
  useEffect(() => {
    const saved = loadPreviewState();
    if (saved) {
      setComputer(saved.computer);
      setSite(saved.site);
      setPosition(saved.position);
    } else if (typeof window !== 'undefined') {
      setPosition({
        x: window.innerWidth * 0.55,
        y: window.innerHeight * 0.35,
      });
    }
    setHasMounted(true);
  }, []);

  // Fade in when preview mode activates
  useEffect(() => {
    if (mode !== 'preview') {
      setIsVisible(false);
      return;
    }
    const timer = setTimeout(() => setIsVisible(true), 50);
    return () => clearTimeout(timer);
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
    if (!isDragging) return;
    setIsDragging(false);
    savePreviewState({ computer, site, position });
  }, [isDragging, computer, site, position]);

  const cycleComputer = useCallback(
    (direction: 1 | -1) => {
      setComputer((prev) => {
        const currentIndex = COMPUTERS.findIndex((c) => c.id === prev);
        const nextIndex = (currentIndex + direction + COMPUTERS.length) % COMPUTERS.length;
        const newComputer = COMPUTERS[nextIndex].id;
        savePreviewState({ computer: newComputer, site, position });
        return newComputer;
      });
    },
    [site, position]
  );

  const cycleSite = useCallback(
    (direction: 1 | -1) => {
      setSite((prev) => {
        const currentIndex = siteIds.indexOf(prev);
        const nextIndex = (currentIndex + direction + siteIds.length) % siteIds.length;
        const newSite = siteIds[nextIndex];
        savePreviewState({ computer, site: newSite, position });
        return newSite;
      });
    },
    [computer, position]
  );

  function handlePrevComputer(): void {
    cycleComputer(-1);
  }
  function handleNextComputer(): void {
    cycleComputer(1);
  }
  function handlePrevSite(): void {
    cycleSite(-1);
  }
  function handleNextSite(): void {
    cycleSite(1);
  }
  function handleMouseEnter(): void {
    setIsHovering(true);
  }
  function handleMouseLeave(): void {
    setIsHovering(false);
  }

  useEffect(() => {
    if (mode !== 'preview') return;

    function handleKeyDown(e: KeyboardEvent): void {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case 'ArrowLeft':
          e.preventDefault();
          cycleComputer(-1);
          break;
        case 'ArrowRight':
          e.preventDefault();
          cycleComputer(1);
          break;
        case 'ArrowUp':
          e.preventDefault();
          cycleSite(-1);
          break;
        case 'ArrowDown':
          e.preventDefault();
          cycleSite(1);
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, cycleComputer, cycleSite]);

  if (mode !== 'preview' || !hasMounted) return null;

  const currentComputer = COMPUTERS.find((c) => c.id === computer);
  const CurrentComponent = currentComputer?.Component ?? PowerMacintosh;

  const computerWidth = 428;
  const computerHeight = 450;
  const keyboardOffset = computerHeight + 8;
  const keyboardCenterX = computerWidth / 2;

  return (
    <div className="fixed inset-0 pointer-events-none z-40" style={{ isolation: 'isolate' }}>
      <div
        role="application"
        aria-label="Draggable computer preview"
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
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <CurrentComponent
          screenshotSrc="/assets/previews/stussy-screenshot.png"
          initialPosition={{ x: 0, y: 0 }}
          disableDrag
          previewHtmlPath={getPreviewPath(site, 'home')}
          previewViewportWidth={getViewportWidth(site)}
        />

        <div
          role="toolbar"
          aria-label="Computer navigation"
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
          onMouseEnter={handleMouseEnter}
        >
          <ArrowKeysController
            onLeft={handlePrevComputer}
            onRight={handleNextComputer}
            onUp={handlePrevSite}
            onDown={handleNextSite}
          />
        </div>
      </div>
    </div>
  );
}
