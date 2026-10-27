import React from 'react';
import type { ColorValue } from 'react-native';
import { Redirect, Tabs } from 'expo-router';
import { Ionicons } from '@/kit/ui';
import { warm } from '@/theme';
import { store } from '@/state';

export default function TabsLayout() {
  const ok = store.useSelect((s) => !!s.session && !!s.family && !!s.meId);
  if (!ok) return <Redirect href="/" />;
  const icon = (name: React.ComponentProps<typeof Ionicons>['name']) =>
    function TabIcon({ color, size }: { color: ColorValue; size: number }) {
      return <Ionicons name={name} color={color as string} size={size} />;
    };
  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: warm.primary,
        tabBarInactiveTintColor: warm.textMuted,
        tabBarStyle: { backgroundColor: warm.surface, borderTopColor: warm.border, minHeight: 60 },
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
      }}
    >
      <Tabs.Screen name="agenda" options={{ title: 'Agenda', tabBarIcon: icon('calendar') }} />
      <Tabs.Screen name="famille" options={{ title: 'Famille', tabBarIcon: icon('people') }} />
      <Tabs.Screen name="reglages" options={{ title: 'Réglages', tabBarIcon: icon('settings') }} />
    </Tabs>
  );
}
