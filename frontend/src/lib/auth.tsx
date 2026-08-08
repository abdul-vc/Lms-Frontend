/**
 * auth.tsx — Real JWT authentication for Halyard Learn.
 *
 * Provides:
 *   - login() / logout()
 *   - authFetch() wrapper (attaches Bearer, retries once on 401)
 *   - fetchMe() to load the full user object
 *   - AuthProvider React context + useAuth() hook
 */

import React, { createContext, useContext, useEffect, useState } from 'react';

export const getApiBase = (): string => {
  const envUrl = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_API_URL : undefined;
  if (!envUrl) {
    throw new Error('VITE_API_URL environment variable is missing. Please configure VITE_API_URL in your environment.');
  }
  return envUrl.replace(/\/$/, '');
};

export const API_BASE = getApiBase();

export const getBackendBase = (): string => {
  const envUrl = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env.VITE_BACKEND_URL : undefined;
  if (envUrl) {
    return envUrl.replace(/\/$/, '');
  }
  return API_BASE.replace(/\/api\/?$/, '');
};

export const BACKEND_BASE = getBackendBase();

export function normalizeUrl(url: string): string {
  if (url.startsWith('/api/')) {
    return `${BACKEND_BASE}${url}`;
  }
  return url;
}


// ─── Types ────────────────────────────────────────────────────────────────────

export interface AuthRole {
  id: number;
  name: string;
  is_default: boolean;
  is_admin_role: boolean;

  can_view_users?: boolean;
  can_create_users?: boolean;
  can_edit_users?: boolean;
  can_delete_users?: boolean;

  can_view_roles?: boolean;
  can_create_roles?: boolean;
  can_edit_roles?: boolean;
  can_delete_roles?: boolean;

  can_view_courses?: boolean;
  can_create_courses?: boolean;
  can_edit_courses?: boolean;
  can_delete_courses?: boolean;

  can_view_certificates?: boolean;
  can_create_certificates?: boolean;
  can_edit_certificates?: boolean;
  can_delete_certificates?: boolean;

  can_view_reports?: boolean;
  can_create_reports?: boolean;
  can_edit_reports?: boolean;
  can_delete_reports?: boolean;

  can_view_module_access?: boolean;
  can_create_module_access?: boolean;
  can_edit_module_access?: boolean;
  can_delete_module_access?: boolean;

  can_view_activity_log?: boolean;
  can_create_activity_log?: boolean;
  can_edit_activity_log?: boolean;
  can_delete_activity_log?: boolean;

  can_manage_users?: boolean;
  can_manage_departments?: boolean;
  can_manage_roles?: boolean;
  can_publish_courses?: boolean;
  can_manage_module_access?: boolean;
  can_manage_certificates?: boolean;
}

export interface AuthOrganization {
  id: number;
  name: string;
  logo_url?: string | null;
  primary_color?: string | null;
}

export interface AuthDepartment {
  id: number;
  name: string;
}

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  first_name: string;
  last_name: string;
  full_name: string;
  avatar_initials: string;
  is_platform_super_admin: boolean;
  organization: AuthOrganization | null;
  department: AuthDepartment | null;
  role: AuthRole | null;
  bio: string | null;
  profile_picture: string | null;
  // Gamification
  job_title: string;
  region: string;
  points: number;
  streak_days: number;
  level: number;
  badges: string[];
  theme_preference?: 'light' | 'dark';
}

// ─── Token storage (localStorage) ────────────────────────────────────────────

const KEYS = { access: 'halyard_access', refresh: 'halyard_refresh' } as const;

export function getAccessToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem(KEYS.access) : null;
}

function getRefreshToken(): string | null {
  return typeof window !== 'undefined' ? localStorage.getItem(KEYS.refresh) : null;
}

function saveTokens(access: string, refresh: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem(KEYS.access, access);
    localStorage.setItem(KEYS.refresh, refresh);
  }
}

function clearTokens() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(KEYS.access);
    localStorage.removeItem(KEYS.refresh);
  }
}

// ─── Token refresh ─────────────────────────────────────────────────────────

