import { lazy, Suspense } from 'react';

import { useSiteMode } from '../../hooks/useSiteMode';

const MatrixRain = lazy(() => import('../MatrixRain/MatrixRain'));

export function BackgroundRenderer() {
  const [mode] = useSiteMode();

  if (mode !== 'matrix') return null;

  return (
    <Suspense fallback={null}>
      <MatrixRain />
    </Suspense>
  );
}
