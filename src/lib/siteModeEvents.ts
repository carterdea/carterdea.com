import type { SiteMode } from '../hooks/useSiteMode';

const EVENT_NAME = 'sitemode:change';

export function emitModeChange(mode: SiteMode | null) {
  window.dispatchEvent(new CustomEvent(EVENT_NAME, { detail: mode }));
}

export function subscribeToModeChange(
  callback: (mode: SiteMode | null) => void
): () => void {
  const handler = (e: Event) => {
    callback((e as CustomEvent<SiteMode | null>).detail);
  };
  window.addEventListener(EVENT_NAME, handler);
  return () => window.removeEventListener(EVENT_NAME, handler);
}
