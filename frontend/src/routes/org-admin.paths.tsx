import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { authFetch, useAuth, API_BASE } from '@/lib/auth';
import { 
  Route as PathIcon, Plus, Pencil, Trash2, BookOpen, Clock, 
  Loader2, AlertCircle, CheckCircle2, ChevronUp, ChevronDown, X, Search 
} from 'lucide-react';
import { PaginationControls } from '@/components/ui/PaginationControls';

export const Route = createFileRoute('/org-admin/paths')({
  component: OrgAdminPathsPage,
});

interface PathCourseItem {
  id: number;
  course: {
    id: number;
    title: string;
    category: string;
    level: string;
    duration_hrs: number | string;
    hero_url?: string;
  };
  order: number;
}

interface LearningPath {
  id: number;
  title: string;
  description: string;
  created_at: string;
  path_courses: PathCourseItem[];
  total_courses?: number;
  total_duration_hrs?: number;
}

interface CourseOption {
  id: number;
  title: string;
  category: string;
  duration_hrs: number | string;
  status: string;
}

function OrgAdminPathsPage() {
  const [paths, setPaths] = useState<LearningPath[]>([]);
  const [courses, setCourses] = useState<CourseOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { user } = useAuth();

  const isSuperOrAdmin = Boolean(user?.is_platform_super_admin || user?.role?.is_admin_role);
  const canCreate = isSuperOrAdmin || Boolean(user?.role?.can_create_courses || user?.role?.can_edit_courses);
  const canEdit = isSuperOrAdmin || Boolean(user?.role?.can_edit_courses);
  const canDelete = isSuperOrAdmin || Boolean(user?.role?.can_edit_courses);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPath, setEditingPath] = useState<LearningPath | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
  });
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  useEffect(() => {
    fetchAll();
  }, []);

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [pathsRes, coursesRes] = await Promise.all([
        authFetch(`${API_BASE}/paths/`),
        authFetch(`${API_BASE}/courses/`),
      ]);

      if (pathsRes.ok) {
        setPaths(await pathsRes.json());
      }
      if (coursesRes.ok) {
        const courseData = await coursesRes.json();
        setCourses(Array.isArray(courseData) ? courseData : courseData.results || []);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load learning paths.');
    } finally {
      setLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingPath(null);
    setFormData({ title: '', description: '' });
    setSelectedCourseIds([]);
    setModalError(null);
    setIsModalOpen(true);
  };

  const openEditModal = (p: LearningPath) => {
    setEditingPath(p);
    setFormData({ title: p.title, description: p.description || '' });
    setSelectedCourseIds(p.path_courses.map((pc) => pc.course.id));
    setModalError(null);
    setIsModalOpen(true);
  };

  const handleToggleCourse = (cid: number) => {
    if (selectedCourseIds.includes(cid)) {
      setSelectedCourseIds(selectedCourseIds.filter((id) => id !== cid));
    } else {
      setSelectedCourseIds([...selectedCourseIds, cid]);
    }
  };

  const handleMoveCourse = (index: number, direction: 'up' | 'down') => {
    const updated = [...selectedCourseIds];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= updated.length) return;
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;
    setSelectedCourseIds(updated);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      setModalError('Please provide a title for the learning path.');
      return;
    }

    setSubmitting(true);
    setModalError(null);

    const payload = {
      title: formData.title.trim(),
      description: formData.description.trim(),
      course_ids: selectedCourseIds,
    };

    try {
      const url = editingPath
        ? `${API_BASE}/paths/${editingPath.id}/`
        : `${API_BASE}/paths/`;

      const res = await authFetch(url, {
        method: editingPath ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || JSON.stringify(data));
      }

      await fetchAll();
      setIsModalOpen(false);
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (p: LearningPath) => {
    if (!window.confirm(`Are you sure you want to delete learning path "${p.title}"?`)) return;

    try {
      const res = await authFetch(`${API_BASE}/paths/${p.id}/`, {
        method: 'DELETE',
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.detail || 'Delete failed');
      }
      setPaths(paths.filter((x) => x.id !== p.id));
    } catch (e: any) {
      alert(`Delete failed: ${e.message}`);
    }
  };

  const filteredPaths = paths.filter(
    (p) =>
      !searchQuery ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-brand" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground mb-1">Learning Paths</h1>
          <p className="text-sm text-foreground font-medium">Design structured multi-course learning curricula for your organization.</p>
        </div>

        {canCreate && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-brand text-brand-foreground rounded-lg hover:opacity-90 transition-opacity text-sm font-medium shrink-0 shadow-sm"
          >
            <Plus className="size-4" /> Create Learning Path
          </button>
        )}
      </div>

      {error && (
        <div className="p-4 bg-red-50 text-red-600 rounded-xl text-sm flex gap-3 items-start border border-red-100">
          <AlertCircle className="size-5 shrink-0" />
          <p className="mt-0.5">{error}</p>
        </div>
      )}

      {/* Action Bar */}
      <div className="flex items-center gap-3 bg-card p-4 rounded-xl border border-border shadow-sm">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search learning paths..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-2 text-sm text-foreground placeholder:text-muted-foreground bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand font-medium"
          />
        </div>
      </div>

      {/* Learning Path Cards List */}
      <div className="space-y-6">
        {filteredPaths.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground bg-card rounded-2xl border border-dashed border-border shadow-sm">
            <PathIcon className="size-12 mx-auto text-foreground mb-3" />
            <h3 className="font-semibold text-slate-800 text-base mb-1">No Learning Paths Configured</h3>
            <p className="text-xs text-muted-foreground mb-4">Create your first multi-course curriculum path to guide learner development.</p>
            {canCreate && (
              <button
                onClick={openAddModal}
                className="inline-flex items-center gap-2 px-4 py-2 bg-brand text-brand-foreground rounded-lg hover:opacity-90 transition-opacity text-xs font-semibold shadow-sm"
              >
                <Plus className="size-4" /> Add Path
              </button>
            )}
          </div>
        ) : (
          filteredPaths.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((path) => (
            <div key={path.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden p-6 space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-accent text-accent-foreground border border-brand/20 uppercase tracking-wider">
                      {path.path_courses.length} Courses
                    </span>
                    {path.total_duration_hrs !== undefined && (
                      <span className="text-xs text-muted-foreground font-medium">
                        ~{path.total_duration_hrs} Hours Total
                      </span>
                    )}
                  </div>
                  <h3 className="text-xl font-bold text-foreground">{path.title}</h3>
                  {path.description && (
                    <p className="text-xs text-muted-foreground leading-relaxed max-w-3xl">{path.description}</p>
                  )}
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  {canEdit && (
                    <button
                      onClick={() => openEditModal(path)}
                      className="p-2 text-muted-foreground hover:text-brand hover:bg-accent transition-colors rounded-lg"
                      title="Edit Path"
                    >
                      <Pencil className="size-4" />
                    </button>
                  )}
                  {canDelete && (
                    <button
                      onClick={() => handleDelete(path)}
                      className="p-2 text-muted-foreground hover:text-red-600 transition-colors rounded-lg hover:bg-red-50"
                      title="Delete Path"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Path Courses Sequence */}
              {path.path_courses && path.path_courses.length > 0 && (
                <div className="space-y-2 border-t border-border pt-4">
                  <h4 className="text-[11px] font-bold text-muted-foreground uppercase tracking-wider">Course Sequence</h4>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {path.path_courses.map((pc, idx) => (
                      <div key={pc.id || idx} className="flex items-center gap-2.5 p-2.5 rounded-xl bg-muted/40 border border-border/50">
                        <span className="size-5 rounded-full bg-accent text-accent-foreground font-bold text-[10px] grid place-items-center shrink-0">
                          {idx + 1}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-xs font-bold text-foreground truncate">{pc.course?.title || 'Course'}</p>
                          <p className="text-[10px] text-muted-foreground">{pc.course?.duration_hrs || 1}h • {pc.course?.level || 'All'}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))
        )}

        {filteredPaths.length > 0 && (
          <div className="bg-card rounded-2xl border border-border px-4 py-2">
            <PaginationControls
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={filteredPaths.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </div>

      {/* CREATE / EDIT MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-card/50 backdrop-blur-sm p-4">
          <div className="bg-card rounded-2xl border border-border shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-6">
            <div className="flex items-center justify-between border-b border-border pb-4">
              <h2 className="text-lg font-bold text-foreground">
                {editingPath ? 'Edit Learning Path' : 'Create Learning Path'}
              </h2>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-foreground">
                <X className="size-5" />
              </button>
            </div>

            {modalError && (
              <div className="p-3 bg-red-50 text-red-600 rounded-xl text-xs flex gap-2 items-center">
                <AlertCircle className="size-4 shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Path Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g., Full-Stack Web Engineering Pathway"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="w-full px-3 py-2 text-sm text-foreground bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand font-medium"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-foreground">Description</label>
                <textarea
                  rows={3}
                  placeholder="Describe the curriculum goals and targeted competencies..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-3 py-2 text-sm text-foreground bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand/20 focus:border-brand font-medium resize-none"
                />
              </div>

              {/* Course Selector & Ordering */}
              <div className="space-y-3 border-t border-border pt-4">
                <h3 className="text-xs font-bold text-foreground uppercase tracking-wider">
                  Select & Sequence Path Courses
                </h3>

                {/* Selected Sequence List */}
                {selectedCourseIds.length > 0 && (
                  <div className="space-y-2 mb-4 bg-muted/30 p-3 rounded-xl border border-border">
                    <p className="text-[11px] font-bold text-muted-foreground">Path Sequence Order:</p>
                    {selectedCourseIds.map((cid, idx) => {
                      const c = courses.find((x) => x.id === cid);
                      return (
                        <div
                          key={cid}
                          className="flex items-center justify-between p-2 rounded-lg bg-card border border-border text-xs"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="size-5 rounded bg-accent text-accent-foreground grid place-items-center font-bold text-[10px]">
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-foreground truncate">{c?.title || `Course ID ${cid}`}</span>
                          </div>

                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => handleMoveCourse(idx, 'up')}
                              disabled={idx === 0}
                              className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                            >
                              <ChevronUp className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleMoveCourse(idx, 'down')}
                              disabled={idx === selectedCourseIds.length - 1}
                              className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30"
                            >
                              <ChevronDown className="size-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleCourse(cid)}
                              className="p-1 text-red-500 hover:text-red-700 ml-1"
                            >
                              <X className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {/* Course Selection List */}
                <div className="max-h-48 overflow-y-auto space-y-1.5 border border-border rounded-xl p-2 bg-card">
                  {courses.length === 0 ? (
                    <p className="text-xs text-muted-foreground text-center py-4">No published courses available.</p>
                  ) : (
                    courses.map((c) => {
                      const isSelected = selectedCourseIds.includes(c.id);
                      return (
                        <label
                          key={c.id}
                          className={`flex items-center justify-between p-2 rounded-lg cursor-pointer text-xs transition-colors ${
                            isSelected ? 'bg-accent border border-brand/30' : 'hover:bg-muted/50'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleCourse(c.id)}
                              className="rounded text-brand focus:ring-brand"
                            />
                            <span className="font-medium text-foreground">{c.title}</span>
                          </div>
                          <span className="text-[10px] text-muted-foreground">{c.category} • {c.duration_hrs || 1}h</span>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground rounded-lg"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="flex items-center gap-2 px-5 py-2 bg-brand text-brand-foreground rounded-lg hover:opacity-90 text-xs font-bold transition-opacity disabled:opacity-50 shadow-sm"
                >
                  {submitting && <Loader2 className="size-3.5 animate-spin" />}
                  {submitting ? 'Saving...' : editingPath ? 'Save Changes' : 'Create Path'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
