import AsyncStorage from '@react-native-async-storage/async-storage';

import type { AppData, AppSettings, LessonLedgerEntry, ScheduledLesson, Student } from '../types';

const KEY = 'kexiaoben-app-v1';

export const defaultSettings = (): AppSettings => ({
  lessonReminder: {
    enabled: false,
    advanceMinutes: 30,
  },
});

export const defaultAppData = (): AppData => ({
  students: [],
  settings: defaultSettings(),
});

function normalizeSettings(raw: unknown): AppSettings {
  const base = defaultSettings();
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Record<string, unknown>;
  const lr = o.lessonReminder && typeof o.lessonReminder === 'object' ? (o.lessonReminder as Record<string, unknown>) : {};
  const enabled = typeof lr.enabled === 'boolean' ? lr.enabled : base.lessonReminder.enabled;
  const adv =
    typeof lr.advanceMinutes === 'number' && Number.isFinite(lr.advanceMinutes)
      ? Math.max(0, Math.min(24 * 60, Math.floor(lr.advanceMinutes)))
      : base.lessonReminder.advanceMinutes;
  return {
    lessonReminder: {
      enabled,
      advanceMinutes: adv,
    },
  };
}

function normalizeScheduledLesson(raw: unknown): ScheduledLesson | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'string' ? o.id : '';
  const scheduledAt = typeof o.scheduledAt === 'string' ? o.scheduledAt : '';
  const title = typeof o.title === 'string' ? o.title : '';
  const note = typeof o.note === 'string' ? o.note : '';
  const createdAt = typeof o.createdAt === 'string' ? o.createdAt : new Date().toISOString();
  if (!id || !scheduledAt) return null;
  return { id, scheduledAt, title, note, createdAt };
}

function normalizeLedgerEntry(raw: unknown): LessonLedgerEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const o = raw as Record<string, unknown>;
  const id = typeof o.id === 'string' ? o.id : '';
  const kind = o.kind === 'consume' || o.kind === 'purchase' ? o.kind : null;
  const count = typeof o.count === 'number' && Number.isFinite(o.count) ? Math.max(1, Math.floor(o.count)) : null;
  const at = typeof o.at === 'string' ? o.at : '';
  if (!id || !kind || count === null || !at) return null;
  return { id, kind, count, at };
}

function normalizeStudent(raw: unknown): Student | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;
  const id = typeof s.id === 'string' ? s.id : '';
  const name = typeof s.name === 'string' ? s.name : '未命名学员';
  const totalPurchased =
    typeof s.totalPurchased === 'number' && Number.isFinite(s.totalPurchased)
      ? Math.max(0, Math.floor(s.totalPurchased))
      : 0;
  const consumed =
    typeof s.consumed === 'number' && Number.isFinite(s.consumed) ? Math.max(0, Math.floor(s.consumed)) : 0;
  const note = typeof s.note === 'string' ? s.note : '';
  const createdAt = typeof s.createdAt === 'string' ? s.createdAt : new Date().toISOString();
  const ledgerRaw = Array.isArray(s.ledger) ? s.ledger : [];
  const ledger = ledgerRaw.map(normalizeLedgerEntry).filter((x): x is LessonLedgerEntry => x !== null);
  const scheduleRaw = Array.isArray(s.schedule) ? s.schedule : [];
  const schedule = scheduleRaw.map(normalizeScheduledLesson).filter((x): x is ScheduledLesson => x !== null);
  if (!id) return null;
  return { id, name, totalPurchased, consumed, note, createdAt, ledger, schedule };
}

function migrateAppData(parsed: AppData): AppData {
  const students = parsed.students
    .map(normalizeStudent)
    .filter((x): x is Student => x !== null);
  const settings = normalizeSettings(parsed.settings);
  return { students, settings };
}

export async function loadAppData(): Promise<AppData> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return defaultAppData();
    const parsed = JSON.parse(raw) as AppData;
    if (!parsed.students || !Array.isArray(parsed.students)) {
      return defaultAppData();
    }
    return migrateAppData(parsed);
  } catch {
    return defaultAppData();
  }
}

export async function saveAppData(data: AppData): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(data));
}

/** 供分享 / 迁移的 JSON 备份（带元数据包裹） */
export function exportBackupJson(data: AppData): string {
  return JSON.stringify(
    {
      format: 'kexiaoben-backup',
      version: 1,
      exportedAt: new Date().toISOString(),
      data,
    },
    null,
    2
  );
}

/** 解析备份或裸 `AppData` JSON；无效返回 null */
export function parseBackupJson(raw: string): AppData | null {
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== 'object') return null;
    const o = parsed as Record<string, unknown>;
    if (o.format === 'kexiaoben-backup' && o.data && typeof o.data === 'object') {
      const inner = o.data as AppData;
      if (!Array.isArray(inner.students)) return null;
      return migrateAppData(inner);
    }
    const bare = parsed as Record<string, unknown>;
    if (Array.isArray(bare.students)) {
      return migrateAppData(parsed as AppData);
    }
    return null;
  } catch {
    return null;
  }
}
