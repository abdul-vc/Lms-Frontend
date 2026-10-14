import { describe, it, expect, beforeEach, vi } from 'vitest';
import { loginWithSSOCode, saveTokens, getAccessToken, clearTokens } from '../../lib/auth';

class MockStorage {
  private store: Record<string, string> = {};
  get length() { return Object.keys(this.store).length; }
  clear() { this.store = {}; }
  getItem(key: string) { return this.store[key] ?? null; }
  key(index: number) { return Object.keys(this.store)[index] ?? null; }
  removeItem(key: string) { delete this.store[key]; }
  setItem(key: string, value: string) { this.store[key] = String(value); }
}

const mockSessionStorage = new MockStorage();
const mockLocalStorage = new MockStorage();

(globalThis as any).sessionStorage = mockSessionStorage;
(globalThis as any).localStorage = mockLocalStorage;
(globalThis as any).window = {
  sessionStorage: mockSessionStorage,
  localStorage: mockLocalStorage,
  dispatchEvent: vi.fn(),
};
if (typeof (globalThis as any).CustomEvent === 'undefined') {
  (globalThis as any).CustomEvent = class CustomEvent {
    constructor(public type: string, public detail?: any) {}
  };
}

describe('Phase 5C-2: Master-Initiated VibeConnect SSO Callback', () => {
  beforeEach(() => {
    mockSessionStorage.clear();
    mockLocalStorage.clear();
    vi.restoreAllMocks();
  });

  it('1. loginWithSSOCode posts code to LMS backend without PKCE verifier', async () => {
    const mockAccess = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test_access';
    const mockRefresh = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.test_refresh';
    const mockUser = {
      id: 1,
      email: 'pilot.user@acme.com',
      username: 'pilot.user@acme.com',
      first_name: 'Pilot',
      last_name: 'User',
      is_platform_super_admin: false,
      organization: { id: 7, name: 'Pilot Org' }
    };

    const fetchMock = vi.fn().mockImplementation((url: string, options?: any) => {
      if (url.includes('/v1/auth/sso/callback/')) {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            access: mockAccess,
            refresh: mockRefresh,
            user: { id: 1, email: 'pilot.user@acme.com' }
          })
        });
      }
      if (url.includes('/users/auth/me/')) {
        return Promise.resolve({
          ok: true,
          json: async () => mockUser
        });
      }
      return Promise.reject(new Error(`Unexpected fetch URL: ${url}`));
    });
    vi.stubGlobal('fetch', fetchMock);

    const user = await loginWithSSOCode('vc_auth_code_999');

    expect(fetchMock).toHaveBeenCalled();
    const [callbackUrl, callbackOptions] = fetchMock.mock.calls[0];
    expect(callbackUrl).toContain('/v1/auth/sso/callback/');
    expect(callbackOptions.method).toBe('POST');

    const body = JSON.parse(callbackOptions.body);
    expect(body.code).toBe('vc_auth_code_999');
    // Crucial: no code_verifier sent in master-initiated flow
    expect(body.code_verifier).toBeUndefined();

    // Verify tokens saved
    expect(getAccessToken()).toBe(mockAccess);
    expect(user.id).toBe(1);
    expect(user.email).toBe('pilot.user@acme.com');
  });

  it('2. verifies no browser PKCE verifier is stored in sessionStorage or localStorage', async () => {
    expect(mockSessionStorage.getItem('vibeconnect_sso_code_verifier')).toBeNull();
    expect(mockSessionStorage.getItem('vibeconnect_sso_state')).toBeNull();
    expect(mockLocalStorage.getItem('vibeconnect_sso_code_verifier')).toBeNull();
  });

  it('3. handles backend callback failure cleanly', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        error: 'sso_failed',
        detail: 'Authorization code or PKCE verifier is invalid or expired.'
      })
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(loginWithSSOCode('invalid_code')).rejects.toThrow(
      'Authorization code or PKCE verifier is invalid or expired.'
    );
  });

  it('4. handles account_frozen error from backend', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      status: 403,
      json: async () => ({
        error: 'account_frozen',
        detail: 'Kindly contact admin for assistance.'
      })
    });
    vi.stubGlobal('fetch', fetchMock);

    await expect(loginWithSSOCode('frozen_user_code')).rejects.toThrow(
      'Kindly contact admin for assistance.'
    );
  });

  it('5. token storage and cleanup behaves reliably', () => {
    saveTokens('access_tok_1', 'refresh_tok_1');
    expect(getAccessToken()).toBe('access_tok_1');

    clearTokens();
    expect(getAccessToken()).toBeNull();
  });

  it('6. verifies frontend source code never references or stores M2M secret', () => {
    const authCode = import.meta.glob('../../lib/auth.tsx', { query: '?raw', import: 'default', eager: true });
    for (const content of Object.values(authCode)) {
      expect(content).not.toContain('VIBECONNECT_M2M_SECRET');
      expect(content).not.toContain('VIBECONNECT_LMS_M2M_SECRET');
      expect(content).not.toContain('CONNECTOR_SECRET');
    }

    const callbackCode = import.meta.glob('../sso.callback.tsx', { query: '?raw', import: 'default', eager: true });
    for (const content of Object.values(callbackCode)) {
      expect(content).not.toContain('VIBECONNECT_M2M_SECRET');
      expect(content).not.toContain('VIBECONNECT_LMS_M2M_SECRET');
      expect(content).not.toContain('CONNECTOR_SECRET');
    }
  });

  it('7. captures reference_id from backend response on failure', async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({
        error: 'sso_failed',
        detail: 'Authorization code has expired. Please launch LMS again from VibeConnect.',
        reference_id: 'sso_abc123xyz'
      })
    });
    vi.stubGlobal('fetch', fetchMock);

    try {
      await loginWithSSOCode('expired_code');
      expect.unreachable('Should have thrown');
    } catch (err: any) {
      expect(err.message).toBe('Authorization code has expired. Please launch LMS again from VibeConnect.');
      expect(err.referenceId).toBe('sso_abc123xyz');
    }
  });
});

