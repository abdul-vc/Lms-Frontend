import React, { useEffect, useState } from 'react';
import { Link } from '@tanstack/react-router';
import { authFetch, API_BASE } from '@/lib/auth';
import { Users, UserPlus, Activity, BookOpen, Flame, Award, ArrowRight, ShieldCheck, CheckCircle2, Clock, BarChart3, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface OrgStats {
  active_learners: number;
  total_users: number;
  total_departments: number;
  total_courses: number;
  published_courses: number;
  total_sites: number;
  pending_registrations: number;
  avg_assessment_score: number;
  recent_activity: Array<{
    id: number;
    action: string;
    action_display: string;
    actor_name: string;
    target_label: string;
    created_at: string;
  }>;
}

export function ActiveUsersCountWidget() {
  const [stats, setStats] = useState<OrgStats | null>(null);

  useEffect(() => {
    authFetch(`${API_BASE}/organizations/my/stats/`)
      .then(res => res.ok ? res.json() : null)
      .then(setStats)
      .catch(console.error);
  }, []);

  return (
    <div className="bg-card p-6 rounded-2xl shadow-sm border border-border hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="size-10 rounded-xl bg-emerald-50 text-emerald-600 grid place-items-center font-bold">
          <Users className="size-5" />
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-100 text-emerald-800">
          Live Metric
        </span>
      </div>
      <div className="text-3xl font-extrabold text-foreground tracking-tight mb-1">
        {stats ? stats.active_learners : 0}
      </div>
      <div className="text-xs text-muted-foreground font-medium mb-4">
        Active Members (Total Registered: {stats ? stats.total_users : 0})
      </div>
      <Link 
        to="/org-admin/departments" 
        className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors"
      >
        Manage Organization Users <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}

export function PendingRegistrationsWidget() {
  const [stats, setStats] = useState<OrgStats | null>(null);

  useEffect(() => {
    authFetch(`${API_BASE}/organizations/my/stats/`)
      .then(res => res.ok ? res.json() : null)
      .then(setStats)
      .catch(console.error);
  }, []);

  const pendingCount = stats ? stats.pending_registrations : 0;

  return (
    <div className="bg-card p-6 rounded-2xl shadow-sm border border-border hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="size-10 rounded-xl bg-amber-50 text-amber-600 grid place-items-center font-bold">
          <UserPlus className="size-5" />
        </div>
        {pendingCount > 0 ? (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-100 text-amber-800 animate-pulse">
            Action Required
          </span>
        ) : (
          <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-muted text-muted-foreground">
            Up to date
          </span>
        )}
      </div>
      <div className="text-3xl font-extrabold text-foreground tracking-tight mb-1">
        {pendingCount}
      </div>
      <div className="text-xs text-muted-foreground font-medium mb-4">
        Pending Registration / Access Requests
      </div>
      <Link 
        to="/pending-registration" 
        className="inline-flex items-center gap-1.5 text-xs font-bold text-amber-600 hover:text-amber-700 transition-colors"
      >
        Review Access Requests <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}

export function ModuleStatusSummaryWidget() {
  const [stats, setStats] = useState<OrgStats | null>(null);

  useEffect(() => {
    authFetch(`${API_BASE}/organizations/my/stats/`)
      .then(res => res.ok ? res.json() : null)
      .then(setStats)
      .catch(console.error);
  }, []);

  return (
    <div className="bg-card p-6 rounded-2xl shadow-sm border border-border hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="size-10 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center font-bold">
          <BookOpen className="size-5" />
        </div>
        <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-indigo-100 text-indigo-800">
          Content Hub
        </span>
      </div>
      <div className="text-3xl font-extrabold text-foreground tracking-tight mb-1">
        {stats ? stats.total_courses : 0}
      </div>
      <div className="text-xs text-muted-foreground font-medium mb-4">
        Total Courses ({stats ? stats.published_courses : 0} Published · {stats ? stats.total_departments : 0} Depts)
      </div>
      <Link 
        to="/org-admin/courses" 
        className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-700 transition-colors"
      >
        Manage Course Catalog <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}

export function OrgActivitySummaryWidget() {
  const [stats, setStats] = useState<OrgStats | null>(null);

  useEffect(() => {
    authFetch(`${API_BASE}/organizations/my/stats/`)
      .then(res => res.ok ? res.json() : null)
      .then(setStats)
      .catch(console.error);
  }, []);

  const activities = stats?.recent_activity || [];

  return (
    <div className="bg-card p-6 rounded-2xl shadow-sm border border-border col-span-full hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-emerald-50 text-emerald-600 grid place-items-center font-bold">
            <Activity className="size-5" />
          </div>
          <div>
            <h3 className="font-semibold text-foreground text-base">Recent Audit & Activity Log</h3>
            <p className="text-xs text-muted-foreground">Live operational events within your organization.</p>
          </div>
        </div>
        <Link 
          to="/org-admin/activity" 
          className="text-xs font-bold text-emerald-600 hover:text-emerald-700 transition-colors flex items-center gap-1"
        >
          View Full Audit Log <ArrowRight className="size-3.5" />
        </Link>
      </div>

      <div className="space-y-3">
        {activities.length === 0 ? (
          <div className="p-4 text-center text-xs text-muted-foreground border border-dashed border-border rounded-xl">
            No recent activity recorded yet.
          </div>
        ) : (
          activities.map((item) => (
            <div key={item.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-xl border border-border/50 text-xs">
              <div className="flex items-center gap-3">
                <div className="size-7 rounded-full bg-slate-200 text-muted-foreground font-bold grid place-items-center text-[10px]">
                  {item.actor_name[0] || 'A'}
                </div>
                <div>
                  <span className="font-semibold text-foreground">{item.actor_name}</span>{' '}
                  <span className="text-muted-foreground">{item.action_display}</span>{' '}
                  {item.target_label && <span className="font-medium text-emerald-700">({item.target_label})</span>}
                </div>
              </div>
              <div className="text-muted-foreground font-mono text-[11px] shrink-0">
                {new Date(item.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

interface LearnerStats {
  user: {
    id: number;
    full_name: string;
    username: string;
    email: string;
    job_title: string;
    points: number;
    streak_days: number;
    level: number;
  };
  in_progress_course: {
    id: number;
    title: string;
    subtitle: string;
    progress_percent: number;
    status: string;
  } | null;
  total_published_courses: number;
  leaderboard: Array<{
    rank: number;
    id: number;
    name: string;
    job_title: string;
    points: number;
    initials: string;
    is_current_user: boolean;
  }>;
  badges: Array<{
    key: string;
    label: string;
    color: string;
  }>;
}

export function DailyStreakWidget() {
  const [stats, setStats] = useState<LearnerStats | null>(null);

  useEffect(() => {
    authFetch(`${API_BASE}/users/me/learner-stats/`)
      .then(res => res.ok ? res.json() : null)
      .then(setStats)
      .catch(console.error);
  }, []);

  const streakDays = stats?.user?.streak_days || 1;
  const points = stats?.user?.points || 0;
  const level = stats?.user?.level || 1;

  return (
    <div className="bg-gradient-to-br from-amber-500 to-orange-600 p-6 rounded-2xl text-foreground shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <Flame className="size-8 text-amber-200 animate-bounce" />
        <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-card/20 backdrop-blur">
          Level {level} · {points} pts
        </span>
      </div>
      <div className="text-4xl font-black tracking-tight mb-1">{streakDays} Day{streakDays > 1 ? 's' : ''} 🔥</div>
      <p className="text-xs text-amber-100 font-medium">Keep learning daily to unlock bonus achievements & level up!</p>
    </div>
  );
}

export function ContinueLearningWidget() {
  const [stats, setStats] = useState<LearnerStats | null>(null);

  useEffect(() => {
    authFetch(`${API_BASE}/users/me/learner-stats/`)
      .then(res => res.ok ? res.json() : null)
      .then(setStats)
      .catch(console.error);
  }, []);

  const course = stats?.in_progress_course;
  const isCompleted = course?.status === 'completed' || course?.progress_percent === 100;

  return (
    <div className="bg-card p-6 rounded-2xl shadow-sm border border-border hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-3">
        <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
          isCompleted 
            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300' 
            : course ? 'bg-amber-100 text-amber-800 border border-amber-300' : 'bg-muted text-muted-foreground'
        }`}>
          {isCompleted ? '✓ Completed' : course ? `In Progress (${course.progress_percent}%)` : 'Get Started'}
        </span>
        <Clock className="size-4 text-muted-foreground" />
      </div>
      {course ? (
        <>
          <h4 className="font-bold text-foreground text-base mb-1 truncate">{course.title}</h4>
          <p className="text-xs text-muted-foreground mb-4 truncate">{course.subtitle}</p>
          <div className="w-full bg-muted h-2 rounded-full overflow-hidden mb-4">
            <div 
              className={`h-full rounded-full transition-all ${isCompleted ? 'bg-emerald-600' : 'bg-amber-500'}`}
              style={{ width: `${Math.min(Math.max(course.progress_percent, 5), 100)}%` }}
            />
          </div>
          {isCompleted ? (
            <Link 
              to="/certificates" 
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-foreground rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
            >
              View Certificate <Award className="size-3.5" />
            </Link>
          ) : (
            <Link 
              to="/courses/$courseId"
              params={{ courseId: `api-${course.id}` }} 
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-amber-600 text-foreground rounded-xl text-xs font-semibold hover:bg-amber-700 transition-colors shadow-sm"
            >
              Resume Learning ({course.progress_percent}%) <ArrowRight className="size-3.5" />
            </Link>
          )}
        </>
      ) : (
        <>
          <h4 className="font-bold text-foreground text-base mb-1">No Active Courses</h4>
          <p className="text-xs text-muted-foreground mb-4">Browse published courses in your catalog to start your learning path.</p>
          <Link 
            to="/catalog" 
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 text-foreground rounded-xl text-xs font-semibold hover:bg-emerald-700 transition-colors shadow-sm"
          >
            Browse Catalog <ArrowRight className="size-3.5" />
          </Link>
        </>
      )}
    </div>
  );
}

export function BrowseCatalogWidget() {
  const [stats, setStats] = useState<LearnerStats | null>(null);

  useEffect(() => {
    authFetch(`${API_BASE}/users/me/learner-stats/`)
      .then(res => res.ok ? res.json() : null)
      .then(setStats)
      .catch(console.error);
  }, []);

  const totalCourses = stats ? stats.total_published_courses : 0;

  return (
    <div className="bg-card p-6 rounded-2xl shadow-sm border border-border hover:shadow-md transition-shadow">
      <div className="size-10 rounded-xl bg-indigo-50 text-indigo-600 grid place-items-center mb-3">
        <BookOpen className="size-5" />
      </div>
      <h4 className="font-bold text-foreground text-base mb-1">Course Catalog</h4>
      <p className="text-xs text-muted-foreground mb-4">
        {totalCourses > 0 ? `${totalCourses} Published Training Courses Available` : 'Explore newly published training modules and courses.'}
      </p>
      <Link 
        to="/catalog" 
        className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-foreground rounded-xl text-xs font-semibold hover:bg-indigo-700 transition-colors shadow-sm"
      >
        Explore Catalog ({totalCourses}) <ArrowRight className="size-3.5" />
      </Link>
    </div>
  );
}

export function LeaderboardWidget() {
  const [stats, setStats] = useState<LearnerStats | null>(null);

  useEffect(() => {
    authFetch(`${API_BASE}/users/me/learner-stats/`)
      .then(res => res.ok ? res.json() : null)
      .then(setStats)
      .catch(console.error);
  }, []);

  const leaderboard = stats?.leaderboard || [];

  return (
    <div className="bg-card p-6 rounded-2xl shadow-sm border border-border hover:shadow-md transition-shadow">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <BarChart3 className="size-5 text-amber-500" />
          <h4 className="font-bold text-foreground text-sm">Organization Leaderboard</h4>
        </div>
        <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Live Ranking</span>
      </div>

      <div className="space-y-2 text-xs">
        {leaderboard.length === 0 ? (
          <div className="p-3 text-center text-muted-foreground border border-dashed border-border rounded-xl">
            No active learners ranked yet.
          </div>
        ) : (
          leaderboard.map((item) => (
            <div 
              key={item.id} 
              className={cn(
                "flex justify-between items-center p-2.5 rounded-xl transition-colors",
                item.is_current_user ? "bg-emerald-50 border border-emerald-200 font-semibold" : "bg-muted/50 border border-border/50"
              )}
            >
              <div className="flex items-center gap-2.5 truncate">
                <span className="font-extrabold text-muted-foreground text-xs w-4">{item.rank}.</span>
                <div className="size-6 rounded-full bg-slate-200 text-muted-foreground font-bold grid place-items-center text-[10px]">
                  {item.initials || 'U'}
                </div>
                <div className="truncate">
                  <span className="font-semibold text-foreground block truncate">{item.name} {item.rank === 1 ? '🥇' : item.rank === 2 ? '🥈' : item.rank === 3 ? '🥉' : ''}</span>
                  <span className="text-[10px] text-muted-foreground block truncate">{item.job_title}</span>
                </div>
              </div>
              <span className="font-bold text-emerald-700 shrink-0 ml-2">{item.points} pts</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export function BadgesEarnedWidget() {
  const [stats, setStats] = useState<LearnerStats | null>(null);

  useEffect(() => {
    authFetch(`${API_BASE}/users/me/learner-stats/`)
      .then(res => res.ok ? res.json() : null)
      .then(setStats)
      .catch(console.error);
  }, []);

  const badges = stats?.badges || [];

  return (
    <div className="bg-card p-6 rounded-2xl shadow-sm border border-border hover:shadow-md transition-shadow">
      <div className="flex items-center gap-2 mb-4">
        <Award className="size-5 text-purple-600" />
        <h4 className="font-bold text-foreground text-sm">Badges & Achievements</h4>
      </div>
      <div className="flex flex-wrap gap-2">
        {badges.length === 0 ? (
          <span className="px-3 py-1 bg-muted/50 text-muted-foreground rounded-full text-xs font-semibold border border-border/50">
            🚀 Active Learner
          </span>
        ) : (
          badges.map((badge, idx) => (
            <span key={idx} className="px-3 py-1 bg-purple-50 text-purple-700 rounded-full text-xs font-semibold border border-purple-100">
              {badge.label}
            </span>
          ))
        )}
      </div>
    </div>
  );
}

