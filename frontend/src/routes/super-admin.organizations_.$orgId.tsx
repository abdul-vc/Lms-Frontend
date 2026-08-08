import { createFileRoute, Link, useParams } from '@tanstack/react-router';
import { ArrowLeft, Building2, MapPin, CheckCircle2, DollarSign, Mail, ExternalLink, Send, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { authFetch, API_BASE } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/StatusBadge';
import { BackButton } from '@/components/BackButton';

export const Route = createFileRoute('/super-admin/organizations_/$orgId')({
  component: OrganizationDetailsPage,
});

function OrganizationDetailsPage() {
  const { orgId } = useParams({ strict: false }) as any;
  const [org, setOrg] = useState<any>(null);
  const [billing, setBilling] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  useEffect(() => {
    if (orgId) {
      Promise.all([
        authFetch(`${API_BASE}/organizations/${orgId}/`).then(res => res.json()),
        authFetch(`${API_BASE}/billing/?organization=${orgId}`)
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

  const handleSendEmail = async () => {
    if (!org) return;
    setSendingEmail(true);
    setEmailStatus(null);
    try {
      const res = await authFetch(`${API_BASE}/organizations/${org.id}/send-welcome-email/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_email: org.contact_email })
      });
      let data: any = {};
      try {
        data = await res.json();
      } catch {
        data = { detail: 'Server returned a non-JSON error response.' };
      }
      if (res.ok && data.success) {
        setEmailStatus({ success: true, message: data.message || `Login credentials and URL link emailed to ${data.recipient || org.contact_email}!` });
      } else {
        setEmailStatus({ success: false, message: data.detail || data.message || 'Failed to send welcome email.' });
      }
    } catch (err: any) {
      setEmailStatus({ success: false, message: err.message || 'Error triggering welcome email.' });
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground">Loading organization details...</div>;
  }

  if (!org) {
    return <div className="p-8 text-center text-red-400">Organization not found.</div>;
  }

  const loginPortalUrl = org.sub_domain 
    ? `/login/${org.sub_domain}` 
    : `/login`;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 border-b border-border pb-4">
        <BackButton fallbackPath="/super-admin/organizations" />
        <div className="flex-1 flex items-center gap-4">
          <div className="size-12 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-lg uppercase shadow-sm">
            {org.name.substring(0,2)}
          </div>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-foreground tracking-tight">{org.name}</h1>
              <StatusBadge status={org.status} />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Entity: {org.entity_name || 'N/A'} &bull; Sub-Domain: {org.sub_domain || 'N/A'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSendEmail}
            disabled={sendingEmail}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-foreground rounded-xl font-bold text-xs transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2 disabled:opacity-60"
          >
            {sendingEmail ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {sendingEmail ? 'Sending Email...' : 'Send Login Credentials Email'}
          </button>
          <Link
            to="/super-admin/organizations/$orgId/edit"
            params={{ orgId: org.id.toString() }}
            className="px-4 py-2 bg-card text-foreground border border-border rounded-xl font-semibold text-xs hover:bg-muted transition-colors shadow-md"
          >
            Edit Organization
          </Link>
        </div>
      </div>

      {emailStatus && (
        <div className={cn(
          "p-4 rounded-xl border flex items-center justify-between text-sm font-medium",
          emailStatus.success ? "bg-emerald-950/40 border-emerald-800/80 text-emerald-300" : "bg-red-950/40 border-red-800/80 text-red-300"
        )}>
          <span>{emailStatus.message}</span>
          <button onClick={() => setEmailStatus(null)} className="text-xs underline hover:no-underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Dynamic Login Portal Link Card */}
          <section className="bg-gradient-to-r from-emerald-950 to-slate-900 text-foreground p-6 rounded-2xl shadow-xl border border-emerald-800/50">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-xs uppercase tracking-wider font-semibold text-emerald-400">Dedicated Tenant Login Portal</span>
                <h3 className="text-xl font-bold text-foreground mt-1">{org.name} Login Link</h3>
                <p className="text-xs text-emerald-200 mt-1 max-w-md">
                  This custom URL features {org.name}'s specific branding, logo, tagline, and welcome options.
                </p>
              </div>
              <a
                href={loginPortalUrl}
                target="_blank"
                rel="noreferrer"
                className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-foreground font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all shadow-md shrink-0"
              >
                Open Portal <ExternalLink className="size-4" />
              </a>
            </div>
            <div className="mt-4 p-3 bg-black/40 rounded-xl border border-border/10 flex items-center justify-between">
              <span className="font-mono text-xs text-emerald-100 truncate mr-3">{loginPortalUrl}</span>
              <button
                onClick={() => { navigator.clipboard.writeText(loginPortalUrl); alert('Login URL copied to clipboard!'); }}
                className="text-xs text-emerald-400 hover:text-foreground underline shrink-0 font-sans"
              >
                Copy Link
              </button>
            </div>
          </section>

          <section className="bg-card/90 p-6 rounded-2xl border border-border shadow-xl">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Building2 className="size-5 text-emerald-400" />
              Company Location Details
            </h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-y-6 gap-x-6">
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1">Company Name</div>
                <div className="font-medium text-foreground text-sm">{org.company_name || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1">Entity Name</div>
                <div className="font-medium text-foreground text-sm">{org.entity_name || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1 flex items-center gap-1.5">
                  <MapPin className="size-3.5" /> Country
                </div>
                <div className="font-medium text-foreground text-sm">{org.country || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1">Region</div>
                <div className="font-medium text-foreground text-sm">{org.region || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1">State / City</div>
                <div className="font-medium text-foreground text-sm">
                  {org.state || org.city ? `${org.state || ''} ${org.city ? `(${org.city})` : ''}` : 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-1">Zone</div>
                <div className="font-medium text-foreground text-sm">{org.zone || 'N/A'}</div>
              </div>
              <div className="col-span-full">
                <div className="text-xs font-semibold text-muted-foreground mb-1">Company Address</div>
                <div className="font-medium text-foreground text-sm bg-background/60 p-3 rounded-xl border border-border">
                  {org.company_address || 'N/A'}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-card/90 p-6 rounded-2xl border border-border shadow-xl">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <DollarSign className="size-5 text-emerald-400" />
              Billing & Subscription Configuration
            </h2>
            {billing || org.billing ? (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-y-5 gap-x-6 text-sm">
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Assigned Plan</div>
                  <div className="font-bold text-emerald-400">{billing?.plan_name || org.billing?.plan_name || 'Standard Plan'}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Solution Type</div>
                  <div className="font-medium text-foreground">{billing?.solution_type || org.billing?.solution_type || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Solution For</div>
                  <div className="font-medium text-foreground">{billing?.solution_for || org.billing?.solution_for || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Billing Term</div>
                  <div className="font-medium text-foreground">{billing?.billing_term || org.billing?.billing_term || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Billing Cycle</div>
                  <div className="font-medium text-foreground capitalize">{billing?.billing_cycle || org.billing?.billing_cycle || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Rate</div>
                  <div className="font-medium text-foreground">₹{billing?.rate || org.billing?.rate || '0.00'}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Start Date</div>
                  <div className="font-medium text-foreground">{billing?.start_date || org.billing?.start_date || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1">End Date / Renewal</div>
                  <div className="font-medium text-foreground">{billing?.end_date || org.billing?.end_date || 'N/A'}</div>
                </div>
                <div>
                  <div className="text-xs font-semibold text-muted-foreground mb-1">Payment Status</div>
                  <StatusBadge status={billing?.payment_status || org.billing?.payment_status || 'Paid'} className="mt-0.5" />
                </div>
              </div>
            ) : (
              <div className="text-muted-foreground text-sm">No billing configuration found for this organization.</div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-card/90 p-6 rounded-2xl border border-border shadow-xl">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Mail className="size-5 text-emerald-400" />
                Primary Contact
              </h2>
            </div>
            <div className="space-y-4">
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-0.5">Contact Name</div>
                <div className="text-sm text-foreground font-medium">{org.contact_name || 'N/A'}</div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-0.5">Email Address</div>
                <div className="text-sm text-foreground font-medium">
                  {org.contact_email ? <a href={`mailto:${org.contact_email}`} className="text-emerald-400 hover:underline">{org.contact_email}</a> : 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-xs font-semibold text-muted-foreground mb-0.5">Phone Number</div>
                <div className="text-sm text-foreground font-medium">{org.contact_phone || 'N/A'}</div>
              </div>
              
              <button
                onClick={handleSendEmail}
                disabled={sendingEmail || !org.contact_email}
                className="w-full mt-2 py-2 px-3 bg-background hover:bg-muted text-foreground text-xs font-semibold rounded-xl border border-border transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="size-3.5 text-emerald-400" />
                Send Login Email to {org.contact_email || 'Contact'}
              </button>
            </div>
          </section>

          <section className="bg-card/90 p-6 rounded-2xl border border-border shadow-xl">
            <h2 className="text-lg font-bold text-foreground mb-3">White Labeling & Branding</h2>
            <div className="flex items-center gap-3 mb-3">
              {org.sub_domain ? (
                <>
                  <CheckCircle2 className="size-5 text-emerald-400" />
                  <span className="text-sm font-medium text-foreground">Enabled</span>
                </>
              ) : (
                <>
                  <div className="size-5 rounded-full border-2 border-slate-600 flex items-center justify-center">
                    <span className="bg-slate-600 size-2.5 rounded-full"></span>
                  </div>
                  <span className="text-sm text-muted-foreground">Disabled</span>
                </>
              )}
            </div>
            {org.sub_domain && (
              <div className="p-3 bg-background/60 rounded-xl border border-border text-sm space-y-1">
                <div><span className="text-muted-foreground">Sub-Domain:</span> <span className="font-semibold text-foreground">{org.sub_domain}</span></div>
                <div><span className="text-muted-foreground">Login Route:</span> <a href={loginPortalUrl} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline font-mono text-xs">{`/login/${org.sub_domain}`}</a></div>
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}

