import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { authFetch, API_BASE } from '@/lib/auth';
import { Activity } from 'lucide-react';
import { format } from 'date-fns';
import { PaginationControls } from '@/components/ui/PaginationControls';

export const Route = createFileRoute('/org-admin/activity')({
  component: OrgAdminActivityLog,
});

function OrgAdminActivityLog() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchLogs();
  }, []);

  const fetchLogs = async () => {
    try {
      const res = await authFetch(`${API_BASE}/activity-log/`);
      const data = await res.json();
      setLogs(Array.isArray(data) ? data : data.results || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const paginatedLogs = logs.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-black text-foreground tracking-tight flex items-center gap-2 mb-1">
            <Activity className="size-6 text-brand" />
            Activity Log
          </h1>
          <p className="text-foreground text-sm font-medium">Audit trail for your organization</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden space-y-4">
        {/* Desktop Table (lg: 1024px+) */}
        <div className="hidden lg:block overflow-x-auto">
          <table className="w-full text-left text-sm whitespace-nowrap">
            <thead className="bg-muted/50 border-b border-border text-muted-foreground">
              <tr>
                <th className="px-6 py-4 font-medium">Timestamp</th>
                <th className="px-6 py-4 font-medium">Actor</th>
                <th className="pl-[2.25rem] pr-6 py-4 font-medium">Action</th>
                <th className="px-6 py-4 font-medium">Target ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    Loading activity...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-muted-foreground">
                    No activity recorded yet.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map(log => (
                  <tr key={log.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 text-muted-foreground">
                      {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                    </td>
                    <td className="px-6 py-4">
                      {log.actor ? (
                        <div>
                          <p className="font-medium text-foreground">{log.actor.username || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">{log.actor.email}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">System</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {log.target_type ? (
                        <span className="text-muted-foreground font-mono text-xs">
                          {log.target_type}:{log.target_id}
                        </span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile / Tablet Cards (< lg: 1024px) */}
        <div className="block lg:hidden space-y-3 p-4">
          {loading ? (
            <div className="p-8 text-center text-xs text-muted-foreground">Loading activity...</div>
          ) : logs.length === 0 ? (
            <div className="p-8 text-center text-xs text-muted-foreground">No activity recorded yet.</div>
          ) : (
            paginatedLogs.map(log => (
              <div key={log.id} className="p-4 bg-card rounded-2xl border border-border shadow-sm space-y-2.5">
                <div className="flex items-center justify-between gap-2 flex-wrap">
                  <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700">
                    {log.action}
                  </span>
                  <span className="text-[11px] text-muted-foreground font-medium">
                    {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                  </span>
                </div>

                <div className="pt-2 border-t border-border/50 flex items-center justify-between gap-2">
                  <div>
                    <span className="text-[11px] font-extrabold uppercase text-muted-foreground block">Actor</span>
                    {log.actor ? (
                      <div>
                        <p className="font-semibold text-foreground text-xs">{log.actor.username || 'N/A'}</p>
                        <p className="text-[11px] text-muted-foreground truncate">{log.actor.email}</p>
                      </div>
                    ) : (
                      <span className="text-xs text-muted-foreground italic">System</span>
                    )}
                  </div>

                  {log.target_type && (
                    <div className="text-right">
                      <span className="text-[11px] font-extrabold uppercase text-muted-foreground block">Target</span>
                      <span className="text-muted-foreground font-mono text-xs">
                        {log.target_type}:{log.target_id}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {logs.length > 0 && (
          <div className="px-4 py-2 border-t border-border bg-card rounded-b-2xl">
            <PaginationControls
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={logs.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </div>
    </div>
  );
}

