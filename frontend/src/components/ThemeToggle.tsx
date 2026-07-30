import { Sun, Moon } from 'lucide-react';
import { useTheme } from '@/lib/theme';
import { cn } from '@/lib/utils';

interface ThemeToggleProps {
  className?: string;
}

export function ThemeToggle({ className }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      aria-label={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
      className={cn(
        "relative p-2 rounded-xl border transition-all duration-200 focus:outline-none",
        "bg-muted border-border text-muted-foreground hover:text-foreground hover:bg-muted/80",
        className
      )}
    >
      {theme === 'dark' ? (
        <Sun className="size-4 text-amber-400" />
      ) : (
        <Moon className="size-4 text-slate-600" />
      )}
    </button>
  );
}
