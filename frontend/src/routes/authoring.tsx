import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus, Minus, ChevronRight, ChevronDown, BookOpen, Layers, Video,
  Puzzle, FileText, CheckSquare, GitBranch, Trash2, Save,
  Lock, Unlock, Globe, FileEdit, X, Check, Loader2,
  RefreshCw, GripVertical, Eye, EyeOff, ImagePlus, Upload, Link2, Download,
  Sparkles, CheckCircle2, Package, PlayCircle, AlertTriangle, AlertCircle, History,
} from "lucide-react";
import {
  type ApiCourse, type ApiModule, type ApiLesson,
  fetchCourses, createCourse, updateCourse, deleteCourse,
  createModule, updateModule, deleteModule,
  createLesson, updateLesson, deleteLesson,
  downloadAssessmentCsvTemplate, uploadAssessmentCsv, uploadLessonVideo,
  exportScormPackage, fetchCourseVersions,
  rollbackCourseVersion, uploadUniversalImport,
  fetchAssessmentQuestions, type ApiAssessmentQuestion
} from "@/lib/courses-api";
import { authFetch, useAuth, API_BASE } from "@/lib/auth";
import { ScormPlayer } from "@/components/ScormPlayer";
import { PolymorphicLessonRenderer } from "@/components/PolymorphicLessonRenderer";
import { BlockEditorCanvas } from "@/components/BlockEditorCanvas";

export const Route = createFileRoute("/authoring")({
  validateSearch: (search: Record<string, unknown>): { courseId?: number; preview?: boolean } => {
    return {
      courseId: search.courseId ? Number(search.courseId) : undefined,
      preview: search.preview ? Boolean(search.preview) : undefined,
    };
  },
  head: () => ({ meta: [{ title: "Content Authoring — Halyard Learn" }] }),
  component: Authoring,
});

// ─── Available options ───────────────────────────────────────────────────

const LESSON_TYPE_OPTIONS = [
  { value: "video", label: "Video", icon: Video },
  { value: "interactive", label: "Interactive", icon: Puzzle },
  { value: "reading", label: "Reading", icon: FileText },
  { value: "knowledge_check", label: "Knowledge Check", icon: CheckSquare },
  { value: "scenario", label: "Scenario", icon: GitBranch },
];

// ─── Selection state ───────────────────────────────────────────────────────
type Selection =
  | null
  | { kind: "new-course" }
  | { kind: "course"; courseId: number }
  | { kind: "new-module"; courseId: number }
  | { kind: "module"; courseId: number; moduleId: number }
  | { kind: "new-lesson"; courseId: number; moduleId: number }
  | { kind: "lesson"; courseId: number; moduleId: number; lessonId: number };

// ─── Form types ────────────────────────────────────────────────────────────
interface CourseForm {
  title: string; subtitle: string;
  category: ApiCourse["category"]; level: ApiCourse["level"];
  status: ApiCourse["status"]; hero_url: string;
  duration_hrs: number; passing_score: number;
}
interface ModuleForm {
  title: string; summary: string; order: number; locked: boolean;
}
interface LessonForm {
  title: string; duration: string;
  type: ApiLesson["type"]; order: number;
  video_id: number | null; video_url: string | null; interaction: string | null;
}

const defaultCourseForm: CourseForm = {
  title: "", subtitle: "", category: "General", level: "Foundational",
  status: "draft", hero_url: "", duration_hrs: 1, passing_score: 80,
};
const defaultModuleForm: ModuleForm = {
  title: "", summary: "", order: 0, locked: false,
};
const defaultLessonForm: LessonForm = {
  title: "", duration: "5 min", type: "video", order: 0,
  video_id: null, video_url: null, interaction: null,
};

// ─── Toast helper ──────────────────────────────────────────────────────────
function useToast() {
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const show = useCallback((msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  }, []);
  return { toast, show };
}

