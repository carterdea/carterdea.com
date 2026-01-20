// Cross-island communication for MoneyFall intensity via CustomEvents

export type Phase = 'climb' | 'crash' | 'done';

const EVENTS = {
  INTENSITY: 'moneyfall:intensity',
  RESET: 'moneyfall:reset',
  PHASE: 'moneyfall:phase',
} as const;

function emit<T>(eventName: string, detail?: T): void {
  window.dispatchEvent(new CustomEvent(eventName, { detail }));
}

function subscribe<T>(eventName: string, callback: (detail: T) => void): () => void {
  const handler = (e: Event) => callback((e as CustomEvent<T>).detail);
  window.addEventListener(eventName, handler);
  return () => window.removeEventListener(eventName, handler);
}

export function emitIntensity(intensity: number): void {
  emit(EVENTS.INTENSITY, Math.max(0, Math.min(1, intensity)));
}

export function emitReset(): void {
  emit(EVENTS.RESET);
}

export function emitPhase(phase: Phase): void {
  emit(EVENTS.PHASE, phase);
}

export function subscribeToIntensity(callback: (intensity: number) => void): () => void {
  return subscribe<number>(EVENTS.INTENSITY, callback);
}

export function subscribeToReset(callback: () => void): () => void {
  window.addEventListener(EVENTS.RESET, callback);
  return () => window.removeEventListener(EVENTS.RESET, callback);
}

export function subscribeToPhase(callback: (phase: Phase) => void): () => void {
  return subscribe<Phase>(EVENTS.PHASE, callback);
}
