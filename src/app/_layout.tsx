import React, { useCallback, useEffect, useMemo } from 'react';
import { Stack, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { Platform, useColorScheme, View } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { ThemeProvider } from '@/kit/theme';
import { BootGate, OfflineBadge, ToastProvider } from '@/kit/ui';
import { AppSidebar } from '@/components/AppSidebar';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { FamilyServices } from '@/components/FamilyServices';
import { MacKeyboard } from '@/components/MacKeyboard';
import { LocalModeBanner } from '@/components/common';
import { PreservationBanner } from '@/components/PreservationBanner';
import { installCrashReporting } from '@/lib/crash';
import { useShell } from '@/lib/useShell';
import { strings } from '@/locales';
import { paletteFor } from '@/theme';
import { store } from '@/state';

export default function RootLayout() {
  const hydrate = useCallback(() => store.hydrate(), []);
  const scheme = useColorScheme();
  const appearance = store.useSelect((s) => s.prefs.appearance ?? 'system');
  const shell = useShell();
  const path = usePathname();
  const ready = store.useSelect((s) => !!s.session && !!s.family && !!s.meId && !!s.onboarded);
  const sidebar = shell.sidebar && ready && !path.startsWith('/tv') && path !== '/login' && !path.startsWith('/onboarding');
  const palette = useMemo(() => {
    const base = paletteFor(appearance, scheme);
    if (shell.typeBoost === 1) return base;
    return { ...base, fontScale: base.fontScale * shell.typeBoost };
  }, [appearance, scheme, shell.typeBoost]);
  useEffect(() => {
    installCrashReporting();
  }, []);
  return (
    <ErrorBoundary>
      <SafeAreaProvider>
        <ThemeProvider value={palette}>
          <ToastProvider>
            <StatusBar style={palette.dark ? 'light' : 'dark'} hidden={Platform.isTV} />
            <View style={{ flex: 1 }}>
              <BootGate hydrate={hydrate} appName={strings.appName}>
                <MacKeyboard>
                  <FamilyServices />
                  {Platform.isTV ? null : <LocalModeBanner />}
                  {Platform.isTV ? null : <PreservationBanner />}
                  {Platform.isTV ? null : <OfflineBadge text="Hors ligne — données en cache" />}
                  <View style={{ flex: 1, flexDirection: 'row' }}>
                    {sidebar ? <AppSidebar /> : null}
                    <View style={{ flex: 1 }}>
                      <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: palette.bg } }} />
                    </View>
                  </View>
                </MacKeyboard>
              </BootGate>
            </View>
          </ToastProvider>
        </ThemeProvider>
      </SafeAreaProvider>
    </ErrorBoundary>
  );
}
