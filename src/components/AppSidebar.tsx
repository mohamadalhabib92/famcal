import React from 'react';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { router, usePathname } from 'expo-router';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '@/kit/theme';
import { Ionicons, T } from '@/kit/ui';
import type { IconName } from '@/kit/ui';

const LINKS: { href: '/agenda' | '/famille' | '/reglages'; label: string; icon: IconName }[] = [
  { href: '/agenda', label: 'Agenda', icon: 'calendar' },
  { href: '/famille', label: 'Famille', icon: 'people' },
  { href: '/reglages', label: 'Réglages', icon: 'settings' },
];

function selected(path: string, href: string): boolean {
  if (path === href || path.startsWith(`${href}/`)) return true;
  if (href === '/agenda' && (path.startsWith('/event') || path === '/')) return true;
  if (href === '/famille' && path.startsWith('/member')) return true;
  if (href === '/reglages' && (path.startsWith('/config') || path.startsWith('/invite'))) return true;
  return false;
}

function SideLink({ href, label, icon, active }: { href: '/agenda' | '/famille' | '/reglages'; label: string; icon: IconName; active: boolean }) {
  const p = useTheme();
  const go = () => router.push(href);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      accessibilityLabel={label}
      onPress={go}
      style={(state) => {
        const hot = Boolean((state as { hovered?: boolean }).hovered) || state.pressed;
        return {
          minHeight: 48,
          paddingHorizontal: 14,
          borderRadius: 12,
          flexDirection: 'row',
          alignItems: 'center',
          gap: 10,
          backgroundColor: active ? p.primaryInk : hot ? p.surface2 : 'transparent',
        };
      }}
    >
      <Ionicons name={icon} size={20} color={active ? p.primaryText : p.text} />
      <T v="body" color={active ? p.primaryText : p.text} style={{ fontWeight: '700', flex: 1 }}>
        {label}
      </T>
    </Pressable>
  );
}

/** Navigation latérale sur Mac (≥ 900 pt), iPad et web large (≥ 1024 pt). */
export function AppSidebar() {
  const p = useTheme();
  const insets = useSafeAreaInsets();
  const path = usePathname();
  return (
    <View style={[styles.side, { backgroundColor: p.surface, borderEndColor: p.border, paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 }]}>
      <T v="h2" style={{ paddingHorizontal: 8 }}>
        Familycal
      </T>
      <ScrollView contentContainerStyle={{ gap: 6, paddingTop: 16 }} keyboardShouldPersistTaps="handled">
        {LINKS.map((link) => (
          <SideLink key={link.href} href={link.href} icon={link.icon} label={link.label} active={selected(path, link.href)} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  side: { width: 248, borderEndWidth: StyleSheet.hairlineWidth, paddingHorizontal: 12 },
});
