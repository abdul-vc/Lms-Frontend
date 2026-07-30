import { createFileRoute, Link, useNavigate, useParams } from '@tanstack/react-router';
import { ArrowLeft, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/auth';
import { ComplianceBadgeListEditor } from '@/components/ComplianceBadgeListEditor';
import { BackButton } from '@/components/BackButton';

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
      <div className="flex items-center gap-4">
        {value ? (
          <img src={value} alt="Organization logo" className="size-16 rounded-lg object-cover border border-border" />
        ) : (
          <div className="size-16 rounded-lg bg-muted grid place-items-center text-muted-foreground text-xs">No logo</div>
        )}
        <div>
          <input
            type="file"
            accept="image/*"
            disabled={uploading}
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
            className="text-sm"
          />
          {uploading && <p className="text-xs text-muted-foreground mt-1">Uploading...</p>}
          {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
        </div>
      </div>
    </div>
  );
}

export const Route = createFileRoute('/super-admin/organizations_/$orgId_/edit')({
  component: EditOrganizationPage,
});

function EditOrganizationPage() {
  const navigate = useNavigate();
  const { orgId } = useParams({ strict: false }) as any;
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [billingId, setBillingId] = useState<number | null>(null);
  const [plans, setPlans] = useState<any[]>([]);

  const [formData, setFormData] = useState({
    // General
    name: '',
    status: 'Active',
    // Company details
    company_name: '',
    entity_name: '',
    site_location: '',
    country: '',
    region: '',
    state: '',
    city: '',
    zone: '',
    // Contact
    contact_name: '',
    contact_email: '',
    contact_phone: '',
    company_address: '',
    // Advanced
    enable_white_label: false,
    sub_domain: '',
    // Branding
    logo_url: '',
    primary_color: '',
    tagline: '',
    login_hero_description: '',
    login_welcome_message: '',
    compliance_badges: [] as string[],
    // Billing
    plan: '',
    solution_type: '',
    solution_for: '',
    billing_term: '',
    rate: '',
    billing_cycle: '',
    start_date: '',
    duration_type: '',
    end_date: '',
    billing_date: '',
  });

  useEffect(() => {
    if (orgId) {
      Promise.all([
        authFetch(`http://127.0.0.1:8000/api/organizations/${orgId}/`).then(res => res.json()),
        authFetch(`http://127.0.0.1:8000/api/billing/?organization=${orgId}`)
          .then(res => res.json())
          .then(data => (Array.isArray(data) && data.length > 0 ? data[0] : null))
          .catch(() => null),
        authFetch('http://127.0.0.1:8000/api/plans/').then(r => r.json())
      ]).then(([orgData, billingData, plansData]) => {
        setPlans(Array.isArray(plansData) ? plansData : []);
        const b = billingData || orgData.billing || {};
        setFormData(prev => ({
          ...prev,
          name: orgData.name || '',
          status: orgData.status || 'Active',
          company_name: orgData.company_name || '',
          entity_name: orgData.entity_name || '',
          country: orgData.country || '',
          region: orgData.region || '',
          state: orgData.state || '',
          city: orgData.city || '',
          zone: orgData.zone || '',
          contact_name: orgData.contact_name || '',
          contact_email: orgData.contact_email || '',
          contact_phone: orgData.contact_phone || '',
          company_address: orgData.company_address || '',
          subdomain_routing_enabled: orgData.subdomain_routing_enabled ?? true,
          enable_white_label: !!orgData.sub_domain,
          sub_domain: orgData.sub_domain || '',
          logo_url: orgData.logo_url || '',
          primary_color: orgData.primary_color || '',
          tagline: orgData.tagline || '',
          login_hero_description: orgData.login_hero_description || '',
          login_welcome_message: orgData.login_welcome_message || '',
          compliance_badges: orgData.compliance_badges || [],
          plan: b.plan ? b.plan.toString() : '',
          solution_type: b.solution_type || '',
          solution_for: b.solution_for || '',
          billing_term: b.billing_term || '',
          rate: b.rate !== undefined && b.rate !== null ? b.rate.toString() : '',
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    setFormData(prev => {
      const next = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };
      
      if ((name === 'duration_type' || name === 'start_date') && next.start_date) {
        if (next.duration_type === '6_months' || next.duration_type === '1_year') {
          const d = new Date(next.start_date);
          if (next.duration_type === '6_months') {
            d.setMonth(d.getMonth() + 6);
          } else if (next.duration_type === '1_year') {
            d.setFullYear(d.getFullYear() + 1);
          }
          next.end_date = d.toISOString().split('T')[0];
        } else if (next.duration_type === 'custom' && name === 'duration_type') {
          next.end_date = '';
        }
      }
      return next;
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');

    try {
      const orgRes = await authFetch(`http://127.0.0.1:8000/api/organizations/${orgId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          company_name: formData.company_name,
          entity_name: formData.entity_name,
          status: formData.status,
          country: formData.country,
          region: formData.region,
          state: formData.state,
          city: formData.city,
          zone: formData.zone,
          sub_domain: formData.enable_white_label ? formData.sub_domain : '',
          contact_name: formData.contact_name,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
          company_address: formData.company_address,
          logo_url: formData.logo_url,
          primary_color: formData.primary_color,
          tagline: formData.tagline,
          login_hero_description: formData.login_hero_description,
          login_welcome_message: formData.login_welcome_message,
          compliance_badges: formData.compliance_badges,
        }),
      });

      if (!orgRes.ok) {
        const errData = await orgRes.json();
        setError(`Failed to save organization: ${JSON.stringify(errData)}`);
        setSaving(false);
        return;
      }

      // Handle billing
      // Always attempt to save billing configuration
      const billingUrl = billingId 
        ? `http://127.0.0.1:8000/api/billing/${billingId}/`
        : 'http://127.0.0.1:8000/api/billing/';
      const method = billingId ? 'PATCH' : 'POST';
      
      const billingRes = await authFetch(billingUrl, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization: orgId,
          plan: formData.plan ? parseInt(formData.plan) : null,
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
        setError(`Failed to save billing: ${JSON.stringify(billingErr)}`);
        setSaving(false);
        return;
      }

      navigate({ to: '/super-admin/organizations/$orgId', params: { orgId } });
    } catch (err: any) {
      const isNetworkError = err instanceof TypeError && err.message === 'Failed to fetch';
      if (isNetworkError) {
        setError('Cannot connect to the backend server. Please start your Django server: open a terminal, go to your backend folder, activate venv, and run: python manage.py runserver');
      } else {
        setError(`Unexpected error: ${err.message}`);
      }
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading organization data...</div>;
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

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* General Information */}
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
                <option value="Active">Active</option>
                <option value="Inactive">Inactive</option>
                <option value="Suspended">Suspended</option>
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
          </div>
        </section>

        {/* Contact Person */}
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

        {/* White Labeling Configuration */}
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
              <LogoUploadField
                value={formData.logo_url}
                onChange={(url) => setFormData(prev => ({ ...prev, logo_url: url }))}
              />
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Primary Color (Hex)</label>
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
                    className="w-32 bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground font-mono uppercase" 
                  />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Branding */}
        <section className="border-t border-border pt-6 mt-6">
          <h3 className="font-bold text-foreground mb-1">Branding</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Controls what this organization's employees see on their branded login page
            ({window.location.origin}/login/{formData.sub_domain || '...'}).
          </p>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-foreground mb-1">Logo</label>
            <LogoUploadField
              value={formData.logo_url}
              onChange={(url) => setFormData({ ...formData, logo_url: url })}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 mb-4">
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Primary Color</label>
              <div className="flex items-center gap-2">
                <input type="color" value={formData.primary_color || '#4f46e5'}
                       onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                       className="h-10 w-14 rounded-xl border border-border bg-background" />
                <input type="text" value={formData.primary_color}
                       onChange={(e) => setFormData({ ...formData, primary_color: e.target.value })}
                       placeholder="#4f46e5"
                       className="flex-1 bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground font-mono" />
              </div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Tagline</label>
              <input type="text" name="tagline" value={formData.tagline} onChange={handleChange}
                     placeholder="e.g. Excellence in patient care."
                     className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground" />
            </div>
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-foreground mb-1">Login Hero Description</label>
            <textarea name="login_hero_description" value={formData.login_hero_description} onChange={handleChange}
                      rows={3} placeholder="Optional — shown under the tagline. Leave blank to omit."
                      className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground" />
          </div>

          <div className="mb-4">
            <label className="block text-xs font-semibold text-foreground mb-1">Login Welcome Message</label>
            <input type="text" name="login_welcome_message" value={formData.login_welcome_message} onChange={handleChange}
                   placeholder="Leave blank to use the platform default"
                   className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground" />
          </div>

          <div>
            <label className="block text-xs font-semibold text-foreground mb-1">Compliance Badges</label>
            <ComplianceBadgeListEditor
              value={formData.compliance_badges}
              onChange={(badges) => setFormData({ ...formData, compliance_badges: badges })}
            />
          </div>
        </section>

        {/* Billing Information */}
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
              <select name="solution_type" value={formData.solution_type} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground">
                <option value="">Select type</option>
                <option value="SaaS">SaaS Cloud</option>
                <option value="On-Premise">On-Premise</option>
                <option value="Hybrid">Hybrid</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Billing Cycle</label>
              <select name="billing_cycle" value={formData.billing_cycle} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground">
                <option value="">Select cycle</option>
                <option value="monthly">Monthly</option>
                <option value="quarterly">Quarterly</option>
                <option value="yearly">Annually</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Rate (₹)</label>
              <input type="number" name="rate" value={formData.rate} onChange={handleChange} placeholder="0.00" className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Start Date</label>
              <input type="date" name="start_date" value={formData.start_date} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">Project Duration</label>
              <select name="duration_type" value={formData.duration_type} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-3 py-2 text-xs text-foreground">
                <option value="">-- Please choose an option --</option>
                <option value="6_months">6 Months</option>
                <option value="1_year">1 Year</option>
                <option value="custom">Custom</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-foreground mb-1">End Date</label>
              <input type="date" name="end_date" value={formData.end_date} onChange={handleChange} disabled={formData.duration_type === '6_months' || formData.duration_type === '1_year'} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground disabled:opacity-50" />
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
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-foreground rounded-xl font-bold text-xs hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-70 disabled:cursor-not-allowed"
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
