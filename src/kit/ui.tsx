import { Ionicons } from '@expo/vector-icons';
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Animated,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
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
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useShell } from '@/lib/useShell';
import { motionMs, radii, space } from '@/theme';
import { announce, useFontScale, useReduceTransparency } from './a11y';
import { haptic, useReduceMotion } from './motion';
import { useOnline } from './net';
import { withTimeout } from './store';
import { alpha, useTheme } from './theme';
import { composite, relief, verreFor } from './verre';

export type IconName = React.ComponentProps<typeof Ionicons>['name'];
export { Ionicons };

function hovered(state: { pressed: boolean }): boolean {
  return Boolean((state as { hovered?: boolean }).hovered);
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
  accessibilityRole,
}: {
  v?: TVariant;
  color?: string;
  muted?: boolean;
  center?: boolean;
  style?: StyleProp<TextStyle>;
  children: React.ReactNode;
  numberOfLines?: number;
  selectable?: boolean;
  accessibilityRole?: 'header' | 'text' | 'summary';
}) {
  const t = useTheme();
  const fontScale = useFontScale();
  const s = sizes[v];
  const lines = numberOfLines != null && fontScale >= 1.3 ? undefined : numberOfLines;
  return (
    <Text
      accessibilityRole={accessibilityRole}
      allowFontScaling
      numberOfLines={lines}
      selectable={selectable}
      style={[
        {
          fontSize: s.fs * t.fontScale,
          fontWeight: s.fw,
          lineHeight: s.lh ? s.lh * t.fontScale : undefined,
          color: color ?? (muted ? t.textMuted : t.text),
          textAlign: center ? 'center' : undefined,
          letterSpacing: v === 'caption' || v === 'label' ? 0.4 : undefined,
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
  onRefresh,
  refreshing = false,
}: {
  children: React.ReactNode;
  scroll?: boolean;
  padded?: boolean;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  onRefresh?: () => void;
  refreshing?: boolean;
}) {
  const t = useTheme();
  const reduceT = useReduceTransparency();
  const verre = verreFor(t.dark);
  const insets = useSafeAreaInsets();
  const { contentMax } = useShell();
  const wide = contentMax >= 1040;
  const inner = (
    <View style={{ width: '100%', maxWidth: contentMax, alignSelf: 'center', padding: padded ? (wide ? space.xl : space.lg) : 0, gap: space.lg, paddingBottom: 96 }}>{children}</View>
  );
  return (
    <View style={{ flex: 1, backgroundColor: t.bg, paddingTop: insets.top }}>
      {reduceT ? null : (
        <View pointerEvents="none" style={[StyleSheet.absoluteFill, { zIndex: 0 }]}>
          <View style={{ position: 'absolute', width: 280, height: 280, borderRadius: 140, backgroundColor: verre.wash, top: -70, right: -50 }} />
          <View style={{ position: 'absolute', width: 220, height: 220, borderRadius: 110, backgroundColor: verre.wash2, bottom: 40, left: -60 }} />
        </View>
      )}
      <View style={{ flex: 1, zIndex: 1 }}>
        {header}
        {scroll ? (
          <ScrollView
            style={{ flex: 1 }}
            contentContainerStyle={{ flexGrow: 1 }}
            keyboardShouldPersistTaps="handled"
            refreshControl={onRefresh ? <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={t.primaryInk} colors={[t.primaryInk]} /> : undefined}
          >
            {inner}
          </ScrollView>
        ) : (
          <View style={{ flex: 1 }}>{inner}</View>
        )}
        {footer}
      </View>
    </View>
  );
}

export function Header({ title, subtitle, right, left }: { title: string; subtitle?: string; right?: React.ReactNode; left?: React.ReactNode }) {
  const { contentMax } = useShell();
  return (
    <View style={{ width: '100%', maxWidth: contentMax, alignSelf: 'center', paddingHorizontal: space.lg, paddingTop: space.md, paddingBottom: space.xs, flexDirection: 'row', alignItems: 'center', gap: space.sm }}>
      {left}
      <View style={{ flex: 1 }}>
        <T v="h1" numberOfLines={1} accessibilityRole="header">
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

function webBlur(enabled: boolean): ViewStyle {
  if (!enabled || Platform.OS !== 'web') return {};
  return { backdropFilter: 'blur(18px) saturate(1.4)' } as ViewStyle;
}

export function glassStyle(dark: boolean, reduceTransparency: boolean, radius: number = radii.lg): ViewStyle {
  const v = verreFor(dark);
  return {
    backgroundColor: reduceTransparency ? v.solid : v.fill,
    borderRadius: radius,
    borderWidth: 1,
    borderColor: reduceTransparency ? (dark ? '#3F362F' : '#E8DCCD') : v.stroke,
    borderTopColor: reduceTransparency ? (dark ? '#5C4E44' : '#FFFFFF') : v.highlight,
    ...webBlur(!reduceTransparency),
  };
}

/** Relief : ombre d’ambiance, ombre de contact, liseré clair. */
export function Raised({
  pressed = false,
  radius = radii.md,
  style,
  children,
}: {
  pressed?: boolean;
  radius?: number;
  style?: StyleProp<ViewStyle>;
  children: React.ReactNode;
}) {
  const t = useTheme();
  const reduce = useReduceMotion();
  const r = relief(t.dark, pressed, reduce);
  return (
    <View
      style={{
        borderRadius: radius,
        shadowColor: r.shadow,
        shadowOpacity: r.ambientOpacity,
        shadowRadius: r.ambientRadius,
        shadowOffset: { width: 0, height: r.ambientY },
        elevation: r.elevation,
        transform: r.translateY ? [{ translateY: r.translateY }] : undefined,
      }}
    >
      <View
        style={{
          borderRadius: radius,
          shadowColor: r.shadow,
          shadowOpacity: r.contactOpacity,
          shadowRadius: r.contactRadius,
          shadowOffset: { width: 0, height: r.contactY },
        }}
      >
        <View style={[{ borderRadius: radius, borderTopWidth: 1, borderTopColor: r.highlight, overflow: 'hidden' }, style]}>
          {pressed ? <View pointerEvents="none" style={[StyleSheet.absoluteFill, { backgroundColor: t.dark ? 'rgba(0,0,0,0.16)' : 'rgba(42,22,15,0.08)' }]} /> : null}
          {children}
        </View>
      </View>
    </View>
  );
}

export function Card({ children, style, onPress, accent, a11y }: { children: React.ReactNode; style?: StyleProp<ViewStyle>; onPress?: () => void; accent?: string; a11y?: string }) {
  const t = useTheme();
  const reduceT = useReduceTransparency();
  const face = glassStyle(t.dark, reduceT);
  const base: ViewStyle = {
    ...face,
    padding: space.lg,
    gap: space.sm,
    borderLeftWidth: accent ? 3 : 1,
    borderLeftColor: accent ?? face.borderColor,
  };
  const body = <View style={{ gap: space.sm }}>{children}</View>;
  if (onPress)
    return (
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={a11y}
        onPress={() => {
          haptic('light');
          onPress();
        }}
        style={style}
      >
        {(state) => (
          <Raised pressed={state.pressed} radius={radii.lg} style={[base, hovered(state) ? { borderColor: t.accent, borderWidth: 2 } : null]}>
            {body}
          </Raised>
        )}
      </Pressable>
    );
  return (
    <Raised radius={radii.lg} style={[base, style]}>
      {body}
    </Raised>
  );
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
  const reduceT = useReduceTransparency();
  const verre = verreFor(t.dark);
  const bg = { primary: t.primaryInk, secondary: reduceT ? t.surface : verre.fill, ghost: 'transparent', danger: t.danger, success: t.success }[kind];
  const fg = { primary: t.primaryText, secondary: t.text, ghost: t.primaryInk, danger: t.dark ? '#2A160F' : '#FFFFFF', success: t.dark ? '#10281C' : '#FFFFFF' }[kind];
  const face: ViewStyle = {
    minHeight: small ? 44 : 52,
    paddingHorizontal: small ? space.md : space.lg,
    backgroundColor: bg,
    borderWidth: kind === 'ghost' ? 1 : undefined,
    borderColor: kind === 'ghost' ? (reduceT ? t.border : verre.stroke) : undefined,
    borderTopWidth: 1,
    borderTopColor: verre.highlight,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: space.sm,
    opacity: disabled ? 0.45 : 1,
    alignSelf: 'stretch',
    ...webBlur(kind === 'secondary' && !reduceT),
  };
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={a11y ?? title}
      accessibilityState={{ disabled: !!disabled }}
      disabled={disabled || loading}
      onPress={() => {
        haptic(kind === 'danger' ? 'warn' : kind === 'primary' || kind === 'success' ? 'success' : 'light');
        onPress?.();
      }}
      style={[{ alignSelf: full ? 'stretch' : 'auto' }, style]}
    >
      {(state) => (
        <Raised pressed={state.pressed && !disabled} radius={radii.md} style={[face, hovered(state) && !disabled ? { borderColor: t.accent, borderWidth: 2 } : null]}>
          {loading ? <ActivityIndicator color={fg} /> : icon ? <Ionicons name={icon} size={small ? 16 : 18} color={fg} /> : null}
          <Text allowFontScaling style={{ color: fg, fontWeight: '700', fontSize: (small ? 13 : 15) * t.fontScale }}>
            {title}
          </Text>
        </Raised>
      )}
    </Pressable>
  );
}

export function IconButton({ icon, onPress, a11y, color, size = 22 }: { icon: IconName; onPress?: () => void; a11y: string; color?: string; size?: number }) {
  const t = useTheme();
  const reduceT = useReduceTransparency();
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={a11y} onPress={onPress} hitSlop={6} style={{ width: 44, height: 44 }}>
      {(state) => (
        <Raised pressed={state.pressed} radius={22} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center', backgroundColor: state.pressed || hovered(state) ? (reduceT ? t.surface2 : verreFor(t.dark).fill) : 'transparent' }}>
          <Ionicons name={icon} size={size} color={color ?? t.text} />
        </Raised>
      )}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, color, icon }: { label: string; selected?: boolean; onPress?: () => void; color?: string; icon?: IconName }) {
  const t = useTheme();
  const reduceT = useReduceTransparency();
  const c = color ?? t.primary;
  const verre = verreFor(t.dark);
  const selectedBg = reduceT ? (t.dark ? '#3A2A22' : '#F6E4D8') : alpha(c, t.dark ? 0.34 : 0.16);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ selected: !!selected }}
      onPress={() => {
        haptic('light');
        onPress?.();
      }}
    >
      {(state) => (
        <Raised
          pressed={state.pressed}
          radius={radii.pill}
          style={{
            minHeight: 44,
            paddingHorizontal: space.md,
            borderWidth: hovered(state) ? 2 : 1,
            borderColor: selected || hovered(state) ? c : reduceT ? t.border : verre.stroke,
            backgroundColor: selected ? selectedBg : hovered(state) ? alpha(c, 0.08) : reduceT ? t.surface : verre.fill,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 6,
          }}
        >
          {color ? <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: c }} /> : null}
          {icon ? <Ionicons name={icon} size={14} color={t.text} /> : null}
          <Text allowFontScaling style={{ color: t.text, fontWeight: selected ? '700' : '500', fontSize: 13 * t.fontScale }}>
            {label}
          </Text>
        </Raised>
      )}
    </Pressable>
  );
}

