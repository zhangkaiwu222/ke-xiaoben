import { Link } from 'expo-router';
import { ActivityIndicator, ScrollView, StyleSheet, Text, View } from 'react-native';

import { useApp } from '../src/context/AppContext';
import { countLowRemainingStudents, countUpcomingLessons } from '../src/lib/schedule';

export default function HomeScreen() {
  const { ready, data, remaining } = useApp();

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#38bdf8" />
        <Text style={styles.muted}>加载中…</Text>
      </View>
    );
  }

  const totalRemaining = data.students.reduce((acc, s) => acc + remaining(s), 0);
  const totalConsumed = data.students.reduce((acc, s) => acc + s.consumed, 0);
  const next7 = countUpcomingLessons(data, 7);
  const lowCount = countLowRemainingStudents(data.students, remaining, 3);

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.headline}>课消本</Text>
      <Text style={styles.sub}>私教 / 家教 — 排课与消课</Text>

      <View style={styles.card}>
        <Row label="学员人数" value={`${data.students.length} 人`} />
        <Row label="剩余课时（合计）" value={`${totalRemaining} 节`} />
        <Row label="已消课时（合计）" value={`${totalConsumed} 节`} />
        <Row label="7 天内待上课" value={`${next7} 次`} />
        {lowCount > 0 ? (
          <Row label="剩余 ≤3 节的学员" value={`${lowCount} 人`} />
        ) : null}
      </View>

      <Link href="/students" style={styles.primaryBtn}>
        <Text style={styles.primaryBtnText}>进入学员列表</Text>
      </Link>

      <Link href="/schedule" style={styles.secondaryBtn}>
        <Text style={styles.secondaryBtnText}>查看近日排课</Text>
      </Link>

      <Link href="/backup" style={styles.tertiaryBtn}>
        <Text style={styles.tertiaryBtnText}>备份与恢复</Text>
      </Link>

      <Link href="/stats" style={styles.tertiaryBtn}>
        <Text style={styles.tertiaryBtnText}>月度统计 · CSV</Text>
      </Link>

      <Link href="/reminders" style={styles.tertiaryBtn}>
        <Text style={styles.tertiaryBtnText}>课前提醒（通知）</Text>
      </Link>

      <Text style={styles.hint}>数据保存在本机，可用于小生意与个人私教记录。</Text>
    </ScrollView>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
    gap: 12,
  },
  muted: {
    color: '#94a3b8',
    fontSize: 14,
  },
  headline: {
    fontSize: 28,
    fontWeight: '700',
    color: '#f8fafc',
    marginBottom: 6,
  },
  sub: {
    fontSize: 15,
    color: '#94a3b8',
    marginBottom: 20,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  rowLabel: {
    color: '#94a3b8',
    fontSize: 15,
  },
  rowValue: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
  },
  primaryBtn: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  primaryBtnText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  secondaryBtn: {
    backgroundColor: '#334155',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 16,
  },
  secondaryBtnText: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '700',
  },
  tertiaryBtn: {
    paddingVertical: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  tertiaryBtnText: {
    color: '#64748b',
    fontSize: 15,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  hint: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 20,
  },
});
