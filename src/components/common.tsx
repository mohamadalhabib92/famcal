import React from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme, alpha } from '@/kit/theme';
import { Badge, DemoBadge, Header, IconButton, Ionicons, Row, T } from '@/kit/ui';
import { fmtTime } from '@/kit/format';
import { MEMBER_COLORS } from '@/theme';
import { eventVisibility, fromMin, me, memberById, roleLabel, store, toMin, type CalEvent, type Member } from '@/state';

export function BackHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const router = useRouter();
  const demo = store.useSelect((s) => s.isDemo);
  return (
    <Header
      title={title}
      subtitle={subtitle}
      left={<IconButton icon="chevron-back" a11y="Retour" onPress={() => (router.canGoBack() ? router.back() : router.replace('/'))} />}
      right={right ?? (demo ? <DemoBadge label="Démo" /> : undefined)}
    />
  );
}

/** En-tête d'onglet : nom de la famille + « vous êtes ». */
export function TabHeader({ title, subtitle, right }: { title: string; subtitle?: string; right?: React.ReactNode }) {
  const router = useRouter();
  const s = store.use();
  const m = me(s);
  return (
    <Header
      title={title}
      subtitle={subtitle}
      right={
        <Row gap={6}>
          {right}
          {s.isDemo ? <DemoBadge label="Démo" /> : null}
          {m ? (
            <Pressable accessibilityRole="button" accessibilityLabel={`Vous : ${m.name}, ${roleLabel(m.role)}`} onPress={() => router.push('/reglages')} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
              <Avatar m={m} size={34} />
            </Pressable>
          ) : null}
        </Row>
      }
    />
  );
}

export function Avatar({ m, size = 36 }: { m: Pick<Member, 'name' | 'color' | 'managed'>; size?: number }) {
  const initials = m.name
    .split(/\s+/)
    .map((w) => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
  return (
    <View style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: m.color, alignItems: 'center', justifyContent: 'center', borderWidth: m.managed ? 2 : 0, borderColor: '#FFFFFF', borderStyle: 'dashed' }}>
      <T v="label" color="#FFFFFF" style={{ fontSize: size * 0.38 }}>
        {initials}
      </T>
    </View>
  );
}

export function Dots({ ids, size = 10 }: { ids: string[]; size?: number }) {
  const s = store.use();
  return (
    <Row gap={3}>
      {ids.slice(0, 5).map((id) => (
        <View key={id} style={{ width: size, height: size, borderRadius: size / 2, backgroundColor: memberById(s, id)?.color ?? '#999' }} />
      ))}
    </Row>
  );
}

export function ColorPicker({ value, onChange }: { value: string; onChange: (c: string) => void }) {
  const t = useTheme();
  return (
    <Row wrap gap={8}>
      {MEMBER_COLORS.map((c) => (
        <Pressable
          key={c}
          accessibilityRole="radio"
          accessibilityState={{ selected: value === c }}
          accessibilityLabel={`Couleur ${c}`}
          onPress={() => onChange(c)}
          style={{ width: 44, height: 44, borderRadius: 22, backgroundColor: c, alignItems: 'center', justifyContent: 'center', borderWidth: value === c ? 3 : 0, borderColor: t.text }}
        >
          {value === c ? <Ionicons name="checkmark" size={20} color="#FFFFFF" /> : null}
        </Pressable>
      ))}
    </Row>
  );
}

export const timeRange = (e: CalEvent) => (e.start ? `${e.start} – ${fromMin(Math.min(toMin(e.start) + e.durationMin, 24 * 60 - 1))}` : 'Journée');

/** Ligne d'événement (respecte la confidentialité des profils mineurs). */
export function EventRow({ ev, conflict, onPress, compact }: { ev: CalEvent; conflict?: boolean; onPress?: () => void; compact?: boolean }) {
  const t = useTheme();
  const s = store.use();
  const vis = eventVisibility(s, me(s), ev);
  const color = memberById(s, ev.memberIds[0] ?? '')?.color ?? t.primary;
  const names = ev.memberIds.map((id) => memberById(s, id)?.name ?? '?').join(', ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${vis === 'full' ? ev.title : 'Occupé'}, ${timeRange(ev)}, ${names}${conflict ? ', conflit' : ''}`}
      onPress={onPress}
      style={({ pressed }) => ({
        flexDirection: 'row',
        gap: 10,
        minHeight: 48,
        padding: compact ? 8 : 12,
        borderRadius: t.radius - 4,
        backgroundColor: pressed ? alpha(color, 0.18) : alpha(color, 0.1),
        borderLeftWidth: 4,
        borderLeftColor: color,
        alignItems: 'center',
      })}
    >
      <View style={{ width: compact ? 96 : 100 }}>
        <T v="small" muted>
          {timeRange(ev)}
        </T>
      </View>
      <View style={{ flex: 1, gap: 2 }}>
        <T v="label" numberOfLines={1}>
          {vis === 'full' ? ev.title : 'Occupé'}
          {ev.repeat === 'weekly' ? '  ↻' : ''}
        </T>
        {!compact ? (
          <T v="small" muted numberOfLines={1}>
            {names}
            {vis === 'full' && ev.location ? ` · ${ev.location}` : ''}
          </T>
        ) : null}
      </View>
      {vis === 'busy' ? <Ionicons name="lock-closed" size={16} color={t.textMuted} /> : null}
      {conflict ? <Badge label="Conflit" color={t.danger} icon="warning" /> : <Dots ids={ev.memberIds} />}
    </Pressable>
  );
}

export const nowHHMM = () => {
  const d = new Date();
  const m = Math.min(Math.ceil((d.getHours() * 60 + d.getMinutes()) / 30) * 30 + 30, 22 * 60);
  return fromMin(m);
};
export { fmtTime };
