import { Ionicons } from '@expo/vector-icons';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  AccessibilityInfo,
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleProp,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TextInputProps,
  TextStyle,
  View,
  ViewStyle,
} from 'react-native';
import { announce, useLargeText as useLargeTextBase, useReduceTransparency } from './a11y';
import { bestInk, ensureContrast, mix } from './contrast';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { readableOn } from '@/theme';
import { useOnline } from './net';
import { withTimeout } from './store';
import { alpha, useTheme, type Palette } from './theme';
import { haptic } from './haptics';
import { useEntrance, usePressScale, useSystemReduceMotion } from './motion';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];
export { Ionicons };

/* ---------- Finition : profondeur, mouvement, encre ---------- */
/** Réduire les animations : réglage de l’app ou préférence système. */
export function useReduceMotion(): boolean {
  const t = useTheme();
  const sys = useSystemReduceMotion();
  return sys;
}

/** Texte agrandi (Dynamic Type × réglage de l’app) : on retire les coupures et on empile. */
export function useLargeText(): boolean {
  const t = useTheme();
  return useLargeTextBase(t.fontScale);
}

/**
 * Fond teinté : voile translucide par défaut, couleur pleine équivalente
 * quand « Réduire la transparence » est activé (iOS).
 */
export function useTint(): (c: string, a: number, over?: string) => string {
  const t = useTheme();
  const solid = useReduceTransparency();
  return (c, a, over) => (solid ? mix(c, over ?? t.surface, a) : alpha(c, a));
}

/** Couleur de marque lisible (AA) pour le texte et les icônes. */
export function inkOf(t: Palette): string {
  return t.primaryInk;
}

/** Ombre douce, plus discrète en mode sombre (on éclaire plutôt la bordure). */
export function elevation(t: Palette, level: 1 | 2 | 3 = 1): ViewStyle {
  const k = { 1: [0.06, 10, 3, 1], 2: [0.09, 16, 6, 3], 3: [0.16, 28, 12, 8] }[level];
  return {
    shadowColor: '#000000',
    shadowOpacity: t.dark ? k[0] * 3 : k[0],
    shadowRadius: k[1],
    shadowOffset: { width: 0, height: k[2] },
    elevation: k[3],
  };
}

/* ---------- Typo ---------- */
type TVariant = 'display' | 'h1' | 'h2' | 'h3' | 'body' | 'small' | 'caption' | 'label' | 'mono';
const sizes: Record<TVariant, { fs: number; fw: TextStyle['fontWeight']; lh?: number }> = {
  display: { fs: 32, fw: '800', lh: 38 },
  h1: { fs: 24, fw: '800', lh: 30 },
  h2: { fs: 19, fw: '700', lh: 25 },
  h3: { fs: 16, fw: '700', lh: 22 },
  body: { fs: 15, fw: '400', lh: 21 },
  small: { fs: 13, fw: '400', lh: 18 },
  caption: { fs: 11.5, fw: '600', lh: 15 },
  label: { fs: 12, fw: '700', lh: 16 },
  mono: { fs: 13, fw: '500', lh: 18 },
};

export function T({
  v = 'body',
  color,
  muted,
  center,
  style,
  children,
  numberOfLines,
  selectable,
}: {
  v?: TVariant;
  color?: string;
  muted?: boolean;
  center?: boolean;
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
  numberOfLines?: number;
  selectable?: boolean;
}) {
  const t = useTheme();
  const large = useLargeText();
  const s = sizes[v];
  return (
    <Text
      numberOfLines={large ? undefined : numberOfLines}
      selectable={selectable}
      style={[
        {
          fontSize: s.fs * t.fontScale,
          fontWeight: s.fw,
          lineHeight: s.lh ? s.lh * t.fontScale : undefined,
          color: color ?? (muted ? t.textMuted : t.text),
          textAlign: center ? 'center' : undefined,
          letterSpacing: v === 'caption' || v === 'label' ? 0.4 : (v === 'display' || v === 'h1') ? -0.4 : v === 'h2' ? -0.2 : undefined,
          textTransform: v === 'caption' ? 'uppercase' : undefined,
          fontFamily: v === 'mono' ? Platform.select({ ios: 'Menlo', android: 'monospace', default: 'ui-monospace, Menlo, monospace' }) : undefined,
        },
        style,
      ]}
    >
      {children}
    </Text>
  );
}

