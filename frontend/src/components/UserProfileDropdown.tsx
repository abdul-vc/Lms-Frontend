import { useState, useRef, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuth } from '@/lib/auth';
import { LogOut, User, Settings, KeyRound, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function UserProfileDropdown() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [profileOpen, setProfileOpen] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const rawName = user?.full_name || user?.username || 'User';
  const displayName = rawName.toLowerCase() === 'super admin' ? 'Super Admin' : rawName;
  const email = user?.email || '';
  const initials = user?.avatar_initials || (displayName.slice(0, 2).toUpperCase() || 'SA');
  const profilePicture = user?.profile_picture;
  const isSuperAdmin = user?.is_platform_super_admin;
  const roleName = isSuperAdmin 
    ? 'Super Admin' 
    : (user?.role?.name ?? null);

  const profileRoute = isSuperAdmin ? '/super-admin/profile' : '/profile';
  const settingsRoute = isSuperAdmin ? '/super-admin/settings' : '/settings';

  const handleLogout = () => {
    setProfileOpen(false);
    logout();
    navigate({ to: '/login' });
  };

  // Close profile dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative" ref={profileRef}>
      <button
        id="header-profile-btn"
        onClick={() => setProfileOpen((o) => !o)}
        className="flex items-center gap-2 px-2 py-1.5 rounded-lg hover:bg-muted transition-colors"
        aria-haspopup="true"
        aria-expanded={profileOpen}
      >
        {/* Avatar */}
        {profilePicture ? (
          <img
            src={profilePicture}
            alt={displayName}
            className="size-8 rounded-full object-cover ring-2 ring-border shrink-0"
          />
        ) : (
          <div className="size-8 rounded-full bg-accent border border-accent-foreground/20 grid place-items-center text-accent-foreground text-xs font-bold shrink-0">
            {initials}
          </div>
        )}
        {/* Name + role */}
        <div className="leading-tight text-left hidden md:block">
          <div className="text-xs font-semibold text-foreground truncate max-w-[120px]">
            {displayName}
          </div>
          {roleName && (
            <div className="text-[10px] text-muted-foreground truncate max-w-[120px]">
              {roleName}
            </div>
          )}
        </div>
        <ChevronDown
          className={cn(
            'size-3.5 text-muted-foreground transition-transform hidden sm:block',
            profileOpen && 'rotate-180'
          )}
        />
      </button>

      {profileOpen && (
        <div
          className="absolute right-0 top-full mt-2 w-64 bg-card border border-border rounded-xl z-50 overflow-hidden"
          style={{ boxShadow: 'var(--shadow-overlay)' }}
        >
          {/* User info header */}
          <div className="px-4 py-3 border-b border-border/60">
            <div className="flex items-center gap-3">
              {profilePicture ? (
                <img
                  src={profilePicture}
                  alt={displayName}
                  className="size-10 rounded-full object-cover ring-2 ring-border shrink-0"
                />
              ) : (
                <div className="size-10 rounded-full bg-accent border border-accent-foreground/20 grid place-items-center text-accent-foreground text-sm font-bold shrink-0">
                  {initials}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <div className="text-sm font-semibold text-foreground truncate">
                  {displayName}
                </div>
                <div className="text-xs text-muted-foreground truncate">
                  {email}
                </div>
                {roleName && (
                  <span className="text-[10px] font-semibold text-accent-foreground bg-accent px-2 py-0.5 rounded-full inline-block mt-1">
                    {roleName}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Menu items */}
          <div className="py-1">
            <button
              onClick={() => {
                setProfileOpen(false);
                navigate({ to: profileRoute as any });
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors text-left"
            >
              <User className="size-4 text-muted-foreground" />
              Profile
            </button>
            <button
              onClick={() => {
                setProfileOpen(false);
                navigate({ to: settingsRoute as any });
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors text-left"
            >
              <Settings className="size-4 text-muted-foreground" />
              Account Settings
            </button>
            <button
              onClick={() => {
                setProfileOpen(false);
                navigate({ to: '/reset-password' });
              }}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-foreground hover:bg-muted transition-colors text-left"
            >
              <KeyRound className="size-4 text-muted-foreground" />
              Change Password
            </button>
          </div>

          <div className="border-t border-border/60 py-1">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-destructive hover:bg-destructive/10 transition-colors text-left"
            >
              <LogOut className="size-4" />
              Logout
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
