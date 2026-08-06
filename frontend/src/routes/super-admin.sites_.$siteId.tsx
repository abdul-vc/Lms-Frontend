import { createFileRoute, Link, useParams } from '@tanstack/react-router';
import { ArrowLeft, Building2, Globe, MapPin, CheckCircle2, Send, Loader2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { authFetch, API_BASE } from '@/lib/auth';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/StatusBadge';
import { BackButton } from '@/components/BackButton';

export const Route = createFileRoute('/super-admin/sites_/$siteId')({
  component: SiteDetailsPage,
});

function SiteDetailsPage() {
  const { siteId } = useParams({ strict: false }) as any;
  const [site, setSite] = useState<any>(null);
  const [features, setFeatures] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailStatus, setEmailStatus] = useState<{ success?: boolean; message?: string } | null>(null);

  useEffect(() => {
    if (siteId) {
      Promise.all([
        authFetch(`${API_BASE}/sites/${siteId}/`).then(res => res.json()),
        authFetch(`${API_BASE}/features/`).then(res => res.json()),
        authFetch(`${API_BASE}/site-feature-access/?site=${siteId}`).then(res => res.json())
      ])
      .then(async ([siteData, featuresData, accessData]) => {
        if (siteData.organization) {
          try {
            const orgRes = await authFetch(`${API_BASE}/organizations/${siteData.organization}/`);
            if (orgRes.ok) {
              siteData.organization_details = await orgRes.json();
            }
          } catch (err) {
            console.error("Failed to fetch organization details", err);
          }
        }
        setSite(siteData);
        
        // Map features to their enabled state
        const enabledFeatureIds = new Set(
          (Array.isArray(accessData) ? accessData : [])
            .filter((a: any) => a.site === parseInt(siteId) && a.enabled)
            .map((a: any) => a.feature)
        );
        const activeFeatures = (Array.isArray(featuresData) ? featuresData : [])
          .filter(f => enabledFeatureIds.has(f.id));
        setFeatures(activeFeatures);
        
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });
    }
  }, [siteId]);

  const handleSendEmail = async () => {
    if (!site) return;
    setSendingEmail(true);
    setEmailStatus(null);
    try {
      const res = await authFetch(`${API_BASE}/sites/${site.id}/send-welcome-email/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ recipient_email: site.contact_email })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setEmailStatus({ success: true, message: data.message || `Site credentials emailed to ${data.recipient || site.contact_email}!` });
      } else {
        setEmailStatus({ success: false, message: data.detail || data.message || 'Failed to send welcome email.' });
      }
    } catch (err: any) {
      setEmailStatus({ success: false, message: err.message || 'Error sending email.' });
    } finally {
      setSendingEmail(false);
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-muted-foreground font-medium">Loading site details...</div>;
  }

  if (!site) {
    return <div className="p-8 text-center text-red-400 font-medium">Site not found.</div>;
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto py-4">
      <BackButton to="/super-admin/sites" label="Back to Sites List" />
      <div className="flex items-center gap-4 border-b border-border pb-4">
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-foreground tracking-tight">{site.name}</h1>
            <StatusBadge status={site.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Site Code: {site.site_code || 'N/A'} &bull; Product: {site.product_type || 'N/A'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleSendEmail}
            disabled={sendingEmail}
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-foreground rounded-xl font-bold text-xs transition-all shadow-lg shadow-emerald-600/20 flex items-center gap-2 disabled:opacity-60"
          >
            {sendingEmail ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
            {sendingEmail ? 'Sending Email...' : 'Send Access Email'}
          </button>
          <Link
            to="/super-admin/sites/$siteId/edit"
            params={{ siteId: site.id.toString() }}
            className="px-4 py-2 bg-card text-foreground border border-border rounded-xl font-semibold text-xs hover:bg-muted transition-colors shadow-sm"
          >
            Edit Site
          </Link>
        </div>
      </div>

      {emailStatus && (
        <div className={cn(
          "p-4 rounded-xl border flex items-center justify-between text-xs font-medium",
          emailStatus.success ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" : "bg-red-950/60 border-red-800/80 text-red-400"
        )}>
          <span>{emailStatus.message}</span>
          <button onClick={() => setEmailStatus(null)} className="text-xs underline hover:no-underline ml-4">
            Dismiss
          </button>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <section className="bg-card/90 p-6 rounded-2xl border border-border shadow-xl">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Globe className="size-5 text-emerald-400" />
              General Information
            </h2>
            <div className="grid grid-cols-2 gap-y-4 gap-x-6">
              <div>
                <div className="text-xs text-muted-foreground mb-1">URL</div>
                <div className="font-medium text-foreground text-xs">
                  {site.url ? <a href={site.url} target="_blank" rel="noreferrer" className="text-emerald-400 hover:underline">{site.url}</a> : 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-xs text-muted-foreground mb-1">Activate Date</div>
                <div className="font-medium text-foreground text-xs">{site.activate_date || 'N/A'}</div>
              </div>
              <div className="col-span-2">
                <div className="text-xs text-muted-foreground mb-1 flex items-center gap-1.5">
                  <MapPin className="size-4 text-emerald-400" /> Location
                </div>
                <div className="font-medium text-foreground text-xs">
                  {site.location_address || 'No address provided'} {site.country ? `(${site.country})` : ''}
                </div>
              </div>
            </div>
          </section>

          <section className="bg-card/90 p-6 rounded-2xl border border-border shadow-xl">
            <h2 className="text-lg font-bold text-foreground mb-4">Platform Features</h2>
            {features.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {features.map(f => (
                  <div key={f.id} className="flex items-center gap-2">
                    <CheckCircle2 className="size-4 text-emerald-400" />
                    <span className="text-xs text-foreground font-semibold">
                      {f.name}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-muted-foreground text-xs">No specific features enabled for this site.</div>
            )}
          </section>
        </div>

        <div className="space-y-6">
          <section className="bg-card/90 p-6 rounded-2xl border border-border shadow-xl">
            <h2 className="text-lg font-bold text-foreground mb-4 flex items-center gap-2">
              <Building2 className="size-5 text-emerald-400" />
              Parent Organization
            </h2>
            {site.organization_details ? (
              <div className="space-y-3">
                <div className="font-bold text-foreground text-base">
                  {site.organization_details.name}
                </div>
                <div className="text-xs text-muted-foreground">
                  Entity: {site.organization_details.entity_name}
                </div>
                <div className="text-xs text-muted-foreground">
                  Contact: {site.organization_details.contact_name}
                </div>
                <Link 
                  to="/super-admin/organizations/$orgId"
                  params={{ orgId: site.organization.toString() }}
                  className="mt-2 inline-flex text-emerald-400 hover:text-emerald-300 text-xs font-bold hover:underline"
                >
                  View Organization &rarr;
                </Link>
              </div>
            ) : (
              <div className="text-muted-foreground text-xs">Organization details not available.</div>
            )}
          </section>

          <section className="bg-card/90 p-6 rounded-2xl border border-border shadow-xl">
            <h2 className="text-lg font-bold text-foreground mb-4">Site Contact</h2>
            <div className="space-y-3">
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Name</div>
                <div className="text-xs text-foreground font-semibold">{site.contact_name || 'N/A'}</div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Email</div>
                <div className="text-xs text-foreground font-semibold">
                  {site.contact_email ? <a href={`mailto:${site.contact_email}`} className="text-emerald-400 hover:underline">{site.contact_email}</a> : 'N/A'}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground mb-0.5">Phone</div>
                <div className="text-xs text-foreground font-semibold">{site.contact_phone || 'N/A'}</div>
              </div>

              <button
                onClick={handleSendEmail}
                disabled={sendingEmail || !site.contact_email}
                className="w-full mt-2 py-2 px-3 bg-muted hover:bg-muted text-foreground text-xs font-semibold rounded-xl border border-border transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
              >
                <Send className="size-3.5 text-emerald-400" />
                Send Email to {site.contact_email || 'Contact'}
              </button>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
