import { useRouter } from 'expo-router';
import { useMemo } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { LoadingScreen, Screen } from '../../src/components/ui';
import { colors, radius, spacing } from '../../src/constants/theme';
import { useApp } from '../../src/context/AppContext';
import { formatLessonDateTime, listUpcomingLessons } from '../../src/lib/schedule';

export default function ScheduleScreen() {
  const router = useRouter();
  const { ready, data, remaining, consumeFromSchedule, scheduleHorizonDays, isPro } = useApp();

  const rows = useMemo(
    () => listUpcomingLessons(data.students, { days: scheduleHorizonDays, limit: 150 }),
    [data.students, scheduleHorizonDays],
  );

  if (!ready) return <LoadingScreen />;

  return (
    <Screen>
      <Text style={styles.intro}>
        未来 {scheduleHorizonDays} 天内排课
        {!isPro ? ' · 升级 Pro 可看 90 天' : ''}
      </Text>
      <FlatList
        data={rows}
        keyExtractor={(item) => `${item.studentId}-${item.lesson.id}`}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>暂无近期排课</Text>
            <Text style={styles.emptySub}>在学员详情里添加排课后会显示在这里。</Text>
          </View>
        }
        renderItem={({ item }) => {
          const student = data.students.find((s) => s.id === item.studentId);
          const rem = student ? remaining(student) : 0;
          const onDone = () => {
            if (rem <= 0) {
              Alert.alert('无法消课', '该学员剩余课时为 0，请先续购。');
              return;
            }
            Alert.alert('上完这节课？', '将消 1 节并从排课中移除该条。', [
              { text: '取消', style: 'cancel' },
              { text: '确定', onPress: () => consumeFromSchedule(item.studentId, item.lesson.id) },
            ]);
          };
          return (
            <View style={styles.card}>
              <Pressable
                style={({ pressed }) => [styles.cardMain, pressed && styles.pressed]}
                onPress={() => router.push(`/student/${item.studentId}`)}>
                <View style={styles.cardTop}>
                  <Text style={styles.name}>{item.studentName}</Text>
                  <Text style={styles.time}>{formatLessonDateTime(item.lesson.scheduledAt)}</Text>
                </View>
                {item.lesson.title ? <Text style={styles.title}>{item.lesson.title}</Text> : null}
                {item.lesson.note ? (
                  <Text style={styles.note} numberOfLines={2}>
                    {item.lesson.note}
                  </Text>
                ) : null}
              </Pressable>
              <View style={styles.cardActions}>
                <Text style={styles.remHint}>剩余 {rem} 节</Text>
                <Pressable
                  style={({ pressed }) => [styles.doneBtn, pressed && styles.pressed, rem <= 0 && styles.doneDisabled]}
                  onPress={onDone}
                  disabled={rem <= 0}>
                  <Text style={styles.doneBtnText}>上完消 1 节</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  intro: {
    color: colors.inkMuted,
    fontSize: 14,
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: 4,
  },
  list: { padding: spacing.md, paddingBottom: 40 },
  empty: { paddingVertical: 48, alignItems: 'center' },
  emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptySub: { color: colors.inkDim, fontSize: 14, textAlign: 'center' },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    overflow: 'hidden',
  },
  cardMain: { padding: spacing.md },
  pressed: { opacity: 0.9 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', gap: 8, marginBottom: 6 },
  name: { color: colors.ink, fontSize: 17, fontWeight: '700', flex: 1 },
  time: { color: colors.brand, fontSize: 13, fontWeight: '600' },
  title: { color: colors.inkMuted, fontSize: 14 },
  note: { color: colors.inkDim, fontSize: 13, marginTop: 4 },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: colors.cardBorder,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    backgroundColor: colors.bgElevated,
  },
  remHint: { color: colors.inkDim, fontSize: 13 },
  doneBtn: {
    backgroundColor: colors.brand,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: radius.sm,
  },
  doneDisabled: { opacity: 0.45 },
  doneBtnText: { color: colors.brandOn, fontWeight: '700', fontSize: 13 },
});
