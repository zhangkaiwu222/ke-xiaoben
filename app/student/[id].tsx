import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useApp } from '../../src/context/AppContext';

function formatCnDateTime(iso: string): string {
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

function todayYYYYMMDD(): string {
  const n = new Date();
  const y = n.getFullYear();
  const mo = String(n.getMonth() + 1).padStart(2, '0');
  const da = String(n.getDate()).padStart(2, '0');
  return `${y}-${mo}-${da}`;
}

/** 解析本地日期 YYYY-MM-DD 与时间 HH:mm，无效返回 null */
function parseLocalDateTime(dateStr: string, timeStr: string): Date | null {
  const d = dateStr.trim();
  const t = (timeStr.trim() || '09:00').replace('：', ':');
  const dm = /^(\d{4})-(\d{2})-(\d{2})$/.exec(d);
  const tm = /^(\d{1,2}):(\d{2})$/.exec(t);
  if (!dm) return null;
  const hh = tm ? Number.parseInt(tm[1], 10) : 9;
  const mm = tm ? Number.parseInt(tm[2], 10) : 0;
  if (!Number.isFinite(hh) || !Number.isFinite(mm) || hh < 0 || hh > 23 || mm < 0 || mm > 59) {
    return null;
  }
  const year = Number.parseInt(dm[1], 10);
  const month = Number.parseInt(dm[2], 10) - 1;
  const day = Number.parseInt(dm[3], 10);
  return new Date(year, month, day, hh, mm, 0, 0);
}

export default function StudentDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const {
    ready,
    data,
    remaining,
    consume,
    addPurchased,
    deleteStudent,
    addScheduledLesson,
    removeScheduledLesson,
    consumeFromSchedule,
  } = useApp();
  const [addStr, setAddStr] = useState('10');
  const [consumeStr, setConsumeStr] = useState('1');
  const [scheduleDateStr, setScheduleDateStr] = useState(todayYYYYMMDD);
  const [scheduleTimeStr, setScheduleTimeStr] = useState('18:00');
  const [scheduleTitle, setScheduleTitle] = useState('');
  const [scheduleNote, setScheduleNote] = useState('');

  const student = useMemo(
    () => data.students.find((s) => s.id === id),
    [data.students, id]
  );

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  if (!student) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorTitle}>未找到该学员</Text>
        <Link href="/students" style={styles.link}>
          <Text style={styles.linkText}>返回学员列表</Text>
        </Link>
      </View>
    );
  }

  const rem = remaining(student);

  const onConsume = () => {
    const n = Math.max(1, Math.floor(Number.parseInt(consumeStr, 10) || 1));
    consume(student.id, n);
  };

  const onConsumeOne = () => {
    consume(student.id, 1);
  };

  const onAddPurchased = () => {
    const n = Math.max(1, Math.floor(Number.parseInt(addStr, 10) || 1));
    addPurchased(student.id, n);
  };

  const onAddSchedule = () => {
    const at = parseLocalDateTime(scheduleDateStr, scheduleTimeStr);
    if (!at) {
      Alert.alert('无法排课', '请检查日期（YYYY-MM-DD）与时间（如 18:00）格式。');
      return;
    }
    addScheduledLesson(student.id, {
      scheduledAt: at,
      title: scheduleTitle,
      note: scheduleNote,
    });
    setScheduleTitle('');
    setScheduleNote('');
  };

  const onRemoveSchedule = (entryId: string) => {
    Alert.alert(
      '取消排课',
      '确定从列表中移除该条排课？',
      [
        { text: '返回', style: 'cancel' },
        {
          text: '移除',
          style: 'destructive',
          onPress: () => removeScheduledLesson(student.id, entryId),
        },
      ],
      { cancelable: true }
    );
  };

  const onScheduleDone = (entryId: string) => {
    if (rem <= 0) {
      Alert.alert('无法消课', '当前无可消课时，请先续购。');
      return;
    }
    Alert.alert(
      '上完这节课？',
      '将消 1 节并从排课中移除该条。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '确定',
          onPress: () => consumeFromSchedule(student.id, entryId),
        },
      ],
      { cancelable: true }
    );
  };

  const onDelete = () => {
    Alert.alert(
      '删除学员',
      `确定删除「${student.name}」？此操作不可恢复。`,
      [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: () => {
            deleteStudent(student.id);
            router.replace('/students');
          },
        },
      ],
      { cancelable: true }
    );
  };

  const recentLedger = student.ledger.slice(0, 30);

  const scheduleList = [...(Array.isArray(student.schedule) ? student.schedule : [])].sort(
    (a, b) => new Date(a.scheduledAt).getTime() - new Date(b.scheduledAt).getTime()
  );
  const nowMs = Date.now();

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>{student.name}</Text>
        <Pressable
          style={({ pressed }) => [styles.editBtn, pressed && styles.btnPressed]}
          onPress={() => router.push(`/student/edit/${student.id}`)}>
          <Text style={styles.editBtnText}>编辑</Text>
        </Pressable>
      </View>
      {student.note ? <Text style={styles.note}>{student.note}</Text> : null}

      <View style={styles.card}>
        <Row label="剩余课时" value={`${rem} 节`} emphasize />
        <Row label="累计购买" value={`${student.totalPurchased} 节`} />
        <Row label="已消课时" value={`${student.consumed} 节`} />
      </View>

      <Text style={styles.section}>排课</Text>
      <Text style={styles.scheduleHint}>记下计划上课时间；到课后在下方「消课」扣节数。</Text>
      <Text style={styles.subLabel}>日期</Text>
      <TextInput
        style={styles.input}
        placeholder="YYYY-MM-DD"
        placeholderTextColor="#64748b"
        value={scheduleDateStr}
        onChangeText={setScheduleDateStr}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Text style={styles.subLabel}>时间</Text>
      <TextInput
        style={styles.input}
        placeholder="如 18:00"
        placeholderTextColor="#64748b"
        value={scheduleTimeStr}
        onChangeText={setScheduleTimeStr}
        autoCapitalize="none"
        autoCorrect={false}
      />
      <Text style={styles.subLabel}>主题（选填）</Text>
      <TextInput
        style={styles.input}
        placeholder="如：力量训练 / 数学冲刺"
        placeholderTextColor="#64748b"
        value={scheduleTitle}
        onChangeText={setScheduleTitle}
      />
      <Text style={styles.subLabel}>备注（选填）</Text>
      <TextInput
        style={[styles.input, styles.multilineInput]}
        placeholder="地点、器材等"
        placeholderTextColor="#64748b"
        value={scheduleNote}
        onChangeText={setScheduleNote}
        multiline
      />
      <Pressable
        style={({ pressed }) => [styles.secondaryBtn, pressed && styles.btnPressed]}
        onPress={onAddSchedule}>
        <Text style={styles.secondaryBtnText}>添加排课</Text>
      </Pressable>

      {scheduleList.length === 0 ? (
        <Text style={styles.emptySchedule}>暂无排课；添加后按时间从早到晚显示。</Text>
      ) : (
        <View style={styles.scheduleCard}>
          {scheduleList.map((e) => {
            const t = new Date(e.scheduledAt).getTime();
            const isPast = t < nowMs;
            return (
              <View key={e.id} style={styles.scheduleRow}>
                <View style={styles.scheduleRowMain}>
                  <Text style={[styles.scheduleWhen, isPast && styles.scheduleWhenPast]}>
                    {formatCnDateTime(e.scheduledAt)}
                    {isPast ? ' · 已过期' : ''}
                  </Text>
                  {e.title ? <Text style={styles.scheduleTitle}>{e.title}</Text> : null}
                  {e.note ? (
                    <Text style={styles.scheduleNote} numberOfLines={2}>
                      {e.note}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.scheduleRowActions}>
                  <Pressable
                    style={({ pressed }) => [styles.scheduleDoneBtn, pressed && styles.btnPressed]}
                    onPress={() => onScheduleDone(e.id)}
                    disabled={rem <= 0}>
                    <Text style={[styles.scheduleDoneBtnText, rem <= 0 && styles.scheduleDoneBtnTextDisabled]}>
                      上完·消1节
                    </Text>
                  </Pressable>
                  <Pressable
                    style={({ pressed }) => [styles.scheduleRemove, pressed && styles.btnPressed]}
                    onPress={() => onRemoveSchedule(e.id)}
                    hitSlop={8}>
                    <Text style={styles.scheduleRemoveText}>移除</Text>
                  </Pressable>
                </View>
              </View>
            );
          })}
        </View>
      )}

      <Text style={styles.section}>消课</Text>
      <View style={styles.rowInputs}>
        <TextInput
          style={styles.smallInput}
          keyboardType="number-pad"
          value={consumeStr}
          onChangeText={setConsumeStr}
        />
        <Text style={styles.unit}>节</Text>
        <Pressable
          style={({ pressed }) => [styles.dangerBtn, pressed && styles.btnPressed]}
          onPress={onConsume}
          disabled={rem <= 0}>
          <Text style={styles.dangerBtnText}>确认消课</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.dangerOutlineBtn, pressed && styles.btnPressed]}
          onPress={onConsumeOne}
          disabled={rem <= 0}>
          <Text style={styles.dangerOutlineBtnText}>消 1 节</Text>
        </Pressable>
      </View>
      {rem <= 0 ? <Text style={styles.warn}>当前无可消课时，请先续购。</Text> : null}

      <Text style={styles.section}>续购课时</Text>
      <View style={styles.rowInputs}>
        <TextInput
          style={styles.smallInput}
          keyboardType="number-pad"
          value={addStr}
          onChangeText={setAddStr}
        />
        <Text style={styles.unit}>节</Text>
        <Pressable
          style={({ pressed }) => [styles.primaryBtn, pressed && styles.btnPressed]}
          onPress={onAddPurchased}>
          <Text style={styles.primaryBtnText}>入账</Text>
        </Pressable>
      </View>

      <Text style={styles.section}>最近记录</Text>
      {recentLedger.length === 0 ? (
        <Text style={styles.emptyLedger}>暂无流水；上方消课或续购后会显示在此。</Text>
      ) : (
        <View style={styles.ledgerCard}>
          {recentLedger.map((e) => (
            <View key={e.id} style={styles.ledgerRow}>
              <Text style={styles.ledgerKind}>
                {e.kind === 'consume' ? '消课' : '续购'} · {e.count} 节
              </Text>
              <Text style={styles.ledgerTime}>{formatCnDateTime(e.at)}</Text>
            </View>
          ))}
        </View>
      )}

      <Pressable style={styles.deleteBtn} onPress={onDelete}>
        <Text style={styles.deleteBtnText}>删除学员</Text>
      </Pressable>

      <Pressable style={styles.back} onPress={() => router.back()}>
        <Text style={styles.backText}>← 返回</Text>
      </Pressable>
    </ScrollView>
  );
}

