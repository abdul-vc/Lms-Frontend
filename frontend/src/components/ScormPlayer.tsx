import React, { useState, useEffect, useRef } from "react";
import { fetchScormTracking, saveScormTracking } from "@/lib/courses-api";
import { 
  CheckCircle2, Clock, Play, Award, Maximize2, Minimize2, RefreshCw, 
  Sparkles, AlertCircle, Volume2, ShieldCheck, ChevronRight, Loader2
} from "lucide-react";

interface ScormPlayerProps {
  courseId: number;
  courseTitle: string;
  launchUrl: string;
  scormVersion?: string;
  onComplete?: () => void;
  onClose?: () => void;
}

export function ScormPlayer({
  courseId,
  courseTitle,
  launchUrl,
  scormVersion = "1.2",
  onComplete,
  onClose,
}: ScormPlayerProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [loading, setLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [status, setStatus] = useState<string>("not attempted");
  const [score, setScore] = useState<number | null>(null);
  const [location, setLocation] = useState<string>("");
  const [lastSaved, setLastSaved] = useState<Date | null>(null);
  const [cmiState, setCmiState] = useState<Record<string, string>>({});

  const cmiRef = useRef<Record<string, string>>({});
  const statusRef = useRef<string>("not attempted");

  // Load existing tracking state from backend
  useEffect(() => {
    fetchScormTracking(courseId)
      .then((data) => {
        setStatus(data.lesson_status || "not attempted");
        statusRef.current = data.lesson_status || "not attempted";
        setScore(data.score_raw);
        setLocation(data.lesson_location || "");

        const existingCmi: Record<string, string> = {
          "cmi.core.lesson_status": data.lesson_status || "not attempted",
          "cmi.completion_status": data.lesson_status || "not attempted",
          "cmi.core.lesson_location": data.lesson_location || "",
          "cmi.location": data.lesson_location || "",
          "cmi.suspend_data": data.suspend_data || "",
          "cmi.core.suspend_data": data.suspend_data || "",
          "cmi.core.score.raw": data.score_raw != null ? String(data.score_raw) : "",
          "cmi.score.raw": data.score_raw != null ? String(data.score_raw) : "",
          ...(data.cmi_data || {}),
        };

        cmiRef.current = existingCmi;
        setCmiState(existingCmi);
      })
      .catch((err) => console.error("Error loading SCORM tracking", err))
      .finally(() => setLoading(false));
  }, [courseId]);

  const [isSaving, setIsSaving] = useState(false);

  // Sync to Backend
  const commitToBackend = async (extra?: Record<string, any>) => {
    setIsSaving(true);
    try {
      const payload = {
        lesson_status: statusRef.current,
        lesson_location: cmiRef.current["cmi.core.lesson_location"] || cmiRef.current["cmi.location"] || "",
        suspend_data: cmiRef.current["cmi.core.suspend_data"] || cmiRef.current["cmi.suspend_data"] || "",
        score_raw: cmiRef.current["cmi.core.score.raw"] || cmiRef.current["cmi.score.raw"] ? parseFloat(cmiRef.current["cmi.core.score.raw"] || cmiRef.current["cmi.score.raw"]) : null,
        session_time: cmiRef.current["cmi.core.session_time"] || cmiRef.current["cmi.session_time"] || "",
        cmi_data: cmiRef.current,
        ...extra,
      };

      const res = await saveScormTracking(courseId, payload);
      setLastSaved(new Date());
      if (res.tracking?.lesson_status) {
        setStatus(res.tracking.lesson_status);
        statusRef.current = res.tracking.lesson_status;
        if ((res.tracking.lesson_status === "completed" || res.tracking.lesson_status === "passed") && onComplete) {
          onComplete();
        }
      }
    } catch (e) {
      console.error("Failed to commit SCORM tracking", e);
    } finally {
      setIsSaving(false);
    }
  };

  // Inject SCORM 1.2 (window.API) and SCORM 2004 (window.API_1484_11) Runtime Bridge + postMessage Listener
  useEffect(() => {
    const scormApi12 = {
      LMSInitialize: (param: string) => {
        console.log("[SCORM 1.2] LMSInitialize", param);
        return "true";
      },
      LMSGetValue: (element: string) => {
        const val = cmiRef.current[element] || "";
        console.log(`[SCORM 1.2] LMSGetValue('${element}') -> '${val}'`);
        return val;
      },
      LMSSetValue: (element: string, value: string) => {
        console.log(`[SCORM 1.2] LMSSetValue('${element}', '${value}')`);
        cmiRef.current[element] = String(value);

        if (element === "cmi.core.lesson_status" || element === "cmi.completion_status") {
          statusRef.current = String(value);
          setStatus(String(value));
        } else if (element === "cmi.core.score.raw" || element === "cmi.score.raw") {
          setScore(parseFloat(value) || null);
        } else if (element === "cmi.core.lesson_location" || element === "cmi.location") {
          setLocation(String(value));
        }

        setCmiState({ ...cmiRef.current });
        return "true";
      },
      LMSCommit: (param: string) => {
        console.log("[SCORM 1.2] LMSCommit", param);
        commitToBackend();
        return "true";
      },
      LMSGetLastError: () => "0",
      LMSGetErrorString: () => "No error",
      LMSGetDiagnostic: () => "OK",
      LMSFinish: (param: string) => {
        console.log("[SCORM 1.2] LMSFinish", param);
        commitToBackend();
        return "true";
      },
    };

    const scormApi2004 = {
      Initialize: (param: string) => {
        console.log("[SCORM 2004] Initialize", param);
        return "true";
      },
      GetValue: (element: string) => {
        const val = cmiRef.current[element] || "";
        console.log(`[SCORM 2004] GetValue('${element}') -> '${val}'`);
        return val;
      },
      SetValue: (element: string, value: string) => {
        console.log(`[SCORM 2004] SetValue('${element}', '${value}')`);
        cmiRef.current[element] = String(value);

        if (element === "cmi.completion_status" || element === "cmi.success_status") {
          const s = String(value).toLowerCase();
          if (s === "completed" || s === "passed" || s === "failed" || s === "incomplete") {
            statusRef.current = s;
            setStatus(s);
          }
        } else if (element === "cmi.score.raw" || element === "cmi.score.scaled") {
          const valNum = parseFloat(value);
          if (!isNaN(valNum)) setScore(valNum <= 1.0 && element === "cmi.score.scaled" ? valNum * 100 : valNum);
        }

        setCmiState({ ...cmiRef.current });
        return "true";
      },
      Commit: (param: string) => {
        console.log("[SCORM 2004] Commit", param);
        commitToBackend();
        return "true";
      },
      GetLastError: () => "0",
      GetErrorString: () => "No error",
      GetDiagnostic: () => "OK",
      Terminate: (param: string) => {
        console.log("[SCORM 2004] Terminate", param);
        commitToBackend();
        return "true";
      },
    };

    // Attach to window & window.parent
    (window as any).API = scormApi12;
    (window as any).API_1484_11 = scormApi2004;

    // Support postMessage for cross-origin iframes
    const handleMessage = (event: MessageEvent) => {
      if (!event.data || typeof event.data !== 'object') return;
      const { type, element, value } = event.data;
      if (type === 'SCORM_SET_VALUE' && element) {
        scormApi2004.SetValue(element, value);
        scormApi12.LMSSetValue(element, value);
      } else if (type === 'SCORM_COMMIT') {
        commitToBackend();
      }
    };
    window.addEventListener('message', handleMessage);

    return () => {
      window.removeEventListener('message', handleMessage);
      commitToBackend();
    };
  }, [courseId]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(console.error);
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(console.error);
    }
  };

  // Dynamically normalize launchUrl to match the current window hostname (localhost vs 127.0.0.1)
  const getEffectiveLaunchUrl = (url: string) => {
    if (!url) return "";
    if (typeof window !== "undefined") {
      const currentHost = window.location.hostname || "localhost";
      if (url.startsWith("http://") || url.startsWith("https://")) {
        try {
          const parsed = new URL(url);
          parsed.hostname = currentHost;
          return parsed.toString();
        } catch (e) {
          return url;
        }
      }
      const cleanPath = url.startsWith("/") ? url : `/${url}`;
      return `http://${currentHost}:8000${cleanPath}`;
    }
    return url;
  };

  const effectiveLaunchUrl = getEffectiveLaunchUrl(launchUrl);

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-slate-950 text-white rounded-3xl overflow-hidden shadow-2xl border border-slate-800 transition-all ${
        isFullscreen ? "fixed inset-0 z-50 rounded-none" : "h-[85vh] w-full"
      }`}
    >
      {/* Top SCORM Player HUD Bar */}
      <div className="px-6 py-3.5 bg-slate-900 border-b border-slate-800/80 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="size-9 rounded-xl bg-indigo-600 text-white grid place-items-center font-bold text-xs shadow-md">
            <Sparkles className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-100 truncate max-w-md">{courseTitle}</h2>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                SCORM {scormVersion}
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              Interactive Enterprise SCORM Package • Articulate / Captivate Compatible
            </p>
          </div>
        </div>

        {/* Dynamic Runtime Status & Interactive Controls */}
        <div className="flex items-center gap-3">
          {/* Dynamic Status Badge */}
          {status === "completed" || status === "passed" ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-xs font-bold">
              <CheckCircle2 className="size-3.5 text-emerald-400" /> Completed ✅
            </span>
          ) : status === "incomplete" || status === "in_progress" ? (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-xs font-bold">
              <Clock className="size-3.5 animate-spin text-amber-400" /> In Progress ⏳
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-bold">
              <Play className="size-3.5 text-indigo-400" /> Ready
            </span>
          )}

          {/* Score Badge */}
          {score != null && (
            <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-xs font-bold">
              <Award className="size-3.5 text-indigo-400" /> Score: {score}%
            </span>
          )}

          {/* Interactive Manual Save / Commit Button */}
          <button
            type="button"
            onClick={() => commitToBackend()}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold transition-all border border-indigo-500/40 shadow-sm"
            title="Click to save SCORM progress to backend database"
          >
            {isSaving ? <Loader2 className="size-3.5 animate-spin text-white" /> : <RefreshCw className="size-3.5 text-white" />}
            <span>{isSaving ? "Saving..." : lastSaved ? `Saved ${lastSaved.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}` : "Save Progress"}</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            onClick={toggleFullscreen}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all border border-slate-700"
            title={isFullscreen ? "Exit Fullscreen" : "Fullscreen"}
          >
            {isFullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </button>

          {onClose && (
            <button
              onClick={onClose}
              className="px-3 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-sm"
            >
              Exit Course
            </button>
          )}
        </div>
      </div>

      {/* Main SCORM Content iFrame */}
      <div className="flex-1 relative bg-slate-900 overflow-hidden">
        {loading && (
          <div className="absolute inset-0 z-10 grid place-items-center bg-slate-950/90 backdrop-blur-sm">
            <div className="text-center space-y-3">
              <div className="size-12 rounded-2xl bg-indigo-600 text-white grid place-items-center mx-auto shadow-lg animate-pulse">
                <Sparkles className="size-6" />
              </div>
              <p className="text-xs font-semibold text-slate-300">Initializing SCORM Runtime API...</p>
            </div>
          </div>
        )}

        <iframe
          ref={iframeRef}
          src={effectiveLaunchUrl}
          title={courseTitle}
          className="w-full h-full border-0 bg-white"
          allow="autoplay; fullscreen; geolocation; microphone; camera"
          onLoad={() => {
            setLoading(false);
            // Attach API to iframe window context as well
            try {
              if (iframeRef.current?.contentWindow) {
                (iframeRef.current.contentWindow as any).API = (window as any).API;
                (iframeRef.current.contentWindow as any).API_1484_11 = (window as any).API_1484_11;
              }
            } catch (e) {
              console.warn("Could not attach API directly to iframe cross-origin window", e);
            }
          }}
        />
      </div>
    </div>
  );
}
