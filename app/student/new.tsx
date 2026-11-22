import { useRouter } from 'expo-router';
import { useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { Button } from '../../src/components/ui';
import { colors, radius, spacing } from '../../src/constants/theme';
import { useApp } from '../../src/context/AppContext';

export default function NewStudentScreen() {
  const router = useRouter();
  const { addStudent } = useApp();
  const [name, setName] = useState('');
  const [subject, setSubject] = useState('');
  const [phone, setPhone] = useState('');
  const [purchasedStr, setPurchasedStr] = useState('0');
  const [note, setNote] = useState('');

  const onSave = () => {
    const initialPurchased = Number.parseInt(purchasedStr, 10);
    const n = Number.isFinite(initialPurchased) ? initialPurchased : 0;
    const result = addStudent({ name, subject, phone, initialPurchased: n, note });
    if (!result.ok) {
      if (result.reason === 'pro_required') {
        Alert.alert('需要 Pro', '免费版学员人数已满，升级后可继续添加。', [
          { text: '取消', style: 'cancel' },
          { text: '了解 Pro', onPress: () => router.push('/pro') },
        ]);
      }
      return;
    }
    router.replace(`/student/${result.student.id}`);
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
        <Field label="姓名">
          <TextInput
            style={styles.input}
            placeholder="例如：张同学"
            placeholderTextColor={colors.inkDim}
            value={name}
            onChangeText={setName}
          />
        </Field>
        <Field label="科目（选填）">
          <TextInput
            style={styles.input}
            placeholder="数学 / 体能 / 钢琴"
            placeholderTextColor={colors.inkDim}
            value={subject}
            onChangeText={setSubject}
          />
        </Field>
        <Field label="电话（选填）">
          <TextInput
            style={styles.input}
            placeholder="仅存本机"
            placeholderTextColor={colors.inkDim}
            keyboardType="phone-pad"
            value={phone}
            onChangeText={setPhone}
          />
        </Field>
        <Field label="初始课时（节）">
          <TextInput
            style={styles.input}
            placeholder="0"
            placeholderTextColor={colors.inkDim}
            keyboardType="number-pad"
            value={purchasedStr}
            onChangeText={setPurchasedStr}
          />
        </Field>
        <Field label="备注（选填）">
          <TextInput
            style={[styles.input, styles.multiline]}
            placeholder="课程包说明、上课地点等"
            placeholderTextColor={colors.inkDim}
            value={note}
            onChangeText={setNote}
            multiline
          />
        </Field>
        <Button label="保存" onPress={onSave} />
        <View style={{ height: 12 }} />
        <Button label="取消" variant="ghost" onPress={() => router.back()} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, paddingBottom: 40 },
  field: { marginBottom: spacing.md },
  label: { color: colors.inkMuted, fontSize: 14, marginBottom: 8 },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.ink,
    fontSize: 16,
  },
  multiline: { minHeight: 88, textAlignVertical: 'top' },
});
