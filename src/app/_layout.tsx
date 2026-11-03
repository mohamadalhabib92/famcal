import React, { useCallback, useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/kit/theme';
import { BootGate, OfflineBadge, ToastProvider } from '@/kit/ui';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LocalModeBanner } from '@/components/common';
import { installCrashReporting } from '@/lib/crash';
import { warm } from '@/theme';
import { store } from '@/state';

export default function RootLayout() {
  const hydrate = useCallback(() => store.hydrate(), []);
  useEffect(() => {
    installCrashReporting();
  }, []);
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider value={warm}>
          <ToastProvider>
            <StatusBar style="dark" />
            <BootGate hydrate={hydrate} appName="FamCal">
              <LocalModeBanner />
              <OfflineBadge text="Hors ligne — données en cache" />
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: warm.bg } }} />
            </BootGate>
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
