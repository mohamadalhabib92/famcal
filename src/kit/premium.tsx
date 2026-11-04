import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { AccessibilityInfo, Animated, Pressable, StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { alpha, useTheme } from './theme';
import { Button, Ionicons, Skeleton, T, type IconName } from './ui';
import { haptic } from './haptics';
import { nativeDriver, SPRING, useEntrance, useSystemReduceMotion } from './motion';
import { elevation, useReduceMotion } from './ui';

/* ---------- Chargement : squelettes à la forme du contenu ---------- */

/** Carte fantôme : titre, deux lignes, à la place d’un spinner. */
export function SkeletonCard({ lines = 2, avatar, style }: { lines?: number; avatar?: boolean; style?: StyleProp<ViewStyle> }) {
  const t = useTheme();
  return (
    <View
      accessibilityElementsHidden
      importantForAccessibility="no-hide-descendants"
      style={[{ backgroundColor: t.surface, borderRadius: t.radius, borderWidth: StyleSheet.hairlineWidth, borderColor: t.border, padding: 16, gap: 10, flexDirection: 'row' }, elevation(t, 1), style]}
    >
      {avatar ? <Skeleton width={40} height={40} style={{ borderRadius: 20 }} /> : null}
      <View style={{ flex: 1, gap: 10 }}>
        <Skeleton height={16} width="60%" />
        {Array.from({ length: lines }).map((_, i) => (
          <Skeleton key={i} height={12} width={i === lines - 1 ? '45%' : '90%'} />
        ))}
      </View>
    </View>
  );
}

/** Liste fantôme annoncée une seule fois aux lecteurs d’écran. */
export function SkeletonList({ count = 3, avatar, label }: { count?: number; avatar?: boolean; label: string }) {
  return (
    <View accessible accessibilityRole="progressbar" accessibilityLabel={label} accessibilityState={{ busy: true }} style={{ gap: 12 }}>
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} avatar={avatar} lines={i % 2 ? 1 : 2} />
      ))}
    </View>
  );
}

/* ---------- Erreur : message humain + action pour réessayer ---------- */

export function ErrorState({
  title,
  text,
  retryLabel,
  onRetry,
  icon = 'cloud-offline-outline',
  secondary,
}: {
  title: string;
  text?: string;
  retryLabel?: string;
  onRetry?: () => void;
  icon?: IconName;
  secondary?: React.ReactNode;
}) {
  const t = useTheme();
  const reduce = useReduceMotion();
  const enter = useEntrance(reduce);
  return (
    <Animated.View accessibilityRole="alert" style={[{ alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24, gap: 10 }, enter]}>
      <View style={{ width: 72, height: 72, borderRadius: 36, backgroundColor: alpha(t.warning, 0.14), alignItems: 'center', justifyContent: 'center' }}>
        <Ionicons name={icon} size={32} color={t.warning} />
      </View>
      <T v="h2" center>
        {title}
      </T>
      {text ? (
        <T v="body" muted center style={{ maxWidth: 420 }}>
          {text}
        </T>
      ) : null}
      {onRetry && retryLabel ? (
        <Button
          title={retryLabel}
          icon="refresh"
          onPress={() => {
            haptic.tap();
            onRetry();
          }}
          style={{ marginTop: 8, minWidth: 180 }}
        />
      ) : null}
      {secondary}
    </Animated.View>
  );
}

/* ---------- Moments de réussite : discrets, courts, accessibles ---------- */

type Celebration = { title: string; sub?: string; icon?: IconName };
const CelebrateCtx = createContext<(c: Celebration) => void>(() => {});
/** `celebrate({ title })` : coche animée + haptique de réussite, 1,6 s. */
export const useCelebrate = () => useContext(CelebrateCtx);

