import React, { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { fetchLearnerDashboard } from "@/lib/courses-api";
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

      {/* Main Grid Skeleton */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2 space-y-6">
          <div className="h-6 w-48 bg-muted rounded-lg"></div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="h-64 bg-card/80 rounded-2xl border border-border"></div>
            <div className="h-64 bg-card/80 rounded-2xl border border-border"></div>
          </div>
        </div>
        <div className="space-y-6">
          <div className="h-72 bg-card/80 rounded-2xl border border-border"></div>
        </div>
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

  // Persistent Right-Hand Utility Panel (Dark Grey Theme)
  const rightUtilityPanel = (
    <div className="p-6 space-y-6 bg-background text-foreground min-h-full">
      {/* AI Assistant Widget */}
      <div className="p-5 rounded-2xl bg-card/90 border border-indigo-500/40 shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-3 opacity-10 group-hover:opacity-20 transition-opacity">
          <Bot className="size-20 text-indigo-400" />
        </div>
        
        <div className="flex items-center gap-2.5 mb-3">
          <div className="size-8 rounded-xl bg-indigo-600 text-foreground grid place-items-center font-bold text-xs shadow-md shadow-indigo-600/30">
            <Sparkles className="size-4 animate-spin-slow" />
          </div>
          <div>
            <h3 className="text-xs font-extrabold text-indigo-200 tracking-wider uppercase">AI Learning Assistant</h3>
            <p className="text-[10px] text-muted-foreground">Contextual Tutor & Assistant</p>
          </div>
        </div>

        <p className="text-xs text-foreground font-medium leading-relaxed mb-4 bg-background/80 p-3 rounded-xl border border-indigo-500/30 shadow-inner">
          "{ai_assistant_prompt?.greeting || 'Need assistance summarizing your current course modules?'}"
        </p>

        <div className="space-y-1.5 mb-4">
          {ai_assistant_prompt?.suggested_prompts?.map((promptText: string, idx: number) => (
            <button
              key={idx}
              onClick={() => navigate({ to: "/ai-assistant" })}
              className="w-full text-left px-3 py-2 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/30 text-[11px] font-semibold text-indigo-300 transition-colors border border-indigo-500/30 flex items-center justify-between group/chip"
            >
              <span className="truncate">{promptText}</span>
              <ChevronRight className="size-3.5 text-indigo-400 group-hover/chip:translate-x-0.5 transition-transform shrink-0" />
            </button>
          ))}
        </div>

        <button
          onClick={() => navigate({ to: "/ai-assistant" })}
          className="w-full py-2.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-foreground font-bold text-xs transition-all shadow-lg shadow-indigo-600/40 flex items-center justify-center gap-2"
        >
          <Bot className="size-4" />
          <span>Ask AI Assistant</span>
        </button>
      </div>

      {/* Live Leaderboard Widget */}
      <div className="p-5 rounded-2xl bg-card/90 border border-border shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Trophy className="size-4 text-amber-400" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-foreground">Organization Leaderboard</h3>
          </div>
        </div>

        {leaderboard.length > 0 ? (
          <div className="space-y-2">
            {leaderboard.map((item: any) => {
              const isUser = item.is_current_user;
              return (
                <div
                  key={item.id}
                  className={`p-3 rounded-xl flex items-center justify-between transition-all ${
                    isUser
                      ? "bg-indigo-600/20 border-2 border-indigo-500/60 shadow-sm"
                      : "bg-background/60 border border-border hover:border-border"
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="size-6 font-extrabold text-xs grid place-items-center shrink-0">
                      {item.rank === 1 ? (
                        <span className="text-amber-400 text-base">🥇</span>
                      ) : item.rank === 2 ? (
                        <span className="text-foreground text-base">🥈</span>
                      ) : item.rank === 3 ? (
                        <span className="text-amber-600 text-base">🥉</span>
                      ) : (
                        <span className="text-muted-foreground text-xs font-bold">#{item.rank}</span>
                      )}
                    </div>

                    <div className="size-8 rounded-xl bg-muted text-indigo-300 grid place-items-center font-extrabold text-xs shrink-0 border border-border">
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
          <div className="p-4 text-center text-xs text-muted-foreground bg-background/40 rounded-xl border border-dashed border-border">
            No leaderboard entries yet.
          </div>
        )}
      </div>

      {/* Badges & Achievements Widget */}
      <div className="p-5 rounded-2xl bg-card/90 border border-border shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Award className="size-4 text-indigo-400" />
            <h3 className="text-xs font-extrabold uppercase tracking-wider text-foreground">Badges & Achievements</h3>
          </div>
          <span className="text-[10px] font-bold text-muted-foreground">
            {achievements.filter((a: any) => a.unlocked).length}/{achievements.length} Unlocked
          </span>
        </div>

        {achievements.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {achievements.map((item: any) => (
              <div
                key={item.id}
                className={`p-3 rounded-xl border flex flex-col justify-between transition-all ${
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
          <div className="p-4 text-center text-xs text-muted-foreground bg-background/40 rounded-xl border border-dashed border-border">
            No achievements earned yet. Complete courses to unlock badges!
          </div>
        )}
      </div>
    </div>
  );

  return (
    <AppShell maxWidth="max-w-[1700px]" rightRail={rightUtilityPanel}>
      <div className="space-y-8 bg-background text-foreground min-h-screen -m-6 lg:-m-8 p-6 lg:p-8">
        
        {/* Top Header / Dark Grey Hero Welcome Banner */}
        <div className="p-5 sm:p-7 rounded-2xl bg-card/90 border border-border/90 shadow-2xl relative overflow-hidden">
          {/* Subtle Background Glow Spheres */}
          <div className="absolute -top-24 -right-24 size-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none"></div>
          <div className="absolute -bottom-24 -left-24 size-96 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none"></div>

          <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
            <div className="space-y-3 max-w-2xl">
              <div className="flex items-center gap-2">
                <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase tracking-widest">
                  {user_profile?.organization_name || "Enterprise Workspace"}
                </span>
                <span className="text-xs text-muted-foreground">•</span>
                <span className="text-xs font-semibold text-muted-foreground">{user_profile?.job_title || "Learner"}</span>
              </div>

              <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground leading-tight">
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
                    className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-sm shadow-xl shadow-emerald-600/20 transition-all hover:scale-[1.02] flex items-center gap-2.5 group"
                  >
                    <Play className="size-4 fill-slate-950 text-slate-950 group-hover:scale-110 transition-transform" />
                    <span>Resume Learning ({resumeCourse.title})</span>
                  </Link>
                ) : (
                  <Link
                    to="/catalog"
                    className="px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-slate-950 font-black text-sm shadow-xl shadow-emerald-600/20 transition-all hover:scale-[1.02] flex items-center gap-2"
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
                  <RefreshCw className={`size-3.5 ${refreshing ? "animate-spin text-emerald-400" : "text-muted-foreground"}`} />
                  <span>{refreshing ? "Refreshing..." : "Sync Progress"}</span>
                </button>
              </div>
            </div>

            {/* Micro-Metrics Grid Chips */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-2 gap-3 shrink-0">
              <div className="p-4 rounded-2xl bg-background/90 border border-border shadow-md space-y-1">
                <div className="flex items-center gap-2 text-amber-400">
                  <Flame className="size-4 fill-amber-400" />
                  <span className="text-[11px] font-extrabold uppercase text-muted-foreground">Streak</span>
                </div>
                <p className="text-xl font-black text-foreground">{metrics?.streak_days || 0} Days</p>
                <p className="text-[10px] text-muted-foreground font-medium">Active Learning</p>
              </div>

              <div className="p-4 rounded-2xl bg-background/90 border border-border shadow-md space-y-1">
                <div className="flex items-center gap-2 text-indigo-400">
                  <Trophy className="size-4 text-indigo-400" />
                  <span className="text-[11px] font-extrabold uppercase text-muted-foreground">Org Rank</span>
                </div>
                <p className="text-xl font-black text-foreground">#{metrics?.rank_in_org || 1}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Position</p>
              </div>

              <div className="p-4 rounded-2xl bg-background/90 border border-border shadow-md space-y-1">
                <div className="flex items-center gap-2 text-amber-400">
                  <Zap className="size-4 fill-amber-400 text-amber-400" />
                  <span className="text-[11px] font-extrabold uppercase text-muted-foreground">Total XP</span>
                </div>
                <p className="text-xl font-black text-foreground">{(metrics?.total_xp || 0).toLocaleString()}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Level {user_profile?.level || 1}</p>
              </div>

              <div className="p-4 rounded-2xl bg-background/90 border border-border shadow-md space-y-1">
                <div className="flex items-center gap-2 text-emerald-400">
                  <CheckCircle2 className="size-4 text-emerald-400" />
                  <span className="text-[11px] font-extrabold uppercase text-muted-foreground">Completed</span>
                </div>
                <p className="text-xl font-black text-foreground">{metrics?.completed_courses || 0}</p>
                <p className="text-[10px] text-muted-foreground font-medium">Certificates Earned</p>
              </div>
            </div>
          </div>
        </div>

        {/* Main Content Area (Center / 2-Column Grid) */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left / Main 2-Column Section */}
          <div className="lg:col-span-2 space-y-8">
            
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {active_courses.map((course: any) => (
                    <div
                      key={course.id}
                      className="p-5 rounded-2xl bg-card/90 border border-border hover:border-emerald-500/40 transition-all duration-300 flex flex-col justify-between group shadow-xl"
                    >
                      <div className="space-y-3">
                        {/* Thumbnail / Header Pill */}
                        <div className="relative h-36 rounded-xl overflow-hidden bg-background border border-border">
                          {course.hero_url ? (
                            <img src={course.hero_url} alt={course.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" />
                          ) : (
                            <div className="w-full h-full bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 grid place-items-center">
                              <BookOpen className="size-12 text-emerald-400/50" />
                            </div>
                          )}
                          <div className="absolute top-3 left-3 flex items-center gap-2">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-background/90 text-emerald-300 border border-emerald-500/40 backdrop-blur-md">
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
                          <p className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">{course.current_module_name}</p>
                          <h3 className="text-sm font-extrabold text-foreground group-hover:text-emerald-300 transition-colors line-clamp-1">
                            {course.title}
                          </h3>
                        </div>
                      </div>

                      {/* Progress Bar & CTA */}
                      <div className="pt-4 space-y-3 border-t border-border mt-4">
                        <div className="space-y-1.5">
                          <div className="flex justify-between text-xs font-bold">
                            <span className="text-muted-foreground">Progress</span>
                            <span className="text-emerald-400">{course.progress_pct}%</span>
                          </div>
                          <div className="h-2 w-full bg-background rounded-full overflow-hidden border border-border">
                            <div
                              className="h-full bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all duration-500"
                              style={{ width: `${course.progress_pct}%` }}
                            ></div>
                          </div>
                        </div>

                        <Link
                          to="/courses/$courseId"
                          params={{ courseId: String(course.id) }}
                          className="w-full py-2.5 rounded-xl bg-muted hover:bg-emerald-600 text-foreground hover:text-slate-950 font-black text-xs transition-all flex items-center justify-center gap-2 group/btn shadow-md"
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

            {/* Weekly Learning Velocity & Goals Tracker (Sleek Dark Grey Card) */}
            <div className="p-6 rounded-2xl bg-card/90 border border-border shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Target className="size-4 text-emerald-400" />
                  <h3 className="text-sm font-extrabold text-foreground">Weekly Velocity & Goals</h3>
                </div>
                <span className="text-xs font-extrabold text-emerald-400 bg-emerald-500/15 px-3 py-1 rounded-full border border-emerald-500/30">
                  {weekly_activity?.completed_this_week || 0}/{weekly_activity?.target_lessons || 5} Lessons Done
                </span>
              </div>

              <div className="grid grid-cols-7 gap-2">
                {weekly_activity?.days?.map((d: any, i: number) => (
                  <div
                    key={i}
                    className={`p-3 rounded-xl text-center space-y-1.5 border transition-all ${
                      d.completed
                        ? "bg-emerald-500/20 border-emerald-500/40 text-emerald-300 font-bold"
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
                      className="p-5 rounded-2xl bg-card/90 border border-border hover:border-emerald-500/40 transition-all space-y-4 flex flex-col justify-between shadow-xl"
                    >
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
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
                          className="text-xs font-extrabold text-emerald-400 hover:text-emerald-300 flex items-center gap-1 shrink-0"
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

          {/* Persistent Right Rail for Desktop (Rendered in main flow on smaller screens) */}
          <div className="xl:hidden lg:block space-y-6">
            {rightUtilityPanel}
          </div>

        </div>
      </div>
    </AppShell>
  );
}