/* ---------- Layout ---------- */
export function Screen({
  children,
  scroll = true,
  padded = true,
  header,
  footer,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
}) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const inner = (
    <View style={{ width: '100%', maxWidth: 820, alignSelf: 'center', padding: padded ? 16 : 0, gap: 14, paddingBottom: 40 }}>{children}</View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
      {header}
      {scroll ? (
        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ flexGrow: 1 }} keyboardShouldPersistTaps="handled">
          {inner}
        </ScrollView>
      ) : (
        <View style={{ flex: 1 }}>{inner}</View>
      )}
      {footer}
    </View>
  );
}

export function Header({ title, subtitle, right, left }: { title: string; subtitle?: string; right?: React.ReactNode; left?: React.ReactNode }) {
  return (
    <View style={{ width: '100%', maxWidth: 820, alignSelf: 'center', paddingHorizontal: 16, paddingTop: 16, paddingBottom: 6, flexDirection: 'row', alignItems: 'center', gap: 10 }}>
      {left}
      <View style={{ flex: 1 }}>
        <T v="h1" numberOfLines={2}>
          {title}
        </T>
        {subtitle ? (
          <T v="small" muted numberOfLines={2}>
            {subtitle}
          </T>
        ) : null}
      </View>
      {right}
    </View>
  );
}

export function Row({ children, gap = 10, style, wrap }: { children: React.ReactNode; gap?: number; style?: StyleProp<ViewStyle>; wrap?: boolean }) {
  return <View style={[{ flexDirection: 'row', alignItems: 'center', gap, flexWrap: wrap ? 'wrap' : 'nowrap' }, style]}>{children}</View>;
}

export function Card({ children, style, onPress, accent, a11y }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; accent?: string; a11y?: string }) {
  const t = useTheme();
  const reduce = useReduceMotion();
  const press = usePressScale(reduce, 0.985);
  const base: ViewStyle = {
    backgroundColor: t.surface,
    borderRadius: t.radius,
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: t.border,
    padding: 14,
    gap: 8,
    ...elevation(t, 1),
    borderLeftWidth: accent ? 3 : StyleSheet.hairlineWidth,
    borderLeftColor: accent ?? t.border,
  };
  if (onPress)
    return (
      <Animated.View style={{ transform: [{ scale: press.scale }] }}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel={a11y}
          onPress={() => {
            haptic.select();
            onPress();
          }}
          onPressIn={press.onPressIn}
          onPressOut={press.onPressOut}
          style={({ pressed }) => [base, { opacity: pressed ? 0.94 : 1 }, style]}
        >
          {children}
        </Pressable>
      </Animated.View>
    );
  return <View style={[base, style]}>{children}</View>;
}

export function Section({ title, action, children }: { title: string; action?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <View style={{ gap: 8 }}>
      <Row style={{ justifyContent: 'space-between', marginTop: 4 }}>
        <T v="caption" muted>
          {title}
        </T>
        {action}
      </Row>
      {children}
    </View>
  );
}

export function Divider() {
  const t = useTheme();
  return <View style={{ height: StyleSheet.hairlineWidth, backgroundColor: t.border, marginVertical: 4 }} />;
}

