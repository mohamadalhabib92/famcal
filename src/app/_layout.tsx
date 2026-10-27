import React, { useCallback } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/kit/theme';
import { BootGate, OfflineBadge, ToastProvider } from '@/kit/ui';
import { warm } from '@/theme';
import { store } from '@/state';

export default function RootLayout() {
  const hydrate = useCallback(() => store.hydrate(), []);
  return (
    <SafeAreaProvider>
      <ThemeProvider value={warm}>
        <ToastProvider>
          <StatusBar style="dark" />
          <BootGate hydrate={hydrate} appName="FamCal">
            <OfflineBadge text="Hors ligne — données en cache" />
            <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: warm.bg } }} />
          </BootGate>
        </ToastProvider>
      </ThemeProvider>
    </SafeAreaProvider>
  );
}
