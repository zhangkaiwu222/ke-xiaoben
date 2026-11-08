import type { AppData, LessonLedgerEntry } from '../types';

/** `YYYY-MM` */
export function monthKeyFromDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  return `${y}-${m}`;
}

export function parseMonthKey(key: string): { year: number; month: number } | null {
  const m = /^(\d{4})-(\d{2})$/.exec(key.trim());
  if (!m) return null;
  const year = Number.parseInt(m[1], 10);
  const month = Number.parseInt(m[2], 10);
  if (!Number.isFinite(year) || month < 1 || month > 12) return null;
  return { year, month };
}

/** 该月第一毫秒与最后一毫秒（本地日历月） */
export function localMonthBounds(year: number, month: number): { start: Date; end: Date } {
  const start = new Date(year, month - 1, 1, 0, 0, 0, 0);
  const end = new Date(year, month, 0, 23, 59, 59, 999);
  return { start, end };
}

export function isInLocalMonth(iso: string, year: number, month: number): boolean {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return false;
  const { start, end } = localMonthBounds(year, month);
  return d >= start && d <= end;
}

export type MonthLedgerRow = {
  studentId: string;
  studentName: string;
  entry: LessonLedgerEntry;
};

export function listLedgerInMonth(data: AppData, monthKey: string): MonthLedgerRow[] {
  const parsed = parseMonthKey(monthKey);
  if (!parsed) return [];
  const { year, month } = parsed;
  const rows: MonthLedgerRow[] = [];
  for (const s of data.students) {
    const ledger = Array.isArray(s.ledger) ? s.ledger : [];
    for (const entry of ledger) {
      if (!isInLocalMonth(entry.at, year, month)) continue;
      rows.push({ studentId: s.id, studentName: s.name, entry });
    }
  }
  rows.sort((a, b) => new Date(b.entry.at).getTime() - new Date(a.entry.at).getTime());
  return rows;
}

export type StudentMonthAgg = {
  studentId: string;
  name: string;
  consumed: number;
  purchased: number;
};

export function aggregateByStudentMonth(data: AppData, monthKey: string): StudentMonthAgg[] {
  const rows = listLedgerInMonth(data, monthKey);
  const map = new Map<string, StudentMonthAgg>();
  for (const r of rows) {
    let agg = map.get(r.studentId);
    if (!agg) {
      agg = { studentId: r.studentId, name: r.studentName, consumed: 0, purchased: 0 };
      map.set(r.studentId, agg);
    }
    if (r.entry.kind === 'consume') agg.consumed += r.entry.count;
    else agg.purchased += r.entry.count;
  }
  return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, 'zh-Hans'));
}

export function monthTotals(data: AppData, monthKey: string): { consumed: number; purchased: number } {
  const aggs = aggregateByStudentMonth(data, monthKey);
  return aggs.reduce(
    (acc, a) => ({
      consumed: acc.consumed + a.consumed,
      purchased: acc.purchased + a.purchased,
    }),
    { consumed: 0, purchased: 0 }
  );
}

function csvEscape(cell: string): string {
  if (/[",\n\r]/.test(cell)) return `"${cell.replace(/"/g, '""')}"`;
  return cell;
}

/** 明细 CSV：学员,类型,节数,时间(ISO) */
export function buildMonthDetailCsv(monthKey: string, rows: MonthLedgerRow[]): string {
  const header = ['学员', '类型', '节数', '时间'];
  const lines = [header.map(csvEscape).join(',')];
  for (const r of rows) {
    const kind = r.entry.kind === 'consume' ? '消课' : '续购';
    const line = [r.studentName, kind, String(r.entry.count), r.entry.at].map(csvEscape).join(',');
    lines.push(line);
  }
  return [`# 课消本 ${monthKey} 流水`, ...lines].join('\n');
}

/** 汇总 CSV：学员,本月消课,本月续购 */
export function buildMonthSummaryCsv(monthKey: string, aggs: StudentMonthAgg[]): string {
  const header = ['学员', '本月消课', '本月续购'];
  const lines = [header.map(csvEscape).join(',')];
  for (const a of aggs) {
    const line = [a.name, String(a.consumed), String(a.purchased)].map(csvEscape).join(',');
    lines.push(line);
  }
  return [`# 课消本 ${monthKey} 汇总`, ...lines].join('\n');
}