/* ---------- Boutons ---------- */
/** Le flex d’un bouton (`style={{ flex: 1 }}`) doit porter sur l’enveloppe animée. */
function flexOf(style: StyleProp<ViewStyle>): ViewStyle | null {
  const f = StyleSheet.flatten(style) as ViewStyle | undefined;
  if (!f || (f.flex === undefined && f.flexGrow === undefined && f.flexBasis === undefined)) return null;
  return { flex: f.flex, flexGrow: f.flexGrow, flexBasis: f.flexBasis };
}
type BtnKind = 'primary' | 'secondary' | 'ghost' | 'danger' | 'success';
export function Button({
  title,
  onPress,
  kind = 'primary',
  icon,
  disabled,
  loading,
  small,
  full,
  style,
  a11y,
}: {
  title: string;
  onPress?: () => void;
  kind?: BtnKind;
  icon?: IconName;
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
  full?: boolean;
  style?: StyleProp<ViewStyle>;
  a11y?: string;
}) {
  const t = useTheme();
  const reduce = useReduceMotion();
  const press = usePressScale(reduce || !!disabled || !!loading);
  const bg = { primary: t.primaryInk, secondary: t.surface2, ghost: 'transparent', danger: t.danger, success: t.success }[kind];
  const fg = { primary: t.primaryText, secondary: t.text, ghost: t.primaryInk, danger: t.primaryText, success: t.primaryText }[kind];
  return (
    <Animated.View style={[{ transform: [{ scale: press.scale }], alignSelf: full ? 'stretch' : 'auto' }, flexOf(style)]}>
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y ?? title}
      accessibilityState={{ disabled: !!disabled, busy: !!loading }}
      disabled={disabled || loading}
      onPress={
        onPress
          ? () => {
              if (kind === 'danger') haptic.warning();
              else haptic.tap();
              onPress();
            }
          : undefined
      }
      onPressIn={press.onPressIn}
      onPressOut={press.onPressOut}
      style={({ pressed }) => [
        {
          minHeight: small ? 44 : 48,
          paddingHorizontal: small ? 12 : 18,
          paddingVertical: 8,
          minWidth: 44,
          borderRadius: t.radius - 2,
          backgroundColor: bg,
          borderWidth: kind === 'secondary' || kind === 'ghost' ? StyleSheet.hairlineWidth : 0,
          borderColor: kind === 'ghost' ? 'transparent' : t.border,
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'row',
          gap: 8,
          opacity: disabled ? 0.45 : pressed ? 0.9 : 1,
          alignSelf: full ? 'stretch' : 'auto',
          ...(kind === 'primary' || kind === 'success' || kind === 'danger' ? (!disabled ? elevation(t, 1) : null) : null),
        },
        style,
        flexOf(style) ? { flex: undefined, flexGrow: undefined, flexBasis: undefined } : null,
      ]}
    >
      {loading ? <ActivityIndicator color={fg} /> : icon ? <Ionicons name={icon} size={small ? 16 : 18} color={fg} /> : null}
      <Text style={{ color: fg, fontWeight: '700', fontSize: (small ? 13 : 15) * t.fontScale, flexShrink: 1, textAlign: 'center' }}>{title}</Text>
    </Pressable>
    </Animated.View>
  );
}

export function IconButton({ icon, onPress, a11y, color, size = 22 }: { icon: IconName; onPress?: () => void; a11y: string; color?: string; size?: number }) {
  const t = useTheme();
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y}
      onPress={
        onPress
          ? () => {
              haptic.select();
              onPress();
            }
          : undefined
      }
      hitSlop={6}
      style={({ pressed }) => ({ width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center', backgroundColor: pressed ? t.surface2 : 'transparent' })}
    >
      <Ionicons name={icon} size={size} color={color ?? t.text} />
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, color, icon }: { label: string; selected?: boolean; onPress?: () => void; color?: string; icon?: IconName }) {
  const t = useTheme();
  const tint = useTint();
  const c = color ?? t.primary;
  const ink = ensureContrast(ensureContrast(readableOn(c, t.dark), mix(c, t.surface, 0.16), t.text), mix(c, t.bg, 0.16), t.text);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!selected }}
      onPress={
        onPress
          ? () => {
              haptic.select();
              onPress();
            }
          : undefined
      }
      style={{
        minHeight: 44,
        minWidth: 44,
        maxWidth: '100%',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 22,
        borderWidth: 1,
        borderColor: selected ? c : t.border,
        backgroundColor: selected ? tint(c, 0.16) : t.surface,
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
      }}
    >
      {icon ? <Ionicons name={icon} size={14} color={selected ? ink : t.textMuted} /> : null}
      <Text style={{ color: selected ? ink : t.text, fontWeight: selected ? '700' : '500', fontSize: 13 * t.fontScale, flexShrink: 1 }}>{label}</Text>
    </Pressable>
  );
}

