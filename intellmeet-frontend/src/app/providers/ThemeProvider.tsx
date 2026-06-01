import * as React from 'react';

type Theme = 'light' | 'dark' | 'system';

interface ThemeProviderProps {
  children: React.ReactNode;
}

export const ThemeProvider: React.FC<ThemeProviderProps> = ({ children }) => {
  React.useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark');

    const theme = (localStorage.getItem('theme') as Theme) || 'system';

    if (theme === 'system') {
      const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches
        ? 'dark'
        : 'light';
      root.classList.add(systemTheme);
    } else {
      root.classList.add(theme);
    }
  }, []);

  return <>{children}</>;
};
