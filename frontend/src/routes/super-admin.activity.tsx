import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { authFetch, API_BASE } from '@/lib/auth';
import { Activity } from 'lucide-react';
import { format } from 'date-fns';
import { PaginationControls } from '@/components/ui/PaginationControls';

export const Route = createFileRoute('/super-admin/activity')({
  component: SuperAdminActivityLog,
});

function SuperAdminActivityLog() {
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
      setLogs(Array.isArray(data) ? data : (data.results || []));
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
          <h1 className="text-2xl font-bold text-foreground tracking-tight flex items-center gap-2">
            <Activity className="size-6 text-emerald-400" />
            Global Activity Log
          </h1>
          <p className="text-muted-foreground mt-1">Audit trail across all organizations</p>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs whitespace-nowrap">
            <thead className="bg-background border-b border-border text-muted-foreground font-bold uppercase tracking-wider text-[10px]">
              <tr>
                <th className="px-6 py-4">Timestamp</th>
                <th className="px-6 py-4">Actor</th>
                <th className="px-6 py-4">Action</th>
                <th className="px-6 py-4">Organization</th>
                <th className="px-6 py-4">Target ID</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {loading ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground font-medium">
                    Loading activity...
                  </td>
                </tr>
              ) : logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-muted-foreground font-medium">
                    No activity recorded yet.
                  </td>
                </tr>
              ) : (
                paginatedLogs.map(log => (
                  <tr key={log.id} className="hover:bg-muted/50 transition-colors">
                    <td className="px-6 py-4 text-muted-foreground font-mono">
                      {format(new Date(log.created_at), 'MMM d, yyyy HH:mm:ss')}
                    </td>
                    <td className="px-6 py-4">
                      {log.actor ? (
                        <div>
                          <p className="font-bold text-foreground">{log.actor.username || 'N/A'}</p>
                          <p className="text-xs text-muted-foreground">{log.actor.email}</p>
                        </div>
                      ) : (
                        <span className="text-muted-foreground italic">System</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                        {log.action}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      {log.organization ? (
                        <span className="font-semibold text-foreground">{log.organization.name}</span>
                      ) : (
                        <span className="text-muted-foreground">-</span>
                      )}
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

        {logs.length > 0 && (
          <div className="px-4 py-2 border-t border-border">
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

