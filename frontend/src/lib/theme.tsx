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

function hexToHsl(hex: string): { h: number; s: number; l: number } | null {
  const clean = hex.replace('#', '').trim();
  let r = 0, g = 0, b = 0;
  if (clean.length === 3) {
    r = parseInt(clean[0] + clean[0], 16) / 255;
    g = parseInt(clean[1] + clean[1], 16) / 255;
    b = parseInt(clean[2] + clean[2], 16) / 255;
  } else if (clean.length === 6) {
    r = parseInt(clean.slice(0, 2), 16) / 255;
    g = parseInt(clean.slice(2, 4), 16) / 255;
    b = parseInt(clean.slice(4, 6), 16) / 255;
  } else {
    return null;
  }
  if (isNaN(r) || isNaN(g) || isNaN(b)) return null;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let h = 0;
  let s = 0;
  const l = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r:
        h = (g - b) / d + (g < b ? 6 : 0);
        break;
      case g:
        h = (b - r) / d + 2;
        break;
      case b:
        h = (r - g) / d + 4;
        break;
    }
    h *= 60;
  }

  return {
    h: Math.round(h),
    s: Math.round(s * 100),
    l: Math.round(l * 100),
  };
}

const ALL_THEME_CSS_VARIABLES = [
  '--brand',
  '--brand-deep',
  '--brand-light',
  '--brand-foreground',
  '--primary',
  '--primary-foreground',
  '--accent',
  '--accent-foreground',
  '--accent-warm',
  '--background',
  '--surface',
  '--ui-bg',
  '--card',
  '--card-foreground',
  '--popover',
  '--popover-foreground',
  '--secondary',
  '--secondary-foreground',
  '--muted',
  '--muted-foreground',
  '--border',
  '--input',
  '--ring',
  '--sidebar',
  '--sidebar-foreground',
  '--sidebar-primary',
  '--sidebar-primary-foreground',
  '--sidebar-accent',
  '--sidebar-accent-foreground',
  '--sidebar-border',
  '--sidebar-ring',
  '--bg-page',
  '--bg-card',
  '--border-card',
  '--text-primary',
  '--text-secondary',
  '--bg-table-header',
  '--hover-row',
  '--bg-shell-header',
  '--border-shell',
  '--bg-input',
  '--border-input',
  '--text-input',
  '--placeholder-input',
  '--pill-active-bg',
  '--pill-active-border',
  '--pill-active-text',
  '--focus-ring',
  '--chart-1',
  '--chart-2',
  '--chart-3',
  '--chart-4',
  '--chart-5',
];

