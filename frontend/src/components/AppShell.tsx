import { useWorkspaces } from '@/hooks/useWorkspaces';
import { resolveIcon, Icon } from '@/components/IconRegistry';
import { useState, useEffect } from 'react';
import { Link, useRouterState, useNavigate } from '@tanstack/react-router';
import { useAuth, authFetch, API_BASE } from '@/lib/auth';
import { Search, Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NotificationDropdown } from './NotificationDropdown';
import { ThemeToggle } from './ThemeToggle';
import { UserProfileDropdown } from './UserProfileDropdown';

export function Header({
  activeWorkspaceKey,
  onToggleSidebar,
}: {
  activeWorkspaceKey?: string;
  onToggleSidebar?: () => void;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const placeholder = activeWorkspaceKey === 'admin'
    ? 'Search users, departments, roles, courses…'
    : activeWorkspaceKey === 'learner'
    ? 'Search courses, paths, certificates…'
    : activeWorkspaceKey === 'super_admin'
    ? 'Search organizations, sites, plans…'
    : 'Search…';


  useEffect(() => {
    if (!query) { setResults([]); setIsSearching(false); return; }
    setIsSearching(true);
    const t = setTimeout(() => {
      authFetch(`${API_BASE}/search/?q=${encodeURIComponent(query)}&workspace=${activeWorkspaceKey}`)
        .then(res => res.json())
        .then(data => setResults(data.results || []))
        .catch(console.error)
        .finally(() => setIsSearching(false));
    }, 300);
    return () => clearTimeout(t);
  }, [query, activeWorkspaceKey]);

  return (
    <header className="shell-header">
      {/* Left side: Toggle button + Search */}
      <div className="flex items-center gap-2 flex-1 min-w-0 pr-4">
        {onToggleSidebar && (
          <button
            type="button"
            onClick={onToggleSidebar}
            className="p-1.5 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/80 transition-colors shrink-0 flex items-center justify-center cursor-pointer"
            title="Toggle Sidebar"
            aria-label="Toggle Sidebar"
          >
            <Menu className="size-5" />
          </button>
        )}

        {/* Search */}
        <div className="shell-search">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            placeholder={placeholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="pl-9"
          />
          {query && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-card border border-border rounded-xl overflow-hidden z-50"
              style={{ boxShadow: 'var(--shadow-overlay)' }}>
              {isSearching ? (
                <div className="p-4 text-xs text-muted-foreground text-center">Searching…</div>
              ) : results.length > 0 ? (
                <div className="max-h-72 overflow-y-auto custom-scrollbar">
                  {results.map((r, i) => {
                    let toRoute = '/catalog';
                    let paramsObj: any = undefined;

                    if (r.type === 'page') {
                      toRoute = String(r.id);
                    } else if (r.type === 'course') {
                      toRoute = activeWorkspaceKey === 'admin' ? '/org-admin/courses' : '/courses/$courseId';
                      paramsObj = activeWorkspaceKey === 'admin' ? undefined : { courseId: String(r.id) };
                    } else if (r.type === 'path') {
                      toRoute = activeWorkspaceKey === 'admin' ? '/org-admin/paths' : '/paths';
                    } else if (r.type === 'certificate') {
                      toRoute = activeWorkspaceKey === 'admin' ? '/org-admin/certificates' : '/certificates';
                    } else if (r.type === 'user' || r.type === 'department') {
                      toRoute = '/org-admin/departments';
                    } else if (r.type === 'role') {
                      toRoute = '/org-admin/roles';
                    } else if (r.type === 'organization') {
                      toRoute = '/super-admin/organizations';
                    } else if (r.type === 'site') {
                      toRoute = '/super-admin/sites';
                    } else if (r.type === 'plan') {
                      toRoute = '/super-admin/plans';
                    }


                    return (
                      <Link
                        key={i}
                        to={toRoute as any}
                        params={paramsObj}
                        onClick={() => setQuery('')}
                        className="flex items-center justify-between gap-3 px-4 py-2.5 hover:bg-muted transition-colors border-b border-border/50 last:border-0"
                      >
                        <div className="flex items-center gap-2.5 truncate min-w-0">
                          <span className="badge-brand text-[10px] uppercase tracking-wider shrink-0">{r.type}</span>
                          <span className="text-xs text-foreground font-semibold truncate">{r.name}</span>
                        </div>
                        {r.subtitle && (
                          <span className="text-[10px] text-muted-foreground shrink-0 font-medium">{r.subtitle}</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="p-4 text-xs text-muted-foreground text-center">No results found</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right controls — order: Notifications → Theme → Profile */}
      <div className="flex items-center gap-1.5 ml-4 shrink-0">
        <NotificationDropdown />
        <ThemeToggle />
        <div className="h-6 w-px bg-border mx-1 hidden sm:block" />
        <UserProfileDropdown />
      </div>
    </header>
  );
}

export function AppShell({ children, rightRail, maxWidth = "w-full" }: { children: React.ReactNode, rightRail?: React.ReactNode, maxWidth?: string }) {
  const { data, loading } = useWorkspaces();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopHovered, setDesktopHovered] = useState(false);

  const [activeWorkspace, setActiveWorkspace] = useState<string | null>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('activeWorkspace');
    }
    return null;
  });

  useEffect(() => {
    if (data && data.workspaces.length > 0) {
      if (!activeWorkspace || !data.workspaces.some(w => w.workspace_key === activeWorkspace)) {
        setActiveWorkspace(data.workspaces[0].workspace_key);
      }
    }
  }, [data, activeWorkspace]);

  useEffect(() => {
    if (activeWorkspace && typeof window !== 'undefined') {
      localStorage.setItem('activeWorkspace', activeWorkspace);
    }
  }, [activeWorkspace]);

  // Close mobile sidebar on route change
  useEffect(() => {
    setMobileSidebarOpen(false);
  }, [pathname]);

  const handleLogout = () => {
    logout();
    navigate({ to: "/login" });
  };

  if (loading || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="spinner" />
          <p className="text-sm text-muted-foreground font-medium">Loading workspace…</p>
        </div>
      </div>
    );
  }

  const currentWorkspace = data.workspaces.find(w => w.workspace_key === activeWorkspace) || data.workspaces[0];
  const initials = user?.avatar_initials || "U";

  const handleNavClick = () => {
    if (typeof window !== 'undefined' && window.innerWidth < 1024) {
      setMobileSidebarOpen(false);
    }
  };

  const SidebarContent = ({ isExpanded = true }: { isExpanded?: boolean }) => (
    <>
      {/* Logo + org block */}
      <div className="px-3 py-4 border-b border-border/60 shrink-0">
        <div className={cn("flex items-center gap-3 mb-2", !isExpanded && "justify-center mb-0")}>
          {user?.organization?.logo_url ? (
            <img src={user.organization.logo_url} alt="Logo" className="w-8 h-8 rounded-lg object-contain bg-white shadow-sm ring-1 ring-border p-0.5 shrink-0" />
          ) : (
            <div className="size-8 rounded-lg flex items-center justify-center text-brand-foreground font-bold text-sm bg-brand shadow-sm shrink-0">
              {(data.organization_name || "LMS")[0]}
            </div>
          )}
          {isExpanded && (
            <div className="leading-tight min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">{data.organization_name || "Learning Platform"}</div>
              <span className="text-[10px] font-semibold text-accent-foreground bg-accent px-2 py-0.5 rounded-full inline-block mt-0.5">Enterprise</span>
            </div>
          )}
        </div>

        {/* Workspace Switcher */}
        {data.workspaces.length > 1 && isExpanded && (
          <div className="relative mt-2">
            <select
              value={currentWorkspace?.workspace_key}
              onChange={(e) => setActiveWorkspace(e.target.value)}
              className="form-select text-xs py-2 h-8"
            >
              {data.workspaces.map(ws => (
                <option key={ws.workspace_key} value={ws.workspace_key}>
                  {ws.workspace_label}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-2 py-3 custom-scrollbar space-y-1">
        {currentWorkspace?.nav_items.map(item => {
          const isBaseOverview = item.route === "/org-admin" || item.route === "/super-admin" || item.route === "/dashboard" || item.route === "/";
          const isActive = isBaseOverview
            ? (pathname === item.route || pathname === item.route + "/")
            : (pathname === item.route || pathname.startsWith(item.route + "/"));
          return (
            <Link
              key={item.key}
              to={item.route}
              onClick={handleNavClick}
              title={item.label}
              className={cn(
                isActive ? 'sidebar-nav-item-active' : 'sidebar-nav-item',
                !isExpanded && "justify-center px-0 gap-0"
              )}
            >
              <Icon
                icon={resolveIcon(item.icon)}
                className={cn("size-4 shrink-0", isActive ? "text-accent-foreground" : "text-muted-foreground")}
              />
              {isExpanded && <span className="truncate text-sm ml-2">{item.label}</span>}
            </Link>
          );
        })}
      </nav>
    </>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex h-screen overflow-hidden">
      {/* Desktop Sidebar — Collapsed by default (w-16), expands to w-64 on hover */}
      <aside
        onMouseEnter={() => setDesktopHovered(true)}
        onMouseLeave={() => setDesktopHovered(false)}
        className={cn(
          "hidden lg:flex flex-col shrink-0 bg-sidebar border-r border-sidebar-border z-30 transition-all duration-300 ease-in-out overflow-hidden",
          desktopHovered ? "w-64" : "w-16"
        )}
      >
        <SidebarContent isExpanded={desktopHovered} />
      </aside>

      {/* Mobile Sidebar Overlay */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="relative z-50 w-72 bg-sidebar border-r border-sidebar-border flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
              <span className="text-sm font-semibold text-foreground">Navigation</span>
              <button className="btn-icon" onClick={() => setMobileSidebarOpen(false)}>
                <X className="size-4" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              <SidebarContent isExpanded={true} />
            </div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Mobile header with hamburger */}
        <header className="shell-header lg:hidden">
          <button
            className="btn-icon mr-2"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open navigation"
          >
            <Menu className="size-5" />
          </button>
          <div className="flex-1 text-sm font-semibold text-foreground truncate">
            {data.organization_name || "Learning Platform"}
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            <NotificationDropdown />
            <ThemeToggle />
            <div className="h-5 w-px bg-border mx-0.5" />
            <UserProfileDropdown />
          </div>
        </header>

        {/* Desktop header */}
        <div className="hidden lg:block">
          <Header
            activeWorkspaceKey={currentWorkspace?.workspace_key}
          />
        </div>

        <main className="flex-1 overflow-y-auto min-w-0 bg-background">
          <div className={cn("w-full pb-bottom-nav", maxWidth.includes("px-") ? maxWidth : `px-4 sm:px-6 lg:px-8 py-6 lg:py-8 ${maxWidth}`)}>
            {children}
          </div>
        </main>
      </div>

      {/* Right rail */}
      {rightRail && (
        <aside className="w-80 shrink-0 bg-background border-l border-border hidden 2xl:flex flex-col overflow-y-auto">
          {rightRail}
        </aside>
      )}

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-card/98 backdrop-blur-xl border-t border-border flex items-stretch justify-around safe-bottom h-[60px]">
        {currentWorkspace?.nav_items.slice(0, 5).map(item => {
          const isActive = pathname === item.route || pathname.startsWith(item.route + "/");
          return (
            <Link
              key={item.key}
              to={item.route}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors py-2",
                isActive ? "text-accent-foreground" : "text-muted-foreground"
              )}
            >
              <Icon icon={resolveIcon(item.icon)} className={cn("size-5", isActive ? "text-brand" : "text-muted-foreground")} />
              <span className="truncate max-w-full px-1">{item.label.split(" ")[0]}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
