import React from "react";
import { createFileRoute, Link, notFound, Outlet, useRouterState, useRouter } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { BackButton } from "@/components/BackButton";
import { adaptApiCourse, fetchCourse, requestAccess } from "@/lib/courses-api";
import { authFetch, API_BASE } from "@/lib/auth";
import { Lock, PlayCircle, CheckCircle2, Award, Clock, BookOpen, MessageSquare, Sparkles } from "lucide-react";
import { useCourseProgress } from "@/lib/progress";
import { ScormPlayer } from "@/components/ScormPlayer";

export const Route = createFileRoute("/courses/$courseId")({
  loader: async ({ params }) => {
    // SSR guard: do not fetch authenticated data on the server
    if (typeof window === "undefined") {
      return { course: null as any };
    }

    const apiId = parseInt(params.courseId.replace("api-", ""), 10);
    if (!isNaN(apiId)) {
      const data = await fetchCourse(apiId);
      if (data) {
        return { course: adaptApiCourse(data) };
      }
    }
    throw notFound();
  },
  head: ({ loaderData }) => ({
    meta: [{ title: `${loaderData?.course?.title ?? "Course"} — Halyard Learn` }],
  }),
  component: CourseLayout,
});

/**
 * CourseLayout — acts as a layout wrapper for:
 *   - /courses/$courseId          → CourseOverview (this file)
 *   - /courses/$courseId/play/$lessonId  → Player (child route)
 *   - /courses/$courseId/assessment     → Assessment (child route)
 *
 * When on the exact /courses/$courseId path, shows the course overview.
 * When on a child path, renders <Outlet /> so the child fills the screen.
 */
function CourseLayout() {
  const { course } = Route.useLoaderData();
  const router = useRouter();
  const routerState = useRouterState();
  const [isClient, setIsClient] = React.useState(false);

  React.useEffect(() => {
    setIsClient(true);
    if (!course) {
      // We are on the client, but the course is null (SSR fallback). Force a refetch!
      router.invalidate();
    }
  }, [course, router]);

  // SSR fallback: if course is null (prevented load on server), render empty shell or loading state
  if (!course) {
    if (isClient) return <div className="p-12 text-center text-muted-foreground">Loading course...</div>;
    return null;
  }

  const currentPath = routerState.location.pathname;
  const isChildRoute = currentPath.includes('/play/') || currentPath.endsWith('/assessment');

  // When viewing a child route (/play/... or /assessment), render <Outlet />. Otherwise render CourseOverview.
  if (isChildRoute) {
    return <Outlet />;
  }

  // Otherwise render the full course overview
  return <CourseOverview course={course} />;
}

