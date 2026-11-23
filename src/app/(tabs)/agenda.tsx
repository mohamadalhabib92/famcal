import React, { useCallback, useMemo, useState } from 'react';
import { Pressable, View, useWindowDimensions } from 'react-native';
import { useFocusEffect, useRouter } from 'expo-router';
import { useTheme, alpha } from '@/kit/theme';
import { Banner, Button, Chip, EmptyState, IconButton, Raised, Row, Screen, Segmented, T, Ionicons } from '@/kit/ui';
import { useReduceTransparency } from '@/kit/a11y';
import { verreFor } from '@/kit/verre';
import { DAYS_FR, DAYS_FR_SHORT, MONTHS_FR, fmtDate, isoDay } from '@/kit/format';
import { Dots, EventRow, TabHeader } from '@/components/common';
import { busyIntervals } from '@/domain/busy';
import { strings } from '@/locales';
import { addDays, dayOccurrences, eventVisibility, me, parseDay, setPrefs, store, weekStart, type Occurrence, type View as CalView } from '@/state';
import { runBackgroundSync } from '@/sync/backend';

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

  const [refreshing, setRefreshing] = useState(false);
  const refresh = useCallback(() => {
    setRefreshing(true);
    void runBackgroundSync().finally(() => setRefreshing(false));
  }, []);
  useFocusEffect(
    useCallback(() => {
      void runBackgroundSync();
    }, []),
  );

  const newEvent = (day?: string) => router.push({ pathname: '/event/edit', params: { date: day ?? cursor } });
  const open = (id: string) => router.push({ pathname: '/event/[id]', params: { id } });
  const total = days.reduce((n, d) => n + occ[d].length, 0);

  return (
    <View style={{ flex: 1 }}>
      <Screen header={<TabHeader title={s.family?.name ?? 'Agenda'} subtitle="Calendrier familial partagé" />} onRefresh={refresh} refreshing={refreshing}>
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
              <T v="caption" color={t.primaryInk}>
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
          <Chip label={strings.busy} icon="people" selected={!!s.prefs.busy} onPress={() => setPrefs({ busy: !s.prefs.busy })} />
        </Row>
        {s.prefs.busy ? <BusyOverlay days={view === 'mois' ? [cursor] : days} /> : null}

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
                    <T v="label" color={d === today ? t.primaryInk : t.text} style={{ textTransform: 'capitalize' }}>
                      {DAYS_FR[parseDay(d).getDay()]} {parseDay(d).getDate()}
                    </T>
                    {d === today ? <T v="caption" color={t.primaryInk}>aujourd’hui</T> : null}
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
        <View style={{ height: 120 }} />
      </Screen>
      <Pressable accessibilityRole="button" accessibilityLabel="Nouvel événement" onPress={() => newEvent()} style={{ position: 'absolute', right: 20, bottom: 20, width: 60, height: 60 }}>
        {({ pressed }) => (
          <Raised pressed={pressed} radius={30} style={{ width: 60, height: 60, backgroundColor: t.primaryInk, alignItems: 'center', justifyContent: 'center' }}>
            <Ionicons name="add" size={32} color={t.primaryText} />
          </Raised>
        )}
      </Pressable>
    </View>
  );
}

function BusyOverlay({ days }: { days: string[] }) {
  const t = useTheme();
  const s = store.use();
  const viewer = me(s);
  const shown = days.slice(0, 7);
  return (
    <View style={{ gap: 8 }}>
      {shown.map((day) => {
        const slots = busyIntervals({ events: s.events, day, viewer, members: s.members, links: s.links });
        return (
          <View key={day} style={{ gap: 4 }}>
            <T v="label">{fmtDate(day, false)}</T>
            {s.members.filter((m) => !s.prefs.hidden.includes(m.id)).map((m) => {
              const mine = slots.filter((slot) => slot.memberId === m.id);
              return (
                <Row key={m.id} gap={8}>
                  <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: m.color }} />
                  <T v="small" style={{ width: 96 }} numberOfLines={1}>
                    {m.name}
                  </T>
                  <T v="small" muted style={{ flex: 1 }}>
                    {mine.length === 0 ? 'Libre' : mine.map((slot) => `${slot.start ?? 'Journée'} ${slot.title}`).join(' · ')}
                  </T>
                </Row>
              );
            })}
          </View>
        );
      })}
      <T v="caption" color={t.textMuted}>
        Les événements privés des autres restent masqués.
      </T>
    </View>
  );
}

function MonthGrid({ days, occ, cursor, today, compact, onPick }: { days: string[]; occ: Record<string, Occurrence[]>; cursor: string; today: string; compact: boolean; onPick: (d: string) => void }) {
  const t = useTheme();
  const reduceT = useReduceTransparency();
  const verre = verreFor(t.dark);
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
                  backgroundColor: d === today ? alpha(t.primary, 0.16) : reduceT ? t.surface : verre.fill,
                  borderWidth: 1,
                  borderTopColor: verre.highlight,
                  borderColor: conflict ? t.danger : d === today ? t.primary : reduceT ? t.border : verre.stroke,
                  opacity: out ? 0.45 : 1,
                }}
              >
                <T v="label" color={d === today ? t.primaryInk : t.text}>
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
                  <T v="caption" color={t.primaryInk}>
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
