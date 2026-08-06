import { createFileRoute, Link, notFound } from "@tanstack/react-router";
import { CERTIFICATES } from "@/lib/mock";
import { Award, Download, Printer, ChevronLeft } from "lucide-react";
import { z } from "zod";
import { authFetch, useAuth, API_BASE } from "@/lib/auth";
import { fetchCourse, adaptApiCourse } from "@/lib/courses-api";
import { BackButton } from "@/components/BackButton";

const search = z.object({
  score: z.number().optional(),
  courseId: z.string().optional(),
});

export const Route = createFileRoute("/certificates/$certId")({
  validateSearch: (s) => search.parse(s),
  loaderDeps: ({ search }) => ({ courseId: search.courseId }),
  loader: async ({ params, deps }) => {
    if (typeof window === "undefined") {
      return { stored: null, course: null, apiCert: null };
    }
    const { courseId } = deps || {};
    const stored = CERTIFICATES.find((c) => c.id === params.certId);
    let course = undefined;
    let apiCert = null;
    
    try {
      const res = await authFetch(`${API_BASE}/courses/certificates/${params.certId}/`);
      if (res.ok) {
        apiCert = await res.json();
      }
    } catch {}

    if (!stored && !apiCert && courseId && courseId.startsWith("api-")) {
      const apiId = parseInt(courseId.replace("api-", ""), 10);
      if (!isNaN(apiId)) {
        try {
          const c = await fetchCourse(apiId);
          if (c) course = adaptApiCourse(c);
        } catch { }
      }
    }
    return { stored, course, apiCert };
  },
  component: CertificateView,
});

function CertificateView() {
  const { certId } = Route.useParams();
  const { score, courseId } = Route.useSearch();
  const { stored, course, apiCert } = Route.useLoaderData();
  const { user } = useAuth();

  const cert = apiCert ? {
    id: apiCert.id,
    courseId: apiCert.course,
    courseTitle: apiCert.course_title,
    learnerName: apiCert.user_name || user?.first_name || user?.username || "Learner",
    orgName: apiCert.organization_name || user?.organization?.name || "Learning Platform",
    score: score ?? 100,
    issuedAt: apiCert.issued_at ? new Date(apiCert.issued_at).toLocaleDateString() : new Date().toLocaleDateString(),
    expiresAt: "Lifetime Valid",
    verificationCode: apiCert.certificate_id || `CERT-${apiCert.id}`,
    templateHtml: apiCert.certificate_template_html
  } : (stored ?? (course && score !== undefined ? {
    id: certId,
    courseId: course.id,
    courseTitle: course.title,
    learnerName: user?.first_name || user?.username || "Learner",
    orgName: user?.organization?.name || "Learning Platform",
    score,
    issuedAt: new Date().toISOString().slice(0, 10),
    expiresAt: new Date(Date.now() + 2 * 365 * 24 * 3600 * 1000).toISOString().slice(0, 10),
    verificationCode: `HAL-${Date.now().toString(36).toUpperCase()}-${user?.first_name ? user.first_name[0] : "U"}`,
    templateHtml: null
  } : null));

  if (!cert) {
    return (
      <div className="min-h-screen grid place-items-center">
        <div className="text-center">
          <p className="text-muted-foreground">Certificate not found.</p>
          <Link to="/certificates" className="text-brand text-sm font-medium mt-2 inline-block">← Back to certifications</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-surface py-10 px-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-6 print:hidden">
          <BackButton to="/certificates" label="Back to My Certifications" className="mb-0 text-muted-foreground hover:text-foreground" />
          <div className="flex gap-2">
            <button onClick={() => window.print()} className="text-sm font-medium px-3 py-2 rounded-lg ring-1 ring-border inline-flex items-center gap-2">
              <Printer className="size-4" /> Print
            </button>
            <button className="text-sm font-medium px-3 py-2 rounded-lg bg-brand text-brand-foreground inline-flex items-center gap-2">
              <Download className="size-4" /> Download PDF
            </button>
          </div>
        </div>

        {/* Cert */}
        <div className="bg-card rounded-3xl ring-1 ring-border shadow-elevated overflow-hidden">
          <div className="bg-gradient-to-br from-brand to-brand-deep h-3" />
          <div className="p-14 text-center relative">
            <div className="size-16 rounded-full bg-brand/10 grid place-items-center text-brand mx-auto mb-6">
              <Award className="size-7" />
            </div>
            <p className="text-[11px] uppercase tracking-[0.3em] text-muted-foreground mb-2">Halyard Learn · Certificate of Achievement</p>
            <h1 className="text-4xl font-medium tracking-tight mb-3">{cert.learnerName}</h1>
            <p className="text-muted-foreground mb-10">has successfully completed</p>
            <h2 className="text-2xl font-medium tracking-tight max-w-[40ch] mx-auto mb-12">{cert.courseTitle}</h2>

            <div className="grid grid-cols-3 gap-8 max-w-md mx-auto mb-12">
              <CertMeta label="Score" value={`${cert.score}%`} />
              <CertMeta label="Issued" value={cert.issuedAt} />
              <CertMeta label="Expires" value={cert.expiresAt} />
            </div>

            <div className="flex items-end justify-between max-w-md mx-auto">
              <div className="text-left">
                <div className="h-px w-32 bg-foreground mb-1" />
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Authorized signatory</p>
                <p className="text-sm font-medium">Halyard Clinical Education</p>
              </div>
              {/* QR placeholder */}
              <div className="size-20 bg-ui-bg ring-1 ring-border rounded-md grid grid-cols-5 grid-rows-5 gap-px p-2">
                {Array.from({ length: 25 }).map((_, i) => (
                  <div key={i} className={`${[0, 1, 4, 5, 7, 8, 11, 13, 16, 18, 19, 22, 24].includes(i) ? "bg-foreground" : "bg-transparent"}`} />
                ))}
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground font-mono mt-8">
              Verification: halyard.com/verify · {cert.verificationCode}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

function CertMeta({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-lg font-medium">{value}</div>
      <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">{label}</div>
    </div>
  );
}
