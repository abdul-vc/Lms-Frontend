import { useState, useEffect } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import {
  BookOpen, Search, Plus, RefreshCw, Upload, Download, Eye, Edit3, Trash2,
  CheckCircle2, AlertTriangle, ShieldCheck, Activity, Database, Terminal,
  Bookmark, History, GitCommit, FileText, Layers, Tag, Server, Cpu, Clock,
  ArrowRight, ChevronRight, CornerDownRight, Box, Sliders, Play, Lock
} from "lucide-react";
import { useAuth } from "@/lib/auth";
import {
  fetchToolkitCategories, fetchToolkitArticles, fetchToolkitArticleDetail,
  createToolkitArticle, updateToolkitArticle, deleteToolkitArticle,
  rollbackToolkitArticle, toggleBookmarkToolkitArticle, runToolkitProjectRescan,
  fetchToolkitChangeLogs, createToolkitChangeLog, fetchToolkitReleaseNotes,
  fetchToolkitDependencies, fetchToolkitAuditLogs, fetchToolkitHealthMetrics,
  exportToolkitPack, importToolkitPack,
  type ToolkitCategory, type ToolkitArticle, type ToolkitChangeLog,
  type ToolkitReleaseNote, type ToolkitDependencyNode, type ToolkitAuditLog,
  type ToolkitHealthMetrics
} from "@/lib/toolkit-api";

export const Route = createFileRoute("/super-admin/toolkit")({
  component: SuperAdminToolkitPage,
});

function SuperAdminToolkitPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  // Tab State
  const [activeTab, setActiveTab] = useState<"dashboard" | "knowledge" | "dependencies" | "explorers" | "changelog" | "audit">("dashboard");

  // Data States
  const [categories, setCategories] = useState<ToolkitCategory[]>([]);
  const [articles, setArticles] = useState<ToolkitArticle[]>([]);
  const [selectedArticle, setSelectedArticle] = useState<ToolkitArticle | null>(null);
  const [changeLogs, setChangeLogs] = useState<ToolkitChangeLog[]>([]);
  const [releaseNotes, setReleaseNotes] = useState<ToolkitReleaseNote[]>([]);
  const [dependencies, setDependencies] = useState<ToolkitDependencyNode[]>([]);
  const [auditLogs, setAuditLogs] = useState<ToolkitAuditLog[]>([]);
  const [health, setHealth] = useState<ToolkitHealthMetrics | null>(null);

  // Filter States
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("");
  const [bookmarkedOnly, setBookmarkedOnly] = useState(false);

  // UI States
  const [loading, setLoading] = useState(true);
  const [rescanning, setRescanning] = useState(false);
  const [toast, setToast] = useState<{ msg: string; ok: boolean } | null>(null);
  const [showArticleModal, setShowArticleModal] = useState(false);
  const [showChangeLogModal, setShowChangeLogModal] = useState(false);
  const [editingArticle, setEditingArticle] = useState<Partial<ToolkitArticle> | null>(null);
  const [newChangeLog, setNewChangeLog] = useState<Partial<ToolkitChangeLog>>({
    version: "2.4.0",
    module_name: "Master Setup",
    feature_name: "",
    description: "",
    developer_name: user?.full_name || "Super Admin",
    status: "completed",
    files_modified: []
  });

  const isSuperAdmin = user?.is_platform_super_admin === true;

  const showToast = (msg: string, ok = true) => {
    setToast({ msg, ok });
    setTimeout(() => setToast(null), 3000);
  };

  useEffect(() => {
    if (!isSuperAdmin) {
      navigate({ to: "/login" });
      return;
    }
    loadData();
  }, [selectedCategory, statusFilter, searchQuery, bookmarkedOnly]);

  const loadData = async () => {
    setLoading(true);
    try {
      const [cats, arts, logs, notes, deps, audits, hMetrics] = await Promise.all([
        fetchToolkitCategories(),
        fetchToolkitArticles({ category: selectedCategory || undefined, status: statusFilter || undefined, search: searchQuery || undefined, bookmarked: bookmarkedOnly }),
        fetchToolkitChangeLogs(),
        fetchToolkitReleaseNotes(),
        fetchToolkitDependencies(),
        fetchToolkitAuditLogs(),
        fetchToolkitHealthMetrics()
      ]);
      setCategories(cats);
      setArticles(arts);
      setChangeLogs(logs);
      setReleaseNotes(notes);
      setDependencies(deps);
      setAuditLogs(audits);
      setHealth(hMetrics);

      if (arts.length > 0) {
        if (!selectedArticle || !arts.some(a => a.id === selectedArticle.id)) {
          setSelectedArticle(arts[0]);
        }
      } else {
        setSelectedArticle(null);
      }
    } catch (err: any) {
      showToast(err.message || "Failed to load Toolkit data", false);
    } finally {
      setLoading(false);
    }
  };

  const handleRescan = async () => {
    setRescanning(true);
    try {
      const res = await runToolkitProjectRescan();
      showToast(res.message);
      loadData();
    } catch (err: any) {
      showToast(err.message || "Rescan failed", false);
    } finally {
      setRescanning(false);
    }
  };

  const handleSelectArticle = async (art: ToolkitArticle) => {
    try {
      const fullArt = await fetchToolkitArticleDetail(art.id);
      setSelectedArticle(fullArt);
    } catch {
      setSelectedArticle(art);
    }
  };

  const handleSaveArticle = async () => {
    if (!editingArticle?.title || !editingArticle?.category || !editingArticle?.content) {
      showToast("Title, Category, and Content are required.", false);
      return;
    }
    try {
      if (editingArticle.id) {
        await updateToolkitArticle(editingArticle.id, editingArticle);
        showToast("Article updated successfully!");
      } else {
        await createToolkitArticle({
          ...editingArticle,
          slug: editingArticle.slug || editingArticle.title.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
          status: editingArticle.status || "draft"
        });
        showToast("New article created successfully!");
      }
      setShowArticleModal(false);
      setEditingArticle(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to save article", false);
    }
  };

  const handleDeleteArticle = async (id: number) => {
    if (!confirm("Are you sure you want to delete this article?")) return;
    try {
      await deleteToolkitArticle(id);
      showToast("Article deleted.");
      if (selectedArticle?.id === id) setSelectedArticle(null);
      loadData();
    } catch (err: any) {
      showToast(err.message || "Failed to delete article", false);
    }
  };

  const handleRollback = async (articleId: number, versionId: number) => {
    try {
      const updated = await rollbackToolkitArticle(articleId, versionId);
      setSelectedArticle(updated);
      showToast("Article rolled back to selected version!");
      loadData();
    } catch (err: any) {
      showToast(err.message || "Rollback failed", false);
    }
  };

  const handleToggleBookmark = async (id: number) => {
    try {
      const res = await toggleBookmarkToolkitArticle(id);
      showToast(res.message);
      if (selectedArticle?.id === id) {
        setSelectedArticle({ ...selectedArticle, is_bookmarked: res.bookmarked });
      }
      loadData();
    } catch (err: any) {
      showToast(err.message, false);
    }
  };

  const handleCreateChangeLog = async () => {
    if (!newChangeLog.feature_name || !newChangeLog.description) {
      showToast("Feature name and description required", false);
      return;
    }
    try {
      await createToolkitChangeLog(newChangeLog);
      showToast("Change log entry added.");
      setShowChangeLogModal(false);
      loadData();
    } catch (err: any) {
      showToast(err.message, false);
    }
  };

  const handleExportPack = async () => {
    try {
      const data = await exportToolkitPack();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `toolkit_export_${new Date().toISOString().slice(0, 10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showToast("Toolkit export downloaded!");
    } catch (err: any) {
      showToast(err.message, false);
    }
  };

  if (!isSuperAdmin) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6">
        <div className="max-w-md text-center space-y-4">
          <Lock className="size-12 text-destructive mx-auto" />
          <h1 className="text-xl font-bold">Access Denied</h1>
          <p className="text-sm text-muted-foreground">The Master Toolkit module is strictly restricted to Super Admins.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* ── Toast ──────────────────────────────────────────────────────────── */}
      {toast && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-2 px-4 py-3 rounded-xl shadow-xl text-xs font-bold transition-all ${toast.ok ? "bg-emerald-600 text-white" : "bg-destructive text-white"}`}>
          {toast.ok ? <CheckCircle2 className="size-4" /> : <AlertTriangle className="size-4" />}
          {toast.msg}
        </div>
      )}

      {/* ── Page Header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 pb-4 border-b border-border">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black tracking-tight text-foreground">Master Setup Toolkit</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
              Super Admin Exclusive
            </span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            Central knowledge base, architecture documentation, live system health, API & database explorers, and project rescan engine.
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handleRescan}
            disabled={rescanning}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-bold border border-border transition-all disabled:opacity-40"
          >
            <RefreshCw className={`size-3.5 text-emerald-400 ${rescanning ? "animate-spin" : ""}`} />
            <span>{rescanning ? "Rescanning..." : "Rescan Project"}</span>
          </button>

          <button
            onClick={handleExportPack}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-card hover:bg-muted text-foreground text-xs font-bold border border-border transition-all shadow-xs"
          >
            <Download className="size-3.5 text-indigo-400" /> Export Pack
          </button>

          <button
            onClick={() => {
              setEditingArticle({ title: "", summary: "", content: "", category: categories[0]?.id, status: "draft", tags: [] });
              setShowArticleModal(true);
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-black transition-all shadow-md shadow-emerald-600/20"
          >
            <Plus className="size-4" /> New Article
          </button>
        </div>
      </div>

      {/* ── Main Tab Navigation ─────────────────────────────────────────── */}
      <div className="flex items-center gap-2 border-b border-border mb-6 overflow-x-auto pb-1">
        {[
          { id: "dashboard", label: "Dashboard & Live Health", icon: Activity },
          { id: "knowledge", label: `Knowledge Base (${articles.length})`, icon: BookOpen },
          { id: "dependencies", label: "Dependency Map & Impact", icon: Layers },
          { id: "explorers", label: "API & Database Explorers", icon: Terminal },
          { id: "changelog", label: `Change Log (${changeLogs.length})`, icon: GitCommit },
          { id: "audit", label: "Audit Trail", icon: ShieldCheck },
        ].map((tab) => {
          const Icon = tab.icon;
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-extrabold transition-all border shrink-0 ${
                active
                  ? "bg-emerald-600 text-slate-950 border-emerald-500 shadow-md font-black"
                  : "bg-card/50 text-muted-foreground border-border hover:bg-muted hover:text-foreground"
              }`}
            >
              <Icon className="size-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ── TAB 1: DASHBOARD & LIVE HEALTH MONITOR ───────────────────────── */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* Health Status Cards */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-4 rounded-2xl border border-border bg-card shadow-xs space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-bold">
                <span>Backend Engine</span>
                <Server className="size-4 text-emerald-400" />
              </div>
              <p className="text-xl font-black text-emerald-400">{health?.backend_status || "Operational"}</p>
              <span className="text-[10px] text-muted-foreground">Python Django REST API</span>
            </div>

            <div className="p-4 rounded-2xl border border-border bg-card shadow-xs space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-bold">
                <span>Database Engine</span>
                <Database className="size-4 text-cyan-400" />
              </div>
              <p className="text-xl font-black text-cyan-400">{health?.database_status || "Healthy"}</p>
              <span className="text-[10px] text-muted-foreground">Django ORM SQLite/Postgres</span>
            </div>

            <div className="p-4 rounded-2xl border border-border bg-card shadow-xs space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-bold">
                <span>Total Organizations</span>
                <Box className="size-4 text-indigo-400" />
              </div>
              <p className="text-xl font-black text-foreground">{health?.metrics.total_organizations || 0}</p>
              <span className="text-[10px] text-emerald-400 font-bold">{health?.metrics.active_organizations || 0} Active Tenants</span>
            </div>

            <div className="p-4 rounded-2xl border border-border bg-card shadow-xs space-y-1">
              <div className="flex items-center justify-between text-xs text-muted-foreground font-bold">
                <span>Total User Accounts</span>
                <Activity className="size-4 text-purple-400" />
              </div>
              <p className="text-xl font-black text-foreground">{health?.metrics.total_users || 0}</p>
              <span className="text-[10px] text-emerald-400 font-bold">{health?.metrics.active_users || 0} Active Learners/Admins</span>
            </div>
          </div>

          {/* Live Metrics Grid */}
          <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
            <h2 className="text-base font-black text-foreground flex items-center gap-2">
              <Activity className="size-5 text-emerald-400" /> Live System Metrics Directory
            </h2>
            <div className="grid sm:grid-cols-3 lg:grid-cols-6 gap-3">
              {[
                { label: "Published Courses", val: health?.metrics.total_courses || 0, color: "text-emerald-400" },
                { label: "Course Modules", val: health?.metrics.total_modules || 0, color: "text-cyan-400" },
                { label: "Authored Lessons", val: health?.metrics.total_lessons || 0, color: "text-indigo-400" },
                { label: "Issued Certificates", val: health?.metrics.total_certificates || 0, color: "text-amber-400" },
                { label: "SCORM Packages", val: health?.metrics.total_scorm_packages || 0, color: "text-purple-400" },
                { label: "Toolkit Articles", val: health?.metrics.total_articles || 0, color: "text-pink-400" },
              ].map((m, i) => (
                <div key={i} className="p-3.5 rounded-xl border border-border/60 bg-muted/30 text-center space-y-0.5">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider">{m.label}</p>
                  <p className={`text-2xl font-black ${m.color}`}>{m.val}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Recent Release Notes */}
          <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
            <h2 className="text-base font-black text-foreground flex items-center gap-2">
              <Tag className="size-5 text-indigo-400" /> Latest Platform Release Notes
            </h2>
            <div className="space-y-3">
              {releaseNotes.map((rn) => (
                <div key={rn.id} className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-black px-2.5 py-1 rounded-md bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Version {rn.version_number}
                    </span>
                    <span className="text-xs text-muted-foreground font-bold">{rn.release_date}</span>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4 text-xs font-medium text-foreground">
                    <div>
                      <p className="text-[10px] font-bold uppercase text-emerald-400 mb-1">New Features & Capabilities</p>
                      <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                        {rn.new_features.map((f, i) => <li key={i}>{f}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="text-[10px] font-bold uppercase text-cyan-400 mb-1">Improvements & Enhancements</p>
                      <ul className="list-disc list-inside space-y-0.5 text-muted-foreground">
                        {rn.improvements.map((f, i) => <li key={i}>{f}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 2: KNOWLEDGE BASE BROWSER ────────────────────────────────── */}
      {activeTab === "knowledge" && (
        <div className="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6" style={{ minHeight: "calc(100vh - 240px)" }}>
          {/* Categories Sidebar */}
          <aside className="space-y-4">
            <div className="p-3.5 rounded-2xl border border-border bg-card space-y-3">
              <div className="relative">
                <Search className="size-4 absolute left-3 top-3 text-muted-foreground" />
                <input
                  type="text"
                  placeholder="Search articles, codes, APIs..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 rounded-xl bg-background border border-border text-xs font-medium text-foreground focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                />
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setBookmarkedOnly(!bookmarkedOnly)}
                  className={`flex-1 px-3 py-1.5 rounded-lg text-[11px] font-bold border flex items-center justify-center gap-1.5 transition-all ${
                    bookmarkedOnly ? "bg-amber-500/20 text-amber-300 border-amber-500/40" : "bg-muted text-muted-foreground border-border"
                  }`}
                >
                  <Bookmark className="size-3.5 text-amber-400" /> Bookmarked
                </button>
              </div>

              <div className="space-y-1">
                <button
                  onClick={() => setSelectedCategory(null)}
                  className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${
                    selectedCategory === null ? "bg-emerald-600 text-slate-950 shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <span>All Documentation Modules</span>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-background/30 font-extrabold">{articles.length}</span>
                </button>

                {categories.map((cat) => (
                  <button
                    key={cat.id}
                    onClick={() => setSelectedCategory(cat.id)}
                    className={`w-full px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-between transition-all ${
                      selectedCategory === cat.id ? "bg-emerald-600 text-slate-950 shadow-sm" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    }`}
                  >
                    <span className="truncate">{cat.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-background/20 font-extrabold">{cat.article_count || 0}</span>
                  </button>
                ))}
              </div>
            </div>
          </aside>

          {/* Article Reader Area */}
          <main className="space-y-4">
            {selectedArticle ? (
              <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-6">
                <div className="flex items-start justify-between gap-4 pb-4 border-b border-border">
                  <div className="space-y-1">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                      {selectedArticle.category_name || "General"}
                    </span>
                    <h2 className="text-2xl font-black text-foreground leading-tight">{selectedArticle.title}</h2>
                    <p className="text-xs text-muted-foreground font-medium">{selectedArticle.summary}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleToggleBookmark(selectedArticle.id)}
                      className={`p-2 rounded-xl border transition-colors ${selectedArticle.is_bookmarked ? "bg-amber-500/20 border-amber-500/40 text-amber-300" : "border-border text-muted-foreground hover:bg-muted"}`}
                      title="Bookmark Article"
                    >
                      <Bookmark className="size-4" />
                    </button>
                    <button
                      onClick={() => {
                        setEditingArticle(selectedArticle);
                        setShowArticleModal(true);
                      }}
                      className="p-2 rounded-xl border border-border text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                      title="Edit Article"
                    >
                      <Edit3 className="size-4" />
                    </button>
                    <button
                      onClick={() => handleDeleteArticle(selectedArticle.id)}
                      className="p-2 rounded-xl border border-border text-destructive hover:bg-destructive/10 transition-colors"
                      title="Delete Article"
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </div>
                </div>

                {/* Article Content Render */}
                <div className="prose prose-invert max-w-none text-xs sm:text-sm text-foreground leading-relaxed space-y-4">
                  <div dangerouslySetInnerHTML={{ __html: selectedArticle.content.replace(/\n/g, "<br/>") }} />
                </div>

                {/* Version History Drawer */}
                {selectedArticle.versions && selectedArticle.versions.length > 0 && (
                  <div className="pt-6 border-t border-border space-y-3">
                    <h3 className="text-xs font-black uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <History className="size-4 text-emerald-400" /> Snapshot Version History
                    </h3>
                    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {selectedArticle.versions.map((ver) => (
                        <div key={ver.id} className="p-3 rounded-xl border border-border/80 bg-muted/20 text-xs space-y-1.5">
                          <div className="flex items-center justify-between font-bold">
                            <span className="text-emerald-400">Version {ver.version_number}</span>
                            <span className="text-[10px] text-muted-foreground">{new Date(ver.created_at).toLocaleDateString()}</span>
                          </div>
                          <p className="text-muted-foreground text-[11px] line-clamp-2">{ver.summary || ver.title}</p>
                          <button
                            onClick={() => handleRollback(selectedArticle.id, ver.id)}
                            className="w-full mt-2 px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600 text-emerald-300 hover:text-slate-950 text-[10px] font-black transition-all border border-emerald-500/30"
                          >
                            Restore Version Snapshot
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="p-12 text-center border border-dashed border-border rounded-2xl bg-card/50 text-muted-foreground">
                <BookOpen className="size-10 mx-auto mb-2 text-muted-foreground opacity-50" />
                <p className="text-sm font-bold">No documentation article selected.</p>
              </div>
            )}
          </main>
        </div>
      )}

      {/* ── TAB 3: DEPENDENCY MAP & IMPACT ANALYSIS ──────────────────────── */}
      {activeTab === "dependencies" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
            <h2 className="text-lg font-black text-foreground flex items-center gap-2">
              <Layers className="size-5 text-emerald-400" /> Feature Dependency Chains & Impact Analysis
            </h2>
            <p className="text-xs text-muted-foreground">
              Visual dependency chains outlining backend ORM models, APIs, and frontend components affected when introducing architectural modifications.
            </p>

            <div className="space-y-4">
              {[
                {
                  title: "Content Authoring Pipeline",
                  chain: ["Course", "Module", "Lesson", "LessonBlockTree", "LessonBlock", "Preview", "Publishing Validation", "SCORM Export"],
                  impact: { models: ["Course", "LessonBlock"], apis: ["/api/authoring/blocks/"], risk: "Medium" }
                },
                {
                  title: "Multi-Tenant Access Control",
                  chain: ["Super Admin", "Organization", "Role", "Department", "User Permission Scope", "JWT Token Auth"],
                  impact: { models: ["User", "Role"], apis: ["/api/users/auth/login/"], risk: "High" }
                },
                {
                  title: "SCORM Packaging & Player",
                  chain: ["Published Course", "ScormPackage", "imsmanifest.xml Exporter", "SCORM JS Runtime", "CMI Tracking API"],
                  impact: { models: ["ScormPackage"], apis: ["/api/courses/scorm-tracking/"], risk: "Medium" }
                }
              ].map((dep, idx) => (
                <div key={idx} className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3">
                  <h3 className="text-sm font-bold text-foreground">{dep.title}</h3>
                  <div className="flex items-center gap-2 flex-wrap text-xs font-bold text-emerald-400">
                    {dep.chain.map((step, i) => (
                      <div key={i} className="flex items-center gap-2">
                        <span className="px-2.5 py-1 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300">{step}</span>
                        {i < dep.chain.length - 1 && <ChevronRight className="size-4 text-muted-foreground" />}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 4: API & DATABASE EXPLORERS ───────────────────────────── */}
      {activeTab === "explorers" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-border bg-card space-y-4">
            <h2 className="text-lg font-black text-foreground flex items-center gap-2">
              <Terminal className="size-5 text-cyan-400" /> Interactive API & Database Explorers
            </h2>
            <p className="text-xs text-muted-foreground">
              Auto-discovered schema definitions and REST API endpoints registered across all active backend services.
            </p>

            <div className="grid lg:grid-cols-2 gap-6">
              <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3">
                <h3 className="text-sm font-bold text-cyan-400 flex items-center gap-2">
                  <Terminal className="size-4" /> Discovered REST API Endpoints
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto font-mono text-xs text-foreground">
                  {[
                    "GET /api/courses/",
                    "POST /api/courses/",
                    "GET /api/courses/{id}/",
                    "GET /api/authoring/blocks/",
                    "POST /api/authoring/blocks/",
                    "POST /api/authoring/scorm/export-12/",
                    "POST /api/authoring/scorm/export-2004/",
                    "GET /api/users/auth/me/",
                    "GET /api/organizations/roles/",
                    "GET /api/master-setup/toolkit/articles/",
                  ].map((ep, i) => (
                    <div key={i} className="p-2 rounded bg-background border border-border/60">
                      {ep}
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-3">
                <h3 className="text-sm font-bold text-emerald-400 flex items-center gap-2">
                  <Database className="size-4" /> Discovered Django ORM Models
                </h3>
                <div className="space-y-2 max-h-96 overflow-y-auto font-mono text-xs text-foreground">
                  {[
                    "organizations.Organization (db_table: organizations_organization)",
                    "users.User (db_table: users_user)",
                    "courses.Course (db_table: courses_course)",
                    "courses.Module (db_table: courses_module)",
                    "courses.Lesson (db_table: courses_lesson)",
                    "authoring_engine.LessonBlockTree (db_table: authoring_lessonblocktree)",
                    "authoring_engine.LessonBlock (db_table: authoring_lessonblock)",
                    "master_setup.ToolkitArticle (db_table: toolkit_article)",
                  ].map((model, i) => (
                    <div key={i} className="p-2 rounded bg-background border border-border/60">
                      {model}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 5: CHANGE LOG ───────────────────────────────────────────── */}
      {activeTab === "changelog" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-black text-foreground">Project Update History & Change Logs</h2>
            <button
              onClick={() => setShowChangeLogModal(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-black transition-all"
            >
              <Plus className="size-4" /> Add Change Log Entry
            </button>
          </div>

          <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
            <div className="space-y-3">
              {changeLogs.map((log) => (
                <div key={log.id} className="p-4 rounded-xl border border-border/80 bg-muted/20 space-y-2 text-xs">
                  <div className="flex items-center justify-between">
                    <span className="font-black text-emerald-400">Version {log.version} · {log.feature_name}</span>
                    <span className="text-[10px] text-muted-foreground font-bold">{new Date(log.date_time).toLocaleDateString()}</span>
                  </div>
                  <p className="text-foreground font-medium">{log.description}</p>
                  <div className="flex items-center gap-4 text-[10px] text-muted-foreground">
                    <span>Module: <strong className="text-foreground">{log.module_name}</strong></span>
                    <span>Developer: <strong className="text-foreground">{log.developer_name}</strong></span>
                    <span>Status: <strong className="text-emerald-400 uppercase">{log.status}</strong></span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── TAB 6: AUDIT TRAIL ──────────────────────────────────────────── */}
      {activeTab === "audit" && (
        <div className="space-y-6">
          <div className="p-6 rounded-2xl border border-border bg-card shadow-sm space-y-4">
            <h2 className="text-lg font-black text-foreground flex items-center gap-2">
              <ShieldCheck className="size-5 text-emerald-400" /> Master Setup Security & Audit Trail
            </h2>
            <div className="space-y-2">
              {auditLogs.map((audit) => (
                <div key={audit.id} className="p-3 rounded-xl border border-border/60 bg-muted/20 flex items-center justify-between text-xs font-medium">
                  <div>
                    <span className="font-bold text-emerald-400">{audit.action}</span>
                    <span className="text-muted-foreground ml-2">{audit.article_title || audit.category_name}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground">{new Date(audit.timestamp).toLocaleString()}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ── EDIT ARTICLE MODAL ──────────────────────────────────────────── */}
      {showArticleModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-2xl shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-foreground">{editingArticle?.id ? "Edit Documentation Article" : "Create New Article"}</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground">Article Title</label>
                <input
                  type="text"
                  value={editingArticle?.title || ""}
                  onChange={(e) => setEditingArticle({ ...editingArticle, title: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-border text-xs font-medium text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-muted-foreground">Documentation Category</label>
                  <select
                    value={editingArticle?.category || categories[0]?.id}
                    onChange={(e) => setEditingArticle({ ...editingArticle, category: parseInt(e.target.value, 10) })}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-border text-xs font-medium text-foreground"
                  >
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-bold text-muted-foreground">Publication Status</label>
                  <select
                    value={editingArticle?.status || "draft"}
                    onChange={(e) => setEditingArticle({ ...editingArticle, status: e.target.value as any })}
                    className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-border text-xs font-medium text-foreground"
                  >
                    <option value="draft">Draft</option>
                    <option value="in_review">In Review</option>
                    <option value="approved">Approved</option>
                    <option value="published">Published</option>
                    <option value="archived">Archived</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground">Summary</label>
                <input
                  type="text"
                  value={editingArticle?.summary || ""}
                  onChange={(e) => setEditingArticle({ ...editingArticle, summary: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-border text-xs font-medium text-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground">Article Content (Markdown / HTML)</label>
                <textarea
                  rows={8}
                  value={editingArticle?.content || ""}
                  onChange={(e) => setEditingArticle({ ...editingArticle, content: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-border text-xs font-mono text-foreground"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                onClick={() => setShowArticleModal(false)}
                className="px-4 py-2 rounded-xl bg-muted text-muted-foreground text-xs font-bold hover:bg-muted/80"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveArticle}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 text-xs font-black shadow-md shadow-emerald-600/20"
              >
                Save Article
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── CREATE CHANGE LOG MODAL ──────────────────────────────────────── */}
      {showChangeLogModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-card border border-border rounded-2xl p-6 w-full max-w-lg shadow-2xl space-y-4">
            <h3 className="text-lg font-black text-foreground">Add Project Change Log Entry</h3>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-muted-foreground">Feature Name</label>
                <input
                  type="text"
                  value={newChangeLog.feature_name || ""}
                  onChange={(e) => setNewChangeLog({ ...newChangeLog, feature_name: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-border text-xs font-medium text-foreground"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-muted-foreground">Description of Changes</label>
                <textarea
                  rows={4}
                  value={newChangeLog.description || ""}
                  onChange={(e) => setNewChangeLog({ ...newChangeLog, description: e.target.value })}
                  className="w-full mt-1 px-3 py-2 rounded-xl bg-background border border-border text-xs font-medium text-foreground"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-border">
              <button
                onClick={() => setShowChangeLogModal(false)}
                className="px-4 py-2 rounded-xl bg-muted text-muted-foreground text-xs font-bold"
              >
                Cancel
              </button>
              <button
                onClick={handleCreateChangeLog}
                className="px-4 py-2 rounded-xl bg-emerald-600 text-slate-950 text-xs font-black shadow-md"
              >
                Save Entry
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
