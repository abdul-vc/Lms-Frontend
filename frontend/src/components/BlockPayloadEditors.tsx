import React, { useState, useEffect } from "react";
import {
  Upload, Loader2, Plus, Trash2, Check, FileText, Image as ImageIcon,
  Video, Music, Code, AlertTriangle, Table as TableIcon, Sparkles, CheckSquare, GitBranch, Link2, Eye, MapPin, RotateCw
} from "lucide-react";
import { authFetch, API_BASE, normalizeUrl } from "@/lib/auth";
import { parseCsvToTable, tableToCsv, generateTableHtml, type StructuredTableData } from "@/lib/table-utils";

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
        const relativePath = asset.path ? `/api/media/${asset.path}` : (asset.file?.startsWith('/api/media/') ? asset.file : `/api/media/${(asset.file || '').replace(/^.*\/media\//, '')}`);
        const updatedMeta = { ...metaData, url: relativePath, filename: asset.original_filename };

        let newHtml = htmlContent;
        if (blockType === "image") newHtml = `<img src="${relativePath}" alt="${asset.original_filename}" className="max-w-full rounded-xl shadow-md" />`;
        else if (blockType === "video") newHtml = `<video src="${relativePath}" controls className="w-full rounded-xl" />`;
        else if (blockType === "audio") newHtml = `<audio src="${relativePath}" controls className="w-full" />`;
        else if (blockType === "pdf") newHtml = `<iframe src="${relativePath}" className="w-full h-96 rounded-xl border border-border" />`;

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
      <div className="space-y-3 pt-2 border-t border-border min-w-0 max-w-full">
        <div className="flex items-center justify-between">
          <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
            {blockType === "quote" ? "Quote Text" : "Paragraph Content"}
          </label>
          {saving && <span className="text-[10px] text-brand font-semibold animate-pulse">Saving...</span>}
        </div>
        <textarea
          rows={6}
          value={htmlContent}
          onChange={(e) => notifyChange(e.target.value, metaData, false)}
          onBlur={(e) => notifyChange(e.target.value, metaData, true)}
          className="w-full min-w-0 max-w-full bg-background border border-border rounded-lg p-2.5 text-xs text-foreground focus:ring-2 focus:ring-brand font-sans leading-relaxed resize-y break-words"
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
            {blockType === "image" && <img src={normalizeUrl(currentUrl)} alt="Preview" className="max-h-40 rounded-lg mx-auto object-contain" />}
            {blockType === "video" && <video src={normalizeUrl(currentUrl)} controls className="max-h-40 w-full rounded-lg" />}
            {blockType === "audio" && <audio src={normalizeUrl(currentUrl)} controls className="w-full" />}
            {blockType === "pdf" && <p className="text-xs text-brand font-medium flex items-center gap-1"><FileText className="size-3.5" /> PDF document attached</p>}
          </div>
        )}
      </div>
    );
  }

  if (blockType === "table") {
    return (
      <TableBlockPayloadEditor
        metaData={metaData}
        htmlContent={htmlContent}
        markdownContent={markdownContent}
        notifyChange={notifyChange}
        saving={saving}
        showToast={showToast}
      />
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

// ─── STRUCTURED TABLE BLOCK EDITOR ──────────────────────────────────────────

function TableBlockPayloadEditor({
  metaData,
  htmlContent,
  markdownContent,
  notifyChange,
  saving,
  showToast,
}: {
  metaData: Record<string, any>;
  htmlContent: string;
  markdownContent: string;
  notifyChange: (newHtml: string, newMeta: any, persist?: boolean) => void;
  saving: boolean;
  showToast: (msg: string, ok?: boolean) => void;
}) {
  const [tableData, setTableData] = useState<StructuredTableData>(() => {
    if (metaData?.table_data && Array.isArray(metaData.table_data.headers) && Array.isArray(metaData.table_data.rows)) {
      return metaData.table_data;
    }
    const raw = htmlContent || markdownContent || "";
    return parseCsvToTable(raw);
  });

  const [showCsvMode, setShowCsvMode] = useState(false);
  const [csvText, setCsvText] = useState("");

  useEffect(() => {
    if (metaData?.table_data && Array.isArray(metaData.table_data.headers) && Array.isArray(metaData.table_data.rows)) {
      setTableData(metaData.table_data);
    }
  }, [metaData?.table_data]);

  const updateTable = (newData: StructuredTableData, persist = false) => {
    setTableData(newData);
    const newHtml = generateTableHtml(newData);
    const newMeta = { ...metaData, table_data: newData };
    notifyChange(newHtml, newMeta, persist);
  };

  const handleHeaderChange = (idx: number, val: string, persist = false) => {
    const nextHeaders = [...tableData.headers];
    nextHeaders[idx] = val;
    updateTable({ ...tableData, headers: nextHeaders }, persist);
  };

  const handleCellChange = (rIdx: number, cIdx: number, val: string, persist = false) => {
    const nextRows = tableData.rows.map((row, r) => {
      if (r !== rIdx) return row;
      const nextRow = [...row];
      nextRow[cIdx] = val;
      return nextRow;
    });
    updateTable({ ...tableData, rows: nextRows }, persist);
  };

  const handleAddColumn = () => {
    const nextHeaders = [...tableData.headers, `Column ${tableData.headers.length + 1}`];
    const nextRows = tableData.rows.map(r => [...r, ""]);
    updateTable({ headers: nextHeaders, rows: nextRows }, true);
    showToast("Column added ✓");
  };

  const handleDeleteColumn = (colIdx: number) => {
    if (tableData.headers.length <= 1) {
      showToast("Table must have at least one column", false);
      return;
    }
    const nextHeaders = tableData.headers.filter((_, i) => i !== colIdx);
    const nextRows = tableData.rows.map(r => r.filter((_, i) => i !== colIdx));
    updateTable({ headers: nextHeaders, rows: nextRows }, true);
    showToast("Column removed");
  };

  const handleAddRow = () => {
    const newRow = new Array(tableData.headers.length).fill("");
    updateTable({ ...tableData, rows: [...tableData.rows, newRow] }, true);
    showToast("Row added ✓");
  };

  const handleDeleteRow = (rowIdx: number) => {
    if (tableData.rows.length <= 1) {
      showToast("Table must have at least one row", false);
      return;
    }
    const nextRows = tableData.rows.filter((_, i) => i !== rowIdx);
    updateTable({ ...tableData, rows: nextRows }, true);
    showToast("Row removed");
  };

  const handleApplyCsv = () => {
    if (!csvText.trim()) {
      showToast("Please enter or paste CSV content", false);
      return;
    }
    const parsed = parseCsvToTable(csvText);
    updateTable(parsed, true);
    setShowCsvMode(false);
    setCsvText("");
    showToast(`CSV imported: ${parsed.headers.length} columns × ${parsed.rows.length} rows ✓`);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      if (text) {
        const parsed = parseCsvToTable(text);
        updateTable(parsed, true);
        setShowCsvMode(false);
        showToast(`CSV file imported: ${parsed.headers.length} columns × ${parsed.rows.length} rows ✓`);
      }
    };
    reader.onerror = () => {
      showToast("Failed to read CSV file", false);
    };
    reader.readAsText(file);
    e.target.value = "";
  };

  return (
    <div className="space-y-4 pt-2 border-t border-border">
      {/* Header with Title and Action Buttons */}
      <div className="flex items-center justify-between">
        <div>
          <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
            Structured Table Editor
          </label>
          <span className="text-[10px] text-muted-foreground">
            {tableData.headers.length} cols × {tableData.rows.length} rows
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          {saving && <span className="text-[10px] text-brand font-semibold animate-pulse">Saving...</span>}
          <button
            type="button"
            onClick={() => {
              if (!showCsvMode) {
                setCsvText(tableToCsv(tableData));
              }
              setShowCsvMode(!showCsvMode);
            }}
            className={`px-2.5 py-1 text-[11px] font-semibold rounded-lg border transition-all flex items-center gap-1 ${
              showCsvMode
                ? "bg-brand text-brand-foreground border-brand shadow-sm"
                : "bg-muted/40 hover:bg-muted text-foreground border-border"
            }`}
            title="Import or paste CSV data"
          >
            <Upload className="size-3" />
            CSV Import
          </button>
        </div>
      </div>

      {/* CSV Import / Paste Box */}
      {showCsvMode && (
        <div className="rounded-xl border border-brand/40 bg-brand/5 p-3 space-y-3 animate-in fade-in duration-150">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-brand flex items-center gap-1.5">
              <Upload className="size-3.5" /> CSV Paste / File Import
            </span>
            <button
              type="button"
              onClick={() => setShowCsvMode(false)}
              className="text-[11px] text-muted-foreground hover:text-foreground"
            >
              Cancel
            </button>
          </div>

          <p className="text-[11px] text-muted-foreground leading-relaxed">
            Paste comma-separated data or upload a .csv file. The first row will automatically become column headers.
          </p>

          <label className="flex items-center justify-center gap-2 p-2.5 border border-dashed border-brand/40 rounded-lg cursor-pointer bg-background hover:bg-muted/30 transition-colors text-center">
            <Upload className="size-3.5 text-brand" />
            <span className="text-xs font-semibold text-foreground">Upload .CSV File</span>
            <input
              type="file"
              accept=".csv,text/csv,text/plain"
              className="hidden"
              onChange={handleFileUpload}
            />
          </label>

          <div>
            <label className="block text-[11px] font-semibold text-foreground mb-1">Or Paste CSV Content:</label>
            <textarea
              rows={4}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              className="w-full bg-background border border-border rounded-lg p-2 font-mono text-xs text-foreground focus:ring-2 focus:ring-brand leading-relaxed"
              placeholder={"Question,Option A,Option B,Correct Answer\nWhat is Python?,Language,Database,A"}
            />
          </div>

          <button
            type="button"
            onClick={handleApplyCsv}
            className="w-full py-2 bg-brand text-brand-foreground hover:opacity-90 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5"
          >
            <Check className="size-3.5" /> Parse & Apply to Table
          </button>
        </div>
      )}

      {/* Structured Table Matrix Editor */}
      <div className="space-y-2">
        <div className="w-full overflow-x-auto rounded-xl border border-border bg-background p-2 max-w-full">
          <table className="w-full border-collapse min-w-max text-xs">
            <thead>
              <tr className="border-b border-border">
                <th className="p-1 text-[10px] font-bold text-muted-foreground w-6 text-center">#</th>
                {tableData.headers.map((header, colIdx) => (
                  <th key={colIdx} className="p-1 min-w-[110px] max-w-[180px]">
                    <div className="flex items-center gap-1 bg-muted/40 p-1 rounded-lg border border-border/60">
                      <input
                        type="text"
                        value={header}
                        onChange={(e) => handleHeaderChange(colIdx, e.target.value, false)}
                        onBlur={(e) => handleHeaderChange(colIdx, e.target.value, true)}
                        className="w-full bg-transparent text-xs font-bold text-foreground focus:outline-none focus:ring-1 focus:ring-brand rounded px-1"
                        placeholder={`Col ${colIdx + 1}`}
                      />
                      {tableData.headers.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleDeleteColumn(colIdx)}
                          className="text-muted-foreground hover:text-destructive p-0.5 rounded transition-colors shrink-0"
                          title="Delete column"
                        >
                          <Trash2 className="size-3" />
                        </button>
                      )}
                    </div>
                  </th>
                ))}
                <th className="p-1 w-8 text-center">
                  <button
                    type="button"
                    onClick={handleAddColumn}
                    className="p-1 text-brand hover:bg-brand/10 rounded-lg transition-colors"
                    title="Add Column"
                  >
                    <Plus className="size-3.5" />
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/40">
              {tableData.rows.map((row, rowIdx) => (
                <tr key={rowIdx} className="hover:bg-muted/10 transition-colors">
                  <td className="p-1 text-[10px] font-semibold text-muted-foreground text-center select-none">
                    {rowIdx + 1}
                  </td>
                  {row.map((cell, colIdx) => (
                    <td key={colIdx} className="p-1 min-w-[110px] max-w-[180px]">
                      <input
                        type="text"
                        value={cell}
                        onChange={(e) => handleCellChange(rowIdx, colIdx, e.target.value, false)}
                        onBlur={(e) => handleCellChange(rowIdx, colIdx, e.target.value, true)}
                        className="w-full bg-background border border-border/60 hover:border-border focus:border-brand rounded-lg p-1.5 text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-brand leading-relaxed"
                        placeholder="Cell value..."
                      />
                    </td>
                  ))}
                  <td className="p-1 w-8 text-center">
                    {tableData.rows.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleDeleteRow(rowIdx)}
                        className="text-muted-foreground hover:text-destructive p-1 rounded-lg transition-colors"
                        title="Delete row"
                      >
                        <Trash2 className="size-3" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Action Controls for Table */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            onClick={handleAddRow}
            className="flex-1 py-1.5 px-3 bg-muted/40 hover:bg-muted border border-border rounded-lg text-xs font-semibold text-foreground flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="size-3.5 text-brand" /> Add Row
          </button>
          <button
            type="button"
            onClick={handleAddColumn}
            className="flex-1 py-1.5 px-3 bg-muted/40 hover:bg-muted border border-border rounded-lg text-xs font-semibold text-foreground flex items-center justify-center gap-1.5 transition-colors"
          >
            <Plus className="size-3.5 text-brand" /> Add Column
          </button>
        </div>
      </div>
    </div>
  );
}


// ─── INTERACTION PAYLOAD EDITOR ────────────────────────────────────────────

export function InteractionPayloadEditor({
  blockId,
  payload,
  onSave,
  onPayloadChange,
  showToast,
}: {
  blockId: string;
  payload: any;
  onSave: () => void;
  onPayloadChange?: (updatedPayload: any) => void;
  showToast: (msg: string, ok?: boolean) => void;
}) {
  const [type, setType] = useState(payload?.interaction_type || "tabs");
  const [config, setConfig] = useState<Record<string, any>>(payload?.config || { items: [] });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedHotspotIdx, setSelectedHotspotIdx] = useState<number>(0);

  useEffect(() => {
    setType(payload?.interaction_type || "tabs");
    setConfig(payload?.config || { items: [] });
  }, [payload]);

  const notifyChange = (updatedType: string, updatedConfig: Record<string, any>) => {
    if (onPayloadChange) {
      onPayloadChange({
        id: payload?.id,
        interaction_type: updatedType,
        config: updatedConfig,
      });
    }
  };

  const handleSave = async (updatedType = type, updatedConfig = config) => {
    setSaving(true);
    notifyChange(updatedType, updatedConfig);
    try {
      if (payload?.id) {
        await authFetch(`${API_BASE}/authoring/interactions/${payload.id}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ interaction_type: updatedType, config: updatedConfig }),
        });
      } else {
        const res = await authFetch(`${API_BASE}/authoring/interactions/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ block: blockId, interaction_type: updatedType, config: updatedConfig }),
        });
        if (res.ok) {
          const created = await res.json();
          notifyChange(updatedType, created.config || updatedConfig);
        }
      }
      onSave();
      showToast("Interaction widget saved ✓");
    } catch (e) {
      showToast("Failed to save interaction", false);
    } finally {
      setSaving(false);
    }
  };

  const uploadAsset = async (file: File): Promise<string | null> => {
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
        const relativePath = asset.path ? `/api/media/${asset.path}` : (asset.file?.startsWith('/api/media/') ? asset.file : `/api/media/${(asset.file || '').replace(/^.*\/media\//, '')}`);
        showToast("Image uploaded successfully ✓");
        return relativePath;
      }
      showToast("Asset upload failed", false);
      return null;
    } catch (e: any) {
      showToast(e.message || "Asset upload error", false);
      return null;
    } finally {
      setUploading(false);
    }
  };

  const items: any[] = Array.isArray(config.items) ? config.items : [];

  const updateConfig = (newConfig: Record<string, any>, persist = false) => {
    setConfig(newConfig);
    notifyChange(type, newConfig);
    if (persist) {
      handleSave(type, newConfig);
    }
  };

  const updateItems = (newItems: any[], persist = false) => {
    updateConfig({ ...config, items: newItems }, persist);
  };

  const addItem = (defaultItem: Record<string, any>) => {
    const newItems = [...items, defaultItem];
    updateItems(newItems, true);
  };

  const updateItem = (index: number, field: string, val: any) => {
    const newItems = items.map((it: any, i: number) => (i === index ? { ...it, [field]: val } : it));
    updateItems(newItems, false);
  };

  const removeItem = (index: number) => {
    const newItems = items.filter((_: any, i: number) => i !== index);
    updateItems(newItems, true);
  };

  const handleTypeChange = (newType: string) => {
    setType(newType);
    let newConfig = { ...config };
    if (!newConfig.items || newConfig.items.length === 0) {
      if (newType === "tabs") {
        newConfig.items = [
          { title: "Tab 1", content: "Content for tab 1" },
          { title: "Tab 2", content: "Content for tab 2" },
        ];
      } else if (newType === "accordion") {
        newConfig.items = [
          { title: "Section 1", content: "Content for section 1" },
          { title: "Section 2", content: "Content for section 2" },
        ];
      } else if (newType === "timeline") {
        newConfig.items = [
          { date: "Step 1", title: "Milestone 1", content: "Milestone 1 description" },
          { date: "Step 2", title: "Milestone 2", content: "Milestone 2 description" },
        ];
      } else if (newType === "flashcards") {
        newConfig.items = [
          { front: "Concept / Term 1", back: "Definition / Explanation 1" },
          { front: "Concept / Term 2", back: "Definition / Explanation 2" },
        ];
      } else if (newType === "hotspots") {
        newConfig.items = [
          { label: "Hotspot 1", title: "Hotspot 1", content: "Information for hotspot 1", x: 35, y: 45 },
        ];
      } else if (newType === "before_after") {
        newConfig = {
          before_image: newConfig.before_image || "",
          after_image: newConfig.after_image || "",
          before_label: newConfig.before_label || "Before",
          after_label: newConfig.after_label || "After",
        };
      } else if (newType === "clickable_cards") {
        newConfig.items = [
          { title: "Card 1", content: "Detailed content for card 1", image_url: "" },
          { title: "Card 2", content: "Detailed content for card 2", image_url: "" },
        ];
      } else if (newType === "process_flow") {
        newConfig.items = [
          { title: "Step 1", content: "Description of step 1" },
          { title: "Step 2", content: "Description of step 2" },
        ];
      }
    }
    setConfig(newConfig);
    handleSave(newType, newConfig);
  };

  return (
    <div className="space-y-4 pt-2 border-t border-border">
      {/* Widget Type Selector */}
      <div>
        <label className="block text-xs font-bold text-foreground uppercase tracking-wider mb-1">
          Widget Type
        </label>
        <select
          value={type}
          onChange={(e) => handleTypeChange(e.target.value)}
          className="w-full bg-background border border-border rounded-lg p-2 text-xs font-semibold text-brand focus:ring-1 focus:ring-brand focus:outline-none"
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

      {/* ─── WIDGET 1: TABS ─── */}
      {type === "tabs" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
              Tabs ({items.length})
            </label>
            <button
              onClick={() => addItem({ title: `Tab ${items.length + 1}`, content: "" })}
              className="flex items-center gap-1 text-xs text-brand font-bold hover:underline"
            >
              <Plus className="size-3.5" /> Add Tab
            </button>
          </div>

          {items.map((item: any, idx: number) => (
            <div key={idx} className="p-3 rounded-xl border border-border bg-background space-y-2 relative group">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Tab #{idx + 1}</span>
                <button onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-destructive p-1" title="Delete Tab">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground mb-0.5">Tab Title</label>
                <input
                  type="text"
                  value={item.title || ""}
                  onChange={(e) => updateItem(idx, "title", e.target.value)}
                  onBlur={() => handleSave()}
                  className="w-full bg-card border border-border rounded-lg p-1.5 text-xs font-semibold text-foreground"
                  placeholder="e.g. Overview, Prerequisites, Summary"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground mb-0.5">Tab Content</label>
                <textarea
                  rows={3}
                  value={item.content || ""}
                  onChange={(e) => updateItem(idx, "content", e.target.value)}
                  onBlur={() => handleSave()}
                  className="w-full bg-card border border-border rounded-lg p-1.5 text-xs text-foreground"
                  placeholder="Enter content shown when this tab is active..."
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── WIDGET 2: ACCORDION ─── */}
      {type === "accordion" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
              Accordion Sections ({items.length})
            </label>
            <button
              onClick={() => addItem({ title: `Section ${items.length + 1}`, content: "" })}
              className="flex items-center gap-1 text-xs text-brand font-bold hover:underline"
            >
              <Plus className="size-3.5" /> Add Section
            </button>
          </div>

          {items.map((item: any, idx: number) => (
            <div key={idx} className="p-3 rounded-xl border border-border bg-background space-y-2 relative group">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Section #{idx + 1}</span>
                <button onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-destructive p-1" title="Delete Section">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground mb-0.5">Section Title</label>
                <input
                  type="text"
                  value={item.title || ""}
                  onChange={(e) => updateItem(idx, "title", e.target.value)}
                  onBlur={() => handleSave()}
                  className="w-full bg-card border border-border rounded-lg p-1.5 text-xs font-semibold text-foreground"
                  placeholder="e.g. Frequently Asked Questions, Safety Checklist"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground mb-0.5">Section Content</label>
                <textarea
                  rows={3}
                  value={item.content || ""}
                  onChange={(e) => updateItem(idx, "content", e.target.value)}
                  onBlur={() => handleSave()}
                  className="w-full bg-card border border-border rounded-lg p-1.5 text-xs text-foreground"
                  placeholder="Enter expandable accordion content..."
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── WIDGET 3: TIMELINE ─── */}
      {type === "timeline" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
              Timeline Points ({items.length})
            </label>
            <button
              onClick={() => addItem({ date: `Step ${items.length + 1}`, title: `Milestone ${items.length + 1}`, content: "" })}
              className="flex items-center gap-1 text-xs text-brand font-bold hover:underline"
            >
              <Plus className="size-3.5" /> Add Timeline Point
            </button>
          </div>

          {items.map((item: any, idx: number) => (
            <div key={idx} className="p-3 rounded-xl border border-border bg-background space-y-2 relative group">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Point #{idx + 1}</span>
                <button onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-destructive p-1" title="Delete Point">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground mb-0.5">Date / Step / Label</label>
                <input
                  type="text"
                  value={item.date || item.step_label || ""}
                  onChange={(e) => updateItem(idx, "date", e.target.value)}
                  onBlur={() => handleSave()}
                  className="w-full bg-card border border-border rounded-lg p-1.5 text-xs font-semibold text-foreground"
                  placeholder="e.g. 2024, Phase 1, Step A, 09:00 AM"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground mb-0.5">Title</label>
                <input
                  type="text"
                  value={item.title || ""}
                  onChange={(e) => updateItem(idx, "title", e.target.value)}
                  onBlur={() => handleSave()}
                  className="w-full bg-card border border-border rounded-lg p-1.5 text-xs font-semibold text-foreground"
                  placeholder="Milestone Title"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground mb-0.5">Description</label>
                <textarea
                  rows={2}
                  value={item.content || item.description || ""}
                  onChange={(e) => updateItem(idx, "content", e.target.value)}
                  onBlur={() => handleSave()}
                  className="w-full bg-card border border-border rounded-lg p-1.5 text-xs text-foreground"
                  placeholder="Milestone details & description..."
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── WIDGET 4: FLASHCARDS ─── */}
      {type === "flashcards" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
              Flashcards ({items.length})
            </label>
            <button
              onClick={() => addItem({ front: `Term ${items.length + 1}`, back: `Definition ${items.length + 1}` })}
              className="flex items-center gap-1 text-xs text-brand font-bold hover:underline"
            >
              <Plus className="size-3.5" /> Add Flashcard
            </button>
          </div>

          {items.map((item: any, idx: number) => (
            <div key={idx} className="p-3 rounded-xl border border-border bg-background space-y-2 relative group">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Card #{idx + 1}</span>
                <button onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-destructive p-1" title="Delete Card">
                  <Trash2 className="size-3.5" />
                </button>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-indigo-400 mb-0.5 uppercase tracking-wider">Front Side (Question / Term)</label>
                <textarea
                  rows={2}
                  value={item.front || item.title || ""}
                  onChange={(e) => updateItem(idx, "front", e.target.value)}
                  onBlur={() => handleSave()}
                  className="w-full bg-card border border-border rounded-lg p-1.5 text-xs font-semibold text-foreground"
                  placeholder="Enter text on front side of the card..."
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-emerald-400 mb-0.5 uppercase tracking-wider">Back Side (Answer / Definition)</label>
                <textarea
                  rows={2}
                  value={item.back || item.content || ""}
                  onChange={(e) => updateItem(idx, "back", e.target.value)}
                  onBlur={() => handleSave()}
                  className="w-full bg-card border border-border rounded-lg p-1.5 text-xs text-foreground"
                  placeholder="Enter text revealed on back side of the card..."
                />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── WIDGET 5: HOTSPOTS ─── */}
      {type === "hotspots" && (
        <div className="space-y-4">
          {/* Background Image Upload */}
          <div className="p-3 rounded-xl border border-border bg-background space-y-2">
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
              A) Background Image
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={config.image_url || ""}
                onChange={(e) => updateConfig({ ...config, image_url: e.target.value }, false)}
                onBlur={() => handleSave()}
                placeholder="https://... image URL"
                className="flex-1 bg-card border border-border rounded-lg p-1.5 text-xs text-foreground"
              />
              <label className="cursor-pointer bg-brand text-brand-foreground px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 inline-flex items-center gap-1 shrink-0">
                <Upload className="size-3" /> Upload
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const url = await uploadAsset(file);
                      if (url) updateConfig({ ...config, image_url: url }, true);
                    }
                  }}
                />
              </label>
            </div>

            {config.image_url && (
              <div className="relative rounded-lg overflow-hidden border border-border bg-black/40 mt-2">
                <p className="text-[10px] text-muted-foreground p-1 text-center bg-card border-b border-border">
                  💡 Click anywhere on the image below to place or move Hotspot #{selectedHotspotIdx + 1}
                </p>
                <div
                  className="relative cursor-crosshair inline-block w-full select-none"
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const x = Math.min(100, Math.max(0, Math.round(((e.clientX - rect.left) / rect.width) * 100)));
                    const y = Math.min(100, Math.max(0, Math.round(((e.clientY - rect.top) / rect.height) * 100)));
                    if (items.length === 0 || selectedHotspotIdx >= items.length) {
                      addItem({ label: `Spot ${items.length + 1}`, title: `Hotspot ${items.length + 1}`, content: "", x, y });
                    } else {
                      const newItems = items.map((it: any, i: number) => i === selectedHotspotIdx ? { ...it, x, y } : it);
                      updateItems(newItems, true);
                    }
                  }}
                >
                  <img src={config.image_url} alt="Hotspot canvas" className="w-full h-auto object-contain max-h-48" />
                  {items.map((it: any, i: number) => (
                    <div
                      key={i}
                      style={{ left: `${it.x || 50}%`, top: `${it.y || 50}%` }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedHotspotIdx(i);
                      }}
                      className={`absolute -translate-x-1/2 -translate-y-1/2 size-5 rounded-full font-black text-[10px] grid place-items-center cursor-pointer shadow-md transition-transform ${
                        selectedHotspotIdx === i
                          ? "bg-amber-400 text-black ring-2 ring-white scale-125 z-10"
                          : "bg-indigo-600 text-white"
                      }`}
                    >
                      {i + 1}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Hotspots List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
                B) Hotspots ({items.length})
              </label>
              <button
                onClick={() => {
                  const newIdx = items.length;
                  addItem({ label: `Spot ${newIdx + 1}`, title: `Hotspot ${newIdx + 1}`, content: "", x: 50, y: 50 });
                  setSelectedHotspotIdx(newIdx);
                }}
                className="flex items-center gap-1 text-xs text-brand font-bold hover:underline"
              >
                <Plus className="size-3.5" /> Add Hotspot
              </button>
            </div>

            {items.map((item: any, idx: number) => (
              <div
                key={idx}
                onClick={() => setSelectedHotspotIdx(idx)}
                className={`p-3 rounded-xl border bg-background space-y-2 relative group cursor-pointer transition-all ${
                  selectedHotspotIdx === idx ? "border-brand ring-1 ring-brand" : "border-border"
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold text-brand uppercase">
                    Hotspot #{idx + 1} {selectedHotspotIdx === idx ? "● Selected" : ""}
                  </span>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      removeItem(idx);
                      if (selectedHotspotIdx >= idx && selectedHotspotIdx > 0) {
                        setSelectedHotspotIdx(selectedHotspotIdx - 1);
                      }
                    }}
                    className="text-muted-foreground hover:text-destructive p-1"
                    title="Delete Hotspot"
                  >
                    <Trash2 className="size-3.5" />
                  </button>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground mb-0.5">Label / Title</label>
                  <input
                    type="text"
                    value={item.title || item.label || ""}
                    onChange={(e) => updateItem(idx, "title", e.target.value)}
                    onBlur={() => handleSave()}
                    className="w-full bg-card border border-border rounded-lg p-1.5 text-xs font-semibold text-foreground"
                    placeholder="Hotspot Title"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-muted-foreground mb-0.5">Description</label>
                  <textarea
                    rows={2}
                    value={item.content || item.description || ""}
                    onChange={(e) => updateItem(idx, "content", e.target.value)}
                    onBlur={() => handleSave()}
                    className="w-full bg-card border border-border rounded-lg p-1.5 text-xs text-foreground"
                    placeholder="Description revealed on click..."
                  />
                </div>

                {/* X and Y Position Inputs */}
                <div className="grid grid-cols-2 gap-2 pt-1">
                  <div>
                    <label className="block text-[9px] font-bold text-muted-foreground uppercase">X Position: {item.x ?? 50}%</label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={item.x ?? 50}
                      onChange={(e) => updateItem(idx, "x", parseInt(e.target.value, 10))}
                      onMouseUp={() => handleSave()}
                      onTouchEnd={() => handleSave()}
                      className="w-full accent-brand"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-muted-foreground uppercase">Y Position: {item.y ?? 50}%</label>
                    <input
                      type="range"
                      min={0}
                      max={100}
                      value={item.y ?? 50}
                      onChange={(e) => updateItem(idx, "y", parseInt(e.target.value, 10))}
                      onMouseUp={() => handleSave()}
                      onTouchEnd={() => handleSave()}
                      className="w-full accent-brand"
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── WIDGET 6: BEFORE / AFTER ─── */}
      {type === "before_after" && (
        <div className="space-y-4">
          {/* Before Image */}
          <div className="p-3 rounded-xl border border-border bg-background space-y-2">
            <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">Before Image</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={config.before_image || ""}
                onChange={(e) => updateConfig({ ...config, before_image: e.target.value }, false)}
                onBlur={() => handleSave()}
                placeholder="https://... before image URL"
                className="flex-1 bg-card border border-border rounded-lg p-1.5 text-xs text-foreground"
              />
              <label className="cursor-pointer bg-brand text-brand-foreground px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 inline-flex items-center gap-1 shrink-0">
                <Upload className="size-3" /> Upload
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const url = await uploadAsset(file);
                      if (url) updateConfig({ ...config, before_image: url }, true);
                    }
                  }}
                />
              </label>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground mb-0.5">Before Label (Optional)</label>
              <input
                type="text"
                value={config.before_label || ""}
                onChange={(e) => updateConfig({ ...config, before_label: e.target.value }, false)}
                onBlur={() => handleSave()}
                placeholder="Before"
                className="w-full bg-card border border-border rounded-lg p-1.5 text-xs text-foreground"
              />
            </div>
            {config.before_image && (
              <img src={config.before_image} alt="Before preview" className="w-full h-24 object-cover rounded-lg border border-border mt-1" />
            )}
          </div>

          {/* After Image */}
          <div className="p-3 rounded-xl border border-border bg-background space-y-2">
            <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">After Image</span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={config.after_image || ""}
                onChange={(e) => updateConfig({ ...config, after_image: e.target.value }, false)}
                onBlur={() => handleSave()}
                placeholder="https://... after image URL"
                className="flex-1 bg-card border border-border rounded-lg p-1.5 text-xs text-foreground"
              />
              <label className="cursor-pointer bg-brand text-brand-foreground px-3 py-1.5 rounded-lg text-xs font-bold hover:opacity-90 inline-flex items-center gap-1 shrink-0">
                <Upload className="size-3" /> Upload
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={async (e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      const url = await uploadAsset(file);
                      if (url) updateConfig({ ...config, after_image: url }, true);
                    }
                  }}
                />
              </label>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-muted-foreground mb-0.5">After Label (Optional)</label>
              <input
                type="text"
                value={config.after_label || ""}
                onChange={(e) => updateConfig({ ...config, after_label: e.target.value }, false)}
                onBlur={() => handleSave()}
                placeholder="After"
                className="w-full bg-card border border-border rounded-lg p-1.5 text-xs text-foreground"
              />
            </div>
            {config.after_image && (
              <img src={config.after_image} alt="After preview" className="w-full h-24 object-cover rounded-lg border border-border mt-1" />
            )}
          </div>
        </div>
      )}

      {/* ─── WIDGET 7: CLICKABLE CARDS GRID ─── */}
      {type === "clickable_cards" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
              Cards Grid ({items.length})
            </label>
            <button
              onClick={() => addItem({ title: `Card ${items.length + 1}`, content: "", image_url: "" })}
              className="flex items-center gap-1 text-xs text-brand font-bold hover:underline"
            >
              <Plus className="size-3.5" /> Add Card
            </button>
          </div>

          {items.map((item: any, idx: number) => (
            <div key={idx} className="p-3 rounded-xl border border-border bg-background space-y-2 relative group">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-muted-foreground uppercase">Card #{idx + 1}</span>
                <button onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-destructive p-1" title="Delete Card">
                  <Trash2 className="size-3.5" />
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground mb-0.5">Card Title</label>
                <input
                  type="text"
                  value={item.title || ""}
                  onChange={(e) => updateItem(idx, "title", e.target.value)}
                  onBlur={() => handleSave()}
                  className="w-full bg-card border border-border rounded-lg p-1.5 text-xs font-semibold text-foreground"
                  placeholder="Card Title"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground mb-0.5">Card Content</label>
                <textarea
                  rows={2}
                  value={item.content || ""}
                  onChange={(e) => updateItem(idx, "content", e.target.value)}
                  onBlur={() => handleSave()}
                  className="w-full bg-card border border-border rounded-lg p-1.5 text-xs text-foreground"
                  placeholder="Content revealed when card is clicked..."
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground mb-0.5">Optional Card Image</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={item.image_url || ""}
                    onChange={(e) => {
                      const val = e.target.value;
                      const updatedItems = items.map((it: any, i: number) =>
                        i === idx ? { ...it, image_url: val } : it
                      );
                      const updatedConfig = { ...config, items: updatedItems };
                      setConfig(updatedConfig);
                      notifyChange(type, updatedConfig);
                    }}
                    onBlur={() => handleSave()}
                    placeholder="https://... or uploaded image URL"
                    className="flex-1 bg-card border border-border rounded-lg p-1.5 text-xs text-foreground"
                  />
                  <label className="cursor-pointer bg-brand text-brand-foreground px-2.5 py-1 rounded-lg text-[10px] font-bold hover:opacity-90 inline-flex items-center gap-1 shrink-0">
                    <Upload className="size-3" /> Upload
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (file) {
                          const url = await uploadAsset(file);
                          if (url) {
                            const updatedItems = items.map((it: any, i: number) =>
                              i === idx ? { ...it, image_url: url } : it
                            );
                            const updatedConfig = { ...config, items: updatedItems };
                            setConfig(updatedConfig);
                            notifyChange(type, updatedConfig);
                            await handleSave(type, updatedConfig);
                          }
                        }
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>

                {item.image_url && (
                  <div className="relative mt-2 rounded-lg overflow-hidden border border-border bg-black/20 group/img">
                    <img
                      src={normalizeUrl(item.image_url)}
                      alt={`Card ${idx + 1} preview`}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        const updatedItems = items.map((it: any, i: number) =>
                          i === idx ? { ...it, image_url: "" } : it
                        );
                        const updatedConfig = { ...config, items: updatedItems };
                        setConfig(updatedConfig);
                        notifyChange(type, updatedConfig);
                        handleSave(type, updatedConfig);
                      }}
                      className="absolute top-1 right-1 size-5 rounded-full bg-black/70 text-white hover:bg-destructive text-[10px] grid place-items-center opacity-80 hover:opacity-100 transition-opacity"
                      title="Remove Image"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ─── WIDGET 8: PROCESS STEP FLOW ─── */}
      {type === "process_flow" && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-foreground uppercase tracking-wider">
              Process Steps ({items.length})
            </label>
            <button
              onClick={() => addItem({ title: `Step ${items.length + 1}`, content: "" })}
              className="flex items-center gap-1 text-xs text-brand font-bold hover:underline"
            >
              <Plus className="size-3.5" /> Add Step
            </button>
          </div>

          {items.map((item: any, idx: number) => (
            <div key={idx} className="p-3 rounded-xl border border-border bg-background space-y-2 relative group">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-brand uppercase">Step {idx + 1}</span>
                <button onClick={() => removeItem(idx)} className="text-muted-foreground hover:text-destructive p-1" title="Delete Step">
                  <Trash2 className="size-3.5" />
                </button>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground mb-0.5">Step Title</label>
                <input
                  type="text"
                  value={item.title || ""}
                  onChange={(e) => updateItem(idx, "title", e.target.value)}
                  onBlur={() => handleSave()}
                  className="w-full bg-card border border-border rounded-lg p-1.5 text-xs font-semibold text-foreground"
                  placeholder="e.g. Initial Inspection, Verification, Final Handover"
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground mb-0.5">Step Description</label>
                <textarea
                  rows={2}
                  value={item.content || ""}
                  onChange={(e) => updateItem(idx, "content", e.target.value)}
                  onBlur={() => handleSave()}
                  className="w-full bg-card border border-border rounded-lg p-1.5 text-xs text-foreground"
                  placeholder="Detailed instructions for this step..."
                />
              </div>
            </div>
          ))}
        </div>
      )}
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
          onChange={(e) => {
            const newType = e.target.value;
            let newChoices = [...choices];
            if (newType === "fill_blank") {
              const existingText = choices.find((c: any) => c.is_correct)?.text || choices[0]?.text || "";
              newChoices = [{ id: "fib_1", text: existingText, is_correct: true }];
            } else if (newType === "true_false") {
              newChoices = [
                { id: "c_true", text: "True", is_correct: true },
                { id: "c_false", text: "False", is_correct: false },
              ];
            } else if (newType === "single_choice" || newType === "multiple_select") {
              if (newChoices.length === 0 || qType === "fill_blank") {
                newChoices = [
                  { id: `c_${Date.now()}_1`, text: "Option A", is_correct: true },
                  { id: `c_${Date.now()}_2`, text: "Option B", is_correct: false },
                ];
              }
            }
            updateQuestionLocally(prompt, newType, newChoices, true);
          }}
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

      {/* Fill in the Blank vs Choices Builder */}
      {qType === "fill_blank" ? (
        <div className="space-y-1.5">
          <label className="block text-[11px] font-semibold text-muted-foreground">Correct Answer</label>
          <input
            type="text"
            value={choices.find((c: any) => c.is_correct)?.text || choices[0]?.text || ""}
            onChange={(e) => {
              const updated = [{ id: "fib_1", text: e.target.value, is_correct: true }];
              updateQuestionLocally(prompt, qType, updated, false);
            }}
            onBlur={(e) => {
              const updated = [{ id: "fib_1", text: e.target.value, is_correct: true }];
              updateQuestionLocally(prompt, qType, updated, true);
            }}
            className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:ring-2 focus:ring-amber-400 font-medium"
            placeholder="Type the expected correct answer..."
          />
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="block text-[11px] font-semibold text-muted-foreground">
              {qType === "true_false" ? "True / False Options" : "Answer Choices"}
            </label>
            {qType !== "true_false" && (
              <button type="button" onClick={addChoice} className="text-[10px] text-brand font-semibold hover:underline">+ Add Choice</button>
            )}
          </div>

          {choices.map((c: any, i: number) => (
            <div key={c.id || i} className="flex items-center gap-2">
              <input
                type={qType === "multiple_select" ? "checkbox" : "radio"}
                name={`correct_choice_${q?.id || editingIndex}`}
                checked={c.is_correct || false}
                onChange={(e) => toggleChoiceCorrectness(i, e.target.checked)}
                className="accent-emerald-500 size-4 cursor-pointer"
                title="Mark as correct answer"
              />
              <input
                type="text"
                value={c.text || ""}
                readOnly={qType === "true_false"}
                onChange={(e) => {
                  const updated = choices.map((item, idx) => idx === i ? { ...item, text: e.target.value } : item);
                  updateQuestionLocally(prompt, qType, updated, false);
                }}
                onBlur={(e) => {
                  const updated = choices.map((item, idx) => idx === i ? { ...item, text: e.target.value } : item);
                  updateQuestionLocally(prompt, qType, updated, true);
                }}
                className={`flex-1 bg-background border border-border rounded-lg p-1.5 text-xs text-foreground ${qType === "true_false" ? "opacity-90 cursor-default" : ""}`}
                placeholder={`Option #${i + 1}`}
              />
              {qType !== "true_false" && (
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
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}


// ─── SCENARIO PAYLOAD EDITOR (Branching Simulation) ───────────────────────

export function ScenarioPayloadEditor({
  blockId,
  nodes = [],
  onSave,
  onPayloadChange,
  showToast
}: {
  blockId: string;
  nodes: any[];
  onSave: () => void;
  onPayloadChange?: (updatedNodes: any[]) => void;
  showToast: (msg: string, ok?: boolean) => void;
}) {
  const [activeNodeIndex, setActiveNodeIndex] = useState(0);
  const activeNode = nodes[activeNodeIndex] || nodes[0] || null;

  const [title, setTitle] = useState(activeNode?.title || "Start Decision Point");
  const [content, setContent] = useState(activeNode?.content || "Branching scenario narrative text...");
  const [choices, setChoices] = useState<any[]>(activeNode?.choices || []);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (activeNode) {
      setTitle(activeNode.title || "");
      setContent(activeNode.content || "");
      setChoices(activeNode.choices || []);
    } else {
      setTitle("Start Decision Point");
      setContent("Describe the situation for the learner...");
      setChoices([
        { text: "Choice A", feedback: "Outcome description for Choice A", target_node_id: null },
        { text: "Choice B", feedback: "Outcome description for Choice B", target_node_id: null },
      ]);
    }
  }, [activeNode?.id, activeNode?.title, activeNode?.content, JSON.stringify(activeNode?.choices), activeNodeIndex]);

  const handleSaveActiveNode = async (
    updatedTitle = title,
    updatedContent = content,
    updatedChoices = choices
  ) => {
    setSaving(true);
    try {
      if (activeNode?.id) {
        await authFetch(`${API_BASE}/authoring/scenario-nodes/${activeNode.id}/`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: updatedTitle, content: updatedContent, choices: updatedChoices }),
        });
        if (onPayloadChange) {
          const updatedNodes = nodes.map(n => n.id === activeNode.id ? { ...n, title: updatedTitle, content: updatedContent, choices: updatedChoices } : n);
          onPayloadChange(updatedNodes);
        }
      } else {
        const isStart = nodes.length === 0;
        const res = await authFetch(`${API_BASE}/authoring/scenario-nodes/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            block: blockId,
            title: updatedTitle || "Start Decision Point",
            content: updatedContent || "Scenario narrative content",
            is_start_node: isStart,
            choices: updatedChoices,
          }),
        });
        if (res.ok) {
          const created = await res.json();
          if (onPayloadChange) {
            onPayloadChange([...nodes, created]);
          }
        }
      }
      onSave();
      showToast("Scenario node saved ✓");
    } catch (e) {
      showToast("Failed to save scenario node", false);
    } finally {
      setSaving(false);
    }
  };

  const handleAddNode = async () => {
    setSaving(true);
    try {
      const isStart = nodes.length === 0;
      const res = await authFetch(`${API_BASE}/authoring/scenario-nodes/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          block: blockId,
          title: `Decision Node ${nodes.length + 1}`,
          content: "Describe the situation for this decision branch...",
          is_start_node: isStart,
          choices: [
            { text: "Choice A", feedback: "Outcome for Choice A", target_node_id: null },
            { text: "Choice B", feedback: "Outcome for Choice B", target_node_id: null },
          ],
        }),
      });
      if (res.ok) {
        const created = await res.json();
        showToast("New decision node added ✓");
        onSave();
        setActiveNodeIndex(nodes.length);
      }
    } catch (e) {
      showToast("Failed to add decision node", false);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNode = async (nodeId: string, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!confirm("Delete this decision node?")) return;
    setSaving(true);
    try {
      const res = await authFetch(`${API_BASE}/authoring/scenario-nodes/${nodeId}/`, {
        method: "DELETE",
      });
      if (res.ok) {
        showToast("Decision node deleted");
        if (activeNodeIndex > 0) {
          setActiveNodeIndex(activeNodeIndex - 1);
        }
        onSave();
      }
    } catch (e) {
      showToast("Failed to delete node", false);
    } finally {
      setSaving(false);
    }
  };

  const addChoiceOption = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const newChoice = {
      text: `Choice ${String.fromCharCode(65 + choices.length)}`,
      feedback: "",
      target_node_id: null
    };
    const updated = [...choices, newChoice];
    setChoices(updated);
    handleSaveActiveNode(title, content, updated);
  };

  const deleteChoiceOption = (index: number, e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    const updated = choices.filter((_, idx) => idx !== index);
    setChoices(updated);
    handleSaveActiveNode(title, content, updated);
  };

  const updateChoice = (index: number, field: string, value: any, save = false) => {
    const updated = choices.map((c, i) => i === index ? { ...c, [field]: value } : c);
    setChoices(updated);
    if (save) {
      handleSaveActiveNode(title, content, updated);
    }
  };

  const handleNextStepChange = async (choiceIndex: number, val: string) => {
    if (val === "__new__") {
      setSaving(true);
      try {
        const res = await authFetch(`${API_BASE}/authoring/scenario-nodes/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            block: blockId,
            title: `Decision Node ${nodes.length + 1}`,
            content: "Describe what happens next in this branch...",
            is_start_node: false,
            choices: [
              { text: "Choice A", feedback: "Outcome description", target_node_id: null },
            ],
          }),
        });
        if (res.ok) {
          const newNode = await res.json();
          const updated = choices.map((c, i) => i === choiceIndex ? { ...c, target_node_id: String(newNode.id) } : c);
          setChoices(updated);
          await handleSaveActiveNode(title, content, updated);
          showToast(`Created & linked ${newNode.title} ✓`);
        }
      } catch (e) {
        showToast("Failed to create new node", false);
      } finally {
        setSaving(false);
      }
    } else {
      const targetId = val === "end" || !val ? null : val;
      updateChoice(choiceIndex, "target_node_id", targetId, true);
    }
  };

  return (
    <div className="space-y-4 pt-2 border-t border-border">
      <div className="flex items-center justify-between">
        <label className="block text-xs font-bold text-foreground uppercase tracking-wider">Scenario Builder</label>
        <button
          type="button"
          onClick={handleAddNode}
          disabled={saving}
          className="text-xs text-teal-400 font-bold hover:underline flex items-center gap-1 cursor-pointer disabled:opacity-50"
        >
          {saving ? <Loader2 className="size-3.5 animate-spin" /> : <Plus className="size-3.5" />}
          Add Decision Node
        </button>
      </div>

      {/* Decision Node Selector Tabs */}
      {nodes.length > 0 && (
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 border-b border-border">
          {nodes.map((n, idx) => (
            <div
              key={n.id || idx}
              className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold cursor-pointer transition-all shrink-0 ${
                idx === activeNodeIndex
                  ? "bg-teal-500/20 border border-teal-500/40 text-teal-300 shadow-sm"
                  : "bg-muted/40 text-muted-foreground hover:bg-muted"
              }`}
              onClick={() => setActiveNodeIndex(idx)}
            >
              <span>{n.is_start_node ? "🏁 Start" : `Node ${idx + 1}`}</span>
              {nodes.length > 1 && idx === activeNodeIndex && !n.is_start_node && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (n.id) handleDeleteNode(n.id, e);
                  }}
                  className="hover:text-destructive p-0.5 rounded cursor-pointer"
                  title="Delete this node"
                >
                  <Trash2 className="size-3" />
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Active Node Form */}
      <div>
        <div className="flex items-center justify-between mb-1">
          <label className="block text-[11px] font-semibold text-muted-foreground">Decision Point Title</label>
          {saving && <span className="text-[10px] text-teal-400 font-semibold animate-pulse">Saving...</span>}
        </div>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          onBlur={() => handleSaveActiveNode(title, content, choices)}
          className="w-full bg-background border border-border rounded-lg p-2 text-xs font-bold text-foreground focus:ring-2 focus:ring-teal-400"
          placeholder="e.g. Decision Node 1"
        />
      </div>

      <div>
        <label className="block text-[11px] font-semibold text-muted-foreground mb-1">Scenario Narrative</label>
        <textarea
          rows={3}
          value={content}
          onChange={(e) => setContent(e.target.value)}
          onBlur={() => handleSaveActiveNode(title, content, choices)}
          className="w-full bg-background border border-border rounded-lg p-2 text-xs text-foreground focus:ring-2 focus:ring-teal-400 font-medium"
          placeholder="Describe the situation for the learner..."
        />
      </div>

      {/* Decision Choices */}
      <div className="space-y-2.5">
        <div className="flex items-center justify-between">
          <label className="block text-[11px] font-semibold text-muted-foreground">Decision Choices & Branching</label>
          <button
            type="button"
            onClick={addChoiceOption}
            className="text-[10px] text-teal-400 font-semibold hover:underline cursor-pointer"
          >
            + Add Choice
          </button>
        </div>

        {choices.map((c: any, i: number) => {
          const targetValue = c.target_node_id ? String(c.target_node_id) : "end";
          return (
            <div key={i} className="p-3 rounded-xl border border-border bg-background space-y-2 shadow-sm">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-bold text-teal-400 uppercase tracking-wider">Choice #{i + 1}</span>
                <button
                  type="button"
                  onClick={(e) => deleteChoiceOption(i, e)}
                  className="text-muted-foreground hover:text-destructive p-1 rounded hover:bg-muted cursor-pointer transition-colors"
                  title="Delete Choice"
                >
                  <Trash2 className="size-3.5" />
                </button>
              </div>

              {/* Choice Text */}
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground mb-0.5">Choice Text</label>
                <input
                  type="text"
                  value={c.text || ""}
                  onChange={(e) => updateChoice(i, "text", e.target.value, false)}
                  onBlur={() => handleSaveActiveNode(title, content, choices)}
                  className="w-full bg-card border border-border rounded-lg p-1.5 text-xs text-foreground font-medium"
                  placeholder="e.g. Review the invoice"
                />
              </div>

              {/* Outcome / Feedback */}
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground mb-0.5">Outcome / Feedback</label>
                <textarea
                  rows={2}
                  value={c.feedback || c.outcome || ""}
                  onChange={(e) => updateChoice(i, "feedback", e.target.value, false)}
                  onBlur={() => handleSaveActiveNode(title, content, choices)}
                  className="w-full bg-card border border-border rounded-lg p-1.5 text-xs text-foreground"
                  placeholder="e.g. You identify an incorrect charge and explain it to the customer."
                />
              </div>

              {/* Next Step Selector */}
              <div>
                <label className="block text-[10px] font-semibold text-muted-foreground mb-0.5">Next Step</label>
                <select
                  value={targetValue}
                  onChange={(e) => handleNextStepChange(i, e.target.value)}
                  className="w-full bg-card border border-border rounded-lg p-1.5 text-xs text-foreground font-semibold"
                >
                  <option value="end">🏁 End Scenario</option>
                  {nodes.filter((n: any) => n.id && n.id !== activeNode?.id).length > 0 && (
                    <optgroup label="Navigate to Node:">
                      {nodes
                        .filter((n: any) => n.id && n.id !== activeNode?.id)
                        .map((n: any, nIdx: number) => (
                          <option key={n.id} value={String(n.id)}>
                            ➜ {n.title || `Node ${nIdx + 1}`}
                          </option>
                        ))}
                    </optgroup>
                  )}
                  <option value="__new__">➕ Create New Scenario Node...</option>
                </select>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Lesson-Specific Assessment Payload Editor ─────────────────────────────

interface AssessmentPayloadEditorProps {
  lessonId?: number | string;
  blockId: string;
  showToast: (msg: string, ok?: boolean) => void;
}

export function AssessmentPayloadEditor({ lessonId, blockId, showToast }: AssessmentPayloadEditorProps) {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const numLessonId = lessonId ? Number(String(lessonId).replace(/^l/, '')) : null;

  const loadQuestions = React.useCallback(async () => {
    if (!numLessonId) return;
    setLoading(true);
    try {
      const res = await authFetch(`${API_BASE}/lessons/${numLessonId}/assessment/questions/`);
      if (res.ok) {
        const data = await res.json();
        setQuestions(data);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [numLessonId]);

  useEffect(() => {
    loadQuestions();
  }, [loadQuestions]);

  const handleDownloadTemplate = async () => {
    if (!numLessonId) {
      showToast("Lesson ID not available", false);
      return;
    }
    try {
      const res = await authFetch(`${API_BASE}/lessons/${numLessonId}/assessment/template/`);
      if (!res.ok) throw new Error("Failed to download template");
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `lesson_${numLessonId}_assessment_template.csv`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
      showToast("Downloaded CSV Template");
    } catch (e: any) {
      showToast(e.message || "Download failed", false);
    }
  };

  const handleUploadCsv = async (file: File) => {
    if (!numLessonId) {
      showToast("Lesson ID not available", false);
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await authFetch(`${API_BASE}/lessons/${numLessonId}/assessment/import/`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        showToast(data.message || `Successfully imported ${data.count || 0} questions!`);
        if (data.questions) {
          setQuestions(data.questions);
        } else {
          await loadQuestions();
        }
      } else {
        showToast(data.error || "Failed to import CSV", false);
      }
    } catch (e: any) {
      showToast(e.message || "CSV import error", false);
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  return (
    <div className="space-y-4 pt-2 border-t border-border">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Lesson Assessment Bank</h4>
          <p className="text-[10px] text-muted-foreground">Configured specifically for this lesson</p>
        </div>
        <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-brand/10 text-brand border border-brand/20">
          {questions.length} Questions
        </span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={handleDownloadTemplate}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-muted/60 hover:bg-muted text-foreground border border-border transition-all"
        >
          <Upload className="size-3 rotate-180 text-muted-foreground" />
          <span>Template CSV</span>
        </button>

        <button
          type="button"
          disabled={uploading}
          onClick={() => fileInputRef.current?.click()}
          className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-brand text-brand-foreground hover:bg-brand-hover shadow-sm transition-all disabled:opacity-50"
        >
          {uploading ? <Loader2 className="size-3 animate-spin" /> : <Upload className="size-3" />}
          <span>Import CSV</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleUploadCsv(file);
          }}
        />
      </div>

      {loading ? (
        <div className="py-6 flex items-center justify-center gap-2 text-xs text-muted-foreground">
          <Loader2 className="size-4 animate-spin text-brand" />
          <span>Loading questions...</span>
        </div>
      ) : questions.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-4 text-center space-y-2 bg-muted/20">
          <CheckSquare className="size-6 text-muted-foreground mx-auto opacity-50" />
          <p className="text-xs font-bold text-foreground">No questions in this lesson yet</p>
          <p className="text-[10px] text-muted-foreground max-w-[28ch] mx-auto leading-relaxed">
            Download the CSV template, add your questions & explanations, and import it here.
          </p>
        </div>
      ) : (
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {questions.map((q, idx) => (
            <div key={q.id || idx} className="p-2.5 rounded-xl border border-border bg-card/80 space-y-1.5 text-xs">
              <div className="flex items-start justify-between gap-2">
                <span className="font-bold text-foreground leading-snug">
                  {idx + 1}. {q.question_text}
                </span>
                <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded bg-brand/10 text-brand border border-brand/20 shrink-0">
                  Ans: {q.correct_option}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
                <div className={`px-1.5 py-0.5 rounded ${q.correct_option === 'A' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold' : ''}`}>
                  A: {q.option_a}
                </div>
                <div className={`px-1.5 py-0.5 rounded ${q.correct_option === 'B' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold' : ''}`}>
                  B: {q.option_b}
                </div>
                <div className={`px-1.5 py-0.5 rounded ${q.correct_option === 'C' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold' : ''}`}>
                  C: {q.option_c}
                </div>
                <div className={`px-1.5 py-0.5 rounded ${q.correct_option === 'D' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold' : ''}`}>
                  D: {q.option_d}
                </div>
              </div>
              {q.explanation && (
                <div className="text-[10px] text-muted-foreground bg-muted/40 p-1.5 rounded border border-border/50">
                  <strong className="text-foreground">Explanation:</strong> {q.explanation}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

