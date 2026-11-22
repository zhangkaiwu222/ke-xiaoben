import { useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import { Alert, FlatList, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';

import { LoadingScreen, Screen } from '../../src/components/ui';
import { colors, radius, spacing } from '../../src/constants/theme';
import { FREE_STUDENT_LIMIT } from '../../src/constants/entitlements';
import { useApp } from '../../src/context/AppContext';

export default function StudentsScreen() {
  const router = useRouter();
  const { ready, data, remaining, isPro, canCreateStudent } = useApp();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data.students;
    return data.students.filter((s) => {
      return (
        s.name.toLowerCase().includes(q) ||
        s.note.toLowerCase().includes(q) ||
        s.subject.toLowerCase().includes(q) ||
        s.phone.includes(q)
      );
    });
  }, [data.students, query]);

  if (!ready) return <LoadingScreen />;

  const onAdd = () => {
    if (canCreateStudent) {
      router.push('/student/new');
      return;
    }
    Alert.alert(
      '需要 Pro',
      `免费版最多 ${FREE_STUDENT_LIMIT} 位学员。升级后可无限添加。`,
      [
        { text: '取消', style: 'cancel' },
        { text: '了解 Pro', onPress: () => router.push('/pro') },
      ],
    );
  };

  return (
    <Screen>
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          placeholder="搜索姓名、科目、备注、电话"
          placeholderTextColor={colors.inkDim}
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {!isPro ? (
          <Text style={styles.quota}>
            {data.students.length}/{FREE_STUDENT_LIMIT} 学员（免费）
          </Text>
        ) : null}
      </View>
      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={styles.emptyTitle}>{query.trim() ? '没有匹配的学员' : '还没有学员'}</Text>
            <Text style={styles.emptySub}>
              {query.trim() ? '换个关键词试试' : '点击下方添加第一位学员'}
            </Text>
          </View>
        }
        renderItem={({ item }) => (
          <Pressable
            style={({ pressed }) => [styles.card, pressed && styles.pressed]}
            onPress={() => router.push(`/student/${item.id}`)}>
            <View style={styles.cardTop}>
              <View style={styles.nameCol}>
                <Text style={styles.name}>{item.name}</Text>
                {item.subject ? <Text style={styles.subject}>{item.subject}</Text> : null}
              </View>
              <View style={[styles.badge, remaining(item) <= 3 && styles.badgeWarn]}>
                <Text style={styles.badgeText}>{remaining(item)} 节</Text>
              </View>
            </View>
            <Text style={styles.meta}>
              已购 {item.totalPurchased} · 已消 {item.consumed}
            </Text>
            {item.note ? (
              <Text style={styles.note} numberOfLines={2}>
                {item.note}
              </Text>
            ) : null}
          </Pressable>
        )}
      />
      <Pressable style={({ pressed }) => [styles.fab, pressed && styles.pressed]} onPress={onAdd}>
        <Text style={styles.fabText}>+ 添加学员</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  searchWrap: { paddingHorizontal: spacing.md, paddingTop: spacing.sm },
  search: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.cardBorder,
    borderRadius: radius.md,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: colors.ink,
    fontSize: 16,
  },
  quota: { color: colors.inkDim, fontSize: 12, marginTop: 6, marginLeft: 4 },
  list: { padding: spacing.md, paddingBottom: 100 },
  empty: { paddingVertical: 48, alignItems: 'center' },
  emptyTitle: { color: colors.ink, fontSize: 18, fontWeight: '600', marginBottom: 8 },
  emptySub: { color: colors.inkDim, fontSize: 14 },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  pressed: { opacity: 0.88 },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  nameCol: { flex: 1, marginRight: 12 },
  name: { color: colors.ink, fontSize: 18, fontWeight: '700' },
  subject: { color: colors.brand, fontSize: 13, marginTop: 2 },
  badge: {
    backgroundColor: colors.bgElevated,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.cardBorder,
  },
  badgeWarn: { borderColor: colors.warning },
  badgeText: { color: colors.brand, fontSize: 14, fontWeight: '700' },
  meta: { color: colors.inkMuted, fontSize: 14 },
  note: { color: colors.inkDim, fontSize: 13, marginTop: 6 },
  fab: {
    position: 'absolute',
    bottom: 24,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: colors.brand,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  fabText: { color: colors.brandOn, fontSize: 16, fontWeight: '700' },
});
