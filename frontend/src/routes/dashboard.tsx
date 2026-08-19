import React, { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { fetchLearnerDashboard, getCourseHeroUrl, FALLBACK_HERO } from "@/lib/courses-api";
import { useAuth } from "@/lib/auth";
import { 
  Flame, Trophy, Zap, BookOpen, Play, ArrowRight, Sparkles, CheckCircle2, 
  Award, Target, Bot, ChevronRight, Compass, Lock, RefreshCw
} from "lucide-react";

export const Route = createFileRoute("/dashboard")({
  head: () => ({ meta: [{ title: "Learner Console Dashboard — Halyard Learn" }] }),
  component: Dashboard,
});

function DashboardSkeleton() {
  return (
    <div className="space-y-8 animate-pulse">
      {/* Top Banner Skeleton */}
      <div className="p-8 rounded-3xl bg-card/80 border border-border h-48 flex flex-col justify-between shadow-xl">
        <div className="space-y-3">
          <div className="h-4 w-32 bg-muted rounded-full"></div>
          <div className="h-8 w-72 bg-muted rounded-xl"></div>
          <div className="h-4 w-96 bg-muted/60 rounded-lg"></div>
        </div>
        <div className="flex gap-4">
          <div className="h-10 w-40 bg-emerald-600/30 rounded-xl"></div>
          <div className="h-10 w-32 bg-muted rounded-xl"></div>
        </div>
      </div>

      {/* Main Content Skeleton */}
      <div className="space-y-6">
        <div className="h-6 w-48 bg-muted rounded-lg"></div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="h-64 bg-card/80 rounded-2xl border border-border"></div>
          <div className="h-64 bg-card/80 rounded-2xl border border-border"></div>
          <div className="h-64 bg-card/80 rounded-2xl border border-border"></div>
        </div>
        <div className="h-48 bg-card/80 rounded-2xl border border-border"></div>
      </div>
    </div>
  );
}

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [dashboardData, setDashboardData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = async (isManualRefresh = false) => {
    if (isManualRefresh) setRefreshing(true);
    try {
      const data = await fetchLearnerDashboard();
      setDashboardData(data);
    } catch (err) {
      console.error("Error loading learner dashboard data:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  if (loading || !dashboardData) {
    return (
      <AppShell maxWidth="max-w-[1700px]">
        <DashboardSkeleton />
      </AppShell>
    );
  }

  const {
    user_profile,
    contextual_header,
    metrics,
    active_courses = [],
    recommended_paths = [],
    weekly_activity,
    ai_assistant_prompt,
    leaderboard = [],
    achievements = []
  } = dashboardData;

  const resumeCourse = contextual_header?.resume_course;

  return (
    <AppShell maxWidth="max-w-[1700px]">
      <div className="space-y-6 sm:space-y-8 bg-background text-foreground">
        
        {/* Top Header / Dark Grey Hero Welcome Banner */}
        <div className="p-5 sm:p-7 rounded-2xl bg-card/90 border border-border/90 shadow-2xl relative overflow-hidden">
          {/* Subtle Background Glow Spheres */}
          <div className="absolute -top-24 -right-24 size-96 bg-brand/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 size-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-accent text-accent-foreground border border-brand/20 uppercase tracking-widest">
                  {user_profile?.organization_name || "Enterprise Workspace"}
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs font-semibold text-muted-foreground">{user_profile?.job_title || "Learner"}</span>
              </div>

              <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-foreground leading-tight">
                {contextual_header?.greeting || `Welcome back, ${user_profile?.first_name}`} 👋
              </h1>

              <p className="text-sm text-foreground font-medium leading-relaxed text-pretty">
                {contextual_header?.subtitle || "Continue your structured learning journey and maintain your daily velocity."}
              </p>

              {/* Dynamic Action Buttons */}
              <div className="pt-3 flex items-center gap-4 flex-wrap">
                {resumeCourse ? (
                  <Link
                    to="/courses/$courseId"
                    params={{ courseId: String(resumeCourse.id) }}
                    className="px-4 sm:px-6 py-3 rounded-2xl bg-brand hover:opacity-90 text-brand-foreground font-black text-sm shadow-sm transition-opacity flex items-center gap-2.5 group max-w-xs sm:max-w-none"
                  >
                    <Play className="size-4 fill-current text-brand-foreground group-hover:scale-110 transition-transform shrink-0" />
                    <span className="truncate">Resume: {resumeCourse.title}</span>
                  </Link>
                ) : (
                  <Link
                    to="/catalog"
                    className="px-6 py-3 rounded-2xl bg-brand hover:opacity-90 text-brand-foreground font-black text-sm shadow-sm transition-opacity flex items-center gap-2"
                  >
                    <Compass className="size-4" />
                    <span>Explore Course Catalog</span>
                  </Link>
                )}

                <button
                  onClick={() => loadData(true)}
                  disabled={refreshing}
                  className="px-4 py-3 rounded-2xl bg-muted hover:bg-muted text-foreground font-semibold text-xs transition-all border border-border flex items-center gap-2"
                  title="Refresh Dashboard Data"
                >
                  <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin text-brand" : "text-muted-foreground"}`} />
                  <span>{refreshing ? "Refreshing..." : "Sync Progress"}</span>
                </button>
              </div>
            </div>

            {/* Micro-Metrics Grid Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 shrink-0">
              <div className="p-3 sm:p-4 rounded-2xl bg-background/90 border border-border shadow-md space-y-1">
                <div className="flex items-center gap-2 text-amber-400">
                  <Flame className="size-4 fill-amber-400" />
                  <span className="text-[10px] sm:text-[11px] font-extrabold uppercase text-muted-foreground">Streak</span>
                </div>
                <p className="text-lg sm:text-xl font-black text-foreground">{metrics?.streak_days || 0} Days</p>
                <p className="text-[10px] text-muted-foreground font-medium hidden sm:block">Active Learning</p>
              </div>

              <div className="p-3 sm:p-4 rounded-2xl bg-background/90 border border-border shadow-md space-y-1">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Trophy className="size-4 text-indigo-400" />
                  <span className="text-[10px] sm:text-[11px] font-extrabold uppercase text-muted-foreground">Org Rank</span>
                </div>
                <p className="text-lg sm:text-xl font-black text-foreground">#{metrics?.rank_in_org || 1}</p>
                <p className="text-[10px] text-muted-foreground font-medium hidden sm:block">Position</p>
              </div>

              <div className="p-3 sm:p-4 rounded-2xl bg-background/90 border border-border shadow-md space-y-1">
                <div className="flex items-center gap-2 text-amber-400">
                  <Zap className="size-4 fill-amber-400 text-amber-400" />
                  <span className="text-[10px] sm:text-[11px] font-extrabold uppercase text-muted-foreground">Total XP</span>
                </div>
                <p className="text-lg sm:text-xl font-black text-foreground">{(metrics?.total_xp || 0).toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground font-medium hidden sm:block">Level {user_profile?.level || 1}</p>
              </div>

              <div className="p-3 sm:p-4 rounded-2xl bg-background/90 border border-border shadow-md space-y-1">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  <span className="text-[10px] sm:text-[11px] font-extrabold uppercase text-muted-foreground">Done</span>
                </div>
                <p className="text-lg sm:text-xl font-black text-foreground">{metrics?.completed_courses || 0}</p>
                <p className="text-[10px] text-muted-foreground font-medium hidden sm:block">Certificates Earned</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Stack (Full Width Center Area) */}
        <div className="space-y-8 w-full">
          
          {/* Active Courses / Continue Learning Section */}
          <div className="space-y-4">
            <div className="section-header">
              <div>
                <h2 className="section-title text-lg">Continue Learning</h2>
                <p className="text-caption">Pick up right where you left off</p>
              </div>
              <Link to="/catalog" className="flex items-center gap-1 text-xs font-semibold text-brand hover:opacity-80 transition-opacity">
                <span>View All</span>
                <ArrowRight className="size-3.5" />
              </Link>
            </div>

            {active_courses.length > 0 ? (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {active_courses.map((course: any) => (
                  <div
                    key={course.id}
                    className="p-5 rounded-2xl bg-card/90 border border-border hover:border-brand/40 transition-all duration-300 flex flex-col justify-between group shadow-xl"
                  >
                    <div className="space-y-3">
                      {/* Thumbnail / Header Pill */}
                      <div className="relative h-36 rounded-xl overflow-hidden bg-background border border-border">
                        <img
                          src={getCourseHeroUrl(course.hero_url)}
                          alt={course.title}
                          onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_HERO; }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                        <div className="absolute top-3 left-3 flex items-center gap-2">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-background/90 text-brand border border-brand/40 backdrop-blur-md">
                            {course.category}
                          </span>
                          {course.is_scorm && (
                            <span className="px-2 py-0.5 rounded-full text-[9px] font-bold bg-amber-500/30 text-amber-200 border border-amber-500/40 backdrop-blur-md">
                              SCORM
                            </span>
                          )}
                        </div>
                      </div>

                      <div>
                        <p className="text-[11px] font-bold text-brand uppercase tracking-wider">{course.current_module_name}</p>
                        <h3 className="text-sm font-extrabold text-foreground group-hover:text-brand transition-colors line-clamp-1">
                          {course.title}
                        </h3>
                      </div>
                    </div>

                    {/* Progress Bar & CTA */}
                    <div className="pt-4 space-y-3 border-t border-border mt-4">
                      <div className="space-y-1.5">
                        <div className="flex justify-between text-xs font-bold">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="text-brand">{course.progress_pct}%</span>
                        </div>
                        <div className="h-2 w-full bg-background rounded-full overflow-hidden border border-border">
                          <div
                            className="h-full bg-brand rounded-full transition-all duration-500"
                            style={{ width: `${course.progress_pct}%` }}
                          ></div>
                        </div>
                      </div>

                      <Link
                        to="/courses/$courseId"
                        params={{ courseId: String(course.id) }}
                        className="w-full py-2.5 rounded-xl bg-muted hover:bg-brand text-foreground hover:text-brand-foreground font-black text-xs transition-all flex items-center justify-center gap-2 group/btn shadow-md"
                      >
                        <span>{course.progress_pct > 0 ? "Resume Course" : "Start Course"}</span>
                        <ArrowRight className="size-3.5 group-hover/btn:translate-x-1 transition-transform" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-8 text-center bg-card/60 rounded-2xl border border-dashed border-border text-muted-foreground">
                No active courses found. Explore the catalog to start learning!
              </div>
            )}
          </div>

          {/* Weekly Learning Velocity & Goals Tracker */}
          <div className="p-6 rounded-2xl bg-card/90 border border-border shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Target className="size-4 text-brand" />
                <h3 className="text-sm font-extrabold text-foreground">Weekly Velocity & Goals</h3>
              </div>
              <span className="text-xs font-extrabold text-brand bg-accent px-3 py-1 rounded-full border border-brand/20">
                {weekly_activity?.completed_this_week || 0}/{weekly_activity?.target_lessons || 5} Lessons Done
              </span>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {weekly_activity?.days?.map((d: any, i: number) => (
                <div
                  key={i}
                  className={`p-3 rounded-xl text-center space-y-1.5 border transition-all ${
                    d.completed
                      ? "bg-brand/20 border-brand/40 text-brand font-bold"
                      : "bg-background/60 border-border text-muted-foreground"
                  }`}
                >
                  <p className="text-[10px] font-extrabold uppercase">{d.day}</p>
                  <div className="grid place-items-center">
                    {d.completed ? (
                      <CheckCircle2 className="size-4 text-emerald-400" />
                    ) : (
                      <div className="size-4 rounded-full border-2 border-border"></div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Card 1: AI Learning Assistant (Standalone Center Section) */}
          <div className="p-6 rounded-2xl bg-card/90 border border-indigo-500/40 shadow-xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
              <Bot className="size-28 text-indigo-400" />
            </div>
            
            <div className="flex items-center gap-3 mb-4">
              <div className="size-9 rounded-xl bg-indigo-600 text-foreground grid place-items-center font-bold text-sm shadow-md shadow-indigo-600/30">
                <Sparkles className="size-5 animate-spin-slow" />
              </div>
              <div>
                <h3 className="text-xs font-extrabold text-indigo-300 tracking-wider uppercase">AI Learning Assistant</h3>
                <p className="text-[10px] text-muted-foreground">Contextual Tutor & Study Companion</p>
              </div>
            </div>

            <p className="text-sm text-foreground font-medium leading-relaxed mb-4 bg-background/80 p-4 rounded-xl border border-indigo-500/30 shadow-inner">
              "{ai_assistant_prompt?.greeting || 'Need assistance summarizing your current course modules?'}"
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5 mb-4">
              {ai_assistant_prompt?.suggested_prompts?.map((promptText: string, idx: number) => (
                <button
                  key={idx}
                  onClick={() => navigate({ to: "/ai-assistant" })}
                  className="w-full text-left px-3.5 py-2.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/30 text-xs font-semibold text-indigo-300 transition-colors border border-indigo-500/30 flex items-center justify-between group/chip"
                >
                  <span className="truncate">{promptText}</span>
                  <ChevronRight className="size-4 text-indigo-400 group-hover/chip:translate-x-0.5 transition-transform shrink-0" />
                </button>
              ))}
            </div>

            <button
              onClick={() => navigate({ to: "/ai-assistant" })}
              className="w-full sm:w-auto px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-foreground font-bold text-xs transition-all shadow-lg shadow-indigo-600/40 flex items-center justify-center gap-2"
            >
              <Bot className="size-4" />
              <span>Ask AI Assistant</span>
            </button>
          </div>

          {/* Card 2: Organization Leaderboard (Standalone Center Section) */}
          <div className="p-6 rounded-2xl bg-card/90 border border-border shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-amber-500/15 text-amber-400 grid place-items-center font-bold text-sm border border-amber-500/30">
                  <Trophy className="size-5" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-foreground">Organization Leaderboard</h3>
                  <p className="text-[10px] text-muted-foreground">Top learners across your organization</p>
                </div>
              </div>
            </div>

            {leaderboard.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                {leaderboard.map((item: any) => {
                  const isUser = item.is_current_user;
                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-xl flex items-center justify-between transition-all ${
                        isUser
                          ? "bg-indigo-600/20 border-2 border-indigo-500/60 shadow-sm"
                          : "bg-background/60 border border-border hover:border-border"
                      }`}
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="size-7 font-extrabold text-sm grid place-items-center shrink-0">
                          {item.rank === 1 ? (
                            <span className="text-amber-400 text-lg">🥇</span>
                          ) : item.rank === 2 ? (
                            <span className="text-foreground text-lg">🥈</span>
                          ) : item.rank === 3 ? (
                            <span className="text-amber-600 text-lg">🥉</span>
                          ) : (
                            <span className="text-muted-foreground text-xs font-bold">#{item.rank}</span>
                          )}
                        </div>

                        <div className="size-9 rounded-xl bg-muted text-indigo-300 grid place-items-center font-extrabold text-xs shrink-0 border border-border">
                          {item.initials}
                        </div>

                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <p className="text-xs font-bold text-foreground truncate">{item.name}</p>
                            {isUser && (
                              <span className="px-1.5 py-0.2 text-[9px] font-extrabold bg-indigo-500 text-foreground rounded">You</span>
                            )}
                          </div>
                          <p className="text-[10px] text-muted-foreground truncate">{item.job_title}</p>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-xs font-bold text-amber-400 flex items-center justify-end gap-1">
                          <Zap className="size-3.5 fill-amber-400 text-amber-400" />
                          <span>{(item.points || 0).toLocaleString()} XP</span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground bg-background/40 rounded-xl border border-dashed border-border">
                No leaderboard entries yet.
              </div>
            )}
          </div>

          {/* Card 3: Badges & Achievements (Standalone Center Section) */}
          <div className="p-6 rounded-2xl bg-card/90 border border-border shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="size-9 rounded-xl bg-indigo-500/15 text-indigo-400 grid place-items-center font-bold text-sm border border-indigo-500/30">
                  <Award className="size-5" />
                </div>
                <div>
                  <h3 className="text-xs font-extrabold uppercase tracking-wider text-foreground">Badges & Achievements</h3>
                  <p className="text-[10px] text-muted-foreground">Milestones unlocked during your learning</p>
                </div>
              </div>
              <span className="text-xs font-bold text-brand bg-accent px-3 py-1 rounded-full border border-brand/20">
                {achievements.filter((a: any) => a.unlocked).length}/{achievements.length} Unlocked
              </span>
            </div>

            {achievements.length > 0 ? (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {achievements.map((item: any) => (
                  <div
                    key={item.id}
                    className={`p-3.5 rounded-xl border flex flex-col justify-between transition-all ${
                      item.unlocked
                        ? "bg-background/80 border-border hover:border-indigo-500/50 shadow-sm"
                        : "bg-background/30 border-border/40 opacity-50"
                    }`}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-2xl">{item.icon}</span>
                      {item.unlocked ? (
                        <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">Earned</span>
                      ) : (
                        <Lock className="size-3 text-muted-foreground" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs font-bold text-foreground truncate">{item.title}</p>
                      <p className="text-[10px] text-muted-foreground line-clamp-1">{item.description}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-6 text-center text-xs text-muted-foreground bg-background/40 rounded-xl border border-dashed border-border">
                No achievements earned yet. Complete courses to unlock badges!
              </div>
            )}
          </div>

          {/* Recommended Learning Paths (Rendered ONLY if admin created learning paths in DB) */}
          {recommended_paths.length > 0 && (
            <div className="space-y-4">
              <div>
                <h2 className="text-xl font-black tracking-tight text-foreground">Recommended Learning Paths</h2>
                <p className="text-xs text-muted-foreground font-medium">Tenant-curated specialization tracks for your career level</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {recommended_paths.map((path: any) => (
                  <div
                    key={path.id}
                    className="p-5 rounded-2xl bg-card/90 border border-border hover:border-brand/40 transition-all space-y-4 flex flex-col justify-between shadow-xl"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-accent text-accent-foreground border border-brand/20">
                          {path.course_count} Courses
                        </span>
                        <span className="text-xs text-muted-foreground">•</span>
                        <span className="text-xs text-muted-foreground font-medium">{path.estimated_hrs} Hours</span>
                      </div>
                      <h3 className="text-sm font-extrabold text-foreground">{path.title}</h3>
                      <p className="text-xs text-muted-foreground font-medium leading-relaxed">{path.description}</p>
                    </div>

                    <div className="pt-3 border-t border-border flex items-center justify-between">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {path.skills?.slice(0, 3).map((skill: string, sIdx: number) => (
                          <span key={sIdx} className="text-[9px] font-bold text-muted-foreground bg-muted px-2 py-0.5 rounded">
                            {skill}
                          </span>
                        ))}
                      </div>

                      <Link
                        to="/paths"
                        className="text-xs font-extrabold text-brand hover:opacity-80 flex items-center gap-1 shrink-0 transition-opacity"
                      >
                        <span>Explore</span>
                        <ArrowRight className="size-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>
      </div>
    </AppShell>
  );
}
