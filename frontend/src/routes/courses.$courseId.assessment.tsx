import { createFileRoute, Link, notFound, useNavigate } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { type Question } from "@/lib/mock";
import { adaptApiCourse, fetchAssessmentQuestions, fetchCourse } from "@/lib/courses-api";
import { Check, X, Award, RotateCcw, ChevronRight, Lock, Loader2, Clock, AlertTriangle, AlertCircle } from "lucide-react";
import { isLessonComplete } from "@/lib/progress";
import { useAuth, authFetch, API_BASE } from "@/lib/auth";
import { BackButton } from "@/components/BackButton";

export const Route = createFileRoute("/courses/$courseId/assessment")({
  loader: async ({ params }) => {
    // SSR guard
    if (typeof window === "undefined") {
      return { course: null as any };
    }

    const apiId = parseInt(params.courseId.replace("api-", ""), 10);
    if (!isNaN(apiId)) {
      try {
        const data = await fetchCourse(apiId);
        if (data) {
          return { course: adaptApiCourse(data) };
        }
      } catch {}
    }
    
    return {
      course: {
        id: params.courseId,
        title: "Course Assessment",
        subtitle: "",
        category: "Assessment",
        hero: "",
        durationHrs: 1,
        passingScore: 70,
        level: "Foundational" as const,
        status: "published" as const,
        accent: "emerald",
        modules: []
      }
    };
  },
  component: Assessment,
});

