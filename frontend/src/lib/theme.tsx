import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuth, authFetch, API_BASE } from './auth';

export type Theme = 'light' | 'dark';

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function applyThemeToDOM(theme: Theme) {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (theme === 'light') {
    root.classList.remove('dark', 'theme-dark');
    root.classList.add('light', 'theme-light');
  } else {
    root.classList.remove('light', 'theme-light');
    root.classList.add('dark', 'theme-dark');
  }
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('halyard_active_theme');
      if (stored === 'light' || stored === 'dark') {
        return stored;
      }
    }
    return 'dark';
  });

  useEffect(() => {
    if (user && user.theme_preference) {
      const serverTheme = user.theme_preference === 'light' ? 'light' : 'dark';
      setThemeState(serverTheme);
      applyThemeToDOM(serverTheme);
      if (typeof window !== 'undefined') {
        localStorage.setItem(`halyard_theme_${user.id}`, serverTheme);
        localStorage.setItem('halyard_active_theme', serverTheme);
      }
    } else {
      applyThemeToDOM(theme);
    }
  }, [user?.id, user?.theme_preference]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    applyThemeToDOM(newTheme);
    if (typeof window !== 'undefined') {
      if (user?.id) {
        localStorage.setItem(`halyard_theme_${user.id}`, newTheme);
      }
      localStorage.setItem('halyard_active_theme', newTheme);
    }

    if (user) {
      authFetch(`${API_BASE}/users/auth/theme/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme_preference: newTheme }),
      }).catch(err => {
        console.error('Failed to persist theme preference:', err);
      });
    }
  };

  const toggleTheme = () => {
    setTheme(theme === 'dark' ? 'light' : 'dark');
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used within ThemeProvider');
  }
  return ctx;
}
