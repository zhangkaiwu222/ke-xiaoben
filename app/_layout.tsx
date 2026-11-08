import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { NotificationInit } from '../src/components/NotificationInit';
import { AppProvider } from '../src/context/AppContext';

export default function RootLayout() {
  return (
    <AppProvider>
      <NotificationInit />
      <StatusBar style="light" />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#0f172a' },
          headerTintColor: '#f8fafc',
          headerTitleStyle: { fontWeight: '600' },
          contentStyle: { backgroundColor: '#0f172a' },
        }}>
        <Stack.Screen name="index" options={{ title: '课消本' }} />
        <Stack.Screen name="schedule" options={{ title: '近日排课' }} />
        <Stack.Screen name="students" options={{ title: '学员' }} />
        <Stack.Screen name="student/new" options={{ title: '添加学员' }} />
        <Stack.Screen name="student/edit/[id]" options={{ title: '编辑学员' }} />
        <Stack.Screen name="student/[id]" options={{ title: '学员详情' }} />
        <Stack.Screen name="backup" options={{ title: '备份与恢复' }} />
        <Stack.Screen name="stats" options={{ title: '月度统计' }} />
        <Stack.Screen name="reminders" options={{ title: '课前提醒' }} />
      </Stack>
    </AppProvider>
  );
}
