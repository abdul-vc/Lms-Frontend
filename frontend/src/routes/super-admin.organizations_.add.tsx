import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/auth';
import { BackButton } from '@/components/BackButton';

export const Route = createFileRoute('/super-admin/organizations_/add')({
  component: AddOrganizationPage,
});

function LogoUploadField({ value, onChange }: { value: string; onChange: (url: string) => void }) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = async (file: File) => {
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      setError('Logo must be under 2MB.');
      return;
    }
    setError(null);
    setUploading(true);
    const form = new FormData();
    form.append('logo', file);
    try {
      const res = await authFetch('http://127.0.0.1:8000/api/upload/org-logo/', {
        method: 'POST',
        body: form,
      });
      const data = await res.json();
      if (data.url) onChange(data.url);
      else setError(data.error || 'Upload failed.');
    } catch {
      setError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="block text-xs font-semibold text-foreground mb-1">Organization Logo</label>
      <div className="flex items-center gap-4 bg-background p-3 rounded-xl border border-border">
        {value ? (
          <img src={value} alt="Organization logo" className="size-14 rounded-lg object-cover border border-border" />
        ) : (
          <div className="size-14 rounded-lg bg-card border border-border grid place-items-center text-muted-foreground text-xs font-semibold">No logo</div>
        )}
        <div className="flex-1 space-y-1">
          <input
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="text-xs text-muted-foreground file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/20 file:text-emerald-400 hover:file:bg-emerald-500/30 cursor-pointer"
          />
          {uploading && <p className="text-xs text-emerald-400 font-semibold animate-pulse">Uploading logo...</p>}
          {error && <p className="text-xs text-red-400 font-medium">{error}</p>}
        </div>
      </div>
    </div>
  );
}

