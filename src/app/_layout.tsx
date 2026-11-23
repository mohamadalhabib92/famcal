import React, { useCallback, useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, useColorScheme } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/kit/theme';
import { BootGate, OfflineBadge, ToastProvider } from '@/kit/ui';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { FamilyServices } from '@/components/FamilyServices';
import { LocalModeBanner } from '@/components/common';
import { PreservationBanner } from '@/components/PreservationBanner';
import { installCrashReporting } from '@/lib/crash';
import { strings } from '@/locales';
import { paletteFor } from '@/theme';
import { store } from '@/state';

export default function RootLayout() {
  const hydrate = useCallback(() => store.hydrate(), []);
  const scheme = useColorScheme();
  const appearance = store.useSelect((s) => s.prefs.appearance ?? 'system');
  const palette = paletteFor(appearance, scheme);
  useEffect(() => {
    installCrashReporting();
  }, []);
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider value={palette}>
          <ToastProvider>
            <StatusBar style={palette.dark ? 'light' : 'dark'} hidden={Platform.isTV} />
            <BootGate hydrate={hydrate} appName={strings.appName}>
              <FamilyServices />
              {Platform.isTV ? null : <LocalModeBanner />}
              {Platform.isTV ? null : <PreservationBanner />}
              {Platform.isTV ? null : <OfflineBadge text="Hors ligne — données en cache" />}
              <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.bg } }} />
            </BootGate>
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
