import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

import { NotificationInit } from '../src/components/NotificationInit';
import { colors } from '../src/constants/theme';
import { AppProvider } from '../src/context/AppContext';
import { IapProvider } from '../src/iap/IapProvider';

export default function RootLayout() {
  return (
    <AppProvider>
      <IapProvider>
        <NotificationInit />
        <StatusBar style="light" />
        <Stack
          screenOptions={{
            headerStyle: { backgroundColor: colors.bgElevated },
            headerShadowVisible: false,
            headerTintColor: colors.brand,
            headerTitleStyle: { fontWeight: '700', color: colors.ink },
            contentStyle: { backgroundColor: colors.bg },
          }}>
          <Stack.Screen name="index" options={{ headerShown: false }} />
          <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          <Stack.Screen name="student/new" options={{ title: '添加学员' }} />
          <Stack.Screen name="student/edit/[id]" options={{ title: '编辑学员' }} />
          <Stack.Screen name="student/[id]" options={{ title: '学员详情' }} />
          <Stack.Screen name="backup" options={{ title: '备份与恢复' }} />
          <Stack.Screen name="stats" options={{ title: '月度统计' }} />
          <Stack.Screen name="reminders" options={{ title: '课前提醒' }} />
          <Stack.Screen name="pro" options={{ title: '课消本 Pro', presentation: 'modal' }} />
          <Stack.Screen name="templates" options={{ title: '课程模板' }} />
        </Stack>
      </IapProvider>
    </AppProvider>
  );
}
