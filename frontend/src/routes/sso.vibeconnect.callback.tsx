import React, { useEffect, useState } from 'react';
import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useAuth, getAccessToken, AuthUser } from '@/lib/auth';

export const Route = createFileRoute('/sso/vibeconnect/callback')({
  validateSearch: (search: Record<string, unknown>) => {
    const rawCode = search.code;
    return {
      code: typeof rawCode === 'string' ? rawCode : Array.isArray(rawCode) && typeof rawCode[0] === 'string' ? rawCode[0] : undefined,
    };
  },
  head: () => ({ meta: [{ title: 'Authenticating VibeConnect Launch — LMS' }] }),
  component: VibeConnectCallbackPage,
});

// Module-level deduplication to protect against React StrictMode double-mounts
// and concurrent re-renders with the same one-time launch grant code.
const inFlightGrantRequests = new Map<string, Promise<AuthUser>>();
const completedGrantCodes = new Set<string>();

export function VibeConnectCallbackPage() {
  const search = Route.useSearch();
  const code = search.code;
  const navigate = useNavigate();
  const { loginWithVibeConnectGrant } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [referenceId, setReferenceId] = useState<string | null>(null);

  useEffect(() => {
    // 1. Scrub code from the browser URL address bar immediately
    if (typeof window !== 'undefined' && window.history && window.location.search) {
      const cleanUrl = window.location.pathname;
      window.history.replaceState({}, document.title, cleanUrl);
    }

    // 2. Missing code check: if session is already active, proceed directly to dashboard
    if (!code) {
      if (getAccessToken()) {
        navigate({ to: '/dashboard' });
        return;
      }
      setError('Missing launch grant code. Please launch LMS from VibeConnect.');
      return;
    }

    // 3. Already completed code in this session: navigate directly
    if (completedGrantCodes.has(code)) {
      navigate({ to: '/dashboard' });
      return;
    }

    // 4. Coordinate in-flight request to ensure single atomic code exchange
    let exchangePromise = inFlightGrantRequests.get(code);
    if (!exchangePromise) {
      exchangePromise = loginWithVibeConnectGrant(code)
        .then((user) => {
          completedGrantCodes.add(code);
          return user;
        })
        .finally(() => {
          inFlightGrantRequests.delete(code);
        });
      inFlightGrantRequests.set(code, exchangePromise);
    }

    exchangePromise
      .then((user) => {
        // Successfully established session; navigate strictly based on real LMS user role
        // Tenant administrators navigate to /org-admin. Never send tenant users to super-admin console.
        if (user?.is_platform_super_admin) {
          navigate({ to: '/super-admin/dashboard' });
        } else if (user?.role?.is_admin_role) {
          navigate({ to: '/org-admin' });
        } else {
          navigate({ to: '/dashboard' });
        }
      })
      .catch((err: any) => {
        // If a valid session is already active, ignore redundant failure
        if (getAccessToken() || completedGrantCodes.has(code)) {
          navigate({ to: '/dashboard' });
          return;
        }
        setError(err.message || 'Launch grant exchange failed. Please try again.');
        if (err.referenceId) {
          setReferenceId(err.referenceId);
        }
      });
  }, [code, loginWithVibeConnectGrant, navigate]);

  if (error) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 p-6 text-center text-white">
        <div className="max-w-md w-full p-8 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl space-y-6">
          <div className="size-16 rounded-2xl bg-red-500/15 border border-red-500/30 text-red-400 mx-auto grid place-items-center">
            <svg className="size-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black tracking-tight text-white">VibeConnect Launch Failed</h2>
            <p className="text-sm font-medium text-slate-300">{error}</p>
            {referenceId && (
              <p className="text-xs font-mono text-slate-500 pt-1">
                Ref: {referenceId}
              </p>
            )}
          </div>
          <button
            onClick={() => {
              navigate({ to: '/login' });
            }}
            className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold rounded-xl text-sm transition-all"
          >
            Go to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-slate-950 p-6 text-center text-white">
      <div className="space-y-4 max-w-sm w-full mx-auto">
        <div className="relative size-16 mx-auto">
          <div className="absolute inset-0 rounded-full border-4 border-indigo-500/20 animate-pulse" />
          <div className="absolute inset-0 rounded-full border-4 border-t-indigo-500 border-r-transparent border-b-transparent border-l-transparent animate-spin" />
        </div>
        <div className="space-y-1">
          <h2 className="text-lg font-bold text-white tracking-tight">Authenticating with VibeConnect</h2>
          <p className="text-xs font-medium text-slate-400">Verifying launch grant and establishing session...</p>
        </div>
      </div>
    </div>
  );
}
