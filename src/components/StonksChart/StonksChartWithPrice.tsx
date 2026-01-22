import { useCallback, useEffect, useRef, useState } from 'react';
import { emitIntensity, emitPhase, emitReset, type Phase } from '../../lib/moneyFallIntensity';
import Button from '../ui/Button';
import { StonksChart, type StonksChartHandle } from './StonksChart';

const PRICE = {
  MIN: 1,
  MAX: 10_000_000_000_000,
  INTERNAL_MAX: 200,
};

const THROTTLE = {
  CLIMB_MIN_MS: 550,
  CLIMB_MAX_MS: 900,
  CRASH_MS: 50,
  INTENSITY_MS: 66,
};

const INTENSITY_SMOOTHING = 0.08;
const EARLY_DAMPEN_CURVE = 3;

function internalToDisplayPrice(internal: number, isCrashed: boolean): number {
  if (isCrashed && internal <= 0) return 0;
  if (internal <= 0) return PRICE.MIN;
  const t = Math.min(internal / PRICE.INTERNAL_MAX, 1);
  const ratio = PRICE.MAX / PRICE.MIN;
  return PRICE.MIN * ratio ** t;
}

export function StonksChartWithPrice(): React.JSX.Element {
  const [displayPrice, setDisplayPrice] = useState(PRICE.MIN);
  const [phase, setPhase] = useState<Phase>('climb');
  const [OdometerComponent, setOdometerComponent] = useState<React.ComponentType<{
    value: number;
    format?: string;
  }> | null>(null);
  const lastUpdateTimeRef = useRef(0);
  const nextIntervalRef = useRef(THROTTLE.CLIMB_MIN_MS);
  const lastIntensityEmitRef = useRef(0);
  const smoothedIntensityRef = useRef(0);
  const chartRef = useRef<StonksChartHandle>(null);
  const phaseRef = useRef(phase);
  phaseRef.current = phase;

  useEffect(() => {
    import('react-odometerjs').then((mod) => {
      setOdometerComponent(() => mod.default);
    });
  }, []);

  const handlePriceChange = useCallback((newPrice: number, progress: number) => {
    const now = performance.now();
    const timeSinceLastUpdate = now - lastUpdateTimeRef.current;
    const currentPhase = phaseRef.current;

    // Throttle intensity updates to ~15fps
    if (now - lastIntensityEmitRef.current >= THROTTLE.INTENSITY_MS) {
      // Apply early dampening: fewer bills at start, ramps up over time
      const dampenedProgress = progress * (1 - Math.exp(-progress * EARLY_DAMPEN_CURVE));

      // Smooth the intensity to avoid jittery bill spawning from micro-dips
      smoothedIntensityRef.current +=
        (dampenedProgress - smoothedIntensityRef.current) * INTENSITY_SMOOTHING;

      emitIntensity(smoothedIntensityRef.current);
      lastIntensityEmitRef.current = now;
    }

    // Don't update display price after crash is done
    if (currentPhase === 'done') return;

    // Different throttle for climb vs crash
    const throttleMs = currentPhase === 'crash' ? THROTTLE.CRASH_MS : nextIntervalRef.current;

    if (timeSinceLastUpdate >= throttleMs) {
      lastUpdateTimeRef.current = now;
      // Only randomize interval during climb
      if (currentPhase === 'climb') {
        nextIntervalRef.current =
          THROTTLE.CLIMB_MIN_MS + Math.random() * (THROTTLE.CLIMB_MAX_MS - THROTTLE.CLIMB_MIN_MS);
      }
      setDisplayPrice(internalToDisplayPrice(newPrice, currentPhase === 'crash'));
    }
  }, []);

  const handlePhaseChange = useCallback((newPhase: Phase) => {
    setPhase(newPhase);
    emitPhase(newPhase);
    if (newPhase === 'done') {
      setDisplayPrice(0);
    }
  }, []);

  const handleReset = useCallback(() => {
    chartRef.current?.reset();
    setDisplayPrice(PRICE.MIN);
    setPhase('climb');
    lastUpdateTimeRef.current = 0;
    lastIntensityEmitRef.current = 0;
    smoothedIntensityRef.current = 0;
    emitReset();
  }, []);

  return (
    <>
      <div className="money-header">
        <h3 className="money-title">AI Company</h3>
        <div className="money-price">
          $
          {OdometerComponent ? (
            <OdometerComponent value={Math.round(Math.abs(displayPrice))} format="(,ddd)" />
          ) : (
            <span>{Math.round(Math.abs(displayPrice)).toLocaleString('en-US')}</span>
          )}
        </div>
      </div>
      {phase === 'done' && (
        <Button onClick={handleReset} className="money-reset-button" aria-label="Reset chart">
          Reset
        </Button>
      )}
      <StonksChart
        ref={chartRef}
        onPriceChange={handlePriceChange}
        onPhaseChange={handlePhaseChange}
      />
    </>
  );
}

export default StonksChartWithPrice;
