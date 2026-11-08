import * as Clipboard from 'expo-clipboard';
import { useState } from 'react';
import {
  Alert,
  Platform,
  Pressable,
  ScrollView,
  Share,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useApp } from '../src/context/AppContext';

export default function BackupScreen() {
  const { exportBackup, importBackup } = useApp();
  const [pasteText, setPasteText] = useState('');

  const onExport = () => {
    const json = exportBackup();
    void Share.share({
      message: json,
      title: '课消本备份',
    }).catch(() => {
      void Clipboard.setStringAsync(json);
      Alert.alert('已复制', '分享不可用，备份 JSON 已复制到剪贴板。');
    });
  };

  const onCopy = async () => {
    const json = exportBackup();
    await Clipboard.setStringAsync(json);
    Alert.alert('已复制', '备份内容已复制到剪贴板，可粘贴到备忘录或文件 App。');
  };

  const onPaste = async () => {
    const t = await Clipboard.getStringAsync();
    if (t) setPasteText(t);
  };

  const onImport = () => {
    const raw = pasteText.trim();
    if (!raw) {
      Alert.alert('无法导入', '请粘贴备份 JSON 后再试。');
      return;
    }
    Alert.alert(
      '覆盖本地数据？',
      '导入将用备份文件替换当前所有学员与记录，且无法撤销。',
      [
        { text: '取消', style: 'cancel' },
        {
          text: '导入',
          style: 'destructive',
          onPress: () => {
            const r = importBackup(raw);
            if (!r.ok) {
              Alert.alert('导入失败', '文件格式不对或已损坏，请检查是否为课消本导出的 JSON。');
              return;
            }
            Alert.alert('导入成功', '数据已恢复。');
            setPasteText('');
          },
        },
      ]
    );
  };

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.section}>导出</Text>
      <Text style={styles.hint}>
        将当前数据导出为 JSON。可用系统分享发到微信文件助手、邮件，或保存到「文件」。
      </Text>
      <Pressable style={({ pressed }) => [styles.btnPrimary, pressed && styles.pressed]} onPress={onExport}>
        <Text style={styles.btnPrimaryText}>分享备份</Text>
      </Pressable>
      <Pressable style={({ pressed }) => [styles.btnSecondary, pressed && styles.pressed]} onPress={() => void onCopy()}>
        <Text style={styles.btnSecondaryText}>复制到剪贴板</Text>
      </Pressable>

      <Text style={[styles.section, styles.sectionTop]}>从备份恢复</Text>
      <Text style={styles.hint}>粘贴此前导出的 JSON 全文（含大括号），然后点导入。</Text>
      <TextInput
        style={styles.textarea}
        value={pasteText}
        onChangeText={setPasteText}
        placeholder='{"format":"kexiaoben-backup", ...}'
        placeholderTextColor="#475569"
        multiline
        autoCapitalize="none"
        autoCorrect={false}
        textAlignVertical="top"
      />
      <View style={styles.row}>
        <Pressable style={({ pressed }) => [styles.btnGhost, pressed && styles.pressed]} onPress={() => void onPaste()}>
          <Text style={styles.btnGhostText}>从剪贴板粘贴</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.btnDanger, pressed && styles.pressed]}
          onPress={onImport}>
          <Text style={styles.btnDangerText}>导入并覆盖</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    paddingBottom: 40,
  },
  section: {
    color: '#94a3b8',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  sectionTop: {
    marginTop: 28,
  },
  hint: {
    color: '#64748b',
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 14,
  },
  btnPrimary: {
    backgroundColor: '#0ea5e9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 10,
  },
  btnPrimaryText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
  btnSecondary: {
    backgroundColor: '#334155',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 8,
  },
  btnSecondaryText: {
    color: '#e2e8f0',
    fontSize: 16,
    fontWeight: '700',
  },
  pressed: {
    opacity: 0.88,
  },
  textarea: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    padding: 14,
    color: '#f8fafc',
    fontSize: 13,
    minHeight: 160,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: undefined }),
  },
  row: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 14,
    flexWrap: 'wrap',
  },
  btnGhost: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#475569',
  },
  btnGhostText: {
    color: '#94a3b8',
    fontWeight: '600',
    fontSize: 15,
  },
  btnDanger: {
    backgroundColor: '#b91c1c',
    paddingVertical: 12,
    paddingHorizontal: 18,
    borderRadius: 10,
    flex: 1,
    minWidth: 120,
    alignItems: 'center',
  },
  btnDangerText: {
    color: '#fef2f2',
    fontWeight: '700',
    fontSize: 15,
  },
});
