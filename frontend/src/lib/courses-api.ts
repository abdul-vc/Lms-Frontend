/**
 * courses-api.ts
 * Typed fetch helpers for the Django Courses REST API.
 * Base: http://127.0.0.1:8000/api/
 *
 * Also exports adaptApiCourse() to convert an ApiCourse into the
 * frontend Course type used by mock.ts / the learner routes.
 */

import type { Course, Module, Lesson, InteractionKind } from "@/lib/mock";
import { authFetch, API_BASE, BACKEND_BASE } from "@/lib/auth";

const BASE = API_BASE;

// ─── API Types (mirror Django models) ────────────────────────────────────────

export interface ApiLesson {
  id: number;
  module: number;
  title: string;
  duration: string;
  type: "video" | "interactive" | "reading" | "knowledge_check" | "scenario";
  order: number;
  video_url: string | null;
  interaction: string | null;
}

export interface ApiModule {
  id: number;
  course: number;
  title: string;
  summary: string;
  order: number;
  locked: boolean;
  lessons: ApiLesson[];
}

export interface ApiScormPackage {
  id: number;
  version: string;
  schema_version: string;
  title: string;
  launch_url: string;
  mastery_score: number | null;
  sco_structure: any[];
  uploaded_at: string;
}

export interface ApiCourse {
  id: number;
  title: string;
  subtitle: string;
  category: string;
  hero_url: string;
  duration_hrs: number;
  passing_score: number;
  level: "Foundational" | "Intermediate" | "Advanced";
  status: "draft" | "published" | "archived";
  accent: string;
  modules: ApiModule[];
  created_at: string;
  updated_at: string;
  user_progress?: number;
  is_scorm?: boolean;
  scorm_package?: ApiScormPackage | null;
}

// ─── Adapter: ApiCourse → frontend Course type ────────────────────────────────

const FALLBACK_HERO = "https://images.unsplash.com/photo-1516321318423-f06f85e504b3";

function resolveVideoUrl(l: ApiLesson): string | undefined {
  // 1. Prefer video_url (uploaded file)
  if (l.video_url) {
    // Already absolute
    if (l.video_url.startsWith("http://") || l.video_url.startsWith("https://")) {
      return l.video_url;
    }
    // Relative path from Django — make absolute
    return `${BACKEND_BASE}${l.video_url}`;
  }
  return undefined;
}

export function adaptApiCourse(c: ApiCourse): Course {
  return {
    id: `api-${c.id}`,
    title: c.title,
    subtitle: c.subtitle || "",
    category: c.category,
    hero: c.hero_url || FALLBACK_HERO,
    durationHrs: c.duration_hrs,
    modules: c.modules
      .slice()
      .sort((a, b) => a.order - b.order)
      .map((m) => ({
        id: `m${m.id}`,
        title: m.title,
        summary: m.summary || "",
        locked: m.locked,
        lessons: m.lessons
          .slice()
          .sort((a, b) => a.order - b.order)
          .map((l) => ({
            id: `l${l.id}`,
            title: l.title,
            duration: l.duration,
            type: l.type as Lesson["type"],
            interaction: (l.interaction as InteractionKind) || undefined,
            videoSrc: resolveVideoUrl(l),
            block_tree: l.block_tree || null,
            reading_content: l.reading_content || null,
          })),
      })),
    enrolled: true,
    progress: (c.user_progress || 0) / 100, // API returns 0-100, map to 0..1
    passingScore: c.passing_score,
    level: c.level,
    accent: c.accent || "var(--brand)",
    is_scorm: c.is_scorm,
    scorm_package: c.scorm_package,
  };
}

// ─── Courses CRUD ─────────────────────────────────────────────────────────────

export async function fetchCourses(): Promise<ApiCourse[]> {
  const res = await authFetch(`${BASE}/courses/`);
  if (!res.ok) throw new Error("Failed to fetch courses");
  return res.json();
}

export async function fetchCourse(id: number): Promise<ApiCourse | null> {
  const res = await authFetch(`${BASE}/courses/${id}/`);
  if (!res.ok) return null;
  return res.json();
}

