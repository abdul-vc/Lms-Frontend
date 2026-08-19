import { createFileRoute, Link } from '@tanstack/react-router';
import {
  Building2, Users, Globe2, Activity, RefreshCw,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { useEffect, useState, useCallback } from 'react';
import { authFetch, API_BASE } from '@/lib/auth';

export const Route = createFileRoute('/super-admin/dashboard')({
  component: SuperAdminDashboard,
});

interface PlatformStats {
  organizations: number;
  active_organizations: number;
  sites: number;
  active_users: number;
}

function SuperAdminDashboard() {
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const loadData = useCallback(async () => {
    setLoading(true);
    setFetchError(null);

    try {
      const [statsRes, activityRes] = await Promise.all([
        authFetch(`${API_BASE}/organizations/platform-stats/`),
        authFetch(`${API_BASE}/activity-log/recent/?limit=5`),
      ]);

      if (!statsRes.ok) {
        const text = await statsRes.text();
        throw new Error(`Stats API ${statsRes.status}: ${text.slice(0, 120)}`);
      }
      const statsData: PlatformStats = await statsRes.json();

      const keys: Array<keyof PlatformStats> = ['organizations', 'active_organizations', 'sites', 'active_users'];
      for (const k of keys) {
        if (typeof statsData[k] !== 'number') {
          throw new Error(`Unexpected API shape — key "${k}" missing or not a number`);
        }
      }

      setStats(statsData);

      if (activityRes.ok) {
        const activityData = await activityRes.json();
        if (Array.isArray(activityData)) setRecentActivity(activityData);
      }
    } catch (err: any) {
      console.error('[SuperAdminDashboard] fetch error:', err);
      setFetchError(err?.message ?? 'Unknown error fetching dashboard data.');
      setStats(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  const METRICS = [
    { label: "Total Organizations", value: stats?.organizations, sub: "All tenants", icon: Building2, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20", href: "/super-admin/organizations" },
    { label: "Active Organizations", value: stats?.active_organizations, sub: "Status = Active", icon: Building2, color: "text-teal-400", bg: "bg-teal-500/10 border-teal-500/20", href: "/super-admin/organizations" },
    { label: "Total Sites", value: stats?.sites, sub: "Projects & subdomains", icon: Globe2, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20", href: "/super-admin/sites" },
    { label: "Active Users", value: stats?.active_users, sub: "Across all tenants", icon: Users, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20", href: "/super-admin/organizations" },
  ];

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Platform Dashboard</h1>
          <p className="page-header-subtitle">Real-time stats across all tenants and organizations.</p>
        </div>
        <button
          onClick={loadData}
          disabled={loading}
          className="btn-secondary gap-2 self-start"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error State */}
      {!loading && fetchError && (
        <div className="flex items-center gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <span className="font-semibold">Error loading data.</span>
          <span className="text-destructive/80">{fetchError}</span>
          <button onClick={loadData} className="btn-destructive btn-sm ml-auto">Retry</button>
        </div>
      )}

      {/* Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {METRICS.map((m) => (
          <Link key={m.label} to={m.href} className="block group outline-none">
            <div className="stat-card hover:border-brand/30 transition-colors group-hover:shadow-elevated">
              <div className="flex items-center justify-between">
                <span className="text-label">{m.label}</span>
                <div className={`stat-card-icon border ${m.bg}`}>
                  <m.icon className={`size-4 ${m.color}`} />
                </div>
              </div>
              <div>
                {loading ? (
                  <div className="h-7 w-12 bg-muted rounded animate-pulse" />
                ) : (
                  <p className="stat-card-value">{m.value ?? '—'}</p>
                )}
                <p className="stat-card-label mt-0.5">{m.sub}</p>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="data-table-wrapper">
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/60">
          <div className="flex items-center gap-3">
            <div className="size-8 rounded-lg bg-accent grid place-items-center">
              <Activity className="size-4 text-accent-foreground" />
            </div>
            <h2 className="text-heading-3 text-foreground">Recent Activity</h2>
          </div>
          <Link to="/super-admin/activity" className="text-xs font-semibold text-brand hover:opacity-80 transition-opacity">
            View All
          </Link>
        </div>

        <div className="divide-y divide-border/60">
          {loading ? (
            <div className="flex items-center justify-center h-24">
              <div className="spinner" />
            </div>
          ) : recentActivity.length === 0 ? (
            <div className="empty-state py-10">
              <div className="empty-state-icon"><Activity className="size-5" /></div>
              <p className="empty-state-title">No Activity Yet</p>
              <p className="empty-state-description">Platform events will appear here once users start interacting.</p>
            </div>
          ) : (
            recentActivity.map((log) => (
              <div key={log.id} className="px-5 py-3.5 flex items-start gap-4 hover:bg-accent/20 transition-colors">
                <div className="size-7 rounded-full bg-accent grid place-items-center text-accent-foreground text-xs font-bold shrink-0 mt-0.5">
                  {(log.actor?.email || log.actor?.username || 'S')[0].toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-foreground">
                    <span className="font-semibold">{log.actor?.email || log.actor?.username || 'System'}</span>
                    {' '}performed{' '}
                    <span className="font-medium text-brand">{log.action}</span>
                  </p>
                  <p className="text-caption mt-0.5 flex items-center gap-2">
                    {formatDistanceToNow(new Date(log.created_at), { addSuffix: true })}
                    {log.organization && (
                      <><span>·</span><span className="truncate">Org: {log.organization.name}</span></>
                    )}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
