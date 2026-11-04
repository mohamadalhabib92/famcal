import React, { useCallback, useEffect } from 'react';
import { Stack } from 'expo-router';
import { useColorScheme } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/kit/theme';
import { BootGate, OfflineBadge, ToastProvider } from '@/kit/ui';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { LocalModeBanner } from '@/components/common';
import { installCrashReporting } from '@/lib/crash';
import { paletteFor } from '@/theme';
import { DelightProvider } from '@/kit/premium';
import { store } from '@/state';

export default function RootLayout() {
  const hydrate = useCallback(() => store.hydrate(), []);
  // Suit l’apparence du système (clair / sombre).
  const scheme = useColorScheme();
  const palette = paletteFor(scheme);
  useEffect(() => {
    installCrashReporting();
  }, []);
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider value={palette}>
          <ToastProvider>
            <DelightProvider>
            <StatusBar style={palette.dark ? 'light' : 'dark'} />
            <BootGate hydrate={hydrate} appName="FamCal">
              <LocalModeBanner />
              <OfflineBadge text="Hors ligne — données en cache" />
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.bg } }} />
            </BootGate>
            </DelightProvider>
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
