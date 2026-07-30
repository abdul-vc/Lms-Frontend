import { useState, useEffect } from "react";
import { useNavigate } from "@tanstack/react-router";
import { User, Lock, Eye, EyeOff, ArrowRight, ShieldCheck, BarChart3, Users, AlertCircle, Loader2, KeyRound, CheckCircle2 } from "lucide-react";
import { useAuth, API_BASE } from "@/lib/auth";

interface BrandingData {
  organization_name?: string;
  platform_name?: string;
  logo_url: string;
  favicon_url?: string;
  primary_color: string;
  tagline: string;
  login_hero_description: string;
  login_welcome_message: string;
  compliance_badges: string[];
  support_email: string;
}

export function LoginPage({ orgSlug }: { orgSlug: string | null }) {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [branding, setBranding] = useState<BrandingData | null>(null);
  const [showDevCredentials, setShowDevCredentials] = useState(false);

  // Forgot Password State
  const [isForgotPasswordMode, setIsForgotPasswordMode] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotSuccess, setForgotSuccess] = useState<string | null>(null);
  const [forgotLoading, setForgotLoading] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function loadBranding() {
      if (!orgSlug) {
        try {
          const res = await fetch(`${API_BASE}/public/platform-branding/`);
          if (!res.ok) throw new Error('platform branding fetch failed');
          const data = await res.json();
          if (!cancelled) setBranding(data);
        } catch {
          if (!cancelled) setBranding(null);
        }
        return;
      }

      try {
        const res = await fetch(`${API_BASE}/public/organization-branding/${orgSlug}/`);
        const data = await res.json();

        if (res.ok && data.found) {
          if (!cancelled) setBranding(data);
          return;
        }

        const fallbackRes = await fetch(`${API_BASE}/public/platform-branding/`);
        const fallbackData = await fallbackRes.json();
        if (!cancelled) setBranding(fallbackData);
      } catch {
        if (!cancelled) setBranding(null);
      }
    }

    loadBranding();
    return () => { cancelled = true; };
  }, [orgSlug]);

  useEffect(() => {
    if (!branding) return;
    const displayName = branding.organization_name || branding.platform_name || 'EduVault LMS';
    document.title = `Sign in — ${displayName}`;
    if (branding.favicon_url) {
      const link = document.querySelector("link[rel~='icon']") as HTMLLinkElement | null;
      if (link) link.href = branding.favicon_url;
    }
  }, [branding]);

  const handleLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!username.trim() || !password.trim()) {
      setError("Please enter your username or email and password.");
      return;
    }
    setError(null);
    setIsLoading(true);
    try {
      const user = await login(username.trim(), password);
      if (user.is_platform_super_admin) {
        navigate({ to: "/super-admin/dashboard" });
      } else {
        navigate({ to: "/dashboard" });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Sign in failed. Please check your credentials.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!forgotEmail.trim()) {
      setError("Please enter your registered email address or username.");
      return;
    }
    setError(null);
    setForgotLoading(true);
    try {
      const res = await fetch(`${API_BASE}/users/auth/forgot-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: forgotEmail.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Password reset request failed.');
      setForgotSuccess(data.detail || 'A password reset link has been sent to your email address!');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to request password reset.');
    } finally {
      setForgotLoading(false);
    }
  };

  const handleQuickFill = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  const platformTitle = branding?.organization_name || branding?.platform_name || 'EDUVAULT';

  return (
    <div className="min-h-screen w-full bg-[#030712] text-slate-100 flex flex-col lg:flex-row overflow-hidden font-sans selection:bg-cyan-500 selection:text-white">
      {/* LEFT PANEL - Futuristic Cosmic Constellation & Brand Canvas */}
      <div className="lg:w-1/2 min-h-[400px] lg:min-h-screen relative flex flex-col justify-between p-8 lg:p-14 bg-gradient-to-br from-[#020617] via-[#081329] to-[#030712] border-r border-cyan-900/30 overflow-hidden">
        {/* Background Network Constellation Grid Graphic */}
        <div className="absolute inset-0 pointer-events-none opacity-40">
          <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
            <defs>
              <radialGradient id="cyanGlow" cx="30%" cy="30%" r="70%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.4" />
                <stop offset="60%" stopColor="#3b82f6" stopOpacity="0.1" />
                <stop offset="100%" stopColor="#030712" stopOpacity="0" />
              </radialGradient>
              <linearGradient id="lineGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.6" />
                <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
              </linearGradient>
            </defs>
            <rect width="100%" height="100%" fill="url(#cyanGlow)" />
            {/* Constellation Nodes & Lines */}
            <circle cx="15%" cy="20%" r="3" fill="#38bdf8" className="animate-pulse" />
            <circle cx="35%" cy="15%" r="4" fill="#06b6d4" />
            <circle cx="65%" cy="25%" r="3" fill="#60a5fa" />
            <circle cx="80%" cy="40%" r="5" fill="#38bdf8" className="animate-ping" style={{ animationDuration: '4s' }} />
            <circle cx="25%" cy="50%" r="4" fill="#06b6d4" />
            <circle cx="45%" cy="65%" r="3" fill="#38bdf8" />
            <circle cx="70%" cy="75%" r="4" fill="#60a5fa" />

            <line x1="15%" y1="20%" x2="35%" y2="15%" stroke="url(#lineGrad)" strokeWidth="1" />
            <line x1="35%" y1="15%" x2="65%" y2="25%" stroke="url(#lineGrad)" strokeWidth="1" />
            <line x1="65%" y1="25%" x2="80%" y2="40%" stroke="url(#lineGrad)" strokeWidth="1" />
            <line x1="15%" y1="20%" x2="25%" y2="50%" stroke="url(#lineGrad)" strokeWidth="1" />
            <line x1="25%" y1="50%" x2="45%" y2="65%" stroke="url(#lineGrad)" strokeWidth="1" />
            <line x1="45%" y1="65%" x2="70%" y2="75%" stroke="url(#lineGrad)" strokeWidth="1" />
            <line x1="65%" y1="25%" x2="45%" y2="65%" stroke="url(#lineGrad)" strokeWidth="1" />
          </svg>
        </div>

        {/* Dynamic Globe / Grid Wireframe Graphic at Bottom Left */}
        <div className="absolute -bottom-32 -left-32 w-[550px] h-[550px] pointer-events-none opacity-30">
          <div className="w-full h-full rounded-full border border-cyan-500/30 bg-gradient-to-tr from-cyan-500/20 to-transparent blur-sm animate-spin-slow" style={{ animationDuration: '60s' }} />
          <div className="absolute inset-8 rounded-full border border-dashed border-sky-400/30" />
          <div className="absolute inset-20 rounded-full border border-cyan-300/20" />
        </div>

        {/* TOP BRANDING LOGO */}
        <div className="relative z-10 flex flex-col items-center justify-center pt-8 lg:pt-12 text-center">
          {branding?.logo_url ? (
            <img src={branding.logo_url} alt={platformTitle} className="h-16 w-auto object-contain mb-4 filter drop-shadow-[0_0_15px_rgba(6,182,212,0.6)]" />
          ) : (
            <div className="relative mb-5 group">
              {/* Glowing Futuristic Geometric Box Icon */}
              <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-cyan-500 via-sky-500 to-blue-600 p-[2px] shadow-[0_0_35px_rgba(6,182,212,0.5)] transition-all duration-500 group-hover:scale-105">
                <div className="w-full h-full bg-[#071328] rounded-[14px] flex items-center justify-center">
                  <svg className="w-10 h-10 text-cyan-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
                    <path d="M12 2L2 7l10 5 10-5-10-5z" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2 17l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
                    <path d="M2 12l10 5 10-5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </div>
              </div>
            </div>
          )}

          <h1 className="text-3xl lg:text-4xl font-extrabold tracking-wider text-white uppercase drop-shadow-md">
            {platformTitle.split('').map((char, idx) => (
              <span key={idx} className={idx >= 3 && idx <= 6 ? "text-cyan-400" : "text-white"}>{char}</span>
            ))}
          </h1>
          <p className="text-[11px] font-bold tracking-[0.35em] text-cyan-400/90 uppercase mt-1">
            LEARNING MANAGEMENT SYSTEM
          </p>

          <div className="w-12 h-[2px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent my-6" />

          <div className="text-center max-w-sm">
            <p className="text-sm font-semibold text-slate-300 tracking-wide">
              {branding?.tagline || "Empowering Learning."}
            </p>
            <p className="text-xs text-slate-400 mt-1">
              {branding?.login_hero_description || "Enabling Futures."}
            </p>
          </div>
        </div>

        {/* BOTTOM THREE VALUE PROPOSITIONS */}
        <div className="relative z-10 grid grid-cols-3 gap-4 pt-12 max-w-lg mx-auto w-full border-t border-cyan-900/30">
          <div className="flex flex-col items-center text-center group">
            <div className="size-10 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-2 group-hover:border-cyan-400 transition-colors shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              <ShieldCheck className="size-5" />
            </div>
            <span className="text-xs font-bold text-slate-200">Secure</span>
            <span className="text-[10px] text-slate-400 mt-0.5 leading-tight">Enterprise Grade Security</span>
          </div>

          <div className="flex flex-col items-center text-center group">
            <div className="size-10 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-2 group-hover:border-cyan-400 transition-colors shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              <BarChart3 className="size-5" />
            </div>
            <span className="text-xs font-bold text-slate-200">Intelligent</span>
            <span className="text-[10px] text-slate-400 mt-0.5 leading-tight">Data Driven Insights</span>
          </div>

          <div className="flex flex-col items-center text-center group">
            <div className="size-10 rounded-xl bg-cyan-950/60 border border-cyan-500/30 flex items-center justify-center text-cyan-400 mb-2 group-hover:border-cyan-400 transition-colors shadow-[0_0_15px_rgba(6,182,212,0.15)]">
              <Users className="size-5" />
            </div>
            <span className="text-xs font-bold text-slate-200">Scalable</span>
            <span className="text-[10px] text-slate-400 mt-0.5 leading-tight">Built for Growth and Performance</span>
          </div>
        </div>

        {/* COPYRIGHT FOOTER */}
        <div className="relative z-10 text-center text-[11px] text-slate-500 pt-6">
          © 2026 {platformTitle} LMS. All rights reserved.
        </div>
      </div>

      {/* RIGHT PANEL - Glassmorphism Container */}
      <div className="lg:w-1/2 flex flex-col items-center justify-center p-6 sm:p-10 lg:p-16 relative bg-[#040914] bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-[#0b1b36] via-[#040914] to-[#02050b]">
        <div className="absolute top-1/4 right-10 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-10 left-10 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

        {/* GLASSMORPHISM CARD */}
        <div className="w-full max-w-md backdrop-blur-2xl bg-slate-900/60 border border-cyan-500/20 shadow-[0_0_60px_rgba(6,182,212,0.15)] rounded-3xl p-8 sm:p-10 relative z-10">
          
          {isForgotPasswordMode ? (
            /* FORGOT PASSWORD VIEW */
            <div>
              <div className="text-center mb-6">
                <h2 className="text-2xl font-bold text-white tracking-tight">
                  Reset Your Password
                </h2>
                <p className="text-xs text-slate-400 mt-1.5">
                  Enter your registered email address or username below to receive an instant password reset link.
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-3 mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-medium">
                  <AlertCircle className="size-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              {forgotSuccess ? (
                <div className="text-center space-y-4 py-4">
                  <div className="size-14 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(6,182,212,0.3)]">
                    <CheckCircle2 className="size-8" />
                  </div>
                  <p className="text-xs text-slate-200 leading-relaxed font-medium">
                    {forgotSuccess}
                  </p>
                  <button
                    type="button"
                    onClick={() => { setIsForgotPasswordMode(false); setForgotSuccess(null); setError(null); }}
                    className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 text-white font-bold text-xs shadow-[0_0_20px_rgba(6,182,212,0.3)] hover:from-cyan-300 hover:to-blue-500 transition-all flex items-center justify-center gap-2 mt-4"
                  >
                    <span>Back to Sign In</span>
                    <ArrowRight className="size-4" />
                  </button>
                </div>
              ) : (
                <form onSubmit={handleForgotPasswordSubmit} className="space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-xs font-semibold text-slate-300 block">
                      Registered Email or Username
                    </label>
                    <div className="relative flex items-center">
                      <User className="absolute left-3.5 size-4 text-slate-400 pointer-events-none" />
                      <input
                        type="text"
                        required
                        value={forgotEmail}
                        onChange={(e) => setForgotEmail(e.target.value)}
                        placeholder="e.g. user@domain.com or student"
                        className="w-full py-3 pl-10 pr-4 bg-[#071124]/80 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 outline-none transition-all duration-300 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 shadow-inner"
                        disabled={forgotLoading}
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-white font-bold text-sm tracking-wide shadow-[0_0_25px_rgba(6,182,212,0.35)] transition-all flex items-center justify-center gap-2 disabled:opacity-60"
                  >
                    {forgotLoading ? (
                      <>
                        <Loader2 className="size-4 animate-spin text-white" />
                        <span>Sending Reset Link…</span>
                      </>
                    ) : (
                      <>
                        <span>Send Password Reset Link 📩</span>
                        <ArrowRight className="size-4" />
                      </>
                    )}
                  </button>

                  <div className="pt-2 text-center">
                    <button
                      type="button"
                      onClick={() => { setIsForgotPasswordMode(false); setError(null); }}
                      className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold transition-colors"
                    >
                      ← Back to Sign In
                    </button>
                  </div>
                </form>
              )}
            </div>
          ) : (
            /* REGULAR SIGN IN VIEW */
            <div>
              <div className="text-center mb-8">
                <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                  {branding?.login_welcome_message || 'Welcome Back'}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1.5">
                  Sign in to continue to your learning journey
                </p>
              </div>

              {error && (
                <div className="flex items-center gap-3 mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-medium animate-shake">
                  <AlertCircle className="size-4 shrink-0 text-red-400" />
                  <span>{error}</span>
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-5">
                {/* Username / Email Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Username or Email
                  </label>
                  <div className="relative flex items-center">
                    <User className="absolute left-3.5 size-4 text-slate-400 pointer-events-none" />
                    <input
                      id="login-username"
                      type="text"
                      autoComplete="username"
                      value={username}
                      onChange={(e) => setUsername(e.target.value)}
                      placeholder="Enter your username or email"
                      className="w-full py-3 pl-10 pr-4 bg-[#071124]/80 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 outline-none transition-all duration-300 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 shadow-inner"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-300 block">
                    Password
                  </label>
                  <div className="relative flex items-center">
                    <Lock className="absolute left-3.5 size-4 text-slate-400 pointer-events-none" />
                    <input
                      id="login-password"
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Enter your password"
                      className="w-full py-3 pl-10 pr-10 bg-[#071124]/80 border border-slate-700/80 rounded-xl text-sm text-slate-100 placeholder-slate-500 outline-none transition-all duration-300 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50 shadow-inner"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 text-slate-400 hover:text-cyan-400 transition-colors"
                    >
                      {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>

                {/* Remember Me & Forgot Password */}
                <div className="flex items-center justify-between text-xs pt-1">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 hover:text-slate-100 transition-colors">
                    <input
                      type="checkbox"
                      checked={rememberMe}
                      onChange={(e) => setRememberMe(e.target.checked)}
                      className="size-4 rounded bg-[#071124] border-slate-700 text-cyan-500 focus:ring-cyan-400/30 accent-cyan-500"
                    />
                    <span>Remember me</span>
                  </label>
                  <button 
                    type="button" 
                    onClick={() => { setIsForgotPasswordMode(true); setError(null); }} 
                    className="text-cyan-400 hover:text-cyan-300 font-medium transition-colors cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>

                {/* Sign In Button */}
                <button
                  id="login-submit"
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-white font-bold text-sm tracking-wide shadow-[0_0_25px_rgba(6,182,212,0.35)] transition-all duration-300 flex items-center justify-center gap-2 group disabled:opacity-60 disabled:cursor-not-allowed mt-2"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="size-4 animate-spin text-white" />
                      <span>Signing in…</span>
                    </>
                  ) : (
                    <>
                      <span>Sign In</span>
                      <ArrowRight className="size-4 group-hover:translate-x-1 transition-transform" />
                    </>
                  )}
                </button>
              </form>

              {/* Social Logins Divider */}
              <div className="relative my-6 flex items-center justify-center">
                <div className="w-full border-t border-slate-800" />
                <span className="bg-[#0b172a] px-3 text-[11px] font-medium text-slate-400 uppercase tracking-wider relative z-10 shrink-0">
                  or continue with
                </span>
              </div>

              {/* Social Logins */}
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => alert('SSO with Google is enabled. Connecting to Google OAuth...')}
                  className="py-2.5 px-4 rounded-xl bg-[#071124]/90 border border-slate-700/80 hover:border-cyan-500/50 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all hover:bg-slate-800/50"
                >
                  {/* Authentic Google Icon */}
                  <svg className="size-4" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z"/>
                    <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.1-6.72-4.93H1.29v3.15C3.26 21.3 7.33 24 12 24z"/>
                    <path fill="#FBBC05" d="M5.28 14.27c-.25-.72-.38-1.49-.38-2.27s.13-1.55.38-2.27V6.58H1.29C.47 8.21 0 10.05 0 12s.47 3.79 1.29 5.42l3.99-3.15z"/>
                    <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.33 0 3.26 2.7 1.29 6.58l3.99 3.15c.95-2.83 3.6-4.98 6.72-4.98z"/>
                  </svg>
                  Google
                </button>

                <button
                  type="button"
                  onClick={() => alert('SSO with Microsoft is enabled. Connecting to Azure AD...')}
                  className="py-2.5 px-4 rounded-xl bg-[#071124]/90 border border-slate-700/80 hover:border-cyan-500/50 text-slate-200 text-xs font-semibold flex items-center justify-center gap-2 transition-all hover:bg-slate-800/50"
                >
                  {/* Authentic Microsoft Icon */}
                  <svg className="size-4" viewBox="0 0 23 23">
                    <path fill="#f35325" d="M1 1h10v10H1z"/>
                    <path fill="#81bc06" d="M12 1h10v10H12z"/>
                    <path fill="#05a6f0" d="M1 12h10v10H1z"/>
                    <path fill="#ffba08" d="M12 12h10v10H12z"/>
                  </svg>
                  Microsoft
                </button>
              </div>

              {/* Account Registration / Footer */}
              <div className="mt-6 text-center text-xs text-slate-400 flex items-center justify-center gap-1">
                <span>New to {platformTitle}?</span>
                <a href="#" onClick={(e) => { e.preventDefault(); alert('Self-registration URL: /pending-registration'); }} className="text-cyan-400 hover:text-cyan-300 font-semibold inline-flex items-center gap-1 transition-colors">
                  Create an account <ArrowRight className="size-3" />
                </a>
              </div>
            </div>
          )}

          {/* Dev Quick Credentials Toggle Drawer Button */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 text-center">
            <button
              type="button"
              onClick={() => setShowDevCredentials(!showDevCredentials)}
              className="text-[11px] text-cyan-400/80 hover:text-cyan-300 font-medium inline-flex items-center gap-1 transition-colors"
            >
              <KeyRound className="size-3" />
              {showDevCredentials ? "Hide Dev Quick Credentials" : "Click to View Demo Credentials"}
            </button>

            {showDevCredentials && (
              <div className="mt-3 p-3 rounded-xl bg-[#061022] border border-cyan-500/20 text-left text-[11px] space-y-1.5 animate-fadeIn">
                <p className="font-semibold text-cyan-400 mb-1 border-b border-cyan-950 pb-1">1-Click Dev Fill</p>
                <div className="flex items-center justify-between text-slate-300 hover:text-cyan-300 cursor-pointer p-1 rounded hover:bg-cyan-950/40" onClick={() => handleQuickFill("superadmin", "superadmin123")}>
                  <span>⚡ <strong>superadmin</strong> / superadmin123</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">SuperAdmin</span>
                </div>
                <div className="flex items-center justify-between text-slate-300 hover:text-cyan-300 cursor-pointer p-1 rounded hover:bg-cyan-950/40" onClick={() => handleQuickFill("orgadmin", "orgadmin123")}>
                  <span>⚡ <strong>orgadmin</strong> / orgadmin123</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">OrgAdmin</span>
                </div>
                <div className="flex items-center justify-between text-slate-300 hover:text-cyan-300 cursor-pointer p-1 rounded hover:bg-cyan-950/40" onClick={() => handleQuickFill("instructor", "instructor123")}>
                  <span>⚡ <strong>instructor</strong> / instructor123</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30">Instructor</span>
                </div>
                <div className="flex items-center justify-between text-slate-300 hover:text-cyan-300 cursor-pointer p-1 rounded hover:bg-cyan-950/40" onClick={() => handleQuickFill("student", "student123")}>
                  <span>⚡ <strong>student</strong> / student123</span>
                  <span className="text-[9px] px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 border border-sky-500/30">Learner</span>
                </div>
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}
