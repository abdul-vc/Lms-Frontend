import { createFileRoute } from '@tanstack/react-router';
import { Settings, Shield, Bell, User, Loader2, Save, AlertCircle, CheckCircle2, UserPlus, ShieldCheck, Mail, X, Trash2, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useState, useEffect, useRef } from 'react';
import { authFetch, useAuth, normalizeUrl, API_BASE } from '@/lib/auth';

export const Route = createFileRoute('/super-admin/settings')({
  component: SettingsPage,
});

const API_URL = API_BASE;

function GeneralTab() {
  const [data, setData] = useState<any>({
    platform_name: 'Halyard Learn',
    support_email: 'support@halyardlearn.com',
    primary_color: '#10b981',
    default_timezone: 'UTC',
    default_currency: 'INR',
    logo_url: '',
    favicon_url: '',
    terms_url: '',
    privacy_url: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    authFetch(`${API_URL}/platform-settings/`)
      .then(res => res.json())
      .then(d => { 
        if (d && typeof d === 'object') setData(d); 
        setLoading(false); 
      })
      .catch(e => { setError(e.message || 'Failed to load general settings'); setLoading(false); });
  }, []);

  const handleChange = (e: any) => {
    setData((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        platform_name: data?.platform_name,
        logo_url: data?.logo_url,
        favicon_url: data?.favicon_url,
        primary_color: data?.primary_color,
        support_email: data?.support_email,
        terms_url: data?.terms_url,
        privacy_url: data?.privacy_url,
        default_timezone: data?.default_timezone,
        default_currency: data?.default_currency,
      };
      
      const res = await authFetch(`${API_URL}/platform-settings/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.detail || JSON.stringify(resData));
      setData(resData);
      setSuccess('Settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-emerald-400 size-8" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-foreground">General Settings</h2>
      
      {error && <div className="p-3 bg-red-950/60 border border-red-800/80 text-red-400 rounded-xl text-xs flex items-center gap-2"><AlertCircle className="size-4" /> {error}</div>}
      {success && <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 rounded-xl text-xs flex items-center gap-2"><CheckCircle2 className="size-4" /> {success}</div>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Platform Name</label>
            <input type="text" name="platform_name" value={data?.platform_name || ''} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Support Email</label>
            <input type="email" name="support_email" value={data?.support_email || ''} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Primary Color (Hex)</label>
            <input type="text" name="primary_color" value={data?.primary_color || ''} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Default Timezone</label>
            <input type="text" name="default_timezone" value={data?.default_timezone || ''} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Default Currency</label>
            <input type="text" name="default_currency" value={data?.default_currency || ''} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50" />
          </div>
        </div>
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Logo URL</label>
            <input type="text" name="logo_url" value={data?.logo_url || ''} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Favicon URL</label>
            <input type="text" name="favicon_url" value={data?.favicon_url || ''} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Terms URL</label>
            <input type="text" name="terms_url" value={data?.terms_url || ''} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Privacy URL</label>
            <input type="text" name="privacy_url" value={data?.privacy_url || ''} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50" />
          </div>
        </div>
      </div>

      <div className="pt-4 border-t border-border">
        <button 
          onClick={handleSave} 
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-foreground rounded-xl font-bold text-xs hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save Changes
        </button>
      </div>
    </div>
  );
}

function SecurityTab() {
  const [data, setData] = useState<any>({
    password_min_length: 8,
    session_timeout_minutes: 480,
    max_upload_size_mb: 500,
    activity_log_retention_days: 365,
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    authFetch(`${API_URL}/platform-settings/`)
      .then(res => res.json())
      .then(d => { 
        if (d && typeof d === 'object') setData(d); 
        setLoading(false); 
      })
      .catch(e => { setError(e.message || 'Failed to load security settings'); setLoading(false); });
  }, []);

  const handleChange = (e: any) => {
    setData((prev: any) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleSave = async () => {
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const payload = {
        password_min_length: data.password_min_length,
        session_timeout_minutes: data.session_timeout_minutes,
        max_upload_size_mb: data.max_upload_size_mb,
        activity_log_retention_days: data.activity_log_retention_days,
      };
      
      const res = await authFetch(`${API_URL}/platform-settings/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.detail || JSON.stringify(resData));
      setData(resData);
      setSuccess('Security settings saved successfully!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-emerald-400 size-8" /></div>;

  return (
    <div className="space-y-6">
      <h2 className="text-lg font-bold text-foreground">Security Settings</h2>
      
      {error && <div className="p-3 bg-red-950/60 border border-red-800/80 text-red-400 rounded-xl text-xs flex items-center gap-2"><AlertCircle className="size-4" /> {error}</div>}
      {success && <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 rounded-xl text-xs flex items-center gap-2"><CheckCircle2 className="size-4" /> {success}</div>}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">Minimum Password Length</label>
          <input type="number" name="password_min_length" min={4} value={data.password_min_length ?? ''} placeholder="e.g. 8" onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">Session Timeout (minutes)</label>
          <input type="number" name="session_timeout_minutes" min={5} value={data.session_timeout_minutes ?? ''} placeholder="e.g. 480" onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">Max Upload Size (MB)</label>
          <input type="number" name="max_upload_size_mb" min={1} value={data.max_upload_size_mb ?? ''} placeholder="e.g. 50" onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50" />
        </div>
        <div>
          <label className="block text-xs font-semibold text-foreground mb-1">Activity Log Retention (days)</label>
          <input type="number" name="activity_log_retention_days" min={1} value={data.activity_log_retention_days ?? ''} placeholder="e.g. 30" onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50" />
        </div>
      </div>

      <div className="pt-4 border-t border-border">
        <button 
          onClick={handleSave} 
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-foreground rounded-xl font-bold text-xs hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
          Save Changes
        </button>
      </div>
    </div>
  );
}

function NotificationsTab() {
  const [templates, setTemplates] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeKey, setActiveKey] = useState<string | null>(null);
  const [formData, setFormData] = useState<any>({ subject: '', body_html: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [hasUnsaved, setHasUnsaved] = useState(false);

  useEffect(() => {
    authFetch(`${API_URL}/notification-templates/`)
      .then(res => res.json())
      .then(d => { 
        setTemplates(d.results || d); 
        setLoading(false); 
      })
      .catch(e => { setError(e.message || 'Failed to load templates'); setLoading(false); });
  }, []);

  const handleSelect = (tmpl: any) => {
    if (hasUnsaved && !window.confirm("You have unsaved changes. Discard them?")) return;
    setActiveKey(tmpl.key);
    setFormData({ subject: tmpl.subject || '', body_html: tmpl.body_html || '' });
    setHasUnsaved(false);
    setError('');
    setSuccess('');
  };

  const handleSave = async () => {
    if (!activeKey) return;
    setSaving(true);
    setError('');
    setSuccess('');
    try {
      const res = await authFetch(`${API_URL}/notification-templates/${activeKey}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });
      const resData = await res.json();
      if (!res.ok) throw new Error(resData.detail || JSON.stringify(resData));
      
      setTemplates(templates.map(t => t.key === activeKey ? resData : t));
      setHasUnsaved(false);
      setSuccess('Template saved!');
      setTimeout(() => setSuccess(''), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-emerald-400 size-8" /></div>;
  if (error && !templates.length) return <div className="p-3 bg-red-950/60 border border-red-800/80 text-red-400 rounded-xl text-xs">{error}</div>;

  return (
    <div className="flex gap-6 h-[500px]">
      <div className="w-1/3 border-r border-border pr-6 overflow-y-auto">
        <h2 className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest mb-4">Templates</h2>
        <div className="space-y-2">
          {templates.map(tmpl => (
            <button
              key={tmpl.key}
              onClick={() => handleSelect(tmpl)}
              className={cn(
                "w-full text-left px-3 py-2 rounded-xl text-xs font-semibold transition-all",
                activeKey === tmpl.key ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30" : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
              )}
            >
              <div className="font-bold">{tmpl.key}</div>
              <div className="text-xs text-muted-foreground truncate">{tmpl.subject}</div>
            </button>
          ))}
          {templates.length === 0 && <div className="text-xs text-muted-foreground italic">No templates found.</div>}
        </div>
      </div>
      
      <div className="flex-1 flex flex-col h-full">
        {!activeKey ? (
          <div className="flex-1 flex items-center justify-center text-muted-foreground text-xs italic">
            Select a template to edit
          </div>
        ) : (
          <div className="flex-1 flex flex-col space-y-4">
            <h2 className="text-lg font-bold text-foreground">Edit Template: {activeKey}</h2>
            {error && <div className="p-3 bg-red-950/60 border border-red-800/80 text-red-400 rounded-xl text-xs flex items-center gap-2"><AlertCircle className="size-4" /> {error}</div>}
            {success && <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 rounded-xl text-xs flex items-center gap-2"><CheckCircle2 className="size-4" /> {success}</div>}
            {hasUnsaved && <div className="text-[10px] font-bold text-amber-400 bg-amber-950/60 border border-amber-800/80 px-2.5 py-1 rounded-md w-max inline-block">Unsaved changes</div>}
            
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Subject</label>
              <input 
                type="text" 
                value={formData.subject} 
                onChange={e => { setFormData({...formData, subject: e.target.value}); setHasUnsaved(true); }}
                className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50" 
              />
            </div>
            
            <div className="flex-1 flex flex-col min-h-0">
              <label className="block text-xs font-semibold text-foreground mb-1">Body HTML</label>
              <textarea 
                value={formData.body_html} 
                onChange={e => { setFormData({...formData, body_html: e.target.value}); setHasUnsaved(true); }}
                className="w-full flex-1 min-h-0 bg-background border border-border rounded-xl px-4 py-3 text-xs text-foreground focus:outline-none focus:border-emerald-500/50 font-mono resize-none" 
              />
              <p className="text-xs text-muted-foreground mt-2">Available variables depend on the template trigger.</p>
            </div>
            
            <div className="pt-2">
              <button 
                onClick={handleSave} 
                disabled={saving || !hasUnsaved}
                className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-foreground rounded-xl font-bold text-xs hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
              >
                {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                Save Template
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function ProfileTab() {
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

  if (loading) return <div className="flex justify-center py-12"><Loader2 className="animate-spin text-emerald-400 size-8" /></div>;

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
                className="size-20 rounded-2xl object-cover ring-2 ring-emerald-500/40 shadow-sm"
              />
            ) : (
              <div className="size-20 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 grid place-items-center text-emerald-400 text-xl font-bold">
                {(((data?.first_name?.[0] || '') + (data?.last_name?.[0] || '')) || 'SA').toUpperCase()}
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
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600/15 text-emerald-400 hover:bg-emerald-600/25 border border-emerald-500/30 rounded-xl text-xs font-bold transition-all"
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
            <input type="text" name="first_name" value={data?.first_name || ''} onChange={handleProfileChange} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Last Name</label>
            <input type="text" name="last_name" value={data?.last_name || ''} onChange={handleProfileChange} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-foreground mb-1">Email Address</label>
            <input type="email" name="email" value={data?.email || ''} onChange={handleProfileChange} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50" />
          </div>
        </div>

        <div className="pt-2">
          <button 
            onClick={handleSaveProfile} 
            disabled={savingProfile}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-foreground rounded-xl font-bold text-xs hover:bg-emerald-500 transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50"
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
            <input 
              type="password" 
              value={pwd.current} 
              onChange={e => setPwd({...pwd, current: e.target.value})}
              className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50" 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">New Password</label>
            <input 
              type="password" 
              value={pwd.new} 
              onChange={e => setPwd({...pwd, new: e.target.value})}
              className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50" 
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Confirm New Password</label>
            <input 
              type="password" 
              value={pwd.confirm} 
              onChange={e => setPwd({...pwd, confirm: e.target.value})}
              className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50" 
            />
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

function SuperAdminsTab() {
  const { user } = useAuth();
  const [superAdmins, setSuperAdmins] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalError, setModalError] = useState('');

  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    email: '',
    username: '',
    password: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const fetchSuperAdmins = async () => {
    setLoading(true);
    try {
      const res = await authFetch(`${API_URL}/users/super-admins/`);
      if (res.ok) {
        setSuperAdmins(await res.json());
      } else {
        throw new Error("Failed to load Super Admins");
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSuperAdmins();
  }, []);

  const handleCreateSuperAdmin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError('');
    setError('');
    setSuccess('');

    try {
      const res = await authFetch(`${API_URL}/users/super-admins/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || JSON.stringify(data));

      setSuccess(`Super Admin '${data.username}' created successfully! Welcome email sent to ${data.email}.`);
      setIsModalOpen(false);
      setFormData({ first_name: '', last_name: '', email: '', username: '', password: '' });
      fetchSuperAdmins();
    } catch (err: any) {
      setModalError(err.message || 'Failed to create Super Admin.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteSuperAdmin = async (u: any) => {
    if (u.id === user?.id) {
      alert("You cannot delete your own active Super Admin account.");
      return;
    }

    if (!confirm(`Are you sure you want to delete Super Admin '${u.full_name || u.username}' (${u.email})?`)) {
      return;
    }

    setError('');
    setSuccess('');

    try {
      const res = await authFetch(`${API_URL}/users/super-admins/${u.id}/`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Failed to delete Super Admin.");

      setSuccess(`Super Admin '${u.full_name || u.username}' deleted successfully.`);
      fetchSuperAdmins();
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-bold text-foreground">Platform Super Admins</h2>
          <p className="text-xs text-muted-foreground mt-0.5">Manage Master Setup administrative accounts and access credentials.</p>
        </div>
        <button
          onClick={() => { setError(''); setSuccess(''); setModalError(''); setIsModalOpen(true); }}
          className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-foreground font-bold text-xs rounded-xl shadow-lg shadow-emerald-600/20 transition-all"
        >
          <UserPlus className="size-4" /> Create Super Admin
        </button>
      </div>

      {error && <div className="p-3 bg-red-950/60 border border-red-800/80 text-red-400 rounded-xl text-xs flex items-center gap-2"><AlertCircle className="size-4 shrink-0" /> {error}</div>}
      {success && <div className="p-3 bg-emerald-950/60 border border-emerald-800/80 text-emerald-400 rounded-xl text-xs flex items-center gap-2"><CheckCircle2 className="size-4 shrink-0" /> {success}</div>}

      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-emerald-400 size-8" /></div>
      ) : (
        <div className="border border-border rounded-2xl overflow-hidden shadow-xl bg-card/90">
          <table className="w-full text-left text-xs border-collapse">
            <thead className="bg-background text-muted-foreground font-bold uppercase tracking-wider text-[10px] border-b border-border">
              <tr>
                <th className="p-3.5">Super Admin</th>
                <th className="p-3.5">Username</th>
                <th className="p-3.5">Email Address</th>
                <th className="p-3.5">Status</th>
                <th className="p-3.5">Date Joined</th>
                <th className="p-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {superAdmins.map((u) => (
                <tr key={u.id} className="hover:bg-muted/50 transition-colors">
                  <td className="p-3.5 font-bold text-foreground flex items-center gap-3">
                    <div className="size-8 rounded-full bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-xs border border-emerald-500/30">
                      {u.first_name ? u.first_name[0].toUpperCase() : (u.username[0] || 'A').toUpperCase()}
                    </div>
                    <div>
                      <p className="leading-tight text-foreground font-bold">{u.full_name || u.username}</p>
                      <p className="text-[10px] text-muted-foreground font-normal">Master Setup Admin</p>
                    </div>
                  </td>
                  <td className="p-3.5 font-mono text-foreground">{u.username}</td>
                  <td className="p-3.5 text-foreground">{u.email}</td>
                  <td className="p-3.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      <ShieldCheck className="size-3" /> Super Admin
                    </span>
                  </td>
                  <td className="p-3.5 text-muted-foreground font-mono">
                    {new Date(u.date_joined).toLocaleDateString()}
                  </td>
                  <td className="p-3.5 text-right">
                    <button
                      onClick={() => handleDeleteSuperAdmin(u)}
                      disabled={u.id === user?.id}
                      title={u.id === user?.id ? "You cannot delete yourself" : "Delete Super Admin"}
                      className="p-1.5 text-muted-foreground hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-colors border border-transparent hover:border-red-800/50 disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-muted-foreground"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* CREATE SUPER ADMIN MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-card rounded-3xl max-w-md w-full p-6 text-foreground shadow-2xl border border-border relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 p-1.5 text-muted-foreground hover:text-foreground rounded-full hover:bg-muted transition-colors"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="size-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                <UserPlus className="size-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-foreground">Create New Super Admin</h3>
                <p className="text-xs text-muted-foreground">Grants full Master Setup control access & sends login email.</p>
              </div>
            </div>

            {/* Modal Error Banner */}
            {modalError && (
              <div className="mb-4 p-3 bg-red-950/60 border border-red-800/80 rounded-xl text-xs text-red-400 flex items-start gap-2">
                <AlertCircle className="size-4 text-red-400 shrink-0 mt-0.5" />
                <div>
                  <p className="font-bold">Registration Error</p>
                  <p>{modalError}</p>
                </div>
              </div>
            )}

            <form onSubmit={handleCreateSuperAdmin} className="space-y-3.5 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-semibold text-foreground mb-1">First Name</label>
                  <input
                    type="text"
                    required
                    value={formData.first_name}
                    onChange={e => setFormData({ ...formData, first_name: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-emerald-500/50"
                    placeholder="John"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-foreground mb-1">Last Name</label>
                  <input
                    type="text"
                    required
                    value={formData.last_name}
                    onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                    className="w-full bg-background border border-border rounded-xl px-3 py-2 text-foreground focus:outline-none focus:border-emerald-500/50"
                    placeholder="Doe"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={formData.email}
                  onChange={e => {
                    setFormData({ 
                      ...formData, 
                      email: e.target.value,
                      username: formData.username || e.target.value.split('@')[0]
                    });
                    if (modalError) setModalError('');
                  }}
                  className={`w-full bg-background border rounded-xl px-3 py-2 text-foreground focus:outline-none ${
                    modalError.toLowerCase().includes('email') ? 'border-red-500 ring-1 ring-red-500' : 'border-border focus:border-emerald-500/50'
                  }`}
                  placeholder="admin@platform.com"
                />
                {modalError.toLowerCase().includes('email') && (
                  <p className="text-[11px] text-red-400 font-semibold mt-1 flex items-center gap-1">
                    <AlertCircle className="size-3" /> {modalError}
                  </p>
                )}
              </div>

              <div>
                <label className="block font-semibold text-foreground mb-1">Username</label>
                <input
                  type="text"
                  required
                  value={formData.username}
                  onChange={e => {
                    setFormData({ ...formData, username: e.target.value });
                    if (modalError) setModalError('');
                  }}
                  className={`w-full bg-background border rounded-xl px-3 py-2 text-foreground focus:outline-none ${
                    modalError.toLowerCase().includes('username') ? 'border-red-500 ring-1 ring-red-500' : 'border-border focus:border-emerald-500/50'
                  }`}
                  placeholder="superadmin_john"
                />
                {modalError.toLowerCase().includes('username') && (
                  <p className="text-[11px] text-red-400 font-semibold mt-1 flex items-center gap-1">
                    <AlertCircle className="size-3" /> {modalError}
                  </p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-foreground">Password</label>
                  <button
                    type="button"
                    onClick={() => {
                      const gen = 'SuperAdmin#' + Math.random().toString(36).slice(-6) + '!';
                      setFormData({ ...formData, password: gen });
                    }}
                    className="text-[10px] text-emerald-400 hover:underline font-semibold"
                  >
                    Auto-generate
                  </button>
                </div>
                <input
                  type="text"
                  required
                  value={formData.password}
                  onChange={e => setFormData({ ...formData, password: e.target.value })}
                  className="w-full bg-background border border-border rounded-xl px-3 py-2 font-mono text-foreground focus:outline-none focus:border-emerald-500/50"
                  placeholder="Set account password"
                />
              </div>

              <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-[11px] text-emerald-300 flex items-start gap-2 mt-2">
                <Mail className="size-4 text-emerald-400 shrink-0 mt-0.5" />
                <p>
                  Upon creation, an official welcome email containing the <strong>Login Portal URL (/login)</strong>, username, and password will be sent to the recipient's email address.
                </p>
              </div>

              <div className="flex justify-end gap-2 pt-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl border border-border text-foreground hover:bg-muted font-semibold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-foreground font-bold text-xs flex items-center gap-2 transition-all disabled:opacity-50 shadow-lg shadow-emerald-600/20"
                >
                  {submitting ? <Loader2 className="size-3.5 animate-spin" /> : <UserPlus className="size-3.5" />}
                  Create & Send Email
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

function SettingsPage() {
  const [activeTab, setActiveTab] = useState('general');

  const tabs = [
    { id: 'general', label: 'General', icon: Settings },
    { id: 'superadmins', label: 'Super Admins', icon: UserPlus },
    { id: 'security', label: 'Security', icon: Shield },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'profile', label: 'My Profile', icon: User },
  ];

  return (
    <div className="space-y-6 w-full">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Global Settings</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage platform configurations and your profile.</p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-8">
        <aside className="w-full lg:w-56 shrink-0">
          <nav className="space-y-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  "w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all",
                  activeTab === tab.id 
                    ? "bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold" 
                    : "text-muted-foreground hover:bg-card hover:text-foreground border border-transparent"
                )}
              >
                <tab.icon className={cn("size-4", activeTab === tab.id ? "text-emerald-400" : "text-muted-foreground")} />
                {tab.label}
              </button>
            ))}
          </nav>
        </aside>

        <main className="flex-1 bg-card/90 border border-border rounded-2xl p-6 lg:p-8 shadow-xl overflow-hidden">
          {activeTab === 'general' && <GeneralTab />}
          {activeTab === 'superadmins' && <SuperAdminsTab />}
          {activeTab === 'security' && <SecurityTab />}
          {activeTab === 'notifications' && <NotificationsTab />}
          {activeTab === 'profile' && <ProfileTab />}
        </main>
      </div>
    </div>
  );
}
