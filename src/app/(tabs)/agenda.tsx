import React, { useMemo } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme, alpha } from '@/kit/theme';
import { Banner, Button, Chip, EmptyState, IconButton, Row, Screen, Segmented, T, Ionicons } from '@/kit/ui';
import { DAYS_FR, DAYS_FR_SHORT, MONTHS_FR, fmtDate, isoDay } from '@/kit/format';
import { Dots, EventRow, TabHeader } from '@/components/common';
import { addDays, dayOccurrences, eventVisibility, me, parseDay, setPrefs, store, weekStart, type Occurrence, type View as CalView } from '@/state';

export default function Agenda() {
  const t = useTheme();
  const router = useRouter();
  const s = store.use();
  const { width } = useWindowDimensions();
  const { view, cursor, hidden } = s.prefs;
  const today = isoDay(new Date());

  const days = useMemo(() => {
    if (view === 'jour') return [cursor];
    if (view === 'semaine') return Array.from({ length: 7 }, (_, i) => addDays(weekStart(cursor), i));
    const first = parseDay(cursor);
    first.setDate(1);
    const start = weekStart(isoDay(first));
    return Array.from({ length: 42 }, (_, i) => addDays(start, i));
  }, [view, cursor]);

  const occ = useMemo(() => {
    const m: Record<string, Occurrence[]> = {};
    for (const d of days) m[d] = dayOccurrences(s, d, hidden);
    return m;
  }, [s, days, hidden]);

  const conflicts = (view === 'mois' ? days.filter((d) => d.slice(0, 7) === cursor.slice(0, 7)) : days).reduce((n, d) => n + occ[d].filter((o) => o.conflict).length, 0);

  const step = (dir: 1 | -1) => {
    if (view === 'jour') setPrefs({ cursor: addDays(cursor, dir) });
    else if (view === 'semaine') setPrefs({ cursor: addDays(cursor, 7 * dir) });
    else {
      const d = parseDay(cursor);
      d.setDate(1);
      d.setMonth(d.getMonth() + dir);
      setPrefs({ cursor: isoDay(d) });
    }
  };
  const c = parseDay(cursor);
  const title =
    view === 'jour'
      ? `${DAYS_FR[c.getDay()]} ${fmtDate(cursor, false)}`
      : view === 'semaine'
        ? `Semaine du ${fmtDate(weekStart(cursor), false)}`
        : `${MONTHS_FR[c.getMonth()]} ${c.getFullYear()}`;

  const newEvent = (day?: string) => router.push({ pathname: '/event/edit', params: { date: day ?? cursor } });
  const open = (id: string) => router.push({ pathname: '/event/[id]', params: { id } });
  const total = days.reduce((n, d) => n + occ[d].length, 0);

  return (
    <View style={{ flex: 1 }}>
      <Screen header={<TabHeader title={s.family?.name ?? 'Agenda'} subtitle="Calendrier familial partagé" />}>
        <Segmented<CalView>
          options={[
            { key: 'jour', label: 'Jour' },
            { key: 'semaine', label: 'Semaine' },
            { key: 'mois', label: 'Mois' },
          ]}
          value={view}
          onChange={(v) => setPrefs({ view: v })}
        />
        <Row style={{ justifyContent: 'space-between' }}>
          <IconButton icon="chevron-back" a11y="Période précédente" onPress={() => step(-1)} />
          <Pressable accessibilityRole="button" accessibilityLabel="Revenir à aujourd’hui" onPress={() => setPrefs({ cursor: today })} style={{ flex: 1, alignItems: 'center', minHeight: 44, justifyContent: 'center' }}>
            <T v="h3">
              {title.charAt(0).toUpperCase() + title.slice(1)}
            </T>
            {cursor !== today ? (
              <T v="caption" color={t.primary}>
                Aujourd’hui ↺
              </T>
            ) : null}
          </Pressable>
          <IconButton icon="chevron-forward" a11y="Période suivante" onPress={() => step(1)} />
        </Row>

        <Row wrap gap={6}>
          {s.members.map((m) => {
            const on = !hidden.includes(m.id);
            return <Chip key={m.id} label={m.name} color={m.color} selected={on} onPress={() => setPrefs({ hidden: on ? [...hidden, m.id] : hidden.filter((x) => x !== m.id) })} />;
          })}
        </Row>

        {conflicts > 0 ? <Banner kind="warning" title={`${conflicts} conflit${conflicts > 1 ? 's' : ''} sur la période`} text="Une même personne a deux événements qui se chevauchent. Touchez un événement marqué « Conflit » pour ajuster." /> : null}

        {view === 'mois' ? (
          <MonthGrid days={days} occ={occ} cursor={cursor} today={today} compact={width < 520} onPick={(d) => setPrefs({ cursor: d, view: 'jour' })} />
        ) : total === 0 ? (
          <EmptyState
            icon="calendar-clear"
            title={view === 'jour' ? 'Journée libre' : 'Semaine libre'}
            text={hidden.length ? 'Certains membres sont masqués par le filtre.' : 'Rien de prévu. Ajoutez un rendez-vous, une activité ou un rappel pour la famille.'}
            action={<Button title="Nouvel événement" icon="add" onPress={() => newEvent()} />}
          />
        ) : (
          days.map((d) => (
            <View key={d} style={{ gap: 6 }}>
              {view === 'semaine' ? (
                <Pressable accessibilityRole="button" accessibilityLabel={`Voir le ${fmtDate(d)}`} onPress={() => setPrefs({ cursor: d, view: 'jour' })} style={{ minHeight: 44, justifyContent: 'center' }}>
                  <Row gap={8}>
                    <T v="label" color={d === today ? t.primary : t.text} style={{ textTransform: 'capitalize' }}>
                      {DAYS_FR[parseDay(d).getDay()]} {parseDay(d).getDate()}
                    </T>
                    {d === today ? <T v="caption" color={t.primary}>aujourd’hui</T> : null}
                    {occ[d].length === 0 ? (
                      <T v="caption" muted>
                        — libre
                      </T>
                    ) : null}
                  </Row>
                </Pressable>
              ) : null}
              {occ[d].map((o) => (
                <EventRow key={o.ev.id + d} ev={o.ev} conflict={o.conflict} onPress={() => open(o.ev.id)} />
              ))}
            </View>
          ))
        )}
        <View style={{ height: 72 }} />
      </Screen>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Nouvel événement"
        onPress={() => newEvent()}
        style={({ pressed }) => ({
          position: 'absolute',
          right: 20,
          bottom: 20,
          width: 60,
          height: 60,
          borderRadius: 30,
          backgroundColor: pressed ? alpha(t.primary, 0.85) : t.primary,
          alignItems: 'center',
          justifyContent: 'center',
          shadowColor: '#000',
          shadowOpacity: 0.2,
          shadowRadius: 8,
          shadowOffset: { width: 0, height: 3 },
          elevation: 5,
        })}
      >
        <Ionicons name="add" size={32} color={t.primaryText} />
      </Pressable>
    </View>
  );
}

