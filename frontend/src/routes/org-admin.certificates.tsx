import { createFileRoute } from '@tanstack/react-router';
import { useState, useEffect, useRef } from 'react';
import { authFetch, useAuth, API_BASE } from '@/lib/auth';
import { Award, Plus, Loader2, AlertCircle, FileText, Pencil, Trash2, CheckCircle2, Eye, Sparkles, Upload, BookOpen, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { PaginationControls } from '@/components/ui/PaginationControls';

export const Route = createFileRoute('/org-admin/certificates')({
  component: CertificatesPage,
});

interface CertificateTemplate {
  id: number;
  title: string;
  body_html: string;
  created_at: string;
  assigned_courses: { id: number; title: string; status: string }[];
}

interface OrgCourse {
  id: number;
  title: string;
  status: 'draft' | 'published' | 'archived';
}


interface SignatureItem {
  id: string;
  name: string;
  url: string;
}

const DEFAULT_SIGNATURES: SignatureItem[] = [
  {
    id: 'sig-1',
    name: 'Executive Signature 1',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" width="200" height="60"><path d="M10,40 Q30,10 50,35 T90,20 T130,40 T170,15 T190,45" fill="none" stroke="%230f172a" stroke-width="2.5" stroke-linecap="round"/><path d="M30,48 Q70,55 160,42" fill="none" stroke="%23059669" stroke-width="1.8" stroke-linecap="round"/></svg>',
  },
  {
    id: 'sig-2',
    name: 'Director Signature 2',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" width="200" height="60"><path d="M15,25 C40,5 30,55 60,30 C90,5 80,50 120,25 C150,5 170,45 185,20" fill="none" stroke="%230f172a" stroke-width="2.2" stroke-linecap="round"/><path d="M20,45 L180,40" fill="none" stroke="%230f172a" stroke-width="1.5"/></svg>',
  },
  {
    id: 'sig-3',
    name: 'Board Signature 3',
    url: 'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 60" width="200" height="60"><path d="M20,35 Q50,5 70,30 T120,15 T160,35" fill="none" stroke="%23047857" stroke-width="2.5" stroke-linecap="round"/><path d="M10,45 C60,50 120,40 185,48" fill="none" stroke="%23047857" stroke-width="1.5"/></svg>',
  },
];

function CertificatesPage() {
  const [templates, setTemplates] = useState<CertificateTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const { user } = useAuth();


  const isSuperOrAdmin = Boolean(user?.is_platform_super_admin || user?.role?.is_admin_role);
  const canCreate = isSuperOrAdmin || Boolean(user?.role?.can_create_certificates || user?.role?.can_manage_certificates);
  const canEdit = isSuperOrAdmin || Boolean(user?.role?.can_edit_certificates || user?.role?.can_manage_certificates);
  const canDelete = isSuperOrAdmin || Boolean(user?.role?.can_delete_certificates || user?.role?.can_manage_certificates);

  // Signature state
  const [signatureList, setSignatureList] = useState<SignatureItem[]>(DEFAULT_SIGNATURES);
  const [selectedSignatureUrl, setSelectedSignatureUrl] = useState<string>(DEFAULT_SIGNATURES[0].url);
  const [isDrawModalOpen, setIsDrawModalOpen] = useState(false);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<CertificateTemplate | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    cert_title: 'Certificate of Completion',
    body_text: 'This certifies that {{employee_name}} has successfully completed the course {{course_title}}.',
    signatory_title: 'Director of Education',
  });
  const [selectedCourseIds, setSelectedCourseIds] = useState<number[]>([]);
  const [orgCourses, setOrgCourses] = useState<OrgCourse[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);


  const handleSignatureUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (dataUrl) {
        const newSig: SignatureItem = {
          id: `custom-sig-${Date.now()}`,
          name: file.name.replace(/\.[^/.]+$/, "") || "Uploaded Signature",
          url: dataUrl,
        };
        const newList = [newSig, ...signatureList];
        setSignatureList(newList);
        setSelectedSignatureUrl(dataUrl);
        if (typeof window !== 'undefined') {
          localStorage.setItem('custom_signatures', JSON.stringify(newList));
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveDrawnSignature = (dataUrl: string, name: string) => {
    const newSig: SignatureItem = {
      id: `drawn-sig-${Date.now()}`,
      name: name || "Drawn Signature",
      url: dataUrl,
    };
    const newList = [newSig, ...signatureList];
    setSignatureList(newList);
    setSelectedSignatureUrl(dataUrl);
    if (typeof window !== 'undefined') {
      localStorage.setItem('custom_signatures', JSON.stringify(newList));
    }
    setIsDrawModalOpen(false);
  };

  const handleDeleteSignature = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const updated = signatureList.filter((s) => s.id !== id);
    setSignatureList(updated);
    if (typeof window !== 'undefined') {
      localStorage.setItem('custom_signatures', JSON.stringify(updated));
    }
    if (selectedSignatureUrl && signatureList.find((s) => s.id === id)?.url === selectedSignatureUrl) {
      setSelectedSignatureUrl(updated[0]?.url || '');
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('custom_signatures');
      if (saved) {
        try {
          setSignatureList(JSON.parse(saved));
        } catch (e) { console.error(e); }
      }
    }
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const res = await authFetch(`${API_BASE}/certificate-templates/`);
      if (res.ok) {
        setTemplates(await res.json());
      } else {
        throw new Error("Failed to load certificates.");
      }
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchOrgCourses = async () => {
    setCoursesLoading(true);
    try {
      const res = await authFetch(`${API_BASE}/courses/`);
      if (res.ok) {
        const data: OrgCourse[] = await res.json();
        setOrgCourses(data.filter(c => c.status === 'draft' || c.status === 'published'));
      }
    } catch (e) {
      console.error('Failed to fetch org courses', e);
    } finally {
      setCoursesLoading(false);
    }
  };

  const openAddModal = () => {
    setEditingTemplate(null);
    setFormData({
      title: '',
      cert_title: 'Certificate of Completion',
      body_text: 'This certifies that {{employee_name}} has successfully completed the course {{course_title}}.',
      signatory_title: 'Director of Education',
    });
    setSelectedCourseIds([]);
    setModalError(null);
    setIsModalOpen(true);
    fetchOrgCourses();
  };

  const openEditModal = (t: CertificateTemplate) => {
    setEditingTemplate(t);
    const div = document.createElement('div');
    div.innerHTML = t.body_html;
    const h1 = div.querySelector('h1')?.innerText || 'Certificate of Completion';
    const p = div.querySelector('p')?.innerText || t.body_html;

    setFormData({
      title: t.title,
      cert_title: h1,
      body_text: p,
      signatory_title: 'Director of Education',
    });
    setSelectedCourseIds((t.assigned_courses || []).map(c => c.id));
    setModalError(null);
    setIsModalOpen(true);
    fetchOrgCourses();
  };


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setModalError(null);

    const signatureImageHtml = selectedSignatureUrl
      ? `<img src="${selectedSignatureUrl}" alt="Signature" style="height: 44px; object-fit: contain; margin: 0 auto 4px auto; display: block;" />`
      : '';

    const formattedBodyHtml = `
      <div style="text-align: center; padding: 40px; font-family: serif; background: #ffffff; color: #0f172a;">
        <h1 style="font-size: 28px; font-weight: bold; margin-bottom: 20px; color: #0f172a;">${formData.cert_title}</h1>
        <p style="font-size: 16px; color: #334155; margin-bottom: 30px;">${formData.body_text}</p>
        <div style="margin-top: 50px; display: flex; justify-content: space-between; align-items: flex-end;">
          <div style="text-align: left;">
            <p style="font-size: 10px; color: #64748b; letter-spacing: 1px;">DATE</p>
            <p style="font-weight: bold; font-size: 14px;">${new Date().toLocaleDateString()}</p>
          </div>
          <div style="text-align: right;">
            <p style="font-size: 10px; color: #64748b; letter-spacing: 1px;">SIGNATURE</p>
            ${signatureImageHtml}
            <p style="font-weight: bold; font-style: italic; font-size: 14px;">${formData.signatory_title}</p>
          </div>
        </div>
      </div>
    `;

    try {
      const url = editingTemplate
        ? `${API_BASE}/certificate-templates/${editingTemplate.id}/`
        : `${API_BASE}/certificate-templates/`;

      const res = await authFetch(url, {
        method: editingTemplate ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: formData.title,
          body_html: formattedBodyHtml,
          course_ids: selectedCourseIds,
        }),
      });


      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.detail || "Save failed");
      }

      await fetchTemplates();
      setIsModalOpen(false);
    } catch (err: any) {
      setModalError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (t: CertificateTemplate) => {
    if (!confirm(`Are you sure you want to delete template "${t.title}"?`)) return;

    try {
      const res = await authFetch(`${API_BASE}/certificate-templates/${t.id}/`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error("Delete failed");
      setTemplates(templates.filter((x) => x.id !== t.id));
    } catch (e: any) {
      alert(e.message);
    }
  };

  const canManage = user?.is_platform_super_admin || user?.role?.can_manage_certificates;

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="size-8 animate-spin text-emerald-600" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground mb-1">Certificate Templates</h1>
          <p className="text-sm text-foreground font-medium">Design and manage certificates awarded upon course completion.</p>
        </div>
        {canCreate && (
          <button
            onClick={openAddModal}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-foreground rounded-lg hover:bg-emerald-700 transition-colors text-sm font-medium shadow-sm"
          >
            <Plus className="size-4" /> New Certificate Template
          </button>
        )}
      </div>

      {error && (
        <div className="mb-6 p-4 bg-red-50 text-red-600 rounded-lg text-sm flex gap-3 items-start border border-red-100">
          <AlertCircle className="size-5 shrink-0" />
          <p className="mt-0.5">{error}</p>
        </div>
      )}

      <div className="space-y-6">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {templates.length === 0 ? (
            <div className="col-span-full p-12 text-center text-muted-foreground bg-card rounded-2xl border border-border shadow-sm">
              <Award className="size-12 mx-auto text-foreground mb-3" />
              <h3 className="font-semibold text-slate-800 text-base mb-1">No Certificate Templates Found</h3>
              <p className="text-xs text-muted-foreground mb-4">Create your first certificate template to start rewarding course graduates.</p>
              {canCreate && (
                <button
                  onClick={openAddModal}
                  className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-foreground rounded-lg hover:bg-emerald-700 transition-colors text-xs font-semibold"
                >
                  <Plus className="size-4" /> Add Template
                </button>
              )}
            </div>
          ) : (
            templates.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((template) => (
              <div key={template.id} className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden flex flex-col hover:shadow-md transition-shadow">
                <div className="p-6 flex-1">
                  <div className="size-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-4">
                    <Award className="size-5" />
                  </div>
                  <h3 className="font-bold text-foreground truncate mb-1 text-base">{template.title}</h3>
                  <p className="text-xs text-muted-foreground">
                    Created {new Date(template.created_at).toLocaleDateString()}
                  </p>
                  {/* Assigned Courses */}
                  {(template.assigned_courses || []).length > 0 && (
                    <div className="mt-3">
                      <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-1.5">Assigned Courses</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(template.assigned_courses || []).map(c => (
                          <span key={c.id} className="inline-flex items-center gap-1 text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-2 py-0.5">
                            <BookOpen className="size-2.5" />{c.title}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                  <div className="mt-4 p-3 bg-muted/50 rounded-xl border border-border/50 text-[11px] font-mono text-muted-foreground max-h-24 overflow-hidden">
                    {template.body_html.replace(/<[^>]*>/g, ' ')}
                  </div>
                </div>

                <div className="px-6 py-4 border-t border-border/50 bg-muted/50/50 flex justify-between items-center">
                  <span className="inline-flex items-center gap-1.5 text-xs font-semibold text-muted-foreground">
                    <FileText className="size-3.5 text-muted-foreground" /> HTML Template
                  </span>
                  <div className="flex items-center gap-2">
                    {canEdit && (
                      <button
                        onClick={() => openEditModal(template)}
                        className="text-emerald-600 hover:text-emerald-700 text-xs font-bold flex items-center gap-1 transition-colors p-1.5 hover:bg-emerald-50 rounded-lg"
                        title="Edit Template"
                      >
                        <Pencil className="size-3.5" /> Edit
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(template)}
                        className="text-muted-foreground hover:text-red-600 text-xs font-bold flex items-center gap-1 transition-colors p-1.5 hover:bg-red-50 rounded-lg"
                        title="Delete Template"
                      >
                        <Trash2 className="size-3.5" /> Delete
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {templates.length > 0 && (
          <div className="bg-card rounded-2xl border border-border px-4 py-2">
            <PaginationControls
              currentPage={currentPage}
              pageSize={pageSize}
              totalItems={templates.length}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
            />
          </div>
        )}
      </div>

      {/* --- CERTIFICATE TEMPLATE DESIGNER MODAL WITH LIVE PREVIEW --- */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-card/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-card rounded-3xl shadow-2xl w-full max-w-5xl my-8 overflow-hidden border border-border/50">
            <div className="px-8 py-5 border-b border-border/50 flex justify-between items-center bg-muted/50/50">
              <div className="flex items-center gap-2">
                <Sparkles className="size-5 text-emerald-600" />
                <h2 className="font-bold text-foreground text-lg">
                  {editingTemplate ? 'Edit Certificate Template' : 'New Certificate Template'}
                </h2>
              </div>
              <button onClick={() => setIsModalOpen(false)} className="text-muted-foreground hover:text-muted-foreground text-sm font-semibold">
                ✕
              </button>
            </div>

            <div className="grid lg:grid-cols-12">
              {/* Left Form Panel */}
              <form onSubmit={handleSubmit} className="lg:col-span-5 p-6 md:p-8 space-y-4 border-r border-border/50 bg-card">
                {modalError && (
                  <div className="p-3 bg-red-50 text-red-600 rounded-lg text-xs flex gap-2 items-start border border-red-100">
                    <AlertCircle className="size-4 shrink-0 mt-0.5" />
                    <p>{modalError}</p>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Template Name *</label>
                  <input
                    required
                    type="text"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    placeholder="e.g. Standard Completion Template"
                    className="w-full px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground bg-card font-medium border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Certificate Title</label>
                  <input
                    type="text"
                    value={formData.cert_title}
                    onChange={(e) => setFormData({ ...formData, cert_title: e.target.value })}
                    placeholder="Certificate of Completion"
                    className="w-full px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground bg-card font-medium border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Body Text</label>
                  <textarea
                    rows={4}
                    value={formData.body_text}
                    onChange={(e) => setFormData({ ...formData, body_text: e.target.value })}
                    className="w-full px-3 py-2 text-xs text-foreground placeholder:text-muted-foreground bg-card font-medium border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                  <p className="text-[10px] text-muted-foreground mt-1">
                    Use placeholders: <code>{"{{employee_name}}"}</code> or <code>{"{{course_title}}"}</code>.
                  </p>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">Signatory Title</label>
                  <input
                    type="text"
                    value={formData.signatory_title}
                    onChange={(e) => setFormData({ ...formData, signatory_title: e.target.value })}
                    placeholder="Director of Education"
                    className="w-full px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground bg-card font-medium border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                {/* Course Selection */}
                <div>
                  <label className="block text-xs font-semibold text-muted-foreground mb-1">
                    Select Courses
                    <span className="ml-1 text-muted-foreground/60 font-normal">(Draft & Published)</span>
                  </label>
                  {coursesLoading ? (
                    <div className="flex items-center gap-2 py-3 text-xs text-muted-foreground">
                      <Loader2 className="size-3.5 animate-spin" /> Loading courses…
                    </div>
                  ) : orgCourses.length === 0 ? (
                    <p className="text-xs text-muted-foreground py-2">No draft or published courses found in this organization.</p>
                  ) : (
                    <div className="max-h-40 overflow-y-auto border border-border rounded-lg divide-y divide-border">
                      {orgCourses.map(course => {
                        const checked = selectedCourseIds.includes(course.id);
                        return (
                          <label
                            key={course.id}
                            className={cn(
                              'flex items-center gap-2.5 px-3 py-2 cursor-pointer hover:bg-muted/40 transition-colors text-xs',
                              checked && 'bg-emerald-50'
                            )}
                          >
                            <input
                              type="checkbox"
                              className="accent-emerald-600 size-3.5 shrink-0"
                              checked={checked}
                              onChange={() => {
                                setSelectedCourseIds(prev =>
                                  checked ? prev.filter(id => id !== course.id) : [...prev, course.id]
                                );
                              }}
                            />
                            <span className={cn('font-medium truncate flex-1', checked ? 'text-emerald-700' : 'text-foreground')}>
                              {course.title}
                            </span>
                            <span className={cn(
                              'text-[9px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded-full shrink-0',
                              course.status === 'published'
                                ? 'bg-emerald-100 text-emerald-700'
                                : 'bg-amber-100 text-amber-700'
                            )}>
                              {course.status}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  )}
                  {selectedCourseIds.length > 0 && (
                    <p className="text-[10px] text-emerald-600 font-semibold mt-1">
                      {selectedCourseIds.length} course{selectedCourseIds.length > 1 ? 's' : ''} selected
                    </p>
                  )}
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold text-muted-foreground">Signature Image</label>
                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer text-[11px] font-bold text-emerald-600 hover:text-emerald-700 flex items-center gap-1">
                        <Upload className="size-3" /> Upload File
                        <input type="file" accept="image/*" className="hidden" onChange={handleSignatureUpload} />
                      </label>
                      <button
                        type="button"
                        onClick={() => setIsDrawModalOpen(true)}
                        className="text-[11px] font-bold text-indigo-600 hover:text-indigo-700 flex items-center gap-1"
                      >
                        <Pencil className="size-3" /> Draw Signature
                      </button>
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-2.5 max-h-36 overflow-y-auto p-1.5 bg-muted/50 border border-border rounded-xl">
                    {signatureList.map((sig) => (
                      <div
                        key={sig.id}
                        onClick={() => setSelectedSignatureUrl(sig.url)}
                        className={cn(
                          "cursor-pointer p-2 rounded-lg bg-card border transition-all text-center flex flex-col items-center justify-center relative shadow-2xs group/sig",
                          selectedSignatureUrl === sig.url
                            ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm"
                            : "border-border hover:border-slate-300"
                        )}
                      >
                        {signatureList.length > 1 && (
                          <button
                            type="button"
                            onClick={(e) => handleDeleteSignature(sig.id, e)}
                            className="absolute top-1 left-1 p-1 text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-md transition-colors opacity-0 group-hover/sig:opacity-100 z-10"
                            title="Delete signature"
                          >
                            <Trash2 className="size-3" />
                          </button>
                        )}
                        <img src={sig.url} alt={sig.name} className="h-7 object-contain mb-1" />
                        <span className="text-[9px] font-semibold text-muted-foreground truncate w-full">{sig.name}</span>
                        {selectedSignatureUrl === sig.url && (
                          <div className="absolute top-1 right-1 size-3.5 bg-emerald-600 text-foreground rounded-full grid place-items-center text-[8px] font-bold">
                            ✓
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-4 border-t border-border/50 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 text-xs font-semibold text-muted-foreground hover:text-foreground bg-muted hover:bg-slate-200 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={submitting}
                    className="px-5 py-2 text-xs font-semibold text-foreground bg-emerald-600 hover:bg-emerald-700 rounded-lg transition-colors flex items-center gap-2 disabled:opacity-50"
                  >
                    {submitting && <Loader2 className="size-3.5 animate-spin" />}
                    Create Template
                  </button>
                </div>
              </form>

              {/* Right Live Certificate Preview Panel (Matching Reference Page 4) */}
              <div className="lg:col-span-7 p-6 md:p-8 bg-muted/50 flex flex-col justify-center items-center">
                <div className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-4 flex items-center gap-1.5">
                  <Eye className="size-4" /> Live Certificate Preview
                </div>

                {/* Certificate Frame */}
                <div className="w-full bg-card p-8 md:p-12 rounded-2xl shadow-xl border-4 border-double border-border text-center relative overflow-hidden">
                  <div className="size-12 rounded-full bg-amber-50 text-amber-600 border border-amber-200 grid place-items-center mx-auto mb-4 shadow-sm">
                    <Award className="size-6" />
                  </div>
                  
                  <h3 className="text-2xl font-serif font-bold text-foreground tracking-wide mb-4">
                    {formData.cert_title || 'Certificate of Completion'}
                  </h3>

                  <p className="text-sm text-muted-foreground font-serif max-w-md mx-auto leading-relaxed mb-8">
                    {formData.body_text
                      .replace('{{employee_name}}', 'John Doe')
                      .replace('{{course_title}}', 'Advanced Professional Training')}
                  </p>

                  <div className="pt-6 border-t border-border grid grid-cols-2 gap-8 text-center text-xs">
                    <div>
                      <p className="text-[10px] text-muted-foreground font-mono tracking-widest uppercase mb-1">DATE</p>
                      <p className="font-semibold text-slate-800">{new Date().toLocaleDateString()}</p>
                    </div>
                    <div>
                      <p className="text-[10px] text-muted-foreground font-mono tracking-widest uppercase mb-1">SIGNATURE</p>
                      {selectedSignatureUrl && (
                        <img src={selectedSignatureUrl} alt="Signature" className="h-10 object-contain mx-auto mb-1" />
                      )}
                      <p className="font-serif font-bold text-slate-800 italic">{formData.signatory_title || 'Director'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- DRAW SIGNATURE MODAL --- */}
      {isDrawModalOpen && (
        <SignatureDrawerModal
          onClose={() => setIsDrawModalOpen(false)}
          onSave={handleSaveDrawnSignature}
        />
      )}
    </div>
  );
}

function SignatureDrawerModal({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: (dataUrl: string, name: string) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [sigName, setSigName] = useState('My Live Signature');
  const [isEmpty, setIsEmpty] = useState(true);

  const getCoordinates = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    setIsDrawing(true);
    setIsEmpty(false);
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCoordinates(e);
    ctx.strokeStyle = '#0f172a';
    ctx.lineWidth = 2.5;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || isEmpty) return;
    const dataUrl = canvas.toDataURL('image/png');
    onSave(dataUrl, sigName);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-card/60 backdrop-blur-sm p-4">
      <div className="bg-card rounded-2xl shadow-2xl w-full max-w-md p-6 border border-border/50">
        <div className="flex justify-between items-center mb-4">
          <h3 className="font-bold text-foreground text-base flex items-center gap-2">
            <Pencil className="size-4 text-emerald-600" /> Draw Live Signature
          </h3>
          <button onClick={onClose} className="text-muted-foreground hover:text-muted-foreground text-sm font-semibold">✕</button>
        </div>

        <div className="mb-3">
          <label className="block text-xs font-semibold text-muted-foreground mb-1">Signature Label</label>
          <input
            type="text"
            value={sigName}
            onChange={(e) => setSigName(e.target.value)}
            className="w-full px-3 py-1.5 text-xs text-foreground bg-card border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 font-medium"
          />
        </div>

        <div className="border border-slate-300 rounded-xl bg-card relative overflow-hidden mb-4 touch-none shadow-inner">
          <canvas
            ref={canvasRef}
            width={400}
            height={160}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            className="w-full h-40 cursor-crosshair bg-card"
          />
          {isEmpty && (
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center text-xs text-muted-foreground font-medium italic">
              Sign here using mouse or touchpad…
            </div>
          )}
        </div>

        <div className="flex justify-between items-center">
          <button
            type="button"
            onClick={clearCanvas}
            className="px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
          >
            Clear Canvas
          </button>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 text-xs font-semibold text-muted-foreground bg-muted hover:bg-slate-200 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={isEmpty}
              onClick={handleSave}
              className="px-4 py-1.5 text-xs font-semibold text-foreground bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-lg transition-colors shadow-sm"
            >
              Save Signature
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