export async function createCourse(
  data: Omit<ApiCourse, "id" | "modules" | "created_at" | "updated_at">
): Promise<ApiCourse> {
  const res = await authFetch(`${BASE}/courses/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create course");
  return res.json();
}

export async function fetchMyCertificates() {
  const res = await authFetch(`${BASE}/certificates/`);
  if (!res.ok) throw new Error("Failed to fetch certificates");
  return res.json();
}

export async function fetchDashboardStats() {
  const res = await authFetch(`${BASE}/dashboard/`);
  if (!res.ok) throw new Error("Failed to fetch dashboard stats");
  return res.json();
}

export async function updateCourse(
  id: number,
  data: Partial<Omit<ApiCourse, "modules">>
): Promise<ApiCourse> {
  const res = await authFetch(`${BASE}/courses/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update course");
  return res.json();
}

export async function deleteCourse(id: number): Promise<void> {
  await authFetch(`${BASE}/courses/${id}/`, { method: "DELETE" });
}

// ─── Modules CRUD ─────────────────────────────────────────────────────────────

export async function createModule(
  courseId: number,
  data: Partial<Omit<ApiModule, "id" | "course" | "lessons">>
): Promise<ApiModule> {
  const res = await authFetch(`${BASE}/courses/${courseId}/modules/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create module");
  return res.json();
}

export async function updateModule(
  id: number,
  data: Partial<Omit<ApiModule, "lessons">>
): Promise<ApiModule> {
  const res = await authFetch(`${BASE}/modules/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update module");
  return res.json();
}

export async function deleteModule(id: number): Promise<void> {
  await authFetch(`${BASE}/modules/${id}/`, { method: "DELETE" });
}

// ─── Lessons CRUD ─────────────────────────────────────────────────────────────

export async function createLesson(
  moduleId: number,
  data: Partial<Omit<ApiLesson, "id" | "module">>
): Promise<ApiLesson> {
  const res = await authFetch(`${BASE}/modules/${moduleId}/lessons/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create lesson");
  return res.json();
}

export async function updateLesson(
  id: number,
  data: Partial<ApiLesson>
): Promise<ApiLesson> {
  const res = await authFetch(`${BASE}/lessons/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update lesson");
  return res.json();
}

export async function deleteLesson(id: number): Promise<void> {
  await authFetch(`${BASE}/lessons/${id}/`, { method: "DELETE" });
}

export async function uploadLessonVideo(file: File): Promise<{ url: string; path: string; error?: string }> {
  const formData = new FormData();
  formData.append("video", file);

  const res = await authFetch(`${BASE}/upload/video/`, {
    method: "POST",
    body: formData,
  });

  return res.json();
}

// ─── Assessment CRUD ─────────────────────────────────────────────────────────

export interface ApiAssessmentQuestion {
  id: number;
  course: number;
  question_text: string;
  option_a: string;
  option_b: string;
  option_c: string;
  option_d: string;
  correct_option: "A" | "B" | "C" | "D";
}

export async function downloadAssessmentCsvTemplate(courseId: number): Promise<void> {
  const res = await authFetch(`${BASE}/courses/${courseId}/assessment/template/`);
  if (!res.ok) throw new Error("Failed to download template");
  
  const blob = await res.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `assessment_template.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(url);
}

export async function uploadAssessmentCsv(courseId: number, file: File): Promise<{ message?: string; error?: string }> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await authFetch(`${BASE}/courses/${courseId}/assessment/import/`, {
    method: "POST",
    body: formData,
  });
  
  return res.json();
}

export async function fetchAssessmentQuestions(courseId: number): Promise<ApiAssessmentQuestion[]> {
  const res = await authFetch(`${BASE}/courses/${courseId}/assessment/questions/`);
  if (!res.ok) throw new Error("Failed to fetch assessment questions");
  return res.json();
}

export interface ApiAccessRequest {
  id: number;
  student: number;
  course: number;
  status: 'pending' | 'accepted' | 'rejected';
  requested_at: string;
  student_details?: {
    id: number;
    full_name: string;
    email: string;
  };
}

export async function requestAccess(courseId: number): Promise<{status: string, message: string}> {
  const res = await authFetch(`${BASE}/courses/${courseId}/request-access/`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to request access");
  return res.json();
}

export async function fetchAccessRequests(): Promise<ApiAccessRequest[]> {
  const res = await authFetch(`${BASE}/access-requests/`);
  if (!res.ok) throw new Error("Failed to fetch access requests");
  return res.json();
}

export async function acceptAccessRequest(requestId: number): Promise<void> {
  const res = await authFetch(`${BASE}/access-requests/${requestId}/accept/`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to accept access request");
}

export async function rejectAccessRequest(requestId: number): Promise<void> {
  const res = await authFetch(`${BASE}/access-requests/${requestId}/reject/`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to reject access request");
}

export async function fetchLeaderboard() {
  const res = await authFetch(`${BASE}/dashboard/leaderboard/`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchBadges() {
  const res = await authFetch(`${BASE}/dashboard/badges/`);
  if (!res.ok) return [];
  return res.json();
}

export async function fetchLearningPaths() {
  const res = await authFetch(`${BASE}/paths/`);
  if (!res.ok) return [];
  return res.json();
}

export async function chatAi(message: string) {
  const res = await authFetch(`${BASE}/ai/chat/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message })
  });
  if (!res.ok) throw new Error("Failed to chat with AI");
  return res.json();
}