function MonthGrid({ days, occ, cursor, today, compact, onPick }: { days: string[]; occ: Record<string, Occurrence[]>; cursor: string; today: string; compact: boolean; onPick: (d: string) => void }) {
  const t = useTheme();
  const s = store.use();
  const viewer = me(s);
  const month = cursor.slice(0, 7);
  const head = [1, 2, 3, 4, 5, 6, 0].map((i) => DAYS_FR_SHORT[i]);
  return (
    <View style={{ gap: 4 }}>
      <Row gap={4}>
        {head.map((h) => (
          <T key={h} v="caption" muted center style={{ flex: 1 }}>
            {h}
          </T>
        ))}
      </Row>
      {Array.from({ length: 6 }, (_, w) => (
        <Row key={w} gap={4}>
          {days.slice(w * 7, w * 7 + 7).map((d) => {
            const list = occ[d];
            const ids = Array.from(new Set(list.flatMap((o) => o.ev.memberIds)));
            const out = d.slice(0, 7) !== month;
            const conflict = list.some((o) => o.conflict);
            return (
              <Pressable
                key={d}
                accessibilityRole="button"
                accessibilityLabel={`${fmtDate(d)} : ${list.length} événement${list.length > 1 ? 's' : ''}${conflict ? ', conflit' : ''}`}
                onPress={() => onPick(d)}
                style={{
                  flex: 1,
                  minHeight: compact ? 56 : 84,
                  borderRadius: 10,
                  padding: 5,
                  gap: 3,
                  backgroundColor: d === today ? alpha(t.primary, 0.12) : t.surface,
                  borderWidth: 1,
                  borderColor: conflict ? t.danger : d === today ? t.primary : t.border,
                  opacity: out ? 0.45 : 1,
                }}
              >
                <T v="label" color={d === today ? t.primary : t.text}>
                  {parseDay(d).getDate()}
                </T>
                {compact ? (
                  <Dots ids={ids} size={7} />
                ) : (
                  list.slice(0, 2).map((o) => (
                    <T key={o.ev.id} v="caption" numberOfLines={1} muted>
                      {o.ev.start ?? '•'} {eventVisibility(s, viewer, o.ev) === 'full' ? o.ev.title : 'Occupé'}
                    </T>
                  ))
                )}
                {!compact && list.length > 2 ? (
                  <T v="caption" color={t.primary}>
                    +{list.length - 2}
                  </T>
                ) : null}
              </Pressable>
            );
          })}
        </Row>
      ))}
    </View>
  );
}
