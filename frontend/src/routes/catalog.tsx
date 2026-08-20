import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Clock, BookOpen, Loader2 } from "lucide-react";
import { useState, useEffect } from "react";
import { fetchCourses, adaptApiCourse, type ApiCourse, fetchAccessRequests, requestAccess } from "@/lib/courses-api";
import type { Course } from "@/lib/mock";
import { PaginationControls } from "@/components/ui/PaginationControls";

export const Route = createFileRoute("/catalog")({
  head: () => ({ meta: [{ title: "Course Catalog" }] }),
  component: Catalog,
});

function Catalog() {
  const [apiCourses, setApiCourses] = useState<Course[]>([]);
  const [loadingApi, setLoadingApi] = useState(true);
  const [activeCategory, setActiveCategory] = useState("All");
  const [accessStatuses, setAccessStatuses] = useState<Record<string, string>>({});
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  useEffect(() => {
    fetchAccessRequests().then(reqs => {
      const statuses: Record<string, string> = {};
      reqs.forEach(r => {
        statuses[`api-${r.course}`] = r.status;
      });
      setAccessStatuses(statuses);
    }).catch(() => {});
  }, []);

  const handleRequestAccess = async (e: React.MouseEvent, courseId: string) => {
    e.preventDefault();
    try {
      const numId = parseInt(courseId.replace('api-', ''), 10);
      await requestAccess(numId);
      setAccessStatuses(prev => ({ ...prev, [courseId]: 'pending' }));
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchCourses()
      .then((raw: ApiCourse[]) => {
        // Only show published courses in the catalog
        const published = raw
          .filter((c) => c.status === "published")
          .map(adaptApiCourse);
        setApiCourses(published);
      })
      .catch(() => {
        // Backend unavailable — continue with mock only
        setApiCourses([]);
      })
      .finally(() => setLoadingApi(false));
  }, []);

  const allCourses: Course[] = [...apiCourses];
  
  // Dynamically generate categories from the available courses
  const dynamicCats = Array.from(new Set(allCourses.map(c => c.category).filter(Boolean)));
  const cats = ["All", ...dynamicCats];

  const filtered =
    activeCategory === "All"
      ? allCourses
      : allCourses.filter((c) => c.category === activeCategory);

  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground mb-2">Course Catalog</h1>
          <p className="text-sm text-foreground font-medium max-w-[60ch]">
            Browse the complete library of courses and certification programs.
          </p>
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2">
          {cats.map((c) => (
            <button
              key={c}
              onClick={() => {
                setActiveCategory(c);
                setCurrentPage(1);
              }}
              className={`px-4 py-2 rounded-full text-xs font-bold transition-all whitespace-nowrap ${
                activeCategory === c
                  ? "bg-brand text-brand-foreground shadow-sm"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground hover:border-border"
              }`}
            >
              {c}
            </button>
          ))}
          {loadingApi && <Loader2 className="size-4 text-brand animate-spin self-center ml-2" />}
        </div>

        {filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground bg-card/60 rounded-2xl border border-dashed border-border">
            <BookOpen className="size-10 mx-auto mb-3 opacity-30 text-brand" />
            <p className="text-sm font-medium">No courses in this category yet.</p>
          </div>
        ) : (
          <div className="space-y-6">
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-5">
              {paginated.map((c) => (
                <Link
                  key={c.id}
                  to="/courses/$courseId"
                  params={{ courseId: c.id }}
                  className="group rounded-2xl border border-border bg-card/90 overflow-hidden hover:border-brand/40 hover:shadow-2xl transition-all flex flex-col justify-between"
                >
                  <div>
                    <div className="aspect-[16/10] bg-background overflow-hidden relative border-b border-border">
                      {!c.enrolled && accessStatuses[c.id] === 'pending' && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10 backdrop-blur-xs">
                          <span className="bg-card text-brand border border-brand/40 px-3 py-1.5 rounded-full text-xs font-bold shadow-lg">
                            Pending Approval
                          </span>
                        </div>
                      )}
                      {!c.enrolled && !accessStatuses[c.id] && (
                        <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-10 opacity-0 group-hover:opacity-100 transition-opacity backdrop-blur-xs">
                          <button 
                            onClick={(e) => handleRequestAccess(e, c.id)}
                            className="bg-brand text-brand-foreground px-4 py-2 rounded-xl text-xs font-black shadow-lg hover:opacity-90 transition-opacity"
                          >
                            Request Access
                          </button>
                        </div>
                      )}
                      {c.hero ? (
                        <img
                          src={c.hero}
                          alt=""
                          className="size-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                      ) : null}
                    </div>
                    <div className="p-5 space-y-2">
                      <span className="text-[10px] font-extrabold uppercase tracking-widest text-brand">
                        {c.category}
                      </span>
                      <h3 className="text-base font-extrabold leading-tight text-foreground group-hover:text-brand transition-colors">
                        {c.title}
                      </h3>
                      <p className="text-xs text-muted-foreground font-medium leading-relaxed line-clamp-2">
                        {c.subtitle}
                      </p>
                    </div>
                  </div>

                  <div className="p-5 pt-0 space-y-3">
                    <div className="flex items-center justify-between text-xs text-muted-foreground font-semibold pt-3 border-t border-border">
                      <span className="inline-flex items-center gap-1">
                        <Clock className="size-3 text-brand" /> {c.durationHrs}h
                      </span>
                      <span className="inline-flex items-center gap-1">
                        <BookOpen className="size-3 text-brand" /> {c.modules.length} modules
                      </span>
                      <span className="font-bold text-foreground">{c.level}</span>
                    </div>
                    {c.enrolled && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-[10px] font-bold">
                          <span className="text-muted-foreground">Progress</span>
                          <span className="text-brand">{Math.round(c.progress * 100)}%</span>
                        </div>
                        <div className="h-1.5 w-full bg-background rounded-full overflow-hidden border border-border">
                          <div
                            className="h-full bg-brand rounded-full"
                            style={{ width: `${c.progress * 100}%` }}
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </Link>
              ))}
            </div>

            <PaginationControls
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={filtered.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </div>
    </AppShell>
  );
}

