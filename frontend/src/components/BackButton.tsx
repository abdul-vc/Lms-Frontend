import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { cn } from "@/lib/utils";

interface BackButtonProps {
  to: string;
  label: string;
  params?: Record<string, any>;
  search?: Record<string, any>;
  className?: string;
}

export function BackButton({ to, label, params, search, className }: BackButtonProps) {
  return (
    <Link
      to={to as any}
      params={params as any}
      search={search as any}
      className={cn(
        "inline-flex items-center text-xs font-bold text-slate-400 hover:text-white transition-colors group mb-4",
        className
      )}
    >
      <ArrowLeft className="size-3.5 mr-1.5 text-slate-400 group-hover:text-emerald-400 group-hover:-translate-x-0.5 transition-all" />
      <span>{label}</span>
    </Link>
  );
}
