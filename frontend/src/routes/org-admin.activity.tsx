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
            <Activity className="size-6 text-emerald-400" />
            Activity Log
          </h1>
          <p className="text-foreground text-sm font-medium">Audit trail for your organization</p>
        </div>
      </div>

      <div className="bg-card border border-border rounded-2xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
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