function CourseOverview({ course }: { course: ReturnType<typeof adaptApiCourse> }) {
  const { isLessonComplete, percent } = useCourseProgress(course.id);
  const [accessStatus, setAccessStatus] = React.useState<'none' | 'pending' | 'accepted' | 'rejected'>('none');
  const [accessLoading, setAccessLoading] = React.useState(true);
  const [showScormPlayer, setShowScormPlayer] = React.useState(false);

  const numericId = typeof course.id === 'string' ? parseInt(course.id.replace('api-', ''), 10) : course.id;

  const fetchAccess = React.useCallback(() => {
    if (isNaN(numericId)) {
      setAccessLoading(false);
      return;
    }
    authFetch(`${API_BASE}/courses/${numericId}/request-access/`)
      .then(res => res.ok ? res.json() : null)
      .then(data => {
        if (data?.status) setAccessStatus(data.status);
      })
      .catch(console.error)
      .finally(() => setAccessLoading(false));
  }, [numericId]);

  React.useEffect(() => {
    fetchAccess();
  }, [fetchAccess]);

  if (!course) return null;

  const isAccessGranted = accessStatus === 'accepted';

  // Find the first lesson that is NOT yet complete → that's where Resume takes the user.
  const allUnlockedLessons = course.modules.flatMap((m: Module) => m.lessons);

  const resumeLessonId: string | undefined =
    allUnlockedLessons.find((l: Lesson) => !isLessonComplete(l.id))?.id
    ?? allUnlockedLessons[0]?.id;

  const hasLessons = allUnlockedLessons.length > 0;
  const isStarted = percent > 0 || allUnlockedLessons.some((l: Lesson) => isLessonComplete(l.id));

  return (
    <AppShell maxWidth="max-w-5xl">
      <BackButton to="/catalog" label="Back to Course Catalog" />
      <div className="rounded-3xl border border-border bg-card text-foreground overflow-hidden mb-8 shadow-xl">
        <div className="grid md:grid-cols-[1fr_1.1fr]">
          <div className="aspect-video md:aspect-auto bg-background">
            <img src={course.hero} alt="" className="size-full object-cover" />
          </div>
          <div className="p-8 flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <span className="text-[10px] uppercase tracking-widest text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 font-extrabold">{course.category}</span>
                <span className="text-[10px] text-muted-foreground font-bold">· {course.level}</span>
              </div>
              <h1 className="text-2xl font-black tracking-tight text-foreground mb-3">{course.title}</h1>
              <p className="text-sm text-muted-foreground leading-relaxed font-medium mb-6">{course.subtitle}</p>
              <div className="grid grid-cols-3 gap-4 text-sm mb-6">
                <Meta icon={<Clock className="size-4 text-emerald-600" />} label="Duration" value={`${course.durationHrs}h`} />
                <Meta icon={<BookOpen className="size-4 text-emerald-600" />} label="Modules" value={`${course.modules.length}`} />
                <Meta icon={<Award className="size-4 text-emerald-600" />} label="Pass" value={`${course.passingScore}%`} />
              </div>
            </div>

            <div className="flex items-center gap-3 flex-wrap pt-4 border-t border-border/50">
              {/* SCORM Course Launch Button */}
              {isAccessGranted && course.is_scorm && course.scorm_package?.launch_url ? (
                <button
                  onClick={() => setShowScormPlayer(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-foreground text-xs font-black px-5 py-3 rounded-xl inline-flex items-center gap-2 transition-all shadow-md"
                >
                  <Sparkles className="size-4 text-amber-300 animate-spin-slow" /> Launch SCORM Course 🚀
                </button>
              ) : isAccessGranted && hasLessons ? (
                <Link
                  to="/courses/$courseId/play/$lessonId"
                  params={{ courseId: course.id, lessonId: resumeLessonId! }}
                  className="bg-emerald-600 text-foreground hover:bg-emerald-700 text-xs font-black px-5 py-3 rounded-xl inline-flex items-center gap-2 transition-colors shadow-md"
                >
                  <PlayCircle className="size-4" /> {isStarted ? "Resume Course" : "Start Course"}
                </Link>
              ) : (
                <span
                  title={isAccessGranted ? "Add modules and lessons in Content Authoring first" : "Course locked — request access from Organization Admin"}
                  className="bg-muted text-muted-foreground text-xs font-bold px-4 py-2.5 rounded-xl inline-flex items-center gap-2 cursor-not-allowed select-none border border-border"
                >
                  <Lock className="size-4 text-muted-foreground" /> Course Locked 🔒
                </span>
              )}

              {/* Take Assessment */}
              {isAccessGranted && (
                <Link
                  to="/courses/$courseId/assessment"
                  params={{ courseId: course.id }}
                  className="text-xs font-bold px-4 py-2.5 rounded-xl border border-border text-muted-foreground hover:bg-muted transition-colors"
                >
                  Take Assessment
                </Link>
              )}

              {/* Request Access Control */}
              <RequestAccessControl
                courseId={course.id}
                status={accessStatus}
                loading={accessLoading}
                onStatusChange={(newStatus) => setAccessStatus(newStatus)}
              />
            </div>
          </div>
        </div>

        {/* SCORM Player Modal Overlay */}
        {showScormPlayer && course.scorm_package?.launch_url && (
          <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-center justify-center p-4 md:p-6 animate-in fade-in">
            <div className="w-full max-w-6xl">
              <ScormPlayer
                courseId={numericId}
                courseTitle={course.title}
                launchUrl={course.scorm_package.launch_url}
                scormVersion={course.scorm_package.version}
                onClose={() => setShowScormPlayer(false)}
                onComplete={() => {
                  fetchAccess();
                }}
              />
            </div>
          </div>
        )}
      </div>

      <h2 className="text-xl font-black tracking-tight text-foreground mb-4">Curriculum</h2>
      {!isAccessGranted ? (
        <div className="rounded-2xl border border-border bg-card/90 p-8 text-center border-dashed border-2 text-foreground">
          <Lock className="size-10 text-amber-400 mx-auto mb-3" />
          <h3 className="text-base font-extrabold text-foreground mb-1">Course Curriculum Locked 🔒</h3>
          <p className="text-xs text-foreground max-w-[48ch] mx-auto font-medium leading-relaxed">
            All courses are locked by default. Click <strong>"Request Access 🔒"</strong> above to send an access request to your Organization Admin.
          </p>
        </div>
      ) : course.modules.length === 0 ? (
        <div className="rounded-2xl border border-border bg-card/90 p-8 text-center text-foreground">
          <BookOpen className="size-8 text-muted-foreground mx-auto mb-3 opacity-40" />
          <p className="text-sm font-bold text-foreground mb-1">No content yet</p>
          <p className="text-xs text-muted-foreground max-w-[40ch] mx-auto font-medium">
            Go to <strong>Content Authoring</strong>, select this course, and add modules and lessons to build the curriculum.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {course.modules.map((m: Module, idx: number) => (
            <div key={m.id} className="rounded-2xl border border-border bg-card text-foreground p-6 shadow-md">
              <div className="flex items-start gap-4">
                <div className="size-10 rounded-xl grid place-items-center text-sm font-black bg-emerald-100 text-emerald-800 border border-emerald-200 shrink-0">
                  {idx + 1}
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base font-black text-foreground tracking-tight">{m.title}</h3>
                  <p className="text-xs text-muted-foreground font-medium mt-1 leading-relaxed">{m.summary}</p>
                  {m.lessons.length > 0 && (
                    <ul className="mt-4 space-y-2 pt-3 border-t border-border/50">
                      {m.lessons.map((l: Lesson) => {
                        const done = isLessonComplete(l.id);
                        const isCurrent = l.id === resumeLessonId && !done;
                        return (
                          <li key={l.id}>
                            <Link
                              to="/courses/$courseId/play/$lessonId"
                              params={{ courseId: course.id, lessonId: l.id }}
                              className={`flex items-center gap-3 text-xs py-2 px-3 rounded-xl transition-all ${
                                isCurrent
                                  ? "bg-emerald-50 text-emerald-800 font-bold border border-emerald-200"
                                  : "hover:bg-muted text-slate-800 font-semibold"
                              }`}
                            >
                              <CheckCircle2 className={`size-4 shrink-0 ${done ? "text-emerald-600 fill-emerald-100" : "text-foreground"}`} />
                              <span className="flex-1 font-bold text-foreground">{l.title}</span>
                              {l.type === "video" && (
                                <span className="text-[9px] uppercase tracking-widest bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded font-black border border-emerald-200">
                                  Video
                                </span>
                              )}
                            </Link>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </AppShell>
  );
}

function Meta({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div className="space-y-0.5">
      <div className="text-muted-foreground mb-1">{icon}</div>
      <div className="text-base font-black text-foreground">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground font-extrabold">{label}</div>
    </div>
  );
}

function RequestAccessControl({
  courseId,
  status,
  loading,
  onStatusChange,
}: {
  courseId: string | number;
  status: 'none' | 'pending' | 'accepted' | 'rejected';
  loading: boolean;
  onStatusChange: (newStatus: 'pending') => void;
}) {
  const numericId = typeof courseId === 'string' ? parseInt(courseId.replace('api-', ''), 10) : courseId;
  const [requesting, setRequesting] = React.useState(false);

  const handleRequest = async () => {
    setRequesting(true);
    try {
      await requestAccess(numericId);
      onStatusChange('pending');
    } catch (e) {
      console.error(e);
    } finally {
      setRequesting(false);
    }
  };

  if (loading) return null;

  if (status === 'accepted') {
    return (
      <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-sm font-semibold shadow-sm">
        <CheckCircle2 className="size-4 text-emerald-600" /> Access Granted ✅
      </span>
    );
  }

  if (status === 'pending') {
    return (
      <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-amber-50 text-amber-700 border border-amber-200 text-sm font-semibold shadow-sm">
        <Clock className="size-4 animate-spin text-amber-600" /> Request Pending ⏳
      </span>
    );
  }

  if (status === 'rejected') {
    return (
      <div className="flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-rose-50 text-rose-700 border border-rose-200 text-sm font-semibold shadow-sm">
          <Lock className="size-4 text-rose-600" /> Access Denied ❌
        </span>
        <Link
          to="/messenger"
          className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-indigo-600 text-foreground hover:bg-indigo-700 transition-colors text-sm font-medium shadow-sm"
        >
          <MessageSquare className="size-4" /> Message Admin 💬
        </Link>
      </div>
    );
  }

  return (
    <button
      onClick={handleRequest}
      disabled={requesting}
      className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-lg bg-emerald-600 text-foreground hover:bg-emerald-700 transition-colors text-sm font-medium shadow-sm disabled:opacity-60"
    >
      {requesting ? <Clock className="size-4 animate-spin text-foreground" /> : <Lock className="size-4 text-foreground" />}
      {requesting ? "Submitting..." : "Request Access 🔒"}
    </button>
  );
}
