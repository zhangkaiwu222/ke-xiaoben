import { Link, useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useApp } from '../../../src/context/AppContext';

export default function EditStudentScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const { ready, data, updateStudent } = useApp();
  const [name, setName] = useState('');
  const [purchasedStr, setPurchasedStr] = useState('0');
  const [consumedStr, setConsumedStr] = useState('0');
  const [note, setNote] = useState('');

  const student = useMemo(
    () => data.students.find((s) => s.id === id),
    [data.students, id]
  );

  useEffect(() => {
    if (!student) return;
    setName(student.name);
    setPurchasedStr(String(student.totalPurchased));
    setConsumedStr(String(student.consumed));
    setNote(student.note);
  }, [student]);

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

  const onSave = () => {
    const totalPurchased = Math.max(0, Math.floor(Number.parseInt(purchasedStr, 10) || 0));
    const consumed = Math.max(0, Math.floor(Number.parseInt(consumedStr, 10) || 0));
    updateStudent(student.id, {
      name,
      note,
      totalPurchased,
      consumed,
    });
    router.back();
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Text style={styles.label}>姓名</Text>
        <TextInput
          style={styles.input}
          placeholder="例如：张同学"
          placeholderTextColor="#64748b"
          value={name}
          onChangeText={setName}
        />

        <Text style={styles.label}>累计购买（节）</Text>
        <TextInput
          style={styles.input}
          placeholder="0"
          placeholderTextColor="#64748b"
          keyboardType="number-pad"
          value={purchasedStr}
          onChangeText={setPurchasedStr}
        />

        <Text style={styles.label}>已消课时（节）</Text>
        <TextInput
          style={styles.input}
          placeholder="0"
          placeholderTextColor="#64748b"
          keyboardType="number-pad"
          value={consumedStr}
          onChangeText={setConsumedStr}
        />

        <Text style={styles.hint}>
          调整数字会直接改变账面；日常操作建议在详情页用「消课 / 续购」以保留流水。
        </Text>

        <Text style={styles.label}>备注</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="联系方式、课程包说明等"
          placeholderTextColor="#64748b"
          value={note}
          onChangeText={setNote}
          multiline
        />

        <Pressable style={({ pressed }) => [styles.primary, pressed && styles.pressed]} onPress={onSave}>
          <Text style={styles.primaryText}>保存</Text>
        </Pressable>

        <Pressable style={styles.secondary} onPress={() => router.back()}>
          <Text style={styles.secondaryText}>取消</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  flex: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
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
  label: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 8,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 16,
    marginBottom: 12,
  },
  multiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  hint: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },
  primary: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 12,
  },
  pressed: {
    opacity: 0.9,
  },
  primaryText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  secondary: {
    marginTop: 16,
    alignItems: 'center',
    paddingVertical: 8,
  },
  secondaryText: {
    color: '#64748b',
    fontSize: 15,
  },
});