export function DelightProvider({ children }: { children: React.ReactNode }) {
  const [current, setCurrent] = useState<(Celebration & { id: number }) | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const celebrate = useCallback((c: Celebration) => {
    if (timer.current) clearTimeout(timer.current);
    haptic.success();
    AccessibilityInfo.announceForAccessibility?.(c.sub ? `${c.title}. ${c.sub}` : c.title);
    setCurrent({ ...c, id: Date.now() });
    timer.current = setTimeout(() => setCurrent(null), 1700);
  }, []);
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);
  return (
    <CelebrateCtx.Provider value={celebrate}>
      {children}
      {current ? <CelebrationView key={current.id} c={current} onDone={() => setCurrent(null)} /> : null}
    </CelebrateCtx.Provider>
  );
}

function CelebrationView({ c, onDone }: { c: Celebration; onDone: () => void }) {
  const t = useTheme();
  const reduce = useReduceMotion();
  const pop = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  const ring = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    if (reduce) return;
    Animated.parallel([
      Animated.spring(pop, { toValue: 1, useNativeDriver: nativeDriver, damping: 12, stiffness: 220, mass: 0.9 }),
      Animated.timing(ring, { toValue: 1, duration: 900, useNativeDriver: nativeDriver }),
    ]).start();
  }, [pop, ring, reduce]);
  return (
    <View pointerEvents="box-none" style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
      <Pressable accessibilityRole="button" accessibilityLabel={c.title} onPress={onDone} style={{ alignItems: 'center' }}>
        <Animated.View
          style={[
            {
              alignItems: 'center',
              gap: 10,
              paddingVertical: 22,
              paddingHorizontal: 28,
              borderRadius: 24,
              backgroundColor: t.surface,
              borderWidth: StyleSheet.hairlineWidth,
              borderColor: t.border,
              maxWidth: 320,
              opacity: pop,
              transform: [{ scale: pop.interpolate({ inputRange: [0, 1], outputRange: [0.86, 1] }) }],
            },
            elevation(t, 3),
          ]}
        >
          <View style={{ width: 64, height: 64, alignItems: 'center', justifyContent: 'center' }}>
            {!reduce ? (
              <Animated.View
                style={{
                  position: 'absolute',
                  width: 64,
                  height: 64,
                  borderRadius: 32,
                  borderWidth: 2,
                  borderColor: t.success,
                  opacity: ring.interpolate({ inputRange: [0, 1], outputRange: [0.6, 0] }),
                  transform: [{ scale: ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.7] }) }],
                }}
              />
            ) : null}
            <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: alpha(t.success, 0.16), alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={c.icon ?? 'checkmark'} size={30} color={t.success} />
            </View>
          </View>
          <T v="h3" center>
            {c.title}
          </T>
          {c.sub ? (
            <T v="small" muted center>
              {c.sub}
            </T>
          ) : null}
        </Animated.View>
      </Pressable>
    </View>
  );
}

/** Ressort réutilisable pour une entrée en liste (décalage par index). */
export function FadeIn({ children, index = 0, style }: { children: React.ReactNode; index?: number; style?: StyleProp<ViewStyle> }) {
  const reduce = useReduceMotion();
  const enter = useEntrance(reduce, Math.min(index, 6) * 40);
  return <Animated.View style={[enter, style]}>{children}</Animated.View>;
}

export { useSystemReduceMotion, SPRING };

/** Petit « pop » en ressort au montage (trophée, coche, badge). */
export function Pop({ children, delay = 0, style }: { children: React.ReactNode; delay?: number; style?: StyleProp<ViewStyle> }) {
  const reduce = useReduceMotion();
  const v = useRef(new Animated.Value(reduce ? 1 : 0)).current;
  useEffect(() => {
    if (reduce) return;
    const a = Animated.spring(v, { toValue: 1, delay, useNativeDriver: nativeDriver, damping: 11, stiffness: 200, mass: 0.9 });
    a.start();
    return () => a.stop();
  }, [v, reduce, delay]);
  return <Animated.View style={[{ opacity: v, transform: [{ scale: v.interpolate({ inputRange: [0, 1], outputRange: [0.6, 1] }) }] }, style]}>{children}</Animated.View>;
}