function Assessment() {
  const { course } = Route.useLoaderData();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [isLocked, setIsLocked] = useState(false);
  
  const [idx, setIdx] = useState(0);
  const [answers, setAnswers] = useState<Record<string, unknown>>({});
  
  const [attemptId, setAttemptId] = useState<number | null>(null);
  const [deadline, setDeadline] = useState<number | null>(null);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  
  const [finished, setFinished] = useState(false);
  const [result, setResult] = useState<{score_percent: number, passed: boolean, auto_submitted: boolean} | null>(null);

  // Track if they submitted the current question to see the result
  const [submittedCurrent, setSubmittedCurrent] = useState(false);

  useEffect(() => {
    async function checkLock() {
      if (!course || !course.modules) return false;
      let allCompleted = true;
      let hasLessons = false;
      for (const m of course.modules) {
        for (const l of m.lessons) {
          hasLessons = true;
          const done = await isLessonComplete(course.id, l.id);
          if (!done) {
            allCompleted = false;
          }
        }
      }
      const locked = hasLessons && !allCompleted;
      const effectiveLock = locked && !user?.is_platform_super_admin;
      setIsLocked(effectiveLock);
      return effectiveLock;
    }

    checkLock().then((effectiveLock) => {
      if (!effectiveLock) {
        const courseIdNum = typeof course?.id === 'string' && course.id.startsWith("api-") 
          ? parseInt(course.id.replace("api-", "")) 
          : (typeof course?.id === 'number' ? course.id : NaN);
        
        if (!isNaN(courseIdNum)) {
          Promise.all([
            fetchAssessmentQuestions(courseIdNum).catch(() => []),
            authFetch(`${API_BASE}/courses/${courseIdNum}/assessment/start/`, { method: 'POST' }).then(res => res.ok ? res.json() : null).catch(() => null)
          ]).then(([apiQs, attemptData]) => {
            if (apiQs && apiQs.length > 0) {
               const mappedQs = apiQs.map((q: any) => {
                 const mapping: Record<string, number> = { 'A': 0, 'B': 1, 'C': 2, 'D': 3 };
                 return {
                   id: q.id.toString(),
                   kind: 'single',
                   prompt: q.question_text,
                   options: [q.option_a, q.option_b, q.option_c, q.option_d],
                   correct: mapping[q.correct_option] ?? 0
                 } as Question;
               });
               setQuestions(mappedQs);
            } else {
               setQuestions([]);
            }
            
            if (attemptData && attemptData.id) {
              setAttemptId(attemptData.id);
            }
            setLoading(false);
          }).catch(() => {
            setQuestions([]);
            setLoading(false);
          });
        } else {
          setQuestions([]);
          setLoading(false);
        }
      } else {
        setLoading(false);
      }
    });
  }, [course, user]);

  // Timer effect
  useEffect(() => {
    if (!deadline || finished) return;
    
    const interval = setInterval(() => {
      const remaining = Math.max(0, deadline - Date.now());
      setTimeRemaining(remaining);
      if (remaining === 0) {
        clearInterval(interval);
        handleFinalSubmit(true);
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [deadline, finished, answers, attemptId]);

  const handleFinalSubmit = async (auto = false) => {
    if (finished) return;
    setFinished(true);
    const courseIdNum = typeof course.id === 'string' && course.id.startsWith("api-") 
        ? parseInt(course.id.replace("api-", "")) 
        : NaN;
        
    if (!isNaN(courseIdNum) && attemptId) {
      // Map options back to A, B, C, D for backend
      const backendAnswers: Record<string, string> = {};
      const mapping = ["A", "B", "C", "D"];
      for (const q of questions) {
        if (answers[q.id] !== undefined) {
          backendAnswers[q.id] = mapping[answers[q.id] as number];
        }
      }
      
      try {
        const res = await authFetch(`${API_BASE}/courses/${courseIdNum}/assessment/${attemptId}/submit/`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answers: backendAnswers, auto_submitted: auto })
        });
        if (res.ok) {
          const data = await res.json();
          setResult(data);
        }
      } catch (e) {
        console.error(e);
      }
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-surface grid place-items-center">
        <Loader2 className="size-8 animate-spin text-brand" />
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="min-h-screen bg-surface grid place-items-center p-8">
        <div className="max-w-md w-full text-center p-8 bg-card rounded-3xl shadow-elevated ring-1 ring-border">
          <div className="size-16 rounded-full bg-amber-100 text-amber-600 grid place-items-center mx-auto mb-6">
            <Lock className="size-8" />
          </div>
          <h2 className="text-2xl font-medium tracking-tight mb-2">Assessment Locked</h2>
          <p className="text-muted-foreground mb-8">
            You must complete all modules and lessons in the course before unlocking the final assessment.
          </p>
          <button
            onClick={() => navigate({ to: "/courses/$courseId", params: { courseId: course.id } })}
            className="px-5 py-2.5 rounded-lg bg-brand text-brand-foreground font-medium"
          >
            Back to course
          </button>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="min-h-screen bg-surface grid place-items-center p-8">
        <div className="max-w-md w-full text-center p-8 bg-card rounded-3xl shadow-elevated ring-1 ring-border">
          <div className="size-16 rounded-full bg-muted text-muted-foreground grid place-items-center mx-auto mb-6">
            <AlertCircle className="size-8" />
          </div>
          <h2 className="text-2xl font-medium tracking-tight mb-2">No Assessment Questions</h2>
          <p className="text-muted-foreground mb-8">
            No assessment questions have been configured for this course yet. Please contact your organization administrator.
          </p>
          <button
            onClick={() => navigate({ to: "/courses/$courseId", params: { courseId: course.id } })}
            className="px-5 py-2.5 rounded-lg bg-brand text-brand-foreground font-medium"
          >
            Back to course
          </button>
        </div>
      </div>
    );
  }

  if (finished) {
    // If backend graded it, use backend result, else fallback to frontend mock grade
    const pct = result ? result.score_percent : Math.round((grade(questions, answers) / questions.length) * 100);
    const passed = result ? result.passed : pct >= course.passingScore;
    
    return (
      <div className="min-h-screen bg-surface grid place-items-center p-8">
        <div className="w-full max-w-lg rounded-3xl bg-card ring-1 ring-border p-10 text-center shadow-elevated">
          {result?.auto_submitted && (
            <div className="mb-6 inline-flex items-center gap-2 px-3 py-1.5 bg-amber-100 text-amber-800 text-sm font-medium rounded-lg">
              <AlertTriangle className="size-4" /> Time expired: Auto-submitted
            </div>
          )}
          
          <div className={`size-16 rounded-full mx-auto grid place-items-center mb-6 ${passed ? "bg-success/10 text-success" : "bg-destructive/10 text-destructive"}`}>
            {passed ? <Award className="size-7" /> : <X className="size-7" />}
          </div>
          <h1 className="text-2xl font-medium tracking-tight mb-2">
            {passed ? "Congratulations!" : "Almost there"}
          </h1>
          <p className="text-muted-foreground mb-6">
            {passed
              ? `You passed the ${course.title} assessment. A certificate has been issued to your account.`
              : `You scored below the ${course.passingScore}% passing mark. Review the lessons and try again.`}
          </p>
          <div className="flex items-center justify-center gap-8 mb-8">
            <Metric label="Your score" value={`${pct}%`} highlight={passed} />
            <div className="h-10 w-px bg-border" />
            <Metric label="Passing" value={`${course.passingScore}%`} />
          </div>
          <div className="flex justify-center gap-2">
            {passed ? (
              <Link
                to="/certificates"
                className="px-5 py-2.5 rounded-lg bg-brand text-brand-foreground text-sm font-medium inline-flex items-center gap-2"
              >
                View your certificates <ChevronRight className="size-4" />
              </Link>
            ) : (
              <button
                onClick={() => window.location.reload()}
                className="px-5 py-2.5 rounded-lg bg-brand text-brand-foreground text-sm font-medium inline-flex items-center gap-2"
              >
                <RotateCcw className="size-4" /> Retake assessment
              </button>
            )}
            <button
              onClick={() => navigate({ to: "/courses/$courseId", params: { courseId: course.id } })}
              className="px-5 py-2.5 rounded-lg ring-1 ring-border text-sm font-medium"
            >
              Back to course
            </button>
          </div>
        </div>
      </div>
    );
  }

  const q = questions[idx];
  const total = questions.length;
  if (!q) return null; // safety fallback

  const answered = answers[q.id] !== undefined;
  
  const mins = timeRemaining !== null ? Math.floor(timeRemaining / 60000) : null;
  const secs = timeRemaining !== null ? Math.floor((timeRemaining % 60000) / 1000) : null;
  const timerUrgent = timeRemaining !== null && timeRemaining <= 60000;

  return (
    <div className="min-h-screen bg-surface flex flex-col">
      <header className="h-14 flex items-center justify-between border-b border-border bg-background px-8 shrink-0">
        <div>
          <BackButton to="/courses/$courseId" params={{ courseId: course.id }} label="Back to Course Overview" className="mb-0 text-muted-foreground hover:text-foreground" />
          <p className="text-sm font-medium">Final assessment · {user?.full_name || user?.username || "Learner"}</p>
        </div>
        
        <div className="flex items-center gap-6">
          {timeRemaining !== null && (
            <div className={`flex items-center gap-2 font-mono text-sm px-3 py-1.5 rounded ${timerUrgent ? 'bg-destructive/10 text-destructive font-bold' : 'bg-muted text-muted-foreground'}`}>
              <Clock className="size-4" />
              {mins?.toString().padStart(2, '0')}:{secs?.toString().padStart(2, '0')}
            </div>
          )}
          <span className="text-xs text-muted-foreground font-mono">
            {idx + 1} / {total}
          </span>
        </div>
      </header>
      <div className="h-1 bg-muted shrink-0">
        <div className="h-full bg-brand transition-all" style={{ width: `${((idx + 1) / total) * 100}%` }} />
      </div>

      <div className="flex-1 overflow-y-auto">
        <div className="max-w-2xl mx-auto px-8 py-12">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold mb-2">
            Question {idx + 1}
          </p>
          <h1 className="text-2xl font-medium tracking-tight leading-tight mb-8">{q.prompt}</h1>

          <QuestionBody 
            q={q} 
            value={answers[q.id]} 
            onChange={(v) => {
              if (!submittedCurrent) setAnswers((a) => ({ ...a, [q.id]: v }));
            }} 
            submitted={submittedCurrent}
          />

          <div className="flex items-center justify-between mt-10">
            <div /> {/* spacing */}
            {!submittedCurrent ? (
              <button
                disabled={!answered}
                onClick={() => setSubmittedCurrent(true)}
                className="px-5 py-2.5 rounded-lg bg-brand text-brand-foreground text-sm font-medium disabled:opacity-40"
              >
                Submit Answer
              </button>
            ) : idx === total - 1 ? (
              <button
                onClick={() => handleFinalSubmit(false)}
                className="px-5 py-2.5 rounded-lg bg-brand text-brand-foreground text-sm font-medium"
              >
                Finish assessment
              </button>
            ) : (
              <button
                onClick={() => {
                  setIdx(i => i + 1);
                  setSubmittedCurrent(false);
                }}
                className="px-5 py-2.5 rounded-lg bg-brand text-brand-foreground text-sm font-medium inline-flex items-center gap-2"
              >
                Next question <ChevronRight className="size-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <div className={`text-3xl font-medium ${highlight ? "text-success" : ""}`}>{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{label}</div>
    </div>
  );
}

function QuestionBody({
  q,
  value,
  onChange,
  submitted
}: {
  q: Question;
  value: unknown;
  onChange: (v: unknown) => void;
  submitted: boolean;
}) {
  if (q.kind === "single") {
    return (
      <div className="space-y-2">
        {q.options.map((opt, i) => {
          const selected = value === i;
          const isCorrect = i === q.correct;
          
          let style = "ring-1 ring-border bg-background hover:ring-brand/40";
          if (selected && !submitted) style = "bg-brand/5 ring-1 ring-brand";
          if (submitted) {
             if (isCorrect) style = "bg-success/10 ring-1 ring-success text-success";
             else if (selected) style = "bg-destructive/10 ring-1 ring-destructive text-destructive";
             else style = "ring-1 ring-border bg-background/50 opacity-50";
          }
          
          return (
            <button
              key={opt}
              onClick={() => onChange(i)}
              className={`w-full text-left p-4 rounded-xl text-sm transition-all flex items-center justify-between ${style}`}
            >
              <span>{opt}</span>
              {submitted && isCorrect && <Check className="size-4" />}
              {submitted && selected && !isCorrect && <X className="size-4" />}
            </button>
          );
        })}
      </div>
    );
  }
  return <div className="text-muted-foreground text-sm italic">Unsupported question type in CSV import.</div>;
}

function grade(questions: Question[], answers: Record<string, unknown>): number {
  let score = 0;
  for (const q of questions) {
    const a = answers[q.id];
    if (q.kind === "single" && a === q.correct) score++;
  }
  return score;
}
