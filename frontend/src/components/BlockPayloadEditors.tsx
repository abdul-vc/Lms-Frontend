import React, { useState, useEffect } from "react";
import {
  Upload, Loader2, Plus, Trash2, Check, FileText, Image as ImageIcon,
  Video, Music, Code, AlertTriangle, Table as TableIcon, Sparkles, CheckSquare, GitBranch, Link2, Eye
} from "lucide-react";
import { authFetch, API_BASE } from "@/lib/auth";

interface ReadingPayloadEditorProps {
  blockId: string;
  blockType: string;
  payload: any;
  onSave: () => void;
  onPayloadChange?: (updatedPayload: any) => void;
  showToast: (msg: string, ok?: boolean) => void;
}

export function ReadingPayloadEditor({ blockId, blockType, payload, onSave, onPayloadChange, showToast }: ReadingPayloadEditorProps) {
  const [htmlContent, setHtmlContent] = useState(payload?.html_content || "");
  const [markdownContent, setMarkdownContent] = useState(payload?.markdown_content || "");
  const [metaData, setMetaData] = useState<Record<string, any>>(payload?.meta_data || {});
  const [payloadId, setPayloadId] = useState<number | null>(payload?.id || null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    setHtmlContent(payload?.html_content || "");
    setMarkdownContent(payload?.markdown_content || "");
    setMetaData(payload?.meta_data || {});
    setPayloadId(payload?.id || null);
  }, [blockId, payload?.id]);

  const notifyChange = (newHtml: string, newMeta = metaData, persist = false) => {
    setHtmlContent(newHtml);
    setMetaData(newMeta);
    if (onPayloadChange) {
      onPayloadChange({
        id: payloadId || payload?.id,
        html_content: newHtml,
        markdown_content: newHtml.replace(/<[^>]*>/g, ""),
        meta_data: newMeta,
      });
    }
    if (persist) {
      handleUpdate(newHtml, newMeta);
    }
  };

  const handleUpdate = async (newHtml: string, newMeta = metaData) => {
    setSaving(true);
    try {
      const activeId = payloadId || payload?.id;
      if (activeId) {
        await authFetch(`${API_BASE}/authoring/reading/${activeId}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            html_content: newHtml,
            markdown_content: newHtml.replace(/<[^>]*>/g, ""),
            meta_data: newMeta,
          }),
        });
      } else {
        const res = await authFetch(`${API_BASE}/authoring/reading/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            block: blockId,
            html_content: newHtml,
            markdown_content: newHtml.replace(/<[^>]*>/g, ""),
            meta_data: newMeta,
          }),
        });
        if (res.ok) {
          const created = await res.json();
          setPayloadId(created.id);
        }
      }
      showToast("Content saved ✓");
    } catch (e: any) {
      showToast("Failed to update payload", false);
    } finally {
      setSaving(false);
    }
  };

  const handleFileUpload = async (file: File) => {
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await authFetch(`${API_BASE}/authoring/assets/`, {
        method: "POST",
        body: formData,
      });

      if (res.ok) {
        const asset = await res.json();
        const fileUrl = asset.file.startsWith("http") ? asset.file : `${API_BASE.replace('/api', '')}${asset.file}`;
        const updatedMeta = { ...metaData, url: fileUrl, filename: asset.original_filename };

        let newHtml = htmlContent;
        if (blockType === "image") newHtml = `<img src="${fileUrl}" alt="${asset.original_filename}" className="max-w-full rounded-xl shadow-md" />`;
        else if (blockType === "video") newHtml = `<video src="${fileUrl}" controls className="w-full rounded-xl" />`;
        else if (blockType === "audio") newHtml = `<audio src="${fileUrl}" controls className="w-full" />`;
        else if (blockType === "pdf") newHtml = `<iframe src="${fileUrl}" className="w-full h-96 rounded-xl border border-border" />`;

        notifyChange(newHtml, updatedMeta, true);
        showToast("File uploaded successfully");
      } else {
        showToast("Asset upload failed", false);
      }
    } catch (e: any) {
      showToast(e.message || "Asset upload error", false);
    } finally {
      setUploading(false);
    }
  };

  // ── Render Specific Editors per Block Type ─────────────────────────────

  if (blockType === "heading") {
    const rawText = htmlContent.replace(/<[^>]*>/g, "");
    const matchTag = htmlContent.match(/^<(h[1-6])>/i);
    const levelFromHtml = matchTag ? matchTag[1].toLowerCase() : null;
    const level = levelFromHtml || metaData.level || "h2";

    const updateHeading = (txt: string, tag: string, persist = false) => {
      const newHtml = `<${tag}>${txt}</${tag}>`;
      const updatedMeta = { ...metaData, level: tag };
      notifyChange(newHtml, updatedMeta, persist);
    };

    return (
      <div className="space-y-3 pt-2 border-t border-border">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-foreground uppercase tracking-wider">Heading Text</label>
          {saving && <span className="text-[10px] text-brand font-semibold animate-pulse">Saving to DB...</span>}
        </div>
        <input
          type="text"
          value={rawText}
          onChange={(e) => {
            const txt = e.target.value;
            updateHeading(txt, level, false);
          }}
          onBlur={(e) => {
            const txt = e.target.value;
            updateHeading(txt, level, true);
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              updateHeading((e.target as HTMLInputElement).value, level, true);
            }
          }}
          className="w-full bg-background border border-border rounded-lg p-2 text-sm text-foreground focus:ring-2 focus:ring-brand font-medium"
          placeholder="Enter heading title..."
        />
        <div className="flex items-center gap-2">
          <label className="text-xs text-muted-foreground font-medium">Heading Tag:</label>
          <select
            value={level}
            onChange={(e) => {
              const newTag = e.target.value;
              updateHeading(rawText, newTag, true);
            }}
            className="bg-background border border-border rounded-lg p-1.5 text-xs text-foreground font-semibold"
          >
            <option value="h1">H1 - Main Title</option>
            <option value="h2">H2 - Section Header</option>
            <option value="h3">H3 - Sub Header</option>
            <option value="h4">H4 - Small Header</option>
          </select>
        </div>
      </div>
    );
  }

  if (blockType === "paragraph" || blockType === "quote") {
    return (
      <div className="space-y-3 pt-2 border-t border-border">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
            {blockType === "quote" ? "Quote Text" : "Paragraph Content"}
          </label>
          {saving && <span className="text-[10px] text-brand font-semibold animate-pulse">Saving...</span>}
        </div>
        <textarea
          rows={5}
          value={htmlContent}
          onChange={(e) => notifyChange(e.target.value, metaData, false)}
          onBlur={(e) => notifyChange(e.target.value, metaData, true)}
          className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground focus:ring-2 focus:ring-brand font-sans leading-relaxed"
          placeholder={blockType === "quote" ? "Enter quote text..." : "Type reading paragraph body..."}
        />
        {blockType === "quote" && (
          <div>
            <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Author / Citation</label>
            <input
              type="text"
              value={metaData.author || ""}
              onChange={(e) => {
                const updatedMeta = { ...metaData, author: e.target.value };
                notifyChange(htmlContent, updatedMeta, false);
              }}
              onBlur={(e) => {
                const updatedMeta = { ...metaData, author: e.target.value };
                notifyChange(htmlContent, updatedMeta, true);
              }}
              className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground"
              placeholder="e.g. Dr. Jane Doe, 2026"
            />
          </div>
        )}
      </div>
    );
  }

  if (blockType === "callout") {
    const calloutStyle = metaData.style || "info";
    const rawCallout = htmlContent.replace(/<[^>]*>/g, "");
    return (
      <div className="space-y-3 pt-2 border-t border-border">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-foreground uppercase tracking-wider">Callout Message</label>
          {saving && <span className="text-[10px] text-brand font-semibold animate-pulse">Saving...</span>}
        </div>
        <textarea
          rows={3}
          value={rawCallout}
          onChange={(e) => {
            const txt = e.target.value;
            notifyChange(`<div>${txt}</div>`, metaData, false);
          }}
          onBlur={(e) => {
            const txt = e.target.value;
            notifyChange(`<div>${txt}</div>`, metaData, true);
          }}
          className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground focus:ring-2 focus:ring-brand"
          placeholder="Enter important callout note..."
        />
        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Callout Style</label>
          <select
            value={calloutStyle}
            onChange={(e) => {
              const updatedMeta = { ...metaData, style: e.target.value };
              notifyChange(htmlContent, updatedMeta, true);
            }}
            className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground"
          >
            <option value="info">Info (Blue/Cyan)</option>
            <option value="warning">Warning (Amber/Yellow)</option>
            <option value="success">Success (Green)</option>
            <option value="tip">Pro Tip (Purple)</option>
          </select>
        </div>
      </div>
    );
  }

  if (blockType === "code") {
    const lang = metaData.language || "javascript";
    return (
      <div className="space-y-3 pt-2 border-t border-border">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-foreground uppercase tracking-wider">Code Snippet</label>
          <select
            value={lang}
            onChange={(e) => {
              const updatedMeta = { ...metaData, language: e.target.value };
              notifyChange(htmlContent, updatedMeta, true);
            }}
            className="bg-background border border-border rounded-lg p-1 text-xs text-foreground"
          >
            <option value="javascript">JavaScript / TypeScript</option>
            <option value="python">Python</option>
            <option value="html">HTML / CSS</option>
            <option value="sql">SQL</option>
            <option value="json">JSON</option>
            <option value="bash">Bash / Shell</option>
          </select>
        </div>
        <textarea
          rows={6}
          value={htmlContent}
          onChange={(e) => notifyChange(e.target.value, metaData, false)}
          onBlur={(e) => notifyChange(e.target.value, metaData, true)}
          className="w-full bg-background border border-border rounded-lg p-2.5 font-mono text-xs text-foreground focus:ring-2 focus:ring-brand bg-slate-950/60"
          placeholder="// Type code snippet here..."
        />
      </div>
    );
  }

  if (["image", "video", "audio", "pdf"].includes(blockType)) {
    const currentUrl = metaData.url || "";
    return (
      <div className="space-y-3 pt-2 border-t border-border">
        <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
          {blockType.toUpperCase()} Media Source
        </label>

        {/* File Uploader */}
        <label className="flex flex-col items-center justify-center p-4 border-2 border-dashed border-border hover:border-brand/50 rounded-xl cursor-pointer bg-muted/20 transition-all text-center">
          {uploading ? (
            <div className="flex items-center gap-2 text-xs text-brand font-semibold">
              <Loader2 className="size-4 animate-spin" /> Uploading asset...
            </div>
          ) : (
            <>
              <Upload className="size-5 text-brand mb-1" />
              <span className="text-xs font-bold text-foreground">Click to Upload {blockType.toUpperCase()} File</span>
              <span className="text-[10px] text-muted-foreground mt-0.5">Direct media upload to server storage</span>
            </>
          )}
          <input
            type="file"
            className="hidden"
            accept={
              blockType === "image" ? "image/*" :
              blockType === "video" ? "video/*" :
              blockType === "audio" ? "audio/*" : ".pdf,application/pdf"
            }
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleFileUpload(file);
            }}
          />
        </label>

        {/* URL Fallback Input */}
        <div>
          <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Or Media URL</label>
          <input
            type="url"
            value={currentUrl}
            onChange={(e) => {
              const url = e.target.value;
              const updatedMeta = { ...metaData, url };
              let newHtml = htmlContent;
              if (blockType === "image") newHtml = `<img src="${url}" className="max-w-full rounded-xl" />`;
              else if (blockType === "video") newHtml = `<video src="${url}" controls className="w-full rounded-xl" />`;
              else if (blockType === "audio") newHtml = `<audio src="${url}" controls className="w-full" />`;
              else if (blockType === "pdf") newHtml = `<iframe src="${url}" className="w-full h-96 rounded-xl" />`;
              notifyChange(newHtml, updatedMeta, false);
            }}
            onBlur={(e) => {
              const url = e.target.value;
              const updatedMeta = { ...metaData, url };
              let newHtml = htmlContent;
              if (blockType === "image") newHtml = `<img src="${url}" className="max-w-full rounded-xl" />`;
              else if (blockType === "video") newHtml = `<video src="${url}" controls className="w-full rounded-xl" />`;
              else if (blockType === "audio") newHtml = `<audio src="${url}" controls className="w-full" />`;
              else if (blockType === "pdf") newHtml = `<iframe src="${url}" className="w-full h-96 rounded-xl" />`;
              notifyChange(newHtml, updatedMeta, true);
            }}
            className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground"
            placeholder="https://..."
          />
        </div>

        {/* Preview */}
        {currentUrl && (
          <div className="p-2 rounded-xl border border-border bg-card/60 space-y-1">
            <div className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Media Preview</div>
            {blockType === "image" && <img src={currentUrl} alt="Preview" className="max-h-40 rounded-lg mx-auto object-contain" />}
            {blockType === "video" && <video src={currentUrl} controls className="max-h-40 w-full rounded-lg" />}
            {blockType === "audio" && <audio src={currentUrl} controls className="w-full" />}
            {blockType === "pdf" && <p className="text-xs text-brand font-medium flex items-center gap-1"><FileText className="size-3.5" /> PDF document attached</p>}
          </div>
        )}
      </div>
    );
  }

  if (blockType === "table") {
    return (
      <div className="space-y-3 pt-2 border-t border-border">
        <label className="block text-xs font-bold text-foreground uppercase tracking-wider">Table Content (HTML / Markdown)</label>
        <textarea
          rows={6}
          value={htmlContent}
          onChange={(e) => notifyChange(e.target.value, metaData, false)}
          onBlur={(e) => notifyChange(e.target.value, metaData, true)}
          className="w-full bg-background border border-border rounded-lg p-2.5 font-mono text-xs text-foreground focus:ring-2 focus:ring-brand"
          placeholder="<table>...</table> or markdown table"
        />
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-2 border-t border-border">
      <label className="block text-xs font-bold text-foreground uppercase tracking-wider">Raw Payload Content</label>
      <textarea
        rows={4}
        value={htmlContent}
        onChange={(e) => setHtmlContent(e.target.value)}
        onBlur={() => handleUpdate(htmlContent)}
        className="w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground focus:ring-2 focus:ring-brand"
      />
    </div>
  );
}


