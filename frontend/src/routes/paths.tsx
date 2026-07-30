import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { ArrowRight, Lock } from "lucide-react";
import { fetchLearningPaths } from "@/lib/courses-api";
import { useAuth } from "@/lib/auth";

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

  return (
    <AppShell>
      <div className="space-y-6 max-w-5xl">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground mb-2">Learning Paths</h1>
          <p className="text-sm text-foreground font-medium max-w-[60ch]">
            Multi-course curricula designed by {orgName}.
          </p>
        </div>

        <div className="space-y-6">
          {paths.length === 0 && (
            <div className="p-8 text-center text-muted-foreground bg-card/60 rounded-2xl border border-dashed border-border font-medium">
              <p>No learning paths have been configured for {orgName} yet.</p>
            </div>
          )}
          {paths.map((path: any) => (
            <div key={path.id} className="rounded-2xl border border-border bg-card/90 p-6 shadow-2xl overflow-hidden">
              <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                <div className="max-w-[55ch] space-y-1">
                  <span className="text-[10px] uppercase tracking-widest text-emerald-400 font-extrabold block">
                    Curriculum Path
                  </span>
                  <h2 className="text-xl font-extrabold text-foreground pr-12">{path.title}</h2>
                  <p className="text-xs text-foreground font-medium leading-relaxed">{path.description}</p>
                </div>
              </div>

              <div className="border-t border-border bg-background/80 p-4 rounded-xl">
                <div className="space-y-2">
                  {path.path_courses?.map((pc: any, idx: number) => {
                    const c = pc.course;
                    const isLocked = idx > 0;
                    return (
                      <Link
                        key={c.id}
                        to={isLocked ? "." : "/courses/$courseId"}
                        params={{ courseId: c.id }}
                        className={`flex items-center gap-4 p-3 rounded-xl transition-all ${
                          isLocked
                            ? "opacity-50 cursor-not-allowed border border-transparent"
                            : "bg-card/60 hover:bg-muted border border-border hover:border-emerald-500/40"
                        }`}
                      >
                        <div className="w-8 text-center text-xs font-bold text-muted-foreground">
                          {idx + 1}
                        </div>
                        <div className="size-12 rounded-lg bg-background flex-shrink-0 overflow-hidden border border-border">
                          <img src={c.hero_url || c.hero} alt="" className="size-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="text-sm font-extrabold text-foreground truncate">{c.title}</h4>
                          <p className="text-xs text-muted-foreground font-medium">
                            {c.duration_hrs || c.durationHrs}h · {c.level}
                          </p>
                        </div>
                        <div className="text-muted-foreground pr-2">
                          {isLocked ? <Lock className="size-4 text-muted-foreground" /> : <ArrowRight className="size-4 text-emerald-400" />}
                        </div>
                      </Link>
                    );
                  })}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </AppShell>
  );
}
