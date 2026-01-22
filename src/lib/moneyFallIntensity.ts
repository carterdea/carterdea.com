export type Phase = 'climb' | 'crash' | 'done';

export function emitIntensity(intensity: number): void {
  window.dispatchEvent(
    new CustomEvent('moneyfall:intensity', {
      detail: Math.max(0, Math.min(1, intensity)),
    })
  );
}

export function emitReset(): void {
  window.dispatchEvent(new CustomEvent('moneyfall:reset'));
}

export function emitPhase(phase: Phase): void {
  window.dispatchEvent(new CustomEvent('moneyfall:phase', { detail: phase }));
}

export function subscribeToIntensity(callback: (intensity: number) => void): () => void {
  const handler = (e: Event) => callback((e as CustomEvent<number>).detail);
  window.addEventListener('moneyfall:intensity', handler);
  return () => window.removeEventListener('moneyfall:intensity', handler);
}

export function subscribeToReset(callback: () => void): () => void {
  window.addEventListener('moneyfall:reset', callback);
  return () => window.removeEventListener('moneyfall:reset', callback);
}

export function subscribeToPhase(callback: (phase: Phase) => void): () => void {
  const handler = (e: Event) => callback((e as CustomEvent<Phase>).detail);
  window.addEventListener('moneyfall:phase', handler);
  return () => window.removeEventListener('moneyfall:phase', handler);
}
