import { lazy, Suspense, useEffect, useState } from 'react';
import { useSiteMode } from '../../hooks/useSiteMode';

const UNMOUNT_DELAY_MS = 300;
const VISIBILITY_DELAY_MS = 50;

// Lazy load heavy dependencies - only fetched when money mode is enabled
const MoneyFall = lazy(() =>
  import('../MoneyFall/MoneyFall').then((m) => ({ default: m.MoneyFall }))
);
const StonksChartWithPrice = lazy(() => import('../StonksChart/StonksChartWithPrice'));

interface DelayedMountState {
  shouldRender: boolean;
  renderKey: number;
}

function useDelayedMoneyModeMount(): DelayedMountState {
  const [mode] = useSiteMode();
  const [shouldRender, setShouldRender] = useState(false);
  const [renderKey, setRenderKey] = useState(0);

  useEffect(() => {
    if (mode === 'money') {
      setShouldRender(true);
      setRenderKey((k) => k + 1);
    } else {
      const timer = setTimeout(() => setShouldRender(false), UNMOUNT_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [mode]);

  return { shouldRender, renderKey };
}

export function MoneyModeSection(): React.JSX.Element | null {
  const { shouldRender, renderKey } = useDelayedMoneyModeMount();

  if (!shouldRender) return null;

  return (
    <>
      <Suspense fallback={null}>
        <MoneyFall key={`back-${renderKey}`} zIndex={-1} layer="back" />
      </Suspense>
      <Suspense fallback={null}>
        <MoneyFall key={`front-${renderKey}`} zIndex={50} layer="front" />
      </Suspense>
    </>
  );
}

export function MoneyModeChart(): React.JSX.Element | null {
  const [mode] = useSiteMode();
  const [isVisible, setIsVisible] = useState(false);
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (mode === 'money') {
      setShouldRender(true);
      const timer = setTimeout(() => setIsVisible(true), VISIBILITY_DELAY_MS);
      return () => clearTimeout(timer);
    } else {
      setIsVisible(false);
      const timer = setTimeout(() => setShouldRender(false), UNMOUNT_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [mode]);

  if (!shouldRender) return null;

  return (
    <Suspense fallback={null}>
      <div
        className={`
          relative z-10 h-[200px] md:h-[300px]
          transition-opacity duration-300 ease-out
          ${isVisible ? 'opacity-100' : 'opacity-0'}
        `}
      >
        <StonksChartWithPrice />
      </div>
    </Suspense>
  );
}
