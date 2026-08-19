import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { Plus } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useEffect, useState, useMemo } from 'react';
import { authFetch, API_BASE } from '@/lib/auth';
import { DataTableRow } from '@/components/DataTableRow';
import { StatusBadge } from '@/components/StatusBadge';
import { PaginationControls } from '@/components/ui/PaginationControls';

export const Route = createFileRoute('/super-admin/sites')({
  component: SitesPage,
});

function SitesPage() {
  const navigate = useNavigate();
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [productTypeFilter, setProductTypeFilter] = useState('');

  useEffect(() => {
    authFetch(`${API_BASE}/sites/`)
      .then(r => r.json())
      .then((sitesData) => {
        setSites(Array.isArray(sitesData) ? sitesData : []);
        setLoading(false);
      })
      .catch(err => {
        console.error('Failed to fetch data', err);
        setSites([]);
        setLoading(false);
      });
  }, []);

  const uniqueProductTypes = useMemo(() => {
    const types = new Set<string>();
    sites.forEach(s => {
      if (s.product_type) types.add(s.product_type);
    });
    return Array.from(types).sort();
  }, [sites]);

  const filteredSites = useMemo(() => {
    return sites.filter(site => {
      const matchSearch = site.name?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchProduct = productTypeFilter === '' || site.product_type === productTypeFilter;
      return matchSearch && matchProduct;
    });
  }, [sites, searchTerm, productTypeFilter]);

  const paginatedSites = filteredSites.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const clearFilters = () => {
    setSearchTerm('');
    setProductTypeFilter('');
    setCurrentPage(1);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground tracking-tight">Sites List</h1>
          <p className="text-sm text-muted-foreground mt-1">Manage platform projects and site instances.</p>
        </div>
        <div className="flex gap-3">
          <Link
            to="/super-admin/sites/add"
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-foreground rounded-xl hover:bg-emerald-500 transition-all font-bold text-xs shadow-lg shadow-emerald-600/20"
          >
            <Plus className="size-4" />
            Add Site
          </Link>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card/90 overflow-hidden shadow-xl">
        <div className="p-5 border-b border-border bg-background/60">
          <div className="text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest mb-3">Filters</div>
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative w-full sm:min-w-[200px] sm:flex-1">
              <input 
                type="text" 
                placeholder="Search site..." 
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full bg-background border border-border rounded-xl px-4 py-2.5 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-emerald-500/50 transition-all"
              />
            </div>
            <select
              value={productTypeFilter}
              onChange={(e) => {
                setProductTypeFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full sm:min-w-[200px] bg-background border border-border rounded-xl px-4 py-2.5 text-xs text-foreground focus:outline-none focus:border-emerald-500/50 transition-all appearance-none"
              style={{ backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' fill=\'none\' viewBox=\'0 0 24 24\' stroke=\'%2394a3b8\'%3E%3Cpath stroke-linecap=\'round\' stroke-linejoin=\'round\' stroke-width=\'2\' d=\'M19 9l-7 7-7-7\'%3E%3C/path%3E%3C/svg%3E")', backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0.75rem center', backgroundSize: '1em' }}
            >
              <option value="">All Product Types</option>
              {uniqueProductTypes.map(pt => (
                <option key={pt} value={pt}>{pt}</option>
              ))}
            </select>
            <button 
              onClick={clearFilters}
              className="px-5 py-2.5 bg-card text-foreground rounded-xl border border-border hover:bg-muted transition-colors font-semibold text-xs"
            >
              Clear Filters
            </button>
          </div>
        </div>
        
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-background text-muted-foreground font-bold uppercase tracking-wider text-[10px] border-b border-border">
              <tr>
                <th className="px-6 py-4">Site Name</th>
                <th className="px-6 py-4">Organization</th>
                <th className="px-6 py-4">Location</th>
                <th className="px-6 py-4">Product Type</th>
                <th className="px-6 py-4">Contact</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Created</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/50">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground text-sm">Loading sites...</td>
                </tr>
              ) : filteredSites.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-muted-foreground text-sm">No sites found.</td>
                </tr>
              ) : paginatedSites.map((site) => (
                <DataTableRow 
                  key={site.id}
                  summary={
                    <>
                      <td className="px-6 py-4 font-semibold text-foreground">{site.name || '-'}</td>
                      <td className="px-6 py-4 text-foreground">{site.organization_name || '-'}</td>
                      <td className="px-6 py-4 text-foreground">{site.location_address || '-'}</td>
                      <td className="px-6 py-4 text-foreground">{site.product_type || '-'}</td>
                      <td className="px-6 py-4 text-foreground">{site.contact_name || '-'}</td>
                      <td className="px-6 py-4">
                        <StatusBadge status={site.status} />
                      </td>
                      <td className="px-6 py-4 text-muted-foreground">
                        {site.created_at ? new Date(site.created_at).toLocaleDateString('en-GB') : '-'}
                      </td>
                    </>
                  }
                  details={
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-6 p-4 bg-background/40 rounded-xl border border-border/40 my-2">
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground mb-1">Contact Email</div>
                        <div className="text-sm font-semibold text-foreground">{site.contact_email || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground mb-1">Contact Phone</div>
                        <div className="text-sm font-semibold text-foreground">{site.contact_phone || 'N/A'}</div>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-muted-foreground mb-1">Site URL</div>
                        <div className="text-sm font-semibold text-emerald-400">
                          {site.url ? <a href={site.url} target="_blank" rel="noreferrer" className="hover:underline">{site.url}</a> : 'N/A'}
                        </div>
                      </div>
                      <div className="col-span-full pt-2">
                        <Link 
                          to="/super-admin/sites/$siteId"
                          params={{ siteId: site.id.toString() }}
                          className="text-emerald-400 hover:text-emerald-300 font-semibold text-xs hover:underline flex items-center gap-1"
                        >
                          View Full Details &rarr;
                        </Link>
                      </div>
                    </div>
                  }
                  onEdit={() => {
                    navigate({ to: '/super-admin/sites/$siteId/edit', params: { siteId: site.id.toString() } });
                  }}
                  onDelete={async () => {
                    if (confirm(`Are you sure you want to delete the site "${site.name}"? This action cannot be undone.`)) {
                      try {
                        const res = await authFetch(`${API_BASE}/sites/${site.id}/`, { method: 'DELETE' });
                        if (res.ok) {
                          setSites(sites.filter(s => s.id !== site.id));
                        } else {
                          alert("Failed to delete site.");
                        }
                      } catch (err) {
                        console.error(err);
                        alert("Error deleting site.");
                      }
                    }
                  }}
                />
              ))}
            </tbody>
          </table>
        </div>

        {filteredSites.length > 0 && (
          <div className="px-4 py-2 border-t border-border">
            <PaginationControls
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={filteredSites.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </div>
    </div>
  );
}

