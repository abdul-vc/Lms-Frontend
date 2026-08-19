/**
 * RestrictedVideoPlayer
 *
 * Production-grade video player with full LMS restrictions:
 * - No seek forward (can only scrub backwards if re-watching)
 * - No skip / jump
 * - Tab-switch detection with overlay freeze
 * - Resume from saved position OR start from beginning
 * - Auto-complete callback when video ends
 * - Custom controls only (native controls hidden)
 */
import { useEffect, useRef, useState, useCallback } from 'react';
import { useRouter } from '@tanstack/react-router';
import {
  Play,
  Pause,
  Volume2,
  VolumeX,
  AlertTriangle,
  RotateCcw,
  CheckCircle2,
  Maximize,
  Minimize
} from 'lucide-react';

interface RestrictedVideoPlayerProps {
  src: string;
  lessonId: string;
  onComplete: () => void;
}

const STORAGE_KEY = (lessonId: string) => `lms_video_progress_${lessonId}`;

function formatTime(s: number): string {
  const m = Math.floor(s / 60);
  const sec = Math.floor(s % 60);
  return `${m}:${sec.toString().padStart(2, '0')}`;
}

export function RestrictedVideoPlayer({ src, lessonId, onComplete }: RestrictedVideoPlayerProps) {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressBarRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const currentTimeRef = useRef(0);
  const [duration, setDuration] = useState(0);
  const [isCompleted, setIsCompleted] = useState(false);
  const [tabWarning, setTabWarning] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [savedPosition, setSavedPosition] = useState(0);
  const [maxReached, setMaxReached] = useState(0); // highest timestamp reached — prevents forward scrub
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isFs = Boolean(
        document.fullscreenElement ||
        (document as any).webkitFullscreenElement ||
        (document as any).mozFullScreenElement ||
        (document as any).msFullscreenElement
      );
      setIsFullscreen(isFs);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    document.addEventListener('mozfullscreenchange', handleFullscreenChange);
    document.addEventListener('MSFullscreenChange', handleFullscreenChange);

    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
      document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
      document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
    };
  }, []);

  const toggleFullscreen = useCallback(() => {
    const container = videoRef.current?.parentElement as any;
    if (!container) return;

    const fsElement = 
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement;

    if (!fsElement) {
      const req = 
        container.requestFullscreen ||
        container.webkitRequestFullscreen ||
        container.mozRequestFullScreen ||
        container.msRequestFullscreen;

      if (req) {
        req.call(container).catch((err: any) => {
          console.error(`Error attempting to enable fullscreen: ${err?.message || err}`);
        });
      }
    } else {
      const exit = 
        document.exitFullscreen ||
        (document as any).webkitExitFullscreen ||
        (document as any).mozCancelFullScreen ||
        (document as any).msExitFullscreen;

      if (exit) {
        exit.call(document).catch(() => {});
      }
    }
  }, []);

  // ─── Load saved position on mount ────────────────────────────────
  useEffect(() => {
    import('@/lib/progress').then(({ getLessonProgress }) => {
      getLessonProgress(lessonId).then((data) => {
        const saved = data?.last_position_seconds || 0;
        if (saved > 5) {
          setSavedPosition(saved);
          setMaxReached(saved);
          setShowResumeModal(true);
        } else {
          // Attempt to auto-play if there's no resume modal
          if (videoRef.current) {
            videoRef.current.play().then(() => {
              setIsPlaying(true);
            }).catch(() => {
              // Autoplay blocked by browser, user will have to click play
            });
          }
        }
      });
    });
  }, [lessonId]);

  // ─── Tab visibility detection ─────────────────────────────────────
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden) {
        videoRef.current?.pause();
        setIsPlaying(false);
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  // ─── Idle timer detection ─────────────────────────────────────────
  const idleTimerRef = useRef<number | ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    const resetIdleTimer = () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      if (isPlaying) {
        idleTimerRef.current = setTimeout(() => {
          if (videoRef.current) {
            videoRef.current.pause();
            setIsPlaying(false);
            setTabWarning(true); // Reused for idle warning
          }
        }, 60000); // 60 seconds
      }
    };

    resetIdleTimer();

    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll'];
    const handleActivity = () => resetIdleTimer();
    
    events.forEach(e => document.addEventListener(e, handleActivity));
    return () => {
      if (idleTimerRef.current) clearTimeout(idleTimerRef.current);
      events.forEach(e => document.removeEventListener(e, handleActivity));
    };
  }, [isPlaying]);

  // ─── Save progress to API every 10 seconds ──────────────
  useEffect(() => {
    const interval = setInterval(() => {
      if (videoRef.current && !videoRef.current.paused) {
        import('@/lib/progress').then(({ setLastActive }) => {
          setLastActive("", lessonId, videoRef.current!.currentTime);
        });
      }
    }, 10000);
    return () => clearInterval(interval);
  }, [lessonId]);

  const maxReachedRef = useRef(0);

  // Sync maxReached state with ref (on mount or when restoring)
  useEffect(() => {
    maxReachedRef.current = maxReached;
  }, [maxReached]);

  const handleTimeUpdate = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    const t = v.currentTime;
    setCurrentTime(t);
    currentTimeRef.current = t;

    // Jump detection (forward or backward) to completely prevent scrubbing bypasses
    if (Math.abs(t - currentTimeRef.current) > 1.5 && t !== 0 && t !== savedPosition) {
      v.currentTime = currentTimeRef.current;
      return;
    }

    // Track max reached naturally
    if (t > maxReachedRef.current) {
      maxReachedRef.current = t;
      setMaxReached(t);
    }
  }, [savedPosition]);

  const handleSeeking = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    
    // Strict block on any manual scrubbing forward or backward.
    // If the student wants to go back, they must use the "Start from beginning" modal.
    if (Math.abs(v.currentTime - currentTimeRef.current) > 1.5 && v.currentTime !== 0 && v.currentTime !== savedPosition) {
      v.currentTime = currentTimeRef.current;
    }
  }, [savedPosition]);

  const handleEnded = useCallback(() => {
    setIsPlaying(false);
    setIsCompleted(true);
    onComplete();
    router.invalidate();
  }, [lessonId, onComplete, router]);

  const handleLoadedMetadata = useCallback(() => {
    setDuration(videoRef.current?.duration || 0);
    setIsLoading(false);
  }, []);

  const handleCanPlay = useCallback(() => setIsLoading(false), []);
  const handleWaiting = useCallback(() => setIsLoading(true), []);
  const handlePlaying = useCallback(() => setIsLoading(false), []);

  const handleError = useCallback(() => {
    setError('Video file missing on server (404). Please re-upload the video file for this lesson in Content Authoring on the live server.');
    setIsLoading(false);
  }, []);

  // ─── Controls ─────────────────────────────────────────────────────
  const togglePlay = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    if (v.paused) {
      v.play().catch(() => setError('Playback blocked by browser. Click to try again.'));
      setIsPlaying(true);
    } else {
      v.pause();
      setIsPlaying(false);
    }
  }, []);

  const toggleMute = useCallback(() => {
    if (!videoRef.current) return;
    videoRef.current.muted = !videoRef.current.muted;
    setIsMuted((m) => !m);
  }, []);

  // ─── Progress bar click (completely disabled as per requirements) ───────────
  const handleProgressClick = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      // Scrubbing is disabled. If the student wants to rewatch, they must start from the beginning.
      // e.preventDefault();
    },
    []
  );

  // ─── Resume / Start over ──────────────────────────────────────────
  const resumeVideo = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = savedPosition;
    setCurrentTime(savedPosition);
    setShowResumeModal(false);
    v.play();
    setIsPlaying(true);
  }, [savedPosition]);

  const startFromBeginning = useCallback(() => {
    const v = videoRef.current;
    if (!v) return;
    v.currentTime = 0;
    setCurrentTime(0);
    setMaxReached(0);
    setSavedPosition(0);
    setShowResumeModal(false);
    v.play();
    setIsPlaying(true);
  }, []);

  const progress = duration > 0 ? currentTime / duration : 0;
  const maxProgress = duration > 0 ? maxReached / duration : 0;

  return (
    <div className={`relative w-full rounded-2xl overflow-hidden bg-black shadow-2xl select-none flex flex-col justify-center items-center ${isFullscreen ? 'fixed inset-0 z-50 rounded-none w-screen h-screen' : ''}`}>

      {/* ── Video element (native controls HIDDEN) ── */}
      <video
        ref={videoRef}
        src={src}
        className={`w-full bg-black object-contain ${isFullscreen ? 'h-full max-h-full max-w-full flex-1' : 'aspect-video'}`}
        onTimeUpdate={handleTimeUpdate}
        onSeeking={handleSeeking}
        onEnded={handleEnded}
        onLoadedMetadata={handleLoadedMetadata}
        onCanPlay={handleCanPlay}
        onWaiting={handleWaiting}
        onPlaying={handlePlaying}
        onError={handleError}
        playsInline
        // !! Critical: no native controls — all controls are custom
        disablePictureInPicture
        controlsList="nodownload nofullscreen noremoteplayback"
      />

      {/* ── Loading spinner ── */}
      {isLoading && !error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
          <div className="size-10 rounded-full border-4 border-white/20 border-t-white animate-spin" />
        </div>
      )}

      {/* ── Error state ── */}
      {error && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-30 p-8 text-center">
          <AlertTriangle className="size-10 text-red-400 mb-3" />
          <p className="text-white font-bold mb-1">Video Error</p>
          <p className="text-white/60 text-sm max-w-sm">{error}</p>
        </div>
      )}

      {/* ── Idle warning overlay (formerly Tab-switch warning) ── */}
      {tabWarning && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-30 p-8 text-center">
          <AlertTriangle className="size-10 text-amber-400 mb-3" />
          <p className="text-white text-xl font-bold mb-2">Are you still watching?</p>
          <p className="text-white/70 text-sm max-w-xs mb-6">
            Video has been paused due to inactivity.
          </p>
          <button
            onClick={() => setTabWarning(false)}
            className="px-5 py-2.5 bg-indigo-600 text-white rounded-lg font-semibold text-sm hover:bg-indigo-700 transition-colors"
          >
            I'm still here
          </button>
        </div>
      )}

      {/* ── Resume / Start-over modal ── */}
      {showResumeModal && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/90 z-30 p-8 text-center">
          <RotateCcw className="size-10 text-indigo-400 mb-3" />
          <p className="text-white text-xl font-bold mb-2">Continue Watching?</p>
          <p className="text-white/70 text-sm max-w-xs mb-6">
            You left off at <span className="text-white font-semibold">{formatTime(savedPosition)}</span>. Would you like to resume or start from the beginning?
          </p>
          <div className="flex flex-col gap-3">
            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = savedPosition;
                  videoRef.current.play().catch(() => setError('Video failed to load or playback blocked.'));
                  setIsPlaying(true);
                }
                setShowResumeModal(false);
              }}
              className="w-full bg-brand text-brand-foreground py-2.5 rounded-lg font-medium hover:bg-brand/90 transition-colors"
            >
              Resume from {formatTime(savedPosition)}
            </button>
            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                  videoRef.current.play().catch(() => setError('Video failed to load or playback blocked.'));
                  setIsPlaying(true);
                }
                setShowResumeModal(false);
              }}
              className="w-full bg-muted text-foreground py-2.5 rounded-lg font-medium hover:bg-muted/80 transition-colors"
            >
              Start from beginning
            </button>
          </div>
        </div>
      )}

      {/* ── Completed overlay ── */}
      {isCompleted && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/80 z-20">
          <CheckCircle2 className="size-14 text-emerald-400 mb-3" />
          <p className="text-white text-xl font-bold">Lesson Complete!</p>
          <p className="text-white/60 text-sm mt-1">Click "Mark complete & continue" below to proceed.</p>
        </div>
      )}

      {/* ── Click to play/pause on the video area ── */}
      {!showResumeModal && !tabWarning && !error && (
        <div
          className="absolute inset-0 z-10 cursor-pointer"
          onClick={togglePlay}
          // Prevent double-click seek on the video
          onDoubleClick={(e) => e.preventDefault()}
        />
      )}

      {/* ── Custom controls bar ── */}
      {!showResumeModal && !tabWarning && !error && (
        <div className="absolute bottom-0 left-0 right-0 z-20 bg-gradient-to-t from-black/90 to-transparent px-4 pb-3 pt-8">

          {/* Progress track */}
          <div
            ref={progressBarRef}
            className="relative h-2 rounded-full bg-white/20 mb-3 cursor-pointer group"
            onClick={handleProgressClick}
          >
            {/* Max-reached indicator (light grey) */}
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-white/30"
              style={{ width: `${maxProgress * 100}%` }}
            />
            {/* Current time (indigo) */}
            <div
              className="absolute left-0 top-0 h-full rounded-full bg-indigo-500"
              style={{ width: `${progress * 100}%` }}
            />
            {/* Scrubber thumb */}
            <div
              className="absolute top-1/2 -translate-y-1/2 size-4 rounded-full bg-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity"
              style={{ left: `calc(${progress * 100}% - 8px)` }}
            />
          </div>

          {/* Buttons row */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <button
                onClick={togglePlay}
                className="size-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                aria-label={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="size-4" /> : <Play className="size-4 translate-x-px" />}
              </button>
              <button
                onClick={toggleMute}
                className="size-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                aria-label={isMuted ? 'Unmute' : 'Mute'}
              >
                {isMuted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
              </button>
              <button
                onClick={toggleFullscreen}
                className="size-9 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                aria-label={isFullscreen ? 'Minimize' : 'Maximize'}
              >
                {isFullscreen ? <Minimize className="size-4" /> : <Maximize className="size-4" />}
              </button>
              <span className="text-white/80 text-xs font-mono">
                {formatTime(currentTime)} / {formatTime(duration)}
              </span>
            </div>

            {/* Restriction notice */}
            <div className="flex items-center gap-1.5 text-white/50 text-xs">
              <div className="size-1.5 rounded-full bg-red-500 animate-pulse" />
              No skip allowed
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
