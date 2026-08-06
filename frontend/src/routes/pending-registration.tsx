import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useState, useEffect } from "react";
import { fetchAccessRequests, acceptAccessRequest, rejectAccessRequest, type ApiAccessRequest, fetchCourses, type ApiCourse } from "@/lib/courses-api";
import { CheckCircle2, XCircle, Loader2, ShieldAlert, BookOpen, User, RefreshCw, Sparkles, Lock, MessageSquare, Filter } from "lucide-react";
import { PaginationControls } from "@/components/ui/PaginationControls";

export const Route = createFileRoute("/pending-registration")({
  head: () => ({ meta: [{ title: "Pending Registrations & Access Requests — Halyard Learn" }] }),
  component: PendingRegistration,
});

function PendingRegistration() {
  const [requests, setRequests] = useState<ApiAccessRequest[]>([]);
  const [courses, setCourses] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<number | null>(null);
  const [feedback, setFeedback] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'all' | 'pending' | 'accepted' | 'rejected'>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const loadData = () => {
    setLoading(true);
    Promise.all([
      fetchAccessRequests(),
      fetchCourses()
    ]).then(([reqs, rawCourses]) => {
      setRequests(reqs);
      const courseMap: Record<number, string> = {};
      rawCourses.forEach((c: ApiCourse) => {
        courseMap[c.id] = c.title;
      });
      setCourses(courseMap);
    }).catch(console.error).finally(() => setLoading(false));
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleAction = async (id: number, action: 'accept' | 'reject') => {
    setProcessingId(id);
    setFeedback(null);
    try {
      if (action === 'accept') {
        await acceptAccessRequest(id);
        setFeedback("✅ Access granted! Learner can now access the course.");
      } else {
        await rejectAccessRequest(id);
        setFeedback("🔒 Access revoked/rejected. Course locked for learner.");
      }

      setRequests(prev => prev.map(r => r.id === id ? { ...r, status: action === 'accept' ? 'accepted' : 'rejected' } : r));
      setTimeout(() => setFeedback(null), 3500);
    } catch (err: any) {
      console.error(err);
      setFeedback("⚠️ Failed to update access request.");
    } finally {
      setProcessingId(null);
    }
  };

  const filteredRequests = requests.filter(r => {
    if (activeTab === 'all') return true;
    return r.status === activeTab;
  });

  const pendingCount = requests.filter(r => r.status === 'pending').length;
  const acceptedCount = requests.filter(r => r.status === 'accepted').length;
  const rejectedCount = requests.filter(r => r.status === 'rejected').length;

  const paginatedRequests = filteredRequests.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <AppShell>
      <div className="space-y-6 max-w-6xl">
        
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-3xl font-black tracking-tight text-foreground mb-1 flex items-center gap-2">
              <ShieldAlert className="size-7 text-indigo-600" /> Pending Registrations
            </h1>
            <p className="text-sm text-foreground font-medium">Review, approve, or reject employee course enrollment access requests.</p>
          </div>

          <button
            onClick={loadData}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-card border border-border text-xs font-bold text-muted-foreground hover:text-foreground transition-all shadow-sm"
          >
            <RefreshCw className={`size-3.5 ${loading ? 'animate-spin' : ''}`} /> Refresh Requests
          </button>
        </div>

        {/* Feedback Alert */}
        {feedback && (
          <div className="p-4 rounded-xl bg-slate-900 text-white text-xs font-bold shadow-lg flex items-center gap-3 animate-fade-in border border-slate-700">
            <Sparkles className="size-4 text-emerald-400 shrink-0" />
            <span>{feedback}</span>
          </div>
        )}

        {/* Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => { setActiveTab('all'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'all'
                ? "bg-indigo-600 text-foreground shadow-md shadow-indigo-200"
                : "bg-muted text-muted-foreground hover:bg-slate-200"
            }`}
          >
            <Filter className="size-3.5" /> All ({requests.length})
          </button>

          <button
            onClick={() => { setActiveTab('pending'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'pending'
                ? "bg-amber-500 text-foreground shadow-md shadow-amber-200"
                : "bg-muted text-muted-foreground hover:bg-slate-200"
            }`}
          >
            Pending ({pendingCount})
          </button>

          <button
            onClick={() => { setActiveTab('accepted'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'accepted'
                ? "bg-emerald-600 text-foreground shadow-md shadow-emerald-200"
                : "bg-muted text-muted-foreground hover:bg-slate-200"
            }`}
          >
            Approved ({acceptedCount})
          </button>

          <button
            onClick={() => { setActiveTab('rejected'); setCurrentPage(1); }}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeTab === 'rejected'
                ? "bg-rose-600 text-foreground shadow-md shadow-rose-200"
                : "bg-muted text-muted-foreground hover:bg-slate-200"
            }`}
          >
            Rejected ({rejectedCount})
          </button>
        </div>

        {/* Table Content */}
        {loading ? (
          <div className="flex justify-center items-center p-16 bg-card rounded-2xl border border-border shadow-sm">
            <Loader2 className="size-8 animate-spin text-indigo-600" />
          </div>
        ) : filteredRequests.length === 0 ? (
          <div className="text-center py-16 border border-border rounded-2xl bg-card shadow-sm p-8">
            <ShieldAlert className="size-12 mx-auto text-foreground mb-3" />
            <h3 className="font-bold text-slate-800 text-base mb-1">No Access Requests Found</h3>
            <p className="text-xs text-muted-foreground">There are no access requests matching the selected filter tab.</p>
          </div>
        ) : (
          <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-muted/50/80 text-muted-foreground text-[11px] uppercase tracking-widest font-bold border-b border-border/50">
                <tr>
                  <th className="px-6 py-4 font-bold">Student</th>
                  <th className="px-6 py-4 font-bold">Requested Course</th>
                  <th className="px-6 py-4 font-bold">Status</th>
                  <th className="px-6 py-4 font-bold">Requested Date</th>
                  <th className="px-6 py-4 font-bold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/50">
                {paginatedRequests.map(req => {
                  const isProcessing = processingId === req.id;
                  const courseTitle = (req as any).course_title || courses[req.course] || `Course #${req.course}`;
                  const studentName = (req as any).student_name || req.student_details?.full_name || 'Unknown User';
                  const studentEmail = (req as any).student_email || req.student_details?.email || '';
                  const studentId = req.student_details?.id || req.student;

                  return (
                    <tr key={req.id} className="hover:bg-muted/50/60 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="size-9 rounded-full bg-indigo-50 text-indigo-700 font-bold grid place-items-center text-xs border border-indigo-100">
                            <User className="size-4" />
                          </div>
                          <div>
                            <div className="font-bold text-foreground">{studentName}</div>
                            <div className="text-muted-foreground text-xs">{studentEmail}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-2">
                          <BookOpen className="size-4 text-indigo-600 shrink-0" />
                          <span className="font-semibold text-slate-800">{courseTitle}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {req.status === 'accepted' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold">
                            <CheckCircle2 className="size-3.5 text-emerald-600" /> Approved
                          </span>
                        ) : req.status === 'rejected' ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 border border-rose-200 text-xs font-bold">
                            <XCircle className="size-3.5 text-rose-600" /> Rejected
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200 text-xs font-bold">
                            <Loader2 className="size-3.5 animate-spin text-amber-600" /> Pending
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-muted-foreground text-xs">
                        {new Date(req.requested_at).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' })}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            to="/messenger"
                            search={{ userId: studentId }}
                            className="p-2 rounded-xl bg-muted hover:bg-slate-200 text-muted-foreground font-semibold text-xs transition-colors"
                          >
                            <MessageSquare className="size-4" />
                          </Link>

                          {isProcessing ? (
                            <Loader2 className="size-5 animate-spin text-muted-foreground" />
                          ) : (
                            <>
                              {req.status === 'pending' && (
                                <>
                                  <button
                                    onClick={() => handleAction(req.id, 'accept')}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-foreground font-semibold text-xs transition-all shadow-sm"
                                    title="Approve Course Access"
                                  >
                                    <CheckCircle2 className="size-3.5" /> Approve
                                  </button>
                                  <button
                                    onClick={() => handleAction(req.id, 'reject')}
                                    className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-foreground font-semibold text-xs transition-all shadow-sm"
                                    title="Reject Course Access"
                                  >
                                    <XCircle className="size-3.5" /> Reject
                                  </button>
                                </>
                              )}
                              {req.status === 'accepted' && (
                                <button
                                  onClick={() => handleAction(req.id, 'reject')}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-foreground font-semibold text-xs transition-all shadow-sm"
                                  title="Revoke Access (Lock Course)"
                                >
                                  <Lock className="size-3.5" /> Revoke Access
                                </button>
                              )}
                              {req.status === 'rejected' && (
                                <button
                                  onClick={() => handleAction(req.id, 'accept')}
                                  className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-foreground font-semibold text-xs transition-all shadow-sm"
                                  title="Re-approve Course Access"
                                >
                                  <CheckCircle2 className="size-3.5" /> Re-Approve
                                </button>
                              )}
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {filteredRequests.length > 0 && (
              <div className="px-4 py-2 border-t border-border">
                <PaginationControls
                  currentPage={currentPage}
                  pageSize={pageSize}
                  totalItems={filteredRequests.length}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
