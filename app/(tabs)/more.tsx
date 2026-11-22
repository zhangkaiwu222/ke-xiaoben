import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { MenuTile, SectionTitle } from '../../src/components/ui';
import { colors, spacing } from '../../src/constants/theme';
import { useApp } from '../../src/context/AppContext';

export default function MoreScreen() {
  const { isPro } = useApp();

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <SectionTitle>数据与工具</SectionTitle>
      <MenuTile href="/stats" emoji="📊" title="月度统计" subtitle="消课流水、汇总与 CSV" pro />
      <MenuTile href="/backup" emoji="💾" title="备份与恢复" subtitle="导出 JSON，换机迁移" />
      <MenuTile href="/reminders" emoji="🔔" title="课前提醒" subtitle="本地通知权限与提前分钟" />
      <MenuTile href="/templates" emoji="📝" title="课程主题模板" subtitle="Pro：排课时一键填入" pro />

      <View style={styles.gap} />
      <SectionTitle>订阅</SectionTitle>
      <MenuTile
        href="/pro"
        emoji="✨"
        title={isPro ? '课消本 Pro' : '升级课消本 Pro'}
        subtitle={isPro ? '管理订阅与恢复购买' : '无限学员 · 90 天排课 · 多月统计'}
      />

      <Text style={styles.foot}>数据保存在本机，不上传云端。订阅由 Apple 账户扣费。</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, paddingBottom: 40 },
  gap: { height: spacing.lg },
  foot: { color: colors.inkDim, fontSize: 12, lineHeight: 18, marginTop: spacing.lg },
});
