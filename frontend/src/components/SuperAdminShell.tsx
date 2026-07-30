import { Link, useRouterState, useNavigate } from "@tanstack/react-router";
import {
  LayoutDashboard, Building2, Globe2, CreditCard, Settings,
  BookOpen, LogOut, Search, Users, Activity, Menu, X,
} from "lucide-react";
import type { ReactNode } from "react";
import { useState, useEffect } from "react";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";
import { NotificationDropdown } from "./NotificationDropdown";
import { ThemeToggle } from "./ThemeToggle";

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  group: "overview" | "tenants" | "configuration" | "access" | "billing" | "communications" | "monitoring";
}

const NAV: NavItem[] = [
  { to: "/super-admin/dashboard", label: "Dashboard", icon: LayoutDashboard, group: "overview" },
  { to: "/super-admin/organizations", label: "Organizations", icon: Building2, group: "tenants" },
  { to: "/super-admin/sites", label: "Sites", icon: Globe2, group: "tenants" },
  { to: "/super-admin/feature-registry", label: "Access Control", icon: Settings, group: "configuration" },
  { to: "/super-admin/plans", label: "Plan Catalog", icon: BookOpen, group: "configuration" },
  { to: "/super-admin/settings", label: "Global Settings", icon: Settings, group: "configuration" },
  { to: "/super-admin/billing", label: "Billing & Payments", icon: CreditCard, group: "billing" },
  { to: "/super-admin/activity", label: "Activity Log", icon: Activity, group: "monitoring" },
  { to: "/super-admin/setup-guide", label: "Setup Guide", icon: BookOpen, group: "monitoring" },
  { to: "/super-admin/toolkit", label: "Master Toolkit", icon: BookOpen, group: "monitoring" },
];

const NAV_GROUPS: { key: NavItem["group"]; label: string }[] = [
  { key: "overview", label: "Overview" },
  { key: "tenants", label: "Tenants" },
  { key: "configuration", label: "Configuration" },
  { key: "billing", label: "Billing" },
  { key: "monitoring", label: "Monitoring" },
];

export function SuperAdminShell({ children, maxWidth = "max-w-7xl" }: { children: ReactNode; maxWidth?: string }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState(false);

  const displayName = user?.full_name || user?.username || "Super Admin";
  const initials = user?.avatar_initials || "SA";
  const email = user?.email || "";

  const handleLogout = () => { logout(); navigate({ to: "/login" }); };

  useEffect(() => { setMobileSidebarOpen(false); }, [pathname]);

  const SidebarContent = () => (
    <>
      {/* Brand block */}
      <div className="px-4 py-4 border-b border-border/60 shrink-0">
        <div className="flex items-center gap-3">
          {user?.organization?.logo_url ? (
            <img src={user.organization.logo_url} alt="Logo" className="w-8 h-8 rounded-lg object-contain bg-white shadow-sm ring-1 ring-border p-0.5 shrink-0" />
          ) : (
            <div
              className="size-8 rounded-lg flex items-center justify-center font-bold text-sm text-white shrink-0 shadow-sm"
              style={{ backgroundColor: user?.organization?.primary_color || '#059669' }}
            >
              {(user?.organization?.name || "P")[0]}
            </div>
          )}
          <div className="leading-tight min-w-0">
            <div className="text-sm font-semibold text-foreground truncate">{user?.organization?.name || "Platform"}</div>
            <span className="text-[10px] font-bold text-brand bg-accent px-2 py-0.5 rounded-full inline-block mt-0.5">Master Setup</span>
          </div>
        </div>
      </div>

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto custom-scrollbar px-3 py-3">
        {NAV_GROUPS.map(({ key, label }) => {
          const items = NAV.filter((n) => n.group === key);
          if (items.length === 0) return null;
          return (
            <div key={key}>
              <div className="sidebar-nav-group-label">{label}</div>
              <nav className="space-y-0.5 mb-2">
                {items.map((item) => {
                  const isBaseRoute = item.to === "/super-admin";
                  const isActive = isBaseRoute
                    ? (pathname === item.to || pathname === item.to + "/")
                    : (pathname === item.to || pathname.startsWith(item.to + "/"));
                  return (
                    <Link
                      key={item.to}
                      to={item.to}
                      className={cn(isActive ? 'sidebar-nav-item-active' : 'sidebar-nav-item')}
                    >
                      <item.icon className={cn("size-4 shrink-0", isActive ? "text-accent-foreground" : "text-muted-foreground")} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </nav>
            </div>
          );
        })}
      </div>

      {/* User footer */}
      <div className="px-3 py-3 border-t border-border/60 shrink-0">
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-muted/60 transition-colors text-left"
        >
          <div className="size-8 rounded-full bg-accent border border-accent-foreground/20 flex items-center justify-center text-accent-foreground text-xs font-semibold shrink-0">
            {initials}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-xs font-semibold text-foreground truncate">{displayName}</p>
            <p className="text-[10px] text-muted-foreground truncate">{email}</p>
          </div>
          <LogOut className="size-3.5 text-muted-foreground shrink-0" />
        </button>
      </div>
    </>
  );

  return (
    <div className="min-h-screen bg-background text-foreground flex h-screen overflow-hidden">
      {/* Desktop Sidebar */}
      <aside className="w-60 lg:w-64 shrink-0 bg-sidebar border-r border-sidebar-border hidden lg:flex flex-col z-10">
        <SidebarContent />
      </aside>

      {/* Mobile sidebar overlay */}
      {mobileSidebarOpen && (
        <div className="lg:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-background/80 backdrop-blur-sm" onClick={() => setMobileSidebarOpen(false)} />
          <aside className="relative z-50 w-72 bg-sidebar border-r border-sidebar-border flex flex-col">
            <div className="flex items-center justify-between px-4 py-3 border-b border-border/60">
              <span className="text-sm font-semibold text-foreground">Master Setup</span>
              <button className="btn-icon" onClick={() => setMobileSidebarOpen(false)}><X className="size-4" /></button>
            </div>
            <div className="flex-1 overflow-y-auto"><SidebarContent /></div>
          </aside>
        </div>
      )}

      {/* Main */}
      <main className="flex-1 flex flex-col overflow-hidden min-w-0 bg-background">
        {/* Top Header */}
        <header className="shell-header">
          <button className="btn-icon mr-2 lg:hidden" onClick={() => setMobileSidebarOpen(true)} aria-label="Open navigation">
            <Menu className="size-5" />
          </button>
          <div className="shell-search hidden md:block">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground pointer-events-none" />
            <input type="text" placeholder="Search anything…" className="pl-9" />
          </div>
          <div className="flex-1" />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <NotificationDropdown />
          </div>
        </header>

        {/* Content */}
        <div className="flex-1 overflow-y-auto min-w-0">
          <div className={cn("mx-auto px-4 sm:px-6 lg:px-8 xl:px-10 py-6 lg:py-8", maxWidth)}>
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
