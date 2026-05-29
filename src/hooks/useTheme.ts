import { useEffect, useState } from 'react';

type ThemeOverride = 'dark' | 'light' | null;

const STORAGE_KEY = 'praedictio-theme';
const LIGHT_START = 7;  // 7am
const LIGHT_END = 20;   // 8pm

function getAutoTheme(): 'dark' | 'light' {
  const hour = new Date().getHours();
  return hour >= LIGHT_START && hour < LIGHT_END ? 'light' : 'dark';
}

function applyTheme(theme: 'dark' | 'light') {
  const root = document.documentElement;
  if (theme === 'dark') {
    root.classList.add('dark');
    root.classList.remove('light');
  } else {
    root.classList.add('light');
    root.classList.remove('dark');
  }
}

export function useTheme() {
  const [override, setOverride] = useState<ThemeOverride>(() => {
    return (localStorage.getItem(STORAGE_KEY) as ThemeOverride) ?? null;
  });

  const activeTheme = override ?? getAutoTheme();

  useEffect(() => {
    applyTheme(activeTheme);
  }, [activeTheme]);

  // Re-check auto theme every minute in case hour changes while app is open
  useEffect(() => {
    if (override !== null) return;
    const interval = setInterval(() => {
      applyTheme(getAutoTheme());
    }, 60_000);
    return () => clearInterval(interval);
  }, [override]);

  function toggleTheme() {
    const next = activeTheme === 'dark' ? 'light' : 'dark';
    // If toggling back to what auto would pick, clear the override
    if (next === getAutoTheme()) {
      localStorage.removeItem(STORAGE_KEY);
      setOverride(null);
    } else {
      localStorage.setItem(STORAGE_KEY, next);
      setOverride(next);
    }
  }

  function setTheme(theme: 'dark' | 'light') {
    if (theme === getAutoTheme()) {
      localStorage.removeItem(STORAGE_KEY);
      setOverride(null);
    } else {
      localStorage.setItem(STORAGE_KEY, theme);
      setOverride(theme);
    }
  }

  return { theme: activeTheme, toggleTheme, setTheme };
}