import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { ArrowLeft, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { authFetch, API_BASE } from '@/lib/auth';
import { BackButton } from '@/components/BackButton';

export const Route = createFileRoute('/super-admin/sites_/add')({
  component: AddSitePage,
});

function AddSitePage() {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [features, setFeatures] = useState<any[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<Record<number, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  
  const [formData, setFormData] = useState({
    organization: '',
    name: '',
    url: '',
    site_code: '',
    product_type: '',
    country: '',
    location_address: '',
    activate_date: '',
    status: 'Active',
    contact_name: '',
    contact_phone: '',
    contact_email: '',
  });

  useEffect(() => {
    authFetch(`${API_BASE}/organizations/`)
      .then(res => res.json())
      .then(data => setOrganizations(Array.isArray(data) ? data : []))
      .catch(err => console.error(err));

    authFetch(`${API_BASE}/features/`)
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setFeatures(data);
          const initialSelected: Record<number, boolean> = {};
          data.forEach((f: any) => initialSelected[f.id] = f.is_active);
          setSelectedFeatures(initialSelected);
        }
      })
      .catch(err => console.error(err));
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target as any;
    const checked = type === 'checkbox' ? (e.target as HTMLInputElement).checked : undefined;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      const sanitizeUrl = (input: string) => {
        let val = input.trim();
        if (!val) return '';
        val = val.replace(/^https?:?\/*/, '');
        return val ? `https://${val}` : '';
      };

      const formattedUrl = sanitizeUrl(formData.url);

      const siteRes = await authFetch(`${API_BASE}/sites/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization: formData.organization ? parseInt(formData.organization, 10) : null,
          name: formData.name.trim(),
          url: formattedUrl || null,
          site_code: formData.site_code.trim() || null,
          product_type: formData.product_type || null,
          country: formData.country || null,
          location_address: formData.location_address || null,
          activate_date: formData.activate_date || null,
          status: formData.status || 'Active',
          contact_name: formData.contact_name || null,
          contact_phone: formData.contact_phone || null,
          contact_email: formData.contact_email || null,
        }),
      });

      if (!siteRes.ok) {
        const errData = await siteRes.json();
        let errMsg = 'Failed to create site.';
        if (errData.detail) {
          errMsg = errData.detail;
        } else if (typeof errData === 'object') {
          errMsg = Object.entries(errData)
            .map(([field, msgs]) => {
              const label = field.replace(/_/g, ' ');
              const msgList = Array.isArray(msgs) ? msgs.join(', ') : String(msgs);
              return `${label}: ${msgList}`;
            })
            .join(' | ');
        }
        throw new Error(errMsg);
      }

      const newSite = await siteRes.json();
      
      // Create SiteFeatureAccess records
      for (const [featureId, enabled] of Object.entries(selectedFeatures)) {
        if (enabled) {
          await authFetch(`${API_BASE}/site-feature-access/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              site: newSite.id,
              feature: parseInt(featureId, 10),
              enabled: true
            })
          }).catch(err => console.warn('Failed to set feature access:', err));
        }
      }
      
      navigate({ to: '/super-admin/sites' });
    } catch (err: any) {
      setError(err.message || 'Error creating site.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-6 w-full py-4">
      <BackButton to="/super-admin/sites" label="Back to Sites List" />
      <div className="flex items-center gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Add Site / Project</h1>
          <p className="text-sm text-muted-foreground mt-1">Create a new operational site and configure module access.</p>
        </div>
      </div>

      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-semibold">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Single Main Card Container for All Sections */}
        <div className="bg-card/90 p-6 sm:p-8 rounded-2xl border border-border shadow-xl space-y-8">
          
          {/* Site Details */}
          <section>
            <h2 className="text-lg font-bold text-foreground mb-4">Site Details</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Organization *</label>
                <select 
                  required name="organization" value={formData.organization} onChange={handleChange}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50"
                >
                  <option value="">Select Organization</option>
                  {organizations.map(org => (
                    <option key={org.id} value={org.id}>{org.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Site Name *</label>
                <input 
                  required type="text" name="name" value={formData.name} onChange={handleChange}
                  placeholder="e.g., Corporate HQ" 
                  className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/50" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">URL</label>
                <input 
                  type="url" name="url" value={formData.url} onChange={handleChange}
                  placeholder="e.g., https://site.example.com" 
                  className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/50" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Site Code</label>
                <input 
                  type="text" name="site_code" value={formData.site_code} onChange={handleChange}
                  placeholder="e.g., CHQ-001" 
                  className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/50" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Select Product Type</label>
                <select name="product_type" value={formData.product_type} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50">
                  <option value="">Select a product type</option>
                  <option value="LMS">LMS</option>
                  <option value="ERP">ERP</option>
                  <option value="HRIS">HRIS</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Country</label>
                <input 
                  type="text" name="country" value={formData.country} onChange={handleChange}
                  placeholder="Select or type country" 
                  className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/50" 
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-foreground mb-1">Location Address</label>
                <textarea 
                  name="location_address" value={formData.location_address} onChange={handleChange}
                  placeholder="Enter full address..." 
                  className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/50 min-h-[80px]" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Activate Date</label>
                <input 
                  type="date" name="activate_date" value={formData.activate_date} onChange={handleChange}
                  className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Status</label>
                <select name="status" value={formData.status} onChange={handleChange} className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground focus:outline-none focus:border-emerald-500/50">
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </select>
              </div>
            </div>
          </section>

          {/* Contact Person */}
          <section className="pt-6 border-t border-border/60">
            <h2 className="text-lg font-bold text-foreground mb-4">Contact Person</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Full Name</label>
                <input type="text" name="contact_name" value={formData.contact_name} onChange={handleChange} placeholder="John Doe" className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Phone Number</label>
                <input type="text" name="contact_phone" value={formData.contact_phone} onChange={handleChange} placeholder="+1 (555) 123-4567" className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/50" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-foreground mb-1">Email Address</label>
                <input type="email" name="contact_email" value={formData.contact_email} onChange={handleChange} placeholder="john.doe@example.com" className="w-full bg-background border border-border rounded-xl px-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/50" />
              </div>
            </div>
          </section>

          {/* Module Access */}
          <section className="pt-6 border-t border-border/60">
            <div className="mb-4">
              <h2 className="text-lg font-bold text-foreground">Module Access</h2>
              <p className="text-sm text-muted-foreground">Manage which modules are active for this site.</p>
            </div>
            
            <div className="rounded-2xl border border-border overflow-hidden divide-y divide-border/50">
              <div className="p-4 bg-background/60 border-b border-border flex justify-between items-center">
                <span className="font-semibold text-xs text-foreground">Select All</span>
                <input type="checkbox" className="rounded border-border bg-background text-emerald-500 focus:ring-emerald-500/50 size-4" />
              </div>

              <div className="p-6">
                <h3 className="font-bold text-foreground mb-4">Platform Features</h3>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {features.map((feature: any) => (
                    <ModuleToggle 
                      key={feature.id}
                      name={`feature_${feature.id}`} 
                      label={feature.name} 
                      checked={!!selectedFeatures[feature.id]} 
                      onChange={(e: any) => setSelectedFeatures({
                        ...selectedFeatures,
                        [feature.id]: e.target.checked
                      })} 
                    />
                  ))}
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <Link
            to="/super-admin/sites"
            className="px-5 py-2.5 bg-card text-foreground rounded-xl border border-border font-semibold text-xs hover:bg-muted transition-colors"
          >
            Cancel
          </Link>
          <button
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-foreground rounded-xl font-bold text-xs hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 transition-all"
          >
            <Save className="size-4" />
            {saving ? 'Creating Site...' : 'Create Site'}
          </button>
        </div>
      </form>
    </div>
  );
}

function ModuleToggle({ name, label, checked, onChange }: { name: string, label: string, checked: boolean, onChange: any }) {
  return (
    <div className="flex items-center justify-between p-3 border border-border rounded-xl bg-background">
      <div className="text-xs font-semibold text-foreground">{label}</div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" name={name} checked={checked} onChange={onChange} className="sr-only peer" />
        <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-border after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
      </label>
    </div>
  );
}

function ToggleField({ label, description }: { label: string; description: string }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border/50">
      <div>
        <div className="text-xs font-semibold text-foreground">{label}</div>
        <div className="text-xs text-muted-foreground">{description}</div>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input type="checkbox" className="sr-only peer" defaultChecked />
        <div className="w-9 h-5 bg-muted peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-border after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-border after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-emerald-600"></div>
      </label>
    </div>
  );
}
