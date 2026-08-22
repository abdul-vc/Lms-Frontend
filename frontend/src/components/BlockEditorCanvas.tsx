import React, { useState } from "react";
import {
  Heading, AlignLeft, Video, Image as ImageIcon, Music, Table,
  Quote, Code, AlertTriangle, FileText, Puzzle, CheckSquare, GitBranch,
  Trash2, MoveUp, MoveDown, Settings, Plus, Loader2, Sparkles
} from "lucide-react";
import { authFetch, API_BASE, normalizeUrl } from "@/lib/auth";
import {
  ReadingPayloadEditor,
  InteractionPayloadEditor,
  QuizPayloadEditor,
  ScenarioPayloadEditor,
  AssessmentPayloadEditor
} from "@/components/BlockPayloadEditors";
import { parseCsvToTable, type StructuredTableData } from "@/lib/table-utils";

export interface LessonBlockItem {
  id: string;
  block_type: string;
  order: number;
  settings: Record<string, any>;
  reading_payload?: { id: number; html_content: string; markdown_content: string; meta_data?: any } | null;
  interaction_payload?: { id: number; interaction_type: string; config: Record<string, any> } | null;
  kc_questions?: any[];
  scenario_nodes?: any[];
}

export interface BlockTreeData {
  id: number;
  version: number;
  root_block_ids: string[];
  blocks: LessonBlockItem[];
}

const BLOCK_TYPES = [
  { type: "heading", label: "Heading", icon: Heading },
  { type: "paragraph", label: "Paragraph", icon: AlignLeft },
  { type: "video", label: "Video", icon: Video },
  { type: "image", label: "Image", icon: ImageIcon },
  { type: "audio", label: "Audio", icon: Music },
  { type: "table", label: "Table", icon: Table },
  { type: "quote", label: "Quote", icon: Quote },
  { type: "code", label: "Code", icon: Code },
  { type: "callout", label: "Callout", icon: AlertTriangle },
  { type: "pdf", label: "PDF Document", icon: FileText },
  { type: "interaction", label: "Interaction", icon: Puzzle },
  { type: "quiz", label: "Knowledge Check", icon: CheckSquare },
  { type: "scenario", label: "Scenario", icon: GitBranch },
  { type: "assessment", label: "Assessment", icon: CheckSquare },
];

interface BlockEditorCanvasProps {
  tree: BlockTreeData;
  lessonId?: number | string;
  onTreeUpdated: () => void;
  onBlockPayloadUpdated?: (blockId: string, updatedPayload: any) => void;
  showToast: (msg: string, ok?: boolean) => void;
}

