import { 
  Users, Lock, ToggleLeft, BookOpen, Award, History, PenTool, UserPlus,
  LayoutDashboard, Route, Sparkles, ShieldCheck, GraduationCap, Flame,
  PlayCircle, Trophy, Medal, MessageSquare, User, LucideIcon
} from 'lucide-react';
import React from 'react';

export const ICON_REGISTRY: Record<string, LucideIcon> = {
  Users, Lock, ToggleLeft, BookOpen, Award, History, PenTool, UserPlus,
  LayoutDashboard, Route, Sparkles, ShieldCheck, GraduationCap, Flame,
  PlayCircle, Trophy, Medal, MessageSquare, User,
};

export function resolveIcon(key: string): LucideIcon {
  return ICON_REGISTRY[key] || LayoutDashboard;
}

export function Icon({ icon: IconComponent, className }: { icon: LucideIcon, className?: string }) {
  return React.createElement(IconComponent, { className });
}
