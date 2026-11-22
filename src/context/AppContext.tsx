import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  FREE_SCHEDULE_DAYS,
  FREE_STUDENT_LIMIT,
  PRO_SCHEDULE_DAYS,
} from '../constants/entitlements';
import { createId } from '../lib/id';
import { syncLessonRemindersFromData } from '../lib/lessonReminders';
import { exportBackupJson, loadAppData, parseBackupJson, saveAppData } from '../lib/storage';
import type { AppData, Student } from '../types';

export type AddStudentInput = {
  name: string;
  initialPurchased: number;
  note?: string;
  subject?: string;
  phone?: string;
};

export type AddStudentResult =
  | { ok: true; student: Student }
  | { ok: false; reason: 'pro_required' | 'invalid' };

const MAX_LEDGER = 200;
const MAX_SCHEDULE = 100;

type StudentPatch = {
  name?: string;
  note?: string;
  subject?: string;
  phone?: string;
  totalPurchased?: number;
  consumed?: number;
};

type AppContextValue = {
  ready: boolean;
  data: AppData;
  isPro: boolean;
  scheduleHorizonDays: number;
  canCreateStudent: boolean;
  canExportCsv: boolean;
  remaining: (s: Student) => number;
  addStudent: (input: AddStudentInput) => AddStudentResult;
  updateStudent: (studentId: string, patch: StudentPatch) => void;
  deleteStudent: (studentId: string) => void;
  consume: (studentId: string, count?: number) => void;
  addPurchased: (studentId: string, count: number) => void;
  addScheduledLesson: (
    studentId: string,
    input: { scheduledAt: Date; title?: string; note?: string }
  ) => void;
  removeScheduledLesson: (studentId: string, scheduleEntryId: string) => void;
  /** 消 1 节并移除对应排课（课上完即用） */
  consumeFromSchedule: (studentId: string, scheduleEntryId: string) => void;
  exportBackup: () => string;
  importBackup: (raw: string) => { ok: boolean; reason?: string };
  setLessonReminderEnabled: (enabled: boolean) => void;
  setLessonReminderAdvanceMinutes: (minutes: number) => void;
  syncProFromStore: (active: boolean, productId?: string) => void;
  unlockProDemo: () => void;
  setLessonTemplates: (templates: string[]) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = useState(false);
  const [data, setData] = useState<AppData>({ students: [] });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const loaded = await loadAppData();
      if (!cancelled) {
        setData(loaded);
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    void syncLessonRemindersFromData(data);
  }, [ready, data]);

  const remaining = useCallback((s: Student) => Math.max(0, s.totalPurchased - s.consumed), []);

  const isPro = data.subscription?.isPro === true;
  const scheduleHorizonDays = isPro ? PRO_SCHEDULE_DAYS : FREE_SCHEDULE_DAYS;
  const canCreateStudent = isPro || data.students.length < FREE_STUDENT_LIMIT;
  const canExportCsv = isPro;

  const syncProFromStore = useCallback((active: boolean, productId?: string) => {
    setData((prev) => {
      const next: AppData = active
        ? {
            ...prev,
            subscription: { isPro: true, productId, source: 'store' },
          }
        : __DEV__ && prev.subscription?.demoUnlockedAt
          ? prev
          : { ...prev, subscription: { isPro: false } };
      void saveAppData(next);
      return next;
    });
  }, []);

  const unlockProDemo = useCallback(() => {
    if (!__DEV__) return;
    setData((prev) => {
      const next: AppData = {
        ...prev,
        subscription: {
          isPro: true,
          source: 'demo',
          demoUnlockedAt: new Date().toISOString(),
        },
      };
      void saveAppData(next);
      return next;
    });
  }, []);

  const setLessonTemplates = useCallback(
    (templates: string[]) => {
      if (!isPro) return;
      const cleaned = templates.map((t) => t.trim()).filter(Boolean).slice(0, 12);
      setData((prev) => {
        const settings = prev.settings ?? { lessonReminder: { enabled: false, advanceMinutes: 30 } };
        const next: AppData = {
          ...prev,
          settings: { ...settings, lessonTemplates: cleaned },
        };
        void saveAppData(next);
        return next;
      });
    },
    [isPro],
  );

  const setLessonReminderEnabled = useCallback((enabled: boolean) => {
    setData((prev) => {
      const settings = prev.settings ?? {
        lessonReminder: { enabled: false, advanceMinutes: 30 },
      };
      const next: AppData = {
        ...prev,
        settings: {
          ...settings,
          lessonReminder: { ...settings.lessonReminder, enabled },
        },
      };
      void saveAppData(next);
      return next;
    });
  }, []);

  const setLessonReminderAdvanceMinutes = useCallback((minutes: number) => {
    const m = Math.max(0, Math.min(24 * 60, Math.floor(minutes)));
    setData((prev) => {
      const settings = prev.settings ?? {
        lessonReminder: { enabled: false, advanceMinutes: 30 },
      };
      const next: AppData = {
        ...prev,
        settings: {
          ...settings,
          lessonReminder: { ...settings.lessonReminder, advanceMinutes: m },
        },
      };
      void saveAppData(next);
      return next;
    });
  }, []);

  const addStudent = useCallback(
    (input: AddStudentInput): AddStudentResult => {
      const name = input.name.trim();
      if (!name) return { ok: false, reason: 'invalid' };
      if (!isPro && data.students.length >= FREE_STUDENT_LIMIT) {
        return { ok: false, reason: 'pro_required' };
      }
      const initialPurchased = Math.max(0, Math.floor(input.initialPurchased));
      const student: Student = {
        id: createId(),
        name,
        subject: (input.subject ?? '').trim(),
        phone: (input.phone ?? '').trim(),
        totalPurchased: initialPurchased,
        consumed: 0,
        note: (input.note ?? '').trim(),
        createdAt: new Date().toISOString(),
        ledger: [],
        schedule: [],
      };
      setData((prev) => {
        const next = { ...prev, students: [...prev.students, student] };
        void saveAppData(next);
        return next;
      });
      return { ok: true, student };
    },
    [data.students.length, isPro],
  );

  const updateStudent = useCallback((studentId: string, patch: StudentPatch) => {
    setData((prev) => {
      const students = prev.students.map((s) => {
        if (s.id !== studentId) return s;
        const name = patch.name !== undefined ? patch.name.trim() : s.name;
        const note = patch.note !== undefined ? patch.note.trim() : s.note;
        const subject = patch.subject !== undefined ? patch.subject.trim() : s.subject;
        const phone = patch.phone !== undefined ? patch.phone.trim() : s.phone;
        let totalPurchased =
          patch.totalPurchased !== undefined
            ? Math.max(0, Math.floor(patch.totalPurchased))
            : s.totalPurchased;
        let consumed =
          patch.consumed !== undefined ? Math.max(0, Math.floor(patch.consumed)) : s.consumed;
        if (consumed > totalPurchased) consumed = totalPurchased;
        const schedule = Array.isArray(s.schedule) ? s.schedule : [];
        return {
          ...s,
          name: name || '未命名学员',
          note,
          subject,
          phone,
          totalPurchased,
          consumed,
          schedule,
        };
      });
      const next = { ...prev, students };
      void saveAppData(next);
      return next;
    });
  }, []);

  const deleteStudent = useCallback((studentId: string) => {
    setData((prev) => {
      const next = { ...prev, students: prev.students.filter((s) => s.id !== studentId) };
      void saveAppData(next);
      return next;
    });
  }, []);

  const consume = useCallback((studentId: string, count = 1) => {
    const n = Math.max(1, Math.floor(count));
    const at = new Date().toISOString();
    setData((prev) => {
      const students = prev.students.map((s) => {
        if (s.id !== studentId) return s;
        const maxCan = Math.max(0, s.totalPurchased - s.consumed);
        const delta = Math.min(n, maxCan);
        if (delta <= 0) return s;
        const entry = { id: createId(), kind: 'consume' as const, count: delta, at };
        return {
          ...s,
          consumed: s.consumed + delta,
          ledger: [entry, ...s.ledger].slice(0, MAX_LEDGER),
        };
      });
      const next = { ...prev, students };
      void saveAppData(next);
      return next;
    });
  }, []);

  const addPurchased = useCallback((studentId: string, count: number) => {
    const n = Math.max(1, Math.floor(count));
    const at = new Date().toISOString();
    const entry = { id: createId(), kind: 'purchase' as const, count: n, at };
    setData((prev) => {
      const students = prev.students.map((s) =>
        s.id === studentId
          ? {
              ...s,
              totalPurchased: s.totalPurchased + n,
              ledger: [entry, ...s.ledger].slice(0, MAX_LEDGER),
            }
          : s
      );
      const next = { ...prev, students };
      void saveAppData(next);
      return next;
    });
  }, []);

  const addScheduledLesson = useCallback(
    (studentId: string, input: { scheduledAt: Date; title?: string; note?: string }) => {
      const scheduledAt = input.scheduledAt;
      if (Number.isNaN(scheduledAt.getTime())) return;
      const atIso = scheduledAt.toISOString();
      const entry = {
        id: createId(),
        scheduledAt: atIso,
        title: (input.title ?? '').trim(),
        note: (input.note ?? '').trim(),
        createdAt: new Date().toISOString(),
      };
      setData((prev) => {
        const students = prev.students.map((s) => {
          if (s.id !== studentId) return s;
          const schedule = Array.isArray(s.schedule) ? s.schedule : [];
          return {
            ...s,
            schedule: [entry, ...schedule].slice(0, MAX_SCHEDULE),
          };
        });
        const next = { ...prev, students };
        void saveAppData(next);
        return next;
      });
    },
    []
  );

  const removeScheduledLesson = useCallback((studentId: string, scheduleEntryId: string) => {
    setData((prev) => {
      const students = prev.students.map((s) => {
        if (s.id !== studentId) return s;
        const schedule = Array.isArray(s.schedule) ? s.schedule : [];
        return {
          ...s,
          schedule: schedule.filter((x) => x.id !== scheduleEntryId),
        };
      });
      const next = { ...prev, students };
      void saveAppData(next);
      return next;
    });
  }, []);

  const consumeFromSchedule = useCallback((studentId: string, scheduleEntryId: string) => {
    const at = new Date().toISOString();
    setData((prev) => {
      const students = prev.students.map((s) => {
        if (s.id !== studentId) return s;
        const schedule = Array.isArray(s.schedule) ? s.schedule : [];
        if (!schedule.some((x) => x.id === scheduleEntryId)) return s;
        const maxCan = Math.max(0, s.totalPurchased - s.consumed);
        if (maxCan <= 0) return s;
        const entry = { id: createId(), kind: 'consume' as const, count: 1, at };
        return {
          ...s,
          consumed: s.consumed + 1,
          ledger: [entry, ...s.ledger].slice(0, MAX_LEDGER),
          schedule: schedule.filter((x) => x.id !== scheduleEntryId),
        };
      });
      const next = { ...prev, students };
      void saveAppData(next);
      return next;
    });
  }, []);

  const exportBackup = useCallback(() => {
    return exportBackupJson(data);
  }, [data]);

  const importBackup = useCallback((raw: string) => {
    const parsed = parseBackupJson(raw);
    if (!parsed) return { ok: false as const, reason: 'invalid' };
    setData(() => {
      void saveAppData(parsed);
      return parsed;
    });
    return { ok: true as const };
  }, []);

  const value = useMemo<AppContextValue>(
    () => ({
      ready,
      data,
      isPro,
      scheduleHorizonDays,
      canCreateStudent,
      canExportCsv,
      remaining,
      addStudent,
      updateStudent,
      deleteStudent,
      consume,
      addPurchased,
      addScheduledLesson,
      removeScheduledLesson,
      consumeFromSchedule,
      exportBackup,
      importBackup,
      setLessonReminderEnabled,
      setLessonReminderAdvanceMinutes,
      syncProFromStore,
      unlockProDemo,
      setLessonTemplates,
    }),
    [
      ready,
      data,
      isPro,
      scheduleHorizonDays,
      canCreateStudent,
      canExportCsv,
      remaining,
      addStudent,
      updateStudent,
      deleteStudent,
      consume,
      addPurchased,
      addScheduledLesson,
      removeScheduledLesson,
      consumeFromSchedule,
      exportBackup,
      importBackup,
      setLessonReminderEnabled,
      setLessonReminderAdvanceMinutes,
      syncProFromStore,
      unlockProDemo,
      setLessonTemplates,
    ]
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}

export function useApp(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error('useApp must be used within AppProvider');
  return ctx;
}