// ─── INTERACTION PAYLOAD EDITOR ────────────────────────────────────────────

export function InteractionPayloadEditor({ blockId, payload, onSave, showToast }: { blockId: string; payload: any; onSave: () => void; showToast: (msg: string, ok?: boolean) => void }) {
  const [type, setType] = useState(payload?.interaction_type || "hotspots");
  const [config, setConfig] = useState<Record<string, any>>(payload?.config || { items: [] });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setType(payload?.interaction_type || "hotspots");
    setConfig(payload?.config || { items: [] });
  }, [payload]);

  const handleSave = async (updatedType = type, updatedConfig = config) => {
    setSaving(true);
    try {
      if (payload?.id) {
        await authFetch(`${API_BASE}/authoring/interactions/${payload.id}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ interaction_type: updatedType, config: updatedConfig }),
        });
      } else {
        await authFetch(`${API_BASE}/authoring/interactions/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ block: blockId, interaction_type: updatedType, config: updatedConfig }),
        });
      }
      onSave();
      showToast("Interaction payload saved");
    } catch (e) {
      showToast("Failed to save interaction", false);
    } finally {
      setSaving(false);
    }
  };

  const items = config.items || [];

  const addItem = () => {
    const newItems = [...items, { title: `Item ${items.length + 1}`, content: "Interactive description content" }];
    const newConfig = { ...config, items: newItems };
    setConfig(newConfig);
    handleSave(type, newConfig);
  };

  const updateItem = (index: number, field: string, val: string) => {
    const newItems = items.map((it: any, i: number) => i === index ? { ...it, [field]: val } : it);
    const newConfig = { ...config, items: newItems };
    setConfig(newConfig);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_: any, i: number) => i !== index);
    const newConfig = { ...config, items: newItems };
    setConfig(newConfig);
    handleSave(type, newConfig);
  };

  return (
    <div className="space-y-4 pt-2 border-t border-border">
      <div>
        <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">Widget Type</label>
        <select
          value={type}
          onChange={(e) => {
            const t = e.target.value;
            setType(t);
            handleSave(t, config);
          }}
          className="w-full bg-background border border-border rounded-lg p-2 text-xs font-semibold text-brand"
        >
          <option value="tabs">Tabs Widget</option>
          <option value="accordion">Accordion Widget</option>
          <option value="timeline">Interactive Timeline</option>
          <option value="flashcards">Flashcards</option>
          <option value="hotspots">Interactive Hotspots</option>
          <option value="before_after">Before / After Comparison</option>
          <option value="clickable_cards">Clickable Cards Grid</option>
          <option value="process_flow">Process Step Flow</option>
        </select>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-foreground uppercase tracking-wider">Interactive Items ({items.length})</label>
          <button onClick={addItem} className="flex items-center gap-1 text-xs text-brand font-bold hover:underline">
            <Plus className="size-3.5" /> Add Item
          </button>
        </div>

        {items.map((item: any, idx: number) => (
          <div key={idx} className="p-3 rounded-xl border border-border bg-background space-y-2 relative group">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground uppercase">Item #{idx + 1}</span>
              <button onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-destructive p-1">
                <Trash2 className="size-3.5" />
              </button>
            </div>
            <input
              type="text"
              value={item.title || ""}
              onChange={(e) => updateItem(idx, "title", e.target.value)}
              onBlur={() => handleSave()}
              className="w-full bg-card border border-border rounded-lg p-1.5 text-xs font-semibold text-foreground"
              placeholder="Item Title"
            />
            <textarea
              rows={2}
              value={item.content || ""}
              onChange={(e) => updateItem(idx, "content", e.target.value)}
              onBlur={() => handleSave()}
              className="w-full bg-card border border-border rounded-lg p-1.5 text-xs text-foreground"
              placeholder="Item Body / Description"
            />
          </div>
        ))}
      </div>
    </div>
  );
}