export function Badge({ label, color, icon }: { label: string; color?: string; icon?: IconName }) {
  const t = useTheme();
  const tint = useTint();
  const c = color ?? t.textMuted;
  const ink = ensureContrast(readableOn(c, t.dark), mix(c, t.surface, 0.15), t.text);
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, maxWidth: '100%', backgroundColor: tint(c, 0.15) }}>
      {icon ? <Ionicons name={icon} size={12} color={ink} /> : null}
      <Text style={{ color: ink, fontSize: 11 * t.fontScale, fontWeight: '700', flexShrink: 1 }}>{label}</Text>
    </View>
  );
}

export function Segmented<K extends string>({ options, value, onChange }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  const t = useTheme();
  const large = useLargeText();
  return (
    <View accessibilityRole="tablist" style={{ flexDirection: large ? 'column' : 'row', backgroundColor: t.surface2, borderRadius: t.radius, padding: 3 }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="tab"
            accessibilityLabel={o.label}
            accessibilityState={{ selected: on }}
            onPress={() => {
              if (!on) haptic.select();
              onChange(o.key);
            }}
            style={{ flex: large ? undefined : 1, minHeight: 44, paddingHorizontal: 8, paddingVertical: 6, borderRadius: t.radius - 3, alignItems: 'center', justifyContent: 'center', backgroundColor: on ? t.surface : 'transparent', ...(on ? elevation(t, 1) : null) }}
          >
            <Text style={{ color: on ? t.text : t.textMuted, fontWeight: on ? '700' : '500', fontSize: 13 * t.fontScale, textAlign: 'center' }}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------- Formulaires ---------- */
export function Field({ label, hint, error, ...props }: TextInputProps & { label: string; hint?: string; error?: string }) {
  const t = useTheme();
  return (
    <View style={{ gap: 5 }}>
      <T v="label" muted>
        {label}
      </T>
      <TextInput
        placeholderTextColor={t.textMuted}
        accessibilityLabel={label}
        accessibilityHint={error ?? hint}
        {...props}
        style={[
          {
            minHeight: props.multiline ? 84 : 46,
            borderWidth: 1,
            borderColor: error ? t.danger : t.border,
            borderRadius: t.radius - 2,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: t.text,
            backgroundColor: t.surface,
            fontSize: 15 * t.fontScale,
            textAlignVertical: props.multiline ? 'top' : 'center',
          },
          props.style,
        ]}
      />
      {error ? (
        <View accessibilityLiveRegion="polite">
          <T v="small" color={t.danger}>
            {error}
          </T>
        </View>
      ) : hint ? (
        <T v="small" muted>
          {hint}
        </T>
      ) : null}
    </View>
  );
}

export function ToggleRow({ label, sub, value, onChange, disabled }: { label: string; sub?: string; value: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  const t = useTheme();
  return (
    <Row style={{ minHeight: 48, justifyContent: 'space-between', opacity: disabled ? 0.5 : 1 }}>
      <View style={{ flex: 1 }}>
        <T>{label}</T>
        {sub ? (
          <T v="small" muted>
            {sub}
          </T>
        ) : null}
      </View>
      <Switch accessibilityLabel={label} accessibilityHint={sub} accessibilityRole="switch" accessibilityState={{ checked: value, disabled: !!disabled }} value={value} onValueChange={(v) => {
        haptic.select();
        onChange(v);
      }} disabled={disabled} trackColor={{ true: t.primaryInk, false: t.surface2 }} thumbColor={t.primaryText} />
    </Row>
  );
}

export function ListItem({ title, sub, right, icon, iconColor, onPress }: { title: string; sub?: string; right?: React.ReactNode; icon?: IconName; iconColor?: string; onPress?: () => void }) {
  const t = useTheme();
  const content = (
    <Row style={{ minHeight: 52, paddingVertical: 6 }}>
      {icon ? (
        <View style={{ width: 36, height: 36, borderRadius: 10, backgroundColor: alpha(iconColor ?? t.primary, 0.15), alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={icon} size={18} color={iconColor ?? t.primary} />
        </View>
      ) : null}
      <View style={{ flex: 1 }}>
        <T numberOfLines={1} style={{ fontWeight: '600' }}>
          {title}
        </T>
        {sub ? (
          <T v="small" muted numberOfLines={2}>
            {sub}
          </T>
        ) : null}
      </View>
      {right}
      {onPress && !right ? <Ionicons name="chevron-forward" size={18} color={t.textMuted} /> : null}
    </Row>
  );
  if (!onPress) return content;
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={title} onPress={onPress} style={({ pressed }) => ({ opacity: pressed ? 0.7 : 1 })}>
      {content}
    </Pressable>
  );
}

/* ---------- Feedback ---------- */
export function Banner({ kind = 'info', title, text, icon, action }: { kind?: 'info' | 'warning' | 'danger' | 'success' | 'demo'; title?: string; text: string; icon?: IconName; action?: React.ReactNode }) {
  const t = useTheme();
  const tint = useTint();
  const c = { info: t.info, warning: t.warning, danger: t.danger, success: t.success, demo: t.accent }[kind];
  const ic: IconName = icon ?? ({ info: 'information-circle', warning: 'warning', danger: 'alert-circle', success: 'checkmark-circle', demo: 'flask' } as const)[kind];
  return (
    <View style={{ flexDirection: 'row', gap: 10, padding: 12, borderRadius: t.radius, backgroundColor: tint(c, 0.12, t.bg), borderWidth: 1, borderColor: tint(c, 0.35, t.bg) }}>
      <Ionicons name={ic} size={20} color={ensureContrast(c, mix(c, t.bg, 0.12), t.text, 3)} />
      <View style={{ flex: 1, gap: 2 }}>
        {title ? <T style={{ fontWeight: '700' }}>{title}</T> : null}
        <T v="small">{text}</T>
        {action ? <View style={{ marginTop: 6 }}>{action}</View> : null}
      </View>
    </View>
  );
}

export function DemoBadge({ label = 'Démo / Échantillon' }: { label?: string }) {
  const t = useTheme();
  return <Badge label={label} color={t.accent} icon="flask" />;
}

export function OfflineBadge({ text = 'Hors ligne — données en cache' }: { text?: string }) {
  const online = useOnline();
  const t = useTheme();
  if (online) return null;
  return (
    <View accessibilityRole="alert" style={{ backgroundColor: t.warning, paddingVertical: 6, paddingHorizontal: 12, flexDirection: 'row', gap: 6, alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="cloud-offline" size={14} color={t.onWarning} />
      <Text style={{ color: t.onWarning, fontWeight: '700', fontSize: 12 }}>{text}</Text>
    </View>
  );
}

export function EmptyState({ icon = 'sparkles', title, text, action }: { icon?: IconName; title: string; text?: string; action?: React.ReactNode }) {
  const t = useTheme();
  const reduce = useReduceMotion();
  const enter = useEntrance(reduce);
  const ink = inkOf(t);
  const tint = useTint();
  return (
    <Animated.View style={[{ alignItems: 'center', paddingVertical: 36, paddingHorizontal: 24, gap: 10 }, enter]}>
      <View style={{ width: 96, height: 96, borderRadius: 48, backgroundColor: tint(t.primary, t.dark ? 0.1 : 0.07, t.bg), alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
        <View style={{ width: 68, height: 68, borderRadius: 34, backgroundColor: tint(t.primary, t.dark ? 0.2 : 0.14, t.bg), alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name={icon} size={30} color={ensureContrast(ink, mix(t.primary, mix(t.primary, t.bg, t.dark ? 0.1 : 0.07), t.dark ? 0.2 : 0.14), t.text, 3)} />
        </View>
      </View>
      <T v="h2" center>
        {title}
      </T>
      {text ? (
        <T v="body" muted center style={{ maxWidth: 420 }}>
          {text}
        </T>
      ) : null}
      {action ? <View style={{ marginTop: 6 }}>{action}</View> : null}
    </Animated.View>
  );
}

export function Skeleton({ height = 16, width = '100%', style }: { height?: number; width?: number | `${number}%`; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const op = useRef(new Animated.Value(0.4)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 1, duration: 650, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(op, { toValue: 0.4, duration: 650, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [op]);
  return <Animated.View style={[{ height, width, borderRadius: 8, backgroundColor: t.surface2, opacity: op }, style]} />;
}

export function Progress({ value, color, height = 8 }: { value: number; color?: string; height?: number }) {
  const t = useTheme();
  const reduce = useReduceMotion();
  const v = Math.max(0, Math.min(1, value));
  const w = useRef(new Animated.Value(v)).current;
  useEffect(() => {
    if (reduce) {
      w.setValue(v);
      return;
    }
    const a = Animated.spring(w, { toValue: v, useNativeDriver: false, damping: 20, stiffness: 160 });
    a.start();
    return () => a.stop();
  }, [v, w, reduce]);
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }} style={{ height, borderRadius: height / 2, backgroundColor: t.surface2, overflow: 'hidden' }}>
      <Animated.View style={{ width: w.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }), height: '100%', backgroundColor: color ?? t.primary, borderRadius: height / 2 }} />
    </View>
  );
}

export function Stat({ label, value, sub, color, demo }: { label: string; value: string; sub?: string; color?: string; demo?: boolean }) {
  const t = useTheme();
  return (
    <View style={{ flexGrow: 1, flexBasis: 140, backgroundColor: t.surface, borderRadius: t.radius, borderWidth: StyleSheet.hairlineWidth, borderColor: t.border, padding: 12, gap: 2 }}>
      <Row style={{ justifyContent: 'space-between' }}>
        <T v="caption" muted>
          {label}
        </T>
        {demo ? <Ionicons name="flask" size={12} color={t.accent} accessibilityLabel="Donnée de démonstration" /> : null}
      </Row>
      <T v="h1" color={color}>
        {value}
      </T>
      {sub ? (
        <T v="small" muted>
          {sub}
        </T>
      ) : null}
    </View>
  );
}

export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const solid = useReduceTransparency();
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={onClose} style={{ flex: 1, backgroundColor: solid ? (t.dark ? '#000000' : '#3A3A3C') : t.overlay }} />
      <View style={{ backgroundColor: t.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '88%', paddingBottom: insets.bottom + 12 }}>
        <View style={{ width: '100%', maxWidth: 820, alignSelf: 'center' }}>
          <Row style={{ padding: 16, paddingBottom: 6, justifyContent: 'space-between' }}>
            <T v="h2">{title}</T>
            <IconButton icon="close" a11y="Fermer" onPress={onClose} />
          </Row>
        </View>
        <ScrollView keyboardShouldPersistTaps="handled" contentContainerStyle={{ width: '100%', maxWidth: 820, alignSelf: 'center', padding: 16, paddingTop: 4, gap: 12 }}>
          {children}
        </ScrollView>
      </View>
    </Modal>
  );
}

/* ---------- Toasts ---------- */
type Toast = { id: number; text: string; kind: 'info' | 'success' | 'error' };
const ToastCtx = createContext<(text: string, kind?: Toast['kind']) => void>(() => {});
export const useToast = () => useContext(ToastCtx);

function ToastView({ x }: { x: Toast }) {
  const t = useTheme();
  const reduce = useReduceMotion();
  const enter = useEntrance(reduce, 0, 16);
  const bg = t.toastBg;
  const fg = t.toastText;
  const tone = x.kind === 'error' ? t.danger : x.kind === 'success' ? t.success : t.info;
  return (
    <Animated.View
      accessibilityLiveRegion="polite"
      style={[
        {
          maxWidth: 520,
          marginHorizontal: 16,
          paddingVertical: 12,
          paddingHorizontal: 14,
          borderRadius: 16,
          backgroundColor: bg,
          flexDirection: 'row',
          gap: 10,
          alignItems: 'center',
          ...elevation(t, 3),
        },
        enter,
      ]}
    >
      <View style={{ width: 26, height: 26, borderRadius: 13, backgroundColor: tone, alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={x.kind === 'error' ? 'alert' : x.kind === 'success' ? 'checkmark' : 'information'} size={16} color={bestInk(tone)} />
      </View>
      <Text style={{ color: fg, fontWeight: '600', fontSize: 14 * t.fontScale, flexShrink: 1 }}>{x.text}</Text>
    </Animated.View>
  );
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const insets = useSafeAreaInsets();
  const push = useCallback((text: string, kind: Toast['kind'] = 'info') => {
    const id = Date.now() + Math.random();
    if (kind === 'success') haptic.success();
    else if (kind === 'error') haptic.error();
    announce(text);
    setToasts((x) => [...x.slice(-2), { id, text, kind }]);
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), kind === 'error' ? 4200 : 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 72, alignItems: 'center', gap: 8 }}>
        {toasts.map((x) => (
          <ToastView key={x.id} x={x} />
        ))}
      </View>
    </ToastCtx.Provider>
  );
}

/* ---------- Boot sans "Loading" infini (plafond 8 s) ---------- */
const BOOT_CAP_MS = 8000;

export function BootGate({ hydrate, children, appName, timeoutMs = BOOT_CAP_MS }: { hydrate: () => Promise<void>; children: React.ReactNode; appName: string; timeoutMs?: number }) {
  const [state, setState] = useState<'loading' | 'ready' | 'fallback'>('loading');
  const t = useTheme();
  const gen = useRef(0);
  const cap = Math.min(Math.max(timeoutMs, 1), BOOT_CAP_MS);
  const run = useCallback(() => {
    const id = ++gen.current;
    setState('loading');
    const timer = setTimeout(() => {
      if (gen.current === id) setState('fallback');
    }, cap);
    withTimeout(hydrate(), cap)
      .then(() => {
        if (gen.current !== id) return;
        clearTimeout(timer);
        setState('ready');
      })
      .catch(() => {
        if (gen.current !== id) return;
        clearTimeout(timer);
        setState((cur) => (cur === 'ready' ? cur : 'fallback'));
      });
  }, [hydrate, cap]);
  useEffect(() => {
    run();
  }, [run]);

  if (state === 'ready') return <>{children}</>;
  if (state === 'loading')
    return (
      <View style={{ flex: 1, backgroundColor: t.bg, padding: 24, gap: 14, justifyContent: 'center', maxWidth: 520, width: '100%', alignSelf: 'center' }}>
        <T v="h2" center>
          {appName}
        </T>
        <View accessible accessibilityRole="progressbar" accessibilityLabel={appName} style={{ gap: 14 }}>
          <View style={{ flexDirection: 'row', gap: 12, alignItems: 'center' }}>
            <Skeleton height={44} width={44} style={{ borderRadius: 22 }} />
            <View style={{ flex: 1, gap: 8 }}>
              <Skeleton height={14} width="60%" />
              <Skeleton height={12} width="40%" />
            </View>
          </View>
          <Skeleton height={96} style={{ borderRadius: t.radius }} />
          <Skeleton height={96} style={{ borderRadius: t.radius }} />
          <Skeleton height={64} width="80%" style={{ borderRadius: t.radius }} />
        </View>
      </View>
    );
  return (
    <View accessibilityRole="alert" style={{ flex: 1, backgroundColor: t.bg, padding: 24, gap: 14, justifyContent: 'center', maxWidth: 520, width: '100%', alignSelf: 'center' }}>
      <Banner kind="warning" title="Chargement plus long que prévu" text="Le stockage local ne répond pas. Vous pouvez réessayer ou continuer avec ce qui est déjà en mémoire. Rien n’est réécrit sur l’appareil tant que la lecture n’a pas abouti." />
      <Button title="Réessayer" icon="refresh" onPress={run} />
      <Button
        title="Continuer hors ligne"
        kind="secondary"
        onPress={() => {
          gen.current += 1;
          setState('ready');
        }}
      />
    </View>
  );
}
