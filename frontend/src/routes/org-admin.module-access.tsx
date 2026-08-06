import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { authFetch, useAuth } from '@/lib/auth';
import { Layers, Loader2, Save, AlertCircle, CheckCircle2, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/org-admin/module-access')({
  component: ModuleAccessPage,
});

interface SiteModules {
  dashboard: boolean;
  course_catalog: boolean;
  learning_paths: boolean;
  certifications: boolean;
  ai_assistant: boolean;
  content_authoring: boolean;
  admin_console: boolean;
}

interface Site {
  id: number;
  name: string;
  subdomain?: string;
  modules: SiteModules;
}

const DEFAULT_MODULES: SiteModules = {
  dashboard: true,
  course_catalog: true,
  learning_paths: true,
  certifications: true,
  ai_assistant: true,
  content_authoring: true,
  admin_console: true,
};

function ModuleAccessPage() {
  const [sites, setSites] = useState<Site[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<number | null>(null);
  const [saveSuccessId, setSaveSuccessId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { user } = useAuth();

  const isSuperOrAdmin = Boolean(user?.is_platform_super_admin || user?.role?.is_admin_role);
  const canEdit = isSuperOrAdmin || Boolean(user?.role?.can_edit_module_access || user?.role?.can_manage_module_access);

  useEffect(() => {
    fetchSites();
  }, []);

  const fetchSites = async () => {
    try {
      const res = await authFetch('http://127.0.0.1:8000/api/sites/');
      if (res.ok) {
        const rawSites = await res.json();
        const formattedSites: Site[] = rawSites.map((s: any) => ({
          ...s,
          modules: s.modules ? { ...DEFAULT_MODULES, ...s.modules } : { ...DEFAULT_MODULES }
        }));
        setSites(formattedSites);
      } else {
        throw new Error("Failed to load organization sites.");
      }
    } catch (e: any) {
      console.error(e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = (siteId: number, field: keyof SiteModules, value: boolean) => {
    setSites(prevSites => prevSites.map(s => {
      if (s.id === siteId) {
        return {
          ...s,
          modules: {
            ...DEFAULT_MODULES,
            ...(s.modules || {}),
            [field]: value
          }
        };
      }
      return s;
    }));
  };

  const handleSave = async (site: Site) => {
    setSavingId(site.id);
    setError(null);
    try {
      const res = await authFetch(`http://127.0.0.1:8000/api/sites/${site.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: site.name
        })
      });
      
      if (!res.ok) {
        throw new Error("Failed to update module access settings.");
      }
      
      setSaveSuccessId(site.id);
      setTimeout(() => {
        setSaveSuccessId(null);
        setSavingId(null);
      }, 1500);
    } catch (err: any) {
      setError(err.message);
      setSavingId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-3xl font-black tracking-tight text-foreground mb-1">Module Access</h1>
        <p className="text-sm text-foreground font-medium">Configure which platform modules and features are enabled per site.</p>
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-xl text-sm flex gap-3 items-start border border-red-100 shadow-sm">
          <AlertCircle className="size-5 shrink-0 mt-0.5" />
          <p>{error}</p>
        </div>
      )}

      <div className="space-y-8">
        {sites.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground bg-card rounded-2xl border border-border shadow-sm">
            <Layers className="size-12 mx-auto text-foreground mb-3" />
            <h3 className="font-semibold text-slate-800 text-base mb-1">No Sites Found</h3>
            <p className="text-xs text-muted-foreground">No active location sites were found for this organization.</p>
          </div>
        ) : (
          sites.map(site => {
            const currentModules = site.modules || DEFAULT_MODULES;
            const isSaving = savingId === site.id;
            const isSaved = saveSuccessId === site.id;

            return (
              <div key={site.id} className="bg-card rounded-2xl shadow-sm border border-border overflow-hidden">
                <div className="px-6 py-5 border-b border-border/50 bg-muted/50/50 flex justify-between items-center flex-wrap gap-4">
                  <div className="flex items-center gap-3">
                    <div className="size-10 rounded-xl bg-emerald-50 text-emerald-600 grid place-items-center">
                      <Layers className="size-5" />
                    </div>
                    <div>
                      <h2 className="font-bold text-lg text-foreground">{site.name}</h2>
                      <p className="text-xs text-muted-foreground">Manage features & module visibility for this location</p>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {isSaved && (
                      <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-xl border border-emerald-100">
                        <CheckCircle2 className="size-4 text-emerald-600" /> Saved Successfully!
                      </span>
                    )}

                    {canEdit && (
                      <button
                        onClick={() => handleSave(site)}
                        disabled={isSaving}
                        className="flex items-center gap-2 px-5 py-2.5 bg-card text-foreground rounded-xl hover:bg-muted transition-colors text-xs font-bold disabled:opacity-70 shadow-sm"
                      >
                        {isSaving ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Save className="size-4" />
                        )}
                        {isSaving ? "Saving..." : "Save Changes"}
                      </button>
                    )}
                  </div>
                </div>

                <div className="p-6 md:p-8">
                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-x-12 gap-y-8">
                    
                    {/* CORE PLATFORM */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 border-b border-border/50 pb-2">
                        <ShieldCheck className="size-4 text-emerald-600" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Core Platform
                        </h3>
                      </div>
                      <ModuleToggle
                        label="Dashboard"
                        checked={currentModules.dashboard ?? true}
                        onChange={(c) => handleToggle(site.id, 'dashboard', c)}
                      />
                      <ModuleToggle
                        label="Course Catalog"
                        checked={currentModules.course_catalog ?? true}
                        onChange={(c) => handleToggle(site.id, 'course_catalog', c)}
                      />
                      <ModuleToggle
                        label="Learning Paths"
                        checked={currentModules.learning_paths ?? true}
                        onChange={(c) => handleToggle(site.id, 'learning_paths', c)}
                      />
                      <ModuleToggle
                        label="Certifications"
                        checked={currentModules.certifications ?? true}
                        onChange={(c) => handleToggle(site.id, 'certifications', c)}
                      />
                    </div>

                    {/* ADVANCED FEATURES */}
                    <div className="space-y-4">
                      <div className="flex items-center gap-2 border-b border-border/50 pb-2">
                        <ShieldCheck className="size-4 text-indigo-600" />
                        <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                          Advanced Features
                        </h3>
                      </div>
                      <ModuleToggle
                        label="AI Assistant"
                        checked={currentModules.ai_assistant ?? true}
                        onChange={(c) => handleToggle(site.id, 'ai_assistant', c)}
                      />
                      <ModuleToggle
                        label="Content Authoring"
                        checked={currentModules.content_authoring ?? true}
                        onChange={(c) => handleToggle(site.id, 'content_authoring', c)}
                      />
                      <ModuleToggle
                        label="Admin Console"
                        checked={currentModules.admin_console ?? true}
                        onChange={(c) => handleToggle(site.id, 'admin_console', c)}
                      />
                    </div>

                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function ModuleToggle({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return (
    <label className="flex items-center justify-between cursor-pointer group py-1">
      <span className="text-sm font-semibold text-muted-foreground group-hover:text-foreground transition-colors">
        {label}
      </span>
      <div className="relative inline-flex items-center">
        <input 
          type="checkbox" 
          className="sr-only peer" 
          checked={checked} 
          onChange={(e) => onChange(e.target.checked)} 
        />
        <div className="w-10 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-border after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-card after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-600 shadow-sm" />
      </div>
    </label>
  );
}
