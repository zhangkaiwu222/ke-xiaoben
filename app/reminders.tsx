import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  View,
} from 'react-native';
import * as Notifications from 'expo-notifications';

import { useApp } from '../src/context/AppContext';
import { requestLessonReminderPermissions } from '../src/lib/lessonReminders';

export default function RemindersScreen() {
  const { ready, data, setLessonReminderEnabled, setLessonReminderAdvanceMinutes } = useApp();
  const settings = data.settings?.lessonReminder ?? { enabled: false, advanceMinutes: 30 };
  const [advanceStr, setAdvanceStr] = useState(String(settings.advanceMinutes));
  const [perm, setPerm] = useState<'unknown' | Notifications.PermissionStatus>('unknown');

  const refreshPerm = useCallback(async () => {
    if (Platform.OS === 'web') return;
    const { status } = await Notifications.getPermissionsAsync();
    setPerm(status);
  }, []);

  useEffect(() => {
    void refreshPerm();
  }, [refreshPerm]);

  useEffect(() => {
    setAdvanceStr(String(settings.advanceMinutes));
  }, [settings.advanceMinutes]);

  const onToggle = async (value: boolean) => {
    if (Platform.OS === 'web') {
      Alert.alert('不支持', 'Web 端无法使用本地通知，请用 iOS / Android 客户端。');
      return;
    }
    if (value) {
      const ok = await requestLessonReminderPermissions();
      await refreshPerm();
      if (!ok) {
        Alert.alert('需要通知权限', '请在系统设置中允许「课消本」发送通知，然后再开启提醒。');
        return;
      }
    }
    setLessonReminderEnabled(value);
  };

  const applyAdvance = () => {
    const n = Math.floor(Number.parseInt(advanceStr, 10) || 0);
    setLessonReminderAdvanceMinutes(n);
    setAdvanceStr(String(Math.max(0, Math.min(24 * 60, n))));
  };

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  const permLabel =
    Platform.OS === 'web'
      ? 'Web 不可用'
      : perm === 'granted'
        ? '已授权'
        : perm === 'denied'
          ? '已拒绝（请到系统设置开启）'
          : perm === 'undetermined'
            ? '尚未询问'
            : '';

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.card}>
        根据排课计划在上课前提醒你。使用系统本地通知，不会联网。最多登记未来 62 天内、至多 60 条排课提醒。
      </Text>

      <View style={styles.row}>
        <Text style={styles.label}>开启课前提醒</Text>
        <Switch
          value={settings.enabled}
          onValueChange={(v) => void onToggle(v)}
          trackColor={{ false: '#334155', true: '#0369a1' }}
          thumbColor={settings.enabled ? '#38bdf8' : '#94a3b8'}
        />
      </View>

      <Text style={styles.meta}>通知权限：{permLabel}</Text>

      <Text style={styles.subLabel}>提前多少分钟提醒</Text>
      <TextInput
        style={styles.input}
        value={advanceStr}
        onChangeText={setAdvanceStr}
        keyboardType="number-pad"
        placeholder="30"
        placeholderTextColor="#64748b"
        onBlur={applyAdvance}
      />
      <Text style={styles.hint}>填 0 表示在计划上课时间到时提醒。范围 0～1440（24 小时）。</Text>

      <Pressable style={({ pressed }) => [styles.btn, pressed && styles.pressed]} onPress={applyAdvance}>
        <Text style={styles.btnText}>保存提前时间</Text>
      </Pressable>

      {Platform.OS !== 'web' ? (
        <Pressable
          style={({ pressed }) => [styles.btnSecondary, pressed && styles.pressed]}
          onPress={async () => {
            await requestLessonReminderPermissions();
            await refreshPerm();
          }}>
          <Text style={styles.btnSecondaryText}>再次请求通知权限</Text>
        </Pressable>
      ) : null}
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
  card: {
    color: '#94a3b8',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 20,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    backgroundColor: '#1e293b',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  label: {
    color: '#f8fafc',
    fontSize: 16,
    fontWeight: '600',
    flex: 1,
  },
  meta: {
    color: '#64748b',
    fontSize: 13,
    marginBottom: 20,
  },
  subLabel: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 16,
    marginBottom: 8,
  },
  hint: {
    color: '#64748b',
    fontSize: 12,
    lineHeight: 18,
    marginBottom: 16,
  },
  btn: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 12,
  },
  btnText: {
    color: '#0f172a',
    fontWeight: '700',
    fontSize: 16,
  },
  btnSecondary: {
    borderWidth: 1,
    borderColor: '#475569',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
  },
  btnSecondaryText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 15,
  },
  pressed: {
    opacity: 0.88,
  },
});
