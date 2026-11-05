// Theme Management Utility (Dark Mode & Sky Pixel Gamer Light Mode)
export type AppTheme = 'dark' | 'light';

const THEME_STORAGE_KEY = 'storeadv_theme';
const THEME_EVENT = 'storeadv_theme_change';

export function getInitialTheme(): AppTheme {
  try {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'light' || saved === 'dark') {
      return saved;
    }
  } catch {
    // ignore
  }
  return 'dark'; // Default to dark arcade
}

export function applyThemeToDOM(theme: AppTheme): void {
  try {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);
    if (theme === 'light') {
      root.classList.add('light-theme');
      root.classList.remove('dark-theme');
    } else {
      root.classList.add('dark-theme');
      root.classList.remove('light-theme');
    }
  } catch {
    // ignore
  }
}

export function saveTheme(theme: AppTheme): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
    applyThemeToDOM(theme);
    window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { theme } }));
  } catch {
    // ignore
  }
}

export function subscribeToTheme(callback: (theme: AppTheme) => void): () => void {
  const handler = (e: Event) => {
    const custom = e as CustomEvent<{ theme: AppTheme }>;
    if (custom.detail?.theme) {
      callback(custom.detail.theme);
    }
  };
  window.addEventListener(THEME_EVENT, handler);
  return () => window.removeEventListener(THEME_EVENT, handler);
}

import { useState, useEffect } from 'react';

export function useTheme(): [AppTheme, () => void] {
  const [theme, setTheme] = useState<AppTheme>(getInitialTheme);

  useEffect(() => {
    applyThemeToDOM(theme);
    const unsub = subscribeToTheme((t) => {
      setTheme(t);
      applyThemeToDOM(t);
    });
    return unsub;
  }, []);

  const toggle = () => {
    const next = theme === 'dark' ? 'light' : 'dark';
    setTheme(next);
    saveTheme(next);
  };

  return [theme, toggle];
}

