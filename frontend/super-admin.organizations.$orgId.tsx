import { createFileRoute, Link, useParams } from '@tanstack/react-router';
import { ArrowLeft, Building2, MapPin, CheckCircle2, DollarSign, Mail } from 'lucide-react';
import { useEffect, useState } from 'react';
import { authFetch } from '@/lib/auth';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/super-admin/organizations/$orgId')({
  component: OrganizationDetailsPage,
});

function OrganizationDetailsPage() {
  const { orgId } = useParams({ strict: false }) as any;
  const [org, setOrg] = useState<any>(null);
  const [billing, setBilling] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (orgId) {
      Promise.all([
        authFetch(`http://127.0.0.1:8000/api/organizations/${orgId}/`).then(res => res.json()),
        authFetch(`http://127.0.0.1:8000/api/billing/?organization=${orgId}`)
          .then(res => res.json())
          .then(data => (Array.isArray(data) && data.length > 0 ? data[0] : null))
          .catch(() => null)
      ]).then(([orgData, billingData]) => {
        setOrg(orgData);
        setBilling(billingData);
        setLoading(false);
      }).catch(err => {
        console.error(err);
        setLoading(false);
      });
    }
  }, [orgId]);

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Loading organization details...</div>;
  }

  if (!org) {
    return <div className="p-8 text-center text-red-500">Organization not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-4">
      <div className="flex items-center gap-4 border-b border-slate-200 pb-4">
        <Link 
          to="/super-admin/organizations" 
          className="p-2 hover:bg-slate-100 rounded-lg text-slate-500 transition-colors"
        >
          <ArrowLeft className="size-5" />
        </Link>
        <div className="flex-1 flex items-center gap-4">
          <div className="size-12 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-lg uppercase shadow-sm">
            {org.name.substring(0,2)}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">{org.name}</h1>
              <span className={cn(
                "px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5",
                org.status === 'Active' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-100 text-slate-600 border border-slate-200"
              )}>
                <span className={cn("size-1.5 rounded-full", org.status === 'Active' ? "bg-emerald-500" : "bg-slate-400")} />
                {org.status}
              </span>
            </div>
            <p className="text-sm text-slate-500 mt-1">
              Entity: {org.entity_name || 'N/A'} &bull; Sub-Domain: {org.sub_domain || 'N/A'}
            </p>
          </div>
        </div>
        <Link
          to="/super-admin/organizations/$orgId/edit"
          params={{ orgId: org.id.toString() }}
          className="px-4 py-2 bg-white text-slate-700 border border-slate-200 rounded-lg font-semibold text-sm hover:bg-slate-50 transition-colors shadow-sm"
        >
          Edit Organization
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Building2 className="size-5 text-indigo-500" />
              Company Details
            </h2>
            <div className="grid grid-cols-2 gap-y-6 gap-x-6">
              <div>
                <div className="text-sm text-slate-500 mb-1">Company Name</div>
                <div className="font-medium text-slate-900">{org.company_name || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-1 flex items-center gap-1.5">
                  <MapPin className="size-4" /> Country
                </div>
                <div className="font-medium text-slate-900">{org.country || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-1">Region</div>
                <div className="font-medium text-slate-900">{org.region || 'N/A'}</div>
              </div>
              <div>
                <div className="text-sm text-slate-500 mb-1">State / City</div>
                <div className="font-medium text-slate-900">
                  {org.state || org.city ? `${org.state || ''} ${org.city ? `(${org.city})` : ''}` : 'N/A'}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <DollarSign className="size-5 text-indigo-500" />
              Billing & Subscription
            </h2>
            {billing ? (
              <div className="grid grid-cols-2 gap-y-4 gap-x-6">
                <div>
                  <div className="text-sm text-slate-500 mb-1">Solution Type</div>
                  <div className="font-medium text-slate-900">{billing.solution_type || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500 mb-1">Billing Cycle</div>
                  <div className="font-medium text-slate-900">{billing.billing_cycle || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500 mb-1">Rate</div>
                  <div className="font-medium text-slate-900">${billing.rate || '0.00'}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500 mb-1">Next Payment Due</div>
                  <div className="font-medium text-slate-900">{billing.next_payment_due || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-sm text-slate-500 mb-1">Status</div>
                  <span className={cn(
                    "px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 w-max mt-1",
                    billing.status === 'Active' ? "bg-emerald-50 text-emerald-700 border border-emerald-100" : "bg-slate-100 text-slate-600 border border-slate-200"
                  )}>
                    {billing.status || 'Active'}
                  </span>
                </div>
              </div>
            ) : (
              <div className="text-slate-500 text-sm">No billing configuration found for this organization.</div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-4 flex items-center gap-2">
              <Mail className="size-5 text-indigo-500" />
              Primary Contact
            </h2>
            <div className="space-y-4">
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-0.5">Contact Name</div>
                <div className="text-sm text-slate-900 font-medium">{org.contact_name || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-0.5">Email Address</div>
                <div className="text-sm text-slate-900 font-medium">
                  {org.contact_email ? <a href={`mailto:${org.contact_email}`} className="text-indigo-600 hover:underline">{org.contact_email}</a> : 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-slate-500 mb-0.5">Phone Number</div>
                <div className="text-sm text-slate-900 font-medium">{org.contact_phone || 'N/A'}</div>
              </div>
            </div>
          </section>

          <section className="bg-white p-6 rounded-2xl border border-slate-200 shadow-sm">
            <h2 className="text-lg font-bold text-slate-900 mb-3">White Labeling</h2>
            <div className="flex items-center gap-3">
              {org.sub_domain ? (
                <>
                  <CheckCircle2 className="size-5 text-emerald-500" />
                  <span className="text-sm font-medium text-slate-900">Enabled</span>
                </>
              ) : (
                <>
                  <div className="size-5 rounded-full border-2 border-slate-300 flex items-center justify-center">
                    <span className="bg-slate-300 size-2.5 rounded-full"></span>
                  </div>
                  <span className="text-sm text-slate-500">Disabled</span>
                </>
              )}
            </div>
            {org.sub_domain && (
              <div className="mt-3 p-3 bg-slate-50 rounded-lg border border-slate-200 text-sm">
                <span className="text-slate-500">Domain:</span> <span className="font-semibold text-slate-900">{org.sub_domain}.lms.com</span>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