export function applyBrandColorToDOM(color: string | null | undefined, theme: Theme = 'dark') {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;

  if (!color || !/^#([0-9A-Fa-f]{3}){1,2}$/.test(color.trim())) {
    ALL_THEME_CSS_VARIABLES.forEach((prop) => root.style.removeProperty(prop));
    return;
  }

  const hsl = hexToHsl(color.trim());
  if (!hsl) {
    ALL_THEME_CSS_VARIABLES.forEach((prop) => root.style.removeProperty(prop));
    return;
  }

  const H = hsl.h;
  const S = Math.max(30, Math.min(hsl.s, 95));
  const L = hsl.l;

  if (theme === 'light') {
    const brand = `hsl(${H}, ${Math.min(S, 85)}%, ${Math.max(35, Math.min(L, 50))}%)`;
    const brandDeep = `hsl(${H}, ${Math.min(S + 10, 95)}%, ${Math.max(22, L - 18)}%)`;
    const brandLight = `hsl(${H}, ${Math.min(S, 45)}%, 96%)`;

    root.style.setProperty('--brand', brand);
    root.style.setProperty('--brand-deep', brandDeep);
    root.style.setProperty('--brand-light', brandLight);
    root.style.setProperty('--brand-foreground', '#ffffff');
    root.style.setProperty('--primary', brand);
    root.style.setProperty('--primary-foreground', '#ffffff');
    root.style.setProperty('--accent', `hsl(${H}, ${Math.min(S * 0.45, 40)}%, 93%)`);
    root.style.setProperty('--accent-foreground', brandDeep);
    root.style.setProperty('--accent-warm', `hsl(${(H + 40) % 360}, 80%, 50%)`);

    root.style.setProperty('--background', `hsl(${H}, ${Math.min(S * 0.15, 12)}%, 99%)`);
    root.style.setProperty('--surface', `hsl(${H}, ${Math.min(S * 0.15, 12)}%, 99%)`);
    root.style.setProperty('--ui-bg', `hsl(${H}, ${Math.min(S * 0.2, 16)}%, 96%)`);
    root.style.setProperty('--card', '#ffffff');
    root.style.setProperty('--card-foreground', `hsl(${H}, 25%, 15%)`);
    root.style.setProperty('--popover', '#ffffff');
    root.style.setProperty('--popover-foreground', `hsl(${H}, 25%, 15%)`);
    root.style.setProperty('--secondary', `hsl(${H}, ${Math.min(S * 0.2, 16)}%, 95%)`);
    root.style.setProperty('--secondary-foreground', `hsl(${H}, 25%, 15%)`);
    root.style.setProperty('--muted', `hsl(${H}, ${Math.min(S * 0.18, 14)}%, 95%)`);
    root.style.setProperty('--muted-foreground', `hsl(${H}, 12%, 46%)`);
    root.style.setProperty('--border', `hsl(${H}, 15%, 89%)`);
    root.style.setProperty('--input', `hsl(${H}, 15%, 87%)`);
    root.style.setProperty('--ring', brand);

    root.style.setProperty('--sidebar', `hsl(${H}, ${Math.min(S * 0.25, 20)}%, 97.5%)`);
    root.style.setProperty('--sidebar-foreground', `hsl(${H}, 25%, 15%)`);
    root.style.setProperty('--sidebar-primary', brand);
    root.style.setProperty('--sidebar-primary-foreground', '#ffffff');
    root.style.setProperty('--sidebar-accent', `hsl(${H}, ${Math.min(S * 0.5, 45)}%, 92%)`);
    root.style.setProperty('--sidebar-accent-foreground', brandDeep);
    root.style.setProperty('--sidebar-border', `hsl(${H}, 15%, 90%)`);
    root.style.setProperty('--sidebar-ring', brand);

    root.style.setProperty('--bg-page', `hsl(${H}, ${Math.min(S * 0.15, 12)}%, 98%)`);
    root.style.setProperty('--bg-card', '#ffffff');
    root.style.setProperty('--border-card', `hsl(${H}, 15%, 89%)`);
    root.style.setProperty('--text-primary', `hsl(${H}, 25%, 12%)`);
    root.style.setProperty('--text-secondary', `hsl(${H}, 12%, 46%)`);
    root.style.setProperty('--bg-table-header', `hsl(${H}, ${Math.min(S * 0.15, 12)}%, 98%)`);
    root.style.setProperty('--hover-row', `hsl(${H}, 30%, 96%)`);
    root.style.setProperty('--bg-shell-header', '#ffffff');
    root.style.setProperty('--border-shell', `hsl(${H}, 15%, 89%)`);
    root.style.setProperty('--bg-input', '#ffffff');
    root.style.setProperty('--border-input', `hsl(${H}, 15%, 82%)`);
    root.style.setProperty('--text-input', `hsl(${H}, 25%, 12%)`);
    root.style.setProperty('--placeholder-input', `hsl(${H}, 10%, 60%)`);

    root.style.setProperty('--pill-active-bg', `hsl(${H}, ${Math.min(S * 0.55, 50)}%, 93%)`);
    root.style.setProperty('--pill-active-border', `hsl(${H}, ${Math.min(S * 0.65, 60)}%, 78%)`);
    root.style.setProperty('--pill-active-text', brandDeep);
    root.style.setProperty('--focus-ring', `0 0 0 3px hsla(${H}, ${S}%, 50%, 0.25)`);

    root.style.setProperty('--chart-1', brand);
    root.style.setProperty('--chart-2', `hsl(${(H + 30) % 360}, ${Math.min(S, 75)}%, 48%)`);
    root.style.setProperty('--chart-3', `hsl(${(H + 60) % 360}, ${Math.min(S, 70)}%, 46%)`);
    root.style.setProperty('--chart-4', `hsl(${(H + 180) % 360}, ${Math.min(S, 65)}%, 50%)`);
    root.style.setProperty('--chart-5', `hsl(${(H + 220) % 360}, ${Math.min(S, 70)}%, 48%)`);
  } else {
    const brand = `hsl(${H}, ${Math.min(S + 10, 88)}%, ${Math.max(55, Math.min(L + 12, 65))}%)`;
    const brandDeep = `hsl(${H}, ${Math.min(S, 80)}%, 48%)`;
    const brandLight = `hsl(${H}, 40%, 14%)`;

    root.style.setProperty('--brand', brand);
    root.style.setProperty('--brand-deep', brandDeep);
    root.style.setProperty('--brand-light', brandLight);
    root.style.setProperty('--brand-foreground', '#ffffff');
    root.style.setProperty('--primary', brand);
    root.style.setProperty('--primary-foreground', '#ffffff');
    root.style.setProperty('--accent', `hsl(${H}, 40%, 15%)`);
    root.style.setProperty('--accent-foreground', `hsl(${H}, 85%, 72%)`);
    root.style.setProperty('--accent-warm', `hsl(${(H + 40) % 360}, 80%, 60%)`);

    root.style.setProperty('--background', `hsl(${H}, 22%, 6%)`);
    root.style.setProperty('--surface', `hsl(${H}, 22%, 6%)`);
    root.style.setProperty('--ui-bg', `hsl(${H}, 18%, 9.5%)`);
    root.style.setProperty('--card', `hsl(${H}, 18%, 9.5%)`);
    root.style.setProperty('--card-foreground', `hsl(${H}, 15%, 96%)`);
    root.style.setProperty('--popover', `hsl(${H}, 18%, 9.5%)`);
    root.style.setProperty('--popover-foreground', `hsl(${H}, 15%, 96%)`);
    root.style.setProperty('--secondary', `hsl(${H}, 15%, 13%)`);
    root.style.setProperty('--secondary-foreground', `hsl(${H}, 15%, 96%)`);
    root.style.setProperty('--muted', `hsl(${H}, 15%, 13%)`);
    root.style.setProperty('--muted-foreground', `hsl(${H}, 10%, 65%)`);
    root.style.setProperty('--border', `hsl(${H}, 15%, 15%)`);
    root.style.setProperty('--input', `hsl(${H}, 15%, 16%)`);
    root.style.setProperty('--ring', brand);

    root.style.setProperty('--sidebar', `hsl(${H}, 20%, 8.5%)`);
    root.style.setProperty('--sidebar-foreground', `hsl(${H}, 15%, 96%)`);
    root.style.setProperty('--sidebar-primary', brand);
    root.style.setProperty('--sidebar-primary-foreground', '#ffffff');
    root.style.setProperty('--sidebar-accent', `hsl(${H}, 40%, 15%)`);
    root.style.setProperty('--sidebar-accent-foreground', `hsl(${H}, 85%, 72%)`);
    root.style.setProperty('--sidebar-border', `hsl(${H}, 15%, 15%)`);
    root.style.setProperty('--sidebar-ring', brand);

    root.style.setProperty('--bg-page', `hsl(${H}, 24%, 4.5%)`);
    root.style.setProperty('--bg-card', `hsla(${H}, 18%, 9.5%, 0.95)`);
    root.style.setProperty('--border-card', `hsl(${H}, 15%, 15%)`);
    root.style.setProperty('--text-primary', '#ffffff');
    root.style.setProperty('--text-secondary', `hsl(${H}, 10%, 65%)`);
    root.style.setProperty('--bg-table-header', `hsl(${H}, 24%, 4.5%)`);
    root.style.setProperty('--hover-row', `hsla(${H}, 30%, 18%, 0.4)`);
    root.style.setProperty('--bg-shell-header', `hsla(${H}, 18%, 9.5%, 0.95)`);
    root.style.setProperty('--border-shell', `hsl(${H}, 15%, 15%)`);
    root.style.setProperty('--bg-input', `hsl(${H}, 24%, 5.5%)`);
    root.style.setProperty('--border-input', `hsl(${H}, 15%, 17%)`);
    root.style.setProperty('--text-input', `hsl(${H}, 15%, 95%)`);
    root.style.setProperty('--placeholder-input', `hsl(${H}, 10%, 50%)`);

    root.style.setProperty('--pill-active-bg', `hsla(${H}, 80%, 60%, 0.15)`);
    root.style.setProperty('--pill-active-border', `hsla(${H}, 80%, 60%, 0.35)`);
    root.style.setProperty('--pill-active-text', `hsl(${H}, 85%, 72%)`);
    root.style.setProperty('--focus-ring', `0 0 0 3px hsla(${H}, ${S}%, 60%, 0.25)`);

    root.style.setProperty('--chart-1', brand);
    root.style.setProperty('--chart-2', `hsl(${(H + 30) % 360}, ${Math.min(S, 80)}%, 62%)`);
    root.style.setProperty('--chart-3', `hsl(${(H + 60) % 360}, ${Math.min(S, 75)}%, 58%)`);
    root.style.setProperty('--chart-4', `hsl(${(H + 180) % 360}, ${Math.min(S, 70)}%, 65%)`);
    root.style.setProperty('--chart-5', `hsl(${(H + 220) % 360}, ${Math.min(S, 75)}%, 60%)`);
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

  // Tenant isolation: Super Admin console keeps standard platform theme. Tenant Org Admins and Users use their organization's theme.
  const isSuperAdmin = Boolean(user?.is_platform_super_admin);
  const orgPrimaryColor = isSuperAdmin ? null : user?.organization?.primary_color;

  useEffect(() => {
    if (user && user.theme_preference) {
      const serverTheme = user.theme_preference === 'light' ? 'light' : 'dark';
      setThemeState(serverTheme);
      applyThemeToDOM(serverTheme);
      applyBrandColorToDOM(orgPrimaryColor, serverTheme);
      if (typeof window !== 'undefined') {
        localStorage.setItem(`halyard_theme_${user.id}`, serverTheme);
        localStorage.setItem('halyard_active_theme', serverTheme);
      }
    } else {
      applyThemeToDOM(theme);
      applyBrandColorToDOM(orgPrimaryColor, theme);
    }
  }, [user?.id, user?.theme_preference, orgPrimaryColor]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    applyThemeToDOM(newTheme);
    applyBrandColorToDOM(orgPrimaryColor, newTheme);
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
