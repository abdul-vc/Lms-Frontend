import { authFetch, API_BASE } from "./auth";
import { useState, useEffect } from "react";

function parseNumericId(id: string | number | undefined | null): number | null {
  if (id === undefined || id === null) return null;
  const str = id.toString().replace("api-l-", "").replace("api-", "").replace(/^l/, "").replace(/^m/, "");
  const num = parseInt(str, 10);
  return isNaN(num) ? null : num;
}

export async function markLessonComplete(courseId: string | number, lessonId: string | number) {
  const lId = parseNumericId(lessonId);
  if (!lId) return;
  try {
    await authFetch(`${API_BASE}/lessons/${lId}/progress/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ completed: true }),
    });
  } catch (e) {
    console.error("Failed to mark lesson complete:", e);
  }
}

export async function isLessonComplete(courseId: string | number, lessonId: string | number) {
  const lId = parseNumericId(lessonId);
  if (!lId) return false;
  try {
    const res = await authFetch(`${API_BASE}/lessons/${lId}/progress/`);
    if (res.ok) {
      const data = await res.json();
      return Boolean(data.completed);
    }
  } catch (e) {
    return false;
  }
  return false;
}

export async function getCourseProgress(courseId: string | number) {
  const cId = parseNumericId(courseId);
  if (!cId) {
    return { percent: 0, completed_lessons: 0, total_lessons: 0, completed_lesson_ids: [], last_active_lesson_id: null };
  }
  try {
    const res = await authFetch(`${API_BASE}/courses/${cId}/progress/`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    console.error("Failed to get course progress:", e);
  }
  return { percent: 0, completed_lessons: 0, total_lessons: 0, completed_lesson_ids: [], last_active_lesson_id: null };
}

export async function setLastActive(courseId: string | number, lessonId: string | number, positionSeconds?: number) {
  const lId = parseNumericId(lessonId);
  if (!lId) return;
  try {
    await authFetch(`${API_BASE}/lessons/${lId}/progress/`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ last_position_seconds: positionSeconds || 0 }),
    });
  } catch (e) {
    console.error("Failed to set last active position:", e);
  }
}

export async function getLessonProgress(lessonId: string | number) {
  const lId = parseNumericId(lessonId);
  if (!lId) return null;
  try {
    const res = await authFetch(`${API_BASE}/lessons/${lId}/progress/`);
    if (res.ok) {
      return await res.json();
    }
  } catch (e) {
    return null;
  }
  return null;
}

export function useCourseProgress(courseId: string | number) {
  const [completedIds, setCompletedIds] = useState<Set<string>>(new Set());
  const [percent, setPercent] = useState(0);

  const fetchProgress = async () => {
    if (!courseId) return;
    const data = await getCourseProgress(courseId);
    if (data && Array.isArray(data.completed_lesson_ids)) {
      setCompletedIds(new Set(data.completed_lesson_ids.map(String)));
      setPercent(data.percent || 0);
    }
  };

  useEffect(() => {
    fetchProgress();
  }, [courseId]);

  return {
    completedIds,
    percent,
    isLessonComplete: (lessonId: string | number) => {
      const lId = parseNumericId(lessonId);
      if (!lId) return false;
      return completedIds.has(String(lId));
    },
    refresh: fetchProgress
  };
}
