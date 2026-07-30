import React from "react";
import { RestrictedVideoPlayer } from "@/components/RestrictedVideoPlayer";
import {
  Video, FileText, Puzzle, CheckSquare, GitBranch, Sparkles,
  Heading, AlignLeft, Image as ImageIcon, Music, Table, Quote, Code, AlertTriangle, HelpCircle
} from "lucide-react";

export interface PolymorphicLessonProps {
  lesson: {
    id: number | string;
    title: string;
    type: "video" | "interactive" | "reading" | "knowledge_check" | "scenario" | string;
    video_url?: string | null;
    videoSrc?: string | null;
    interaction?: string | null;
    block_tree?: {
      id: number;
      version: number;
      blocks: any[];
    } | null;
    reading_content?: string | null;
  };
  onVideoComplete?: () => void;
  isAuthoringPreview?: boolean;
}

export function PolymorphicLessonRenderer({
  lesson,
  onVideoComplete,
  isAuthoringPreview = false,
}: PolymorphicLessonProps) {
  const videoSource = lesson.video_url || lesson.videoSrc;
  const blocks = lesson.block_tree?.blocks || [];

  switch (lesson.type) {
    case "video":
      if (videoSource) {
        if (isAuthoringPreview) {
          return (
            <div className="space-y-3">
              <video src={videoSource} controls className="w-full rounded-2xl shadow-xl border border-border" />
              <div className="text-xs text-muted-foreground text-center font-medium">Video Author Preview Mode</div>
            </div>
          );
        }
        return (
          <div className="space-y-4">
            <RestrictedVideoPlayer
              key={String(lesson.id)}
              src={videoSource}
              lessonId={String(lesson.id)}
              onComplete={onVideoComplete || (() => {})}
            />
            <div className="flex items-center gap-3 text-xs text-foreground bg-card border border-border rounded-2xl px-5 py-4 shadow-md">
              <div className="size-2.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
              <span>
                <strong className="text-foreground font-bold">Restricted mode:</strong> Video progress is automatically recorded upon full completion.
              </span>
            </div>
          </div>
        );
      }
      return (
        <div className="rounded-3xl border border-border bg-card/90 p-8 text-center shadow-xl">
          <Video className="size-10 text-emerald-400/40 mx-auto mb-3" />
          <p className="text-sm font-bold text-foreground mb-1">No video attached yet</p>
          <p className="text-xs text-muted-foreground max-w-[40ch] mx-auto leading-relaxed">
            Upload a video file in the Content Authoring editor to enable playback.
          </p>
        </div>
      );

    case "reading":
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1.5 rounded-full w-max border border-emerald-500/20">
            <FileText className="size-3.5" />
            Reading Lesson
          </div>
          {blocks.length > 0 ? (
            <BlockTreeRenderer blocks={blocks} />
          ) : lesson.reading_content ? (
            <div
              className="prose prose-invert max-w-none text-foreground leading-relaxed text-sm md:text-base space-y-4"
              dangerouslySetInnerHTML={{ __html: lesson.reading_content }}
            />
          ) : (
            <div className="rounded-3xl border border-border bg-card/90 p-8 text-center shadow-xl space-y-3">
              <FileText className="size-10 text-emerald-400/40 mx-auto mb-2" />
              <p className="text-sm font-bold text-foreground">Reading Article & Document</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                This reading lesson is ready for content authoring. Use the Content Builder to add text, headings, callouts, and PDF embeds.
              </p>
            </div>
          )}
        </div>
      );

    case "interactive":
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 bg-indigo-500/10 px-3 py-1.5 rounded-full w-max border border-indigo-500/20">
            <Puzzle className="size-3.5" />
            Interactive Lesson
          </div>
          {blocks.length > 0 ? (
            <BlockTreeRenderer blocks={blocks} />
          ) : (
            <div className="rounded-3xl border border-border bg-card/90 p-8 text-center shadow-xl space-y-3">
              <Puzzle className="size-10 text-indigo-400/40 mx-auto mb-2" />
              <p className="text-sm font-bold text-foreground">Interactive Learning Activity</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                This interactive lesson is ready for content authoring. Use the Content Builder to add interactive widgets, drag-and-drop activities, and flashcards.
              </p>
            </div>
          )}
        </div>
      );

    case "knowledge_check":
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-full w-max border border-amber-500/20">
            <CheckSquare className="size-3.5" />
            Knowledge Check Lesson
          </div>
          {blocks.length > 0 ? (
            <BlockTreeRenderer blocks={blocks} />
          ) : (
            <div className="rounded-3xl border border-border bg-card/90 p-8 text-center shadow-xl space-y-3">
              <CheckSquare className="size-10 text-amber-400/40 mx-auto mb-2" />
              <p className="text-sm font-bold text-foreground">Knowledge Check Evaluation</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                This knowledge check is ready for content authoring. Use the Content Builder to add practice questions, quizzes, and self-assessment items.
              </p>
            </div>
          )}
        </div>
      );

    case "scenario":
      return (
        <div className="space-y-6">
          <div className="flex items-center gap-2 text-xs font-bold text-teal-400 bg-teal-500/10 px-3 py-1.5 rounded-full w-max border border-teal-500/20">
            <GitBranch className="size-3.5" />
            Branching Scenario Lesson
          </div>
          {blocks.length > 0 ? (
            <BlockTreeRenderer blocks={blocks} />
          ) : (
            <div className="rounded-3xl border border-border bg-card/90 p-8 text-center shadow-xl space-y-3">
              <GitBranch className="size-10 text-teal-400/40 mx-auto mb-2" />
              <p className="text-sm font-bold text-foreground">Branching Scenario Simulation</p>
              <p className="text-xs text-muted-foreground max-w-md mx-auto leading-relaxed">
                This scenario simulation is ready for content authoring. Use the Content Builder to add decision nodes, branching paths, and case studies.
              </p>
            </div>
          )}
        </div>
      );

    default:
      return (
        <div className="rounded-3xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Unsupported lesson type: {lesson.type}</p>
        </div>
      );
  }
}

