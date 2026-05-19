'use client';

import { createContext, useCallback, useContext, useLayoutEffect, useMemo, useRef, useState } from 'react';

export type ColorScheme = 'dark' | 'light';

const STORAGE_KEY = 'fleetos-color-scheme';

function readStored(): ColorScheme {
  if (typeof window === 'undefined') return 'dark';
  const v = localStorage.getItem(STORAGE_KEY);
  return v === 'light' ? 'light' : 'dark';
}

type ThemeContextValue = {
  theme: ColorScheme;
  setTheme: (t: ColorScheme) => void;
  toggleTheme: () => void;
};

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ColorScheme>('dark');
  const didSyncFromStorage = useRef(false);

  useLayoutEffect(() => {
    if (!didSyncFromStorage.current) {
      didSyncFromStorage.current = true;
      const s = readStored();
      setThemeState(s);
      document.documentElement.setAttribute('data-theme', s);
      return;
    }
    document.documentElement.setAttribute('data-theme', theme);
    try {
      localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* ignore */
    }
  }, [theme]);

  const setTheme = useCallback((t: ColorScheme) => {
    setThemeState(t);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'));
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, toggleTheme }),
    [theme, setTheme, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
