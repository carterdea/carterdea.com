// Cross-island communication for MoneyFall intensity via CustomEvents

const EVENT_NAME = 'moneyfall:intensity';
const RESET_EVENT_NAME = 'moneyfall:reset';
const PHASE_EVENT_NAME = 'moneyfall:phase';

export function emitIntensity(intensity: number) {
  const event = new CustomEvent(EVENT_NAME, {
    detail: Math.max(0, Math.min(1, intensity)),
  });
  window.dispatchEvent(event);
}

export function emitReset() {
  window.dispatchEvent(new CustomEvent(RESET_EVENT_NAME));
}

export function emitPhase(phase: 'climb' | 'crash' | 'done') {
  window.dispatchEvent(new CustomEvent(PHASE_EVENT_NAME, { detail: phase }));
}

export function subscribeToIntensity(callback: (intensity: number) => void): () => void {
  const handler = (e: Event) => {
    callback((e as CustomEvent<number>).detail);
  };
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}

export function subscribeToReset(callback: () => void): () => void {
  window.addEventListener(RESET_EVENT_NAME, callback);
  return () => window.removeEventListener(RESET_EVENT_NAME, callback);
}

export function subscribeToPhase(callback: (phase: 'climb' | 'crash' | 'done') => void): () => void {
  const handler = (e: Event) => {
    callback((e as CustomEvent<'climb' | 'crash' | 'done'>).detail);
  };
  window.addEventListener(PHASE_EVENT_NAME, handler);
  return () => window.removeEventListener(PHASE_EVENT_NAME, handler);
}
