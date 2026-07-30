import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useState } from 'react';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Loader2, ArrowRight, KeyRound } from 'lucide-react';
import { API_BASE } from '@/lib/auth';

export const Route = createFileRoute('/reset-password')({
  component: ResetPasswordPage,
});

function ResetPasswordPage() {
  const navigate = useNavigate();
  const searchParams = new URLSearchParams(window.location.search);
  const uid = searchParams.get('uid') || '';
  const token = searchParams.get('token') || '';

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uid || !token) {
      setError('Invalid or missing password reset link parameters.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters long.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match. Please re-enter.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE}/users/auth/reset-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uid,
          token,
          new_password: newPassword,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || 'Password reset failed.');
      }

      setSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Something went wrong during password reset.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#030712] text-foreground flex flex-col items-center justify-center p-6 relative font-sans selection:bg-cyan-500 selection:text-foreground">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-blue-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Glassmorphism Card Container */}
      <div className="w-full max-w-md backdrop-blur-2xl bg-card/60 border border-cyan-500/20 shadow-[0_0_60px_rgba(6,182,212,0.15)] rounded-3xl p-8 sm:p-10 relative z-10">
        <div className="flex flex-col items-center text-center mb-6">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-cyan-500 via-sky-500 to-blue-600 p-[2px] shadow-[0_0_25px_rgba(6,182,212,0.4)] mb-4">
            <div className="w-full h-full bg-[#071328] rounded-[14px] flex items-center justify-center text-cyan-400">
              <KeyRound className="size-7" />
            </div>
          </div>

          <h1 className="text-2xl font-bold text-foreground tracking-tight">Set New Password</h1>
          <p className="text-xs text-muted-foreground mt-1">
            Create a strong new password for your LMS account
          </p>
        </div>

        {error && (
          <div className="flex items-center gap-3 mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-300 text-xs font-medium">
            <AlertCircle className="size-4 shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {success ? (
          <div className="text-center space-y-4 py-4">
            <div className="size-16 rounded-full bg-cyan-500/20 border border-cyan-400/40 text-cyan-400 flex items-center justify-center mx-auto shadow-[0_0_30px_rgba(6,182,212,0.3)]">
              <CheckCircle2 className="size-9" />
            </div>

            <h2 className="text-lg font-bold text-foreground">Password Reset Complete!</h2>
            <p className="text-xs text-foreground">
              Your password has been successfully updated. You can now sign in with your new credentials.
            </p>

            <button
              onClick={() => navigate({ to: '/login' })}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-foreground font-bold text-sm shadow-[0_0_25px_rgba(6,182,212,0.35)] transition-all flex items-center justify-center gap-2 mt-4"
            >
              <span>Back to Sign In</span>
              <ArrowRight className="size-4" />
            </button>
          </div>
        ) : (
          <form onSubmit={handleResetPassword} className="space-y-4">
            {/* New Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                New Password
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 size-4 text-muted-foreground pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="At least 8 characters"
                  className="w-full py-3 pl-10 pr-10 bg-[#071124]/80 border border-border/80 rounded-xl text-sm text-foreground placeholder-slate-500 outline-none transition-all duration-300 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 text-muted-foreground hover:text-cyan-400 transition-colors"
                >
                  {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            {/* Confirm Password */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground block">
                Confirm New Password
              </label>
              <div className="relative flex items-center">
                <Lock className="absolute left-3.5 size-4 text-muted-foreground pointer-events-none" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-enter new password"
                  className="w-full py-3 pl-10 pr-10 bg-[#071124]/80 border border-border/80 rounded-xl text-sm text-foreground placeholder-slate-500 outline-none transition-all duration-300 focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400/50"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-400 via-sky-500 to-blue-600 hover:from-cyan-300 hover:to-blue-500 text-foreground font-bold text-sm tracking-wide shadow-[0_0_25px_rgba(6,182,212,0.35)] transition-all flex items-center justify-center gap-2 mt-4 disabled:opacity-60"
            >
              {loading ? (
                <>
                  <Loader2 className="size-4 animate-spin text-foreground" />
                  <span>Updating Password…</span>
                </>
              ) : (
                <>
                  <span>Reset Password</span>
                  <ArrowRight className="size-4" />
                </>
              )}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
