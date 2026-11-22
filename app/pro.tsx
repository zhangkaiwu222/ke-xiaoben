import { router } from 'expo-router';
import { useCallback, useEffect, useRef } from 'react';
import {
  ActivityIndicator,
  Alert,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { Button, Card } from '../src/components/ui';
import { PRO_FEATURES } from '../src/constants/entitlements';
import { LINKS } from '../src/constants/links';
import { colors, spacing } from '../src/constants/theme';
import { useApp } from '../src/context/AppContext';
import { useIap } from '../src/iap/IapProvider';

export default function ProScreen() {
  const { isPro, unlockProDemo } = useApp();
  const { storeReady, purchasing, monthly, yearly, subscribe, restore, retryLoadStore, lastError } =
    useIap();
  const wasPro = useRef(isPro);

  useEffect(() => {
    if (!wasPro.current && isPro) {
      Alert.alert('感谢支持', '课消本 Pro 已生效。');
      router.back();
    }
    wasPro.current = isPro;
  }, [isPro]);

  const onSubscribe = useCallback(
    async (plan: 'monthly' | 'yearly') => {
      if (Platform.OS !== 'ios') {
        Alert.alert('暂不可用', '订阅目前仅支持 iOS App Store / TestFlight 版本。');
        return;
      }
      if (!storeReady) {
        Alert.alert('请稍候', '正在连接 App Store…');
        await retryLoadStore();
        return;
      }
      const result = await subscribe(plan);
      if (result.ok || result.reason === 'cancelled') return;
      Alert.alert('购买未完成', lastError ?? '请稍后重试。');
    },
    [storeReady, subscribe, lastError, retryLoadStore],
  );

  const onRestore = useCallback(async () => {
    const result = await restore();
    if (result.ok && result.reason === 'none') {
      Alert.alert('恢复购买', '未找到有效订阅。');
    }
  }, [restore]);

  if (isPro) {
    return (
      <View style={styles.wrap}>
        <Card>
          <Text style={styles.title}>你已开通 Pro</Text>
          <Text style={styles.desc}>享受全部高级功能。如需管理订阅，请前往 iPhone「设置 → Apple ID → 订阅」。</Text>
          <View style={{ height: 12 }} />
          <Button label="返回" variant="secondary" onPress={() => router.back()} />
        </Card>
      </View>
    );
  }

  const monthlyPrice = monthly?.displayPrice ?? '—';
  const yearlyPrice = yearly?.displayPrice ?? '—';

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.hero}>课消本 Pro</Text>
      <Text style={styles.heroSub}>为全职私教与老师打造，一次订阅，专心上课。</Text>

      <Card style={styles.featureCard}>
        {PRO_FEATURES.map((f) => (
          <Text key={f} style={styles.featureLine}>
            ✓ {f}
          </Text>
        ))}
      </Card>

      {lastError === 'store_no_products' ? (
        <Text style={styles.warn}>
          未加载到订阅商品。请在 App Store Connect 配置产品 ID 并关联到本 App 版本。
        </Text>
      ) : null}

      <Button
        label={purchasing ? '处理中…' : `连续包月 ${monthlyPrice}`}
        onPress={() => onSubscribe('monthly')}
        disabled={purchasing}
      />
      <View style={{ height: 10 }} />
      <Button
        label={purchasing ? '处理中…' : `连续包年 ${yearlyPrice}（更省）`}
        variant="pro"
        onPress={() => onSubscribe('yearly')}
        disabled={purchasing}
      />
      <View style={{ height: 14 }} />
      <Button label="恢复购买" variant="ghost" onPress={onRestore} disabled={purchasing} />
      {!storeReady && Platform.OS === 'ios' ? (
        <View style={styles.loadingRow}>
          <ActivityIndicator color={colors.brand} />
          <Text style={styles.loadingText}>连接 App Store…</Text>
        </View>
      ) : null}

      <Text style={styles.legal}>
        订阅自动续期，可随时在 Apple 账户设置中取消。付款将记入 Apple ID。
      </Text>
      <View style={styles.links}>
        <Text style={styles.link} onPress={() => Linking.openURL(LINKS.privacy)}>
          隐私政策
        </Text>
        <Text style={styles.linkDot}> · </Text>
        <Text style={styles.link} onPress={() => Linking.openURL(LINKS.terms)}>
          使用条款 (EULA)
        </Text>
        <Text style={styles.linkDot}> · </Text>
        <Text style={styles.link} onPress={() => Linking.openURL(LINKS.support)}>
          技术支持
        </Text>
      </View>

      {__DEV__ ? (
        <Button label="[开发] 模拟解锁 Pro" variant="secondary" onPress={unlockProDemo} />
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scroll: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.lg, paddingBottom: 40 },
  wrap: { flex: 1, backgroundColor: colors.bg, padding: spacing.lg, justifyContent: 'center' },
  hero: { fontSize: 28, fontWeight: '800', color: colors.ink, marginBottom: 6 },
  heroSub: { color: colors.inkMuted, fontSize: 15, marginBottom: spacing.lg },
  featureCard: { marginBottom: spacing.lg, gap: 8 },
  featureLine: { color: colors.ink, fontSize: 15, lineHeight: 22 },
  title: { color: colors.ink, fontSize: 20, fontWeight: '700', marginBottom: 8 },
  desc: { color: colors.inkMuted, fontSize: 14, lineHeight: 20 },
  warn: { color: colors.warning, fontSize: 13, marginBottom: spacing.md },
  legal: { color: colors.inkDim, fontSize: 11, lineHeight: 16, marginTop: spacing.lg },
  links: { flexDirection: 'row', flexWrap: 'wrap', marginTop: 8, marginBottom: spacing.lg },
  link: { color: colors.brand, fontSize: 12 },
  linkDot: { color: colors.inkDim, fontSize: 12 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 12 },
  loadingText: { color: colors.inkDim, fontSize: 13 },
});
