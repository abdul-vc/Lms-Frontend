import React from "react";
import { RestrictedVideoPlayer } from "@/components/RestrictedVideoPlayer";
import { authFetch, API_BASE, normalizeUrl } from "@/lib/auth";
import {
  Video, FileText, Puzzle, CheckSquare, GitBranch, Sparkles,
  Heading, AlignLeft, Image as ImageIcon, Music, Table, Quote, Code, AlertTriangle, HelpCircle,
  Check, X, ChevronRight, ChevronLeft, ChevronDown, RotateCw, RotateCcw, Loader2, Award, AlertCircle, MapPin
} from "lucide-react";
import {
  startLessonAssessment,
  submitLessonAssessment,
  fetchLessonAssessmentQuestions,
  type ApiAssessmentQuestion
} from "@/lib/courses-api";
import { parseCsvToTable, type StructuredTableData } from "@/lib/table-utils";

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
  const [localVideoCompleted, setLocalVideoCompleted] = React.useState(false);
  const rawSource = lesson.video_url || lesson.videoSrc;
  const videoSource = rawSource ? normalizeUrl(rawSource) : undefined;
  const blocks = lesson.block_tree?.blocks || [];

  const handleVideoEnded = React.useCallback(() => {
    setLocalVideoCompleted(true);
    if (onVideoComplete) onVideoComplete();
  }, [onVideoComplete]);

  switch (lesson.type) {
    case "video":
      return (
        <div className="space-y-6">
          {videoSource ? (
            isAuthoringPreview ? (
              <div className="space-y-3">
                <video src={videoSource} controls className="w-full rounded-2xl shadow-xl border border-border" />
                <div className="text-xs text-muted-foreground text-center font-medium">Video Author Preview Mode</div>
              </div>
            ) : (
              <div className="space-y-4">
                <RestrictedVideoPlayer
                  key={String(lesson.id)}
                  src={videoSource}
                  lessonId={String(lesson.id)}
                  onComplete={handleVideoEnded}
                />
                <div className="flex items-center gap-3 text-xs text-foreground bg-card border border-border rounded-2xl px-5 py-4 shadow-md">
                  <div className="size-2.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                  <span>
                    <strong className="text-foreground font-bold">Restricted mode:</strong> Video progress is automatically recorded upon full completion.
                  </span>
                </div>
              </div>
            )
          ) : (
            <div className="rounded-3xl border border-border bg-card/90 p-8 text-center shadow-xl">
              <Video className="size-10 text-brand/40 mx-auto mb-3" />
              <p className="text-sm font-bold text-foreground mb-1">No video attached yet</p>
              <p className="text-xs text-muted-foreground max-w-[40ch] mx-auto leading-relaxed">
                Upload a video file in the Content Authoring editor to enable playback.
              </p>
            </div>
          )}

          {/* Render additional blocks if present in video lesson */}
          {blocks.length > 0 && (
            <div className="pt-4 border-t border-border">
              <BlockTreeRenderer
                blocks={blocks}
                lessonId={lesson.id}
                isAuthoringPreview={isAuthoringPreview}
                onComplete={onVideoComplete}
                isVideoCompleted={localVideoCompleted}
              />
            </div>
          )}
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
            <BlockTreeRenderer blocks={blocks} lessonId={lesson.id} isAuthoringPreview={isAuthoringPreview} onComplete={onVideoComplete} />
          ) : lesson.reading_content ? (
            <div
              className="prose prose-invert max-w-none text-foreground leading-relaxed text-sm md:text-base space-y-4 break-words [overflow-wrap:anywhere] [word-break:break-word] whitespace-pre-wrap min-w-0 max-w-full [&_p]:break-words [&_p]:[overflow-wrap:anywhere] [&_p]:[word-break:break-word] [&_p]:whitespace-pre-wrap [&_p]:max-w-full [&_p]:min-w-0"
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
            <BlockTreeRenderer blocks={blocks} lessonId={lesson.id} isAuthoringPreview={isAuthoringPreview} onComplete={onVideoComplete} />
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
            <BlockTreeRenderer blocks={blocks} lessonId={lesson.id} isAuthoringPreview={isAuthoringPreview} onComplete={onVideoComplete} />
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
            <BlockTreeRenderer blocks={blocks} lessonId={lesson.id} isAuthoringPreview={isAuthoringPreview} onComplete={onVideoComplete} />
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
      if (blocks.length > 0) {
        return <BlockTreeRenderer blocks={blocks} lessonId={lesson.id} isAuthoringPreview={isAuthoringPreview} onComplete={onVideoComplete} />;
      }
      return (
        <div className="rounded-3xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground">Unsupported lesson type: {lesson.type}</p>
        </div>
      );
  }
}

