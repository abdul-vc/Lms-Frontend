import { createFileRoute, Link, useNavigate } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { useAuth } from '@/lib/auth';
import { fetchCourses, createCourse } from '@/lib/courses-api';
import {
  BookOpen, Plus, Pencil, Loader2, Settings, ShieldCheck,
  CheckCircle2, AlertCircle, Sparkles, Eye,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/StatusBadge';
import { PaginationControls } from '@/components/ui/PaginationControls';

export const Route = createFileRoute('/org-admin/courses')({
  component: OrgAdminCoursesPage,
});

interface Course {
  id: number;
  title: string;
  status: string;
  level: string;
  duration_hrs: number;
}

function OrgAdminCoursesPage() {
  const navigate = useNavigate();
  const [courses, setCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreating, setIsCreating] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { user } = useAuth();


  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [videoControls, setVideoControls] = useState({
    autoPauseOnIdle: true,
    idleTimeoutSeconds: 120,
    disableFastForward: true,
    requiredWatchPercentage: 80,
    randomQuestionCount: 50,
    passingScorePercent: 80,
    requireVideoCompletion: true,
    maxAssessmentWarnings: 2,
  });
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => { loadCourses(); }, []);

  const loadCourses = async () => {
    try {
      const data = await fetchCourses();
      setCourses(data);
    } catch (e) {
      console.error("Failed to fetch courses:", e);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateDraft = async () => {
    setIsCreating(true);
    try {
      const newCourse = await createCourse({
        title: "Untitled Course",
        subtitle: "",
        category: "General",
        level: "Foundational",
        status: "draft",
        hero_url: "",
        accent: "",
        duration_hrs: 1,
        passing_score: 80
      });
      if (newCourse && newCourse.id) {
        navigate({ to: "/authoring", search: { courseId: newCourse.id } });
      } else {
        await loadCourses();
      }
    } catch (e) {
      console.error("Failed to create course", e);
    } finally {
      setIsCreating(false);
    }
  };

  const handleSaveVideoControls = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => { setSavedSuccess(false); setIsSettingsOpen(false); }, 1200);
  };

  const canCreate = user?.is_platform_super_admin || user?.role?.can_create_courses;
  const canEdit = user?.is_platform_super_admin || user?.role?.can_edit_courses;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="spinner" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="page-header">
        <div>
          <h1 className="page-header-title">Course Catalog</h1>
          <p className="page-header-subtitle">Manage, configure anti-cheat policies, and publish your organization's learning content.</p>
        </div>
        <div className="flex items-center gap-2.5 shrink-0">
          <button
            onClick={() => setIsSettingsOpen(true)}
            className="btn-secondary gap-2"
          >
            <Settings className="size-4" />
            <span className="hidden sm:inline">Video Controls</span>
          </button>
          {canCreate && (
            <button onClick={handleCreateDraft} disabled={isCreating} className="btn-primary gap-2">
              {isCreating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />}
              New Course
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      {courses.length === 0 ? (
        <div className="data-table-wrapper">
          <div className="empty-state">
            <div className="empty-state-icon">
              <BookOpen className="size-6" />
            </div>
            <h3 className="empty-state-title">No Courses Yet</h3>
            <p className="empty-state-description">
              Create your first course to begin building your organization's learning catalog.
            </p>
            {canCreate && (
              <button onClick={handleCreateDraft} disabled={isCreating} className="btn-primary mt-5 gap-2">
                {isCreating ? <Loader2 className="size-4 animate-spin" /> : <Plus className="size-4" />} Create First Course
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="data-table-wrapper">
          <div className="overflow-x-auto">
            <table className="data-table">
              <thead className="data-table-thead">
                <tr>
                  <th className="data-table-th">Course</th>
                  <th className="data-table-th">Status</th>
                  <th className="data-table-th hidden sm:table-cell">Level</th>
                  <th className="data-table-th hidden md:table-cell">Duration</th>
                  <th className="data-table-th text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="data-table-tbody">
                {courses.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((c) => (
                  <tr key={c.id} className="data-table-row">
                    <td className="data-table-td">
                      <div className="flex items-center gap-3">
                        <div className="size-8 rounded-lg bg-accent grid place-items-center shrink-0">
                          <BookOpen className="size-4 text-accent-foreground" />
                        </div>
                        <span className="font-medium text-foreground">{c.title}</span>
                      </div>
                    </td>
                    <td className="data-table-td">
                      <StatusBadge status={c.status} />
                    </td>
                    <td className="data-table-td hidden sm:table-cell">
                      <span className="text-muted-foreground text-xs">{c.level}</span>
                    </td>
                    <td className="data-table-td hidden md:table-cell">
                      <span className="text-muted-foreground text-xs">{c.duration_hrs}h</span>
                    </td>
                    <td className="data-table-td text-right">
                      <div className="flex items-center justify-end gap-1">
                        {canEdit && (
                          <Link
                            to="/authoring"
                            search={{ courseId: c.id }}
                            className="btn-icon"
                            title="Edit Course in Content Authoring"
                          >
                            <Pencil className="size-3.5" />
                          </Link>
                        )}
                        <Link
                          to="/authoring"
                          search={{ courseId: c.id, preview: true }}
                          className="btn-icon"
                          title="Preview Course in Content Authoring"
                        >
                          <Eye className="size-3.5" />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {courses.length > 0 && (
              <div className="px-4 py-2 border-t border-border">
                <PaginationControls
                  currentPage={currentPage}
                  pageSize={pageSize}
                  totalItems={courses.length}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            )}
          </div>
        </div>
      )}

      {/* Global Video & Anti-Cheat Modal */}
      {isSettingsOpen && (
        <div className="modal-overlay">
          <div className="modal-panel max-w-xl">
            <div className="flex items-center justify-between mb-5">
              <div className="flex items-center gap-3">
                <div className="size-9 rounded-lg bg-accent grid place-items-center">
                  <ShieldCheck className="size-4 text-accent-foreground" />
                </div>
                <div>
                  <h2 className="text-heading-3 text-foreground">Global Video Controls</h2>
                  <p className="text-caption mt-0.5">Anti-cheat & video playback policies</p>
                </div>
              </div>
              <button onClick={() => setIsSettingsOpen(false)} className="btn-icon">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveVideoControls} className="space-y-4">
              {savedSuccess && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-success/10 border border-success/20 text-success text-xs font-semibold">
                  <CheckCircle2 className="size-4" />
                  Video and exam anti-cheat controls saved successfully!
                </div>
              )}

              {/* Auto-Pause on Idle */}
              <div className="toggle-row">
                <div>
                  <div className="toggle-label">Auto-Pause on Idle</div>
                  <div className="toggle-description">Automatically pause video if employee is inactive or switches tabs.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input type="checkbox" checked={videoControls.autoPauseOnIdle}
                    onChange={(e) => setVideoControls({ ...videoControls, autoPauseOnIdle: e.target.checked })}
                    className="sr-only peer" />
                  <div className="w-10 h-5 bg-muted rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand" />
                </label>
              </div>

              {/* Idle Timeout */}
              <div className="form-group">
                <label className="form-label">Idle Timeout (seconds)</label>
                <input type="number" className="form-field" value={videoControls.idleTimeoutSeconds}
                  onChange={(e) => setVideoControls({ ...videoControls, idleTimeoutSeconds: parseInt(e.target.value) || 0 })} />
                <p className="form-hint">Time before auto-pausing video (e.g. 120 = 2 mins).</p>
              </div>

              {/* Disable Fast-Forward */}
              <div className="toggle-row">
                <div>
                  <div className="toggle-label">Disable Fast-Forward</div>
                  <div className="toggle-description">Prevent users from seeking ahead of their max watched time.</div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer shrink-0">
                  <input type="checkbox" checked={videoControls.disableFastForward}
                    onChange={(e) => setVideoControls({ ...videoControls, disableFastForward: e.target.checked })}
                    className="sr-only peer" />
                  <div className="w-10 h-5 bg-muted rounded-full peer peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-brand" />
                </label>
              </div>

              {/* Percentages grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="form-group">
                  <label className="form-label">Required Watch %</label>
                  <input type="number" className="form-field" value={videoControls.requiredWatchPercentage}
                    onChange={(e) => setVideoControls({ ...videoControls, requiredWatchPercentage: parseInt(e.target.value) || 0 })} />
                </div>
                <div className="form-group">
                  <label className="form-label">Passing Score %</label>
                  <input type="number" className="form-field" value={videoControls.passingScorePercent}
                    onChange={(e) => setVideoControls({ ...videoControls, passingScorePercent: parseInt(e.target.value) || 0 })} />
                </div>
              </div>

              {/* Anti-Cheat */}
              <div className="p-4 rounded-lg bg-warning/8 border border-warning/20">
                <div className="flex items-center gap-2 mb-3">
                  <AlertCircle className="size-4 text-warning shrink-0" />
                  <span className="text-xs font-semibold text-foreground">Anti-Cheat & Tab Switching Rules</span>
                </div>
                <div className="form-group">
                  <label className="form-label">Max Assessment Warnings</label>
                  <input type="number" className="form-field" value={videoControls.maxAssessmentWarnings}
                    onChange={(e) => setVideoControls({ ...videoControls, maxAssessmentWarnings: parseInt(e.target.value) || 0 })} />
                  <p className="form-hint">Warnings allowed before auto-failing exam (tab switching, window focus loss).</p>
                </div>
              </div>

              <div className="section-divider flex justify-end gap-2 pt-4">
                <button type="button" onClick={() => setIsSettingsOpen(false)} className="btn-secondary">Cancel</button>
                <button type="submit" className="btn-primary">Save Controls</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