export async function uploadScormPackage(courseId: number, file: File): Promise<{ status: string; message: string; scorm_package: ApiScormPackage }> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await authFetch(`${BASE}/courses/${courseId}/upload-scorm/`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Failed to upload SCORM package" }));
    throw new Error(err.error || "Failed to upload SCORM package");
  }

  return res.json();
}

export async function fetchScormTracking(courseId: number) {
  const res = await authFetch(`${BASE}/courses/${courseId}/scorm-runtime/`);
  if (!res.ok) throw new Error("Failed to fetch SCORM tracking data");
  return res.json();
}

export async function saveScormTracking(courseId: number, trackingData: Record<string, any>) {
  const res = await authFetch(`${BASE}/courses/${courseId}/scorm-runtime/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(trackingData),
  });
  if (!res.ok) throw new Error("Failed to save SCORM tracking data");
  return res.json();
}

export async function fetchLearnerDashboard() {
  const res = await authFetch(`${BASE}/learner/dashboard/`);
  if (!res.ok) throw new Error("Failed to fetch learner dashboard data");
  return res.json();
}

export async function exportScormPackage(courseId: number, version: "1.2" | "2004") {
  const endpoint = version === "2004" ? `${BASE}/authoring/export/scorm2004/` : `${BASE}/authoring/export/scorm12/`;
  const res = await authFetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ course_id: courseId }),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Export failed" }));
    throw new Error(err.detail || "SCORM export failed");
  }

  const blob = await res.blob();
  const downloadUrl = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = downloadUrl;
  a.download = `Course_${courseId}_SCORM_${version}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  window.URL.revokeObjectURL(downloadUrl);
}

export async function fetchCourseVersions(courseId: number) {
  const res = await authFetch(`${BASE}/authoring/versions/?course=${courseId}`);
  if (!res.ok) throw new Error("Failed to fetch course version history");
  return res.json();
}

export async function rollbackCourseVersion(versionId: number) {
  const res = await authFetch(`${BASE}/authoring/versions/${versionId}/rollback/`, {
    method: "POST",
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Rollback failed" }));
    throw new Error(err.detail || "Failed to restore version snapshot");
  }
  return res.json();
}

export async function uploadUniversalImport(file: File, sourceFormat: string, targetCourseId?: number) {
  const formData = new FormData();
  formData.append("source_file", file);
  formData.append("source_format", sourceFormat);
  if (targetCourseId) {
    formData.append("target_course_id", String(targetCourseId));
  }

  const res = await authFetch(`${BASE}/import/upload/`, {
    method: "POST",
    body: formData,
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: "Import failed" }));
    throw new Error(err.error || err.detail || "Failed to process course import file");
  }

  return res.json();
}