// ─── QUIZ PAYLOAD EDITOR (Knowledge Check) ──────────────────────────────────

export function QuizPayloadEditor({
  blockId,
  questions = [],
  onSave,
  onPayloadChange,
  showToast,
}: {
  blockId: string;
  questions: any[];
  onSave: () => void;
  onPayloadChange?: (updatedQuestions: any[]) => void;
  showToast: (msg: string, ok?: boolean) => void;
}) {
  const [editingIndex, setEditingIndex] = useState(0);
  const q = questions[editingIndex] || null;

  const [prompt, setPrompt] = useState(q?.prompt || "");
  const [qType, setQType] = useState(q?.question_type || "single_choice");
  const [choices, setChoices] = useState<any[]>(q?.choices || []);
  const [points, setPoints] = useState(q?.points || 1);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (q) {
      setPrompt(q.prompt || "");
      setQType(q.question_type || "single_choice");
      setChoices(q.choices || []);
      setPoints(q.points || 1);
    } else {
      setPrompt("");
      setChoices([]);
    }
  }, [q?.id, questions.length, editingIndex]);

  const notifyChange = (updatedQuestions: any[]) => {
    if (onPayloadChange) {
      onPayloadChange(updatedQuestions);
    }
  };

  const updateQuestionLocally = (newPrompt: string, newQType: string, newChoices: any[], persist = false) => {
    setPrompt(newPrompt);
    setQType(newQType);
    setChoices(newChoices);

    const updatedQuestions = questions.map((item, idx) =>
      idx === editingIndex
        ? { ...item, prompt: newPrompt, question_type: newQType, choices: newChoices, points }
        : item
    );

    notifyChange(updatedQuestions);

    if (persist) {
      handleSaveQuestion(newPrompt, newQType, newChoices);
    }
  };

  const handleSaveQuestion = async (
    updatedPrompt = prompt,
    updatedQType = qType,
    updatedChoices = choices
  ) => {
    setSaving(true);
    try {
      if (q?.id) {
        await authFetch(`${API_BASE}/authoring/kc-questions/${q.id}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            prompt: updatedPrompt,
            question_type: updatedQType,
            choices: updatedChoices,
            points,
          }),
        });
        showToast("Question saved ✓");
      } else {
        await handleAddQuestion();
      }
    } catch (e) {
      showToast("Failed to save question", false);
    } finally {
      setSaving(false);
    }
  };

  const handleAddQuestion = async () => {
    setSaving(true);
    try {
      const defaultChoices = [
        { id: `c_${Date.now()}_1`, text: "Option A", is_correct: true },
        { id: `c_${Date.now()}_2`, text: "Option B", is_correct: false }
      ];
      const res = await authFetch(`${API_BASE}/authoring/kc-questions/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          block: blockId,
          prompt: `Question #${questions.length + 1}`,
          question_type: "single_choice",
          choices: defaultChoices,
          points: 1,
        }),
      });

      if (res.ok) {
        showToast("New question added ✓");
        onSave();
        setEditingIndex(questions.length);
      } else {
        const err = await res.json();
        showToast(err.detail || "Failed to add question", false);
      }
    } catch (e: any) {
      showToast("Failed to create question", false);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteQuestion = async (questionId: string | number) => {
    if (!confirm("Delete this question?")) return;
    setSaving(true);
    try {
      const res = await authFetch(`${API_BASE}/authoring/kc-questions/${questionId}/`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast("Question deleted");
        if (editingIndex > 0) setEditingIndex(editingIndex - 1);
        onSave();
      }
    } catch (e) {
      showToast("Failed to delete question", false);
    } finally {
      setSaving(false);
    }
  };

  const toggleChoiceCorrectness = (choiceIndex: number, isChecked: boolean) => {
    let updated: any[];
    if (qType === "single_choice" || qType === "true_false") {
      updated = choices.map((item, idx) => ({
        ...item,
        is_correct: idx === choiceIndex ? isChecked : false
      }));
    } else {
      updated = choices.map((item, idx) =>
        idx === choiceIndex ? { ...item, is_correct: isChecked } : item
      );
    }
    updateQuestionLocally(prompt, qType, updated, true);
  };

  const addChoice = () => {
    const newChoice = { id: `c_${Date.now()}`, text: `Option ${choices.length + 1}`, is_correct: false };
    const updated = [...choices, newChoice];
    updateQuestionLocally(prompt, qType, updated, true);
  };

  return (
    <div className="space-y-4 pt-2 border-t border-border">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-foreground uppercase tracking-wider">Quiz Builder</label>
        <button
          type="button"
          onClick={handleAddQuestion}
          disabled={saving}
          className="text-xs text-amber-400 font-bold hover:underline flex items-center gap-1 disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
          Add Question
        </button>
      </div>

      {/* Question Selector Tabs */}
      {questions.length > 0 && (
        <div className="flex items-center gap-1 overflow-x-auto pb-1 border-b border-border">
          {questions.map((qn, idx) => (
            <div
              key={qn.id || idx}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all ${
                idx === editingIndex
                  ? "bg-amber-500/20 border border-amber-500/40 text-amber-300"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted"
              }`}
              onClick={() => setEditingIndex(idx)}
            >
              <span>Q{idx + 1}</span>
              {questions.length > 1 && idx === editingIndex && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (qn.id) handleDeleteQuestion(qn.id);
                  }}
                  className="hover:text-destructive p-0.5"
                  title="Delete question"
                >
                  <Trash2 className="size-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div>
        <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Question Type</label>
        <select
          value={qType}
          onChange={(e) => updateQuestionLocally(prompt, e.target.value, choices, true)}
          className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground font-semibold"
        >
          <option value="single_choice">Single Choice (Radio)</option>
          <option value="multiple_select">Multiple Select (Checkbox)</option>
          <option value="true_false">True / False</option>
          <option value="fill_blank">Fill in the Blank</option>
        </select>
      </div>

      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-[11px] font-semibold text-muted-foreground">Question Prompt</label>
          {saving && <span className="text-[10px] text-amber-400 font-semibold animate-pulse">Saving...</span>}
        </div>
        <textarea
          rows={3}
          value={prompt}
          onChange={(e) => updateQuestionLocally(e.target.value, qType, choices, false)}
          onBlur={(e) => updateQuestionLocally(e.target.value, qType, choices, true)}
          className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:ring-2 focus:ring-amber-400 font-medium"
          placeholder="Type assessment question prompt..."
        />
      </div>

      {/* Choices Builder */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-[11px] font-semibold text-muted-foreground">Answer Choices</label>
          <button type="button" onClick={addChoice} className="text-[10px] text-brand font-semibold hover:underline">+ Add Choice</button>
        </div>

        {choices.map((c: any, i: number) => (
          <div key={c.id || i} className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={c.is_correct || false}
              onChange={(e) => toggleChoiceCorrectness(i, e.target.checked)}
              className="accent-emerald-500 size-4 cursor-pointer"
              title="Mark as correct answer"
            />
            <input
              type="text"
              value={c.text || ""}
              onChange={(e) => {
                const updated = choices.map((item, idx) => idx === i ? { ...item, text: e.target.value } : item);
                updateQuestionLocally(prompt, qType, updated, false);
              }}
              onBlur={(e) => {
                const updated = choices.map((item, idx) => idx === i ? { ...item, text: e.target.value } : item);
                updateQuestionLocally(prompt, qType, updated, true);
              }}
              className="flex-1 bg-background border border-border rounded-lg p-1.5 text-xs text-foreground"
              placeholder={`Option #${i + 1}`}
            />
            <button
              type="button"
              onClick={() => {
                const updated = choices.filter((_, idx) => idx !== i);
                updateQuestionLocally(prompt, qType, updated, true);
              }}
              className="text-muted-foreground hover:text-destructive p-1"
            >
              <Trash2 className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}


// ─── SCENARIO PAYLOAD EDITOR (Branching Simulation) ───────────────────────

export function ScenarioPayloadEditor({ blockId, nodes = [], onSave, showToast }: { blockId: string; nodes: any[]; onSave: () => void; showToast: (msg: string, ok?: boolean) => void }) {
  const startNode = nodes.find(n => n.is_start_node) || nodes[0];
  const [title, setTitle] = useState(startNode?.title || "Decision Node 1");
  const [content, setContent] = useState(startNode?.content || "Branching scenario narrative text...");
  const [choices, setChoices] = useState<any[]>(startNode?.choices || []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (startNode) {
      setTitle(startNode.title || "");
      setContent(startNode.content || "");
      setChoices(startNode.choices || []);
    }
  }, [startNode]);

  const handleSaveNode = async () => {
    setSaving(true);
    try {
      if (startNode?.id) {
        await authFetch(`${API_BASE}/authoring/scenario-nodes/${startNode.id}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, content, choices }),
        });
      } else {
        await authFetch(`${API_BASE}/authoring/scenario-nodes/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            block: blockId,
            title: title || "Start Decision Point",
            content: content || "Scenario narrative content",
            is_start_node: true,
            choices,
          }),
        });
      }
      onSave();
      showToast("Scenario node saved");
    } catch (e) {
      showToast("Failed to save scenario node", false);
    } finally {
      setSaving(false);
    }
  };

  const addChoiceOption = () => {
    const newChoice = { text: "Option Action", target_node_id: null };
    const updated = [...choices, newChoice];
    setChoices(updated);
  };

  return (
    <div className="space-y-4 pt-2 border-t border-border">
      <label className="block text-xs font-bold text-foreground uppercase tracking-wider">Scenario Builder</label>
      <div>
        <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Decision Point Title</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={handleSaveNode}
          className="w-full bg-background border border-border rounded-lg p-2 text-xs font-bold text-foreground"
          placeholder="e.g. Critical Choice #1"
        />
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Scenario Narrative</label>
        <textarea
          rows={4}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={handleSaveNode}
          className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground"
          placeholder="Describe the situation for the learner..."
        />
      </div>

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="block text-[11px] font-semibold text-muted-foreground">Decision Choices</label>
          <button onClick={addChoiceOption} className="text-[10px] text-teal-400 font-semibold hover:underline">+ Add Choice</button>
        </div>

        {choices.map((c: any, i: number) => (
          <div key={i} className="p-2.5 rounded-lg border border-border bg-background space-y-1.5">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-muted-foreground">Choice #{i + 1}</span>
              <button
                onClick={() => {
                  const updated = choices.filter((_, idx) => idx !== i);
                  setChoices(updated);
                  handleSaveNode();
                }}
                className="text-muted-foreground hover:text-destructive p-0.5"
              >
                <Trash2 className="size-3" />
              </button>
            </div>
            <input
              type="text"
              value={c.text || ""}
              onChange={(e) => {
                const updated = choices.map((item, idx) => idx === i ? { ...item, text: e.target.value } : item);
                setChoices(updated);
              }}
              onBlur={handleSaveNode}
              className="w-full bg-card border border-border rounded-md p-1 text-xs text-foreground"
              placeholder="Choice text option..."
            />
          </div>
        ))}
      </div>
    </div>
  );
}
