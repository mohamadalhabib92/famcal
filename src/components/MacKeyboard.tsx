import React, { useEffect } from 'react';
import { Platform, StyleSheet, View } from 'react-native';
import { router } from 'expo-router';
import { addMacKeyListener } from 'famcal-mac';
import { focusSearch } from '@/lib/keys';
import { isIosAppOnMac } from '@/lib/mac';
import { shortcutFor } from '@/lib/shell';
import { useShell } from '@/lib/useShell';
import { store } from '@/state';

function typingTarget(target: EventTarget | null): boolean {
  const node = target as HTMLElement | null;
  if (!node) return false;
  return node.tagName === 'INPUT' || node.tagName === 'TEXTAREA' || node.isContentEditable === true;
}

function openSearch() {
  if (focusSearch()) return;
  router.push('/agenda');
}

/**
 * Échap recule, Cmd+F cherche. Le module natif ne s’installe pas sur iPhone.
 * Une fenêtre web large reçoit les mêmes raccourcis.
 */
export function MacKeyboard({ children }: { children: React.ReactNode }) {
  const { keyboard } = useShell();
  const mac = isIosAppOnMac();
  const ready = store.useSelect((s) => !!s.session && !!s.onboarded);

  useEffect(() => {
    if (!keyboard) return undefined;
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      const onKey = (event: KeyboardEvent) => {
        const typing = typingTarget(event.target);
        if (event.key === 'Escape' && typing) {
          (event.target as HTMLElement).blur();
          return;
        }
        const action = shortcutFor({
          key: event.key,
          metaKey: event.metaKey,
          ctrlKey: event.ctrlKey,
          altKey: event.altKey,
          typing,
        });
        if (!action || !ready) return;
        if (action === 'search') {
          event.preventDefault();
          openSearch();
          return;
        }
        if (router.canGoBack()) {
          event.preventDefault();
          router.back();
        }
      };
      window.addEventListener('keydown', onKey);
      return () => window.removeEventListener('keydown', onKey);
    }
    if (!mac) return undefined;
    return addMacKeyListener((key) => {
      if (!ready && key === 'find') return;
      if (key === 'find') openSearch();
      else if (key === 'escape' && router.canGoBack()) router.back();
    });
  }, [keyboard, mac, ready]);

  return <View style={styles.fill}>{children}</View>;
}

const styles = StyleSheet.create({
  fill: { flex: 1 },
});
