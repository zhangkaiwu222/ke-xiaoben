/** 课时流水：消课或续购入账 */
export type LessonLedgerKind = 'consume' | 'purchase';

export type LessonLedgerEntry = {
  id: string;
  kind: LessonLedgerKind;
  /** 本次变动的节数（正整数） */
  count: number;
  at: string;
};

/** 排课：单次上课时间（不自动消课，到课后在「消课」里操作） */
export type ScheduledLesson = {
  id: string;
  /** 计划上课时间（ISO） */
  scheduledAt: string;
  /** 课程主题（选填） */
  title: string;
  note: string;
  createdAt: string;
};

/** 学员：课时按「节」计数 */
export type Student = {
  id: string;
  name: string;
  /** 累计购入节数 */
  totalPurchased: number;
  /** 已消课节数 */
  consumed: number;
  note: string;
  createdAt: string;
  /** 课时流水（旧数据迁移为空数组） */
  ledger: LessonLedgerEntry[];
  /** 排课列表（旧数据迁移为空数组） */
  schedule: ScheduledLesson[];
};

/** 课前本地提醒（系统通知） */
export type LessonReminderSettings = {
  /** 用户开启后才会调度；需系统通知权限 */
  enabled: boolean;
  /** 开课前多少分钟提醒（0 = 在上课时刻提醒） */
  advanceMinutes: number;
};

export type AppSettings = {
  lessonReminder: LessonReminderSettings;
};

export type AppData = {
  students: Student[];
  /** 旧数据无此字段，迁移时补默认 */
  settings?: AppSettings;
};
