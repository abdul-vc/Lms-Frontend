import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { type Module, type Lesson } from "@/lib/mock";
import { adaptApiCourse, fetchCourse } from "@/lib/courses-api";
import { ChevronLeft, ChevronRight, CheckCircle2, Sparkles, Video, X } from "lucide-react";
import { useState, useCallback, useEffect } from "react";
import { BackButton } from "@/components/BackButton";
import { markLessonComplete, setLastActive, useCourseProgress } from "@/lib/progress";
import { RestrictedVideoPlayer } from "@/components/RestrictedVideoPlayer";
import { PolymorphicLessonRenderer } from "@/components/PolymorphicLessonRenderer";

export const Route = createFileRoute("/courses/$courseId/play/$lessonId")({
  loader: async ({ params }) => {
    if (typeof window === "undefined") {
      return { course: null as any, module: null as any, lesson: null as any };
    }
    const apiId = parseInt(params.courseId.replace("api-", ""), 10);
    if (!isNaN(apiId)) {
      const data = await fetchCourse(apiId);
      if (data) {
        const course = adaptApiCourse(data);
        for (const mod of course.modules) {
          const lesson = mod.lessons.find((l: { id: string }) => l.id === params.lessonId);
          if (lesson) return { course, module: mod, lesson };
        }
      }
    }
    throw notFound();
  },
  component: Player,
});

