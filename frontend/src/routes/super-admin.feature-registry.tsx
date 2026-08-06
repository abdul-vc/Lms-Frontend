import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { authFetch, API_BASE } from '@/lib/auth';
import { Building2, Sparkles, CheckCircle2, XCircle, ShieldCheck, Edit, Trash2 } from 'lucide-react';

export const Route = createFileRoute('/super-admin/feature-registry')({
  component: FeatureRegistry,
});

function FeatureRegistry() {
  const [features, setFeatures] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [orgFeatureAccess, setOrgFeatureAccess] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingFeatureId, setEditingFeatureId] = useState<number | null>(null);
  const [formData, setFormData] = useState({ key: '', name: '', description: '', category: 'core', is_active: true });

  useEffect(() => {
    fetchFeaturesAndOrgs();
  }, []);

  const fetchFeaturesAndOrgs = async () => {
    try {
      const [featRes, orgRes] = await Promise.all([
        authFetch(`${API_BASE}/features/`).then(r => r.ok ? r.json() : []),
        authFetch(`${API_BASE}/organizations/`).then(r => r.ok ? r.json() : []),
      ]);
      const featList = Array.isArray(featRes) ? featRes : (featRes.results || []);
      const orgList = Array.isArray(orgRes) ? orgRes : (orgRes.results || []);
      setFeatures(featList);
      setOrganizations(orgList);

      if (orgList.length > 0) {
        const firstOrgId = orgList[0].id;
        setSelectedOrgId(firstOrgId);
        fetchOrgFeatureAccess(firstOrgId);
      }
    } catch (error) {
      console.error('Failed to fetch features or orgs', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrgFeatureAccess = async (orgId: number) => {
    try {
      const res = await authFetch(`${API_BASE}/org-features/?organization_id=${orgId}`);
      if (!res.ok) return;
      const data = await res.json();
      const list = Array.isArray(data) ? data : (data.results || []);
      const map: Record<string, boolean> = {};
      list.forEach((item: any) => {
        map[item.feature_key] = item.enabled;
      });
      setOrgFeatureAccess(map);
    } catch (error) {
      console.error('Failed to fetch org feature access', error);
    }
  };

  const handleOrgChange = (orgId: number) => {
    setSelectedOrgId(orgId);
    fetchOrgFeatureAccess(orgId);
  };

  const toggleOrgFeature = async (featureKey: string, currentStatus: boolean) => {
    if (!selectedOrgId) return;
    const newStatus = !currentStatus;
    setOrgFeatureAccess(prev => ({ ...prev, [featureKey]: newStatus }));
    try {
      await authFetch(`${API_BASE}/toggle-org-feature/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          organization_id: selectedOrgId,
          feature_key: featureKey,
          enabled: newStatus,
        }),
      });
    } catch (error) {
      console.error('Failed to toggle org feature', error);
      setOrgFeatureAccess(prev => ({ ...prev, [featureKey]: currentStatus }));
    }
  };

  const handleOpenRegister = () => {
    setEditingFeatureId(null);
    setFormData({ key: '', name: '', description: '', category: 'core', is_active: true });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (feature: any) => {
    setEditingFeatureId(feature.id);
    setFormData({
      key: feature.key || '',
      name: feature.name || '',
      description: feature.description || '',
      category: feature.category || 'core',
      is_active: feature.is_active ?? true,
    });
    setIsDialogOpen(true);
  };

  const handleDeleteFeature = async (featureId: number, featureName: string) => {
    if (!window.confirm(`Are you sure you want to delete the feature "${featureName}"? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await authFetch(`${API_BASE}/features/${featureId}/`, {
        method: 'DELETE',
      });
      if (res.ok || res.status === 204) {
        fetchFeaturesAndOrgs();
      } else {
        alert('Failed to delete feature.');
      }
    } catch (error) {
      console.error('Failed to delete feature', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const url = editingFeatureId 
        ? `${API_BASE}/features/${editingFeatureId}/` 
        : `${API_BASE}/features/`;
      const method = editingFeatureId ? 'PATCH' : 'POST';

      await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      setIsDialogOpen(false);
      fetchFeaturesAndOrgs();
    } catch (error) {
      console.error('Failed to save feature', error);
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground font-medium">Loading Access Control...</div>;

  const selectedOrg = organizations.find(o => o.id === selectedOrgId);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Tenant Access Control</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Register global features, edit/delete capabilities, and toggle tenant access on/off for specific organizations.
          </p>
        </div>
        <Button onClick={handleOpenRegister} className="bg-emerald-600 hover:bg-emerald-500 text-foreground font-bold text-xs shadow-lg shadow-emerald-600/20">
          <Sparkles className="size-4 mr-2" /> Register New Feature
        </Button>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-card border border-border text-foreground max-w-md">
            <DialogHeader>
              <DialogTitle className="text-foreground font-bold">{editingFeatureId ? 'Edit Global Feature' : 'Register New Global Feature'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label htmlFor="key" className="text-xs font-semibold text-foreground">System Key (slug)</Label>
                <Input id="key" className="bg-background border-border text-foreground focus:border-emerald-500/50" placeholder="e.g. scorm_player, internal_messenger" value={formData.key} onChange={e => setFormData({ ...formData, key: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="name" className="text-xs font-semibold text-foreground">Display Name</Label>
                <Input id="name" className="bg-background border-border text-foreground focus:border-emerald-500/50" placeholder="e.g. SCORM 1.2 / 2004 Engine" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="category" className="text-xs font-semibold text-foreground">Category</Label>
                <Input id="category" className="bg-background border-border text-foreground focus:border-emerald-500/50" placeholder="e.g. core, learning, communication, reporting" value={formData.category} onChange={e => setFormData({ ...formData, category: e.target.value })} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description" className="text-xs font-semibold text-foreground">Description</Label>
                <Input id="description" className="bg-background border-border text-foreground focus:border-emerald-500/50" placeholder="Brief feature capability overview" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
              </div>
              <Button type="submit" className="w-full bg-emerald-600 hover:bg-emerald-500 text-foreground font-bold text-xs">
                {editingFeatureId ? 'Update Feature' : 'Save Feature'}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Organization Selection Bar */}
      <div className="p-5 rounded-2xl bg-card/90 border border-border shadow-xl flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3">
          <div className="size-10 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 grid place-items-center">
            <Building2 className="size-5" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground">Select Organization to Manage Features</h3>
            <p className="text-xs text-muted-foreground">Managing feature toggles for: <strong className="text-emerald-400">{selectedOrg?.name || 'Select an Org'}</strong></p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <select
            value={selectedOrgId || ''}
            onChange={(e) => handleOrgChange(Number(e.target.value))}
            className="px-3.5 py-2 rounded-xl bg-background border border-border text-xs font-semibold text-foreground focus:outline-none focus:border-emerald-500/50"
          >
            {organizations.map(org => (
              <option key={org.id} value={org.id}>
                {org.name} ({org.company_name || org.sub_domain})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Features Table with Interactive Toggles, Edit & Delete */}
      <div className="rounded-2xl border border-border bg-card/90 overflow-hidden shadow-xl">
        <Table className="w-full text-left text-xs table-fixed">
          <colgroup>
            <col className="w-5/12" />
            <col className="w-2/12" />
            <col className="w-3/12" />
            <col className="w-1/12 text-center" />
            <col className="w-28 shrink-0 text-right" />
          </colgroup>
          <TableHeader className="bg-background">
            <TableRow className="border-b border-border">
              <TableHead className="font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Feature Name & System Key</TableHead>
              <TableHead className="font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Category</TableHead>
              <TableHead className="font-bold text-muted-foreground uppercase tracking-wider text-[10px]">Tenant Access State</TableHead>
              <TableHead className="font-bold text-muted-foreground uppercase tracking-wider text-[10px] text-center">Toggle Access</TableHead>
              <TableHead className="font-bold text-muted-foreground uppercase tracking-wider text-[10px] text-right w-28 shrink-0">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody className="divide-y divide-border/50">
            {features.map((feature) => {
              const isEnabled = orgFeatureAccess[feature.key] ?? true;
              return (
                <TableRow key={feature.id} className="hover:bg-muted/50 transition-colors h-16 border-b border-border/50">
                  <TableCell className="font-medium truncate">
                    <div className="flex items-center gap-2 min-w-0">
                      <ShieldCheck className="size-4 text-emerald-400 shrink-0" />
                      <span className="font-bold text-foreground truncate">{feature.name}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-2 min-w-0">
                      <code className="bg-background text-muted-foreground border border-border px-2 py-0.5 rounded text-[11px] font-mono shrink-0">{feature.key}</code>
                      {feature.description && (
                        <span className="text-xs text-muted-foreground truncate max-w-[260px] inline-block align-bottom" title={feature.description}>
                          &bull; {feature.description}
                        </span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell className="truncate">
                    <span className="px-2.5 py-1 rounded-full bg-background text-foreground border border-border text-[10px] font-bold uppercase tracking-wider inline-block truncate max-w-[120px]">
                      {feature.category}
                    </span>
                  </TableCell>
                  <TableCell className="truncate">
                    {isEnabled ? (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-bold max-w-full">
                        <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">Enabled for {selectedOrg?.name || 'Org'}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-400 border border-red-500/20 text-xs font-bold max-w-full">
                        <XCircle className="size-3.5 text-red-400 shrink-0" />
                        <span className="truncate">Disabled (Hidden in Nav)</span>
                      </span>
                    )}
                  </TableCell>
                  <TableCell className="text-center">
                    <button
                      type="button"
                      onClick={() => toggleOrgFeature(feature.key, isEnabled)}
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isEnabled ? 'bg-emerald-600' : 'bg-muted border border-border'}`}
                    >
                      <span className={`inline-block size-4 transform rounded-full bg-card transition-transform ${isEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                    </button>
                  </TableCell>
                  <TableCell className="text-right space-x-1 w-28 shrink-0 whitespace-nowrap">
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleOpenEdit(feature)}
                      className="text-muted-foreground hover:text-emerald-400 hover:bg-emerald-500/10 p-2"
                    >
                      <Edit className="size-4" />
                    </Button>
                    <Button 
                      type="button" 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => handleDeleteFeature(feature.id, feature.name)}
                      className="text-muted-foreground hover:text-red-400 hover:bg-red-500/10 p-2"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              );
            })}
            {features.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground py-12">
                  No features registered yet. Click "Register New Feature" above.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
