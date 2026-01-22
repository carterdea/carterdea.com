import { useEffect, useState } from 'react';
import { useSiteMode } from '../../hooks/useSiteMode';
import { ElementHighlighter } from './ElementHighlighter';
import { GridOverlay } from './GridOverlay';
import { getSelectorLabel } from './inspectorUtils';
import { SectionBoundaries } from './SectionBoundaries';
import { SelectorLabel } from './SelectorLabel';
import { useElementUnderCursor } from './useElementUnderCursor';

const FADE_IN_DELAY_MS = 50;
const UNMOUNT_DELAY_MS = 300;

function useDelayedMount(active: boolean): { shouldRender: boolean; isVisible: boolean } {
  const [shouldRender, setShouldRender] = useState(false);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    if (active) {
      setShouldRender(true);
      const timer = setTimeout(() => setIsVisible(true), FADE_IN_DELAY_MS);
      return () => clearTimeout(timer);
    }

    setIsVisible(false);
    const timer = setTimeout(() => setShouldRender(false), UNMOUNT_DELAY_MS);
    return () => clearTimeout(timer);
  }, [active]);

  return { shouldRender, isVisible };
}

function useIsTouchDevice(): boolean {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(hover: none)');
    setIsTouch(mediaQuery.matches);

    function handleChange(e: MediaQueryListEvent): void {
      setIsTouch(e.matches);
    }

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, []);

  return isTouch;
}

export function InspectorModeSection(): React.JSX.Element | null {
  const [mode] = useSiteMode();
  const { shouldRender, isVisible } = useDelayedMount(mode === 'coder');
  const isTouch = useIsTouchDevice();
  const elementInfo = useElementUnderCursor(shouldRender && !isTouch);

  if (!shouldRender) return null;

  const opacityClass = isVisible ? 'opacity-100' : 'opacity-0';
  const { element, rect } = elementInfo;
  const showElementInspector = !isTouch && element && rect;

  return (
    <div className={`transition-opacity duration-200 ${opacityClass}`} data-inspector-overlay>
      <GridOverlay />
      <SectionBoundaries />
      {showElementInspector && (
        <>
          <ElementHighlighter
            rect={rect}
            padding={elementInfo.padding}
            margin={elementInfo.margin}
          />
          <SelectorLabel
            selector={getSelectorLabel(element)}
            width={rect.width}
            height={rect.height}
            cursorX={elementInfo.cursorX}
            cursorY={elementInfo.cursorY}
          />
        </>
      )}
    </div>
  );
}
