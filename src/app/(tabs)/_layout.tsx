import React from 'react';
import type { ColorValue } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@/kit/ui';
import { useTheme } from '@/kit/theme';
import { haptic } from '@/kit/haptics';
import { store } from '@/state';

export default function TabsLayout() {
  const t = useTheme();
  const ok = store.useSelect((s) => !!s.session && !!s.family && !!s.meId);
  if (!ok) return <Redirect href="/" />;
  const icon = (name: React.ComponentProps<typeof Ionicons>['name']) =>
    function TabIcon({ color, size }: { color: ColorValue; size: number }) {
      return <Ionicons name={name} color={color as string} size={size} />;
    };
  return (
    <Tabs
      screenListeners={{ tabPress: () => haptic.select() }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: t.primaryInk,
        tabBarInactiveTintColor: t.textMuted,
        tabBarStyle: { backgroundColor: t.surface, borderTopColor: t.border, minHeight: 60, elevation: 0, shadowOpacity: 0 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="agenda" options={{ title: 'Agenda', tabBarAccessibilityLabel: 'Agenda', tabBarIcon: icon('calendar') }} />
      <Tabs.Screen name="famille" options={{ title: 'Famille', tabBarAccessibilityLabel: 'Famille', tabBarIcon: icon('people') }} />
      <Tabs.Screen name="reglages" options={{ title: 'Réglages', tabBarAccessibilityLabel: 'Réglages', tabBarIcon: icon('settings') }} />
    </Tabs>
  );
}
