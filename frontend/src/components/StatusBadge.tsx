import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: string;
  className?: string;
}

export function StatusBadge({ status, className }: StatusBadgeProps) {
  const s = (status || '').trim().toLowerCase();

  // Use explicit color values (not theme-reactive) because status badge colors
  // are semantic (green=active, red=suspended, amber=pending) and must be
  // legible in both light and dark mode — they use /bg + /text combos that
  // work in both contexts via Tailwind's opacity modifiers
  let bgClass = "bg-muted text-muted-foreground border-border";
  let dotClass = "bg-muted-foreground";

  if (s === 'active' || s === 'published' || s === 'completed') {
    bgClass = "bg-emerald-500/15 text-emerald-500 border-emerald-500/30";
    dotClass = "bg-emerald-500";
  } else if (s === 'suspended' || s === 'cancelled' || s === 'failed') {
    bgClass = "bg-red-500/15 text-red-500 border-red-500/30";
    dotClass = "bg-red-500";
  } else if (s === 'pending') {
    bgClass = "bg-amber-500/15 text-amber-500 border-amber-500/30";
    dotClass = "bg-amber-500";
  } else if (s === 'inactive' || s === 'disabled') {
    bgClass = "bg-muted text-muted-foreground border-border";
    dotClass = "bg-muted-foreground";
  }

  // Capitalize first letter for display
  const displayStatus = status ? status.charAt(0).toUpperCase() + status.slice(1) : 'Unknown';

  return (
    <span className={cn(
      "px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 w-max border",
      bgClass,
      className
    )}>
      <span className={cn("size-1.5 rounded-full", dotClass)} />
      {displayStatus}
    </span>
  );
}
