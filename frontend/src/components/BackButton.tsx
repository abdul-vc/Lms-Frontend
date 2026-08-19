import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  to?: string;
  fallbackPath?: string;
  label?: string;
  params?: Record<string, any>;
  search?: Record<string, any>;
  className?: string;
}

export function BackButton({ to, fallbackPath, label, params, search, className }: BackButtonProps) {
  const target = to || fallbackPath || "/";
  const displayLabel = label || "Back";
  return (
    <Link
      to={target as any}
      params={params as any}
      search={search as any}
      className={cn(
        "inline-flex items-center text-xs font-bold text-black dark:text-white transition-colors group mb-4",
        className
      )}
    >
      <ArrowLeft className="size-3.5 mr-1.5 text-black dark:text-white group-hover:text-brand group-hover:-translate-x-0.5 transition-all" />
      <span>{displayLabel}</span>
    </Link>
  );
}
