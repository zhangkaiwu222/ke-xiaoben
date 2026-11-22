import { Tabs } from 'expo-router';
import { Text } from 'react-native';

import { colors } from '../../src/constants/theme';

function TabIcon({ label }: { label: string }) {
  return <Text style={{ fontSize: 18 }}>{label}</Text>;
}

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        headerStyle: { backgroundColor: colors.bgElevated },
        headerShadowVisible: false,
        headerTintColor: colors.ink,
        headerTitleStyle: { fontWeight: '700', color: colors.ink },
        tabBarStyle: {
          backgroundColor: colors.bgElevated,
          borderTopColor: colors.cardBorder,
        },
        tabBarActiveTintColor: colors.brand,
        tabBarInactiveTintColor: colors.inkDim,
        sceneStyle: { backgroundColor: colors.bg },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: '首页',
          tabBarIcon: () => <TabIcon label="🏠" />,
        }}
      />
      <Tabs.Screen
        name="students"
        options={{
          title: '学员',
          tabBarIcon: () => <TabIcon label="👥" />,
        }}
      />
      <Tabs.Screen
        name="schedule"
        options={{
          title: '排课',
          tabBarIcon: () => <TabIcon label="📅" />,
        }}
      />
      <Tabs.Screen
        name="more"
        options={{
          title: '更多',
          tabBarIcon: () => <TabIcon label="⋯" />,
        }}
      />
    </Tabs>
  );
}