function AddOrganizationPage() {
  const navigate = useNavigate();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [plans, setPlans] = useState<any[]>([]);

  useEffect(() => {
    authFetch('http://127.0.0.1:8000/api/plans/')
      .then(res => res.json())
      .then(data => setPlans(data))
      .catch(err => console.error(err));
  }, []);

  const [formData, setFormData] = useState({
    name: '',
    status: 'Active',
    company_name: '',
    entity_name: '',
    site_location: '',
    country: '',
    region: '',
    state: '',
    city: '',
    zone: '',
    contact_name: '',
    contact_email: '',
    enable_white_label: false,
    sub_domain: '',
    plan_id: '',
    billing_cycle: 'Monthly',
    billing_term: '',
    rate: '',
    custom_limits: {
      users: '',
      courses: '',
      storage_gb: '',
    },
    payment_method: 'Invoice',
    primary_color: '#10b981',
    logo_url: '',
    fav_icon: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    if (type === 'checkbox') {
      const checked = (e.target as HTMLInputElement).checked;
      setFormData(prev => ({ ...prev, [name]: checked }));
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleCustomLimitChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      custom_limits: {
        ...prev.custom_limits,
        [field]: value,
      },
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const payload: any = {
        name: formData.name,
        company_name: formData.company_name,
        entity_name: formData.entity_name,
        site_location: formData.site_location,
        country: formData.country,
        region: formData.region,
        state: formData.state,
        city: formData.city,
        zone: formData.zone,
        contact_name: formData.contact_name,
        contact_email: formData.contact_email,
        status: formData.status,
        enable_white_label: formData.enable_white_label,
        sub_domain: formData.sub_domain || undefined,
        primary_color: formData.primary_color,
        logo_url: formData.logo_url,
        fav_icon: formData.fav_icon,
        solution_type: 'Enterprise',
        solution_for: 'Corporate',
      };

      if (formData.plan_id) {
        payload.plan_id = parseInt(formData.plan_id, 10);
      }
      if (formData.rate) {
        payload.rate = parseFloat(formData.rate);
      }
      if (formData.billing_term) {
        payload.billing_term = formData.billing_term;
      }
      if (formData.billing_cycle) {
        payload.billing_cycle = formData.billing_cycle.toLowerCase();
      }

      const res = await authFetch('http://127.0.0.1:8000/api/organizations/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || Object.values(data).flat().join(', ') || 'Failed to create organization.');
      }

      navigate({ to: '/super-admin/organizations' });
    } catch (err: any) {
      setError(err.message || 'Error creating organization.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <BackButton fallbackPath="/super-admin/organizations" />
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Create Organization</h1>
          <p className="text-sm text-muted-foreground mt-0.5">Onboard a new tenant to the platform.</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-950/40 text-red-300 p-4 rounded-xl text-xs font-medium border border-red-800/80">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        <div className="bg-card/90 border border-border rounded-2xl p-6 shadow-xl space-y-4">
          <h2 className="text-lg font-bold text-foreground border-b border-border pb-3">Basic Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Organization Name *</label>
              <input 
                type="text" 
                name="name" 
                required 
                value={formData.name} 
                onChange={handleChange} 
                placeholder="e.g. Acme Corp" 
                className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/50" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Status</label>
              <select 
                name="status" 
                value={formData.status} 
                onChange={handleChange} 
                className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50"
              >
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Initial Admin Email</label>
              <input 
                type="email" name="initial_admin_email" value={(formData as any).initial_admin_email || ''} onChange={handleChange}
                placeholder="admin@example.com" 
                className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/50" 
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Password</label>
              <input 
                type="password" name="initial_admin_password" value={(formData as any).initial_admin_password || ''} onChange={handleChange}
                placeholder="Secure password" 
                className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/50" 
              />
            </div>
          </div>
        </div>

        {/* Branding Options */}
        <section>
          <h2 className="text-lg font-bold text-foreground mb-4">Branding & Login Page</h2>
          <div className="bg-card/90 p-6 rounded-2xl border border-border shadow-xl space-y-6">
            <LogoUploadField 
              value={(formData as any).logo_url || ''} 
              onChange={(url) => setFormData(prev => ({ ...prev, logo_url: url }))} 
            />

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Logo URL (Or Paste Link)</label>
                <input 
                  type="url" name="logo_url" value={(formData as any).logo_url || ''} onChange={handleChange}
                  placeholder="https://example.com/logo.png" 
                  className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/50" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Primary Color</label>
                <div className="flex gap-2">
                  <input 
                    type="color" name="primary_color" value={(formData as any).primary_color || '#10b981'} onChange={handleChange}
                    className="h-9 w-12 rounded bg-background border border-border cursor-pointer" 
                  />
                  <input 
                    type="text" name="primary_color" value={(formData as any).primary_color || '#10b981'} onChange={handleChange}
                    className="flex-1 bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground uppercase font-mono focus:outline-none focus:border-emerald-500/50" 
                  />
                </div>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-foreground mb-1">Tagline</label>
                <input 
                  type="text" name="tagline" value={(formData as any).tagline || ''} onChange={handleChange}
                  placeholder="e.g. Excellence in Patient Care" 
                  className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/50" 
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-foreground mb-1">Welcome Message</label>
                <input 
                  type="text" name="login_welcome_message" value={(formData as any).login_welcome_message || ''} onChange={handleChange}
                  placeholder="e.g. Welcome back! Please sign in to continue." 
                  className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/50" 
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-semibold text-foreground mb-1">Login Hero Description</label>
                <textarea 
                  name="login_hero_description" value={(formData as any).login_hero_description || ''} onChange={handleChange} rows={2}
                  placeholder="Optional longer paragraph to show on the login page hero section." 
                  className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/50" 
                />
              </div>
            </div>
          </div>
        </section>

        {/* Advanced Options */}
        <section>
          <h2 className="text-lg font-bold text-foreground mb-4">Advanced Options</h2>
          <div className="bg-card/90 p-6 rounded-2xl border border-border shadow-xl space-y-4">
            <h3 className="text-sm font-bold text-foreground mb-2">White Label Platform</h3>
            
            <label className="flex items-center gap-2 cursor-pointer">
              <input type="checkbox" name="enable_white_label" checked={formData.enable_white_label} onChange={handleChange} className="rounded border-border bg-background text-emerald-500 focus:ring-emerald-500/50 size-4" />
              <span className="text-xs text-foreground font-medium">Enable white labeling</span>
            </label>

            {formData.enable_white_label && (
              <div className="pt-2">
                <label className="block text-xs font-semibold text-foreground mb-1">Sub - Domain</label>
                <input 
                  type="text" name="sub_domain" value={formData.sub_domain} onChange={handleChange}
                  placeholder="www.acme.workhub.com" 
                  className="w-full max-w-md bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/50" 
                />
              </div>
            )}
          </div>
        </section>

        {/* Billing Configuration */}
        <section>
          <h2 className="text-lg font-bold text-foreground mb-4">Billing Configuration</h2>
          <div className="bg-card/90 p-6 rounded-2xl border border-border shadow-xl grid grid-cols-2 md:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Solution Type</label>
              <select name="solution_type" value={formData.solution_type} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50">
                <option value="">-- Please choose an option --</option>
                <option value="Enterprise">Enterprise</option>
                <option value="Professional">Professional</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Solution For</label>
              <select name="solution_for" value={formData.solution_for} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50">
                <option value="">-- Please choose an option --</option>
                <option value="B2B">B2B</option>
                <option value="B2C">B2C</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Billing Term</label>
              <select name="billing_term" value={formData.billing_term} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50">
                <option value="">-- Please choose an option --</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 60">Net 60</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Rate of Billing</label>
              <input type="number" name="rate" value={formData.rate} onChange={handleChange} placeholder="Enter billing rate" className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/50" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Billing Cycle</label>
              <select name="billing_cycle" value={formData.billing_cycle} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50">
                <option value="">-- Please choose an option --</option>
                <option value="Monthly">Monthly</option>
                <option value="Annually">Annually</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Start Date</label>
              <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Project Duration</label>
              <select name="duration_type" value={formData.duration_type} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50">
                <option value="">-- Please choose an option --</option>
                <option value="6_months">6 Months</option>
                <option value="1_year">1 Year</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">End Date</label>
              <input type="date" name="end_date" value={formData.end_date} onChange={handleChange} disabled={formData.duration_type === '6_months' || formData.duration_type === '1_year'} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground disabled:opacity-50 focus:outline-none focus:border-emerald-500/50" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Billing Date</label>
              <input type="date" name="billing_date" value={formData.billing_date} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50" />
            </div>
          </div>
        </section>

        <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-background/90 backdrop-blur-md py-4 border-t border-border z-10">
          <Link 
            to="/super-admin/organizations" 
            className="px-6 py-2.5 bg-card text-foreground font-bold text-xs hover:bg-muted rounded-xl transition-colors border border-border"
          >
            Cancel
          </Link>
          <button 
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-foreground rounded-xl font-bold text-xs hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 disabled:opacity-60 disabled:cursor-not-allowed transition-all"
          >
            <Save className="size-4" />
            {saving ? 'Saving...' : 'Save Organization'}
          </button>
        </div>
      </form>
    </div>
  );
}