function Player() {
  const loaderData = Route.useLoaderData();
  const course = loaderData?.course;
  const module = loaderData?.module;
  const lesson = loaderData?.lesson;

  const params = Route.useParams();
  const navigate = useNavigate();
  const [videoComplete, setVideoComplete] = useState(false);
  const { isLessonComplete, refresh: refreshProgress } = useCourseProgress(course?.id || "");
  const [, force] = useState(0);

  useEffect(() => {
    if (course?.id && lesson?.id) {
      setLastActive(course.id, lesson.id);
    }
  }, [course?.id, lesson?.id]);

  const complete = useCallback(async () => {
    if (!course?.id || !lesson?.id) return;
    await markLessonComplete(course.id, lesson.id);
    refreshProgress();
    force((x) => x + 1);
  }, [course?.id, lesson?.id, refreshProgress]);

  const handleVideoComplete = useCallback(() => {
    setVideoComplete(true);
    complete();
  }, [complete]);

  const allLessons = course?.modules?.flatMap((m: Module) =>
    m.locked ? [] : m.lessons.map((l: Lesson) => ({ ...l, moduleId: m.id }))
  ) || [];
  const currIdx = allLessons.findIndex((l: Lesson) => l.id === lesson?.id);
  const prev = currIdx > 0 ? allLessons[currIdx - 1] : null;
  const next = currIdx < allLessons.length - 1 ? allLessons[currIdx + 1] : null;
  const done = lesson?.id ? isLessonComplete(lesson.id) : false;

  const isVideoLesson = lesson?.type === "video";
  const canProceed = isVideoLesson ? (videoComplete || done) : true;

  const goNext = useCallback(() => {
    complete();
    if (next && course?.id) {
      navigate({
        to: "/courses/$courseId/play/$lessonId",
        params: { courseId: course.id, lessonId: next.id },
      });
    } else if (course?.id) {
      navigate({ to: "/courses/$courseId/assessment", params: { courseId: course.id } });
    }
  }, [complete, next, navigate, course?.id]);

  if (!course || !lesson) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-8">
        <div className="size-10 rounded-full border-4 border-emerald-500/20 border-t-emerald-500 animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <div className="flex h-screen overflow-hidden">

        {/* ── Lesson Sidebar ── */}
        <aside className="w-80 shrink-0 bg-card/90 border-r border-border/90 flex flex-col overflow-y-auto shadow-2xl">
          <div className="p-6 border-b border-border bg-background/60">
            <Link
              to="/courses/$courseId"
              params={{ courseId: course.id }}
              className="inline-flex items-center text-xs font-extrabold text-foreground hover:text-emerald-400 transition-colors group mb-3"
            >
              <ChevronLeft className="size-4 mr-1 text-foreground group-hover:text-emerald-400 group-hover:-translate-x-0.5 transition-all" />
              <span>Back to Course Overview</span>
            </Link>
            <h2 className="text-base font-black leading-snug tracking-tight text-foreground">{course.title}</h2>
          </div>

          <div className="divide-y divide-border/60">
            {course.modules.map((m: Module) => (
              <div key={m.id} className="p-5">
                <p className="text-xs font-black uppercase tracking-widest text-emerald-400 mb-3">
                  {m.title}
                </p>
                <ul className="space-y-1.5">
                  {m.locked ? (
                    <li className="text-xs text-muted-foreground italic px-3 py-1.5 bg-background/40 rounded-xl border border-border">Locked — Phase 2</li>
                  ) : (
                    m.lessons.map((l: Lesson) => {
                      const active = l.id === lesson.id;
                      const isDone = isLessonComplete(l.id);
                      return (
                        <li key={l.id}>
                          <Link
                            to="/courses/$courseId/play/$lessonId"
                            params={{ courseId: course.id, lessonId: l.id }}
                            className={`flex items-center gap-3 px-3.5 py-3 rounded-xl text-xs font-bold transition-all ${
                              active
                                ? "bg-emerald-600 text-slate-950 shadow-lg shadow-emerald-600/20 font-black"
                                : "text-foreground hover:bg-muted/80 hover:text-foreground"
                            }`}
                          >
                            {l.type === "video" ? (
                              <Video className={`size-4 shrink-0 ${isDone ? "text-emerald-400" : active ? "text-slate-950" : "text-muted-foreground"}`} />
                            ) : (
                              <CheckCircle2 className={`size-4 shrink-0 ${isDone ? "text-emerald-400" : active ? "text-slate-950" : "text-muted-foreground"}`} />
                            )}
                            <span className="flex-1 truncate leading-tight">{l.title}</span>
                            {l.type === "video" && (
                              <span className={`text-[9px] uppercase tracking-wider px-1.5 py-0.5 rounded font-extrabold ${
                                active ? "bg-background/20 text-slate-950" : "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                              }`}>
                                VIDEO
                              </span>
                            )}
                          </Link>
                        </li>
                      );
                    })
                  )}
                </ul>
              </div>
            ))}
          </div>
        </aside>

        {/* ── Main Content ── */}
        <main className="flex-1 overflow-y-auto bg-background">
          <header className="py-4 border-b border-border/90 bg-card/90 backdrop-blur-md sticky top-0 z-20 px-8 flex items-center justify-between shadow-xl">
            <div className="flex items-center gap-3">
              <span className="px-3 py-1 rounded-full text-xs font-extrabold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 uppercase tracking-widest">
                {module.title}
              </span>
              <span className="text-muted-foreground">•</span>
              <p className="text-sm font-extrabold text-foreground leading-tight">{lesson.title}</p>
            </div>
            <div className="flex items-center gap-3">
              {done && (
                <span className="text-xs font-extrabold text-emerald-400 inline-flex items-center gap-1.5 bg-emerald-500/15 px-3.5 py-1.5 rounded-full border border-emerald-500/30 shadow-sm">
                  <CheckCircle2 className="size-4 text-emerald-400" /> Completed
                </span>
              )}
              {isVideoLesson && !done && !videoComplete && (
                <span className="text-xs font-bold text-amber-300 bg-amber-500/15 px-3.5 py-1.5 rounded-full border border-amber-500/30 shadow-xs">
                  Watch full video to continue
                </span>
              )}
              <Link
                to="/courses/$courseId"
                params={{ courseId: course.id }}
                className="px-4 py-2 rounded-xl bg-muted hover:bg-muted text-foreground hover:text-foreground text-xs font-bold transition-all border border-border flex items-center gap-1.5 shadow-sm"
              >
                <X className="size-4" />
                <span>Exit Player</span>
              </Link>
            </div>
          </header>

          <div className="max-w-4xl mx-auto px-8 py-10 space-y-6">
            <div className="flex items-center gap-2 text-xs font-extrabold uppercase tracking-widest text-muted-foreground">
              <span className="text-emerald-400">Lesson {currIdx + 1} of {allLessons.length}</span>
              <span>•</span>
              <span>{lesson.duration}</span>
              {isVideoLesson && <span className="text-indigo-400">• Video Lesson</span>}
            </div>
            
            <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-foreground leading-tight">{lesson.title}</h1>

            {/* ── Render content based on lesson type via Polymorphic Dispatch ── */}
            <PolymorphicLessonRenderer
              lesson={lesson}
              onVideoComplete={handleVideoComplete}
            />

            {/* ── AI nudge (only for interactive lessons) ── */}
            {!isVideoLesson && (
              <div className="mt-6 rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-5 flex items-start gap-3 shadow-lg">
                <Sparkles className="size-5 text-indigo-400 mt-0.5 shrink-0" />
                <p className="text-xs sm:text-sm text-foreground font-medium leading-relaxed">
                  <span className="font-extrabold text-indigo-300">AI Tutor Tip · </span>
                  Try the interactive activity above. When complete, use the AI Assistant to generate a quick summary or flashcards!
                </p>
              </div>
            )}

            {/* ── Navigation ── */}
            <div className="pt-8 border-t border-border flex items-center justify-between">
              <button
                onClick={() =>
                  prev &&
                  navigate({
                    to: "/courses/$courseId/play/$lessonId",
                    params: { courseId: course.id, lessonId: prev.id },
                  })
                }
                disabled={!prev}
                className="px-5 py-3 rounded-xl bg-card hover:bg-muted text-foreground hover:text-foreground font-bold text-xs border border-border transition-all disabled:opacity-40 inline-flex items-center gap-2"
              >
                <ChevronLeft className="size-4 text-muted-foreground" />
                <span>Previous Lesson</span>
              </button>

              <button
                onClick={goNext}
                disabled={!canProceed}
                title={!canProceed ? "Watch the full video to continue" : undefined}
                className={`text-xs font-black px-6 py-3 rounded-xl inline-flex items-center gap-2.5 transition-all ${
                  canProceed
                    ? "bg-emerald-600 hover:bg-emerald-500 text-slate-950 shadow-xl shadow-emerald-600/20 hover:scale-[1.02]"
                    : "bg-muted text-muted-foreground border border-border cursor-not-allowed opacity-60"
                }`}
              >
                <span>{next ? "Mark Complete & Continue" : "Finish Module → Assessment"}</span>
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}

