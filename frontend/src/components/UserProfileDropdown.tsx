import { useState, useRef, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuth, normalizeUrl } from '@/lib/auth';
import { LogOut, User, Settings, KeyRound, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

export function UserProfileDropdown() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const rawName = user?.full_name || user?.username || 'User';
  const displayName = rawName.toLowerCase() === 'super admin' ? 'Super Admin' : rawName;
  const initials = user?.avatar_initials || (displayName.slice(0, 2).toUpperCase() || 'U');
  const rawPicture = user?.profile_picture;
  const profilePicture = rawPicture ? normalizeUrl(rawPicture) : null;
  const isSuperAdmin = Boolean(user?.is_platform_super_admin);

  const roleName = isSuperAdmin 
    ? 'Super Admin' 
    : (user?.role?.name ?? null);

  const handleLogout = () => {
    logout();
    navigate({ to: '/login' });
  };

  return (
    <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg border border-border/50 bg-card/60 shadow-2xs">
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
      {/* Direct Logout Button */}
      <button
        id="header-logout-btn"
        onClick={handleLogout}
        className="p-1.5 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors ml-1"
        title="Logout"
        aria-label="Logout"
      >
        <LogOut className="size-4" />
      </button>
    </div>
  );
}
