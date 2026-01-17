import { useState, useEffect } from 'react';

export type SiteMode = 'vacation' | 'coder' | 'preview' | 'fire' | 'money' | 'matrix';

const STORAGE_KEY = 'carterdea-site-mode';
const MODE_CLASS_PREFIX = 'mode-';

function getStoredMode(): SiteMode | null {
  if (typeof window === 'undefined') return null;
  const stored = localStorage.getItem(STORAGE_KEY);
  if (stored && isValidMode(stored)) {
    return stored as SiteMode;
  }
  return null;
}

function isValidMode(value: string): value is SiteMode {
  return ['vacation', 'coder', 'preview', 'fire', 'money', 'matrix'].includes(value);
}

function applyModeToBody(mode: SiteMode | null) {
  if (typeof document === 'undefined') return;

  // Remove all mode classes
  document.body.classList.forEach((cls) => {
    if (cls.startsWith(MODE_CLASS_PREFIX)) {
      document.body.classList.remove(cls);
    }
  });

  // Add new mode class if set
  if (mode) {
    document.body.classList.add(`${MODE_CLASS_PREFIX}${mode}`);
  }
}

export function useSiteMode(): [SiteMode | null, (mode: SiteMode | null) => void] {
  const [mode, setModeState] = useState<SiteMode | null>(null);

  // Initialize from localStorage on mount
  useEffect(() => {
    const stored = getStoredMode();
    setModeState(stored);
    applyModeToBody(stored);
  }, []);

  const setMode = (newMode: SiteMode | null) => {
    setModeState(newMode);
    applyModeToBody(newMode);

    if (newMode) {
      localStorage.setItem(STORAGE_KEY, newMode);
    } else {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  return [mode, setMode];
}
