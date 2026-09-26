'use client'

import { createContext, useContext, useState, useCallback } from 'react';

type Theme = 'light' | 'dark' | 'system';
type ThemeState = { theme: Theme; setTheme: (theme: Theme) => void; resolvedTheme: 'light' | 'dark' };

const ThemeContext = createContext<ThemeState>({
  theme: 'system',
  setTheme: () => {},
  resolvedTheme: 'light',
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark'>('light');

  const handleSetTheme = useCallback((newTheme: Theme) => {
    setTheme(newTheme);
    const resolved = newTheme === 'system'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : newTheme;
    setResolvedTheme(resolved);
    document.documentElement.classList.toggle('dark', resolved === 'dark');
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme: handleSetTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
