import { useRef, useState, type ReactNode } from 'react';
import { findNodeHandle, Pressable, ScrollView, Text, View, type ViewProps } from 'react-native';

/** Marges salon à 1920×1080 : rien ne touche le bord de l’écran. */
export const tvSafe = { paddingHorizontal: 90, paddingTop: 60, paddingBottom: 80 };

type GuideProps = ViewProps & {
  trapFocusUp?: boolean;
  trapFocusDown?: boolean;
  trapFocusLeft?: boolean;
  trapFocusRight?: boolean;
};

const native = require('react-native') as { TVFocusGuideView?: (props: GuideProps) => ReactNode };
export const TvFocusGuide = native.TVFocusGuideView ?? View;

export function TvScreen({ children }: { children: ReactNode }) {
  return (
    <TvFocusGuide style={{ flex: 1, backgroundColor: '#14110F' }} trapFocusUp trapFocusDown trapFocusLeft trapFocusRight>
      {children}
    </TvFocusGuide>
  );
}

export function TvScroll({ children }: { children: ReactNode }) {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#14110F' }} contentContainerStyle={tvSafe}>
      {children}
    </ScrollView>
  );
}

/** Un seul habillage de focus : fond clair, bord épais, échelle 1,08, halo. Le reste est plus sombre. */
export function TvFocusable({
  label,
  hint,
  onPress,
  preferred,
  children,
  onFocused,
  scrollHandle,
}: {
  label: string;
  hint?: string;
  onPress?: () => void;
  preferred?: boolean;
  children?: ReactNode;
  onFocused?: (y: number) => void;
  scrollHandle?: number | null;
}) {
  const [focused, setFocused] = useState(false);
  const ref = useRef<{ measureLayout: (node: number, ok: (x: number, y: number) => void, err: () => void) => void } | null>(null);
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={hint ? `${label}. ${hint}` : label}
      hasTVPreferredFocus={preferred}
      onFocus={() => {
        setFocused(true);
        if (!ref.current || scrollHandle == null) return;
        ref.current.measureLayout(
          scrollHandle,
          (_x: number, y: number) => onFocused?.(y),
          () => undefined,
        );
      }}
      onBlur={() => setFocused(false)}
      onPress={onPress}
      style={{
        minHeight: 88,
        borderRadius: 22,
        paddingHorizontal: 28,
        paddingVertical: 18,
        justifyContent: 'center',
        opacity: focused ? 1 : 0.55,
        transform: [{ scale: focused ? 1.08 : 1 }],
        backgroundColor: focused ? '#F3D7C8' : '#2A211C',
        borderWidth: focused ? 6 : 2,
        borderColor: focused ? '#FFFFFF' : '#5C4A40',
        shadowColor: '#E28A62',
        shadowOpacity: focused ? 0.85 : 0,
        shadowRadius: focused ? 28 : 0,
        shadowOffset: { width: 0, height: 0 },
      }}
    >
      <View ref={ref as never} collapsable={false}>
      {children ?? (
        <>
          <Text style={{ color: focused ? '#2A160F' : '#F7F2EB', fontSize: 34, fontWeight: '800' }}>{label}</Text>
          {hint ? <Text style={{ color: focused ? '#4A3024' : '#D2C3B4', fontSize: 24, marginTop: 6 }}>{hint}</Text> : null}
        </>
      )}
      </View>
    </Pressable>
  );
}

export function scrollHandleOf(ref: { current: unknown }): number | null {
  if (!ref.current) return null;
  return findNodeHandle(ref.current as never) ?? null;
}