function Row({ label, value, emphasize }: { label: string; value: string; emphasize?: boolean }) {
  return (
    <View style={styles.statRow}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={[styles.statValue, emphasize && styles.statValueEm]}>{value}</Text>
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
    padding: 24,
  },
  errorTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  link: {
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  linkText: {
    color: '#38bdf8',
    fontSize: 16,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    marginBottom: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#f8fafc',
    flex: 1,
  },
  editBtn: {
    backgroundColor: '#334155',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  editBtnText: {
    color: '#e2e8f0',
    fontWeight: '600',
    fontSize: 14,
  },
  note: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: '#334155',
    gap: 12,
    marginBottom: 20,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 15,
  },
  statValue: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
  },
  statValueEm: {
    color: '#38bdf8',
    fontSize: 18,
  },
  scheduleHint: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },
  subLabel: {
    color: '#94a3b8',
    fontSize: 13,
    marginBottom: 6,
  },
  input: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 16,
    marginBottom: 12,
  },
  multilineInput: {
    minHeight: 72,
    textAlignVertical: 'top',
  },
  secondaryBtn: {
    backgroundColor: '#334155',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    alignItems: 'center',
    marginBottom: 16,
  },
  secondaryBtnText: {
    color: '#e2e8f0',
    fontWeight: '700',
    fontSize: 15,
  },
  emptySchedule: {
    color: '#64748b',
    fontSize: 14,
    marginBottom: 20,
    lineHeight: 20,
  },
  scheduleCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
    gap: 12,
  },
  scheduleRow: {
    gap: 8,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#334155',
  },
  scheduleRowMain: {
    flex: 1,
    gap: 4,
  },
  scheduleRowActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 12,
  },
  scheduleDoneBtn: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  scheduleDoneBtnText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 13,
  },
  scheduleDoneBtnTextDisabled: {
    color: '#64748b',
    opacity: 0.65,
  },
  scheduleWhen: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '600',
  },
  scheduleWhenPast: {
    color: '#64748b',
  },
  scheduleTitle: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
  },
  scheduleNote: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 18,
  },
  scheduleRemove: {
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  scheduleRemoveText: {
    color: '#f87171',
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 10,
    marginTop: 4,
  },
  rowInputs: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    flexWrap: 'wrap',
  },
  smallInput: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    color: '#f8fafc',
    fontSize: 16,
    minWidth: 72,
    maxWidth: 100,
  },
  unit: {
    color: '#94a3b8',
    fontSize: 15,
  },
  primaryBtn: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  dangerBtn: {
    backgroundColor: '#dc2626',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
  },
  dangerOutlineBtn: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#b91c1c',
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  dangerOutlineBtnText: {
    color: '#fca5a5',
    fontWeight: '700',
    fontSize: 14,
  },
  btnPressed: {
    opacity: 0.88,
  },
  primaryBtnText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 15,
  },
  dangerBtnText: {
    color: '#fef2f2',
    fontWeight: '700',
    fontSize: 15,
  },
  warn: {
    color: '#fbbf24',
    fontSize: 13,
    marginTop: -8,
    marginBottom: 8,
  },
  emptyLedger: {
    color: '#64748b',
    fontSize: 14,
    marginBottom: 16,
    lineHeight: 20,
  },
  ledgerCard: {
    backgroundColor: '#1e293b',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#334155',
    marginBottom: 20,
    gap: 10,
  },
  ledgerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 12,
  },
  ledgerKind: {
    color: '#e2e8f0',
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  ledgerTime: {
    color: '#64748b',
    fontSize: 12,
  },
  deleteBtn: {
    marginTop: 8,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#7f1d1d',
  },
  deleteBtnText: {
    color: '#f87171',
    fontWeight: '600',
    fontSize: 15,
  },
  back: {
    marginTop: 16,
    alignSelf: 'flex-start',
    paddingVertical: 8,
  },
  backText: {
    color: '#64748b',
    fontSize: 15,
  },
});
