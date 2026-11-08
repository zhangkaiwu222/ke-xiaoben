import { Link, useRouter } from 'expo-router';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { useApp } from '../src/context/AppContext';

export default function StudentsScreen() {
  const router = useRouter();
  const { ready, data, remaining } = useApp();
  const [query, setQuery] = useState('');

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return data.students;
    return data.students.filter((s) => {
      const nameMatch = s.name.toLowerCase().includes(q);
      const noteMatch = s.note.toLowerCase().includes(q);
      return nameMatch || noteMatch;
    });
  }, [data.students, query]);

  if (!ready) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#38bdf8" />
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.search}
          placeholder="搜索姓名或备注"
          placeholderTextColor="#64748b"
          value={query}
          onChangeText={setQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
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
            style={({ pressed }) => [styles.card, pressed && styles.cardPressed]}
            onPress={() => router.push(`/student/${item.id}`)}>
            <View style={styles.cardTop}>
              <Text style={styles.name}>{item.name}</Text>
              <Text style={styles.badge}>{remaining(item)} 节剩余</Text>
            </View>
            <Text style={styles.meta}>
              已购 {item.totalPurchased} · 已消 {item.consumed}
            </Text>
            {item.note ? <Text style={styles.note} numberOfLines={2}>{item.note}</Text> : null}
          </Pressable>
        )}
      />
      <Link href="/student/new" style={styles.fab}>
        <Text style={styles.fabText}>+ 添加学员</Text>
      </Link>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: '#0f172a',
  },
  searchWrap: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 0,
  },
  search: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    color: '#f8fafc',
    fontSize: 16,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0f172a',
  },
  list: {
    padding: 16,
    paddingBottom: 100,
  },
  empty: {
    paddingVertical: 48,
    alignItems: 'center',
  },
  emptyTitle: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySub: {
    color: '#64748b',
    fontSize: 14,
  },
  card: {
    backgroundColor: '#1e293b',
    borderRadius: 14,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardPressed: {
    opacity: 0.85,
  },
  cardTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  name: {
    color: '#f8fafc',
    fontSize: 18,
    fontWeight: '700',
    flex: 1,
    marginRight: 12,
  },
  badge: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '600',
  },
  meta: {
    color: '#94a3b8',
    fontSize: 14,
    marginBottom: 4,
  },
  note: {
    color: '#64748b',
    fontSize: 13,
    marginTop: 4,
  },
  fab: {
    position: 'absolute',
    bottom: 24,
    left: 16,
    right: 16,
    backgroundColor: '#0ea5e9',
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  fabText: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
  },
});
