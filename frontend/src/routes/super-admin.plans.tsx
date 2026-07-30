import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { authFetch } from '@/lib/auth';
import { Edit, Trash2, Plus } from 'lucide-react';

export const Route = createFileRoute('/super-admin/plans')({
  component: PlansPage,
});

function PlansPage() {
  const [plans, setPlans] = useState<any[]>([]);
  const [features, setFeatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingPlanId, setEditingPlanId] = useState<number | null>(null);
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
        authFetch('http://127.0.0.1:8000/api/plans/'),
        authFetch('http://127.0.0.1:8000/api/features/')
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
      monthly_price: plan.monthly_price ? parseFloat(plan.monthly_price) : 0,
      yearly_price: plan.yearly_price ? parseFloat(plan.yearly_price) : 0,
      max_users: plan.max_users ?? '',
      max_courses: plan.max_courses ?? '',
      max_sites: plan.max_sites ?? '',
      included_features: Array.isArray(plan.included_features) 
        ? plan.included_features.map((f: any) => typeof f === 'object' ? f.id : f) 
        : [],
      is_active: plan.is_active ?? true,
      sort_order: plan.sort_order ?? 0,
    });
    setIsDialogOpen(true);
  };

  const handleDeletePlan = async (planId: number, planName: string) => {
    if (!window.confirm(`Are you sure you want to delete the plan "${planName}"? This action cannot be undone.`)) {
      return;
    }
    try {
      const res = await authFetch(`http://127.0.0.1:8000/api/plans/${planId}/`, {
        method: 'DELETE',
      });
      if (res.ok || res.status === 204) {
        fetchData();
      } else {
        const errData = await res.json().catch(() => ({}));
        alert(`Failed to delete plan: ${errData.detail || 'Plan might be assigned to active organizations.'}`);
      }
    } catch (error) {
      console.error('Failed to delete plan', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        ...formData,
        monthly_price: isNaN(formData.monthly_price) ? 0 : formData.monthly_price,
        yearly_price: isNaN(formData.yearly_price) ? 0 : formData.yearly_price,
        max_users: formData.max_users !== '' ? parseInt(formData.max_users as string) : null,
        max_courses: formData.max_courses !== '' ? parseInt(formData.max_courses as string) : null,
        max_sites: formData.max_sites !== '' ? parseInt(formData.max_sites as string) : null,
      };

      const url = editingPlanId 
        ? `http://127.0.0.1:8000/api/plans/${editingPlanId}/` 
        : 'http://127.0.0.1:8000/api/plans/';
      const method = editingPlanId ? 'PATCH' : 'POST';

      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        alert(`Failed to save plan: ${JSON.stringify(errData)}`);
        return;
      }

      setIsDialogOpen(false);
      fetchData();
    } catch (error) {
      console.error('Failed to save plan', error);
    }
  };

  const toggleFeature = (featureId: number, checked: boolean) => {
    if (checked) {
      setFormData(prev => ({ ...prev, included_features: [...prev.included_features, featureId] }));
    } else {
      setFormData(prev => ({ ...prev, included_features: prev.included_features.filter(id => id !== featureId) }));
    }
  };

  if (loading) return <div className="p-8 text-center text-muted-foreground font-medium">Loading plans...</div>;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Plan Catalog</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage subscription plans, pricing, and feature bundles.</p>
        </div>
        <Button onClick={handleOpenCreate} className="bg-emerald-600 hover:bg-emerald-500 font-bold text-foreground text-xs shadow-lg shadow-emerald-600/20">
          <Plus className="size-4 mr-2" /> Create New Plan
        </Button>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="max-w-2xl bg-card border border-border text-foreground">
            <DialogHeader>
              <DialogTitle className="text-foreground font-bold">{editingPlanId ? 'Edit Subscription Plan' : 'Create Subscription Plan'}</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">Plan Name</Label>
                  <Input className="bg-background border-border text-foreground focus:border-emerald-500/50" value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} required />
                </div>
                <div className="space-y-2">
                  <Label className="text-xs font-semibold text-foreground">Sort Order</Label>
                  <Input className="bg-background border-border text-foreground focus:border-emerald-500/50" type="number" value={formData.sort_order} onChange={e => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })} required />
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

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {plans.map((plan) => (
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
    </div>
  );
}
