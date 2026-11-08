import { Link, useRouter } from 'expo-router';
import { useMemo } from 'react';
import { ActivityIndicator, Alert, FlatList, Pressable, StyleSheet, Text, View } from 'react-native';

import { useApp } from '../src/context/AppContext';
import { formatLessonDateTime, listUpcomingLessons } from '../src/lib/schedule';

export default function ScheduleScreen() {
  const router = useRouter();
  const { ready, data, remaining, consumeFromSchedule } = useApp();

  const rows = useMemo(
    () => listUpcomingLessons(data.students, { days: 30, limit: 150 }),
    [data.students]
  );

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <Text style={styles.intro}>未来 30 天内计划上课（按时间排序）</Text>
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
            Alert.alert(
              '上完这节课？',
              '将消 1 节并从排课中移除该条。',
              [
                { text: '取消', style: 'cancel' },
                {
                  text: '确定',
                  onPress: () => consumeFromSchedule(item.studentId, item.lesson.id),
                },
              ],
              { cancelable: true }
            );
          };
          return (
            <View style={styles.card}>
              <Pressable
                style={({ pressed }) => [styles.cardMain, pressed && styles.cardPressed]}
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
                  style={({ pressed }) => [styles.doneBtn, pressed && styles.cardPressed]}
                  onPress={onDone}
                  disabled={rem <= 0}>
                  <Text style={[styles.doneBtnText, rem <= 0 && styles.doneBtnTextDisabled]}>上完·消1节</Text>
                </Pressable>
              </View>
            </View>
          );
        }}
      />
      <Link href="/students" style={styles.footerLink}>
        <Text style={styles.footerLinkText}>← 学员列表</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
  },
  intro: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 8,
    color: '#94a3b8',
    fontSize: 14,
  },
  list: {
    padding: 16,
    paddingBottom: 56,
  },
  empty: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySub: {
    color: '#64748b',
    fontSize: 14,
    textAlign: 'center',
    paddingHorizontal: 24,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
    overflow: 'hidden',
  },
  cardMain: {
    padding: 16,
    paddingBottom: 10,
  },
  cardPressed: {
    opacity: 0.88,
  },
  cardActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingBottom: 14,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: '#334155',
  },
  remHint: {
    color: '#64748b',
    fontSize: 13,
  },
  doneBtn: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  doneBtnText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 14,
  },
  doneBtnTextDisabled: {
    color: '#64748b',
    opacity: 0.6,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
    marginBottom: 6,
  },
  name: {
    color: '#f8fafc',
    fontSize: 17,
    fontWeight: '700',
    flex: 1,
  },
  time: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '600',
    maxWidth: '48%',
    textAlign: 'right',
  },
  title: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  note: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 4,
    lineHeight: 18,
  },
  footerLink: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    paddingVertical: 8,
  },
  footerLinkText: {
    color: '#64748b',
    fontSize: 15,
  },
});
