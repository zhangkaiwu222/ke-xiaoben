import { useState } from 'react';
import { Alert, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { router } from 'expo-router';

import { Button, Card, SectionTitle } from '../src/components/ui';
import { colors, spacing } from '../src/constants/theme';
import { useApp } from '../src/context/AppContext';

export default function TemplatesScreen() {
  const { isPro, data, setLessonTemplates } = useApp();
  const initial = data.settings?.lessonTemplates?.join('\n') ?? '体能训练\n拉伸放松\n考纲刷题';
  const [raw, setRaw] = useState(initial);

  if (!isPro) {
    return (
      <View style={styles.gate}>
        <Text style={styles.gateTitle}>课程主题模板为 Pro 功能</Text>
        <Text style={styles.gateSub}>在学员详情排课时，可一键填入常用主题。</Text>
        <Button label="了解 Pro" variant="pro" onPress={() => router.push('/pro')} />
      </View>
    );
  }

  const onSave = () => {
    const lines = raw.split(/\n/).map((l) => l.trim()).filter(Boolean);
    setLessonTemplates(lines);
    Alert.alert('已保存', `共 ${lines.length} 条模板。`);
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <SectionTitle>每行一条主题</SectionTitle>
      <Card>
        <TextInput
          style={styles.input}
          multiline
          value={raw}
          onChangeText={setRaw}
          placeholderTextColor={colors.inkDim}
          placeholder={'例如：\n1对1 口语\n错题讲解'}
        />
      </Card>
      <Button label="保存模板" onPress={onSave} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg },
  input: {
    minHeight: 160,
    color: colors.ink,
    fontSize: 16,
    textAlignVertical: 'top',
  },
  gate: {
    flex: 1,
    backgroundColor: colors.bg,
    padding: spacing.lg,
    justifyContent: 'center',
    gap: spacing.md,
  },
  gateTitle: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  gateSub: { color: colors.inkMuted, fontSize: 14 },
});
