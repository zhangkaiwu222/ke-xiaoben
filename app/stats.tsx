import * as Clipboard from 'expo-clipboard';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { useApp } from '../src/context/AppContext';
import {
  aggregateByStudentMonth,
  buildMonthDetailCsv,
  buildMonthSummaryCsv,
  listLedgerInMonth,
  monthKeyFromDate,
  monthTotals,
  parseMonthKey,
} from '../src/lib/stats';

function shiftMonthKey(key: string, delta: number): string {
  const p = parseMonthKey(key);
  if (!p) return monthKeyFromDate(new Date());
  const d = new Date(p.year, p.month - 1 + delta, 1);
  return monthKeyFromDate(d);
}

function formatCnMonthLabel(key: string): string {
  const p = parseMonthKey(key);
  if (!p) return key;
  return `${p.year} 年 ${String(p.month).padStart(2, '0')} 月`;
}

function formatLedgerTime(iso: string): string {
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

export default function StatsScreen() {
  const { ready, data } = useApp();
  const [monthKey, setMonthKey] = useState(() => monthKeyFromDate(new Date()));

  const detailRows = useMemo(() => listLedgerInMonth(data, monthKey), [data, monthKey]);
  const aggs = useMemo(() => aggregateByStudentMonth(data, monthKey), [data, monthKey]);
  const totals = useMemo(() => monthTotals(data, monthKey), [data, monthKey]);

  const shareCsv = (csv: string, title: string) => {
    void Share.share({ message: csv, title }).catch(async () => {
      await Clipboard.setStringAsync(csv);
      Alert.alert('已复制', '分享不可用，CSV 已复制到剪贴板。');
    });
  };

  const copyCsv = async (csv: string) => {
    await Clipboard.setStringAsync(csv);
    Alert.alert('已复制', 'CSV 已复制，可粘贴到表格软件。');
  };

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.monthBar}>
        <Pressable
          style={({ pressed }) => [styles.monthNav, pressed && styles.pressed]}
          onPress={() => setMonthKey((k) => shiftMonthKey(k, -1))}>
          <Text style={styles.monthNavText}>‹ 上月</Text>
        </Pressable>
        <Text style={styles.monthTitle}>{formatCnMonthLabel(monthKey)}</Text>
        <Pressable
          style={({ pressed }) => [styles.monthNav, pressed && styles.pressed]}
          onPress={() => setMonthKey((k) => shiftMonthKey(k, 1))}>
          <Text style={styles.monthNavText}>下月 ›</Text>
        </Pressable>
      </View>

      <View style={styles.card}>
        <Text style={styles.totalLine}>本月消课合计：{totals.consumed} 节</Text>
        <Text style={styles.totalLine}>本月续购合计：{totals.purchased} 节</Text>
        <Text style={styles.miniHint}>按流水时间（本机时区）统计。</Text>
      </View>

      <View style={styles.exportRow}>
        <Pressable
          style={({ pressed }) => [styles.exportBtn, pressed && styles.pressed]}
          onPress={() => shareCsv(buildMonthSummaryCsv(monthKey, aggs), `课消本-${monthKey}-汇总`)}>
          <Text style={styles.exportBtnText}>分享汇总 CSV</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.exportBtnSecondary, pressed && styles.pressed]}
          onPress={() => void copyCsv(buildMonthSummaryCsv(monthKey, aggs))}>
          <Text style={styles.exportBtnSecondaryText}>复制汇总</Text>
        </Pressable>
      </View>
      <View style={styles.exportRow}>
        <Pressable
          style={({ pressed }) => [styles.exportBtn, pressed && styles.pressed]}
          onPress={() =>
            shareCsv(buildMonthDetailCsv(monthKey, detailRows), `课消本-${monthKey}-流水`)
          }>
          <Text style={styles.exportBtnText}>分享流水 CSV</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.exportBtnSecondary, pressed && styles.pressed]}
          onPress={() => void copyCsv(buildMonthDetailCsv(monthKey, detailRows))}>
          <Text style={styles.exportBtnSecondaryText}>复制流水</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>按学员汇总</Text>
      {aggs.length === 0 ? (
        <Text style={styles.empty}>本月暂无流水。</Text>
      ) : (
        <View style={styles.tableCard}>
          <View style={styles.tableHead}>
            <Text style={[styles.th, styles.colName]}>学员</Text>
            <Text style={[styles.th, styles.colNum]}>消课</Text>
            <Text style={[styles.th, styles.colNum]}>续购</Text>
          </View>
          {aggs.map((a) => (
            <View key={a.studentId} style={styles.tableRow}>
              <Text style={[styles.td, styles.colName]} numberOfLines={1}>
                {a.name}
              </Text>
              <Text style={[styles.td, styles.colNum]}>{a.consumed}</Text>
              <Text style={[styles.td, styles.colNum]}>{a.purchased}</Text>
            </View>
          ))}
        </View>
      )}

      <Text style={styles.section}>流水明细</Text>
      {detailRows.length === 0 ? (
        <Text style={styles.empty}>暂无。</Text>
      ) : (
        <View style={styles.listCard}>
          {detailRows.map((r) => (
            <View key={r.entry.id} style={styles.detailRow}>
              <Text style={styles.detailMain}>
                {r.studentName} · {r.entry.kind === 'consume' ? '消课' : '续购'} · {r.entry.count}{' '}
                节
              </Text>
              <Text style={styles.detailTime}>{formatLedgerTime(r.entry.at)}</Text>
            </View>
          ))}
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
  },
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  monthBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  monthNav: {
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  monthNavText: {
    color: '#38bdf8',
    fontSize: 15,
    fontWeight: '600',
  },
  monthTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.85,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 14,
    gap: 6,
  },
  totalLine: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '600',
  },
  miniHint: {
    color: '#64748b',
    fontSize: 12,
    marginTop: 4,
  },
  exportRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
    flexWrap: 'wrap',
  },
  exportBtn: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    flex: 1,
    minWidth: 120,
    alignItems: 'center',
  },
  exportBtnText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 15,
  },
  exportBtnSecondary: {
    borderWidth: 1,
    borderColor: '#475569',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
    justifyContent: 'center',
  },
  exportBtnSecondaryText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 15,
  },
  section: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 10,
  },
  empty: {
    color: '#64748b',
    fontSize: 14,
    marginBottom: 16,
  },
  tableCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
    overflow: 'hidden',
  },
  tableHead: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: '#0f172a',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  th: {
    color: '#94a3b8',
    fontSize: 13,
    fontWeight: '700',
  },
  td: {
    color: '#e2e8f0',
    fontSize: 15,
  },
  colName: { flex: 1 },
  colNum: { width: 56, textAlign: 'right' },
  listCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
    padding: 12,
    gap: 12,
    marginBottom: 8,
  },
  detailRow: {
    gap: 4,
  },
  detailMain: {
    color: '#f8fafc',
    fontSize: 15,
    fontWeight: '600',
  },
  detailTime: {
    color: '#64748b',
    fontSize: 12,
  },
});
