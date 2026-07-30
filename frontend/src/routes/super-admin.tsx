import { createFileRoute, Outlet, Navigate } from '@tanstack/react-router';
import { SuperAdminShell } from '@/components/SuperAdminShell';
import { useAuth } from '@/lib/auth';
import { Loader2 } from 'lucide-react';

export const Route = createFileRoute('/super-admin')({
  component: SuperAdminLayout,
});

function SuperAdminLayout() {
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

  if (!user.is_platform_super_admin) {
    return <Navigate to="/dashboard" />;
  }

  return (
    <SuperAdminShell>
      <Outlet />
    </SuperAdminShell>
  );
}