function BlockTreeRenderer({ blocks }: { blocks: any[] }) {
  const [selectedChoices, setSelectedChoices] = React.useState<Record<number | string, string[]>>({});
  const [evaluations, setEvaluations] = React.useState<Record<number | string, any>>({});
  const [activeTabIndices, setActiveTabIndices] = React.useState<Record<string, number>>({});

  const handleEvaluate = async (qId: number | string, blockId: string) => {
    const choices = selectedChoices[qId] || [];
    try {
      const res = await fetch(`http://127.0.0.1:8000/api/authoring/kc-questions/${qId}/evaluate/`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ selected_choices: choices }),
      });
      if (res.ok) {
        const result = await res.json();
        setEvaluations(prev => ({ ...prev, [qId]: result }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="space-y-6">
      {blocks.map((block: any, idx: number) => {
        const mediaUrl = block.reading_payload?.meta_data?.url;
        const calloutStyle = block.reading_payload?.meta_data?.style || "info";

        // Alignment & Layout Width classes
        const align = block.settings?.align || "left";
        const textAlignClass = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
        const alignClass = align === "right" ? "text-right flex flex-col items-end" : align === "center" ? "text-center flex flex-col items-center" : "text-left flex flex-col items-start";
        const width = block.settings?.width || "full";
        const widthClass = width === "narrow" ? "max-w-xl mx-auto" : width === "constrained" ? "max-w-3xl mx-auto" : "w-full";

        // Heading level detection & dynamic HTML rendering
        const rawHtml = block.reading_payload?.html_content || "<h2>Heading</h2>";
        const cleanHeadingText = rawHtml.replace(/<[^>]*>/g, "").trim() || "Heading";
        const tagMatch = rawHtml.match(/^<(h[1-6])/i);
        const levelTag = tagMatch ? tagMatch[1].toLowerCase() : (block.reading_payload?.meta_data?.level || "h2");

        const tagStyles: Record<string, string> = {
          h1: "text-3xl sm:text-4xl font-black tracking-tight text-foreground my-1",
          h2: "text-2xl sm:text-3xl font-extrabold tracking-tight text-foreground my-1",
          h3: "text-xl sm:text-2xl font-bold tracking-tight text-foreground my-1",
          h4: "text-lg sm:text-xl font-bold text-foreground my-1",
          h5: "text-base font-semibold text-foreground my-0.5",
          h6: "text-xs font-bold uppercase tracking-wider text-muted-foreground my-0.5",
        };
        const headingStyle = tagStyles[levelTag] || tagStyles.h2;

        return (
          <div key={block.id || idx} className={`rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4 ${widthClass} ${textAlignClass}`}>
            {/* Heading Block */}
            {block.block_type === "heading" && (
              <div className={`w-full ${textAlignClass}`}>
                {levelTag === "h1" && <h1 className={`${headingStyle} ${textAlignClass} w-full block`}>{cleanHeadingText}</h1>}
                {levelTag === "h2" && <h2 className={`${headingStyle} ${textAlignClass} w-full block`}>{cleanHeadingText}</h2>}
                {levelTag === "h3" && <h3 className={`${headingStyle} ${textAlignClass} w-full block`}>{cleanHeadingText}</h3>}
                {levelTag === "h4" && <h4 className={`${headingStyle} ${textAlignClass} w-full block`}>{cleanHeadingText}</h4>}
                {levelTag === "h5" && <h5 className={`${headingStyle} ${textAlignClass} w-full block`}>{cleanHeadingText}</h5>}
                {levelTag === "h6" && <h6 className={`${headingStyle} ${textAlignClass} w-full block`}>{cleanHeadingText}</h6>}
              </div>
            )}

            {/* Paragraph Block */}
            {block.block_type === "paragraph" && (
              <div
                className="prose prose-invert max-w-none text-foreground leading-relaxed text-sm md:text-base"
                dangerouslySetInnerHTML={{ __html: block.reading_payload?.html_content || "<p>Paragraph content</p>" }}
              />
            )}

            {/* Quote Block */}
            {block.block_type === "quote" && (
              <blockquote className="border-l-4 border-brand pl-4 py-2 italic text-foreground bg-muted/30 rounded-r-xl">
                <div dangerouslySetInnerHTML={{ __html: block.reading_payload?.html_content || "Quote text..." }} />
                {block.reading_payload?.meta_data?.author && (
                  <cite className="block text-xs font-bold text-brand mt-2 not-italic">
                    — {block.reading_payload.meta_data.author}
                  </cite>
                )}
              </blockquote>
            )}

            {/* Callout Block */}
            {block.block_type === "callout" && (
              <div className={`flex items-start gap-3 p-4 rounded-xl border text-xs sm:text-sm font-medium ${
                calloutStyle === "warning" ? "bg-amber-500/10 border-amber-500/30 text-amber-200" :
                calloutStyle === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200" :
                calloutStyle === "tip" ? "bg-purple-500/10 border-purple-500/30 text-purple-200" :
                "bg-cyan-500/10 border-cyan-500/30 text-cyan-200"
              }`}>
                <AlertTriangle className="size-5 shrink-0 mt-0.5 text-amber-400" />
                <div dangerouslySetInnerHTML={{ __html: block.reading_payload?.html_content || "Callout note" }} />
              </div>
            )}

            {/* Code Block */}
            {block.block_type === "code" && (
              <div className="rounded-xl border border-border bg-slate-950 p-4 font-mono text-xs text-emerald-400 overflow-x-auto">
                <div className="text-[10px] uppercase font-bold text-muted-foreground mb-2 pb-1 border-b border-border/40">
                  {block.reading_payload?.meta_data?.language || "code"}
                </div>
                <pre>{block.reading_payload?.html_content?.replace(/<[^>]*>/g, "") || "// Code snippet"}</pre>
              </div>
            )}

            {/* Media Blocks */}
            {block.block_type === "image" && (
              <div className="space-y-2 text-center">
                {mediaUrl ? (
                  <img src={mediaUrl} alt="Lesson Media" className="max-h-96 rounded-2xl mx-auto shadow-md object-contain" />
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: block.reading_payload?.html_content || "" }} />
                )}
              </div>
            )}

            {block.block_type === "video" && (
              <div className="space-y-2">
                {mediaUrl ? (
                  <video src={mediaUrl} controls className="w-full rounded-2xl shadow-lg border border-border max-h-[480px]" />
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: block.reading_payload?.html_content || "" }} />
                )}
              </div>
            )}

            {block.block_type === "audio" && (
              <div className="space-y-2">
                {mediaUrl ? (
                  <audio src={mediaUrl} controls className="w-full" />
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: block.reading_payload?.html_content || "" }} />
                )}
              </div>
            )}

            {block.block_type === "pdf" && (
              <div className="space-y-2">
                {mediaUrl ? (
                  <iframe src={mediaUrl} className="w-full h-[500px] rounded-2xl border border-border" title="PDF Reader" />
                ) : (
                  <div dangerouslySetInnerHTML={{ __html: block.reading_payload?.html_content || "" }} />
                )}
              </div>
            )}

            {/* Table Block */}
            {block.block_type === "table" && (
              <div
                className="overflow-x-auto prose prose-invert max-w-none text-xs sm:text-sm"
                dangerouslySetInnerHTML={{ __html: block.reading_payload?.html_content || "<table></table>" }}
              />
            )}

            {/* Interaction Block */}
            {block.block_type === "interaction" && (
              <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-5 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
                  <Sparkles className="size-4" />
                  <span>Interactive Activity ({block.interaction_payload?.interaction_type || "Widget"})</span>
                </div>
                {block.interaction_payload?.config?.items && block.interaction_payload.config.items.length > 0 ? (
                  <div className="space-y-3">
                    <div className="flex gap-2 overflow-x-auto pb-2 border-b border-indigo-500/20">
                      {block.interaction_payload.config.items.map((it: any, i: number) => {
                        const active = (activeTabIndices[block.id] || 0) === i;
                        return (
                          <button
                            key={i}
                            onClick={() => setActiveTabIndices(prev => ({ ...prev, [block.id]: i }))}
                            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
                              active ? "bg-indigo-500 text-white shadow-md" : "bg-card text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            {it.title || `Tab ${i + 1}`}
                          </button>
                        );
                      })}
                    </div>
                    <div className="p-4 rounded-xl bg-card border border-border text-xs leading-relaxed text-foreground">
                      {block.interaction_payload.config.items[activeTabIndices[block.id] || 0]?.content}
                    </div>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Interactive widget ready for content authoring.</p>
                )}
              </div>
            )}

            {/* Quiz Block */}
            {block.block_type === "quiz" && block.kc_questions && block.kc_questions.length > 0 && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <CheckSquare className="size-4" />
                  <span>Knowledge Check Evaluation</span>
                </div>

                {block.kc_questions.map((q: any) => {
                  const evalResult = evaluations[q.id];
                  const currentSelected = selectedChoices[q.id] || [];

                  return (
                    <div key={q.id} className="space-y-3">
                      <p className="text-sm font-bold text-foreground">{q.prompt}</p>
                      <div className="space-y-2">
                        {q.choices?.map((c: any) => {
                          const isChecked = currentSelected.includes(c.id);
                          return (
                            <label
                              key={c.id}
                              className={`flex items-center gap-3 p-3 rounded-xl border transition-all cursor-pointer text-xs font-medium ${
                                isChecked ? "border-amber-400 bg-amber-500/10 text-foreground" : "border-border bg-card hover:border-brand/40"
                              }`}
                            >
                              <input
                                type={q.question_type === "multiple_select" ? "checkbox" : "radio"}
                                name={`q_${q.id}`}
                                checked={isChecked}
                                onChange={() => {
                                  if (q.question_type === "multiple_select") {
                                    const next = isChecked ? currentSelected.filter(id => id !== c.id) : [...currentSelected, c.id];
                                    setSelectedChoices(prev => ({ ...prev, [q.id]: next }));
                                  } else {
                                    setSelectedChoices(prev => ({ ...prev, [q.id]: [c.id] }));
                                  }
                                }}
                                className="accent-amber-400 size-4"
                              />
                              <span>{c.text}</span>
                            </label>
                          );
                        })}
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        <button
                          onClick={() => handleEvaluate(q.id, block.id)}
                          className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 transition-all shadow-md"
                        >
                          Submit Answer
                        </button>

                        {evalResult && (
                          <span className={`text-xs font-bold px-3 py-1 rounded-full ${
                            evalResult.is_correct ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/40" : "bg-rose-500/20 text-rose-400 border border-rose-500/40"
                          }`}>
                            {evalResult.is_correct ? "Correct! +100%" : "Try Again"}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Scenario Block */}
            {block.block_type === "scenario" && block.scenario_nodes && block.scenario_nodes.length > 0 && (
              <div className="rounded-2xl border border-teal-500/30 bg-teal-500/5 p-5 space-y-4">
                <div className="flex items-center gap-2 text-xs font-bold text-teal-400 uppercase tracking-wider">
                  <GitBranch className="size-4" />
                  <span>Branching Scenario Simulation</span>
                </div>
                <div className="space-y-3">
                  <h4 className="text-sm font-bold text-foreground">{block.scenario_nodes[0].title}</h4>
                  <p className="text-xs leading-relaxed text-muted-foreground">{block.scenario_nodes[0].content}</p>
                  {block.scenario_nodes[0].choices && block.scenario_nodes[0].choices.length > 0 && (
                    <div className="space-y-2 pt-2">
                      {block.scenario_nodes[0].choices.map((c: any, i: number) => (
                        <button
                          key={i}
                          className="w-full text-left p-3 rounded-xl border border-teal-500/30 bg-card hover:bg-teal-500/10 text-xs font-medium text-foreground transition-all"
                        >
                          👉 {c.text}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
