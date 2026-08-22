import { Link, useRouterState } from "@tanstack/react-router";
import {
  LayoutDashboard, Users, Shield, Layers, BookOpen, Award,
  Search, Activity, ArrowLeft, Menu, X, User,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import { useAuth, normalizeUrl } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { NotificationDropdown } from "./NotificationDropdown";
import { ThemeToggle } from "./ThemeToggle";
import { UserProfileDropdown } from "./UserProfileDropdown";
import { Header } from "./AppShell";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  show: (role: Record<string, any>) => boolean;
}

const NAV: NavItem[] = [
  { to: "/org-admin", label: "Overview", icon: LayoutDashboard, show: (role) => role.can_view_reports },
  { to: "/org-admin/departments", label: "Users & Departments", icon: Users, show: (role) => role.can_manage_users || role.can_manage_departments },
  { to: "/org-admin/roles", label: "Roles & Permissions", icon: Shield, show: (role) => role.can_manage_roles },
  { to: "/org-admin/module-access", label: "Module Access", icon: Layers, show: (role) => role.can_manage_module_access },
  { to: "/org-admin/courses", label: "Course Catalog", icon: BookOpen, show: (role) => role.can_create_courses || role.can_edit_courses || role.can_publish_courses },
  { to: "/org-admin/certificates", label: "Certificates", icon: Award, show: (role) => role.can_manage_certificates },
  { to: "/org-admin/activity", label: "Activity Log", icon: Activity, show: (role) => role.is_admin_role },
];

// Core modules: Always visible and accessible unconditionally (bypasses Module Access & role permissions)
const CORE_NAV: NavItem[] = [
  { to: "/org-admin/profile", label: "My Profile", icon: User, show: () => true },
];

export function OrgAdminShell({ children, maxWidth = "w-full" }: { children: ReactNode; maxWidth?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const { user } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);
  const [desktopHovered, setDesktopHovered] = useState(false);

  const roleDict = user?.is_platform_super_admin
    ? new Proxy({}, { get: () => true })
    : (user?.role || {});

  const dynamicVisible = NAV.filter((n) => n.show(roleDict));
  const visibleNav = [...dynamicVisible, ...CORE_NAV];

  // Close sidebar on route change
  useEffect(() => { setMobileSidebarOpen(false); }, [pathname]);

  const handleNavClick = () => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileSidebarOpen(false);
    }
  };

  const SidebarContent = ({ isExpanded = true }: { isExpanded?: boolean }) => (
    <>
      {/* Org brand + back link */}
      <div className="px-3 py-4 border-b border-border/60 shrink-0">
        <Link
          to="/dashboard"
          className={cn("flex items-center gap-3 group mb-1 rounded-lg p-1 hover:bg-muted/60 transition-colors", !isExpanded && "justify-center")}
          title="Back to Learner Dashboard"
        >
          {user?.organization?.logo_url ? (
            <img src={normalizeUrl(user.organization.logo_url)} alt="Logo" className="w-8 h-8 rounded-lg object-contain bg-white shadow-sm ring-1 ring-border p-0.5 shrink-0" />
          ) : (
            <div
              className="size-8 rounded-lg flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-sm"
              style={{ backgroundColor: user?.organization?.primary_color || '#059669' }}
            >
              {(user?.organization?.name || "O")[0]}
            </div>
          )}
          {isExpanded && (
            <div className="leading-tight min-w-0">
              <div className="text-sm font-semibold text-foreground truncate">{user?.organization?.name || "Organization"}</div>
              <div className="flex items-center gap-1 text-[10px] font-semibold text-brand mt-0.5">
                <ArrowLeft className="size-2.5" />
                Learner Console
              </div>
            </div>
          )}
        </Link>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-2 py-3">
        {isExpanded && <div className="sidebar-nav-group-label mt-0">Administration</div>}
        <nav className="space-y-1">
          {visibleNav.map((item) => {
            const isBaseRoute = item.to === "/org-admin";
            const isActive = isBaseRoute
              ? (pathname === item.to || pathname === item.to + "/")
              : (pathname === item.to || pathname.startsWith(item.to + "/"));
            return (
              <Link
                key={item.to}
                to={item.to}
                onClick={handleNavClick}
                title={item.label}
                className={cn(
                  isActive ? 'sidebar-nav-item-active' : 'sidebar-nav-item',
                  !isExpanded && "justify-center px-0 gap-0"
                )}
              >
                <item.icon className={cn("size-4 shrink-0", isActive ? "text-accent-foreground" : "text-muted-foreground")} />
                {isExpanded && <span className="truncate text-sm ml-2">{item.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>
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

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="relative z-50 w-72 bg-sidebar border-r border-sidebar-border flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
              <span className="text-sm font-semibold text-foreground">Admin Menu</span>
              <button className="btn-icon" onClick={() => setMobileSidebarOpen(false)}><X className="size-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto"><SidebarContent isExpanded={true} /></div>
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0 bg-background">
        {/* Mobile header — hamburger + org name + controls */}
        <header className="shell-header lg:hidden">
          <button
            className="btn-icon mr-2"
            onClick={() => setMobileSidebarOpen(true)}
            aria-label="Open admin navigation"
          >
            <Menu className="size-5" />
          </button>
          <div className="flex-1 text-sm font-semibold text-foreground truncate">
            {user?.organization?.name || "Admin Console"}
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
          <Header activeWorkspaceKey="admin" />
        </div>

        {/* Content */}
        <div className={cn("flex-1 overflow-y-auto min-w-0")}>
          <div className={cn("w-full px-4 sm:px-6 lg:px-8 xl:px-10 py-6 lg:py-8 pb-bottom-nav lg:pb-8", maxWidth)}>
            {children}
          </div>
        </div>
      </main>

      {/* Mobile Bottom Nav */}
      <nav className="lg:hidden fixed bottom-0 inset-x-0 z-30 bg-card/98 backdrop-blur-xl border-t border-border flex items-stretch justify-around safe-bottom h-[60px]">
        {visibleNav.slice(0, 5).map((item) => {
          const isBaseRoute = item.to === "/org-admin";
          const isActive = isBaseRoute
            ? (pathname === item.to || pathname === item.to + "/")
            : (pathname === item.to || pathname.startsWith(item.to + "/"));
          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex-1 flex flex-col items-center justify-center gap-1 text-[10px] font-medium transition-colors py-2",
                isActive ? "text-accent-foreground" : "text-muted-foreground"
              )}
            >
              <item.icon className={cn("size-5", isActive ? "text-brand" : "text-muted-foreground")} />
              <span className="truncate max-w-full px-1">{item.label.split(" ")[0]}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
