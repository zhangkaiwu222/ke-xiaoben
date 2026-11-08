import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

import type { AppData } from '../types';

/** Prefix for scheduled notification identifiers — only these are cancelled on resync */
export const LESSON_NOTIF_ID_PREFIX = 'lesson-';

const ANDROID_CHANNEL_ID = 'lesson-reminders';

let androidChannelReady = false;

async function ensureAndroidChannel() {
  if (Platform.OS !== 'android' || androidChannelReady) return;
  androidChannelReady = true;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: '上课提醒',
    importance: Notifications.AndroidImportance.DEFAULT,
    vibrationPattern: [0, 250, 250, 250],
    sound: 'default',
  });
}

function notificationId(studentId: string, lessonId: string) {
  return `${LESSON_NOTIF_ID_PREFIX}${studentId}-${lessonId}`;
}

function formatWhen(d: Date): string {
  return d.toLocaleString('zh-CN', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

/**
 * 根据当前排课与设置，重新登记本地定时通知（仅 iOS / Android）。
 * 每条排课在「上课时间 − 提前分钟」触发；若已晚于该时刻则跳过。
 */
export async function syncLessonRemindersFromData(data: AppData): Promise<void> {
  if (Platform.OS === 'web') return;

  await ensureAndroidChannel();

  const settings = data.settings?.lessonReminder;
  if (!settings?.enabled) {
    await cancelLessonRemindersOnly();
    return;
  }

  const advanceMin = Math.max(0, Math.min(24 * 60, Math.floor(settings.advanceMinutes ?? 30)));
  const advanceMs = advanceMin * 60 * 1000;

  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    await cancelLessonRemindersOnly();
    return;
  }

  const now = Date.now();
  const horizon = now + 62 * 24 * 60 * 60 * 1000;

  const pending: {
    id: string;
    fireAt: Date;
    title: string;
    body: string;
  }[] = [];

  for (const s of data.students) {
    const schedule = Array.isArray(s.schedule) ? s.schedule : [];
    for (const lesson of schedule) {
      const classTime = new Date(lesson.scheduledAt).getTime();
      if (Number.isNaN(classTime)) continue;
      if (classTime < now) continue;
      const triggerMs = classTime - advanceMs;
      if (triggerMs <= now || triggerMs > horizon) continue;

      const whenStr = formatWhen(new Date(classTime));
      const title =
        advanceMin <= 0 ? `上课提醒：${s.name}` : `即将上课：${s.name}`;
      const topic = lesson.title?.trim() ? ` · ${lesson.title.trim()}` : '';
      const body =
        advanceMin <= 0
          ? `原定 ${whenStr}${topic}`
          : `${advanceMin} 分钟后（${whenStr}）${topic}`;

      pending.push({
        id: notificationId(s.id, lesson.id),
        fireAt: new Date(triggerMs),
        title,
        body,
      });
    }
  }

  pending.sort((a, b) => a.fireAt.getTime() - b.fireAt.getTime());
  const capped = pending.slice(0, 60);

  await cancelLessonRemindersOnly();

  for (const p of capped) {
    try {
      await Notifications.scheduleNotificationAsync({
        identifier: p.id,
        content: {
          title: p.title,
          body: p.body,
          sound: true,
          ...(Platform.OS === 'android' ? { channelId: ANDROID_CHANNEL_ID } : {}),
        },
        trigger: {
          type: Notifications.SchedulableTriggerInputTypes.DATE,
          date: p.fireAt,
        },
      });
    } catch {
      /* ignore single slot failures */
    }
  }
}

export async function cancelLessonRemindersOnly(): Promise<void> {
  if (Platform.OS === 'web') return;
  try {
    const list = await Notifications.getAllScheduledNotificationsAsync();
    await Promise.all(
      list
        .filter((n) => n.identifier?.startsWith(LESSON_NOTIF_ID_PREFIX))
        .map((n) => Notifications.cancelScheduledNotificationAsync(n.identifier)),
    );
  } catch {
    await Notifications.cancelAllScheduledNotificationsAsync();
  }
}

export async function requestLessonReminderPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;
  const { status: existing } = await Notifications.getPermissionsAsync();
  if (existing === 'granted') return true;
  const { status } = await Notifications.requestPermissionsAsync();
  return status === 'granted';
}
