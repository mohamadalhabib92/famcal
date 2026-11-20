import React from 'react';
import type { ColorValue } from 'react-native';
import { useColorScheme } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@/kit/ui';
import { useReduceTransparency } from '@/kit/a11y';
import { verreFor } from '@/kit/verre';
import { paletteFor } from '@/theme';
import { store } from '@/state';

export default function TabsLayout() {
  const ok = store.useSelect((s) => !!s.session && !!s.family && !!s.meId);
  const appearance = store.useSelect((s) => s.prefs.appearance ?? 'system');
  const palette = paletteFor(appearance, useColorScheme());
  const reduceT = useReduceTransparency();
  const verre = verreFor(palette.dark);
  if (!ok) return <Redirect href="/" />;
  const icon = (name: React.ComponentProps<typeof Ionicons>['name']) =>
    function TabIcon({ color, size }: { color: ColorValue; size: number }) {
      return <Ionicons name={name} color={color as string} size={size} />;
    };
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: palette.primaryInk,
        tabBarInactiveTintColor: palette.textMuted,
        tabBarStyle: {
          backgroundColor: reduceT ? palette.surface : verre.fill,
          borderTopColor: verre.highlight,
          borderTopWidth: 1,
          minHeight: 64,
          paddingTop: 4,
        },
        tabBarItemStyle: { minHeight: 48 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="agenda" options={{ title: 'Agenda', tabBarIcon: icon('calendar') }} />
      <Tabs.Screen name="famille" options={{ title: 'Famille', tabBarIcon: icon('people') }} />
      <Tabs.Screen name="reglages" options={{ title: 'Réglages', tabBarIcon: icon('settings') }} />
    </Tabs>
  );
}
