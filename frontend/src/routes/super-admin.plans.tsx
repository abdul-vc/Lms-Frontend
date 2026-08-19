import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { authFetch, API_BASE } from '@/lib/auth';
import { Edit, Trash2, Plus, Minus, ChevronUp, ChevronDown } from 'lucide-react';
import { PaginationControls } from '@/components/ui/PaginationControls';

export const Route = createFileRoute('/super-admin/plans')({
  component: PlansPage,
});

function PlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [features, setFeatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [formData, setFormData] = useState({
    name: '', description: '', monthly_price: 0, yearly_price: 0,
    max_users: '', max_courses: '', max_sites: '', included_features: [] as number[],
    is_active: true, sort_order: 0
  });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [plansRes, featuresRes] = await Promise.all([
        authFetch(`${API_BASE}/plans/`),
        authFetch(`${API_BASE}/features/`)
      ]);
      const plansData = await plansRes.json();
      const featuresData = await featuresRes.json();
      setPlans(Array.isArray(plansData) ? plansData : (plansData.results || []));
      setFeatures(Array.isArray(featuresData) ? featuresData : (featuresData.results || []));
    } catch (error) {
      console.error('Failed to fetch data', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenCreate = () => {
    setEditingPlanId(null);
    setFormData({
      name: '', description: '', monthly_price: 0, yearly_price: 0,
      max_users: '', max_courses: '', max_sites: '', included_features: [],
      is_active: true, sort_order: 0
    });
    setIsDialogOpen(true);
  };

  const handleOpenEdit = (plan: any) => {
    setEditingPlanId(plan.id);
    setFormData({
      name: plan.name || '',
      description: plan.description || '',
      monthly_price: plan.monthly_price || 0,
      yearly_price: plan.yearly_price || 0,
      max_users: plan.max_users !== null ? String(plan.max_users) : '',
      max_courses: plan.max_courses !== null ? String(plan.max_courses) : '',
      max_sites: plan.max_sites !== null ? String(plan.max_sites) : '',
      included_features: plan.included_features || [],
      is_active: plan.is_active !== undefined ? plan.is_active : true,
      sort_order: plan.sort_order || 0
    });
    setIsDialogOpen(true);
  };

  const handleDeletePlan = async (id: number, name: string) => {
    if (!window.confirm(`Are you sure you want to delete the plan "${name}"?`)) return;
    try {
      const res = await authFetch(`${API_BASE}/plans/${id}/`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setPlans(plans.filter(p => p.id !== id));
      } else {
        alert("Failed to delete plan.");
      }
    } catch (err) {
      console.error(err);
      alert("Error deleting plan.");
    }
  };

  const toggleFeature = (featureId: number, checked: boolean) => {
    if (checked) {
      setFormData(f => ({ ...f, included_features: [...f.included_features, featureId] }));
    } else {
      setFormData(f => ({ ...f, included_features: f.included_features.filter(id => id !== featureId) }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      ...formData,
      max_users: formData.max_users === '' ? null : parseInt(formData.max_users as string, 10),
      max_courses: formData.max_courses === '' ? null : parseInt(formData.max_courses as string, 10),
      max_sites: formData.max_sites === '' ? null : parseInt(formData.max_sites as string, 10),
    };

    try {
      const url = editingPlanId ? `${API_BASE}/plans/${editingPlanId}/` : `${API_BASE}/plans/`;
      const method = editingPlanId ? 'PUT' : 'POST';
      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        setIsDialogOpen(false);
        fetchData();
      } else {
        alert("Failed to save plan.");
      }
    } catch (err) {
      console.error(err);
      alert("Error saving plan.");
    }
  };

  const paginatedPlans = plans.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  if (loading) return <div className="p-8 text-center text-muted-foreground font-medium">Loading plans...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Plan Catalog</h1>
          <p className="text-sm text-muted-foreground mt-1">Configure tier offerings, features, and limits for SaaS subscriptions.</p>
        </div>
        <Button onClick={handleOpenCreate} className="bg-emerald-600 hover:bg-emerald-500 text-foreground font-bold text-xs shadow-lg shadow-emerald-600/20">
          <Plus className="size-4 mr-2" /> Create New Plan
        </Button>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl bg-card border border-border text-foreground">
            <DialogHeader>
              <DialogTitle className="text-foreground font-bold">{editingPlanId ? 'Edit Subscription Plan' : 'Create Subscription Plan'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">Plan Name</Label>
                  <Input className="bg-background border-border text-foreground focus:border-emerald-500/50" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">Sort Order</Label>
                  <div className="relative flex items-center">
                    <Input
                      className="bg-background border-border text-foreground focus:border-emerald-500/50 pr-20"
                      type="number"
                      value={formData.sort_order}
                      onChange={e => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
                      required
                    />
                    <div className="absolute right-1 flex items-center gap-1 pr-1">
                      <button
                        type="button"
                        onClick={() => setFormData(f => ({ ...f, sort_order: Math.max(0, (f.sort_order || 0) - 1) }))}
                        className="size-6 rounded flex items-center justify-center bg-muted hover:bg-accent text-foreground hover:text-accent-foreground border border-border transition-colors shadow-sm"
                        title="Decrease Sort Order"
                      >
                        <Minus className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => setFormData(f => ({ ...f, sort_order: (f.sort_order || 0) + 1 }))}
                        className="size-6 rounded flex items-center justify-center bg-muted hover:bg-accent text-foreground hover:text-accent-foreground border border-border transition-colors shadow-sm"
                        title="Increase Sort Order"
                      >
                        <Plus className="size-3" />
                      </button>
                    </div>
                  </div>
                </div>
                <div className="space-y-2 col-span-2">
                  <Label className="text-xs font-semibold text-foreground">Description</Label>
                  <Input className="bg-background border-border text-foreground focus:border-emerald-500/50" value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">Monthly Price (₹)</Label>
                  <Input className="bg-background border-border text-foreground focus:border-emerald-500/50" type="number" step="0.01" value={isNaN(formData.monthly_price) ? '' : formData.monthly_price} onChange={e => setFormData({ ...formData, monthly_price: parseFloat(e.target.value) })} required />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">Yearly Price (₹)</Label>
                  <Input className="bg-background border-border text-foreground focus:border-emerald-500/50" type="number" step="0.01" value={isNaN(formData.yearly_price) ? '' : formData.yearly_price} onChange={e => setFormData({ ...formData, yearly_price: parseFloat(e.target.value) })} required />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">Max Users (blank = unlimited)</Label>
                  <Input className="bg-background border-border text-foreground focus:border-emerald-500/50" type="number" value={formData.max_users} onChange={e => setFormData({ ...formData, max_users: e.target.value })} />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">Max Sites (blank = unlimited)</Label>
                  <Input className="bg-background border-border text-foreground focus:border-emerald-500/50" type="number" value={formData.max_sites} onChange={e => setFormData({ ...formData, max_sites: e.target.value })} />
                </div>
              </div>
              
              <div className="space-y-2 pt-2">
                <Label className="text-xs font-semibold text-foreground">Included Features</Label>
                <div className="grid grid-cols-2 gap-2 p-4 border border-border rounded-xl max-h-48 overflow-y-auto bg-background">
                  {features.map(f => (
                    <div key={f.id} className="flex items-center space-x-2">
                      <Checkbox 
                        id={`feature-${f.id}`} 
                        checked={formData.included_features.includes(f.id)}
                        onCheckedChange={(checked: boolean) => toggleFeature(f.id, checked)}
                        className="border-border bg-card"
                      />
                      <label htmlFor={`feature-${f.id}`} className="text-xs font-medium text-foreground leading-none cursor-pointer">
                        {f.name}
                      </label>
                    </div>
                  ))}
                </div>
              </div>

              <div className="pt-4 flex justify-end">
                <Button type="submit" className="bg-emerald-600 hover:bg-emerald-500 text-foreground font-bold text-xs">
                  {editingPlanId ? 'Update Plan' : 'Save Plan'}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {paginatedPlans.map((plan) => (
            <div key={plan.id} className="border border-border rounded-2xl p-6 bg-card/90 shadow-xl flex flex-col justify-between space-y-4">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-bold text-foreground">{plan.name}</h3>
                    <p className="text-xs text-muted-foreground mt-0.5">{plan.description || 'No description'}</p>
                  </div>
                  {!plan.is_active && (
                    <span className="px-2 py-1 bg-red-950/60 text-red-400 border border-red-800/60 text-[10px] font-bold rounded-full">Inactive</span>
                  )}
                </div>
                
                <div className="mb-6 flex items-end gap-1">
                  <span className="text-3xl font-black text-foreground">₹{plan.monthly_price}</span>
                  <span className="text-muted-foreground text-sm mb-1">/mo</span>
                  <span className="text-xs text-muted-foreground ml-2 mb-1">(₹{plan.yearly_price}/yr)</span>
                </div>

                <div className="space-y-2 text-xs">
                  <div className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Max Users</span>
                    <span className="font-semibold text-foreground">{plan.max_users || 'Unlimited'}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Max Sites</span>
                    <span className="font-semibold text-foreground">{plan.max_sites || 'Unlimited'}</span>
                  </div>
                  <div className="flex justify-between border-b border-border/50 pb-2">
                    <span className="text-muted-foreground">Features Bundled</span>
                    <span className="font-semibold text-emerald-400">{plan.included_features?.length || 0}</span>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-2 pt-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => handleOpenEdit(plan)}
                  className="flex-1 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10 font-bold text-xs bg-background"
                >
                  <Edit className="size-3.5 mr-1 text-emerald-400" /> Edit Plan
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => handleDeletePlan(plan.id, plan.name)}
                  className="border-red-800/80 text-red-400 hover:bg-red-950/40 font-bold text-xs bg-background"
                >
                  <Trash2 className="size-3.5 mr-1 text-red-400" /> Delete
                </Button>
              </div>
            </div>
          ))}
          {plans.length === 0 && (
            <div className="col-span-3 text-center py-12 text-muted-foreground bg-card/60 rounded-2xl border border-dashed border-border">
              No plans created yet. Click "Create New Plan" above.
            </div>
          )}
        </div>

        {plans.length > 0 && (
          <div className="bg-card rounded-2xl border border-border px-4 py-2">
            <PaginationControls
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={plans.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </div>
    </div>
  );
}
