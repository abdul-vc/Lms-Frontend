import { createFileRoute, Link } from '@tanstack/react-router';
import { useState, useEffect } from 'react';
import { authFetch } from '@/lib/auth';
import { PolymorphicLessonRenderer, type PolymorphicLessonProps } from '@/components/PolymorphicLessonRenderer';
import { Monitor, Tablet, Smartphone, ArrowLeft, PlayCircle, FileText, Sparkles, HelpCircle, GitFork, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

export const Route = createFileRoute('/org-admin/courses/$courseId/preview')({
  component: CoursePreviewPage,
});

type DeviceMode = 'desktop' | 'tablet' | 'mobile';

interface Module {
  id: number;
  title: string;
  order: number;
  lessons: PolymorphicLessonProps['lesson'][];
}

interface Course {
  id: number;
  title: string;
  subtitle: string;
  is_scorm?: boolean;
  scorm_package?: { launch_url: string; title: string } | null;
  modules: Module[];
}

const DEVICE_CONFIG: Record<DeviceMode, { label: string; icon: typeof Monitor; width: string; frameClass: string }> = {
  desktop: { label: 'Desktop', icon: Monitor, width: '100%', frameClass: 'w-full' },
  tablet:  { label: 'Tablet', icon: Tablet, width: '768px', frameClass: 'w-[768px]' },
  mobile:  { label: 'Mobile', icon: Smartphone, width: '375px', frameClass: 'w-[375px]' },
};

const LESSON_ICONS: Record<string, React.ReactElement> = {
  video:          <PlayCircle className="size-3.5 text-emerald-400 shrink-0" />,
  interactive:    <Sparkles className="size-3.5 text-purple-400 shrink-0" />,
  knowledge_check:<HelpCircle className="size-3.5 text-amber-400 shrink-0" />,
  scenario:       <GitFork className="size-3.5 text-sky-400 shrink-0" />,
  reading:        <FileText className="size-3.5 text-slate-400 shrink-0" />,
};

function CoursePreviewPage() {
  const { courseId } = Route.useParams();
  const [course, setCourse] = useState<Course | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeLesson, setActiveLesson] = useState<PolymorphicLessonProps['lesson'] | null>(null);
  const [deviceMode, setDeviceMode] = useState<DeviceMode>('desktop');

  useEffect(() => { fetchCourseData(); }, [courseId]);

  const fetchCourseData = async () => {
    setLoading(true);
    setError(null);
    try {
      const numericId = parseInt(String(courseId).replace('api-', ''), 10);
      const res = await authFetch(`/api/courses/${numericId}/`);
      if (!res.ok) throw new Error("Failed to load course preview data.");
      const data = await res.json();
      setCourse(data);
      if (data.modules?.length > 0 && data.modules[0].lessons?.length > 0) {
        setActiveLesson(data.modules[0].lessons[0]);
      }
    } catch (err: any) {
      setError(err.message || "Failed to load preview.");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="size-8 border-2 border-brand border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-slate-400">Loading preview…</p>
        </div>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-6">
        <div className="card max-w-md w-full text-center space-y-3">
          <p className="text-sm font-semibold text-destructive">{error || "Course not found."}</p>
          <Link to="/org-admin/courses" className="btn-secondary gap-2 mx-auto w-fit">
            <ArrowLeft className="size-4" /> Back to Catalog
          </Link>
        </div>
      </div>
    );
  }

  const allLessons = course.modules?.flatMap(m => m.lessons) || [];

  return (
    /* Preview is a full-screen isolated experience — uses its own dark shell */
    <div className="fixed inset-0 bg-slate-950 text-slate-100 flex flex-col z-50">

      {/* ── Preview Toolbar ────────────────────────────────────────────────── */}
      <header className="h-14 bg-slate-900/95 border-b border-slate-800 px-4 lg:px-6 flex items-center justify-between gap-4 shrink-0 backdrop-blur-xl">
        {/* Left: Exit + breadcrumb */}
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to="/org-admin/courses/$courseId/builder"
            params={{ courseId }}
            className="btn-icon text-slate-400 hover:text-slate-200 hover:bg-slate-800"
            title="Exit preview"
          >
            <ArrowLeft className="size-4" />
          </Link>
          <div className="h-4 w-px bg-slate-800" />
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-xs font-medium text-slate-500 hidden sm:block">Preview</span>
            <ChevronRight className="size-3 text-slate-700 hidden sm:block" />
            <h1 className="text-sm font-semibold text-slate-200 truncate max-w-[160px] sm:max-w-xs">
              {course.title}
            </h1>
          </div>
        </div>

        {/* Center: Device Switcher */}
        <div className="flex items-center bg-slate-950 border border-slate-800 rounded-lg p-1 gap-0.5">
          {(Object.entries(DEVICE_CONFIG) as [DeviceMode, typeof DEVICE_CONFIG.desktop][]).map(([mode, config]) => {
            const Icon = config.icon;
            const isActive = deviceMode === mode;
            return (
              <button
                key={mode}
                onClick={() => setDeviceMode(mode)}
                className={cn(
                  "flex items-center gap-1.5 px-2.5 py-1.5 rounded text-xs font-medium transition-all",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-slate-500 hover:text-slate-300 hover:bg-slate-800/60"
                )}
              >
                <Icon className="size-3.5 shrink-0" />
                <span className="hidden sm:inline">{config.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right: lesson counter */}
        <div className="text-xs text-slate-500 hidden md:block shrink-0">
          {allLessons.length} lesson{allLessons.length !== 1 ? 's' : ''}
        </div>
      </header>

      {/* ── Body ──────────────────────────────────────────────────────────── */}
      <div className="flex-1 flex overflow-hidden">

        {/* Lesson Sidebar */}
        <aside className="w-64 bg-slate-900/60 border-r border-slate-800 flex flex-col hidden md:flex">
          <div className="px-4 py-3 border-b border-slate-800">
            <h2 className="text-overline text-slate-500">Course Structure</h2>
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
            {course.modules?.map((mod) => (
              <div key={mod.id} className="space-y-1">
                <div className="text-[10px] font-bold uppercase tracking-widest text-slate-500 px-2 py-1">
                  {mod.title}
                </div>
                <div className="space-y-0.5">
                  {mod.lessons?.map((les) => {
                    const isActive = activeLesson?.id === les.id;
                    return (
                      <button
                        key={les.id}
                        onClick={() => setActiveLesson(les)}
                        className={cn(
                          "w-full text-left px-3 py-2 rounded-lg text-xs flex items-center gap-2 transition-all",
                          isActive
                            ? "bg-accent text-accent-foreground font-semibold"
                            : "text-slate-400 hover:bg-slate-800/60 hover:text-slate-200"
                        )}
                      >
                        {LESSON_ICONS[les.type] || LESSON_ICONS.reading}
                        <span className="truncate">{les.title}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            ))}
            {(!course.modules || course.modules.length === 0) && (
              <div className="text-center py-8 text-slate-600 text-xs">
                No modules found
              </div>
            )}
          </div>
        </aside>

        {/* Canvas / Device Frame */}
        <main className="flex-1 bg-slate-950/90 overflow-y-auto flex justify-center items-start p-4 md:p-8">
          <div
            className={cn(
              "device-frame bg-card overflow-hidden transition-all duration-300",
              deviceMode === 'desktop' && "w-full max-w-5xl min-h-[70vh]",
              deviceMode === 'tablet'  && "w-[768px] min-h-[900px]",
              deviceMode === 'mobile'  && "w-[375px] min-h-[667px]",
            )}
            style={{
              borderRadius: deviceMode === 'mobile' ? '2.5rem' : deviceMode === 'tablet' ? '1.5rem' : '1rem',
              border: deviceMode !== 'desktop' ? '6px solid oklch(0.26 0.015 220)' : undefined,
            }}
          >
            {/* Device status bar (tablet/mobile) */}
            {deviceMode !== 'desktop' && (
              <div className="h-7 bg-muted border-b border-border flex items-center justify-between px-5 text-[10px] text-muted-foreground shrink-0">
                <span className="font-semibold">9:41</span>
                <span className="font-medium">{deviceMode === 'mobile' ? '375px' : '768px'}</span>
                <span>100%</span>
              </div>
            )}

            {/* Content */}
            <div className="p-6">
              {course.is_scorm && course.scorm_package ? (
                <div className="w-full" style={{ height: deviceMode === 'mobile' ? '560px' : '600px' }}>
                  <iframe
                    src={course.scorm_package.launch_url}
                    className="w-full h-full border-0 rounded-xl"
                    title={course.scorm_package.title}
                  />
                </div>
              ) : activeLesson ? (
                <div>
                  {/* Lesson header */}
                  <div className="mb-5 pb-4 border-b border-border">
                    <span className="text-overline text-brand mb-1 block">
                      {activeLesson.type.replace('_', ' ')}
                    </span>
                    <h2 className="text-heading-2 text-foreground">{activeLesson.title}</h2>
                  </div>
                  <PolymorphicLessonRenderer lesson={activeLesson} />
                </div>
              ) : (
                <div className="empty-state">
                  <div className="empty-state-icon">
                    <FileText className="size-6" />
                  </div>
                  <p className="empty-state-title">No Lesson Selected</p>
                  <p className="empty-state-description">Select a lesson from the sidebar to preview its content.</p>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
