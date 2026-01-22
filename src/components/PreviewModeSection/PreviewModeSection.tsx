import { useCallback, useEffect, useRef, useState } from 'react';
import { useSiteMode } from '../../hooks/useSiteMode';
import IMacG4 from '../IMacG4/IMacG4';
import PowerMacintosh from '../PowerMacintosh/PowerMacintosh';
import { ArrowKeysController } from './ArrowKeysController';
import { siteIds, getPreviewPath, getViewportWidth, type SiteId } from '../../config/preview-sites';

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

  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (parsed.computer && parsed.position) {
          setComputer(parsed.computer);
          setPosition(parsed.position);
          if (parsed.site) {
            setSite(parsed.site);
          }
          setHasMounted(true);
          return;
        }
      }
    } catch {}

    setPosition({
      x: window.innerWidth * 0.55,
      y: window.innerHeight * 0.35,
    });
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
      if (typeof window !== 'undefined') {
        localStorage.setItem(STORAGE_KEY, JSON.stringify({ computer, site, position }));
      }
    }
  }, [isDragging, computer, site, position]);

  const cycleComputer = useCallback(
    (direction: 1 | -1) => {
      setComputer((prev) => {
        const currentIndex = COMPUTERS.findIndex((c) => c.id === prev);
        const nextIndex = (currentIndex + direction + COMPUTERS.length) % COMPUTERS.length;
        const newComputer = COMPUTERS[nextIndex].id;
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ computer: newComputer, site, position }));
        }
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
        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, JSON.stringify({ computer, site: newSite, position }));
        }
        return newSite;
      });
    },
    [computer, position]
  );

  const handlePrevComputer = useCallback(() => cycleComputer(-1), [cycleComputer]);
  const handleNextComputer = useCallback(() => cycleComputer(1), [cycleComputer]);
  const handlePrevSite = useCallback(() => cycleSite(-1), [cycleSite]);
  const handleNextSite = useCallback(() => cycleSite(1), [cycleSite]);
  const handleMouseEnter = useCallback(() => setIsHovering(true), []);
  const handleMouseLeave = useCallback(() => setIsHovering(false), []);

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
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        handlePrevSite();
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        handleNextSite();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode, handlePrevComputer, handleNextComputer, handlePrevSite, handleNextSite]);

  if (mode !== 'preview' || !hasMounted) return null;

  const currentComputer = COMPUTERS.find((c) => c.id === computer);
  const CurrentComponent = currentComputer?.Component ?? PowerMacintosh;

  const computerWidth = 428;
  const computerHeight = 450; // iMac G4 is taller
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
