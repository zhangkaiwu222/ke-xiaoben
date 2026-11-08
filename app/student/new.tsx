import { Link, useRouter } from 'expo-router';
import { useState } from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  Pressable,
} from 'react-native';

import { useApp } from '../../src/context/AppContext';

export default function NewStudentScreen() {
  const router = useRouter();
  const { addStudent } = useApp();
  const [name, setName] = useState('');
  const [purchasedStr, setPurchasedStr] = useState('0');
  const [note, setNote] = useState('');

  const onSave = () => {
    const initialPurchased = Number.parseInt(purchasedStr, 10);
    const n = Number.isFinite(initialPurchased) ? initialPurchased : 0;
    const student = addStudent({
      name,
      initialPurchased: n,
      note,
    });
    router.replace(`/student/${student.id}`);
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

        <Text style={styles.label}>初始课时（节）</Text>
        <TextInput
          style={styles.input}
          placeholder="0"
          placeholderTextColor="#64748b"
          keyboardType="number-pad"
          value={purchasedStr}
          onChangeText={setPurchasedStr}
        />

        <Text style={styles.label}>备注（选填）</Text>
        <TextInput
          style={[styles.input, styles.multiline]}
          placeholder="联系方式、课程包说明等"
          placeholderTextColor="#64748b"
          value={note}
          onChangeText={setNote}
          multiline
        />

        <Pressable style={({ pressed }) => [styles.primary, pressed && styles.primaryPressed]} onPress={onSave}>
          <Text style={styles.primaryText}>保存</Text>
        </Pressable>

        <Link href="/students" style={styles.secondary}>
          <Text style={styles.secondaryText}>取消，返回列表</Text>
        </Link>
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
    marginBottom: 16,
  },
  multiline: {
    minHeight: 88,
    textAlignVertical: 'top',
  },
  primary: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  primaryPressed: {
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
  },
  secondaryText: {
    color: '#64748b',
    fontSize: 15,
  },
});
