import { createFileRoute, Outlet, Navigate } from '@tanstack/react-router';
import { AppShell } from '@/components/AppShell';
import { useAuth } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

export const Route = createFileRoute('/org-admin')({
  component: OrgAdminLayout,
});

function OrgAdminLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  // Super Admins MUST never enter Org Admin routes — they have their own console.
  // This guard closes the tenant-isolation breach.
  if (user.is_platform_super_admin) {
    return <Navigate to="/super-admin/dashboard" />;
  }

  // Must have a real organization association (not a platform-level account)
  if (!user.organization) {
    return <Navigate to="/login" />;
  }

  // Must have at least one admin/manage permission via their role
  const isOrgAdmin =
    user.role &&
    Object.keys(user.role).some(
      (k) => k.startsWith('can_') && (user.role as any)[k] === true
    );

  if (!isOrgAdmin) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <AppShell>
      <Outlet />
    </AppShell>
  );
}

