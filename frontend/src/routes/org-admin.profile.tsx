import { createFileRoute } from '@tanstack/react-router';
import { Loader2, Save, AlertCircle, CheckCircle2, Upload, Trash2, Eye, EyeOff } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { authFetch, useAuth, normalizeUrl, API_BASE } from '@/lib/auth';

export const Route = createFileRoute('/org-admin/profile')({
  component: OrgAdminProfilePage,
});

const API_URL = API_BASE;

function OrgAdminProfilePage() {
  const { refreshUser } = useAuth();
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [savingProfile, setSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState('');
  const [profileSuccess, setProfileSuccess] = useState('');

  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [removePhoto, setRemovePhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [pwd, setPwd] = useState({ current: '', new: '', confirm: '' });
  const [savingPwd, setSavingPwd] = useState(false);
  const [pwdError, setPwdError] = useState('');
  const [pwdSuccess, setPwdSuccess] = useState('');

  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  useEffect(() => {
    authFetch(`${API_URL}/users/auth/me/`)
      .then(res => res.json())
      .then(d => {
        setData(d);
        if (d.profile_picture) {
          setPreviewUrl(normalizeUrl(d.profile_picture));
        }
        setLoading(false);
      })
      .catch(e => { setProfileError(e.message || 'Failed to load profile'); setLoading(false); });
  }, []);

  const handleProfileChange = (e: any) => {
    setData({ ...data, [e.target.name]: e.target.value });
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedFile(file);
      setRemovePhoto(false);
      setPreviewUrl(URL.createObjectURL(file));
    }
  };

  const handleRemovePhoto = () => {
    setSelectedFile(null);
    setPreviewUrl(null);
    setRemovePhoto(true);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleSaveProfile = async () => {
    setSavingProfile(true);
    setProfileError('');
    setProfileSuccess('');
    try {
      const formData = new FormData();
      formData.append('first_name', data.first_name || '');
      formData.append('last_name', data.last_name || '');
      formData.append('email', data.email || '');

      if (selectedFile) {
        formData.append('profile_picture', selectedFile);
      } else if (removePhoto) {
        formData.append('remove_profile_picture', 'true');
      }

      const res = await authFetch(`${API_URL}/users/auth/me/`, {
        method: 'PATCH',
        body: formData,
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.detail || (typeof resData === 'object' ? JSON.stringify(resData) : 'Failed to update profile'));

      setData(resData);
      if (resData.profile_picture) {
        setPreviewUrl(normalizeUrl(resData.profile_picture));
      } else {
        setPreviewUrl(null);
      }
      setSelectedFile(null);
      setRemovePhoto(false);

      await refreshUser();
      setProfileSuccess('Profile updated successfully!');
      setTimeout(() => setProfileSuccess(''), 3000);
    } catch (err: any) {
      setProfileError(err.message);
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSavePassword = async () => {
    setPwdError('');
    setPwdSuccess('');
    if (pwd.new !== pwd.confirm) {
      setPwdError('New passwords do not match.');
      return;
    }
    if (pwd.new.length < 8) {
      setPwdError('Password must be at least 8 characters.');
      return;
    }

    setSavingPwd(true);
    try {
      const res = await authFetch(`${API_URL}/users/auth/change-password/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ current_password: pwd.current, new_password: pwd.new }),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.detail || JSON.stringify(resData));
      setPwd({ current: '', new: '', confirm: '' });
      setPwdSuccess('Password changed successfully!');
      setTimeout(() => setPwdSuccess(''), 3000);
    } catch (err: any) {
      setPwdError(err.message);
    } finally {
      setSavingPwd(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-12">
      <Loader2 className="animate-spin text-brand size-8" />
    </div>
  );

  return (
    <div className="space-y-10">

        {/* Profile Section */}
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-foreground">Personal Information</h2>
            <p className="text-sm text-muted-foreground">Update your account identity, profile photo, and email address.</p>
          </div>

          {profileError && <div className="p-3 bg-red-950/60 border border-red-800/80 text-red-400 rounded-xl text-xs flex items-center gap-2"><AlertCircle className="size-4" /> {profileError}</div>}
          {profileSuccess && <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 rounded-xl text-xs flex items-center gap-2"><CheckCircle2 className="size-4" /> {profileSuccess}</div>}

          {/* Profile Photo Upload Block */}
          <div className="p-5 bg-card/80 border border-border/80 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center gap-5 shadow-2xs">
            <div className="relative shrink-0">
              {previewUrl ? (
                <img
                  src={previewUrl}
                  alt="Profile Preview"
                  className="size-20 rounded-2xl object-cover ring-2 ring-brand/40 shadow-sm"
                />
              ) : (
                <div className="size-20 rounded-2xl bg-accent border border-brand/30 grid place-items-center text-accent-foreground text-xl font-bold">
                  {(((data?.first_name?.[0] || '') + (data?.last_name?.[0] || '')) || 'OA').toUpperCase()}
                </div>
              )}
              <input
                type="file"
                ref={fileInputRef}
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
            </div>

            <div className="space-y-2 flex-1">
              <h3 className="text-xs font-bold text-foreground">Profile Photo</h3>
              <p className="text-[11px] text-muted-foreground">
                Upload a PNG, JPG, WebP, or SVG image. Live preview will be saved upon clicking Save Profile.
              </p>
              <div className="flex flex-wrap items-center gap-2.5 pt-1">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-accent text-accent-foreground hover:opacity-90 border border-brand/20 rounded-xl text-xs font-bold transition-opacity"
                >
                  <Upload className="size-3.5" />
                  {previewUrl ? 'Change Photo' : 'Upload Photo'}
                </button>

                {previewUrl && (
                  <button
                    type="button"
                    onClick={handleRemovePhoto}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 rounded-xl text-xs font-bold transition-all"
                  >
                    <Trash2 className="size-3.5" />
                    Remove Photo
                  </button>
                )}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">First Name</label>
              <input type="text" name="first_name" value={data?.first_name || ''} onChange={handleProfileChange} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Last Name</label>
              <input type="text" name="last_name" value={data?.last_name || ''} onChange={handleProfileChange} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-foreground mb-1">Email Address</label>
              <input type="email" name="email" value={data?.email || ''} onChange={handleProfileChange} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand" />
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleSaveProfile}
              disabled={savingProfile}
              className="flex items-center gap-2 px-6 py-2.5 bg-brand text-brand-foreground rounded-xl font-bold text-xs hover:opacity-90 transition-opacity shadow-sm disabled:opacity-50"
            >
              {savingProfile ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Save Profile
            </button>
          </div>
        </div>

        <div className="border-t border-border" />

        {/* Password Section */}
        <div className="space-y-6">
          <div>
            <h2 className="text-lg font-bold text-foreground">Change Password</h2>
            <p className="text-sm text-muted-foreground">Ensure your account uses a long, random password to stay secure.</p>
          </div>

          {pwdError && <div className="p-3 bg-red-950/60 border border-red-800/80 text-red-400 rounded-xl text-xs flex items-center gap-2"><AlertCircle className="size-4" /> {pwdError}</div>}
          {pwdSuccess && <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 rounded-xl text-xs flex items-center gap-2"><CheckCircle2 className="size-4" /> {pwdSuccess}</div>}

          <div className="space-y-4 max-w-md">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Current Password</label>
              <div className="relative">
                <input
                  type={showCurrent ? "text" : "password"}
                  value={pwd.current}
                  onChange={e => setPwd({...pwd, current: e.target.value})}
                  className="w-full bg-background border border-border rounded-xl pl-4 pr-10 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  title={showCurrent ? "Hide password" : "Show password"}
                >
                  {showCurrent ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">New Password</label>
              <div className="relative">
                <input
                  type={showNew ? "text" : "password"}
                  value={pwd.new}
                  onChange={e => setPwd({...pwd, new: e.target.value})}
                  className="w-full bg-background border border-border rounded-xl pl-4 pr-10 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  title={showNew ? "Hide password" : "Show password"}
                >
                  {showNew ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Confirm New Password</label>
              <div className="relative">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={pwd.confirm}
                  onChange={e => setPwd({...pwd, confirm: e.target.value})}
                  className="w-full bg-background border border-border rounded-xl pl-4 pr-10 py-2 text-xs text-foreground focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  title={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="pt-2">
            <button
              onClick={handleSavePassword}
              disabled={savingPwd || !pwd.current || !pwd.new || !pwd.confirm}
              className="flex items-center gap-2 px-6 py-2.5 bg-muted text-foreground rounded-xl font-bold text-xs hover:bg-muted transition-all border border-border disabled:opacity-50"
            >
              {savingPwd ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
              Update Password
            </button>
        </div>
      </div>
    </div>
  );
}
