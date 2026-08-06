import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { authFetch, useAuth, API_BASE } from '@/lib/auth';
import { exportScormPackage, uploadAssessmentCsv, downloadAssessmentCsvTemplate, fetchAssessmentQuestions, type ApiAssessmentQuestion } from '@/lib/courses-api';
import {
  ArrowLeft, Save, Loader2, Send, AlertCircle, Plus, X, Eye,
  Upload, CheckCircle2, Sparkles, Download, Trash2, HelpCircle,
  FileSpreadsheet, Edit3, BookOpen, ChevronRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatusBadge } from '@/components/StatusBadge';

export const Route = createFileRoute('/org-admin/courses/$courseId/builder')({
  component: CourseBuilderPage,
});

interface ScormPackageData {
  id: number;
  version: string;
  title: string;
  launch_url: string;
  uploaded_at: string;
}

interface Course {
  id: number;
  title: string;
  subtitle: string;
  status: string;
  level: string;
  time_limit_minutes: number;
  skills: string[];
  is_scorm?: boolean;
  scorm_package?: ScormPackageData | null;
}

function CourseBuilderPage() {
  const { courseId } = Route.useParams();
  const { user } = useAuth();

  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);

  const [formData, setFormData] = useState({
    title: '',
    subtitle: '',
    level: 'Foundational',
    time_limit_minutes: 0,
    skills: [] as string[]
  });
  const [newSkill, setNewSkill] = useState('');

  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [questions, setQuestions] = useState<ApiAssessmentQuestion[]>([]);
  const [csvUploading, setCsvUploading] = useState(false);
  const [csvStatus, setCsvStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [questionModalOpen, setQuestionModalOpen] = useState(false);
  const [editingQuestion, setEditingQuestion] = useState<ApiAssessmentQuestion | null>(null);
  const [savingQuestion, setSavingQuestion] = useState(false);
  const [qFormData, setQFormData] = useState({
    question_text: '',
    option_a: '', option_b: '', option_c: '', option_d: '',
    correct_option: 'A',
  });

  useEffect(() => { fetchCourse(); fetchQuestions(); }, [courseId]);

  const fetchQuestions = async () => {
    const numericId = parseInt(String(courseId).replace('api-', ''), 10);
    if (isNaN(numericId)) return;
    try { setQuestions(await fetchAssessmentQuestions(numericId)); }
    catch (e) { console.error("Failed to load questions", e); }
  };

  const handleCsvUpload = async (file: File) => {
    const numericId = parseInt(String(courseId).replace('api-', ''), 10);
    if (isNaN(numericId)) return;
    setCsvUploading(true);
    setCsvStatus(null);
    try {
      const res = await uploadAssessmentCsv(numericId, file);
      if (res.error) { setCsvStatus({ type: 'error', message: res.error }); }
      else { setCsvStatus({ type: 'success', message: res.message || 'Questions imported!' }); fetchQuestions(); }
    } catch (e: any) {
      setCsvStatus({ type: 'error', message: e.message || 'Failed to import CSV.' });
    } finally { setCsvUploading(false); }
  };

  const handleSaveQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericId = parseInt(String(courseId).replace('api-', ''), 10);
    if (isNaN(numericId)) return;
    setSavingQuestion(true);
    try {
      const url = editingQuestion
        ? `${API_BASE}/questions/${editingQuestion.id}/`
        : `${API_BASE}/courses/${numericId}/questions/`;
      const method = editingQuestion ? 'PUT' : 'POST';
      const res = await authFetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...qFormData, course: numericId }),
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || JSON.stringify(errData));
      }
      setQuestionModalOpen(false);
      setEditingQuestion(null);
      setQFormData({ question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'A' });
      fetchQuestions();
    } catch (err: any) {
      setCsvStatus({ type: 'error', message: err.message });
    } finally { setSavingQuestion(false); }
  };

  const handleDeleteQuestion = async (qId: number) => {
    if (!confirm("Delete this question?")) return;
    try {
      const res = await authFetch(`${API_BASE}/questions/${qId}/`, { method: 'DELETE' });
      if (res.ok) { fetchQuestions(); }
    } catch (err) { console.error(err); }
  };

  const fetchCourse = async () => {
    try {
      const res = await authFetch(`${API_BASE}/courses/${courseId}/`);
      if (res.ok) {
        const data = await res.json();
        setCourse(data);
        setFormData({ title: data.title || '', subtitle: data.subtitle || '', level: data.level || 'Foundational', time_limit_minutes: data.time_limit_minutes || 0, skills: data.skills || [] });
      }
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true); setError(null);
    try {
      const res = await authFetch(`${API_BASE}/courses/${courseId}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Save failed"); }
      await fetchCourse();
    } catch (err: any) { setError(err.message); } finally { setSaving(false); }
  };

  const handlePublish = async () => {
    setPublishing(true); setError(null);
    try {
      const res = await authFetch(`${API_BASE}/courses/${courseId}/publish/`, { method: 'POST' });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail || "Publish failed"); }
      await fetchCourse();
    } catch (err: any) { setError(err.message); } finally { setPublishing(false); }
  };

  const addSkill = (e: React.KeyboardEvent | React.MouseEvent) => {
    if (e.type === 'keydown' && (e as React.KeyboardEvent).key !== 'Enter') return;
    e.preventDefault();
    if (newSkill.trim() && !formData.skills.includes(newSkill.trim())) {
      setFormData(prev => ({ ...prev, skills: [...prev.skills, newSkill.trim()] }));
      setNewSkill('');
    }
  };

  const removeSkill = (skill: string) => {
    setFormData(prev => ({ ...prev, skills: prev.skills.filter(s => s !== skill) }));
  };

  if (loading) {
    return <div className="flex h-64 items-center justify-center"><div className="spinner" /></div>;
  }

  if (!course) {
    return (
      <div className="empty-state">
        <div className="empty-state-icon"><BookOpen className="size-6" /></div>
        <h3 className="empty-state-title">Course Not Found</h3>
        <p className="empty-state-description">This course may have been removed or you don't have access.</p>
        <Link to="/org-admin/courses" className="btn-secondary mt-5"><ArrowLeft className="size-4" /> Back to Catalog</Link>
      </div>
    );
  }

  const canPublish = user?.is_platform_super_admin || user?.role?.can_publish_courses;

  return (
    <div className="space-y-0 -mt-2">
      {/* ── Sticky Page Header ─────────────────────────────────────────────── */}
      <div className="sticky top-14 z-10 bg-background/95 backdrop-blur border-b border-border/60 -mx-4 sm:-mx-6 lg:-mx-8 xl:-mx-10 px-4 sm:px-6 lg:px-8 xl:px-10 py-3 mb-6">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          {/* Breadcrumb */}
          <nav className="flex items-center gap-1.5 text-sm min-w-0">
            <Link to="/org-admin/courses" className="text-muted-foreground hover:text-foreground transition-colors font-medium">
              Course Catalog
            </Link>
            <ChevronRight className="size-3.5 text-muted-foreground/50 shrink-0" />
            <span className="text-foreground font-semibold truncate max-w-[200px] sm:max-w-xs">{course.title || "Course Builder"}</span>
            <StatusBadge status={course.status} />
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/org-admin/courses/$courseId/preview"
              params={{ courseId: String(course.id) }}
              className="btn-ghost gap-2"
            >
              <Eye className="size-4" />
              <span className="hidden sm:inline">Preview</span>
            </Link>

            {course.status === 'published' && (
              <>
                <button
                  onClick={() => exportScormPackage(course.id, "1.2")}
                  className="btn-secondary gap-1.5 text-xs font-bold"
                  title="Export SCORM 1.2 ZIP package"
                >
                  <Download className="size-3.5 text-brand" />
                  <span className="hidden sm:inline">Export SCORM 1.2</span>
                </button>
                <button
                  onClick={() => exportScormPackage(course.id, "2004")}
                  className="btn-secondary gap-1.5 text-xs font-bold"
                  title="Export SCORM 2004 ZIP package"
                >
                  <Download className="size-3.5 text-indigo-400" />
                  <span className="hidden sm:inline">Export SCORM 2004</span>
                </button>
                <a
                  href={`/courses/api-${String(course.id).replace('api-', '')}`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary gap-2"
                >
                  <Eye className="size-4" />
                  <span className="hidden sm:inline">View in Catalog</span>
                </a>
              </>
            )}

            {canPublish && course.status !== 'published' && (
              <button
                onClick={handlePublish}
                disabled={publishing || saving}
                className="btn-primary gap-2"
              >
                {publishing ? <div className="spinner-sm" /> : <Send className="size-4" />}
                Publish
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Global error banner */}
      {error && (
        <div className="mb-4 flex items-start gap-3 p-4 rounded-lg bg-destructive/10 border border-destructive/20 text-destructive text-sm">
          <AlertCircle className="size-4 shrink-0 mt-0.5" />
          <p>{error}</p>
          <button className="ml-auto btn-icon -mr-1 -mt-1 text-destructive hover:text-destructive" onClick={() => setError(null)}>
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* ── 2-Panel Authoring Layout ───────────────────────────────────────── */}
      <div className="authoring-layout">

        {/* ── LEFT: Course Details + SCORM ──────────────────────────────────── */}
        <div className="space-y-5">

          {/* Course Details form */}
          <form id="course-details-form" onSubmit={handleSave}>
            <div className="card-elevated space-y-5">
              {/* Section title */}
              <div className="flex items-center gap-3 pb-4 border-b border-border/60">
                <div className="size-8 rounded-lg bg-accent grid place-items-center shrink-0">
                  <BookOpen className="size-4 text-accent-foreground" />
                </div>
                <div>
                  <h2 className="text-heading-3 text-foreground">Course Details</h2>
                  <p className="text-caption">Configure metadata and learning objectives.</p>
                </div>
              </div>

              {/* Course Title */}
              <div className="form-group">
                <label className="form-label">Course Title <span className="text-destructive">*</span></label>
                <input
                  required
                  type="text"
                  value={formData.title}
                  onChange={e => setFormData({ ...formData, title: e.target.value })}
                  className="form-field"
                  placeholder="Enter a descriptive course title"
                />
              </div>

              {/* Description */}
              <div className="form-group">
                <label className="form-label">Description</label>
                <textarea
                  value={formData.subtitle}
                  onChange={e => setFormData({ ...formData, subtitle: e.target.value })}
                  className="form-textarea"
                  placeholder="Brief course overview visible to learners…"
                  rows={3}
                />
              </div>

              {/* Level + Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="form-group">
                  <label className="form-label">Difficulty Level</label>
                  <select
                    value={formData.level}
                    onChange={e => setFormData({ ...formData, level: e.target.value })}
                    className="form-select"
                  >
                    <option value="Foundational">Foundational</option>
                    <option value="Intermediate">Intermediate</option>
                    <option value="Advanced">Advanced</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Time Limit (minutes)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.time_limit_minutes}
                    onChange={e => setFormData({ ...formData, time_limit_minutes: parseInt(e.target.value) || 0 })}
                    className="form-field"
                  />
                  <p className="form-hint">Set to 0 for no time limit.</p>
                </div>
              </div>

              {/* Skills */}
              <div className="form-group">
                <label className="form-label">Skills Achieved</label>
                <div className="flex items-center gap-2 mb-3">
                  <input
                    type="text"
                    value={newSkill}
                    onChange={e => setNewSkill(e.target.value)}
                    onKeyDown={addSkill}
                    placeholder="e.g., Radiation Safety — press Enter to add"
                    className="form-field flex-1"
                  />
                  <button type="button" onClick={addSkill} className="btn-secondary px-3">
                    <Plus className="size-4" />
                  </button>
                </div>
                {formData.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {formData.skills.map(s => (
                      <span key={s} className="badge-muted inline-flex items-center gap-1.5">
                        {s}
                        <button type="button" onClick={() => removeSkill(s)} className="hover:text-destructive transition-colors">
                          <X className="size-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-caption italic">No skills added yet.</p>
                )}
              </div>

              {/* Save button */}
              <div className="flex justify-end pt-2 border-t border-border/60">
                <button type="submit" disabled={saving} className="btn-primary gap-2">
                  {saving ? <div className="spinner-sm" /> : <Save className="size-4" />}
                  Save Details
                </button>
              </div>
            </div>
          </form>
        </div>

        {/* ── RIGHT: Assessment Questions Panel ─────────────────────────────── */}
        <div className="authoring-sticky-rail">
          <div className="card-elevated space-y-4">
            {/* Section header */}
            <div className="pb-4 border-b border-border/60">
              <div className="flex items-center gap-2 mb-3">
                <div className="size-8 rounded-lg bg-indigo-500/15 border border-indigo-500/20 grid place-items-center shrink-0">
                  <HelpCircle className="size-4 text-indigo-400" />
                </div>
                <div>
                  <h2 className="text-heading-3 text-foreground">Assessment Questions</h2>
                  <p className="text-caption">{questions.length} question{questions.length !== 1 ? 's' : ''} configured</p>
                </div>
              </div>

              {/* Actions row */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  onClick={() => {
                    const numericId = parseInt(String(courseId).replace('api-', ''), 10);
                    if (!isNaN(numericId)) downloadAssessmentCsvTemplate(numericId).catch(() => alert('Failed to download template.'));
                  }}
                  className="btn-ghost btn-sm gap-1.5"
                >
                  <Download className="size-3.5" /> Template
                </button>

                <label className="btn-secondary btn-sm gap-1.5 cursor-pointer">
                  {csvUploading ? <div className="spinner-sm" /> : <Upload className="size-3.5" />}
                  {csvUploading ? 'Importing…' : 'Import CSV'}
                  <input type="file" accept=".csv" disabled={csvUploading} className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) handleCsvUpload(f); }} />
                </label>

                <button
                  type="button"
                  onClick={() => {
                    setEditingQuestion(null);
                    setQFormData({ question_text: '', option_a: '', option_b: '', option_c: '', option_d: '', correct_option: 'A' });
                    setQuestionModalOpen(true);
                  }}
                  className="btn-primary btn-sm gap-1.5 ml-auto"
                >
                  <Plus className="size-3.5" /> Add
                </button>
              </div>
            </div>

            {/* CSV status */}
            {csvStatus && (
              <div className={cn(
                "flex items-center justify-between gap-3 p-3 rounded-lg text-xs font-medium border",
                csvStatus.type === 'success'
                  ? "bg-success/10 border-success/20 text-success"
                  : "bg-destructive/10 border-destructive/20 text-destructive"
              )}>
                <span>{csvStatus.message}</span>
                <button type="button" onClick={() => setCsvStatus(null)} className="shrink-0 opacity-60 hover:opacity-100">
                  <X className="size-3.5" />
                </button>
              </div>
            )}

            {/* Questions list */}
            {questions.length === 0 ? (
              <div className="card-ghost text-center py-8">
                <FileSpreadsheet className="size-8 text-muted-foreground/40 mx-auto mb-2" />
                <p className="text-sm font-medium text-muted-foreground">No questions yet</p>
                <p className="text-caption mt-1 max-w-[200px] mx-auto">Upload a CSV or add questions manually to enable the assessment.</p>
              </div>
            ) : (
              <div
                className="space-y-3 overflow-y-auto custom-scrollbar pr-0.5"
                style={{ maxHeight: 'calc(100dvh - 320px)' }}
              >
                {questions.map((q, index) => (
                  <div
                    key={q.id}
                    className="p-3.5 rounded-lg border border-border hover:border-border/80 bg-muted/30 space-y-2.5 group transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <p className="text-xs font-semibold text-foreground leading-snug">Q{index + 1}. {q.question_text}</p>
                      <div className="flex items-center gap-1 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          type="button"
                          onClick={() => {
                            setEditingQuestion(q);
                            setQFormData({ question_text: q.question_text, option_a: q.option_a, option_b: q.option_b, option_c: q.option_c, option_d: q.option_d, correct_option: q.correct_option });
                            setQuestionModalOpen(true);
                          }}
                          className="btn-icon"
                        >
                          <Edit3 className="size-3.5" />
                        </button>
                        <button type="button" onClick={() => handleDeleteQuestion(q.id)} className="btn-icon hover:text-destructive hover:bg-destructive/10">
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                      {(['A', 'B', 'C', 'D'] as const).map((opt) => {
                        const text = q[`option_${opt.toLowerCase()}` as keyof typeof q] as string;
                        const isCorrect = q.correct_option === opt;
                        return (
                          <div key={opt} className={cn(
                            "px-2.5 py-1.5 rounded-md border text-[11px] leading-snug",
                            isCorrect
                              ? "bg-success/10 border-success/30 text-success font-semibold"
                              : "bg-background border-border text-muted-foreground"
                          )}>
                            {opt}) {text} {isCorrect && '✓'}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Question Add/Edit Modal ─────────────────────────────────────────── */}
      {questionModalOpen && (
        <div className="modal-overlay">
          <div className="modal-panel">
            {/* Modal header */}
            <div className="flex items-center gap-3 mb-5">
              <div className="size-9 rounded-lg bg-indigo-500/15 border border-indigo-500/20 grid place-items-center shrink-0">
                <HelpCircle className="size-4 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-heading-3 text-foreground">
                  {editingQuestion ? 'Edit Question' : 'Add Question'}
                </h3>
                <p className="text-caption">Single-choice multiple-choice format.</p>
              </div>
              <button
                type="button"
                onClick={() => setQuestionModalOpen(false)}
                className="btn-icon ml-auto"
              >
                <X className="size-4" />
              </button>
            </div>

            <form onSubmit={handleSaveQuestion} className="space-y-4">
              <div className="form-group">
                <label className="form-label">Question Text <span className="text-destructive">*</span></label>
                <textarea
                  required rows={2}
                  value={qFormData.question_text}
                  onChange={e => setQFormData({ ...qFormData, question_text: e.target.value })}
                  placeholder="Enter the assessment question…"
                  className="form-textarea"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                {(['a', 'b', 'c', 'd'] as const).map((opt) => (
                  <div key={opt} className="form-group">
                    <label className="form-label">Option {opt.toUpperCase()} <span className="text-destructive">*</span></label>
                    <input
                      type="text" required
                      value={qFormData[`option_${opt}` as keyof typeof qFormData] as string}
                      onChange={e => setQFormData({ ...qFormData, [`option_${opt}`]: e.target.value })}
                      className="form-field"
                      placeholder={`Choice ${opt.toUpperCase()}`}
                    />
                  </div>
                ))}
              </div>

              <div className="form-group">
                <label className="form-label">Correct Answer <span className="text-destructive">*</span></label>
                <select
                  value={qFormData.correct_option}
                  onChange={e => setQFormData({ ...qFormData, correct_option: e.target.value })}
                  className="form-select"
                >
                  <option value="A">Option A is correct</option>
                  <option value="B">Option B is correct</option>
                  <option value="C">Option C is correct</option>
                  <option value="D">Option D is correct</option>
                </select>
              </div>

              <div className="flex justify-end gap-2 pt-4 border-t border-border/60">
                <button type="button" onClick={() => setQuestionModalOpen(false)} className="btn-secondary">Cancel</button>
                <button type="submit" disabled={savingQuestion} className="btn-primary gap-2">
                  {savingQuestion ? <div className="spinner-sm" /> : <Save className="size-3.5" />}
                  {editingQuestion ? 'Update' : 'Save Question'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
