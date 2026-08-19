import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ArrowRight, Lock } from "lucide-react";
import { fetchLearningPaths, getCourseHeroUrl, FALLBACK_HERO } from "@/lib/courses-api";
import { useAuth } from "@/lib/auth";
import { useState } from "react";
import { PaginationControls } from "@/components/ui/PaginationControls";

export const Route = createFileRoute("/paths")({
  loader: async () => {
    if (typeof window === "undefined") {
      return { paths: [] };
    }
    let paths: any[] = [];
    try {
      paths = await fetchLearningPaths();
    } catch {
      // ignore
    }
    return { paths };
  },
  head: () => ({ meta: [{ title: "Learning Paths" }] }),
  component: Paths,
});

function Paths() {
  const { paths } = Route.useLoaderData();
  const { user } = useAuth();
  const orgName = user?.organization?.name || "your organization";

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const safePaths = Array.isArray(paths) ? paths : [];
  const paginatedPaths = safePaths.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground mb-2">Learning Paths</h1>
          <p className="text-sm text-foreground font-medium max-w-[60ch]">
            Multi-course curricula designed for {orgName}.
          </p>
        </div>

        <div className="space-y-6">
          {(!safePaths || safePaths.length === 0) && (
            <div className="p-12 text-center text-muted-foreground bg-card/60 rounded-2xl border border-dashed border-border font-medium space-y-2">
              <p className="text-base font-bold text-foreground">No learning paths configured</p>
              <p className="text-xs text-muted-foreground">No custom learning paths have been created for {orgName} yet.</p>
            </div>
          )}
          {paginatedPaths.map((path: any) => {
            const pathCourses = path.path_courses || [];
            const totalCourses = path.total_courses ?? pathCourses.length;
            const durationHrs = path.total_duration_hrs ?? 0;
            const progressPct = path.progress_pct ?? 0;
            const isCompleted = path.is_completed ?? (progressPct === 100);

            return (
              <div key={path.id} className="rounded-2xl border border-border bg-card/90 p-6 shadow-xl overflow-hidden space-y-6">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-[55ch] space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] uppercase tracking-widest text-accent-foreground font-extrabold px-2.5 py-0.5 rounded-full bg-accent border border-brand/20">
                        Curriculum Path
                      </span>
                      <span className="text-xs text-muted-foreground">•</span>
                      <span className="text-xs text-muted-foreground font-medium">{totalCourses} Courses</span>
                      {durationHrs > 0 && (
                        <>
                          <span className="text-xs text-muted-foreground">•</span>
                          <span className="text-xs text-muted-foreground font-medium">~{durationHrs} Hours</span>
                        </>
                      )}
                    </div>
                    <h2 className="text-xl font-extrabold text-foreground">{path.title}</h2>
                    {path.description && (
                      <p className="text-xs text-foreground/80 font-medium leading-relaxed">{path.description}</p>
                    )}
                  </div>

                  {/* Progress Badge / Bar */}
                  <div className="w-full sm:w-48 bg-background/80 p-3 rounded-xl border border-border space-y-1.5 shrink-0">
                    <div className="flex justify-between text-xs font-bold">
                      <span className="text-muted-foreground">Path Progress</span>
                      <span className={isCompleted ? "text-emerald-500 font-extrabold" : "text-brand"}>
                        {progressPct}%
                      </span>
                    </div>
                    <div className="h-2 w-full bg-muted rounded-full overflow-hidden border border-border">
                      <div
                        className="h-full bg-brand rounded-full transition-all duration-500"
                        style={{ width: `${progressPct}%` }}
                      ></div>
                    </div>
                  </div>
                </div>

                <div className="border-t border-border bg-background/60 p-4 rounded-xl space-y-3">
                  <h3 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">Course Sequence</h3>
                  <div className="space-y-2">
                    {pathCourses.map((pc: any, idx: number) => {
                      const c = pc.course || {};
                      const heroUrl = getCourseHeroUrl(c.hero_url || c.hero);
                      const isLocked = idx > 0 && progressPct < ((idx / pathCourses.length) * 100);

                      return (
                        <Link
                          key={c.id || idx}
                          to={isLocked ? "." : "/courses/$courseId"}
                          params={{ courseId: String(c.id) }}
                          className={`flex items-center gap-4 p-3 rounded-xl transition-all ${
                            isLocked
                              ? "opacity-50 cursor-not-allowed border border-transparent"
                              : "bg-card hover:bg-muted border border-border hover:border-brand/40 shadow-sm"
                          }`}
                        >
                          <div className="w-8 text-center text-xs font-bold text-muted-foreground">
                            {idx + 1}
                          </div>
                          <div className="size-12 rounded-lg bg-background flex-shrink-0 overflow-hidden border border-border">
                            <img
                              src={heroUrl}
                              alt=""
                              onError={(e) => { (e.target as HTMLImageElement).src = FALLBACK_HERO; }}
                              className="size-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h4 className="text-sm font-extrabold text-foreground truncate">{c.title}</h4>
                            <p className="text-xs text-muted-foreground font-medium">
                              {c.duration_hrs || c.durationHrs || 1}h · {c.category || c.level || 'Course'}
                            </p>
                          </div>
                          <div className="text-muted-foreground pr-2">
                            {isLocked ? (
                              <Lock className="size-4 text-muted-foreground" />
                            ) : (
                              <ArrowRight className="size-4 text-brand" />
                            )}
                          </div>
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })}

          {safePaths.length > 0 && (
            <PaginationControls
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={safePaths.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          )}
        </div>
      </div>
    </AppShell>
  );
}