async function refreshTokens(): Promise<string | null> {
  const refresh = getRefreshToken();
  if (!refresh) return null;
  try {
    const res = await fetch(`${API_BASE}/users/auth/refresh/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refresh }),
    });
    if (!res.ok) { clearTokens(); return null; }
    const data = await res.json();
    saveTokens(data.access, data.refresh ?? refresh);
    return data.access;
  } catch {
    clearTokens();
    return null;
  }
}

// ─── Account Frozen Interceptor & Global Screen ────────────────────────────

let triggerFrozenHandler: (() => void) | null = null;

export function handleFrozenAccount() {
  clearTokens();
  if (triggerFrozenHandler) triggerFrozenHandler();
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('account_frozen'));
  }
}

// ─── authFetch ────────────────────────────────────────────────────────────────
// Attaches Authorization header; retries once after refreshing on 401.

export async function authFetch(url: string, opts: RequestInit = {}): Promise<Response> {
  const normalizedUrl = normalizeUrl(url);
  const token = getAccessToken();
  const headers = new Headers(opts.headers ?? {});
  if (token) headers.set('Authorization', `Bearer ${token}`);

  const res = await fetch(normalizedUrl, { ...opts, headers });

  if (res.status === 403 || res.status === 401) {
    const clone = res.clone();
    try {
      const data = await clone.json();
      if (data?.error === 'account_frozen' || data?.detail?.error === 'account_frozen') {
        handleFrozenAccount();
        throw new Error('Kindly contact admin for assistance.');
      }
    } catch (e: any) {
      if (e?.message === 'Kindly contact admin for assistance.') throw e;
    }
  }

  if (res.status === 401) {
    const newToken = await refreshTokens();
    if (!newToken) {
      clearTokens();
      if (typeof window !== 'undefined' && !window.location.pathname.startsWith('/login')) {
        window.location.href = '/login?expired=true';
      }
      throw new Error('Session expired. Please log in again.');
    }
    headers.set('Authorization', `Bearer ${newToken}`);
    const retryRes = await fetch(normalizedUrl, { ...opts, headers });
    if (retryRes.status === 403 || retryRes.status === 401) {
      const retryClone = retryRes.clone();
      try {
        const data = await retryClone.json();
        if (data?.error === 'account_frozen' || data?.detail?.error === 'account_frozen') {
          handleFrozenAccount();
          throw new Error('Kindly contact admin for assistance.');
        }
      } catch (e: any) {
        if (e?.message === 'Kindly contact admin for assistance.') throw e;
      }
    }
    return retryRes;
  }

  return res;
}

// ─── login / logout / fetchMe ─────────────────────────────────────────────────

export async function login(username: string, password: string): Promise<AuthUser> {
  const res = await fetch(`${API_BASE}/users/auth/login/`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username, password }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    if (body?.error === 'account_frozen' || body?.detail?.error === 'account_frozen' || res.status === 403) {
      handleFrozenAccount();
      throw new Error('Kindly contact admin for assistance.');
    }
    throw new Error(body.detail?.message || body.detail || 'Invalid credentials. Please try again.');
  }

  const data = await res.json();
  saveTokens(data.access, data.refresh);
  return fetchMe();
}

export async function fetchMe(): Promise<AuthUser> {
  const res = await authFetch(`${API_BASE}/users/auth/me/`);
  if (!res.ok) {
    const clone = res.clone();
    const data = await clone.json().catch(() => ({}));
    if (data?.error === 'account_frozen' || data?.detail?.error === 'account_frozen') {
      handleFrozenAccount();
      throw new Error('Kindly contact admin for assistance.');
    }
    throw new Error('Could not load user profile.');
  }
  return res.json();
}

export function logout() {
  clearTokens();
}

// ─── React Auth Context ───────────────────────────────────────────────────────

interface AuthContextValue {
  user: AuthUser | null;
  isLoading: boolean;
  isAccountFrozen: boolean;
  login: (username: string, password: string) => Promise<AuthUser>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccountFrozen, setIsAccountFrozen] = useState(false);

  useEffect(() => {
    triggerFrozenHandler = () => {
      setIsAccountFrozen(true);
      setUser(null);
    };

    const onFrozen = () => {
      setIsAccountFrozen(true);
      setUser(null);
    };
    if (typeof window !== 'undefined') {
      window.addEventListener('account_frozen', onFrozen);
    }

    // On mount: try to restore session from sessionStorage/localStorage tokens
    const token = getAccessToken();
    if (!token) { setIsLoading(false); return; }

    fetchMe()
      .then(setUser)
      .catch((err) => {
        if (err?.message === 'Kindly contact admin for assistance.') {
          setIsAccountFrozen(true);
          return;
        }
        refreshTokens().then(newToken => {
          if (!newToken) { setIsLoading(false); return; }
          return fetchMe().then(setUser);
        }).finally(() => setIsLoading(false));
      })
      .finally(() => setIsLoading(false));

    return () => {
      triggerFrozenHandler = null;
      if (typeof window !== 'undefined') {
        window.removeEventListener('account_frozen', onFrozen);
      }
    };
  }, []);

  const handleLogin = async (username: string, password: string): Promise<AuthUser> => {
    try {
      const u = await login(username, password);
      setUser(u);
      setIsAccountFrozen(false);
      return u;
    } catch (err: any) {
      if (err?.message === 'Kindly contact admin for assistance.') {
        setIsAccountFrozen(true);
      }
      throw err;
    }
  };

  const handleLogout = () => {
    logout();
    setUser(null);
    setIsAccountFrozen(false);
  };

  const refreshUser = async () => {
    const u = await fetchMe();
    setUser(u);
  };

  if (isAccountFrozen) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 p-6 text-center text-white">
        <div className="max-w-md w-full p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl space-y-6">
          <div className="size-16 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 mx-auto grid place-items-center">
            <svg className="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight text-white">Account Inactive / Frozen</h2>
            <p className="text-base font-bold text-amber-400">Kindly contact admin for assistance.</p>
            <p className="text-xs text-slate-400 font-medium">Your organization or user account is currently deactivated by platform administration.</p>
          </div>
          <button
            onClick={() => {
              setIsAccountFrozen(false);
              clearTokens();
              if (typeof window !== 'undefined') window.location.href = '/login';
            }}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-sm transition-all"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return React.createElement(
    AuthContext.Provider,
    { value: { user, isLoading, isAccountFrozen, login: handleLogin, logout: handleLogout, refreshUser } },
    children
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
