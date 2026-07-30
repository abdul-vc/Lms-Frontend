import { authFetch } from "./auth";

const getApiBase = () => {
  if (typeof window !== 'undefined') {
    const host = window.location.hostname || 'localhost';
    return `http://${host}:8000/api`;
  }
  return 'http://localhost:8000/api';
};

const BASE = `${getApiBase()}/toolkit`;

export interface ToolkitCategory {
  id: number;
  name: string;
  slug: string;
  icon: string;
  description: string;
  order: number;
  article_count?: number;
}

export interface ToolkitArticleVersion {
  id: number;
  version_number: number;
  title: string;
  summary: string;
  content: string;
  created_by_name?: string;
  created_at: string;
}

export interface ToolkitAttachment {
  id: number;
  file: string;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_at: string;
}

export interface ToolkitArticle {
  id: number;
  category: number;
  category_name?: string;
  category_icon?: string;
  title: string;
  slug: string;
  summary: string;
  content: string;
  status: "draft" | "in_review" | "approved" | "published" | "archived";
  version: number;
  error_code?: string;
  tags: string[];
  related_article_ids: number[];
  view_count: number;
  created_by_name?: string;
  created_at: string;
  updated_at: string;
  versions?: ToolkitArticleVersion[];
  attachments?: ToolkitAttachment[];
  is_bookmarked?: boolean;
}

export interface ToolkitChangeLog {
  id: number;
  version: string;
  date_time: string;
  module_name: string;
  feature_name: string;
  description: string;
  files_modified: string[];
  developer_name: string;
  status: "completed" | "in_progress" | "deprecated";
  notes: string;
  is_published: boolean;
}

export interface ToolkitReleaseNote {
  id: number;
  version_number: string;
  release_date: string;
  new_features: string[];
  improvements: string[];
  bug_fixes: string[];
  breaking_changes: string[];
  is_published: boolean;
}

export interface ToolkitDependencyNode {
  id: number;
  name: string;
  category: string;
  description: string;
  affected_models: string[];
  affected_apis: string[];
  affected_components: string[];
  risk_level: string;
  children?: ToolkitDependencyNode[];
}

export interface ToolkitAuditLog {
  id: number;
  action: string;
  article_title: string;
  category_name: string;
  performed_by_name?: string;
  details: Record<string, any>;
  timestamp: string;
}

export interface ToolkitHealthMetrics {
  backend_status: string;
  database_status: string;
  storage_status: string;
  uptime_seconds: number;
  metrics: {
    total_organizations: number;
    active_organizations: number;
    total_users: number;
    active_users: number;
    total_courses: number;
    total_modules: number;
    total_lessons: number;
    total_certificates: number;
    total_scorm_packages: number;
    total_roles: number;
    total_departments: number;
    total_articles: number;
    published_articles: number;
    categories_count: number;
    changelogs_count: number;
    audit_logs_count: number;
  };
}

// ─── API Helper Functions ───────────────────────────────────────────────────

export async function fetchToolkitCategories(): Promise<ToolkitCategory[]> {
  const res = await authFetch(`${BASE}/categories/`);
  if (!res.ok) throw new Error("Failed to fetch categories");
  return res.json();
}

export async function fetchToolkitArticles(params?: { category?: number; status?: string; search?: string; tag?: string; bookmarked?: boolean }): Promise<ToolkitArticle[]> {
  const query = new URLSearchParams();
  if (params?.category) query.append("category", String(params.category));
  if (params?.status) query.append("status", params.status);
  if (params?.search) query.append("search", params.search);
  if (params?.tag) query.append("tag", params.tag);
  if (params?.bookmarked) query.append("bookmarked", "true");

  const res = await authFetch(`${BASE}/articles/?${query.toString()}`);
  if (!res.ok) throw new Error("Failed to fetch articles");
  const data = await res.json();
  return Array.isArray(data) ? data : data.results || [];
}

export async function fetchToolkitArticleDetail(id: number): Promise<ToolkitArticle> {
  const res = await authFetch(`${BASE}/articles/${id}/`);
  if (!res.ok) throw new Error("Failed to fetch article detail");
  return res.json();
}

export async function createToolkitArticle(data: Partial<ToolkitArticle>): Promise<ToolkitArticle> {
  const res = await authFetch(`${BASE}/articles/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create article");
  return res.json();
}

export async function updateToolkitArticle(id: number, data: Partial<ToolkitArticle>): Promise<ToolkitArticle> {
  const res = await authFetch(`${BASE}/articles/${id}/`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update article");
  return res.json();
}

export async function deleteToolkitArticle(id: number): Promise<void> {
  const res = await authFetch(`${BASE}/articles/${id}/`, { method: "DELETE" });
  if (!res.ok) throw new Error("Failed to delete article");
}

export async function rollbackToolkitArticle(id: number, versionId: number): Promise<ToolkitArticle> {
  const res = await authFetch(`${BASE}/articles/${id}/rollback/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ version_id: versionId }),
  });
  if (!res.ok) throw new Error("Failed to rollback article");
  return res.json();
}

export async function toggleBookmarkToolkitArticle(id: number): Promise<{ bookmarked: boolean }> {
  const res = await authFetch(`${BASE}/articles/${id}/toggle_bookmark/`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to toggle bookmark");
  return res.json();
}

export async function runToolkitProjectRescan(): Promise<{ message: string; models_count: number; api_count: number }> {
  const res = await authFetch(`${BASE}/articles/rescan/`, { method: "POST" });
  if (!res.ok) throw new Error("Failed to run project rescan");
  return res.json();
}

export async function fetchToolkitChangeLogs(): Promise<ToolkitChangeLog[]> {
  const res = await authFetch(`${BASE}/changelogs/`);
  if (!res.ok) throw new Error("Failed to fetch change logs");
  const data = await res.json();
  return Array.isArray(data) ? data : data.results || [];
}

export async function createToolkitChangeLog(data: Partial<ToolkitChangeLog>): Promise<ToolkitChangeLog> {
  const res = await authFetch(`${BASE}/changelogs/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to create change log");
  return res.json();
}

export async function fetchToolkitReleaseNotes(): Promise<ToolkitReleaseNote[]> {
  const res = await authFetch(`${BASE}/releasenotes/`);
  if (!res.ok) throw new Error("Failed to fetch release notes");
  const data = await res.json();
  return Array.isArray(data) ? data : data.results || [];
}

export async function fetchToolkitDependencies(): Promise<ToolkitDependencyNode[]> {
  const res = await authFetch(`${BASE}/dependencies/`);
  if (!res.ok) throw new Error("Failed to fetch dependency nodes");
  return res.json();
}

export async function fetchToolkitAuditLogs(): Promise<ToolkitAuditLog[]> {
  const res = await authFetch(`${BASE}/audit-logs/`);
  if (!res.ok) throw new Error("Failed to fetch audit logs");
  const data = await res.json();
  return Array.isArray(data) ? data : data.results || [];
}

export async function fetchToolkitHealthMetrics(): Promise<ToolkitHealthMetrics> {
  const res = await authFetch(`${BASE}/health-monitor/`);
  if (!res.ok) throw new Error("Failed to fetch health metrics");
  return res.json();
}

export async function exportToolkitPack(): Promise<any> {
  const res = await authFetch(`${BASE}/articles/export_pack/`);
  if (!res.ok) throw new Error("Failed to export Toolkit pack");
  return res.json();
}

export async function importToolkitPack(data: any): Promise<{ imported_categories: number; imported_articles: number }> {
  const res = await authFetch(`${BASE}/articles/import_pack/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to import Toolkit pack");
  return res.json();
}
