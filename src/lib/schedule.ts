import type { AppData, ScheduledLesson, Student } from '../types';

export type UpcomingLessonRow = {
  studentId: string;
  studentName: string;
  lesson: ScheduledLesson;
  scheduledMs: number;
};

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * 一段时间内、不早于 `fromMs` 的排课（按上课时间升序）。
 * `fromMs` 默认当前时刻。
 */
export function listUpcomingLessons(
  students: Student[],
  options?: {
    fromMs?: number;
    days?: number;
    limit?: number;
  }
): UpcomingLessonRow[] {
  const start = options?.fromMs ?? Date.now();
  const days = options?.days ?? 14;
  const end = start + days * DAY_MS;
  const limit = options?.limit ?? 200;

  const rows: UpcomingLessonRow[] = [];
  for (const s of students) {
    const schedule = Array.isArray(s.schedule) ? s.schedule : [];
    for (const lesson of schedule) {
      const t = new Date(lesson.scheduledAt).getTime();
      if (Number.isNaN(t)) continue;
      if (t < start || t > end) continue;
      rows.push({
        studentId: s.id,
        studentName: s.name,
        lesson,
        scheduledMs: t,
      });
    }
  }
  rows.sort((a, b) => a.scheduledMs - b.scheduledMs);
  return rows.slice(0, limit);
}

/** 未来 `days` 天内、且时间在 `fromMs` 之后的排课条数 */
export function countUpcomingLessons(data: AppData, days: number, fromMs = Date.now()): number {
  return listUpcomingLessons(data.students, { fromMs, days }).length;
}

/** 剩余课时不超过阈值的学员人数 */
export function countLowRemainingStudents(
  students: Student[],
  remaining: (s: Student) => number,
  threshold: number
): number {
  return students.filter((s) => remaining(s) <= threshold && remaining(s) >= 0).length;
}

export function formatLessonDateTime(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}
