import { createFileRoute, Link, useNavigate, useParams } from '@tanstack/react-router';
import { ArrowLeft, Save } from 'lucide-react';
import { useState, useEffect } from 'react';
import { authFetch, API_BASE } from '@/lib/auth';
import { BackButton } from '@/components/BackButton';

export const Route = createFileRoute('/super-admin/sites_/$siteId_/edit')({
  component: EditSitePage,
});

function EditSitePage() {
  const { siteId } = useParams({ from: '/super-admin/sites_/$siteId_/edit' });
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [features, setFeatures] = useState<any[]>([]);
  const [selectedFeatures, setSelectedFeatures] = useState<Record<number, boolean>>({});
  const [siteFeatureAccessIds, setSiteFeatureAccessIds] = useState<Record<number, number>>({});
  const [loading, setLoading] = useState(true);
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
  }, []);

  useEffect(() => {
    if (siteId) {
      Promise.all([
        authFetch(`${API_BASE}/sites/${siteId}/`).then(r => r.json()),
        authFetch(`${API_BASE}/features/`).then(r => r.json()),
        authFetch(`${API_BASE}/site-feature-access/`).then(r => r.json())
      ])
      .then(([siteData, featuresData, accessData]) => {
        setFormData(prev => ({
          ...prev,
          organization: siteData.organization || '',
          name: siteData.name || '',
          url: siteData.url || '',
          site_code: siteData.site_code || '',
          product_type: siteData.product_type || '',
          country: siteData.country || '',
          location_address: siteData.location_address || '',
          activate_date: siteData.activate_date || '',
          status: siteData.status || 'Active',
          contact_name: siteData.contact_name || '',
          contact_phone: siteData.contact_phone || '',
          contact_email: siteData.contact_email || '',
        }));
        
        const featArr = Array.isArray(featuresData) ? featuresData : [];
        setFeatures(featArr);
        
        const accArr = Array.isArray(accessData) ? accessData : [];
        const siteAccess = accArr.filter((a: any) => a.site === parseInt(siteId, 10));
        const initialSelected: Record<number, boolean> = {};
        const accessIds: Record<number, number> = {};
        
        siteAccess.forEach((a: any) => {
          initialSelected[a.feature] = a.enabled;
          accessIds[a.feature] = a.id;
        });
        
        featArr.forEach((f: any) => {
          if (initialSelected[f.id] === undefined) {
            initialSelected[f.id] = f.is_active; // default to global state if no row exists
          }
        });
        
        setSelectedFeatures(initialSelected);
        setSiteFeatureAccessIds(accessIds);
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
    }
  }, [siteId]);

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

    const sanitizeUrl = (input: string) => {
      let val = input.trim();
      if (!val) return '';
      val = val.replace(/^https?:?\/*/, '');
      return val ? `https://${val}` : '';
    };

    try {
      const siteRes = await authFetch(`${API_BASE}/sites/${siteId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization: formData.organization ? parseInt(formData.organization, 10) : null,
          name: formData.name.trim(),
          url: sanitizeUrl(formData.url) || null,
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
        let errMsg = 'Failed to update site.';
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

      // Update SiteFeatureAccess records
      for (const [featureId, enabled] of Object.entries(selectedFeatures)) {
        const accessId = siteFeatureAccessIds[parseInt(featureId, 10)];
        if (accessId) {
          await authFetch(`${API_BASE}/site-feature-access/${accessId}/`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ enabled })
          });
        } else {
          await authFetch(`${API_BASE}/site-feature-access/`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              site: parseInt(siteId, 10),
              feature: parseInt(featureId, 10),
              enabled
            })
          });
        }
      }

      navigate({ to: '/super-admin/sites' });
    } catch (err: any) {
      setError(err.message || 'Error updating site.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground font-medium">Loading site data...</div>;
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto py-4">
      <BackButton to="/super-admin/sites" label="Back to Sites List" />
      <div className="flex items-center gap-4 border-b border-border pb-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Edit Site / Project</h1>
          <p className="text-sm text-muted-foreground mt-1">Update site details and module access.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        
        {/* Site Details */}
        <section>
          <h2 className="text-lg font-bold text-foreground mb-4">Site Details</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-card/90 p-6 rounded-2xl border border-border shadow-xl">
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
        <section>
          <h2 className="text-lg font-bold text-foreground mb-4">Contact Person</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-card/90 p-6 rounded-2xl border border-border shadow-xl">
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
        <section>
          <div className="mb-4">
            <h2 className="text-lg font-bold text-foreground">Module Access</h2>
            <p className="text-sm text-muted-foreground">Manage which modules are active for this site.</p>
          </div>
          
          <div className="bg-card/90 rounded-2xl border border-border shadow-xl overflow-hidden">
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

        <div className="pt-4 flex justify-end gap-3 sticky bottom-0 bg-background/90 backdrop-blur-md py-4 border-t border-border z-10">
          <Link 
            to="/super-admin/sites"
            className="px-6 py-2.5 text-foreground font-semibold text-xs hover:bg-muted bg-card rounded-xl transition-colors border border-border"
          >
            Cancel
          </Link>
          <button 
            type="submit"
            disabled={saving}
            className="flex items-center gap-2 px-6 py-2.5 bg-emerald-600 text-foreground rounded-xl font-bold text-xs hover:bg-emerald-500 shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50"
          >
            <Save className="size-4" />
            {saving ? 'Saving Changes...' : 'Save Changes'}
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
