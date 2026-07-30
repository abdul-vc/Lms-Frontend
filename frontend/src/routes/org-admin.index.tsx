import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { useAuth, authFetch } from "@/lib/auth";
import { fetchAccessRequests, fetchCourses, acceptAccessRequest, rejectAccessRequest, type ApiAccessRequest } from "@/lib/courses-api";
import {
  Users, UserCheck, BookOpen, Layers, ShieldAlert, CheckCircle2,
  ArrowRight, ShieldCheck, Sparkles, RefreshCw, Loader2, User,
  Building, MessageSquare,
} from "lucide-react";

export const Route = createFileRoute("/org-admin/")({
  head: () => ({ meta: [{ title: "Organization Overview — Admin Console" }] }),
  component: OrgAdminOverview,
});

interface OrgUser {
  id: number;
  email: string;
  first_name: string;
  last_name: string;
  username: string;
  full_name: string;
  job_title: string;
  is_active?: boolean;
  department: { id: number; name: string } | number | null;
  role: { id: number; name: string } | number | null;
}

interface OrgDepartment {
  id: number;
  name: string;
  user_count?: number;
}

function OrgAdminOverview() {
  const { user } = useAuth();
  const orgName = user?.organization?.name || "the Organization";

  const [requests, setRequests] = useState<ApiAccessRequest[]>([]);
  const [coursesCount, setCoursesCount] = useState<number>(0);
  const [orgUsers, setOrgUsers] = useState<OrgUser[]>([]);
  const [departments, setDepartments] = useState<OrgDepartment[]>([]);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);

  const loadOverviewData = () => {
    setLoading(true);
    Promise.all([
      fetchAccessRequests().catch(() => []),
      fetchCourses().catch(() => []),
      authFetch("http://127.0.0.1:8000/api/users/").then(r => r.ok ? r.json() : []).catch(() => []),
      authFetch("http://127.0.0.1:8000/api/departments/").then(r => r.ok ? r.json() : []).catch(() => [])
    ]).then(([reqs, rawCourses, uData, dData]) => {
      setRequests(reqs);
      setCoursesCount(rawCourses.length);
      setOrgUsers(Array.isArray(uData) ? uData : []);
      setDepartments(Array.isArray(dData) ? dData : []);
    }).finally(() => setLoading(false));
  };

  useEffect(() => { loadOverviewData(); }, []);

  const handleAction = async (id: number, action: 'accept' | 'reject') => {
    setProcessingId(id);
    try {
      if (action === 'accept') { await acceptAccessRequest(id); }
      else { await rejectAccessRequest(id); }
      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: action === 'accept' ? 'accepted' : 'rejected' } : r));
    } catch (err) { console.error(err); }
    finally { setProcessingId(null); }
  };

  const pendingRequests = requests.filter(r => r.status === 'pending');
  const activeUsersCount = orgUsers.filter(u => u.is_active !== false).length;

  const METRICS = [
    { label: "Total Users", value: orgUsers.length, sub: "Registered Members", icon: Users, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
    { label: "Active Users", value: activeUsersCount, sub: "Active Accounts", icon: UserCheck, color: "text-teal-400", bg: "bg-teal-500/10 border-teal-500/20" },
    { label: "Departments", value: departments.length, sub: "Teams & Departments", icon: Building, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
    { label: "Courses", value: coursesCount, sub: "Published Courses", icon: BookOpen, color: "text-blue-400", bg: "bg-blue-500/10 border-blue-500/20" },
    { label: "Pending Access", value: pendingRequests.length, sub: "Awaiting Approval", icon: ShieldAlert, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  ];

  const ADMIN_LINKS = [
    { to: "/org-admin/departments", label: "Users & Departments", desc: "Manage members, teams & structure", icon: Users, color: "text-emerald-400", bg: "bg-emerald-500/10 border-emerald-500/20" },
    { to: "/org-admin/roles", label: "Roles & Permissions", desc: "Custom RBAC matrix & privileges", icon: ShieldCheck, color: "text-teal-400", bg: "bg-teal-500/10 border-teal-500/20" },
    { to: "/org-admin/module-access", label: "Module Access", desc: "Enable/disable workspace modules", icon: Layers, color: "text-indigo-400", bg: "bg-indigo-500/10 border-indigo-500/20" },
    { to: "/org-admin/courses", label: "Content Authoring", desc: "Build SCORM courses & assessments", icon: Sparkles, color: "text-amber-400", bg: "bg-amber-500/10 border-amber-500/20" },
  ];

  return (
    <div className="space-y-8">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Organization Overview</h1>
          <p className="page-header-subtitle">
            Administrative command center for {orgName}.
          </p>
        </div>
        <button
          onClick={loadOverviewData}
          disabled={loading}
          className="btn-secondary gap-2 self-start"
        >
          <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* ── Metrics Row ─────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        {METRICS.map((m) => (
          <div key={m.label} className="stat-card">
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
                <p className="stat-card-value">{m.value}</p>
              )}
              <p className="stat-card-label mt-0.5">{m.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Main Content Grid ─────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

        {/* Left Column */}
        <div className="lg:col-span-2 space-y-6">

          {/* Users Table */}
          <div>
            <div className="section-header mb-3">
              <div>
                <h2 className="section-title">Organization Members</h2>
                <p className="text-caption">All accounts registered in {orgName}</p>
              </div>
              <Link to="/org-admin/departments" className="flex items-center gap-1 text-xs font-semibold text-brand hover:opacity-80 transition-opacity">
                Manage ({orgUsers.length}) <ArrowRight className="size-3.5" />
              </Link>
            </div>

            {loading ? (
              <div className="data-table-wrapper">
                <div className="flex items-center justify-center h-32">
                  <div className="spinner" />
                </div>
              </div>
            ) : orgUsers.length === 0 ? (
              <div className="data-table-wrapper">
                <div className="empty-state py-10">
                  <div className="empty-state-icon"><User className="size-6" /></div>
                  <p className="empty-state-title">No Users Found</p>
                  <p className="empty-state-description">No users found in this organization yet.</p>
                </div>
              </div>
            ) : (
              <div className="data-table-wrapper">
                <div className="overflow-x-auto">
                  <table className="data-table">
                    <thead className="data-table-thead">
                      <tr>
                        <th className="data-table-th">User</th>
                        <th className="data-table-th hidden sm:table-cell">Role</th>
                        <th className="data-table-th hidden md:table-cell">Department</th>
                        <th className="data-table-th text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="data-table-tbody">
                      {orgUsers.slice(0, 5).map((u) => {
                        const deptName = typeof u.department === 'object' && u.department ? u.department.name : 'General';
                        const roleName = typeof u.role === 'object' && u.role ? u.role.name : (u.job_title || 'Learner');
                        return (
                          <tr key={u.id} className="data-table-row">
                            <td className="data-table-td">
                              <div className="flex items-center gap-3">
                                <div className="size-7 rounded-full bg-accent border border-accent-foreground/20 text-accent-foreground font-semibold grid place-items-center text-xs shrink-0">
                                  {u.first_name?.[0] || u.username?.[0] || 'U'}
                                </div>
                                <div className="min-w-0">
                                  <p className="text-xs font-semibold text-foreground truncate">{u.full_name || u.username}</p>
                                  <p className="text-[11px] text-muted-foreground truncate">{u.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="data-table-td hidden sm:table-cell">
                              <span className="badge-muted">{roleName}</span>
                            </td>
                            <td className="data-table-td hidden md:table-cell">
                              <span className="text-muted-foreground text-xs">{deptName}</span>
                            </td>
                            <td className="data-table-td text-right">
                              <Link
                                to="/messenger"
                                search={{ userId: u.id }}
                                className="btn-icon"
                                title={`Chat with ${u.full_name || u.username}`}
                              >
                                <MessageSquare className="size-3.5" />
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>

          {/* Pending Access Requests */}
          <div className="section-divider">
            <div className="section-header mb-4">
              <div>
                <h2 className="section-title">Pending Access Requests</h2>
                <p className="text-caption">Approve or reject student course access requests</p>
              </div>
              <Link to="/pending-registration" className="flex items-center gap-1 text-xs font-semibold text-brand hover:opacity-80 transition-opacity">
                View All ({requests.length}) <ArrowRight className="size-3.5" />
              </Link>
            </div>

            {pendingRequests.length === 0 ? (
              <div className="card-ghost text-center py-8 space-y-2">
                <CheckCircle2 className="size-8 text-success mx-auto opacity-60" />
                <p className="text-sm font-semibold text-foreground">All Clear!</p>
                <p className="text-caption max-w-xs mx-auto">No pending course access requests require your review at this time.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {pendingRequests.slice(0, 5).map((req) => {
                  const isProcessing = processingId === req.id;
                  const studentName = (req as any).student_name || req.student_details?.full_name || 'Student';
                  const courseTitle = (req as any).course_title || `Course #${req.course}`;
                  return (
                    <div key={req.id} className="flex items-center justify-between gap-4 p-4 rounded-lg bg-card border border-border">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground truncate">{studentName}</p>
                        <p className="text-xs text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <BookOpen className="size-3 text-brand shrink-0" /> {courseTitle}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {isProcessing ? (
                          <div className="spinner" />
                        ) : (
                          <>
                            <button onClick={() => handleAction(req.id, 'accept')} className="btn-primary btn-sm">Approve</button>
                            <button onClick={() => handleAction(req.id, 'reject')} className="btn-secondary btn-sm">Reject</button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column: Quick Admin Controls */}
        <div>
          <div className="section-header mb-4">
            <h2 className="section-title">Admin Controls</h2>
          </div>
          <div className="space-y-2.5">
            {ADMIN_LINKS.map((link) => (
              <Link
                key={link.to}
                to={link.to}
                className="flex items-center gap-3.5 p-4 rounded-xl bg-card border border-border hover:border-brand/30 hover:bg-accent/30 transition-all group"
              >
                <div className={`size-9 rounded-lg border grid place-items-center shrink-0 group-hover:scale-105 transition-transform ${link.bg}`}>
                  <link.icon className={`size-4.5 ${link.color}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-foreground group-hover:text-brand transition-colors">{link.label}</p>
                  <p className="text-caption">{link.desc}</p>
                </div>
                <ArrowRight className="size-3.5 text-muted-foreground/40 group-hover:text-brand group-hover:translate-x-0.5 transition-all shrink-0" />
              </Link>
            ))}
          </div>
        </div>

      </div>
    </div>
  );
}
