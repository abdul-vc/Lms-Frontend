import { createFileRoute, Link, useNavigate, useParams } from '@tanstack/react-router';
import { ArrowLeft, Save, Eye, EyeOff, KeyRound } from 'lucide-react';
import { useState, useEffect } from 'react';
import { authFetch, API_BASE } from '@/lib/auth';
import { ComplianceBadgeListEditor } from '@/components/ComplianceBadgeListEditor';
import { BackButton } from '@/components/BackButton';

export const Route = createFileRoute('/super-admin/organizations_/$orgId_/edit')({
  component: EditOrganizationPage,
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
      const res = await authFetch(`${API_BASE}/upload/org-logo/`, {
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

function EditOrganizationPage() {
  const { orgId } = useParams({ from: '/super-admin/organizations_/$orgId_/edit' });
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [plans, setPlans] = useState<any[]>([]);
  const [billingId, setBillingId] = useState<number | null>(null);
  const [adminUserId, setAdminUserId] = useState<number | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [resettingPassword, setResettingPassword] = useState(false);
  const [resetSuccess, setResetSuccess] = useState('');

  const [formData, setFormData] = useState({
    // 1. General Information
    name: '',
    status: '',
    company_name: '',
    entity_name: '',
    company_address: '',
    country: '',
    region: '',
    state: '',
    city: '',
    zone: '',

    // 2. Contact Person
    contact_name: '',
    contact_email: '',
    contact_phone: '',

    // 3. Login Credentials
    initial_admin_email: '',
    initial_admin_password: '',

    // 4. White Labeling Configuration
    enable_white_label: false,
    sub_domain: '',

    // 5. Branding
    logo_url: '',
    primary_color: '#10b981',
    tagline: '',
    login_hero_description: '',
    login_welcome_message: '',
    compliance_badges: [] as string[],

    // 6. Billing Information
    solution_type: '',
    solution_for: '',
    plan: '',
    billing_term: '',
    rate: '',
    billing_cycle: '',
    duration_type: '',
    start_date: '',
    end_date: '',
    billing_date: '',
  });

  useEffect(() => {
    if (orgId) {
      setLoading(true);
      Promise.all([
        authFetch(`${API_BASE}/organizations/${orgId}/`).then(res => res.json()),
        authFetch(`${API_BASE}/billing/?organization=${orgId}`)
          .then(res => res.json())
          .then(data => (Array.isArray(data) && data.length > 0 ? data[0] : null))
          .catch(() => null),
        authFetch(`${API_BASE}/plans/`).then(r => r.json()),
        authFetch(`${API_BASE}/users/?organization=${orgId}`)
          .then(res => res.json())
          .then(data => {
            const arr = Array.isArray(data) ? data : (data.results || []);
            const orgIntId = parseInt(orgId, 10);
            const tenantAdmin = arr.find((u: any) => !u.is_platform_super_admin && u.organization === orgIntId);
            return tenantAdmin || arr.find((u: any) => !u.is_platform_super_admin) || null;
          })
          .catch(() => null)
      ]).then(([orgData, billingData, plansData, userData]) => {
        setPlans(Array.isArray(plansData) ? plansData : []);
        const b = billingData || orgData.billing || {};
        
        if (userData) {
          setAdminUserId(userData.id);
        }

        setFormData(prev => ({
          ...prev,
          name: orgData.name || '',
          status: orgData.status || '',
          company_name: orgData.company_name || '',
          entity_name: orgData.entity_name || '',
          company_address: orgData.company_address || '',
          country: orgData.country || '',
          region: orgData.region || '',
          state: orgData.state || '',
          city: orgData.city || '',
          zone: orgData.zone || '',
          contact_name: orgData.contact_name || '',
          contact_email: orgData.contact_email || '',
          contact_phone: orgData.contact_phone || '',
          initial_admin_email: userData ? (userData.email || userData.username) : (orgData.contact_email || ''),
          initial_admin_password: '',
          enable_white_label: Boolean(orgData.subdomain_routing_enabled || orgData.sub_domain),
          sub_domain: orgData.sub_domain || '',
          logo_url: orgData.logo_url || '',
          primary_color: orgData.primary_color || '#10b981',
          tagline: orgData.tagline || '',
          login_hero_description: orgData.login_hero_description || '',
          login_welcome_message: orgData.login_welcome_message || '',
          compliance_badges: Array.isArray(orgData.compliance_badges) ? orgData.compliance_badges : [],
          solution_type: b.solution_type || orgData.solution_type || '',
          solution_for: b.solution_for || orgData.solution_for || '',
          plan: b.plan ? String(b.plan.id || b.plan) : '',
          billing_term: b.billing_term || '',
          rate: b.rate !== undefined && b.rate !== null ? String(b.rate) : '',
          billing_cycle: b.billing_cycle || '',
          duration_type: b.duration_type || '',
          start_date: b.start_date || '',
          end_date: b.end_date || '',
          billing_date: b.billing_date || '',
        }));

        if (b.id) {
          setBillingId(b.id);
        }
        setLoading(false);
      }).catch(err => {
        console.error(err);
        setLoading(false);
      });
    }
  }, [orgId]);

const CYCLE_MONTH_MAP: Record<string, number> = {
  monthly: 1,
  bimonthly: 2,
  quarterly: 3,
  semi_annually: 6,
  yearly: 12,
  annually: 12,
};

const DURATION_MONTH_MAP: Record<string, number> = {
  '6_months': 6,
  '1_year': 12,
  '2_years': 24,
};

function addMonthsToIsoDate(isoDateStr: string, monthsToAdd: number): string {
  if (!isoDateStr || monthsToAdd <= 0) return '';
  const [yyyy, mm, dd] = isoDateStr.split('-').map(Number);
  if (!yyyy || !mm || !dd) return '';

  const totalMonths = (mm - 1) + monthsToAdd;
  const newYear = yyyy + Math.floor(totalMonths / 12);
  const newMonthIndex = ((totalMonths % 12) + 12) % 12;

  const maxDaysInTargetMonth = new Date(newYear, newMonthIndex + 1, 0).getDate();
  const targetDay = Math.min(dd, maxDaysInTargetMonth);

  const formattedY = String(newYear).padStart(4, '0');
  const formattedM = String(newMonthIndex + 1).padStart(2, '0');
  const formattedD = String(targetDay).padStart(2, '0');

  return `${formattedY}-${formattedM}-${formattedD}`;
}

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;

    setFormData(prev => {
      const next = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value,
      };

      if ((name === 'duration_type' || name === 'start_date') && next.start_date) {
        const months = DURATION_MONTH_MAP[next.duration_type];
        if (months) {
          next.end_date = addMonthsToIsoDate(next.start_date, months);
        } else if (next.duration_type === 'custom' && name === 'duration_type') {
          next.end_date = '';
        }
      }

      if ((name === 'billing_cycle' || name === 'start_date') && next.start_date) {
        const cycleKey = (next.billing_cycle || '').toLowerCase();
        const cycleMonths = CYCLE_MONTH_MAP[cycleKey];
        if (cycleMonths) {
          next.billing_date = addMonthsToIsoDate(next.start_date, cycleMonths);
        } else if (!next.billing_cycle) {
          next.billing_date = next.start_date;
        }
      }

      return next;
    });
  };

  const handleResetPassword = async () => {
    if (!formData.initial_admin_password) {
      setError('Please enter a new password in the password field to reset.');
      return;
    }
    setResettingPassword(true);
    setError('');
    setResetSuccess('');
    try {
      if (adminUserId) {
        const res = await authFetch(`${API_BASE}/users/${adminUserId}/`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            password: formData.initial_admin_password,
            email: formData.initial_admin_email || undefined,
            username: formData.initial_admin_email || undefined,
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(JSON.stringify(data));
        }
      } else {
        const res = await authFetch(`${API_BASE}/users/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            organization: parseInt(orgId, 10),
            username: formData.initial_admin_email || formData.contact_email || `admin_${orgId}`,
            email: formData.initial_admin_email || formData.contact_email || `admin_${orgId}@lms.com`,
            password: formData.initial_admin_password,
            first_name: formData.contact_name || formData.name,
            is_active: true
          }),
        });
        if (!res.ok) {
          const data = await res.json();
          throw new Error(JSON.stringify(data));
        }
        const newUser = await res.json();
        setAdminUserId(newUser.id);
      }
      setResetSuccess('Password updated successfully!');
    } catch (err: any) {
      setError(`Failed to reset password: ${err.message}`);
    } finally {
      setResettingPassword(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const orgRes = await authFetch(`${API_BASE}/organizations/${orgId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          company_name: formData.company_name,
          entity_name: formData.entity_name,
          status: formData.status || 'Active',
          company_address: formData.company_address,
          country: formData.country,
          region: formData.region,
          state: formData.state,
          city: formData.city,
          zone: formData.zone,
          contact_name: formData.contact_name,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
          subdomain_routing_enabled: formData.enable_white_label,
          sub_domain: formData.enable_white_label ? formData.sub_domain : '',
          logo_url: formData.logo_url,
          primary_color: formData.primary_color,
          tagline: formData.tagline,
          login_hero_description: formData.login_hero_description,
          login_welcome_message: formData.login_welcome_message,
          compliance_badges: formData.compliance_badges,
          solution_type: formData.solution_type || null,
          solution_for: formData.solution_for || null,
        }),
      });

      if (!orgRes.ok) {
        const errData = await orgRes.json();
        setError(`Failed to save organization: ${JSON.stringify(errData)}`);
        setSaving(false);
        return;
      }

      const billingUrl = billingId 
        ? `${API_BASE}/billing/${billingId}/`
        : `${API_BASE}/billing/`;
      const method = billingId ? 'PATCH' : 'POST';
      
      const billingRes = await authFetch(billingUrl, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization: orgId,
          plan: formData.plan ? parseInt(formData.plan, 10) : null,
          solution_type: formData.solution_type || null,
          solution_for: formData.solution_for || null,
          billing_term: formData.billing_term || null,
          rate: formData.rate ? parseFloat(formData.rate) : 0,
          billing_cycle: formData.billing_cycle || null,
          duration_type: formData.duration_type || null,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          billing_date: formData.billing_date || null,
        }),
      });

      if (!billingRes.ok) {
        const billingErr = await billingRes.json();
        console.warn('Billing save warning:', billingErr);
      }

      // If user password was filled in, update user account
      if (formData.initial_admin_password) {
        await handleResetPassword();
      }

      navigate({ to: '/super-admin/organizations/$orgId', params: { orgId } });
    } catch (err: any) {
      const isNetworkError = err instanceof TypeError && err.message === 'Failed to fetch';
      if (isNetworkError) {
        setError('Cannot connect to backend server. Please verify Django server is running.');
      } else {
        setError(`Unexpected error: ${err.message}`);
      }
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground font-medium">Loading organization data...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-4">
      <BackButton to="/super-admin/organizations" label="Back to Organizations" />
      <div className="flex items-center gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Edit Organization</h1>
          <p className="text-sm text-muted-foreground mt-1">Update organization profile, billing details, and domain configuration.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-950/60 border border-red-800/80 text-red-400 rounded-xl text-xs font-medium">
          {error}
        </div>
      )}

      {resetSuccess && (
        <div className="p-4 bg-emerald-950/60 border border-emerald-800/80 text-emerald-300 rounded-xl text-xs font-medium">
          {resetSuccess}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8" autoComplete="off">
        {/* 1. General Information */}
        <section>
          <h2 className="text-lg font-bold text-foreground mb-4">General Information</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-card/90 p-6 rounded-2xl border border-border shadow-xl">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Organization Name *</label>
              <input 
                required
                type="text" 
                name="name"
                value={formData.name}
                onChange={handleChange}
                placeholder="e.g., Acme Corporation" 
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
                <option value="">-- Please choose an option --</option>
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Company Name</label>
              <input type="text" name="company_name" value={formData.company_name} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Entity Name</label>
              <input type="text" name="entity_name" value={formData.entity_name} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50" />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-semibold text-foreground mb-1">Company Address</label>
              <input type="text" name="company_address" value={formData.company_address} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Country</label>
              <input type="text" name="country" value={formData.country} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Region</label>
              <input type="text" name="region" value={formData.region} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">State / Province</label>
              <input type="text" name="state" value={formData.state} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">City</label>
              <input type="text" name="city" value={formData.city} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Zone</label>
              <input type="text" name="zone" value={formData.zone} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50" />
            </div>
          </div>
        </section>

        {/* 2. Contact Person */}
        <section>
          <h2 className="text-lg font-bold text-foreground mb-4">Contact Person</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-card/90 p-6 rounded-2xl border border-border shadow-xl">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Full Name</label>
              <input type="text" name="contact_name" value={formData.contact_name} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Email Address</label>
              <input type="email" name="contact_email" value={formData.contact_email} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Phone Number</label>
              <input type="text" name="contact_phone" value={formData.contact_phone} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50" />
            </div>
          </div>
        </section>

        {/* 3. Login Credentials */}
        <section>
          <h2 className="text-lg font-bold text-foreground mb-1">Login Credentials</h2>
          <p className="text-sm text-muted-foreground mb-4">Administrator login credentials for this organization.</p>
          <div className="bg-card/90 p-6 rounded-2xl border border-border shadow-xl space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Initial Admin Email / Username</label>
                <input 
                  type="email"
                  name="initial_admin_email"
                  value={formData.initial_admin_email}
                  onChange={handleChange}
                  autoComplete="off"
                  placeholder="admin@example.com" 
                  className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/50" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Password</label>
                <div className="relative">
                  <input 
                    type={showPassword ? "text" : "password"} 
                    name="initial_admin_password" 
                    value={formData.initial_admin_password} 
                    onChange={handleChange}
                    autoComplete="new-password"
                    placeholder="Enter new password to update" 
                    className="w-full bg-background border border-border rounded-xl pl-4 pr-10 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/50" 
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors p-1"
                    title={showPassword ? "Hide password" : "Show password"}
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Reset Password Action Directly Below Password Field */}
            <div className="pt-2 flex items-center gap-3 border-t border-border/60">
              <button
                type="button"
                onClick={handleResetPassword}
                disabled={resettingPassword}
                className="px-4 py-2 bg-emerald-600/20 text-emerald-400 hover:bg-emerald-600/30 rounded-xl text-xs font-bold border border-emerald-500/30 transition-all flex items-center gap-2 disabled:opacity-50 cursor-pointer"
              >
                <KeyRound className="size-3.5" />
                {resettingPassword ? 'Updating Password...' : 'Reset Password'}
              </button>
              <span className="text-xs text-muted-foreground">Clicking Reset Password immediately updates the organization's admin login credentials.</span>
            </div>
          </div>
        </section>

        {/* 4. White Labeling Configuration */}
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-foreground">White Labeling Configuration</h2>
            <p className="text-sm text-muted-foreground">Configure custom domain mapping for this organization.</p>
          </div>
          
          <div className="bg-card/90 p-6 rounded-2xl border border-border shadow-xl">
            <div className="flex items-center gap-3 mb-4">
              <label className="relative inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  name="enable_white_label"
                  checked={formData.enable_white_label}
                  onChange={handleChange}
                  className="sr-only peer" 
                />
                <div className="w-11 h-6 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-border after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600"></div>
              </label>
              <span className="text-xs font-semibold text-foreground">Enable Sub-domain Routing</span>
            </div>

            {formData.enable_white_label && (
              <div className="space-y-4 pt-2">
                <div>
                  <label className="block text-xs font-semibold text-foreground mb-1">Subdomain Slug</label>
                  <div className="flex items-center gap-2">
                    <input 
                      type="text" 
                      name="sub_domain" 
                      value={formData.sub_domain} 
                      onChange={handleChange} 
                      placeholder="acme" 
                      className="flex-1 bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50" 
                    />
                    <span className="text-xs text-muted-foreground font-mono">.lamsportal.com</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* 5. Branding */}
        <section>
          <h2 className="text-lg font-bold text-foreground mb-1">Branding</h2>
          <p className="text-sm text-muted-foreground mb-4">
            Controls what this organization's employees see on their branded login page
            ({window.location.origin}/login/{formData.sub_domain || '...'}).
          </p>
          <div className="bg-card/90 p-6 rounded-2xl border border-border shadow-xl space-y-6">
            <LogoUploadField
              value={formData.logo_url}
              onChange={(url) => setFormData(prev => ({ ...prev, logo_url: url }))}
            />

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Primary Color</label>
                <div className="flex items-center gap-3">
                  <input 
                    type="color" 
                    name="primary_color" 
                    value={formData.primary_color} 
                    onChange={handleChange} 
                    className="size-10 rounded-xl border border-border cursor-pointer bg-background" 
                  />
                  <input 
                    type="text" 
                    name="primary_color" 
                    value={formData.primary_color} 
                    onChange={handleChange} 
                    className="w-32 bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground font-mono uppercase focus:outline-none focus:border-emerald-500/50" 
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Tagline</label>
                <input 
                  type="text" name="tagline" value={formData.tagline} onChange={handleChange}
                  placeholder="e.g. Excellence in patient care." 
                  className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/50" 
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Login Hero Description</label>
              <textarea 
                name="login_hero_description" value={formData.login_hero_description} onChange={handleChange} rows={3}
                placeholder="Optional — shown under the tagline. Leave blank to omit." 
                className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/50" 
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Login Welcome Message</label>
              <input 
                type="text" name="login_welcome_message" value={formData.login_welcome_message} onChange={handleChange}
                placeholder="Leave blank to use the platform default" 
                className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/50" 
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Compliance Badges</label>
              <ComplianceBadgeListEditor
                value={formData.compliance_badges}
                onChange={(badges) => setFormData(prev => ({ ...prev, compliance_badges: badges }))}
              />
            </div>
          </div>
        </section>

        {/* 6. Billing Information */}
        <section>
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground">Billing Information</h2>
              <p className="text-sm text-muted-foreground">Configure subscription and billing details.</p>
            </div>
          </div>

          <div className="bg-card/90 p-6 rounded-2xl border border-border shadow-xl grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Solution Type</label>
              <select name="solution_type" value={formData.solution_type} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50">
                <option value="">-- Please choose an option --</option>
                <option value="SaaS">SaaS Cloud</option>
                <option value="On-Premise">On-Premise</option>
                <option value="Hybrid">Hybrid</option>
                <option value="Enterprise">Enterprise</option>
                <option value="Professional">Professional</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Solution For</label>
              <select name="solution_for" value={formData.solution_for} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50">
                <option value="">-- Please choose an option --</option>
                <option value="B2B">B2B</option>
                <option value="B2C">B2C</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Billing Term</label>
              <select name="billing_term" value={formData.billing_term} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50">
                <option value="">-- Please choose an option --</option>
                <option value="Net 30">Net 30</option>
                <option value="Net 60">Net 60</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Rate (₹)</label>
              <input type="number" name="rate" value={formData.rate} onChange={handleChange} placeholder="0.00" className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Billing Cycle</label>
              <select name="billing_cycle" value={formData.billing_cycle} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50">
                <option value="">-- Please choose an option --</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Annually</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Start Date</label>
              <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50" />
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
              <input type="date" name="end_date" value={formData.end_date} onChange={handleChange} disabled={formData.duration_type === '6_months' || formData.duration_type === '1_year'} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground disabled:opacity-50 focus:outline-none focus:border-emerald-500/50" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Billing Date</label>
              <input type="date" name="billing_date" value={formData.billing_date} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50" />
            </div>
          </div>
        </section>

        <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-background/90 backdrop-blur-md py-4 border-t border-border z-10">
          <Link 
            to="/super-admin/organizations/$orgId"
            params={{ orgId }}
            className="px-6 py-2.5 text-foreground font-semibold text-xs hover:bg-muted bg-card rounded-xl transition-colors border border-border"
          >
            Cancel
          </Link>
          <button 
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-foreground rounded-xl font-bold text-xs hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
          >
            {saving ? (
              <span className="w-4 h-4 border-2 border-border/30 border-t-white rounded-full animate-spin" />
            ) : (
              <Save className="size-4" />
            )}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