// ─── Status badge ──────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: ApiCourse["status"] }) {
  const map = {
    draft: "bg-amber-100 text-amber-700 border-amber-200",
    published: "bg-emerald-100 text-emerald-700 border-emerald-200",
    archived: "bg-muted text-muted-foreground border-border",
  };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-widest border ${map[status]}`}>
      {status === "published" && <Globe className="size-2.5" />}
      {status === "draft" && <FileEdit className="size-2.5" />}
      {status === "archived" && <EyeOff className="size-2.5" />}
      {status}
    </span>
  );
}

// ─── Lesson type icon ──────────────────────────────────────────────────────
function LessonTypeIcon({ type }: { type: ApiLesson["type"] }) {
  const map = {
    video: { Icon: Video, cls: "text-blue-500" },
    interactive: { Icon: Puzzle, cls: "text-purple-500" },
    reading: { Icon: FileText, cls: "text-muted-foreground" },
    knowledge_check: { Icon: CheckSquare, cls: "text-orange-500" },
    scenario: { Icon: GitBranch, cls: "text-indigo-500" },
  };
  const { Icon, cls } = map[type] ?? { Icon: FileText, cls: "text-muted-foreground" };
  return <Icon className={`size-3.5 shrink-0 ${cls}`} />;
}

// ─── Form field helpers ────────────────────────────────────────────────────
function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-foreground/70 mb-1">{label}</label>
      {children}
      {hint && <p className="text-[10px] text-muted-foreground mt-1">{hint}</p>}
    </div>
  );
}

const inputCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all";
const selectCls =
  "w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all";

// ─── Main Authoring Component ──────────────────────────────────────────────
function Authoring() {
  const { user } = useAuth();
  const { toast, show } = useToast();
  const [courses, setCourses] = useState<ApiCourse[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selection, setSelection] = useState<Selection>(null);
  const [expandedCourses, setExpandedCourses] = useState<Set<number>>(new Set());
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  const [courseForm, setCourseForm] = useState<CourseForm>(defaultCourseForm);
  const [moduleForm, setModuleForm] = useState<ModuleForm>(defaultModuleForm);
  const [lessonForm, setLessonForm] = useState<LessonForm>(defaultLessonForm);
  const [isUploadingCsv, setIsUploadingCsv] = useState(false);
  const [importedQuestions, setImportedQuestions] = useState<ApiAssessmentQuestion[]>([]);
  const [isPreviewMode, setIsPreviewMode] = useState(false);

  // Enterprise Authoring Pipeline state
  const [publishErrors, setPublishErrors] = useState<string[] | null>(null);
  const [showVersionsModal, setShowVersionsModal] = useState(false);
  const [courseVersions, setCourseVersions] = useState<any[]>([]);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importFormat, setImportFormat] = useState("scorm");

  const handlePublishCourse = async (courseId: number) => {
    setPublishErrors(null);
    try {
      const res = await authFetch(`${API_BASE}/courses/${courseId}/publish/`, {
        method: "POST",
      });
      if (res.ok) {
        show("Course published successfully! Immutable version snapshot created. SCORM export enabled.");
        await load();
      } else {
        let err: any = {};
        try {
          err = await res.json();
        } catch {
          err = { detail: `Server response error (${res.status} ${res.statusText})` };
        }
        if (err.errors) {
          setPublishErrors(err.errors);
          show("Pre-flight publishing validation failed", false);
        } else {
          show(err.detail || "Publishing failed", false);
        }
      }
    } catch (e: any) {
      show(e.message || "Publishing failed", false);
    }
  };

  const handleOpenVersions = async (courseId: number) => {
    try {
      const versions = await fetchCourseVersions(courseId);
      setCourseVersions(versions);
      setShowVersionsModal(true);
    } catch (e: any) {
      show("Failed to load version history", false);
    }
  };

  const handleRollback = async (versionId: number) => {
    try {
      await rollbackCourseVersion(versionId);
      show("Course restored to draft state from version snapshot. Historical snapshots preserved.");
      setShowVersionsModal(false);
      await load();
    } catch (e: any) {
      show(e.message || "Rollback failed", false);
    }
  };

  const handleExecuteImport = async () => {
    if (!importFile) {
      show("Please select a course package or document file", false);
      return;
    }
    setImporting(true);
    try {
      const res = await uploadUniversalImport(importFile, importFormat);
      show(`Import completed! Converted to Internal LMS format. Original file preserved.`);
      setShowImportModal(false);
      setImportFile(null);
      await load();
      if (res.target_course_id) {
        setExpandedCourses((s) => new Set([...s, res.target_course_id]));
        setSelection({ kind: "course", courseId: res.target_course_id });
      }
    } catch (e: any) {
      show(e.message || "Import failed", false);
    } finally {
      setImporting(false);
    }
  };

  // ── Load ─────────────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await fetchCourses();
      setCourses(data);

      // Auto-select course if courseId query param is provided
      const searchParams = new URLSearchParams(window.location.search);
      const qCourseId = searchParams.get('courseId');
      if (qCourseId) {
        const cid = Number(qCourseId);
        const match = data.find((x) => x.id === cid);
        if (match) {
          setExpandedCourses((s) => new Set([...s, cid]));
          setSelection({ kind: "course", courseId: cid });
        }
      }
    } catch {
      show("Could not reach the API — is the Django server running?", false);
    } finally {
      setLoading(false);
    }
  }, [show]);

  const search = Route.useSearch();

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (search.courseId && courses.length > 0) {
      const cid = Number(search.courseId);
      const match = courses.find((x) => x.id === cid);
      if (match) {
        setExpandedCourses((s) => new Set([...s, cid]));
        setSelection({ kind: "course", courseId: cid });
        if (search.preview) {
          setIsPreviewMode(true);
        }
      }
    }
  }, [search.courseId, search.preview, courses]);

  useEffect(() => {
    if (selection?.kind === "course") {
      fetchAssessmentQuestions(selection.courseId).then(setImportedQuestions).catch(() => {});
    }
  }, [selection]);

  // ── Access control ────────────────────────────────────────────────────────
  const isSuper = user?.is_platform_super_admin ?? false;
  const role = user?.role;
  const canAuthor = isSuper || Boolean(role && (
    role.can_create_courses || 
    role.can_edit_courses || 
    role.can_publish_courses ||
    Boolean(user)
  ));

  // ── Populate form when selection changes ──────────────────────────────────
  useEffect(() => {
    if (!selection) return;
    if (selection.kind === "new-course") {
      setCourseForm(defaultCourseForm);
    } else if (selection.kind === "course") {
      const c = courses.find((x) => x.id === selection.courseId);
      if (c) setCourseForm({ title: c.title ?? "", subtitle: c.subtitle ?? "", category: c.category ?? "General", level: c.level ?? "Foundational", status: c.status ?? "draft", hero_url: c.hero_url ?? "", duration_hrs: c.duration_hrs ?? 1, passing_score: c.passing_score ?? 80 });
    } else if (selection.kind === "new-module") {
      const c = courses.find((x) => x.id === selection.courseId);
      setModuleForm({ title: "", summary: "", order: c?.modules.length ?? 0, locked: false });
    } else if (selection.kind === "module") {
      const c = courses.find((x) => x.id === selection.courseId);
      const m = c?.modules.find((x) => x.id === selection.moduleId);
      if (m) setModuleForm({ title: m.title ?? "", summary: m.summary ?? "", order: m.order ?? 0, locked: m.locked ?? false });
    } else if (selection.kind === "new-lesson") {
      const c = courses.find((x) => x.id === selection.courseId);
      const m = c?.modules.find((x) => x.id === selection.moduleId);
      setLessonForm({ title: "", duration: "5 min", type: "video", order: m?.lessons.length ?? 0, video_id: null, video_url: "", interaction: "" });
    } else if (selection.kind === "lesson") {
      const c = courses.find((x) => x.id === selection.courseId);
      const m = c?.modules.find((x) => x.id === selection.moduleId);
      const l = m?.lessons.find((x) => x.id === selection.lessonId);
      if (l) setLessonForm({ title: l.title ?? "", duration: l.duration ?? "5 min", type: l.type ?? "video", order: l.order ?? 0, video_id: (l as any).video_id ?? null, video_url: l.video_url ?? "", interaction: l.interaction ?? "" });
    }
  }, [selection, courses]);

  // ── Tree helpers ──────────────────────────────────────────────────────────
  const toggleCourse = (id: number) =>
    setExpandedCourses((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });
  const toggleModule = (id: number) =>
    setExpandedModules((s) => { const n = new Set(s); n.has(id) ? n.delete(id) : n.add(id); return n; });

  // ── Save handlers ─────────────────────────────────────────────────────────
  const save = async () => {
    if (!selection) return;
    setSaving(true);
    try {
      if (selection.kind === "new-course") {
        const created = await createCourse({ ...courseForm, accent: "var(--brand)" });
        await load();
        setExpandedCourses((s) => new Set([...s, created.id]));
        setSelection({ kind: "course", courseId: created.id });
        show("Course created ✓");
      } else if (selection.kind === "course") {
        await updateCourse(selection.courseId, courseForm);
        await load();
        show("Course saved ✓");
      } else if (selection.kind === "new-module") {
        const created = await createModule(selection.courseId, moduleForm);
        await load();
        setExpandedModules((s) => new Set([...s, created.id]));
        setSelection({ kind: "module", courseId: selection.courseId, moduleId: created.id });
        show("Module created ✓");
      } else if (selection.kind === "module") {
        await updateModule(selection.moduleId, moduleForm);
        await load();
        show("Module saved ✓");
      } else if (selection.kind === "new-lesson") {
        const created = await createLesson(selection.moduleId, lessonForm);
        await load();
        setSelection({ kind: "lesson", courseId: selection.courseId, moduleId: selection.moduleId, lessonId: created.id });
        show("Lesson created ✓");
      } else if (selection.kind === "lesson") {
        await updateLesson(selection.lessonId, lessonForm);
        await load();
        show("Lesson saved ✓");
      }
    } catch (e: unknown) {
      show((e as Error).message ?? "Save failed", false);
    } finally {
      setSaving(false);
    }
  };

  // ── Delete handlers ───────────────────────────────────────────────────────
  const handleDeleteCourse = async (id: number) => {
    if (!window.confirm("Delete this course and all its modules and lessons? This cannot be undone.")) return;
    await deleteCourse(id);
    setSelection(null);
    await load();
    show("Course deleted");
  };
  const handleDeleteModule = async (courseId: number, moduleId: number) => {
    if (!window.confirm("Delete this module and all its lessons?")) return;
    await deleteModule(moduleId);
    setSelection({ kind: "course", courseId });
    await load();
    show("Module deleted");
  };
  const handleDeleteLesson = async (courseId: number, moduleId: number, lessonId: number) => {
    if (!window.confirm("Delete this lesson?")) return;
    await deleteLesson(lessonId);
    setSelection({ kind: "module", courseId, moduleId });
    await load();
    show("Lesson deleted");
  };

  // ── Derived: find objects by selection ───────────────────────────────────
  const selectedCourse = selection && "courseId" in selection
    ? courses.find((c) => c.id === selection.courseId) : null;
  const selectedModule = selection && "moduleId" in selection && selectedCourse
    ? selectedCourse.modules.find((m) => m.id === (selection as { moduleId: number }).moduleId) : null;
  const selectedLesson = selection && "lessonId" in selection && selectedModule
    ? selectedModule.lessons.find((l) => l.id === (selection as { lessonId: number }).lessonId) : null;

  // ── Can save? ─────────────────────────────────────────────────────────────
  const canSave = (() => {
    if (!selection) return false;
    if (selection.kind === "new-course" || selection.kind === "course") return courseForm.title.trim().length > 0;
    if (selection.kind === "new-module" || selection.kind === "module") return moduleForm.title.trim().length > 0;
    if (selection.kind === "new-lesson" || selection.kind === "lesson") return lessonForm.title.trim().length > 0;
    return false;
  })();

  const isNewMode = selection && (selection.kind === "new-course" || selection.kind === "new-module" || selection.kind === "new-lesson");

  if (user && !canAuthor) {
    return (
      <AppShell>
        <div className="p-12 text-center">
          <h2 className="text-xl font-medium text-foreground mb-2">Access Denied</h2>
          <p className="text-muted-foreground text-sm">You do not have permission to access Content Authoring.</p>
        </div>
      </AppShell>
    );
  }

  return (
    <AppShell maxWidth="max-w-none px-3 py-4 lg:px-4 lg:py-4">
      {/* ── Page header ────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Content Authoring</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Build courses, modules and lessons — published courses appear live in the learner catalog.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={load}
            disabled={loading}
            className="p-2 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:opacity-40"
            title="Refresh"
          >
            <RefreshCw className={`size-4 ${loading ? "animate-spin" : ""}`} />
          </button>
          <button
            onClick={() => setIsPreviewMode((p) => !p)}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border text-xs font-semibold transition-all ${
              isPreviewMode
                ? "bg-brand text-brand-foreground border-brand shadow-sm"
                : "border-border text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
            title={isPreviewMode ? "Switch to Edit Mode" : "Switch to Preview Mode"}
          >
            <Eye className="size-3.5" />
            <span>{isPreviewMode ? "Editing Mode" : "Preview"}</span>
          </button>
          <button
            onClick={() => setShowImportModal(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-xs font-semibold hover:bg-muted transition-colors"
          >
            <Upload className="size-3.5 text-brand" /> Import Course
          </button>
          <button
            onClick={() => setSelection({ kind: "new-course" })}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-brand-foreground text-sm font-medium hover:opacity-90 transition-opacity"
          >
            <Plus className="size-4" /> New Course
          </button>
        </div>
      </div>

      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-elevated text-sm font-medium transition-all ${toast.ok ? "bg-emerald-600 text-foreground" : "bg-destructive text-destructive-foreground"}`}>
          {toast.ok ? <Check className="size-4" /> : <X className="size-4" />}
          {toast.msg}
        </div>
      )}

      {/* ── 2-panel layout: Course Library (fixed 280px) + Expanded Edit/Preview Workspace (1fr) ── */}
      <div className="grid lg:grid-cols-[280px_1fr] gap-4" style={{ minHeight: "calc(100vh - 160px)" }}>

        {/* ── LEFT: Course Library ────────────────────────────────────────── */}
        <aside className="rounded-2xl ring-1 ring-border bg-card overflow-y-auto flex flex-col">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <p className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
              Course Library
            </p>
            <span className="text-[10px] font-medium text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
              {courses.length}
            </span>
          </div>

          {loading ? (
            <div className="flex-1 grid place-items-center py-12">
              <Loader2 className="size-6 text-muted-foreground animate-spin" />
            </div>
          ) : courses.length === 0 ? (
            <div className="flex-1 grid place-items-center py-12 text-center px-6">
              <BookOpen className="size-8 text-muted-foreground/40 mb-3" />
              <p className="text-sm text-muted-foreground">No courses yet.</p>
              <p className="text-xs text-muted-foreground mt-1">Click "＋ New Course" to start.</p>
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto py-2">
              {courses.map((course) => {
                const isExpanded = expandedCourses.has(course.id);
                const isCourseSel = selection?.kind === "course" && (selection as { courseId: number }).courseId === course.id;
                return (
                  <div key={course.id}>
                    {/* Course row */}
                    <div
                      className={`group flex items-center gap-1.5 px-3 py-2.5 cursor-pointer hover:bg-muted/60 transition-colors ${isCourseSel ? "bg-brand/8 border-l-2 border-brand" : ""}`}
                    >
                      <button onClick={() => toggleCourse(course.id)} className="text-muted-foreground hover:text-foreground">
                        {isExpanded ? <ChevronDown className="size-3.5" /> : <ChevronRight className="size-3.5" />}
                      </button>
                      <button
                        className="flex-1 flex items-center gap-2 text-left min-w-0"
                        onClick={() => { setSelection({ kind: "course", courseId: course.id }); if (!isExpanded) toggleCourse(course.id); }}
                      >
                        <BookOpen className="size-3.5 text-brand shrink-0" />
                        <span className="text-sm font-medium truncate">{course.title}</span>
                        <StatusBadge status={course.status} />
                      </button>
                      <button
                        onClick={() => handleDeleteCourse(course.id)}
                        className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-0.5"
                        title="Delete course"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    </div>

                    {/* Modules */}
                    {isExpanded && (
                      <div className="pl-6">
                        {course.modules.map((mod) => {
                          const isModExpanded = expandedModules.has(mod.id);
                          const isModSel = selection?.kind === "module" && (selection as { moduleId: number }).moduleId === mod.id;
                          return (
                            <div key={mod.id}>
                              <div className={`group flex items-center gap-1.5 px-3 py-2 cursor-pointer hover:bg-muted/60 transition-colors ${isModSel ? "bg-brand/8 border-l-2 border-brand" : ""}`}>
                                <button onClick={() => toggleModule(mod.id)} className="text-muted-foreground hover:text-foreground">
                                  {isModExpanded ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
                                </button>
                                <button
                                  className="flex-1 flex items-center gap-2 text-left min-w-0"
                                  onClick={() => { setSelection({ kind: "module", courseId: course.id, moduleId: mod.id }); if (!isModExpanded) toggleModule(mod.id); }}
                                >
                                  <Layers className="size-3 text-muted-foreground shrink-0" />
                                  <span className="text-xs font-medium truncate flex-1">{mod.title}</span>
                                </button>
                                <button
                                  onClick={() => handleDeleteModule(course.id, mod.id)}
                                  className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-0.5"
                                >
                                  <Trash2 className="size-2.5" />
                                </button>
                              </div>

                              {/* Lessons */}
                              {isModExpanded && (
                                <div className="pl-5">
                                  {mod.lessons.map((lesson) => {
                                    const isLessonSel = selection?.kind === "lesson" && (selection as { lessonId: number }).lessonId === lesson.id;
                                    return (
                                      <div
                                        key={lesson.id}
                                        className={`group flex items-center gap-2 px-3 py-1.5 cursor-pointer hover:bg-muted/60 transition-colors ${isLessonSel ? "bg-brand/8 border-l-2 border-brand" : ""}`}
                                      >
                                        <button
                                          className="flex-1 flex items-center gap-2 text-left min-w-0"
                                          onClick={() => setSelection({ kind: "lesson", courseId: course.id, moduleId: mod.id, lessonId: lesson.id })}
                                        >
                                          <LessonTypeIcon type={lesson.type} />
                                          <span className="text-xs truncate flex-1">{lesson.title}</span>
                                          <span className="text-[9px] text-muted-foreground font-mono shrink-0">{lesson.duration}</span>
                                        </button>
                                        <button
                                          onClick={() => handleDeleteLesson(course.id, mod.id, lesson.id)}
                                          className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive transition-all p-0.5"
                                        >
                                          <Trash2 className="size-2.5" />
                                        </button>
                                      </div>
                                    );
                                  })}
                                  {/* Add lesson button */}
                                  <button
                                    onClick={() => setSelection({ kind: "new-lesson", courseId: course.id, moduleId: mod.id })}
                                    className="w-full flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground hover:text-brand hover:bg-brand/5 transition-colors rounded"
                                  >
                                    <Plus className="size-3" /> Add lesson
                                  </button>
                                </div>
                              )}
                            </div>
                          );
                        })}
                        {/* Add module button */}
                        <button
                          onClick={() => setSelection({ kind: "new-module", courseId: course.id })}
                          className="w-full flex items-center gap-2 px-4 py-2 text-xs text-muted-foreground hover:text-brand hover:bg-brand/5 transition-colors rounded"
                        >
                          <Plus className="size-3" /> Add module
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </aside>

        {/* ── RIGHT: Expanded Workspace (Edit Mode OR Preview Mode) ──────────────── */}
        {isPreviewMode ? (
          /* ── Full-Width Preview Mode ── */
          <div className="rounded-2xl ring-1 ring-border bg-card overflow-y-auto flex flex-col">
            <div className="p-5 border-b border-border flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="size-8 rounded-lg bg-brand/10 grid place-items-center text-brand">
                  <Eye className="size-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-sm font-bold text-foreground">Course Preview Workspace</h2>
                    {selectedCourse && <StatusBadge status={selectedCourse.status} />}
                  </div>
                  <p className="text-xs text-muted-foreground">Full-width preview of course layout, modules, and interactive lesson player</p>
                </div>
              </div>
              <button
                onClick={() => setIsPreviewMode(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-border text-xs font-semibold hover:bg-muted transition-colors"
              >
                <FileEdit className="size-3.5 text-brand" />
                <span>Back to Edit Mode</span>
              </button>
            </div>

            {selectedCourse ? (
              <div className="p-6 space-y-6 flex-1 overflow-y-auto custom-scrollbar">
                {/* Course Banner */}
                <div className="rounded-2xl overflow-hidden ring-1 ring-border bg-background shadow-sm">
                  {selectedCourse.hero_url ? (
                    <img src={selectedCourse.hero_url} alt="" className="w-full h-48 object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }} />
                  ) : (
                    <div className="w-full h-36 bg-gradient-to-r from-brand/20 via-brand/10 to-brand/5 grid place-items-center">
                      <BookOpen className="size-12 text-brand/40" />
                    </div>
                  )}
                  <div className="p-6">
                    <div className="flex items-center justify-between gap-4 mb-2">
                      <span className="text-xs font-bold uppercase tracking-widest text-brand">{selectedCourse.category}</span>
                      <span className="text-xs text-muted-foreground bg-muted px-2.5 py-1 rounded-full font-medium">{selectedCourse.level}</span>
                    </div>
                    <h1 className="text-xl font-bold text-foreground mb-2">{selectedCourse.title || "Untitled course"}</h1>
                    {selectedCourse.subtitle && <p className="text-sm text-muted-foreground max-w-3xl leading-relaxed">{selectedCourse.subtitle}</p>}
                    
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 pt-4 border-t border-border/60">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Duration</p>
                        <p className="text-sm font-semibold text-foreground mt-0.5">{selectedCourse.duration_hrs} hours</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Passing Score</p>
                        <p className="text-sm font-semibold text-foreground mt-0.5">{selectedCourse.passing_score}%</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Modules</p>
                        <p className="text-sm font-semibold text-foreground mt-0.5">{selectedCourse.modules.length}</p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Total Lessons</p>
                        <p className="text-sm font-semibold text-foreground mt-0.5">{selectedCourse.modules.reduce((s, m) => s + m.lessons.length, 0)}</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Polymorphic Lesson Preview when a lesson is selected */}
                {selectedLesson && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                        <LessonTypeIcon type={selectedLesson.type} />
                        Active Lesson Preview: <span className="text-foreground">{selectedLesson.title}</span>
                      </h3>
                      <span className="text-xs font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">{selectedLesson.duration}</span>
                    </div>
                    <div className="rounded-2xl overflow-hidden ring-1 ring-border p-5 bg-background shadow-sm">
                      <PolymorphicLessonRenderer lesson={selectedLesson} isAuthoringPreview={true} />
                    </div>
                  </div>
                )}

                {/* Modules & Curriculum Breakdown */}
                <div className="space-y-3">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Curriculum & Module Breakdown</h3>
                  {selectedCourse.modules.length === 0 ? (
                    <p className="text-xs text-muted-foreground italic">No modules added to this course yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {selectedCourse.modules.map((m, idx) => (
                        <div key={m.id} className="rounded-xl border border-border bg-card p-4 space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-foreground flex items-center gap-2">
                              <Layers className="size-3.5 text-brand" />
                              Module {idx + 1}: {m.title}
                            </span>
                            <span className="text-[10px] text-muted-foreground font-medium">{m.lessons.length} lessons</span>
                          </div>
                          {m.summary && <p className="text-xs text-muted-foreground">{m.summary}</p>}
                          <div className="grid sm:grid-cols-2 gap-2 pt-2 border-t border-border/40">
                            {m.lessons.map((l) => (
                              <div key={l.id} className="flex items-center justify-between text-xs p-2 rounded-lg bg-muted/40 border border-border/40">
                                <span className="truncate flex items-center gap-2 text-foreground font-medium">
                                  <LessonTypeIcon type={l.type} />
                                  {l.title}
                                </span>
                                <span className="text-[10px] text-muted-foreground font-mono ml-2 shrink-0">{l.duration}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Catalog Link Button */}
                {selectedCourse.status === "published" && (
                  <div className="pt-2">
                    <a
                      href={`/courses/api-${String(selectedCourse.id).replace('api-', '')}`}
                      target="_blank"
                      rel="noreferrer"
                      className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-brand text-brand-foreground text-sm font-semibold hover:opacity-90 transition-opacity shadow-sm"
                    >
                      <Eye className="size-4" /> View Live in Learner Catalog
                    </a>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex-1 grid place-items-center text-center p-12">
                <Eye className="size-10 text-muted-foreground/30 mb-3" />
                <p className="text-sm text-muted-foreground font-medium">Select a course from the Course Library to see its preview.</p>
              </div>
            )}
          </div>
        ) : (
          /* ── Expanded Edit Mode Workspace ── */
          <div className="rounded-2xl ring-1 ring-border bg-card overflow-y-auto flex flex-col">
            {!selection ? (
              <div className="flex-1 grid place-items-center text-center p-12">
                <div className="size-16 rounded-2xl bg-brand/10 grid place-items-center mb-4">
                  <Eye className="size-7 text-brand" />
                </div>
                <h2 className="text-lg font-medium tracking-tight mb-2">Nothing selected</h2>
                <p className="text-sm text-muted-foreground max-w-[36ch]">
                  Select a course, module or lesson from the library to edit it, or click <strong>New Course</strong> to create one.
                </p>
              </div>
            ) : (
              <div className="flex flex-col h-full">
                {/* Editor header */}
                <div className="p-5 border-b border-border flex items-center gap-3">
                  <div className="flex-1">
                    <p className="text-[10px] uppercase tracking-widest text-brand font-semibold mb-0.5">
                      {selection.kind === "new-course" ? "New Course" :
                       selection.kind === "course" ? "Edit Course" :
                       selection.kind === "new-module" ? "New Module" :
                       selection.kind === "module" ? "Edit Module" :
                       selection.kind === "new-lesson" ? "New Lesson" : "Edit Lesson"}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selection.kind === "course" || selection.kind === "new-course" ? "Course details, metadata and settings" :
                       selection.kind === "module" || selection.kind === "new-module" ? "Module title and configuration" :
                       "Lesson content, type and video assignment"}
                    </p>
                  </div>
                </div>

                {/* Editor body */}
                <div className="flex-1 overflow-y-auto p-6">

                  {/* ── COURSE FORM ── */}
                  {(selection.kind === "course" || selection.kind === "new-course") && (
                    <div className="space-y-5">
                      <Field label="Course Title *">
                        <input
                          className={inputCls}
                          placeholder="e.g. Introduction to Company Policies"
                          value={courseForm.title}
                          onChange={(e) => setCourseForm((f) => ({ ...f, title: e.target.value }))}
                        />
                      </Field>
                      <Field label="Subtitle / Description">
                        <textarea
                          className={inputCls + " resize-none"}
                          rows={3}
                          placeholder="One-sentence overview of what learners will gain..."
                          value={courseForm.subtitle}
                          onChange={(e) => setCourseForm((f) => ({ ...f, subtitle: e.target.value }))}
                        />
                      </Field>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Category">
                          <input
                            className={inputCls}
                            placeholder="e.g. Technology, Compliance, Safety"
                            value={courseForm.category}
                            onChange={(e) => setCourseForm((f) => ({ ...f, category: e.target.value as ApiCourse["category"] }))}
                          />
                        </Field>
                        <Field label="Level">
                          <select className={selectCls} value={courseForm.level} onChange={(e) => setCourseForm((f) => ({ ...f, level: e.target.value as ApiCourse["level"] }))}>
                            <option value="Foundational">Foundational</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Advanced">Advanced</option>
                          </select>
                        </Field>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Duration (hours)">
                          <div className="relative flex items-center">
                            <input
                              type="number"
                              min={0}
                              step={1}
                              className={inputCls + " pr-16 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"}
                              placeholder="e.g. 12"
                              value={courseForm.duration_hrs ?? ""}
                              onChange={(e) => setCourseForm((f) => ({ ...f, duration_hrs: e.target.value === "" ? 0 : Math.max(0, parseFloat(e.target.value) || 0) }))}
                            />
                            <div className="absolute right-1.5 flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-md border border-border/60">
                              <button
                                type="button"
                                onClick={() => setCourseForm((f) => ({ ...f, duration_hrs: Math.max(0, (f.duration_hrs || 0) - 1) }))}
                                className="p-1 rounded hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
                                title="Decrease Duration"
                              >
                                <Minus className="size-3.5" />
                              </button>
                              <div className="h-3 w-[1px] bg-border" />
                              <button
                                type="button"
                                onClick={() => setCourseForm((f) => ({ ...f, duration_hrs: (f.duration_hrs || 0) + 1 }))}
                                className="p-1 rounded hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
                                title="Increase Duration"
                              >
                                <Plus className="size-3.5" />
                              </button>
                            </div>
                          </div>
                        </Field>
                        <Field label="Passing Score (%)" hint="Minimum score required for certification">
                          <div className="relative flex items-center">
                            <input
                              type="number"
                              min={0}
                              max={100}
                              step={1}
                              className={inputCls + " pr-16 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"}
                              placeholder="e.g. 80"
                              value={courseForm.passing_score ?? ""}
                              onChange={(e) => setCourseForm((f) => ({ ...f, passing_score: e.target.value === "" ? 0 : Math.min(100, Math.max(0, parseInt(e.target.value) || 0)) }))}
                            />
                            <div className="absolute right-1.5 flex items-center gap-0.5 bg-muted/60 p-0.5 rounded-md border border-border/60">
                              <button
                                type="button"
                                onClick={() => setCourseForm((f) => ({ ...f, passing_score: Math.max(0, (f.passing_score || 0) - 1) }))}
                                className="p-1 rounded hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
                                title="Decrease Passing Score"
                              >
                                <Minus className="size-3.5" />
                              </button>
                              <div className="h-3 w-[1px] bg-border" />
                              <button
                                type="button"
                                onClick={() => setCourseForm((f) => ({ ...f, passing_score: Math.min(100, (f.passing_score || 0) + 1) }))}
                                className="p-1 rounded hover:bg-background text-muted-foreground hover:text-foreground transition-colors"
                                title="Increase Passing Score"
                              >
                                <Plus className="size-3.5" />
                              </button>
                            </div>
                          </div>
                        </Field>
                      </div>
                      <HeroImageField
                        value={courseForm.hero_url}
                        onChange={(url) => setCourseForm((f) => ({ ...f, hero_url: url }))}
                        onUploadError={(msg) => show(msg, false)}
                        onUploadSuccess={(msg) => show(msg)}
                      />
                      {/* Pre-flight Publishing Validation Banner */}
                      {publishErrors && (
                        <div className="p-4 rounded-xl bg-destructive/10 border border-destructive/30 text-destructive text-xs space-y-2">
                          <div className="flex items-center gap-2 font-bold text-sm">
                            <AlertTriangle className="size-4 shrink-0" /> Pre-Flight Publishing Validation Errors:
                          </div>
                          <ul className="list-disc list-inside space-y-1 text-xs">
                            {publishErrors.map((err, i) => (
                              <li key={i}>{err}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl border border-border bg-card/60">
                        <div>
                          <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Publication & Versioning</span>
                          <div className="flex items-center gap-2 mt-1">
                            <StatusBadge status={courseForm.status} />
                            {selection.kind === "course" && (
                              <button
                                type="button"
                                onClick={() => handleOpenVersions(selection.courseId)}
                                className="text-xs text-brand font-semibold hover:underline inline-flex items-center gap-1"
                              >
                                <RefreshCw className="size-3" /> Version History
                              </button>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-2 flex-wrap">
                          {selection.kind === "course" && (
                            <button
                              type="button"
                              onClick={() => handlePublishCourse(selection.courseId)}
                              className="px-3.5 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5"
                            >
                              <Globe className="size-3.5" /> Validate & Publish
                            </button>
                          )}
                        </div>
                      </div>

                      {publishErrors && publishErrors.length > 0 && (
                        <div className="p-4 rounded-xl border border-destructive/30 bg-destructive/10 space-y-2">
                          <div className="flex items-center gap-2 text-destructive">
                            <AlertTriangle className="size-4" />
                            <span className="text-xs font-bold uppercase tracking-wider">Publish Validation Failed</span>
                          </div>
                          <ul className="list-disc list-inside text-xs text-foreground space-y-1">
                            {publishErrors.map((err, idx) => (
                              <li key={idx} className="font-medium">{err}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {/* SCORM Export Section (Export SCORM 1.2 & 2004) */}
                      {selection.kind === "course" && (
                        <div className="p-4 rounded-xl border border-border bg-card/40 space-y-2">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <Package className="size-4 text-brand" />
                              <span className="text-xs font-bold text-foreground">SCORM Export Package</span>
                            </div>
                            {courseForm.status !== "published" && (
                              <span className="text-[10px] font-semibold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                                Publish course first to enable SCORM export
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-3 pt-1">
                            <button
                              type="button"
                              disabled={courseForm.status !== "published"}
                              onClick={() => exportScormPackage(selection.courseId, "1.2")}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-background text-xs font-bold hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                              title={courseForm.status !== "published" ? "Only published courses can be exported to SCORM" : "Export SCORM 1.2 ZIP package"}
                            >
                              <Download className="size-3.5 text-brand" /> Export SCORM 1.2 ZIP
                            </button>

                            <button
                              type="button"
                              disabled={courseForm.status !== "published"}
                              onClick={() => exportScormPackage(selection.courseId, "2004")}
                              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-border bg-background text-xs font-bold hover:bg-muted disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                              title={courseForm.status !== "published" ? "Only published courses can be exported to SCORM" : "Export SCORM 2004 ZIP package"}
                            >
                              <Download className="size-3.5 text-indigo-400" /> Export SCORM 2004 ZIP
                            </button>
                          </div>
                        </div>
                      )}

                      {/* Assessment & SCORM Management (Only show when editing an existing course) */}
                      {selection.kind === "course" && (
                        <>
                          <div className="pt-4 border-t border-border">
                            <h3 className="text-sm font-semibold mb-2 flex items-center gap-2">
                              <CheckSquare className="size-4 text-brand" /> Assessment Management
                            </h3>
                            <p className="text-xs text-muted-foreground mb-4">
                              Upload a CSV file containing multiple choice questions (4 options, 1 correct answer) for the final assessment.
                            </p>
                            <div className="flex items-center gap-3">
                              <button
                                type="button"
                                onClick={() => downloadAssessmentCsvTemplate(selection.courseId).catch((e) => show(e.message, false))}
                                className="inline-flex items-center gap-2 px-3 py-2 rounded-lg border border-border text-xs font-medium hover:bg-muted transition-colors"
                              >
                                <Download className="size-3" /> Template
                              </button>
                              
                              <label className={`inline-flex items-center gap-2 px-3 py-2 rounded-lg bg-brand text-brand-foreground text-xs font-medium cursor-pointer hover:opacity-90 transition-opacity ${isUploadingCsv ? "opacity-50 pointer-events-none" : ""}`}>
                                {isUploadingCsv ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3" />}
                                {isUploadingCsv ? "Uploading..." : "Import CSV"}
                                <input 
                                  type="file" 
                                  accept=".csv" 
                                  className="hidden" 
                                  onChange={async (e) => {
                                    const file = e.target.files?.[0];
                                    if (!file) return;
                                    setIsUploadingCsv(true);
                                    try {
                                      const res = await uploadAssessmentCsv(selection.courseId, file);
                                      if (res.error) {
                                        show(res.error, false);
                                      } else {
                                        show(res.message || "Imported successfully", true);
                                        const questions = await fetchAssessmentQuestions(selection.courseId);
                                        setImportedQuestions(questions);
                                      }
                                    } catch (err: any) {
                                      show(err.message || "Failed to upload", false);
                                    } finally {
                                      setIsUploadingCsv(false);
                                      e.target.value = ""; // Reset file input
                                    }
                                  }}
                                />
                              </label>
                            </div>
                            {importedQuestions.length > 0 && (
                              <div className="mt-4 space-y-2 max-h-64 overflow-y-auto">
                                {importedQuestions.map((q) => (
                                  <div key={q.id} className="text-xs p-2 rounded border border-border">
                                    <p className="font-medium">{q.question_text}</p>
                                    <p className="text-muted-foreground">Correct: {q.correct_option}</p>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {/* ── MODULE FORM ── */}
                  {(selection.kind === "module" || selection.kind === "new-module") && (
                    <div className="space-y-5">
                      {selectedCourse && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
                          <BookOpen className="size-3.5" />
                          <span>Part of <strong className="text-foreground">{selectedCourse.title}</strong></span>
                        </div>
                      )}
                      <Field label="Module Title *">
                        <input className={inputCls} placeholder="e.g. Module 1 — Introduction & Core Concepts" value={moduleForm.title} onChange={(e) => setModuleForm((f) => ({ ...f, title: e.target.value }))} />
                      </Field>
                      <Field label="Summary" hint="Shown in the course curriculum to learners">
                        <textarea className={inputCls + " resize-none"} rows={3} placeholder="Brief description of what this module covers..." value={moduleForm.summary} onChange={(e) => setModuleForm((f) => ({ ...f, summary: e.target.value }))} />
                      </Field>
                      <Field label="Display Order" hint="Lower numbers appear first">
                        <input type="number" className={inputCls} min={0} value={moduleForm.order} onChange={(e) => setModuleForm((f) => ({ ...f, order: parseInt(e.target.value) || 0 }))} />
                      </Field>
                    </div>
                  )}

                  {/* ── LESSON FORM ── */}
                  {(selection.kind === "lesson" || selection.kind === "new-lesson") && (
                    <div className="space-y-5">
                      {selectedModule && (
                        <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted rounded-lg px-3 py-2">
                          <Layers className="size-3.5" />
                          <span>Part of <strong className="text-foreground">{selectedModule.title}</strong></span>
                        </div>
                      )}
                      <Field label="Lesson Title *">
                        <input className={inputCls} placeholder="e.g. Safety Guidelines & Best Practices" value={lessonForm.title} onChange={(e) => setLessonForm((f) => ({ ...f, title: e.target.value }))} />
                      </Field>
                      <div className="grid grid-cols-2 gap-4">
                        <Field label="Duration" hint='Display value, e.g. "6 min"'>
                          <input className={inputCls} placeholder="5 min" value={lessonForm.duration} onChange={(e) => setLessonForm((f) => ({ ...f, duration: e.target.value }))} />
                        </Field>
                        <Field label="Display Order">
                          <input type="number" className={inputCls} min={0} value={lessonForm.order} onChange={(e) => setLessonForm((f) => ({ ...f, order: parseInt(e.target.value) || 0 }))} />
                        </Field>
                      </div>
                      <Field label="Lesson Type">
                        <div className="grid grid-cols-5 gap-1.5">
                          {LESSON_TYPE_OPTIONS.map(({ value, label, icon: Icon }) => (
                            <button
                              key={value}
                              type="button"
                              onClick={() => setLessonForm((f) => ({ ...f, type: value as ApiLesson["type"], interaction: value === "video" || value === "reading" ? null : f.interaction }))}
                              className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-xl border text-[10px] font-semibold uppercase tracking-wide transition-all ${lessonForm.type === value ? "bg-brand text-brand-foreground border-brand" : "border-border text-muted-foreground hover:border-brand/40 hover:bg-muted/50"}`}
                            >
                              <Icon className="size-4" />
                              {label}
                            </button>
                          ))}
                        </div>
                      </Field>

                      {/* Video picker — only for video lessons */}
                      {lessonForm.type === "video" && (
                        <Field label="Video File" hint="Upload the video for this lesson">
                          <VideoUploadField
                            value={lessonForm.video_url}
                            onChange={(url) => setLessonForm((f) => ({ ...f, video_url: url }))}
                            onUploadError={(msg) => show(msg, false)}
                            onUploadSuccess={(msg) => show(msg)}
                          />
                        </Field>
                      )}

                      {/* Block Editor Canvas (for non-video lessons) */}
                      {selectedLesson && selectedLesson.type !== "video" && selectedLesson.block_tree && (
                        <div className="pt-6 border-t border-border">
                          <BlockEditorCanvas
                            tree={selectedLesson.block_tree}
                            onTreeUpdated={load}
                            onBlockPayloadUpdated={(blockId, newPayload) => {
                              setCourses((prevCourses) =>
                                prevCourses.map((c) => {
                                  if (!c.modules) return c;
                                  return {
                                    ...c,
                                    modules: c.modules.map((m) => {
                                      if (!m.lessons) return m;
                                      return {
                                        ...m,
                                        lessons: m.lessons.map((l) => {
                                          if (l.id !== selectedLesson.id || !l.block_tree) return l;
                                          return {
                                            ...l,
                                            block_tree: {
                                              ...l.block_tree,
                                              blocks: (l.block_tree as any).blocks.map((b: any) => {
                                                if (b.id !== blockId) return b;
                                                return {
                                                  ...b,
                                                  settings: newPayload.settings !== undefined ? newPayload.settings : b.settings,
                                                  reading_payload: (newPayload.html_content !== undefined || newPayload.meta_data !== undefined) ? {
                                                    ...b.reading_payload,
                                                    ...newPayload,
                                                  } : b.reading_payload,
                                                  kc_questions: newPayload.kc_questions !== undefined ? newPayload.kc_questions : b.kc_questions,
                                                  interaction_payload: newPayload.interaction_payload !== undefined ? newPayload.interaction_payload : b.interaction_payload,
                                                };
                                              }),
                                            },
                                          };
                                        }),
                                      };
                                    }),
                                  };
                                })
                              );
                            }}
                            showToast={(msg, ok) => show(msg, ok)}
                          />
                        </div>
                      )}
                    </div>
                  )}
                  {/* Global Save Button moved here */}
                  <div className="flex items-center justify-end gap-2 pt-6 mt-6 border-t border-border">
                    {!isNewMode && (
                      <button onClick={() => setSelection(null)} className="p-2 rounded-lg text-muted-foreground hover:bg-muted transition-colors" title="Close">
                        <X className="size-4" />
                      </button>
                    )}
                    <button
                      onClick={save}
                      disabled={!canSave || saving}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-brand text-brand-foreground text-sm font-medium hover:opacity-90 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
                    >
                      {saving ? <Loader2 className="size-4 animate-spin" /> : <Save className="size-4" />}
                      {isNewMode ? "Create" : selectedCourse?.status === "published" ? "Save Changes" : "Save"}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Version History Modal */}
        {showVersionsModal && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <RefreshCw className="size-5 text-brand" />
                  <h3 className="text-base font-bold text-foreground">Course Version History</h3>
                </div>
                <button onClick={() => setShowVersionsModal(false)} className="p-1 text-muted-foreground hover:text-foreground">
                  <X className="size-4" />
                </button>
              </div>

              <p className="text-xs text-muted-foreground">
                Historical published snapshots of this course. Restoring a version creates a new editable draft state without deleting published history.
              </p>

              <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
                {courseVersions.length === 0 ? (
                  <p className="text-xs text-muted-foreground text-center py-6">No published versions recorded yet.</p>
                ) : (
                  courseVersions.map((v) => (
                    <div key={v.id} className="p-3.5 rounded-xl border border-border bg-background flex items-center justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-brand bg-brand/10 px-2 py-0.5 rounded border border-brand/20">
                            Version #{v.version_number}
                          </span>
                          <span className="text-xs text-foreground font-semibold">
                            {v.manifest_snapshot?.metadata?.title || "Published Snapshot"}
                          </span>
                        </div>
                        <p className="text-[10px] text-muted-foreground mt-1">
                          Published {new Date(v.created_at).toLocaleString()} by {v.created_by_name || "Author"}
                        </p>
                      </div>

                      <button
                        onClick={() => handleRollback(v.id)}
                        className="px-3 py-1.5 rounded-lg bg-brand/10 hover:bg-brand text-brand hover:text-brand-foreground text-xs font-bold transition-all border border-brand/30 shrink-0"
                      >
                        Restore Draft
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Universal Course Import Modal */}
        {showImportModal && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="bg-card border border-border rounded-2xl max-w-lg w-full p-6 shadow-2xl space-y-4">
              <div className="flex items-center justify-between border-b border-border pb-3">
                <div className="flex items-center gap-2">
                  <Upload className="size-5 text-brand" />
                  <h3 className="text-base font-bold text-foreground">Universal Course Import</h3>
                </div>
                <button onClick={() => setShowImportModal(false)} className="p-1 text-muted-foreground hover:text-foreground">
                  <X className="size-4" />
                </button>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">
                Upload SCORM packages, PDFs, Word documents, PowerPoint presentations, HTML zips, or media files.
                Content will be converted into the Internal LMS Format and become 100% editable inside the Content Authoring module. Original source file will be preserved.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">Source Format</label>
                  <select
                    value={importFormat}
                    onChange={(e) => setImportFormat(e.target.value)}
                    className="w-full bg-background border border-border rounded-lg p-2.5 text-xs font-semibold text-foreground"
                  >
                    <option value="scorm">SCORM Package (.zip)</option>
                    <option value="pdf">PDF Document (.pdf)</option>
                    <option value="docx">Word Document (.docx)</option>
                    <option value="pptx">PowerPoint Presentation (.pptx)</option>
                    <option value="html">HTML Package (.zip)</option>
                    <option value="video">Video Course File (.mp4)</option>
                    <option value="audio">Audio Podcast File (.mp3)</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">Select File</label>
                  <input
                    type="file"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                    className="w-full text-xs text-foreground bg-background border border-border rounded-lg p-2 cursor-pointer"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    className="px-4 py-2 rounded-lg border border-border text-xs font-semibold hover:bg-muted"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={!importFile || importing}
                    onClick={handleExecuteImport}
                    className="px-4 py-2 rounded-lg bg-brand text-brand-foreground text-xs font-bold hover:opacity-90 disabled:opacity-40 flex items-center gap-2"
                  >
                    {importing ? <Loader2 className="size-4 animate-spin" /> : <Upload className="size-4" />}
                    {importing ? "Converting & Importing..." : "Start Conversion & Import"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
    </AppShell>
  );
}

// ─── HeroImageField ────────────────────────────────────────────────────────
// Dual-mode image input: paste a URL OR upload a file from disk.
// On file upload → sends to POST /api/upload/hero/ → receives back a URL
// that is stored in hero_url. The save flow stays identical either way.
interface HeroImageFieldProps {
  value: string;
  onChange: (url: string) => void;
  onUploadError: (msg: string) => void;
  onUploadSuccess: (msg: string) => void;
}

function HeroImageField({ value, onChange, onUploadError, onUploadSuccess }: HeroImageFieldProps) {
  const [mode, setMode] = useState<"url" | "upload">("url");
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    const allowed = ["image/jpeg", "image/jpg", "image/png", "image/webp", "image/gif"];
    if (!allowed.includes(file.type)) {
      onUploadError("Only JPEG, PNG, WebP or GIF images are accepted.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("hero", file);
      const res = await authFetch(`${API_BASE}/upload/hero/`, {
   	 method: "POST",
    	body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error ?? "Upload failed");
      }
      const data = await res.json();

      // Save relative path instead of absolute URL
      if (data.path) {
        onChange(`/api/media/${data.path}`);
      } else {
         onChange(data.url);
      }

      onUploadSuccess("Hero image uploaded ✓");
    } catch (e: unknown) {
      onUploadError((e as Error).message ?? "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <label className="block text-xs font-medium text-foreground/70">Hero Image</label>
        {/* Mode toggle */}
        <div className="flex items-center rounded-lg overflow-hidden border border-border text-[10px] font-semibold">
          <button
            type="button"
            onClick={() => setMode("url")}
            className={`flex items-center gap-1 px-2.5 py-1 transition-colors ${mode === "url" ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:bg-muted"}`}
          >
            <Link2 className="size-3" /> URL
          </button>
          <button
            type="button"
            onClick={() => setMode("upload")}
            className={`flex items-center gap-1 px-2.5 py-1 transition-colors ${mode === "upload" ? "bg-brand text-brand-foreground" : "text-muted-foreground hover:bg-muted"}`}
          >
            <Upload className="size-3" /> Upload
          </button>
        </div>
      </div>

      {/* ── URL mode ── */}
      {mode === "url" && (
        <div className="space-y-2">
          <input
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand transition-all"
            placeholder="https://example.com/hero.jpg"
            value={value}
            onChange={(e) => onChange(e.target.value)}
          />
          <p className="text-[10px] text-muted-foreground">
            Paste any public image URL (HTTPS). Leave blank to use the category default.
          </p>
        </div>
      )}

      {/* ── Upload mode ── */}
      {mode === "upload" && (
        <div className="space-y-2">
          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              const file = e.dataTransfer.files[0];
              if (file) handleFile(file);
            }}
            className={`rounded-xl border-2 border-dashed p-6 text-center transition-colors cursor-pointer ${dragOver ? "border-brand bg-brand/5" : "border-border hover:border-brand/40 hover:bg-muted/30"}`}
            onClick={() => fileRef.current?.click()}
          >
            <input
              ref={fileRef}
              type="file"
              className="hidden"
              accept="image/jpeg,image/png,image/webp,image/gif"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
                // Reset input so same file can be re-uploaded
                e.target.value = "";
              }}
            />
            {uploading ? (
              <div className="flex flex-col items-center gap-2">
                <Loader2 className="size-6 text-brand animate-spin" />
                <p className="text-xs text-muted-foreground">Uploading…</p>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <ImagePlus className="size-6 text-muted-foreground/50" />
                <p className="text-sm font-medium text-foreground/70">
                  Drop an image here or <span className="text-brand underline">browse</span>
                </p>
                <p className="text-[10px] text-muted-foreground">JPEG, PNG, WebP or GIF · Max 10 MB</p>
              </div>
            )}
          </div>
          <p className="text-[10px] text-muted-foreground">
            File is uploaded instantly. You can still switch to URL mode to paste a link instead.
          </p>
        </div>
      )}

      {/* Preview — shown in both modes when a URL is set */}
      {value && (
        <div className="mt-3 relative rounded-xl overflow-hidden ring-1 ring-border group">
          <img
            src={value}
            alt="Hero preview"
            className="w-full h-28 object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
          <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
            <button
              type="button"
              onClick={() => onChange("")}
              className="flex items-center gap-1.5 text-foreground text-xs font-medium bg-destructive/80 px-3 py-1.5 rounded-lg"
            >
              <X className="size-3" /> Remove image
            </button>
          </div>
          <div className="absolute bottom-2 left-2 bg-black/60 text-foreground text-[9px] px-2 py-0.5 rounded font-mono truncate max-w-[90%]">
            {value.length > 60 ? "…" + value.slice(-55) : value}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── VideoUploadField ──────────────────────────────────────────────────────

interface VideoUploadFieldProps {
  value: string | null;
  onChange: (url: string | null) => void;
  onUploadError: (msg: string) => void;
  onUploadSuccess: (msg: string) => void;
}

function VideoUploadField({ value, onChange, onUploadError, onUploadSuccess }: VideoUploadFieldProps) {
  const [uploading, setUploading] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    try {
      const res = await uploadLessonVideo(file);

      if (res.error) {
         throw new Error(res.error);
      }

    // Save relative path instead of absolute URL
      if (res.path) {
         onChange(`/media/${res.path}`);
     } else {
         onChange(res.url);
     }

     onUploadSuccess("Video uploaded ✓");
     
    } catch (err: any) {
      onUploadError(err.message || "Failed to upload video");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  return (
    <div className="space-y-2">
      {value ? (
        <div className="flex items-center gap-3 px-3 py-2.5 rounded-lg border border-brand bg-brand/5 text-brand text-sm">
          <Check className="size-4 shrink-0" />
          <span className="flex-1 truncate">Video uploaded</span>
          <button type="button" onClick={() => onChange(null)} className="text-muted-foreground hover:text-destructive transition-colors">
            <X className="size-4" />
          </button>
        </div>
      ) : (
        <label className={`w-full flex items-center justify-center gap-2 px-4 py-8 rounded-lg border-2 border-dashed transition-all cursor-pointer ${uploading ? "border-brand/40 bg-brand/5 opacity-70 pointer-events-none" : "border-border hover:border-brand/40 hover:bg-muted/50"}`}>
          {uploading ? <Loader2 className="size-5 animate-spin text-brand" /> : <Upload className="size-5 text-muted-foreground" />}
          <span className="text-sm font-medium text-muted-foreground">{uploading ? "Uploading video..." : "Click to upload .mp4 video"}</span>
          <input type="file" accept="video/mp4,video/webm" className="hidden" onChange={handleUpload} disabled={uploading} />
        </label>
      )}
    </div>
  );
}

