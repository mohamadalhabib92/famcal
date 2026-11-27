import React, { useCallback, useRef } from 'react';
import { TextInput } from 'react-native';
import { useFocusEffect } from 'expo-router';
import { useTheme } from '@/kit/theme';
import { registerSearch } from '@/lib/keys';
import { useShell } from '@/lib/useShell';

/** Champ visible sur Mac, iPad large et fenêtre web large. Cmd+F le prend. */
export function AgendaSearch({ value, onChange }: { value: string; onChange: (value: string) => void }) {
  const shell = useShell();
  const t = useTheme();
  const node = useRef<React.ComponentRef<typeof TextInput>>(null);
  const visible = shell.keyboard || shell.sidebar;
  useFocusEffect(
    useCallback(() => {
      if (!visible) return undefined;
      return registerSearch(() => node.current?.focus());
    }, [visible]),
  );
  if (!visible) return null;
  return (
    <TextInput
      ref={node}
      value={value}
      onChangeText={onChange}
      placeholder="Rechercher un événement"
      placeholderTextColor={t.textMuted}
      accessibilityLabel="Rechercher un événement"
      autoCorrect={false}
      clearButtonMode="while-editing"
      style={{
        minHeight: 48,
        borderRadius: t.radius,
        borderWidth: 1,
        borderColor: t.border,
        backgroundColor: t.surface,
        color: t.text,
        paddingHorizontal: 14,
        fontSize: 16 * t.fontScale,
      }}
    />
  );
}
