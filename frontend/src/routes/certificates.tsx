import { createFileRoute, Link } from "@tanstack/react-router";
import { AppShell } from "@/components/AppShell";
import { Award, Calendar, Download, Eye, X, Printer, CheckCircle2, ShieldCheck, Loader2 } from "lucide-react";
import { fetchCourses, adaptApiCourse, fetchMyCertificates } from "@/lib/courses-api";
import { type Course } from "@/lib/mock";
import { useAuth } from "@/lib/auth";
import { useState, useEffect } from "react";
import { PaginationControls } from "@/components/ui/PaginationControls";

export const Route = createFileRoute("/certificates")({
  head: () => ({ meta: [{ title: "Certifications" }] }),
  component: Certificates,
});

function Certificates() {
  const { user } = useAuth();
  const orgName = user?.organization?.name || "the organization";
  const [selectedCert, setSelectedCert] = useState<any | null>(null);
  const [apiCertificates, setApiCertificates] = useState<any[]>([]);
  const [apiCourses, setApiCourses] = useState<Course[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);


  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      try {
        setLoading(true);
        const [certs, coursesData] = await Promise.all([
          fetchMyCertificates().catch(() => []),
          fetchCourses().catch(() => []),
        ]);
        if (isMounted) {
          setApiCertificates(certs);
          setApiCourses(coursesData.map(adaptApiCourse));
        }
      } catch (err) {
        if (isMounted) {
          setApiCertificates([]);
          setApiCourses([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, [user]);

  const handleDownloadPdf = (cert: any) => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("Please allow popups to download/print your certificate.");
      return;
    }

    const certId = cert.certificate_id || cert.certificate_number || String(cert.id) || 'CERT';
    const displayId = certId ? certId.split('-')[0] : 'CERT';
    const courseTitle = cert.course_title || cert.course?.title || cert.title || 'Certificate of Completion';
    const issueDateStr = cert.issued_at || cert.created_at;
    const formattedDate = issueDateStr ? new Date(issueDateStr).toLocaleDateString() : new Date().toLocaleDateString();
    const recipientName = cert.user_name || user?.first_name || user?.username || "Learner";

    const defaultFallbackSignature = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" width="200" height="60"><path d="M10,40 Q30,10 50,35 T90,20 T130,40 T170,15 T190,45" fill="none" stroke="%230f172a" stroke-width="2.5" stroke-linecap="round"/><path d="M30,48 Q70,55 160,42" fill="none" stroke="%23059669" stroke-width="1.8" stroke-linecap="round"/></svg>';
    
    let signatureUrl = cert.certificate_template_html?.match(/<img[^>]+src=["'](data:image\/[^"']+|https?:\/\/[^"']+)["']/i)?.[1];
    if (!signatureUrl && typeof window !== 'undefined') {
      try {
        const savedSigs = localStorage.getItem('lams_signatures_library');
        if (savedSigs) {
          const parsed = JSON.parse(savedSigs);
          if (Array.isArray(parsed) && parsed.length > 0) {
            signatureUrl = parsed[0].url;
          }
        }
      } catch (e) {
        console.error(e);
      }
    }
    if (!signatureUrl || (!signatureUrl.startsWith('data:') && !signatureUrl.startsWith('http'))) {
      signatureUrl = defaultFallbackSignature;
    }

    const templateHtml = cert.certificate_template_html 
      ? cert.certificate_template_html
          .replace('{{user.full_name}}', recipientName)
          .replace('{{employee_name}}', recipientName)
          .replace('{{course_title}}', courseTitle)
      : null;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Certificate — ${courseTitle}</title>
        <style>
          @page { size: landscape; margin: 0; }
          body { font-family: 'Georgia', serif; background: #ffffff; color: #0f172a; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; padding: 40px; box-sizing: border-box; }
          .cert-border { border: 12px double #059669; padding: 40px; background: #ffffff; border-radius: 24px; width: 100%; max-width: 900px; text-align: center; box-shadow: 0 20px 50px rgba(0,0,0,0.1); position: relative; }
          .header { color: #047857; font-size: 14px; letter-spacing: 4px; text-transform: uppercase; margin-bottom: 20px; font-weight: bold; }
          .title { font-size: 38px; font-weight: bold; color: #0f172a; margin-bottom: 10px; }
          .recipient { font-size: 32px; font-style: italic; color: #047857; margin: 20px 0; font-family: serif; text-decoration: none; }
          .description { font-size: 16px; color: #334155; margin-bottom: 30px; line-height: 1.6; }
          .course-name { font-size: 26px; font-weight: bold; color: #0f172a; margin: 15px 0; }
          .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 50px; border-top: 1px solid #e2e8f0; padding-top: 20px; font-family: sans-serif; font-size: 12px; color: #64748b; }
          .badge { position: absolute; top: 30px; right: 40px; background: #047857; color: white; padding: 8px 16px; border-radius: 50px; font-size: 11px; font-weight: bold; font-family: sans-serif; text-transform: uppercase; letter-spacing: 1px; }
        </style>
      </head>
      <body>
        <div class="cert-border">
          <div class="badge">Verified Certificate</div>
          <div class="header">${orgName} · Official Certification</div>
          <div class="title">Certificate of Completion</div>
          <p class="description">This is to certify that</p>
          <div class="recipient">${recipientName}</div>
          <p class="description">has successfully passed and completed the course requirements for</p>
          <div class="course-name">${courseTitle}</div>
          <div class="footer">
            <div style="text-align: left;">
              <p><strong>Issued On:</strong> ${formattedDate}</p>
              <p><strong>Certificate ID:</strong> ${certId}</p>
            </div>
            <div style="text-align: right;">
              <img src="${signatureUrl}" style="height: 50px; object-fit: contain; margin: 0 0 4px auto; display: block;" />
              <p style="font-weight: bold; font-size: 13px; color: #0f172a;">Authorized Signature</p>
              <p style="color: #047857; font-weight: bold;">${orgName} Education Board</p>
            </div>
          </div>
        </div>
        <script>
          window.onload = function() {
            window.print();
          };
        </script>
      </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <AppShell>
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground mb-1">Certifications</h1>
          <p className="text-sm text-foreground font-medium max-w-[60ch]">
            Earned certificates are verifiable via unique ID and recognized across {orgName}.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-black text-foreground mb-4">Earned Certificates ({loading ? '...' : apiCertificates.length})</h2>
          {loading ? (
            <div className="flex items-center justify-center p-12 bg-card/60 rounded-2xl border border-border">
              <Loader2 className="size-6 animate-spin text-emerald-500" />
            </div>
          ) : (
            <div className="space-y-4">
              <div className="grid md:grid-cols-2 gap-4">
              {apiCertificates.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((c: any) => {
                const certId = c.certificate_id || c.certificate_number || String(c.id) || '';
                const displayId = certId ? certId.split('-')[0] : 'CERT';
                const courseTitle = c.course_title || c.course?.title || c.title || 'Certificate of Completion';
                const issueDateStr = c.issued_at || c.created_at;
                const formattedDate = issueDateStr ? new Date(issueDateStr).toLocaleDateString() : 'N/A';

                return (
                  <div
                    key={c.id || certId}
                    onClick={() => setSelectedCert(c)}
                    className="rounded-2xl border border-border bg-card/90 p-5 hover:border-emerald-500/50 hover:shadow-2xl transition-all group relative overflow-hidden cursor-pointer"
                  >
                    <div className="flex items-start gap-4 relative z-10">
                      <div className="size-12 rounded-xl bg-background grid place-items-center text-emerald-400 shadow-md border border-border shrink-0">
                        <Award className="size-6" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-base font-extrabold leading-tight text-foreground group-hover:text-emerald-300 transition-colors truncate">{courseTitle}</h3>
                        <p className="text-xs text-muted-foreground font-medium mt-1 flex items-center gap-2">
                          <Calendar className="size-3 text-emerald-400" /> Issued {formattedDate}
                        </p>
                        <div className="flex items-center gap-3 mt-4 pt-3 border-t border-border">
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/15 uppercase tracking-wider px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                            ID: {displayId}
                          </span>
                          <span className="text-[11px] text-muted-foreground font-medium flex items-center gap-1">
                            <Eye className="size-3 text-muted-foreground" /> View Details
                          </span>
                        </div>
                      </div>
                      <button 
                        onClick={(e) => { e.stopPropagation(); handleDownloadPdf(c); }} 
                        className="p-2.5 bg-muted text-emerald-400 hover:bg-emerald-500 hover:text-slate-950 rounded-xl border border-border transition-all shadow-md shrink-0" 
                        title="Download / Print PDF Certificate"
                      >
                        <Download className="size-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              {apiCertificates.length === 0 && (
                <div className="col-span-2 text-center py-12 px-6 bg-card/60 border border-dashed border-border rounded-2xl">
                  <Award className="size-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                  <h3 className="text-sm font-bold text-foreground">No Certificates Earned Yet</h3>
                  <p className="text-xs text-muted-foreground mt-1 max-w-sm mx-auto font-medium">
                    Complete courses or pass assessments to earn verifiable certificates issued by {orgName}.
                  </p>
                </div>
              )}
            </div>

            {apiCertificates.length > 0 && (
              <PaginationControls
                currentPage={currentPage}
                pageSize={pageSize}
                totalItems={apiCertificates.length}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            )}
          </div>
          )}
        </div>

        <div>
          <h2 className="text-xl font-black text-foreground mb-4">In Progress Courses</h2>
          <div className="grid md:grid-cols-2 gap-4">
            {apiCourses.filter((c) => c.progress > 0 && c.progress < 1).map((c) => (
              <div key={c.id} className="rounded-2xl border border-border bg-card/90 p-5">
                <div className="flex items-start gap-4">
                  <div className="size-12 rounded-xl bg-background grid place-items-center text-emerald-400 border border-border shrink-0">
                    <Award className="size-5" />
                  </div>
                  <div className="flex-1">
                    <h3 className="text-base font-extrabold leading-tight text-foreground">{c.title}</h3>
                    <p className="text-xs text-muted-foreground mt-1 font-medium">{Math.round(c.progress * 100)}% complete · Pass score: {c.passingScore}%</p>
                    <div className="mt-3 h-2 bg-background rounded-full overflow-hidden border border-border">
                      <div className="h-full bg-emerald-500 rounded-full transition-all" style={{ width: `${c.progress * 100}%` }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* INTERACTIVE CERTIFICATE PREVIEW & DOWNLOAD MODAL */}
      {selectedCert && (
        <div className="fixed inset-0 z-50 bg-background/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
          <div className="bg-card border border-emerald-500/30 rounded-3xl max-w-3xl w-full p-6 sm:p-8 text-foreground shadow-2xl shadow-emerald-950/50 relative">
            <button
              onClick={() => setSelectedCert(null)}
              className="absolute top-4 right-4 p-2 text-muted-foreground hover:text-foreground rounded-full bg-muted hover:bg-muted transition-colors"
            >
              <X className="size-5" />
            </button>

            <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold uppercase tracking-widest mb-4">
              <ShieldCheck className="size-4" /> Official Verified Certificate
            </div>

            {/* Certificate Display Area */}
            <div className="border-4 double border-emerald-600 rounded-2xl p-8 bg-card text-center relative overflow-hidden my-4 shadow-xl">
              <div className="size-16 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto mb-4 shadow-sm">
                <Award className="size-8" />
              </div>

              <span className="text-[10px] font-mono tracking-[0.3em] text-emerald-700 font-extrabold uppercase block mb-1">
                {selectedCert.organization_name || orgName}
              </span>

              <h2 className="text-3xl font-extrabold text-foreground tracking-tight mb-2">
                Certificate of Completion
              </h2>

              <p className="text-xs text-muted-foreground font-medium mb-4">This certifies that</p>

              <h3 className="text-2xl font-bold text-emerald-700 italic mb-4 font-serif">
                {selectedCert.user_name || user?.first_name || user?.username || "Learner"}
              </h3>

              <p className="text-xs text-muted-foreground font-medium mb-2">has successfully completed the course</p>

              <h4 className="text-xl font-extrabold text-foreground mb-6">
                {selectedCert.course_title || selectedCert.title || 'Course Title'}
              </h4>

              <div className="grid grid-cols-2 gap-4 text-xs border-t border-border pt-4 mt-6 text-muted-foreground">
                <div className="text-left">
                  <p className="text-muted-foreground text-[10px] font-semibold">Issued Date</p>
                  <p className="font-bold text-foreground">
                    {selectedCert.issued_at ? new Date(selectedCert.issued_at).toLocaleDateString() : new Date().toLocaleDateString()}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-muted-foreground text-[10px] font-semibold">Authorized Signature</p>
                  {(() => {
                    let sig = selectedCert.certificate_template_html?.match(/<img[^>]+src=["'](data:image\/[^"']+|https?:\/\/[^"']+)["']/i)?.[1];
                    if (!sig && typeof window !== 'undefined') {
                      try {
                        const savedSigs = localStorage.getItem('lams_signatures_library');
                        if (savedSigs) {
                          const parsed = JSON.parse(savedSigs);
                          if (Array.isArray(parsed) && parsed.length > 0) sig = parsed[0].url;
                        }
                      } catch (e) {}
                    }
                    if (!sig || (!sig.startsWith('data:') && !sig.startsWith('http'))) {
                      sig = 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" width="200" height="60"><path d="M10,40 Q30,10 50,35 T90,20 T130,40 T170,15 T190,45" fill="none" stroke="%230f172a" stroke-width="2.5" stroke-linecap="round"/><path d="M30,48 Q70,55 160,42" fill="none" stroke="%23059669" stroke-width="1.8" stroke-linecap="round"/></svg>';
                    }
                    return <img src={sig} alt="Signature" className="h-10 object-contain ml-auto my-1" />;
                  })()}
                  <p className="font-mono font-bold text-emerald-700">
                    {selectedCert.certificate_id || `CERT-${selectedCert.id}`}
                  </p>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setSelectedCert(null)}
                className="px-4 py-2.5 rounded-xl border border-border text-foreground hover:bg-muted text-xs font-semibold transition-colors"
              >
                Close
              </button>
              <button
                onClick={() => handleDownloadPdf(selectedCert)}
                className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-foreground font-bold text-xs shadow-lg shadow-emerald-950 flex items-center gap-2 transition-all"
              >
                <Download className="size-4" /> Download / Print PDF Certificate
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
