import { createFileRoute } from '@tanstack/react-router';
import { useAuth } from '@/lib/auth';
import { ShieldCheck, Mail, User, Key, CheckCircle2 } from 'lucide-react';

export const Route = createFileRoute('/super-admin/profile')({
  component: SuperAdminProfilePage,
});

function SuperAdminProfilePage() {
  const { user } = useAuth();

  // Format display name with proper Title Casing
  const rawName = user?.full_name || (user?.first_name ? `${user.first_name} ${user.last_name || ''}`.trim() : user?.username || 'Super Admin');
  const displayName = rawName.toLowerCase() === 'super admin' ? 'Super Admin' : rawName;
  const username = user?.username || 'superadmin';
  const email = user?.email || 'superadmin@platform.com';
  const initials = user?.avatar_initials || (displayName.split(' ').map(n => n[0]).join('').toUpperCase() || 'SA');
  
  // Format dates dynamically if available
  const dateJoinedFormatted = (user as any)?.date_joined 
    ? new Date((user as any).date_joined).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : (user as any)?.created_at
    ? new Date((user as any).created_at).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })
    : 'System Master Account';

  const lastLoginFormatted = (user as any)?.last_login
    ? new Date((user as any).last_login).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })
    : 'Current Active Session';

  const permissionsList = [
    'Full System Access (*)',
    'Organization & Tenant Provisioning',
    'Multi-Site Subdomain Management',
    'Global Feature Access & Registry Control',
    'Plan Catalog & Subscription Management',
    'Platform Security & Global Audit Logging',
    'Master Setup Toolkit & System Operations'
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-foreground">Super Admin Profile</h1>
        <p className="text-sm text-muted-foreground mt-1">Platform Administrator account metadata and global system privileges.</p>
      </div>

      {/* Profile Card Header */}
      <div className="rounded-3xl border border-border bg-card/90 p-6 sm:p-8 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6 relative z-10">
          <div className="size-24 rounded-2xl bg-gradient-to-br from-emerald-500/20 to-teal-500/10 border border-emerald-500/30 grid place-items-center text-3xl font-black text-emerald-400 shadow-inner shrink-0">
            {initials}
          </div>

          <div className="flex-1 text-center sm:text-left space-y-2">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <h2 className="text-2xl font-bold text-foreground tracking-tight">{displayName}</h2>
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
                <ShieldCheck className="size-3.5" /> Platform Super Admin
              </span>
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/20">
                <CheckCircle2 className="size-3" /> Active
              </span>
            </div>

            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-muted-foreground pt-1">
              <span className="flex items-center gap-1.5"><User className="size-3.5 text-emerald-400" /> @{username}</span>
              <span className="flex items-center gap-1.5"><Mail className="size-3.5 text-emerald-400" /> {email}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Account Details & Platform Metadata Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Information Card */}
        <div className="rounded-2xl border border-border bg-card/90 p-6 space-y-4 shadow-xl">
          <div className="flex items-center gap-2 border-b border-border/60 pb-3">
            <User className="size-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-foreground">Account & System Details</h3>
          </div>

          <div className="space-y-3 text-xs">
            <div className="flex justify-between py-2 border-b border-border/40">
              <span className="text-muted-foreground font-medium">Username</span>
              <span className="font-bold font-mono text-foreground">{username}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-border/40">
              <span className="text-muted-foreground font-medium">Email Address</span>
              <span className="font-semibold text-foreground">{email}</span>
            </div>

            <div className="flex justify-between py-2 border-b border-border/40">
              <span className="text-muted-foreground font-medium">Platform Scope</span>
              <span className="font-bold text-emerald-400">Master Setup (Global)</span>
            </div>

            <div className="flex justify-between py-2 border-b border-border/40">
              <span className="text-muted-foreground font-medium">Account Status</span>
              <span className="font-semibold text-emerald-400">Active / Operational</span>
            </div>

            <div className="flex justify-between py-2 border-b border-border/40">
              <span className="text-muted-foreground font-medium">Last Login</span>
              <span className="font-mono text-foreground">{lastLoginFormatted}</span>
            </div>

            <div className="flex justify-between py-2">
              <span className="text-muted-foreground font-medium">Account Created</span>
              <span className="font-mono text-foreground">{dateJoinedFormatted}</span>
            </div>
          </div>
        </div>

        {/* Assigned Global Privileges Card */}
        <div className="rounded-2xl border border-border bg-card/90 p-6 space-y-4 shadow-xl">
          <div className="flex items-center justify-between border-b border-border/60 pb-3">
            <div className="flex items-center gap-2">
              <Key className="size-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-foreground">Assigned Global Privileges</h3>
            </div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">Read-Only</span>
          </div>

          <p className="text-xs text-muted-foreground">
            As a Platform Super Admin, your account possesses unrestricted administrative authority across all system modules.
          </p>

          <div className="space-y-2 pt-1">
            {permissionsList.map((perm, idx) => (
              <div key={idx} className="flex items-center gap-2 p-2 rounded-xl bg-background/60 border border-border/50 text-xs font-semibold text-foreground">
                <ShieldCheck className="size-3.5 text-emerald-400 shrink-0" />
                <span>{perm}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