export function BlockEditorCanvas({ tree, lessonId, onTreeUpdated, onBlockPayloadUpdated, showToast }: BlockEditorCanvasProps) {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [addingType, setAddingType] = useState<string | null>(null);
  const [reordering, setReordering] = useState(false);

  const selectedBlock = tree.blocks.find(b => b.id === selectedBlockId);

  // Sort blocks based on root_block_ids order
  const rootIds = tree.root_block_ids || [];
  const orderedBlocks = [...tree.blocks].sort((a, b) => {
    const idxA = rootIds.indexOf(a.id);
    const idxB = rootIds.indexOf(b.id);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    return a.order - b.order;
  });

  const handleAddBlock = async (type: string) => {
    setAddingType(type);
    try {
      const res = await authFetch(`${API_BASE}/authoring/blocks/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tree: tree.id,
          block_type: type,
          order: orderedBlocks.length,
          settings: { align: "left", width: "full" },
        }),
      });

      if (res.ok) {
        const created = await res.json();
        setSelectedBlockId(created.id);
        showToast(`Added ${type} block`);
        onTreeUpdated();
      } else {
        const err = await res.json();
        showToast(err.detail || "Failed to add block", false);
      }
    } catch (e: any) {
      showToast(e.message || "Failed to add block", false);
    } finally {
      setAddingType(null);
    }
  };

  const handleDeleteBlock = async (blockId: string) => {
    if (!confirm("Delete this block?")) return;
    try {
      const res = await authFetch(`${API_BASE}/authoring/blocks/${blockId}/`, {
        method: "DELETE",
      });
      if (res.ok) {
        if (selectedBlockId === blockId) setSelectedBlockId(null);
        showToast("Block deleted");
        onTreeUpdated();
      }
    } catch (e: any) {
      showToast("Failed to delete block", false);
    }
  };

  const handleMove = async (index: number, direction: "up" | "down") => {
    if (reordering) return;
    const targetIdx = direction === "up" ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= orderedBlocks.length) return;

    const newOrder = [...orderedBlocks.map(b => b.id)];
    const temp = newOrder[index];
    newOrder[index] = newOrder[targetIdx];
    newOrder[targetIdx] = temp;

    setReordering(true);
    try {
      const res = await authFetch(`${API_BASE}/authoring/trees/${tree.id}/reorder/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parent_block_id: null,
          ordered_block_ids: newOrder,
        }),
      });

      if (res.ok) {
        onTreeUpdated();
      }
    } catch (e) {
      showToast("Failed to reorder blocks", false);
    } finally {
      setReordering(false);
    }
  };

  return (
    <div className="grid lg:grid-cols-[1fr_320px] h-full gap-4">
      {/* Center Block Canvas */}
      <div className="space-y-4 overflow-y-auto pr-2">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
            <Sparkles className="size-4 text-brand" />
            Block Canvas ({orderedBlocks.length} blocks)
          </h3>
          <span className="text-xs text-muted-foreground font-semibold">Version {tree.version}</span>
        </div>

        {orderedBlocks.length === 0 ? (
          <div className="p-8 text-center border-2 border-dashed border-border rounded-2xl bg-muted/20">
            <p className="text-sm text-muted-foreground mb-3 font-medium">No content blocks in this lesson yet.</p>
            <p className="text-xs text-muted-foreground mb-4">Click any block type below to insert it into the canvas.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {orderedBlocks.map((block, idx) => {
              const isSelected = block.id === selectedBlockId;
              const IconComp = BLOCK_TYPES.find(b => b.type === block.block_type)?.icon || FileText;

              return (
                <div
                  key={block.id}
                  onClick={() => setSelectedBlockId(block.id)}
                  className={`p-4 rounded-xl border transition-all cursor-pointer relative group ${
                    isSelected
                      ? "border-brand ring-2 ring-brand/20 bg-card shadow-md"
                      : "border-border bg-card/70 hover:border-brand/40 hover:bg-card"
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="size-6 rounded-md bg-brand/10 text-brand grid place-items-center">
                        <IconComp className="size-3.5" />
                      </div>
                      <span className="text-xs font-bold uppercase tracking-wider text-brand">
                        {block.block_type}
                      </span>
                    </div>

                    <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMove(idx, "up"); }}
                        disabled={idx === 0 || reordering}
                        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 rounded hover:bg-muted"
                        title="Move Up"
                      >
                        <MoveUp className="size-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleMove(idx, "down"); }}
                        disabled={idx === orderedBlocks.length - 1 || reordering}
                        className="p-1 text-muted-foreground hover:text-foreground disabled:opacity-30 rounded hover:bg-muted"
                        title="Move Down"
                      >
                        <MoveDown className="size-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleDeleteBlock(block.id); }}
                        className="p-1 text-muted-foreground hover:text-destructive rounded hover:bg-muted"
                        title="Delete Block"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Block Content Display */}
                  <div className="text-sm text-foreground min-w-0 max-w-full overflow-hidden">
                    {block.block_type === "assessment" ? (
                      <div className="text-xs text-brand font-semibold bg-brand/10 p-3 rounded-xl border border-brand/20 space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <CheckSquare className="size-4 text-brand" />
                            <span className="font-bold text-foreground">Lesson Assessment Question Bank</span>
                          </div>
                          <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-brand/20 text-brand">
                            CSV Bank
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground font-normal">
                          Configured specifically for this lesson. Click to download template, import CSV, or view question bank.
                        </div>
                      </div>
                    ) : block.block_type === "quiz" && block.kc_questions && block.kc_questions.length > 0 ? (
                      <div className="text-xs text-amber-300 font-semibold bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 space-y-1">
                        <div className="flex items-center gap-1.5"><CheckSquare className="size-3.5 text-amber-400" /> {block.kc_questions[0].prompt || "Knowledge Check Question"}</div>
                        <div className="text-[10px] text-muted-foreground font-normal">
                          {block.kc_questions[0].question_type === "fill_blank"
                            ? `Fill in the Blank · Answer: "${block.kc_questions[0].choices?.find((c: any) => c.is_correct)?.text || block.kc_questions[0].choices?.[0]?.text || ""}"`
                            : `${block.kc_questions[0].choices?.length || 0} choice options configured`}
                          {block.kc_questions.length > 1 ? ` · +${block.kc_questions.length - 1} more question(s)` : ""}
                        </div>
                      </div>
                    ) : block.block_type === "scenario" && block.scenario_nodes && block.scenario_nodes.length > 0 ? (
                      <div className="text-xs text-teal-300 font-semibold bg-teal-500/10 p-2.5 rounded-lg border border-teal-500/20 space-y-1">
                        <div className="flex items-center gap-1.5"><GitBranch className="size-3.5 text-teal-400" /> {block.scenario_nodes[0].title || "Scenario Decision Point"}</div>
                        <div className="text-[10px] text-muted-foreground font-normal">{block.scenario_nodes[0].content}</div>
                      </div>
                    ) : block.interaction_payload ? (
                      <div className="text-xs text-indigo-300 font-semibold bg-indigo-500/10 p-2.5 rounded-lg border border-indigo-500/20 flex items-center justify-between">
                        <span>
                          Widget:{" "}
                          {block.interaction_payload.interaction_type === "tabs" ? "Tabs" :
                           block.interaction_payload.interaction_type === "accordion" ? "Accordion" :
                           block.interaction_payload.interaction_type === "timeline" ? "Interactive Timeline" :
                           block.interaction_payload.interaction_type === "flashcards" ? "Flashcards" :
                           block.interaction_payload.interaction_type === "hotspots" ? "Interactive Hotspots" :
                           block.interaction_payload.interaction_type === "before_after" ? "Before / After Comparison" :
                           block.interaction_payload.interaction_type === "clickable_cards" ? "Clickable Cards" :
                           block.interaction_payload.interaction_type === "process_flow" ? "Process Step Flow" :
                           block.interaction_payload.interaction_type?.toUpperCase() || "Widget"}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {block.interaction_payload.interaction_type === "before_after"
                            ? (block.interaction_payload.config?.before_image && block.interaction_payload.config?.after_image ? "2 images configured" : "Configured")
                            : `${block.interaction_payload.config?.items?.length || 0} items`}
                        </span>
                      </div>
                    ) : block.block_type === "table" ? (
                      <TableCanvasPreview block={block} />
                    ) : block.block_type === "callout" ? (
                      <CalloutCanvasPreview block={block} />
                    ) : block.reading_payload?.meta_data?.url ? (
                      <div className="space-y-1">
                        <span className="text-xs font-bold text-brand flex items-center gap-1"><ImageIcon className="size-3.5" /> Media: {block.reading_payload.meta_data.filename || "Attached asset"}</span>
                        {block.block_type === "image" && <img src={normalizeUrl(block.reading_payload.meta_data.url)} alt="Canvas preview" className="max-h-32 rounded-lg" />}
                        {block.block_type === "video" && <video src={normalizeUrl(block.reading_payload.meta_data.url)} controls className="max-h-32 w-full rounded-lg" />}
                        {block.block_type === "audio" && <audio src={normalizeUrl(block.reading_payload.meta_data.url)} controls className="w-full" />}
                      </div>
                    ) : block.reading_payload?.html_content ? (
                      <div
                        className="prose prose-sm prose-invert max-w-none line-clamp-3 break-words [overflow-wrap:anywhere] [word-break:break-word] whitespace-pre-wrap min-w-0 max-w-full [&_p]:break-words [&_p]:[overflow-wrap:anywhere] [&_p]:[word-break:break-word] [&_p]:whitespace-pre-wrap [&_p]:max-w-full [&_p]:min-w-0"
                        dangerouslySetInnerHTML={{ __html: block.reading_payload.html_content }}
                      />
                    ) : (
                      <div className="text-xs text-muted-foreground italic">
                        Click block to edit properties & content payload
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Add Block Palette */}
        <div className="pt-5 border-t border-border">
          <div className="flex items-center justify-between mb-3">
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest">Add New Block</p>
            <span className="text-[10px] text-muted-foreground font-medium">{BLOCK_TYPES.length} block types</span>
          </div>
          <div className="grid grid-cols-2 min-[440px]:grid-cols-3 sm:grid-cols-4 md:grid-cols-4 lg:grid-cols-4 gap-2.5">
            {BLOCK_TYPES.map(({ type, label, icon: Icon }) => (
              <button
                key={type}
                onClick={() => handleAddBlock(type)}
                disabled={addingType !== null}
                title={`Insert ${label} block`}
                className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-card hover:bg-muted/80 hover:border-brand/40 transition-all text-center group disabled:opacity-50 select-none shadow-xs"
              >
                <div className="size-8 rounded-lg bg-brand/10 text-brand grid place-items-center group-hover:bg-brand group-hover:text-brand-foreground transition-colors shrink-0 mb-1.5">
                  <Icon className="size-4" />
                </div>
                <span className="text-xs font-semibold text-foreground truncate w-full text-center">{label}</span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Right Block Properties Drawer */}
      <div className="rounded-2xl border border-border bg-card p-4 h-full flex flex-col space-y-4 overflow-y-auto">
        <div className="flex items-center gap-2 pb-3 border-b border-border">
          <Settings className="size-4 text-brand" />
          <h4 className="text-xs font-bold text-foreground uppercase tracking-wider">Block Properties & Payload</h4>
        </div>

        {selectedBlock ? (
          <div className="space-y-4 text-xs">
            <div>
              <label className="block text-muted-foreground font-semibold mb-1">Block ID</label>
              <input
                readOnly
                value={selectedBlock.id}
                className="w-full bg-background border border-border rounded-lg p-2 font-mono text-[10px] text-muted-foreground"
              />
            </div>
            <div>
              <label className="block text-muted-foreground font-semibold mb-1">Type</label>
              <input
                readOnly
                value={selectedBlock.block_type.toUpperCase()}
                className="w-full bg-background border border-border rounded-lg p-2 font-bold text-brand"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-muted-foreground font-semibold mb-1">Layout Width</label>
                <select
                  value={selectedBlock.settings?.width || "full"}
                  onChange={(e) => {
                    const updated = { ...selectedBlock.settings, width: e.target.value };
                    if (onBlockPayloadUpdated) {
                      onBlockPayloadUpdated(selectedBlock.id, { settings: updated });
                    }
                    authFetch(`${API_BASE}/authoring/blocks/${selectedBlock.id}/`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ settings: updated }),
                    });
                  }}
                  className="w-full bg-background border border-border rounded-lg p-2 text-foreground"
                >
                  <option value="full">Full Width</option>
                  <option value="constrained">Constrained</option>
                  <option value="narrow">Narrow</option>
                </select>
              </div>
              <div>
                <label className="block text-muted-foreground font-semibold mb-1">Alignment</label>
                <select
                  value={selectedBlock.settings?.align || "left"}
                  onChange={(e) => {
                    const updated = { ...selectedBlock.settings, align: e.target.value };
                    if (onBlockPayloadUpdated) {
                      onBlockPayloadUpdated(selectedBlock.id, { settings: updated });
                    }
                    authFetch(`${API_BASE}/authoring/blocks/${selectedBlock.id}/`, {
                      method: "PATCH",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ settings: updated }),
                    });
                  }}
                  className="w-full bg-background border border-border rounded-lg p-2 text-foreground"
                >
                  <option value="left">Left</option>
                  <option value="center">Center</option>
                  <option value="right">Right</option>
                </select>
              </div>
            </div>

            {/* Render Specific Payload Editors */}
            {selectedBlock.block_type === "assessment" ? (
              <AssessmentPayloadEditor
                lessonId={lessonId}
                blockId={selectedBlock.id}
                showToast={showToast}
              />
            ) : selectedBlock.block_type === "interaction" ? (
              <InteractionPayloadEditor
                blockId={selectedBlock.id}
                payload={selectedBlock.interaction_payload}
                onSave={onTreeUpdated}
                onPayloadChange={(updatedPayload) => {
                  if (onBlockPayloadUpdated) {
                    onBlockPayloadUpdated(selectedBlock.id, { interaction_payload: updatedPayload });
                  }
                }}
                showToast={showToast}
              />
            ) : selectedBlock.block_type === "quiz" ? (
              <QuizPayloadEditor
                blockId={selectedBlock.id}
                questions={selectedBlock.kc_questions || []}
                onSave={onTreeUpdated}
                onPayloadChange={(updatedQuestions) => {
                  if (onBlockPayloadUpdated) {
                    onBlockPayloadUpdated(selectedBlock.id, { kc_questions: updatedQuestions });
                  }
                }}
                showToast={showToast}
              />
            ) : selectedBlock.block_type === "scenario" ? (
              <ScenarioPayloadEditor
                blockId={selectedBlock.id}
                nodes={selectedBlock.scenario_nodes || []}
                onSave={onTreeUpdated}
                onPayloadChange={(updatedNodes) => {
                  if (onBlockPayloadUpdated) {
                    onBlockPayloadUpdated(selectedBlock.id, { scenario_nodes: updatedNodes });
                  }
                }}
                showToast={showToast}
              />
            ) : (
              <ReadingPayloadEditor
                blockId={selectedBlock.id}
                blockType={selectedBlock.block_type}
                payload={selectedBlock.reading_payload}
                onSave={onTreeUpdated}
                onPayloadChange={(updatedPayload) => {
                  if (onBlockPayloadUpdated) {
                    onBlockPayloadUpdated(selectedBlock.id, updatedPayload);
                  }
                }}
                showToast={showToast}
              />
            )}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground text-xs">
            Select a block on the canvas to inspect and configure its content & property settings.
          </div>
        )}
      </div>
    </div>
  );
}

function TableCanvasPreview({ block }: { block: any }) {
  const tableData: StructuredTableData = React.useMemo(() => {
    const metaTable = block.reading_payload?.meta_data?.table_data;
    if (metaTable && Array.isArray(metaTable.headers) && Array.isArray(metaTable.rows)) {
      return metaTable;
    }
    const raw = block.reading_payload?.html_content || block.reading_payload?.markdown_content || "";
    return parseCsvToTable(raw);
  }, [block.reading_payload]);

  return (
    <div className="w-full overflow-x-auto rounded-xl border border-border/70 bg-card/60 shadow-sm min-w-0 max-w-full my-1">
      <table className="w-full text-left text-xs border-collapse min-w-full">
        <thead>
          <tr className="border-b border-border bg-muted/60">
            {tableData.headers.map((h: string, idx: number) => (
              <th
                key={idx}
                className="px-3 py-2 text-[11px] font-bold uppercase tracking-wider text-foreground whitespace-normal break-words border-r border-border/30 last:border-r-0"
              >
                {h || `Column ${idx + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {tableData.rows.slice(0, 5).map((row: string[], rIdx: number) => (
            <tr key={rIdx} className="hover:bg-muted/20 transition-colors">
              {row.map((cell: string, cIdx: number) => (
                <td
                  key={cIdx}
                  className="px-3 py-2 text-xs text-foreground/90 whitespace-normal break-words [overflow-wrap:anywhere] border-r border-border/20 last:border-r-0"
                >
                  {cell || <span className="text-muted-foreground/30 italic">-</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      {tableData.rows.length > 5 && (
        <div className="px-3 py-1 bg-muted/30 text-[10px] text-muted-foreground text-center font-medium border-t border-border/40">
          + {tableData.rows.length - 5} more rows
        </div>
      )}
    </div>
  );
}

function CalloutCanvasPreview({ block }: { block: any }) {
  const calloutStyle = block.reading_payload?.meta_data?.style || "info";
  const align = block.settings?.align || "left";
  const width = block.settings?.width || "full";

  const widthClass = width === "narrow" ? "max-w-xl w-full" : width === "constrained" ? "max-w-2xl w-full" : "w-full";
  const justifyClass = align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start";

  return (
    <div className={`w-full flex ${justifyClass} min-w-0 max-w-full overflow-hidden my-0.5`}>
      <div
        className={`flex items-start gap-2.5 p-3 rounded-xl border text-xs font-medium ${widthClass} ${
          calloutStyle === "warning"
            ? "bg-amber-500/10 border-amber-500/30 text-amber-200"
            : calloutStyle === "success"
            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200"
            : calloutStyle === "tip"
            ? "bg-purple-500/10 border-purple-500/30 text-purple-200"
            : "bg-cyan-500/10 border-cyan-500/30 text-cyan-200"
        }`}
      >
        <AlertTriangle className="size-4 shrink-0 mt-0.5 text-amber-400" />
        <div
          className="break-words [overflow-wrap:anywhere] min-w-0"
          dangerouslySetInnerHTML={{ __html: block.reading_payload?.html_content || "Callout message" }}
        />
      </div>
    </div>
  );
}

