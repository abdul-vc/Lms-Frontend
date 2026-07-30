import { createFileRoute, Link } from '@tanstack/react-router';
import { Search, Filter, Download, CreditCard, Clock, MoreVertical, DollarSign } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { authFetch, API_BASE } from '@/lib/auth';
import { DataTableRow } from '@/components/DataTableRow';
import { StatusBadge } from '@/components/StatusBadge';

export const Route = createFileRoute('/super-admin/billing')({
  component: BillingPage,
});

function BillingPage() {
  const [billingConfigs, setBillingRecords] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      authFetch(`${API_BASE}/billing/`).then(r => r.json()),
      authFetch(`${API_BASE}/plans/`).then(r => r.json())
    ])
    .then(([billingData, plansData]) => {
      setBillingRecords(Array.isArray(billingData) ? billingData : []);
      setPlans(Array.isArray(plansData) ? plansData : []);
      setLoading(false);
    })
    .catch(err => {
      console.error('Failed to fetch billing data', err);
      setBillingRecords([]);
      setLoading(false);
    });
  }, []);

  const [purchasingPlanId, setPurchasingPlanId] = useState<number | null>(null);

  const handleBuyPlan = async (planId: number, planName: string) => {
    setPurchasingPlanId(planId);
    try {
      const res = await authFetch('http://127.0.0.1:8000/api/buy-plan/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan_id: planId, billing_cycle: 'monthly' }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`🎉 Success! Your organization has subscribed to ${planName}. All bundled features are now unlocked!`);
        window.location.reload();
      } else {
        alert(data.error || 'Failed to upgrade plan.');
      }
    } catch (err: any) {
      alert(err.message || 'Error subscribing to plan.');
    } finally {
      setPurchasingPlanId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Subscription Plans & Billing</h1>
          <p className="text-sm text-muted-foreground mt-1">View subscription metrics and upgrade your organization plan.</p>
        </div>
      </div>

      {/* Available Plans Grid for Tenant Upgrade */}
      {plans.length > 0 && (
        <div className="p-6 bg-gradient-to-br from-emerald-950 to-slate-900 text-foreground rounded-2xl shadow-xl border border-emerald-800/50 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <span className="text-xs font-bold uppercase tracking-widest text-emerald-400">SaaS Subscription Offers</span>
              <h2 className="text-xl font-bold text-white">Available Plans for Upgrade</h2>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
            {plans.map(p => (
              <div key={p.id} className="p-5 rounded-xl bg-card/90 border border-border/80 flex flex-col justify-between space-y-4 shadow-md hover:border-emerald-500 transition-all">
                <div>
                  <div className="flex items-center justify-between">
                    <h3 className="font-bold text-lg text-foreground">{p.name}</h3>
                    <span className="text-xs px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-semibold">
                      ₹{p.monthly_price}/mo
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{p.description || 'Enterprise subscription plan.'}</p>
                  
                  <div className="mt-3 space-y-1.5 text-xs text-foreground">
                    <div>⚡ <strong>Users Limit:</strong> {p.max_users ? `${p.max_users} Users` : 'Unlimited Users'}</div>
                    <div>📚 <strong>Courses Limit:</strong> {p.max_courses ? `${p.max_courses} Courses` : 'Unlimited Courses'}</div>
                  </div>
                </div>

                <button
                  type="button"
                  disabled={purchasingPlanId === p.id}
                  onClick={() => handleBuyPlan(p.id, p.name)}
                  className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-foreground rounded-xl font-bold text-xs transition-all shadow-md flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  {purchasingPlanId === p.id ? 'Processing Upgrade...' : `Buy / Subscribe to ${p.name} 🚀`}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
        <div className="p-5 rounded-2xl border border-border bg-card/90 shadow-xl space-y-2">
          <div className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Total Recurring Revenue</div>
          <div className="text-2xl font-black text-foreground">
            ₹{billingConfigs.reduce((acc, curr) => acc + (parseFloat(curr.rate) || 0), 0).toLocaleString()}
          </div>
        </div>
        <div className="p-5 rounded-2xl border border-border bg-card/90 shadow-xl space-y-2">
          <div className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Active Subscriptions</div>
          <div className="text-2xl font-black text-foreground">{billingConfigs.length}</div>
        </div>
        <div className="p-5 rounded-2xl border border-border bg-card/90 shadow-xl space-y-2">
          <div className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-wider">Pending Payments</div>
          <div className="text-2xl font-black text-foreground">₹0</div>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card/90 overflow-hidden shadow-xl">
        <div className="p-4 border-b border-border bg-background/60 flex items-center justify-between gap-4">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search billing records..." 
              className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>
          <button className="flex items-center gap-2 px-3 py-2 bg-card text-foreground rounded-xl border border-border hover:bg-muted transition-colors font-semibold text-xs">
            <Filter className="size-4 text-muted-foreground" />
            Filters
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-background text-muted-foreground font-bold uppercase tracking-wider text-[10px] border-b border-border">
              <tr>
                <th className="px-6 py-4">Organization ID</th>
                <th className="px-6 py-4">Plan Type</th>
                <th className="px-6 py-4">Billing Cycle</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">Loading billing config...</td>
                </tr>
              ) : billingConfigs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-muted-foreground">No billing records found.</td>
                </tr>
              ) : billingConfigs.map((bill) => (
                <DataTableRow
                  key={bill.id}
                  summary={
                    <>
                      <td className="px-6 py-4 font-semibold text-foreground">Org #{bill.organization}</td>
                      <td className="px-6 py-4 text-emerald-400 font-semibold capitalize">
                        {plans.find(p => p.id === bill.plan)?.name || 'Custom'}
                      </td>
                      <td className="px-6 py-4 text-foreground capitalize">{bill.billing_cycle}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={bill.status} />
                      </td>
                    </>
                  }
                  details={
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-4 bg-background/40 rounded-xl border border-border/40 my-2">
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground mb-1">Solution Type</div>
                        <div className="text-sm text-foreground">{bill.solution_type || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground mb-1">Rate</div>
                        <div className="text-sm text-foreground">₹{bill.rate || '0.00'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground mb-1">Next Payment Due</div>
                        <div className="text-sm text-foreground">{bill.next_payment_due || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground mb-1">Payment Status</div>
                        <div className="text-sm text-foreground">{bill.payment_status || 'N/A'}</div>
                      </div>
                      <div className="col-span-full pt-2">
                        <Link 
                          to={`/super-admin/organizations/${bill.organization}`}
                          className="text-emerald-400 hover:text-emerald-300 font-semibold text-xs hover:underline"
                        >
                          View Organization Details &rarr;
                        </Link>
                      </div>
                    </div>
                  }
                  onEdit={() => {
                    window.location.href = `/super-admin/organizations/${bill.organization}/edit`;
                  }}
                  onDelete={async () => {
                    if (confirm(`Are you sure you want to delete this billing configuration?`)) {
                      try {
                        const res = await authFetch(`http://127.0.0.1:8000/api/billing/${bill.id}/`, { method: 'DELETE' });
                        if (res.ok) {
                          setBillingRecords(billingConfigs.filter(b => b.id !== bill.id));
                        } else {
                          alert("Failed to delete billing configuration.");
                        }
                      } catch (err) {
                        console.error(err);
                        alert("Error deleting billing configuration.");
                      }
                    }
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
