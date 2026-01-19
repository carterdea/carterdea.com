import { useCallback, useEffect, useRef, useState } from 'react';
import { emitIntensity, emitPhase, emitReset } from '../../lib/moneyFallIntensity';
import Button from '../ui/Button';
import { StonksChart, type StonksChartHandle } from './StonksChart';

// Exponential price mapping: internal 0-200 → display $100 to ~$100T
// Chart's targetPeak averages ~200 (100 + random*200), so INTERNAL_MAX = 200
const MIN_PRICE = 100;
const MAX_PRICE = 100_000_000_000_000;
const INTERNAL_MAX = 200;

function internalToDisplayPrice(internal: number): number {
  if (internal <= 0) return MIN_PRICE;
  const t = Math.min(internal / INTERNAL_MAX, 1);
  const ratio = MAX_PRICE / MIN_PRICE;
  return MIN_PRICE * ratio ** t;
}

// Throttle updates for odometer during climb (slower for dramatic effect)
const CLIMB_THROTTLE_MIN_MS = 550;
const CLIMB_THROTTLE_MAX_MS = 900;

// Throttle updates during crash (fast so odometer plummets with chart)
const CRASH_THROTTLE_MS = 50;

// Throttle intensity updates (~15fps is enough for visual perception)
const INTENSITY_INTERVAL_MS = 66;

export function StonksChartWithPrice() {
  const [displayPrice, setDisplayPrice] = useState(MIN_PRICE);
  const [phase, setPhase] = useState<'climb' | 'crash' | 'done'>('climb');
  const [OdometerComponent, setOdometerComponent] = useState<React.ComponentType<{ value: number; format?: string }> | null>(null);
  const lastUpdateTimeRef = useRef(0);
  const nextIntervalRef = useRef(CLIMB_THROTTLE_MIN_MS);
  const lastIntensityEmitRef = useRef(0);
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
    if (now - lastIntensityEmitRef.current >= INTENSITY_INTERVAL_MS) {
      emitIntensity(progress);
      lastIntensityEmitRef.current = now;
    }

    // Don't update display price after crash is done
    if (currentPhase === 'done') return;

    // Different throttle for climb vs crash
    const throttleMs = currentPhase === 'crash'
      ? CRASH_THROTTLE_MS
      : nextIntervalRef.current;

    if (timeSinceLastUpdate >= throttleMs) {
      lastUpdateTimeRef.current = now;
      // Only randomize interval during climb
      if (currentPhase === 'climb') {
        nextIntervalRef.current = CLIMB_THROTTLE_MIN_MS + Math.random() * (CLIMB_THROTTLE_MAX_MS - CLIMB_THROTTLE_MIN_MS);
      }
      setDisplayPrice(internalToDisplayPrice(newPrice));
    }
  }, []);

  const handlePhaseChange = useCallback((newPhase: 'climb' | 'crash' | 'done') => {
    setPhase(newPhase);
    emitPhase(newPhase); // Notify MoneyFall of phase change
  }, []);

  const handleReset = useCallback(() => {
    chartRef.current?.reset();
    setDisplayPrice(MIN_PRICE);
    setPhase('climb'); // Reset phase so animation restarts
    lastUpdateTimeRef.current = 0;
    lastIntensityEmitRef.current = 0;
    emitReset(); // Reset MoneyFall state
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
        <Button
          onClick={handleReset}
          className="reset-button"
          aria-label="Reset chart"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            width="14"
            height="14"
            aria-hidden="true"
            style={{ marginRight: 6 }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.992 0 3.181 3.183a8.25 8.25 0 0 0 13.803-3.7M4.031 9.865a8.25 8.25 0 0 1 13.803-3.7l3.181 3.182m0-4.991v4.99"
            />
          </svg>
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
