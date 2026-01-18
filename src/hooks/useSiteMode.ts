import { useEffect, useState } from 'react';

import { emitModeChange, subscribeToModeChange } from '../lib/siteModeEvents';

const VALID_MODES = ['vacation', 'coder', 'preview', 'fire', 'money', 'matrix'] as const;
export type SiteMode = (typeof VALID_MODES)[number];

const STORAGE_KEY = 'carterdea-site-mode';
const MODE_CLASS_PREFIX = 'mode-';

function isValidMode(value: string): value is SiteMode {
  return VALID_MODES.includes(value as SiteMode);
}

function getStoredMode(): SiteMode | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored && isValidMode(stored) ? stored : null;
}

function applyModeToBody(mode: SiteMode | null): void {
  if (typeof document === 'undefined') return;

  document.body.classList.forEach((cls) => {
    if (cls.startsWith(MODE_CLASS_PREFIX)) {
      document.body.classList.remove(cls);
    }
  });

  if (mode) {
    document.body.classList.add(`${MODE_CLASS_PREFIX}${mode}`);
  }
}

export function useSiteMode(): [SiteMode | null, (mode: SiteMode | null) => void] {
  const [mode, setModeState] = useState<SiteMode | null>(null);

  useEffect(() => {
    const stored = getStoredMode();
    setModeState(stored);
    applyModeToBody(stored);

    return subscribeToModeChange((newMode) => {
      setModeState(newMode);
      applyModeToBody(newMode);
    });
  }, []);

  function setMode(newMode: SiteMode | null): void {
    setModeState(newMode);
    applyModeToBody(newMode);
    emitModeChange(newMode);

    if (newMode) {
      localStorage.setItem(STORAGE_KEY, newMode);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  }

  return [mode, setMode];
}