export function Badge({ label, color, icon }: { label: string; color?: string; icon?: IconName }) {
  const t = useTheme();
  const c = color ?? t.textMuted;
  const ink = t.text;
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, backgroundColor: alpha(c, 0.15) }}>
      {icon ? <Ionicons name={icon} size={12} color={ink} /> : null}
      <Text style={{ color: ink, fontSize: 11 * t.fontScale, fontWeight: '700' }}>{label}</Text>
    </View>
  );
}

export function Segmented<K extends string>({ options, value, onChange }: { options: { key: K; label: string }[]; value: K; onChange: (k: K) => void }) {
  const t = useTheme();
  const reduceT = useReduceTransparency();
  const verre = verreFor(t.dark);
  return (
    <View style={{ flexDirection: 'row', backgroundColor: reduceT ? t.surface2 : verre.fill, borderRadius: t.radius, padding: 3, borderWidth: 1, borderColor: reduceT ? t.border : verre.stroke }}>
      {options.map((o) => {
        const on = o.key === value;
        return (
          <Pressable
            key={o.key}
            accessibilityRole="button"
            accessibilityLabel={o.label}
            accessibilityState={{ selected: on }}
            onPress={() => onChange(o.key)}
            style={(state) => ({
              flex: 1,
              minHeight: 44,
              borderRadius: t.radius - 3,
              alignItems: 'center',
              justifyContent: 'center',
              paddingHorizontal: 6,
              backgroundColor: on ? (reduceT || !t.dark ? t.surface : t.primaryInk) : hovered(state) ? alpha(t.primary, 0.08) : 'transparent',
              borderWidth: hovered(state) ? 2 : 0,
              borderColor: t.accent,
            })}
          >
            <Text allowFontScaling style={{ color: on ? (reduceT || !t.dark ? t.text : t.primaryText) : t.textMuted, fontWeight: on ? '700' : '500', fontSize: 13 * t.fontScale, textAlign: 'center' }}>
              {o.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

/* ---------- Formulaires ---------- */
export function Field({ label, hint, error, ...props }: TextInputProps & { label: string; hint?: string; error?: string }) {
  const t = useTheme();
  const reduceT = useReduceTransparency();
  const verre = verreFor(t.dark);
  return (
    <View style={{ gap: 5 }}>
      <T v="label" muted>
        {label}
      </T>
      <TextInput
        placeholderTextColor={t.textMuted}
        accessibilityLabel={label}
        allowFontScaling
        {...props}
        style={[
          {
            minHeight: props.multiline ? 84 : 46,
            borderWidth: 1,
            borderColor: error ? t.danger : reduceT ? t.border : verre.stroke,
            borderTopColor: error ? t.danger : verre.highlight,
            borderRadius: t.radius - 2,
            paddingHorizontal: 12,
            paddingVertical: 10,
            color: t.text,
            backgroundColor: reduceT ? t.surface : verre.fill,
            fontSize: 15 * t.fontScale,
            textAlignVertical: props.multiline ? 'top' : 'center',
          },
          props.style,
        ]}
      />
      {error ? (
        <T v="small" color={t.danger}>
          {error}
        </T>
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
    <Pressable
      accessibilityRole="switch"
      accessibilityLabel={sub ? `${label}. ${sub}` : label}
      accessibilityState={{ checked: value, disabled: !!disabled }}
      disabled={disabled}
      onPress={() => onChange(!value)}
      style={{ minHeight: 48, opacity: disabled ? 0.5 : 1 }}
    >
      <Row style={{ minHeight: 48, justifyContent: 'space-between' }}>
        <View style={{ flex: 1 }}>
          <T>{label}</T>
          {sub ? (
            <T v="small" muted>
              {sub}
            </T>
          ) : null}
        </View>
        <Switch pointerEvents="none" importantForAccessibility="no-hide-descendants" value={value} onValueChange={onChange} disabled={disabled} trackColor={{ true: t.primaryInk, false: t.surface2 }} thumbColor={t.primaryText} />
      </Row>
    </Pressable>
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
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={sub ? `${title}. ${sub}` : title}
      onPress={onPress}
      style={(state) => ({ opacity: state.pressed ? 0.7 : 1, minHeight: 44, borderRadius: 12, backgroundColor: hovered(state) ? alpha(t.primary, 0.08) : 'transparent' })}
    >
      {content}
    </Pressable>
  );
}

/* ---------- Feedback ---------- */
export function Banner({ kind = 'info', title, text, icon, action }: { kind?: 'info' | 'warning' | 'danger' | 'success' | 'demo'; title?: string; text: string; icon?: IconName; action?: React.ReactNode }) {
  const t = useTheme();
  const reduceT = useReduceTransparency();
  const c = { info: t.info, warning: t.warning, danger: t.danger, success: t.success, demo: t.accent }[kind];
  const ic: IconName = icon ?? ({ info: 'information-circle', warning: 'warning', danger: 'alert-circle', success: 'checkmark-circle', demo: 'flask' } as const)[kind];
  const wash = reduceT ? composite(t.surface, c, 0.16) : alpha(c, 0.12);
  return (
    <View accessibilityRole="summary" style={{ flexDirection: 'row', gap: 10, padding: 12, borderRadius: t.radius, backgroundColor: wash, borderWidth: 1, borderColor: reduceT ? c : alpha(c, 0.35) }}>
      <Ionicons name={ic} size={20} color={c} />
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
  const reduceT = useReduceTransparency();
  return (
    <View style={{ alignItems: 'center', alignSelf: 'center', width: '100%', maxWidth: 420, padding: space.xxl, gap: space.md }}>
      <Raised radius={42} style={{ width: 84, height: 84, backgroundColor: reduceT ? t.surface2 : alpha(t.primary, 0.16), alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={36} color={t.primaryInk} />
      </Raised>
      <T v="h2" center>
        {title}
      </T>
      {text ? (
        <T muted center>
          {text}
        </T>
      ) : null}
      {action}
    </View>
  );
}

export function Skeleton({ height = 16, width = '100%', style }: { height?: number; width?: number | `${number}%`; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  const reduce = useReduceMotion();
  const op = useRef(new Animated.Value(reduce ? 0.7 : 0.4)).current;
  useEffect(() => {
    if (reduce) return;
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(op, { toValue: 1, duration: motionMs.slow, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(op, { toValue: 0.4, duration: motionMs.slow, useNativeDriver: Platform.OS !== 'web' }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [op, reduce]);
  return <Animated.View style={[{ height, width, borderRadius: 8, backgroundColor: t.surface2, opacity: op }, style]} />;
}

export function Progress({ value, color, height = 8 }: { value: number; color?: string; height?: number }) {
  const t = useTheme();
  const v = Math.max(0, Math.min(1, value));
  return (
    <View accessibilityRole="progressbar" accessibilityValue={{ min: 0, max: 100, now: Math.round(v * 100) }} style={{ height, borderRadius: height / 2, backgroundColor: t.surface2, overflow: 'hidden' }}>
      <View style={{ width: `${v * 100}%`, height: '100%', backgroundColor: color ?? t.primary, borderRadius: height / 2 }} />
    </View>
  );
}

export function Stat({ label, value, sub, color, demo }: { label: string; value: string; sub?: string; color?: string; demo?: boolean }) {
  const t = useTheme();
  const reduceT = useReduceTransparency();
  return (
    <Raised radius={t.radius} style={[{ flexGrow: 1, flexBasis: 140, padding: 12, gap: 2 }, glassStyle(t.dark, reduceT, t.radius)]}>
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
    </Raised>
  );
}

export function Sheet({ visible, onClose, title, children }: { visible: boolean; onClose: () => void; title: string; children: React.ReactNode }) {
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const reduce = useReduceMotion();
  const edge = verreFor(t.dark).highlight;
  return (
    <Modal visible={visible} transparent animationType={reduce ? 'none' : 'slide'} onRequestClose={onClose}>
      <Pressable accessibilityRole="button" accessibilityLabel="Fermer" onPress={onClose} style={{ flex: 1, backgroundColor: t.overlay }} />
      <View style={{ maxHeight: '88%', paddingBottom: insets.bottom + space.md, borderTopLeftRadius: radii.xl, borderTopRightRadius: radii.xl, backgroundColor: t.surface, borderTopWidth: 1, borderTopColor: edge, shadowColor: t.shadow, shadowOpacity: t.dark ? 0.5 : 0.18, shadowRadius: 24, shadowOffset: { width: 0, height: -8 }, elevation: 12 }}>
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

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const t = useTheme();
  const insets = useSafeAreaInsets();
  const push = useCallback((text: string, kind: Toast['kind'] = 'info') => {
    const id = Date.now() + Math.random();
    setToasts((x) => [...x, { id, text, kind }]);
    announce(text);
    setTimeout(() => setToasts((x) => x.filter((y) => y.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={push}>
      {children}
      <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, bottom: insets.bottom + 72, alignItems: 'center', gap: 8 }}>
        {toasts.map((x) => (
          <View
            key={x.id}
            accessibilityLiveRegion="polite"
            style={{
              maxWidth: 520,
              marginHorizontal: 16,
              paddingVertical: 10,
              paddingHorizontal: 14,
              borderRadius: 12,
              backgroundColor: x.kind === 'error' ? t.danger : x.kind === 'success' ? t.success : t.toastBg,
              flexDirection: 'row',
              gap: 8,
              alignItems: 'center',
            }}
          >
            <Ionicons name={x.kind === 'error' ? 'alert-circle' : x.kind === 'success' ? 'checkmark-circle' : 'information-circle'} size={18} color={t.toastText} />
            <Text style={{ color: t.toastText, fontWeight: '600' }}>{x.text}</Text>
          </View>
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
        <Skeleton height={22} />
        <Skeleton height={90} />
        <Skeleton height={90} />
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