function BlockTreeRenderer({
  blocks,
  lessonId,
  isAuthoringPreview = false,
  onComplete,
  isVideoCompleted = false,
}: {
  blocks: any[];
  lessonId?: number | string;
  isAuthoringPreview?: boolean;
  onComplete?: () => void;
  isVideoCompleted?: boolean;
}) {
  const [selectedChoices, setSelectedChoices] = React.useState<Record<number | string, string[]>>({});
  const [typedAnswers, setTypedAnswers] = React.useState<Record<number | string, string>>({});
  const [evaluations, setEvaluations] = React.useState<Record<number | string, any>>({});
  const [evaluating, setEvaluating] = React.useState<Record<number | string, boolean>>({});
  const [selectedScenarioChoices, setSelectedScenarioChoices] = React.useState<Record<string, { choiceIndex: number; choice: any }>>({});
  const [activeScenarioNodeIds, setActiveScenarioNodeIds] = React.useState<Record<string, string>>({});
  const [activeTabIndices, setActiveTabIndices] = React.useState<Record<string, number>>({});

  const handleEvaluate = async (q: any, blockId: string) => {
    const qId = q.id;
    const qType = q.question_type || q.type || "single_choice";
    const choices = selectedChoices[qId] || [];
    const typed = typedAnswers[qId] || "";

    setEvaluating(prev => ({ ...prev, [qId]: true }));

    // Local evaluation computation for instantaneous response or fallback
    let localIsCorrect = false;
    let localCorrectAnswers: string[] = [];
    if (qType === "single_choice" || qType === "true_false") {
      const correctChoice = q.choices?.find((c: any) => c.is_correct);
      localCorrectAnswers = correctChoice ? [correctChoice.text] : [];
      localIsCorrect = choices.length === 1 && Boolean(correctChoice && choices[0] === correctChoice.id);
    } else if (qType === "multiple_select") {
      const correctIds = q.choices?.filter((c: any) => c.is_correct).map((c: any) => c.id) || [];
      localCorrectAnswers = q.choices?.filter((c: any) => c.is_correct).map((c: any) => c.text) || [];
      localIsCorrect = correctIds.length > 0 && choices.length === correctIds.length && correctIds.every((id: string) => choices.includes(id));
    } else if (qType === "fill_blank") {
      const correctChoice = q.choices?.find((c: any) => c.is_correct) || q.choices?.[0];
      const correctText = (correctChoice?.text || "").trim();
      localCorrectAnswers = correctText ? [correctText] : [];
      localIsCorrect = Boolean(typed.trim() && typed.trim().toLowerCase() === correctText.toLowerCase());
    }

    try {
      if (typeof qId === "number" || (typeof qId === "string" && !String(qId).startsWith("temp_"))) {
        const res = await authFetch(`${API_BASE}/authoring/kc-questions/${qId}/evaluate/`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            selected_choices: choices,
            text_response: typed,
          }),
        });
        if (res.ok) {
          const result = await res.json();
          setEvaluations(prev => ({
            ...prev,
            [qId]: {
              ...result,
              correct_answers: result.correct_answers || localCorrectAnswers,
            }
          }));
          return;
        }
      }
    } catch (e) {
      console.warn("KC question evaluation API fallback to local evaluation:", e);
    } finally {
      setEvaluating(prev => ({ ...prev, [qId]: false }));
    }

    // Set local evaluation result
    setEvaluations(prev => ({
      ...prev,
      [qId]: {
        is_correct: localIsCorrect,
        correct_answers: localCorrectAnswers,
        feedback: localIsCorrect ? (q.correct_feedback || "") : (q.incorrect_feedback || ""),
        hint: q.hint || "",
      }
    }));
  };

  return (
    <div className="space-y-6">
      {blocks.map((block: any, idx: number) => {
        const rawMediaUrl = block.reading_payload?.meta_data?.url || block.reading_payload?.html_content?.match(/src=["']([^"']+)["']/i)?.[1];
        const mediaUrl = rawMediaUrl ? normalizeUrl(rawMediaUrl) : "";
        const calloutStyle = block.reading_payload?.meta_data?.style || "info";

        // Alignment & Layout Width classes
        const align = block.settings?.align || "left";
        const textAlignClass = align === "right" ? "text-right" : align === "center" ? "text-center" : "text-left";
        const alignMarginClass = align === "right" ? "ml-auto mr-0" : align === "center" ? "mx-auto" : "mr-auto ml-0";
        const width = block.settings?.width || "full";
        const widthClass = width === "narrow" ? `max-w-xl ${alignMarginClass}` : width === "constrained" ? `max-w-2xl ${alignMarginClass}` : "w-full";

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
          <div key={block.id || idx} className={`rounded-2xl border border-border bg-card p-6 shadow-sm space-y-4 min-w-0 max-w-full overflow-hidden ${widthClass} ${textAlignClass}`}>
            {/* Heading Block */}
            {block.block_type === "heading" && (
              <div className={`w-full min-w-0 max-w-full break-words [overflow-wrap:anywhere] ${textAlignClass}`}>
                {levelTag === "h1" && <h1 className={`${headingStyle} ${textAlignClass} w-full block break-words [overflow-wrap:anywhere]`}>{cleanHeadingText}</h1>}
                {levelTag === "h2" && <h2 className={`${headingStyle} ${textAlignClass} w-full block break-words [overflow-wrap:anywhere]`}>{cleanHeadingText}</h2>}
                {levelTag === "h3" && <h3 className={`${headingStyle} ${textAlignClass} w-full block break-words [overflow-wrap:anywhere]`}>{cleanHeadingText}</h3>}
                {levelTag === "h4" && <h4 className={`${headingStyle} ${textAlignClass} w-full block break-words [overflow-wrap:anywhere]`}>{cleanHeadingText}</h4>}
                {levelTag === "h5" && <h5 className={`${headingStyle} ${textAlignClass} w-full block break-words [overflow-wrap:anywhere]`}>{cleanHeadingText}</h5>}
                {levelTag === "h6" && <h6 className={`${headingStyle} ${textAlignClass} w-full block break-words [overflow-wrap:anywhere]`}>{cleanHeadingText}</h6>}
              </div>
            )}

            {/* Paragraph Block */}
            {block.block_type === "paragraph" && (
              <div
                className="prose prose-invert max-w-none text-foreground leading-relaxed text-sm md:text-base break-words [overflow-wrap:anywhere] [word-break:break-word] whitespace-pre-wrap min-w-0 max-w-full [&_p]:break-words [&_p]:[overflow-wrap:anywhere] [&_p]:[word-break:break-word] [&_p]:whitespace-pre-wrap [&_p]:max-w-full [&_p]:min-w-0"
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
              <div className={`w-full flex ${align === "right" ? "justify-end" : align === "center" ? "justify-center" : "justify-start"}`}>
                <div className={`w-full flex items-start gap-3 p-4 rounded-xl border text-xs sm:text-sm font-medium ${
                  calloutStyle === "warning" ? "bg-amber-500/10 border-amber-500/30 text-amber-200" :
                  calloutStyle === "success" ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-200" :
                  calloutStyle === "tip" ? "bg-purple-500/10 border-purple-500/30 text-purple-200" :
                  "bg-cyan-500/10 border-cyan-500/30 text-cyan-200"
                }`}>
                  <AlertTriangle className="size-5 shrink-0 mt-0.5 text-amber-400" />
                  <div className="break-words [overflow-wrap:anywhere] min-w-0" dangerouslySetInnerHTML={{ __html: block.reading_payload?.html_content || "Callout note" }} />
                </div>
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
                  isAuthoringPreview ? (
                    <div className="space-y-3">
                      <video src={mediaUrl} controls className="w-full rounded-2xl shadow-xl border border-border max-h-[480px]" />
                      <div className="text-xs text-muted-foreground text-center font-medium">Video Author Preview Mode</div>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <RestrictedVideoPlayer
                        key={String(block.id || lessonId)}
                        src={mediaUrl}
                        lessonId={String(lessonId || block.id)}
                        onComplete={onComplete || (() => {})}
                      />
                      <div className="flex items-center gap-3 text-xs text-foreground bg-card border border-border rounded-2xl px-5 py-4 shadow-md">
                        <div className="size-2.5 rounded-full bg-rose-500 animate-pulse shrink-0" />
                        <span>
                          <strong className="text-foreground font-bold">Restricted mode:</strong> Video progress is automatically recorded upon full completion.
                        </span>
                      </div>
                    </div>
                  )
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
              <TableBlockRenderer block={block} />
            )}

            {/* Interaction Block */}
            {block.block_type === "interaction" && (
              <InteractionBlockRenderer block={block} />
            )}

            {/* Quiz Block */}
            {block.block_type === "quiz" && block.kc_questions && block.kc_questions.length > 0 && (
              <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 p-5 space-y-5">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider">
                  <CheckSquare className="size-4" />
                  <span>Knowledge Check Evaluation</span>
                </div>

                {block.kc_questions.map((q: any) => {
                  const evalResult = evaluations[q.id];
                  const currentSelected = selectedChoices[q.id] || [];
                  const qType = q.question_type || q.type || "single_choice";
                  const isFillBlank = qType === "fill_blank";
                  const isMultipleSelect = qType === "multiple_select";

                  return (
                    <div key={q.id} className="space-y-3 pt-3 border-t border-amber-500/15 first:pt-0 first:border-t-0">
                      <p className="text-sm font-bold text-foreground">{q.prompt}</p>

                      {/* Fill in the Blank vs Choices */}
                      {isFillBlank ? (
                        <div className="space-y-1.5">
                          <input
                            type="text"
                            value={typedAnswers[q.id] || ""}
                            onChange={(e) => setTypedAnswers(prev => ({ ...prev, [q.id]: e.target.value }))}
                            placeholder="Type your answer here..."
                            className="w-full bg-card border border-border rounded-xl p-3 text-xs sm:text-sm text-foreground focus:ring-2 focus:ring-amber-400 font-medium placeholder:text-muted-foreground/60 transition-all"
                          />
                        </div>
                      ) : (
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
                                  type={isMultipleSelect ? "checkbox" : "radio"}
                                  name={`q_${q.id}`}
                                  checked={isChecked}
                                  onChange={() => {
                                    if (isMultipleSelect) {
                                      const next = isChecked ? currentSelected.filter(id => id !== c.id) : [...currentSelected, c.id];
                                      setSelectedChoices(prev => ({ ...prev, [q.id]: next }));
                                    } else {
                                      setSelectedChoices(prev => ({ ...prev, [q.id]: [c.id] }));
                                    }
                                  }}
                                  className="accent-amber-400 size-4 cursor-pointer"
                                />
                                <span>{c.text}</span>
                              </label>
                            );
                          })}
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-1">
                        <button
                          type="button"
                          onClick={() => handleEvaluate(q, block.id)}
                          disabled={evaluating[q.id]}
                          className="px-4 py-2 rounded-xl bg-amber-500 text-slate-950 font-bold text-xs hover:bg-amber-400 disabled:opacity-50 transition-all shadow-md flex items-center gap-1.5"
                        >
                          {evaluating[q.id] && <Loader2 className="size-3.5 animate-spin" />}
                          Submit Answer
                        </button>

                        {evalResult && (
                          <span className={`text-xs font-bold px-3 py-1 rounded-full border ${
                            evalResult.is_correct
                              ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                              : "bg-rose-500/20 text-rose-400 border-rose-500/40"
                          }`}>
                            {evalResult.is_correct ? "Correct!" : "Incorrect"}
                          </span>
                        )}
                      </div>

                      {/* Detailed Feedback & Correct Answer */}
                      {evalResult && (
                        <div className={`p-3.5 rounded-xl border text-xs space-y-1.5 ${
                          evalResult.is_correct
                            ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                            : "bg-rose-500/10 border-rose-500/30 text-rose-300"
                        }`}>
                          <div className="font-bold flex items-center gap-1.5">
                            {evalResult.is_correct ? (
                              <span>✓ Correct!</span>
                            ) : (
                              <span>✗ Incorrect</span>
                            )}
                          </div>

                          {!evalResult.is_correct && evalResult.correct_answers && evalResult.correct_answers.length > 0 && (
                            <div className="text-foreground/90 font-medium pt-0.5">
                              <span className="font-bold text-rose-400">Correct Answer: </span>
                              <span>{evalResult.correct_answers.join(", ")}</span>
                            </div>
                          )}

                          {evalResult.feedback && (
                            <div className="text-muted-foreground pt-0.5">
                              {evalResult.feedback}
                            </div>
                          )}
                          {evalResult.explanation && (
                            <div className="text-muted-foreground pt-0.5">
                              {evalResult.explanation}
                            </div>
                          )}
                          {evalResult.hint && (
                            <div className="text-amber-300/80 pt-0.5">
                              <span className="font-semibold">Hint: </span>{evalResult.hint}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}

            {/* Scenario Block */}
            {block.block_type === "scenario" && (
              (() => {
                const nodes: any[] = block.scenario_nodes || block.payload?.nodes || [];
                if (!nodes || nodes.length === 0) return null;
                const blockKey = String(block.id || idx);
                const startNode = nodes.find((n: any) => n.is_start_node) || nodes[0];
                const activeNodeId = activeScenarioNodeIds[blockKey] || String(startNode.id);
                const currentNode = nodes.find((n: any) => String(n.id) === String(activeNodeId)) || startNode;
                const selectionKey = `${blockKey}_${currentNode.id}`;
                const selection = selectedScenarioChoices[selectionKey];

                const handleSelectChoice = (c: any, i: number) => {
                  setSelectedScenarioChoices(prev => ({
                    ...prev,
                    [selectionKey]: { choiceIndex: i, choice: c }
                  }));
                };

                const handleAdvance = (targetNodeId: string) => {
                  setActiveScenarioNodeIds(prev => ({
                    ...prev,
                    [blockKey]: targetNodeId
                  }));
                };

                const handleRestart = () => {
                  setActiveScenarioNodeIds(prev => ({
                    ...prev,
                    [blockKey]: String(startNode.id)
                  }));
                  setSelectedScenarioChoices(prev => {
                    const next = { ...prev };
                    Object.keys(next).forEach(k => {
                      if (k.startsWith(`${blockKey}_`)) delete next[k];
                    });
                    return next;
                  });
                };

                const targetNode = selection?.choice?.target_node_id
                  ? nodes.find((n: any) => String(n.id) === String(selection.choice.target_node_id))
                  : null;

                const isEndScenario = selection && (!selection.choice.target_node_id || selection.choice.target_node_id === "end" || !targetNode);

                return (
                  <div className="rounded-2xl border border-teal-500/30 bg-teal-500/5 p-6 space-y-5">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2 text-xs font-bold text-teal-400 uppercase tracking-wider">
                        <GitBranch className="size-4" />
                        <span>Branching Scenario Simulation</span>
                      </div>
                      {String(currentNode.id) !== String(startNode.id) && (
                        <button
                          type="button"
                          onClick={handleRestart}
                          className="text-[11px] text-muted-foreground hover:text-teal-300 font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                        >
                          <RotateCcw className="size-3" /> Restart
                        </button>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h4 className="text-base font-bold text-foreground">{currentNode.title}</h4>
                      <p className="text-xs leading-relaxed text-muted-foreground whitespace-pre-wrap">{currentNode.content}</p>

                      {currentNode.choices && currentNode.choices.length > 0 && (
                        <div className="space-y-2 pt-2">
                          {currentNode.choices.map((c: any, i: number) => {
                            const isSelected = selection?.choiceIndex === i;
                            return (
                              <button
                                key={i}
                                type="button"
                                onClick={() => handleSelectChoice(c, i)}
                                className={`w-full text-left p-3.5 rounded-xl border transition-all text-xs font-medium flex items-center justify-between cursor-pointer ${
                                  isSelected
                                    ? "border-teal-400 bg-teal-500/20 text-teal-200 ring-2 ring-teal-400/30 shadow-md font-semibold"
                                    : "border-teal-500/30 bg-card hover:bg-teal-500/10 text-foreground"
                                }`}
                              >
                                <span className="flex items-center gap-2.5">
                                  <span>👉</span>
                                  <span>{c.text}</span>
                                </span>
                                {isSelected && (
                                  <span className="text-[10px] uppercase font-bold tracking-wider px-2.5 py-0.5 rounded-full bg-teal-500/30 text-teal-300 border border-teal-400/40">
                                    Selected
                                  </span>
                                )}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* Configured Outcome & Branch Progression */}
                      {selection && (
                        <div className="mt-4 pt-4 border-t border-teal-500/20 space-y-3 animate-in fade-in slide-in-from-top-1 duration-200">
                          {(selection.choice.feedback || selection.choice.outcome) && (
                            <div className="p-3.5 rounded-xl bg-teal-950/40 border border-teal-500/30 space-y-1">
                              <div className="text-[11px] font-bold text-teal-400 uppercase tracking-wider">Outcome:</div>
                              <p className="text-xs text-teal-100/90 leading-relaxed whitespace-pre-wrap">
                                {selection.choice.feedback || selection.choice.outcome}
                              </p>
                            </div>
                          )}

                          {targetNode ? (
                            <div className="flex items-center justify-end pt-1">
                              <button
                                type="button"
                                onClick={() => handleAdvance(String(targetNode.id))}
                                className="px-4 py-2.5 rounded-xl bg-teal-500 text-slate-950 font-bold text-xs hover:bg-teal-400 active:scale-[0.98] transition-all flex items-center gap-2 shadow-md cursor-pointer"
                              >
                                <span>Continue: {targetNode.title || "Next Decision"}</span>
                                <ChevronRight className="size-3.5" />
                              </button>
                            </div>
                          ) : isEndScenario ? (
                            <div className="flex items-center justify-between p-3 rounded-xl bg-teal-500/10 border border-teal-500/30">
                              <div className="flex items-center gap-2 text-xs font-bold text-teal-300">
                                <Check className="size-4 text-teal-400" />
                                <span>Scenario Complete</span>
                              </div>
                              <button
                                type="button"
                                onClick={handleRestart}
                                className="px-3 py-1.5 rounded-lg bg-teal-500/20 hover:bg-teal-500/30 text-teal-200 border border-teal-400/30 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
                              >
                                <RotateCcw className="size-3" /> Restart Scenario
                              </button>
                            </div>
                          ) : null}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })()
            )}

            {/* Assessment Block */}
            {block.block_type === "assessment" && (
              <LessonAssessmentBlockRunner
                lessonId={lessonId}
                isAuthoringPreview={isAuthoringPreview}
                onComplete={onComplete}
                isVideoCompleted={isVideoCompleted}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ─── Structured Table Block Renderer ────────────────────────────────────────

function TableBlockRenderer({ block }: { block: any }) {
  const tableData: StructuredTableData = React.useMemo(() => {
    const metaTable = block.reading_payload?.meta_data?.table_data || block.payload?.meta_data?.table_data;
    if (metaTable && Array.isArray(metaTable.headers) && Array.isArray(metaTable.rows)) {
      return metaTable;
    }
    const rawContent =
      block.reading_payload?.html_content ||
      block.payload?.html ||
      block.reading_payload?.markdown_content ||
      block.payload?.markdown ||
      "";
    return parseCsvToTable(rawContent);
  }, [block.reading_payload, block.payload]);

  return (
    <div className="w-full min-w-0 max-w-full overflow-x-auto rounded-2xl border border-border bg-card/70 shadow-md my-3">
      <table className="w-full text-left border-collapse min-w-full text-xs sm:text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/70">
            {tableData.headers.map((header: string, idx: number) => (
              <th
                key={idx}
                className="px-4 py-3 text-xs font-bold uppercase tracking-wider text-foreground whitespace-normal break-words [overflow-wrap:anywhere] border-r border-border/30 last:border-r-0"
              >
                {header || `Column ${idx + 1}`}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {tableData.rows.map((row: string[], rowIdx: number) => (
            <tr key={rowIdx} className="hover:bg-muted/20 transition-colors">
              {row.map((cell: string, cellIdx: number) => (
                <td
                  key={cellIdx}
                  className="px-4 py-3 text-xs sm:text-sm text-foreground/90 whitespace-normal break-words [overflow-wrap:anywhere] [word-break:break-word] border-r border-border/20 last:border-r-0 leading-relaxed"
                >
                  {cell || <span className="text-muted-foreground/30 italic">-</span>}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─── Lesson Assessment Block Runner ─────────────────────────────────────────

function LessonAssessmentBlockRunner({
  lessonId,
  isAuthoringPreview = false,
  onComplete,
  isVideoCompleted = false,
}: {
  lessonId?: number | string;
  isAuthoringPreview?: boolean;
  onComplete?: () => void;
  isVideoCompleted?: boolean;
}) {
  const [questions, setQuestions] = React.useState<ApiAssessmentQuestion[]>([]);
  const [attemptId, setAttemptId] = React.useState<number | null>(null);
  const [currentIdx, setCurrentIdx] = React.useState(0);
  const [answers, setAnswers] = React.useState<Record<string, string>>({});
  const [submittedCurrent, setSubmittedCurrent] = React.useState(false);
  const [statusState, setStatusState] = React.useState<"idle" | "in_progress" | "loading" | "result">("idle");
  const [resultData, setResultData] = React.useState<{ score_percent: number; passed: boolean; correct_count: number; total_questions: number } | null>(null);
  const [loadingMsg, setLoadingMsg] = React.useState("");
  const [isEligible, setIsEligible] = React.useState(false);
  const [isCheckingEligibility, setIsCheckingEligibility] = React.useState(true);

  const numLessonId = lessonId ? Number(String(lessonId).replace(/^l/, '')) : null;

  // Check actual backend progress on mount or when isVideoCompleted changes
  const checkProgress = React.useCallback(async () => {
    if (isAuthoringPreview) {
      setIsEligible(true);
      setIsCheckingEligibility(false);
      return;
    }
    if (!numLessonId) {
      setIsEligible(false);
      setIsCheckingEligibility(false);
      return;
    }
    if (isVideoCompleted) {
      setIsEligible(true);
      setIsCheckingEligibility(false);
      return;
    }
    try {
      const { getLessonProgress } = await import('@/lib/progress');
      const data = await getLessonProgress(numLessonId);
      setIsEligible(Boolean(data?.completed));
    } catch {
      setIsEligible(false);
    } finally {
      setIsCheckingEligibility(false);
    }
  }, [numLessonId, isAuthoringPreview, isVideoCompleted]);

  React.useEffect(() => {
    checkProgress();
  }, [checkProgress, isVideoCompleted]);

  // If in author preview mode: load questions list
  React.useEffect(() => {
    if (isAuthoringPreview && numLessonId) {
      fetchLessonAssessmentQuestions(numLessonId)
        .then(setQuestions)
        .catch(() => {});
    }
  }, [isAuthoringPreview, numLessonId]);

  const handleStart = async () => {
    if (!numLessonId) return;
    setStatusState("loading");
    setLoadingMsg("Generating randomized assessment subset...");
    try {
      const data = await startLessonAssessment(numLessonId);
      setAttemptId(data.id);
      setQuestions(data.questions || []);
      setCurrentIdx(0);
      setAnswers({});
      setSubmittedCurrent(false);
      setIsEligible(false); // Token consumed in backend on start
      setStatusState("in_progress");
    } catch (e: any) {
      alert(e.message || "Failed to start assessment");
      setStatusState("idle");
      setIsEligible(false);
    }
  };

  const handleFinalSubmit = async () => {
    if (!numLessonId || !attemptId) return;
    setStatusState("loading");
    setLoadingMsg("Grading lesson assessment...");
    try {
      const res = await submitLessonAssessment(numLessonId, attemptId, { answers });
      setResultData(res);
      setStatusState("result");
      if (res.passed) {
        setIsEligible(true);
        if (onComplete) {
          onComplete();
        }
      } else {
        setIsEligible(false);
      }
    } catch (e: any) {
      alert(e.message || "Failed to submit assessment");
      setStatusState("in_progress");
    }
  };

  // Authoring preview
  if (isAuthoringPreview) {
    return (
      <div className="rounded-2xl border border-brand/30 bg-brand/5 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckSquare className="size-5 text-brand" />
            <h4 className="text-sm font-bold text-foreground">Lesson Assessment Question Bank (Preview)</h4>
          </div>
          <span className="text-xs font-extrabold px-2.5 py-1 rounded-full bg-brand/20 text-brand">
            {questions.length} Questions
          </span>
        </div>
        {questions.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">No questions imported yet for this lesson.</p>
        ) : (
          <div className="space-y-3 pt-2">
            {questions.slice(0, 5).map((q, i) => (
              <div key={q.id || i} className="p-3 rounded-xl bg-card border border-border text-xs space-y-1.5">
                <p className="font-bold text-foreground">{i + 1}. {q.question_text}</p>
                <div className="grid grid-cols-2 gap-1 text-[11px] text-muted-foreground">
                  <div className={q.correct_option === 'A' ? 'text-emerald-500 font-bold' : ''}>A: {q.option_a}</div>
                  <div className={q.correct_option === 'B' ? 'text-emerald-500 font-bold' : ''}>B: {q.option_b}</div>
                  <div className={q.correct_option === 'C' ? 'text-emerald-500 font-bold' : ''}>C: {q.option_c}</div>
                  <div className={q.correct_option === 'D' ? 'text-emerald-500 font-bold' : ''}>D: {q.option_d}</div>
                </div>
                {q.explanation && (
                  <div className="text-[10px] text-muted-foreground bg-muted/40 p-1.5 rounded">
                    <strong>Explanation:</strong> {q.explanation}
                  </div>
                )}
              </div>
            ))}
            {questions.length > 5 && (
              <p className="text-[11px] text-muted-foreground text-center font-medium">
                + {questions.length - 5} more questions in bank (learners receive a random subset of 10 per attempt)
              </p>
            )}
          </div>
        )}
      </div>
    );
  }

  // Learner View: Locked State (when video is not yet completed)
  if (!isAuthoringPreview && !isEligible && statusState === "idle") {
    return (
      <div className="rounded-2xl border border-border bg-card/60 p-6 sm:p-8 text-center space-y-4 shadow-sm">
        <div className="size-12 rounded-2xl bg-amber-500/10 text-amber-500 grid place-items-center mx-auto border border-amber-500/20">
          <AlertCircle className="size-6" />
        </div>
        <div className="space-y-1.5 max-w-md mx-auto">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-amber-500 bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
            Locked
          </div>
          <h3 className="text-base font-bold text-foreground">Lesson Assessment</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Please watch and complete the full lesson video above to unlock this assessment.
          </p>
        </div>
        <div>
          <button
            type="button"
            disabled
            className="px-6 py-2.5 rounded-xl bg-muted text-muted-foreground font-bold text-xs border border-border cursor-not-allowed opacity-60 inline-flex items-center gap-2"
          >
            <span>Complete Video to Unlock</span>
          </button>
        </div>
      </div>
    );
  }

  // Learner View: Unlocked Idle State
  if (statusState === "idle") {
    return (
      <div className="rounded-2xl border border-brand/30 bg-card p-6 shadow-md text-center space-y-4">
        <div className="size-12 rounded-2xl bg-brand/10 text-brand grid place-items-center mx-auto">
          <CheckSquare className="size-6" />
        </div>
        <div className="space-y-1 max-w-md mx-auto">
          <div className="inline-flex items-center gap-1.5 text-[10px] font-black uppercase tracking-wider text-emerald-500 bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/20">
            Unlocked
          </div>
          <h3 className="text-base font-bold text-foreground">Lesson Assessment</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Test your understanding of this lesson. You will receive up to 10 randomly selected questions in a randomized order.
          </p>
        </div>
        <button
          type="button"
          onClick={handleStart}
          className="px-6 py-2.5 rounded-xl bg-brand text-brand-foreground font-bold text-xs hover:bg-brand-hover shadow-md transition-all inline-flex items-center gap-2"
        >
          <span>Start Lesson Assessment</span>
          <ChevronRight className="size-4" />
        </button>
      </div>
    );
  }

  // Loading State
  if (statusState === "loading") {
    return (
      <div className="rounded-2xl border border-border bg-card p-10 text-center space-y-3">
        <Loader2 className="size-8 animate-spin text-brand mx-auto" />
        <p className="text-xs font-semibold text-muted-foreground">{loadingMsg}</p>
      </div>
    );
  }

  // In Progress State
  if (statusState === "in_progress" && questions.length > 0) {
    const q = questions[currentIdx];
    const selectedAns = answers[String(q.id)];
    const isAnswered = Boolean(selectedAns);
    const options = [
      { key: "A", text: q.option_a },
      { key: "B", text: q.option_b },
      { key: "C", text: q.option_c },
      { key: "D", text: q.option_d },
    ];

    return (
      <div className="rounded-2xl border border-border bg-card p-6 shadow-lg space-y-6">
        <div className="flex items-center justify-between pb-3 border-b border-border text-xs">
          <div className="flex items-center gap-2 font-bold text-foreground">
            <CheckSquare className="size-4 text-brand" />
            <span>Question {currentIdx + 1} of {questions.length}</span>
          </div>
          <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider">
            Lesson Assessment
          </span>
        </div>

        <div className="space-y-4">
          <h3 className="text-base sm:text-lg font-bold text-foreground leading-snug">
            {q.question_text}
          </h3>

          <div className="space-y-2.5">
            {options.map((opt) => {
              const isSelected = selectedAns === opt.key;
              const isCorrect = opt.key === q.correct_option;

              let style = "border-border bg-background hover:border-brand/40 text-foreground";
              if (isSelected && !submittedCurrent) {
                style = "border-brand bg-brand/10 text-foreground font-bold shadow-xs";
              }
              if (submittedCurrent) {
                if (isCorrect) {
                  style = "border-emerald-500 bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 font-bold shadow-xs";
                } else if (isSelected) {
                  style = "border-rose-500 bg-rose-500/15 text-rose-700 dark:text-rose-300 font-bold shadow-xs";
                } else {
                  style = "border-border bg-background/50 text-muted-foreground opacity-50";
                }
              }

              return (
                <button
                  key={opt.key}
                  type="button"
                  disabled={submittedCurrent}
                  onClick={() => setAnswers(prev => ({ ...prev, [String(q.id)]: opt.key }))}
                  className={`w-full text-left p-3.5 rounded-xl border text-xs sm:text-sm flex items-center justify-between transition-all ${style}`}
                >
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-xs font-extrabold w-5 shrink-0 opacity-70">
                      {opt.key}.
                    </span>
                    <span>{opt.text}</span>
                  </div>
                  {submittedCurrent && isCorrect && <Check className="size-4 text-emerald-500 shrink-0" />}
                  {submittedCurrent && isSelected && !isCorrect && <X className="size-4 text-rose-500 shrink-0" />}
                </button>
              );
            })}
          </div>

          {/* Explanation Banner */}
          {submittedCurrent && (
            <div className={`p-4 rounded-xl border text-xs space-y-1.5 transition-all ${
              selectedAns === q.correct_option
                ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-950 dark:text-emerald-200"
                : "bg-rose-500/10 border-rose-500/30 text-rose-950 dark:text-rose-200"
            }`}>
              <div className="flex items-center gap-1.5 font-bold">
                {selectedAns === q.correct_option ? (
                  <>
                    <Check className="size-4 text-emerald-500 shrink-0" />
                    <span>Correct Answer!</span>
                  </>
                ) : (
                  <>
                    <X className="size-4 text-rose-500 shrink-0" />
                    <span>Incorrect — Correct option is {q.correct_option}</span>
                  </>
                )}
              </div>
              {q.explanation && (
                <p className="text-[11px] leading-relaxed pt-1 border-t border-border/30 opacity-90">
                  <strong>Explanation:</strong> {q.explanation}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-3 border-t border-border">
          <button
            type="button"
            disabled={currentIdx === 0}
            onClick={() => {
              setCurrentIdx(i => i - 1);
              setSubmittedCurrent(false);
            }}
            className="px-4 py-2 rounded-xl text-xs font-semibold text-muted-foreground hover:text-foreground disabled:opacity-30 transition-all"
          >
            Previous
          </button>

          {!submittedCurrent ? (
            <button
              type="button"
              disabled={!isAnswered}
              onClick={() => setSubmittedCurrent(true)}
              className="px-5 py-2 rounded-xl bg-brand text-brand-foreground font-bold text-xs hover:bg-brand-hover disabled:opacity-40 shadow-sm transition-all"
            >
              Check Answer
            </button>
          ) : currentIdx === questions.length - 1 ? (
            <button
              type="button"
              onClick={handleFinalSubmit}
              className="px-5 py-2 rounded-xl bg-brand text-brand-foreground font-bold text-xs hover:bg-brand-hover shadow-sm transition-all"
            >
              Finish Assessment
            </button>
          ) : (
            <button
              type="button"
              onClick={() => {
                setCurrentIdx(i => i + 1);
                setSubmittedCurrent(false);
              }}
              className="px-5 py-2 rounded-xl bg-brand text-brand-foreground font-bold text-xs hover:bg-brand-hover shadow-sm transition-all inline-flex items-center gap-1.5"
            >
              <span>Next Question</span>
              <ChevronRight className="size-3.5" />
            </button>
          )}
        </div>
      </div>
    );
  }

  // Result State
  if (statusState === "result" && resultData) {
    return (
      <div className={`rounded-2xl border p-6 sm:p-8 space-y-6 shadow-xl ${
        resultData.passed
          ? "border-emerald-500/40 bg-emerald-500/5 text-foreground"
          : "border-rose-500/40 bg-rose-500/5 text-foreground"
      }`}>
        <div className="text-center space-y-2">
          <div className={`size-14 rounded-2xl grid place-items-center mx-auto ${
            resultData.passed ? "bg-emerald-500/20 text-emerald-500" : "bg-rose-500/20 text-rose-500"
          }`}>
            {resultData.passed ? <Check className="size-8" /> : <X className="size-8" />}
          </div>
          <h3 className="text-xl font-bold">
            {resultData.passed ? "Assessment Passed! 🎉" : "Assessment Not Passed"}
          </h3>
          <p className="text-xs text-muted-foreground">
            You scored {resultData.score_percent}% ({resultData.correct_count} of {resultData.total_questions} questions correct).
          </p>
        </div>

        {resultData.passed ? (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center text-xs font-semibold text-emerald-600 dark:text-emerald-400">
            ✓ Lesson completed successfully! You can now proceed to the next lesson.
          </div>
        ) : (
          <div className="space-y-3">
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-xs font-medium text-rose-700 dark:text-rose-300 leading-relaxed">
              <strong>Assessment Locked:</strong> To ensure mastery of this topic, this lesson has been reset to incomplete. Please review the lesson content above and complete it again before your next randomized assessment attempt.
            </div>
            <div className="text-center">
              <button
                type="button"
                onClick={() => {
                  setStatusState("idle");
                  setResultData(null);
                  setIsEligible(false);
                }}
                className="px-5 py-2.5 rounded-xl bg-muted hover:bg-muted/80 text-foreground text-xs font-bold transition-all inline-flex items-center gap-2 border border-border"
              >
                <RotateCcw className="size-3.5 text-muted-foreground" />
                <span>Re-watch Lesson Video</span>
              </button>
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}

// ─── INTERACTION WIDGET RENDERERS ──────────────────────────────────────────

function TabsInteractionWidget({ config }: { config: any }) {
  const items = Array.isArray(config?.items) ? config.items : [];
  const [activeIdx, setActiveIdx] = React.useState(0);

  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground italic">No tabs configured.</p>;
  }

  const currentTab = items[activeIdx] || items[0];

  return (
    <div className="space-y-4">
      <div className="flex gap-2 overflow-x-auto pb-2 border-b border-indigo-500/20">
        {items.map((it: any, i: number) => {
          const active = activeIdx === i;
          return (
            <button
              key={i}
              onClick={() => setActiveIdx(i)}
              className={`px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all whitespace-nowrap ${
                active
                  ? "bg-indigo-600 text-white shadow-md"
                  : "bg-card text-muted-foreground hover:text-foreground hover:bg-muted/60"
              }`}
            >
              {it.title || `Tab ${i + 1}`}
            </button>
          );
        })}
      </div>
      <div className="p-5 rounded-2xl bg-card border border-border text-sm leading-relaxed text-foreground shadow-sm">
        <h4 className="font-bold text-base text-foreground mb-2">{currentTab.title}</h4>
        <div className="text-muted-foreground whitespace-pre-wrap">{currentTab.content}</div>
      </div>
    </div>
  );
}

function AccordionInteractionWidget({ config }: { config: any }) {
  const items = Array.isArray(config?.items) ? config.items : [];
  const [openIndices, setOpenIndices] = React.useState<number[]>([0]);

  const toggle = (idx: number) => {
    setOpenIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground italic">No accordion sections configured.</p>;
  }

  return (
    <div className="space-y-3">
      {items.map((it: any, idx: number) => {
        const isOpen = openIndices.includes(idx);
        return (
          <div
            key={idx}
            className="rounded-2xl border border-border bg-card overflow-hidden transition-all shadow-sm"
          >
            <button
              onClick={() => toggle(idx)}
              className="w-full flex items-center justify-between p-4 text-left font-bold text-sm sm:text-base text-foreground hover:bg-muted/30 transition-colors"
            >
              <span>{it.title || `Section ${idx + 1}`}</span>
              <ChevronDown
                className={`size-4 text-muted-foreground transition-transform duration-200 ${
                  isOpen ? "rotate-180 text-indigo-400" : ""
                }`}
              />
            </button>
            {isOpen && (
              <div className="px-4 pb-4 pt-1 text-xs sm:text-sm text-muted-foreground leading-relaxed border-t border-border/50 whitespace-pre-wrap bg-muted/10">
                {it.content || "No content provided."}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function TimelineInteractionWidget({ config }: { config: any }) {
  const items = Array.isArray(config?.items) ? config.items : [];
  const [selectedIdx, setSelectedIdx] = React.useState<number | null>(null);

  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground italic">No timeline items configured.</p>;
  }

  return (
    <div className="relative border-l-2 border-indigo-500/30 ml-4 md:ml-6 pl-6 md:pl-8 space-y-8 py-3">
      {items.map((it: any, idx: number) => {
        const isSelected = selectedIdx === idx;
        const stepLabel = it.date || it.step_label || `Step ${idx + 1}`;
        return (
          <div
            key={idx}
            onClick={() => setSelectedIdx(isSelected ? null : idx)}
            className={`relative group cursor-pointer p-4 rounded-2xl border transition-all ${
              isSelected
                ? "bg-indigo-500/10 border-indigo-500 shadow-md"
                : "bg-card border-border hover:border-indigo-500/40"
            }`}
          >
            {/* Node Icon/Dot */}
            <div
              className={`absolute -left-[37px] md:-left-[45px] top-4 size-7 md:size-8 rounded-full font-black grid place-items-center text-xs shadow-md transition-transform group-hover:scale-110 ${
                isSelected
                  ? "bg-indigo-600 text-white ring-4 ring-indigo-500/20"
                  : "bg-card border-2 border-indigo-500 text-indigo-400"
              }`}
            >
              {idx + 1}
            </div>

            <div className="flex flex-wrap items-center gap-2 mb-1">
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
                {stepLabel}
              </span>
            </div>
            <h4 className="text-sm md:text-base font-extrabold text-foreground">
              {it.title || `Milestone ${idx + 1}`}
            </h4>
            <p className="text-xs md:text-sm text-muted-foreground leading-relaxed mt-1.5 whitespace-pre-wrap">
              {it.content || it.description || ""}
            </p>
          </div>
        );
      })}
    </div>
  );
}

function FlashcardsInteractionWidget({ config }: { config: any }) {
  const items = Array.isArray(config?.items) ? config.items : [];
  const [currentIdx, setCurrentIdx] = React.useState(0);
  const [isFlipped, setIsFlipped] = React.useState(false);

  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground italic">No flashcards configured.</p>;
  }

  const currentCard = items[currentIdx] || items[0];

  const handleNext = () => {
    setIsFlipped(false);
    setCurrentIdx((prev) => (prev + 1) % items.length);
  };

  const handlePrev = () => {
    setIsFlipped(false);
    setCurrentIdx((prev) => (prev - 1 + items.length) % items.length);
  };

  const handleFlip = () => {
    setIsFlipped((f) => !f);
  };

  return (
    <div className="space-y-4 max-w-xl mx-auto">
      {/* Top Header Controls */}
      <div className="flex items-center justify-between text-xs font-bold text-muted-foreground">
        <span className="px-3 py-1 rounded-full bg-muted/60 text-foreground font-semibold">
          Card {currentIdx + 1} of {items.length}
        </span>
        <div className="flex items-center gap-1">
          <button
            onClick={handlePrev}
            disabled={items.length <= 1}
            className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-30"
            title="Previous Card"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            onClick={handleNext}
            disabled={items.length <= 1}
            className="p-1.5 rounded-lg border border-border hover:bg-muted disabled:opacity-30"
            title="Next Card"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
      </div>

      {/* Flippable Card Canvas */}
      <div
        onClick={handleFlip}
        className="cursor-pointer min-h-[240px] sm:min-h-[280px] p-6 rounded-3xl border-2 border-border bg-gradient-to-br from-card to-muted/30 shadow-lg hover:shadow-xl transition-all flex flex-col justify-between items-center text-center relative overflow-hidden group hover:border-indigo-500/40"
      >
        <div className="w-full flex items-center justify-between text-[11px] font-black uppercase tracking-wider">
          <span className={isFlipped ? "text-emerald-400" : "text-indigo-400"}>
            {isFlipped ? "Answer / Back" : "Question / Front"}
          </span>
          <span className="text-muted-foreground flex items-center gap-1 text-[10px] lowercase font-normal group-hover:text-foreground">
            <RotateCw className="size-3" /> tap to flip
          </span>
        </div>

        <div className="my-auto py-4 px-2">
          {isFlipped ? (
            <p className="text-sm sm:text-base font-semibold text-foreground leading-relaxed whitespace-pre-wrap">
              {currentCard.back || currentCard.content || "Back of card"}
            </p>
          ) : (
            <p className="text-base sm:text-lg font-bold text-foreground leading-relaxed whitespace-pre-wrap">
              {currentCard.front || currentCard.title || "Front of card"}
            </p>
          )}
        </div>

        <div className="w-full pt-3 border-t border-border/40 text-[11px] font-bold text-muted-foreground flex items-center justify-center gap-1.5">
          <RotateCw className="size-3.5 text-indigo-400" />
          <span>Click card to {isFlipped ? "reveal front" : "reveal answer"}</span>
        </div>
      </div>

      {/* Card Deck Bottom Action Bar */}
      <div className="flex items-center justify-center gap-3">
        <button
          onClick={handlePrev}
          disabled={items.length <= 1}
          className="px-4 py-2 rounded-xl border border-border text-xs font-bold hover:bg-muted disabled:opacity-30"
        >
          Previous
        </button>
        <button
          onClick={handleFlip}
          className="px-5 py-2 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 shadow-sm flex items-center gap-1.5"
        >
          <RotateCw className="size-3.5" /> Flip Card
        </button>
        <button
          onClick={handleNext}
          disabled={items.length <= 1}
          className="px-4 py-2 rounded-xl border border-border text-xs font-bold hover:bg-muted disabled:opacity-30"
        >
          Next
        </button>
      </div>
    </div>
  );
}

function HotspotsInteractionWidget({ config }: { config: any }) {
  const imageUrl = config?.image_url;
  const items = Array.isArray(config?.items) ? config.items : [];
  const [activeIdx, setActiveIdx] = React.useState<number | null>(items.length > 0 ? 0 : null);

  if (!imageUrl && items.length === 0) {
    return <p className="text-xs text-muted-foreground italic">No hotspot image or markers configured.</p>;
  }

  const activeHotspot = activeIdx !== null && items[activeIdx] ? items[activeIdx] : null;

  return (
    <div className="space-y-4">
      {imageUrl ? (
        <div className="relative w-full rounded-2xl overflow-hidden border border-border bg-black/50 shadow-md">
          <img
            src={imageUrl}
            alt="Interactive Hotspot Scene"
            className="w-full h-auto object-contain max-h-[520px] select-none mx-auto"
          />

          {/* Hotspot Markers */}
          {items.map((it: any, idx: number) => {
            const isSelected = activeIdx === idx;
            const x = it.x ?? 50;
            const y = it.y ?? 50;

            return (
              <div
                key={idx}
                style={{ left: `${x}%`, top: `${y}%` }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-10"
              >
                <button
                  onClick={() => setActiveIdx(isSelected ? null : idx)}
                  className={`relative size-8 rounded-full font-black text-xs grid place-items-center shadow-xl transition-transform duration-200 hover:scale-125 focus:outline-none ${
                    isSelected
                      ? "bg-amber-400 text-black ring-4 ring-amber-400/40 scale-110"
                      : "bg-indigo-600 text-white ring-2 ring-white/80"
                  }`}
                  title={it.title || it.label || `Hotspot ${idx + 1}`}
                >
                  <span className="absolute -inset-1.5 rounded-full bg-indigo-400/30 animate-ping pointer-events-none" />
                  <MapPin className="size-4" />
                </button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs">
          Hotspot background image is not configured yet.
        </div>
      )}

      {/* Selected Hotspot Detail Panel */}
      {activeHotspot && (
        <div className="p-5 rounded-2xl bg-card border-2 border-indigo-500/40 shadow-lg space-y-2 animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="size-6 rounded-full bg-indigo-600 text-white font-black text-xs grid place-items-center">
                {(activeIdx ?? 0) + 1}
              </span>
              <h4 className="text-base font-extrabold text-foreground">
                {activeHotspot.title || activeHotspot.label || `Hotspot ${(activeIdx ?? 0) + 1}`}
              </h4>
            </div>
            <button
              onClick={() => setActiveIdx(null)}
              className="text-xs text-muted-foreground hover:text-foreground font-semibold px-2 py-1 rounded-md bg-muted/50"
            >
              Close ✕
            </button>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap pl-8">
            {activeHotspot.content || activeHotspot.description || "No description provided."}
          </p>
        </div>
      )}
    </div>
  );
}

function BeforeAfterInteractionWidget({ config }: { config: any }) {
  const beforeImage = config?.before_image;
  const afterImage = config?.after_image;
  const beforeLabel = config?.before_label || "Before";
  const afterLabel = config?.after_label || "After";

  const [sliderPos, setSliderPos] = React.useState(50);
  const containerRef = React.useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  const handleMove = React.useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const pct = Math.min(100, Math.max(0, (x / rect.width) * 100));
      setSliderPos(pct);
    },
    []
  );

  React.useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (isDragging) handleMove(e.clientX);
    };
    const onTouchMove = (e: TouchEvent) => {
      if (isDragging && e.touches[0]) handleMove(e.touches[0].clientX);
    };
    const onEnd = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup", onEnd);
      window.addEventListener("touchmove", onTouchMove);
      window.addEventListener("touchend", onEnd);
    }
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onEnd);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onEnd);
    };
  }, [isDragging, handleMove]);

  if (!beforeImage && !afterImage) {
    return <p className="text-xs text-muted-foreground italic">No comparison images configured.</p>;
  }

  return (
    <div className="space-y-3 max-w-2xl mx-auto">
      <div
        ref={containerRef}
        onMouseDown={(e) => {
          setIsDragging(true);
          handleMove(e.clientX);
        }}
        onTouchStart={(e) => {
          setIsDragging(true);
          if (e.touches[0]) handleMove(e.touches[0].clientX);
        }}
        className="relative w-full aspect-video sm:aspect-[16/9] max-h-[460px] rounded-3xl overflow-hidden select-none border-2 border-border shadow-xl cursor-ew-resize bg-black"
      >
        {/* After Image (Background) */}
        {afterImage && (
          <img
            src={afterImage}
            alt={afterLabel}
            className="absolute inset-0 size-full object-cover"
          />
        )}
        <span className="absolute top-4 right-4 z-10 px-3 py-1 rounded-full text-xs font-black bg-black/70 text-white border border-white/20 backdrop-blur-md">
          {afterLabel}
        </span>

        {/* Before Image (Clipped Overlay) */}
        {beforeImage && (
          <div
            className="absolute inset-0 size-full overflow-hidden"
            style={{ clipPath: `inset(0 ${100 - sliderPos}% 0 0)` }}
          >
            <img
              src={beforeImage}
              alt={beforeLabel}
              className="absolute inset-0 size-full object-cover"
            />
          </div>
        )}
        <span className="absolute top-4 left-4 z-10 px-3 py-1 rounded-full text-xs font-black bg-black/70 text-white border border-white/20 backdrop-blur-md">
          {beforeLabel}
        </span>

        {/* Divider Handle */}
        <div
          className="absolute top-0 bottom-0 w-0.5 bg-white shadow-2xl z-20"
          style={{ left: `${sliderPos}%` }}
        >
          <div className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 size-9 rounded-full bg-white text-black font-black grid place-items-center shadow-2xl border-2 border-indigo-500">
            <span className="text-xs">⟷</span>
          </div>
        </div>
      </div>

      <p className="text-[11px] text-center text-muted-foreground font-medium">
        ↔ Drag or click the divider to compare {beforeLabel} and {afterLabel}
      </p>
    </div>
  );
}

function ClickableCardsInteractionWidget({ config }: { config: any }) {
  const items = Array.isArray(config?.items) ? config.items : [];
  const [expandedIndices, setExpandedIndices] = React.useState<number[]>([]);

  const toggle = (idx: number) => {
    setExpandedIndices((prev) =>
      prev.includes(idx) ? prev.filter((i) => i !== idx) : [...prev, idx]
    );
  };

  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground italic">No cards configured.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {items.map((it: any, idx: number) => {
        const isExpanded = expandedIndices.includes(idx);
        return (
          <div
            key={idx}
            onClick={() => toggle(idx)}
            className={`rounded-2xl border bg-card p-4 transition-all duration-200 cursor-pointer shadow-sm flex flex-col justify-between group ${
              isExpanded
                ? "border-indigo-500 ring-2 ring-indigo-500/20 bg-indigo-500/5 shadow-md"
                : "border-border hover:border-indigo-500/40 hover:shadow-md"
            }`}
          >
            {it.image_url ? (
              <div className="w-full h-40 rounded-xl overflow-hidden mb-3 border border-border bg-muted/20">
                <img
                  src={normalizeUrl(it.image_url)}
                  alt={it.title || `Card ${idx + 1}`}
                  className="size-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
              </div>
            ) : null}
            <div>
              <div className="flex items-center justify-between gap-2 mb-2">
                <h4 className="font-extrabold text-sm sm:text-base text-foreground group-hover:text-indigo-400 transition-colors">
                  {it.title || `Card ${idx + 1}`}
                </h4>
                <span className="text-[10px] font-bold text-muted-foreground px-2 py-0.5 rounded-full bg-muted/60">
                  {isExpanded ? "Collapse ▲" : "Click to view ▼"}
                </span>
              </div>
              <div
                className={`text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap transition-all ${
                  isExpanded ? "block mt-2 pt-2 border-t border-border/50 text-foreground" : "line-clamp-2"
                }`}
              >
                {it.content || "Click to view full card details."}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ProcessFlowInteractionWidget({ config }: { config: any }) {
  const items = Array.isArray(config?.items) ? config.items : [];
  const [activeStep, setActiveStep] = React.useState(0);

  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground italic">No process steps configured.</p>;
  }

  const currentStep = items[activeStep] || items[0];

  return (
    <div className="space-y-6">
      {/* Steps Navigation Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-3 pt-1">
        {items.map((it: any, idx: number) => {
          const isActive = activeStep === idx;
          const isPassed = idx < activeStep;

          return (
            <React.Fragment key={idx}>
              <button
                onClick={() => setActiveStep(idx)}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-2xl text-xs font-bold transition-all whitespace-nowrap ${
                  isActive
                    ? "bg-indigo-600 text-white shadow-md ring-2 ring-indigo-500/30"
                    : isPassed
                    ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                    : "bg-muted/40 text-muted-foreground hover:text-foreground border border-border"
                }`}
              >
                <span
                  className={`size-5 rounded-full grid place-items-center text-[10px] font-black ${
                    isActive
                      ? "bg-white text-indigo-600"
                      : isPassed
                      ? "bg-emerald-500 text-white"
                      : "bg-muted text-muted-foreground"
                  }`}
                >
                  {idx + 1}
                </span>
                <span>{it.title || `Step ${idx + 1}`}</span>
              </button>

              {idx < items.length - 1 && (
                <span className="text-muted-foreground/50 font-bold shrink-0">→</span>
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Active Step Content Card */}
      <div className="p-6 rounded-3xl bg-card border-2 border-indigo-500/30 shadow-lg space-y-4">
        <div className="flex items-center justify-between">
          <span className="px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            Step {activeStep + 1} of {items.length}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveStep((p) => Math.max(0, p - 1))}
              disabled={activeStep === 0}
              className="px-3 py-1.5 rounded-xl border border-border text-xs font-bold hover:bg-muted disabled:opacity-30"
            >
              Previous
            </button>
            <button
              onClick={() => setActiveStep((p) => Math.min(items.length - 1, p + 1))}
              disabled={activeStep === items.length - 1}
              className="px-3 py-1.5 rounded-xl bg-indigo-600 text-white text-xs font-bold hover:bg-indigo-500 disabled:opacity-30"
            >
              Next Step →
            </button>
          </div>
        </div>

        <div>
          <h3 className="text-base sm:text-lg font-black text-foreground mb-2">
            {currentStep.title || `Step ${activeStep + 1}`}
          </h3>
          <p className="text-xs sm:text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
            {currentStep.content || "No details provided for this step."}
          </p>
        </div>
      </div>
    </div>
  );
}

function InteractionBlockRenderer({ block }: { block: any }) {
  const payload = block.interaction_payload;
  const interactionType = payload?.interaction_type || "tabs";
  const config = payload?.config || {};

  const widgetTitles: Record<string, string> = {
    tabs: "Tabs Widget",
    accordion: "Accordion",
    timeline: "Interactive Timeline",
    flashcards: "Flashcards",
    hotspots: "Interactive Hotspots",
    before_after: "Before / After Comparison",
    clickable_cards: "Clickable Cards",
    process_flow: "Process Step Flow",
  };

  return (
    <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/5 p-5 space-y-4">
      <div className="flex items-center gap-2 text-xs font-bold text-indigo-400 uppercase tracking-wider">
        <Sparkles className="size-4" />
        <span>{widgetTitles[interactionType] || "Interactive Activity"}</span>
      </div>

      {interactionType === "tabs" && <TabsInteractionWidget config={config} />}
      {interactionType === "accordion" && <AccordionInteractionWidget config={config} />}
      {interactionType === "timeline" && <TimelineInteractionWidget config={config} />}
      {interactionType === "flashcards" && <FlashcardsInteractionWidget config={config} />}
      {interactionType === "hotspots" && <HotspotsInteractionWidget config={config} />}
      {interactionType === "before_after" && <BeforeAfterInteractionWidget config={config} />}
      {interactionType === "clickable_cards" && <ClickableCardsInteractionWidget config={config} />}
      {interactionType === "process_flow" && <ProcessFlowInteractionWidget config={config} />}
    </div>
  );
}

