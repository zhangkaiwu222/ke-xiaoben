import { Link, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button, Card, LoadingScreen, MenuTile, SectionTitle, StatTile } from '../../src/components/ui';
import { colors, radius, spacing } from '../../src/constants/theme';
import { FREE_STUDENT_LIMIT } from '../../src/constants/entitlements';
import { useApp } from '../../src/context/AppContext';
import {
  countLowRemainingStudents,
  countUpcomingLessons,
  formatLessonDateTime,
  listTodaysLessons,
} from '../../src/lib/schedule';

export default function HomeScreen() {
  const router = useRouter();
  const { ready, data, remaining, isPro, canCreateStudent } = useApp();

  const todayRows = useMemo(() => listTodaysLessons(data.students), [data.students]);

  if (!ready) {
    return <LoadingScreen />;
  }

  const totalRemaining = data.students.reduce((acc, s) => acc + remaining(s), 0);
  const totalConsumed = data.students.reduce((acc, s) => acc + s.consumed, 0);
  const next7 = countUpcomingLessons(data, 7);
  const lowCount = countLowRemainingStudents(data.students, remaining, 3);

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>课消本</Text>
        <Text style={styles.heroSub}>排课 · 消课 · 提醒，一站搞定</Text>
        {isPro ? (
          <View style={styles.proPill}>
            <Text style={styles.proPillText}>Pro 已开通</Text>
          </View>
        ) : (
          <Link href="/pro" asChild>
            <Pressable style={styles.upgradePill}>
              <Text style={styles.upgradeText}>升级 Pro →</Text>
            </Pressable>
          </Link>
        )}
      </View>

      <View style={styles.statsGrid}>
        <StatTile label="学员" value={`${data.students.length}`} hint={!isPro ? `免费最多 ${FREE_STUDENT_LIMIT} 人` : undefined} accent />
        <StatTile label="剩余课时" value={`${totalRemaining}`} hint="节（合计）" />
        <StatTile label="已消课时" value={`${totalConsumed}`} hint="节（合计）" />
        <StatTile label="7 日内上课" value={`${next7}`} hint="次" accent />
      </View>

      {lowCount > 0 ? (
        <Card style={styles.warnCard}>
          <Text style={styles.warnTitle}>⚠️ {lowCount} 位学员剩余 ≤3 节</Text>
          <Text style={styles.warnSub}>记得跟进续费，避免课上中断。</Text>
          <Button label="查看学员" variant="secondary" onPress={() => router.push('/(tabs)/students')} />
        </Card>
      ) : null}

      <SectionTitle>今日排课</SectionTitle>
      {todayRows.length === 0 ? (
        <Card>
          <Text style={styles.emptyTitle}>今天暂无排课</Text>
          <Text style={styles.emptySub}>在学员详情里添加上课时间后会显示在这里。</Text>
        </Card>
      ) : (
        todayRows.slice(0, 5).map((row) => (
          <Pressable
            key={`${row.studentId}-${row.lesson.id}`}
            style={({ pressed }) => [styles.todayRow, pressed && { opacity: 0.9 }]}
            onPress={() => router.push(`/student/${row.studentId}`)}>
            <View>
              <Text style={styles.todayName}>{row.studentName}</Text>
              <Text style={styles.todayTime}>{formatLessonDateTime(row.lesson.scheduledAt)}</Text>
            </View>
            {row.lesson.title ? <Text style={styles.todayTopic}>{row.lesson.title}</Text> : null}
          </Pressable>
        ))
      )}

      <View style={styles.gap} />
      <SectionTitle>快捷入口</SectionTitle>
      <MenuTile href="/(tabs)/students" emoji="👥" title="学员管理" subtitle="消课、续购、排课" />
      <MenuTile href="/(tabs)/schedule" emoji="📅" title="排课总览" subtitle={isPro ? '未来 90 天' : '未来 14 天（Pro 可看 90 天）'} />
      <MenuTile href="/stats" emoji="📊" title="月度统计" subtitle="流水与汇总" pro />
      <MenuTile href="/reminders" emoji="🔔" title="课前提醒" subtitle="本地通知，不依赖网络" />

      {!canCreateStudent ? (
        <Card style={styles.limitCard}>
          <Text style={styles.limitTitle}>学员已满（免费版 {FREE_STUDENT_LIMIT} 人）</Text>
          <Button label="解锁无限学员" variant="pro" onPress={() => router.push('/pro')} />
        </Card>
      ) : (
        <Button label="+ 添加学员" onPress={() => router.push('/student/new')} />
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, paddingBottom: 48 },
  hero: { marginBottom: spacing.lg },
  heroTitle: {
    fontSize: 32,
    fontWeight: '800',
    color: colors.ink,
    letterSpacing: 1,
  },
  heroSub: {
    color: colors.inkMuted,
    fontSize: 15,
    marginTop: 6,
    marginBottom: spacing.md,
  },
  proPill: {
    alignSelf: 'flex-start',
    backgroundColor: '#2a2318',
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.pro,
  },
  proPillText: { color: colors.pro, fontWeight: '700', fontSize: 13 },
  upgradePill: {
    alignSelf: 'flex-start',
    backgroundColor: colors.bgElevated,
    borderRadius: radius.sm,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderWidth: 1,
    borderColor: colors.brandDim,
  },
  upgradeText: { color: colors.brand, fontWeight: '700', fontSize: 13 },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  warnCard: { marginBottom: spacing.lg, gap: spacing.sm },
  warnTitle: { color: colors.warning, fontWeight: '700', fontSize: 15 },
  warnSub: { color: colors.inkMuted, fontSize: 13 },
  emptyTitle: { color: colors.ink, fontWeight: '600', marginBottom: 4 },
  emptySub: { color: colors.inkDim, fontSize: 13 },
  todayRow: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    padding: spacing.md,
    marginBottom: spacing.sm,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  todayName: { color: colors.ink, fontSize: 16, fontWeight: '700' },
  todayTime: { color: colors.brand, fontSize: 13, marginTop: 2 },
  todayTopic: { color: colors.inkDim, fontSize: 13, maxWidth: 100 },
  gap: { height: spacing.md },
  limitCard: { marginTop: spacing.md, gap: spacing.sm },
  limitTitle: { color: colors.ink, fontWeight: '600' },
});
