import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Search, Plus, MoreVertical, Filter, Download } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState } from 'react';
import { authFetch, API_BASE } from '@/lib/auth';
import { DataTableRow } from '@/components/DataTableRow';
import { StatusBadge } from '@/components/StatusBadge';
import { PaginationControls } from '@/components/ui/PaginationControls';

export const Route = createFileRoute('/super-admin/organizations')({
  component: OrganizationsPage,
});

function OrganizationsPage() {
  const navigate = useNavigate();
  const [organizations, setOrganizations] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    Promise.all([
      authFetch(`${API_BASE}/organizations/`).then(r => r.json()),
      authFetch(`${API_BASE}/plans/`).then(r => r.json())
    ])
    .then(([orgData, plansData]) => {
      setOrganizations(Array.isArray(orgData) ? orgData : []);
      setPlans(Array.isArray(plansData) ? plansData : []);
      setLoading(false);
    })
    .catch(err => {
      console.error('Failed to fetch data', err);
      setOrganizations([]);
      setLoading(false);
    });
  }, []);

  const filteredOrganizations = organizations.filter((org) => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (
      (org.name && org.name.toLowerCase().includes(q)) ||
      (org.company_name && org.company_name.toLowerCase().includes(q)) ||
      (org.entity_name && org.entity_name.toLowerCase().includes(q))
    );
  });

  const paginatedOrgs = filteredOrganizations.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const handleExport = async () => {
    try {
      const res = await authFetch(`${API_BASE}/organizations/export/`);
      if (!res.ok) {
        throw new Error(`Export failed with status ${res.status}`);
      }
      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `organizations_export_${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(downloadUrl);
    } catch (err) {
      console.error('Export error:', err);
      alert('Failed to export organizations data.');
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Organizations</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage all tenant organizations across the platform.</p>
        </div>
        <div className="flex gap-3">
          <button 
            type="button"
            onClick={handleExport}
            className="flex items-center gap-2 px-4 py-2 bg-card text-foreground rounded-xl border border-border hover:bg-muted transition-all font-semibold text-xs shadow-md"
          >
            <Download className="size-4 text-emerald-400" />
            Export
          </button>
          <Link
            to="/super-admin/organizations/add"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-500 transition-all font-bold text-xs shadow-lg shadow-emerald-600/20"
          >
            <Plus className="size-4" />
            Add Organization
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xl">
        <div className="p-4 border-b border-border bg-background/60 flex items-center justify-between gap-4">
          <div className="relative max-w-sm flex-1">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <input 
              type="text" 
              placeholder="Search organizations..." 
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-background border border-border rounded-xl pl-10 pr-4 py-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/50 transition-all"
            />
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-background text-muted-foreground font-bold uppercase tracking-wider text-[10px] border-b border-border">
              <tr>
                <th className="px-5 py-3.5">Organization Name</th>
                <th className="px-5 py-3.5">Company Name</th>
                <th className="px-5 py-3.5">Entity Name</th>
                <th className="px-5 py-3.5 text-center">Total Sites</th>
                <th className="px-5 py-3.5">Status</th>
                <th className="px-5 py-3.5">Created</th>
                <th className="px-5 py-3.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">Loading organizations...</td>
                </tr>
              ) : filteredOrganizations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-muted-foreground">No organizations found. Click "Add Organization" to create one.</td>
                </tr>
              ) : paginatedOrgs.map((org) => (
                <DataTableRow
                  key={org.id}
                  summary={
                    <>
                      <td className="px-5 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-8 rounded-lg bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center font-bold text-xs uppercase">
                            {org.name.substring(0,2)}
                          </div>
                          <span className="font-semibold text-foreground">{org.name}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">{org.company_name || '-'}</td>
                      <td className="px-5 py-4 text-muted-foreground">{org.entity_name || '-'}</td>
                      <td className="px-5 py-4 text-muted-foreground text-center">{org.sites?.length ?? 0}</td>
                      <td className="px-5 py-4">
                        <StatusBadge status={org.status} />
                      </td>
                      <td className="px-5 py-4 text-muted-foreground">
                        {org.created_at ? new Date(org.created_at).toLocaleString() : '-'}
                      </td>
                    </>
                  }
                  details={
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-4 bg-background/40 rounded-xl border border-border my-2">
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground mb-1">Entity Name</div>
                        <div className="text-sm text-foreground">{org.entity_name || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground mb-1">Contact Name</div>
                        <div className="text-sm text-foreground">{org.contact_name || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground mb-1">Contact Phone</div>
                        <div className="text-sm text-foreground">{org.contact_phone || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground mb-1">Address</div>
                        <div className="text-sm text-foreground">{org.company_address || 'N/A'}</div>
                      </div>
                      <div className="col-span-full pt-2">
                        <Link 
                          to="/super-admin/organizations/$orgId"
                          params={{ orgId: org.id.toString() }}
                          className="text-emerald-400 hover:text-emerald-300 font-semibold text-xs hover:underline"
                        >
                          View Full Details &rarr;
                        </Link>
                      </div>
                    </div>
                  }
                  onEdit={() => {
                    navigate({ to: '/super-admin/organizations/$orgId/edit', params: { orgId: org.id.toString() } });
                  }}
                  onDelete={async () => {
                    if (confirm(`WARNING: Deleting "${org.name}" will CASCADE and delete all of its sites, users, courses, and data.\n\nAre you absolutely sure you want to proceed? This cannot be undone.`)) {
                      try {
                        const res = await authFetch(`${API_BASE}/organizations/${org.id}/`, { method: 'DELETE' });
                        if (res.ok) {
                          setOrganizations(organizations.filter(o => o.id !== org.id));
                        } else {
                          alert("Failed to delete organization.");
                        }
                      } catch (err) {
                        console.error(err);
                        alert("Error deleting organization.");
                      }
                    }
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>

        {filteredOrganizations.length > 0 && (
          <div className="px-4 py-2 border-t border-border">
            <PaginationControls
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={filteredOrganizations.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </div>
    </div>
  );
}

