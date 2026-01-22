import { lazy, Suspense, useEffect, useState } from 'react';

import { useSiteMode } from '../../hooks/useSiteMode';

import { AmbientFireLight } from './AmbientFireLight';
import { useCharAccumulation } from './useCharAccumulation';
import { useEmberText } from './useEmberText';
import { useIgnitionPoints } from './useIgnitionPoints';
import { useScrollVelocity } from './useScrollVelocity';
import { getDeviceTier } from './utils';

const UNMOUNT_DELAY_MS = 300;

const EmberCanvas = lazy(() => import('./EmberCanvas').then((m) => ({ default: m.EmberCanvas })));

function useDelayedFireModeMount(): boolean {
  const [mode] = useSiteMode();
  const [shouldRender, setShouldRender] = useState(false);

  useEffect(() => {
    if (mode === 'fire') {
      setShouldRender(true);
    } else {
      const timer = setTimeout(() => setShouldRender(false), UNMOUNT_DELAY_MS);
      return () => clearTimeout(timer);
    }
  }, [mode]);

  return shouldRender;
}

function FireModeEffects(): React.JSX.Element {
  const tier = getDeviceTier();
  const ignitionPoints = useIgnitionPoints();

  useScrollVelocity();
  const cleanupChar = useCharAccumulation();
  const cleanupEmberText = useEmberText();

  useEffect(() => {
    return () => {
      cleanupChar();
      cleanupEmberText();
    };
  }, [cleanupChar, cleanupEmberText]);

  return (
    <>
      <AmbientFireLight />
      {tier !== 'low' && (
        <Suspense fallback={null}>
          <EmberCanvas ignitionPoints={ignitionPoints} />
        </Suspense>
      )}
    </>
  );
}

export function FireModeSection(): React.JSX.Element | null {
  const shouldRender = useDelayedFireModeMount();

  if (!shouldRender) return null;

  return <FireModeEffects />;
}
