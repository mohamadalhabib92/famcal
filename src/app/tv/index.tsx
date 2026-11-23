import { useRef, useState } from 'react';
import { ScrollView, Text, View } from 'react-native';
import { scrollHandleOf, TvFocusable, TvScreen, tvSafe } from '@/components/tv/ui';
import { useReduceTransparency } from '@/kit/a11y';
import { verreFor } from '@/kit/verre';
import { night } from '@/theme';
import { upcomingReminders } from '@/tv/board';
import { DAYS_FR, fmtDate, isoDay } from '@/kit/format';
import { strings } from '@/locales';
import {
  addDays,
  dayOccurrences,
  eventVisibility,
  me,
  parseDay,
  store,
  weekStart,
  type CalEvent,
} from '@/state';

type Mode = 'today' | 'week';

export default function TvSalon() {
  const scrollRef = useRef<{ scrollTo: (opts: { y: number; animated?: boolean }) => void } | null>(null);
  const reduceT = useReduceTransparency();
  const verre = verreFor(true);
  const s = store.use();
  const viewer = me(s);
  const today = isoDay(new Date());
  const [mode, setMode] = useState<Mode>('today');
  const days = mode === 'today' ? [today] : Array.from({ length: 7 }, (_, index) => addDays(weekStart(today), index));

  const handle = scrollHandleOf(scrollRef);
  const scrollTo = (y: number) => scrollRef.current?.scrollTo({ y: Math.max(0, y - 48), animated: true });

  const reminders = upcomingReminders(
    s.events
      .filter((event) => eventVisibility(s, viewer, event) === 'full')
      .map((event) => ({
        id: event.id,
        title: visibleTitle(s, viewer, event),
        date: event.date,
        start: event.start,
        durationMin: event.durationMin,
        repeat: event.repeat,
        until: event.until,
        reminderMinutes: event.reminderMinutes,
        memberIds: event.memberIds,
        createdBy: event.createdBy,
        updatedAt: event.updatedAt,
      })),
    Date.now(),
  );

  return (
    <TvScreen>
      <ScrollView ref={scrollRef as never} style={{ flex: 1 }} contentContainerStyle={tvSafe}>
        <View style={{ alignSelf: 'flex-start', maxWidth: 1100, paddingVertical: 18, paddingHorizontal: 28, borderRadius: 28, backgroundColor: reduceT ? night.surface : verre.fill, borderWidth: 1, borderColor: verre.stroke, borderTopColor: verre.highlight }}>
          <Text style={{ color: night.primary, fontSize: 22, fontWeight: '800', letterSpacing: 1.2 }}>{strings.appName.toUpperCase()}</Text>
          <Text style={{ color: night.text, fontSize: 64, fontWeight: '800', marginTop: 8 }}>{s.family?.name ?? 'Salon'}</Text>
          <Text style={{ color: night.textMuted, fontSize: 28, marginTop: 8 }}>
            {DAYS_FR[parseDay(today).getDay()]} {fmtDate(today)} — les agendas de la famille, sur grand écran.
          </Text>
        </View>

        {!s.family ? (
          <Text style={{ color: night.text, fontSize: 32, lineHeight: 44, marginTop: 36, maxWidth: 1100 }}>
            Aucun foyer sur cet Apple TV. Ouvrez Familycal sur l’iPhone : les données déjà enregistrées restent là-bas, rien n’est effacé.
          </Text>
        ) : (
          <>
            <View style={{ flexDirection: 'row', gap: 24, marginTop: 36 }}>
              <TvFocusable preferred label="Aujourd’hui" onPress={() => setMode('today')} onFocused={scrollTo} scrollHandle={handle} />
              <TvFocusable label="Semaine" onPress={() => setMode('week')} onFocused={scrollTo} scrollHandle={handle} />
            </View>

            {days.map((day) => {
              const rows = dayOccurrences(s, day, []).filter((row) => eventVisibility(s, viewer, row.ev) !== 'hidden');
              return (
                <View key={day} style={{ marginTop: 36, gap: 16 }}>
                  <Text style={{ color: day === today ? night.primaryInk : night.text, fontSize: 40, fontWeight: '800' }}>
                    {DAYS_FR[parseDay(day).getDay()]} {parseDay(day).getDate()}
                  </Text>
                  {s.members.map((member) => {
                    const mine = rows.filter((row) => row.ev.memberIds.includes(member.id));
                    return (
                      <TvFocusable
                        key={`${day}-${member.id}`}
                        label={member.name}
                        hint={
                          mine.length === 0
                            ? 'Libre'
                            : mine
                                .map((row) => {
                                  const title = eventVisibility(s, viewer, row.ev) === 'full' ? row.ev.title : 'Occupé';
                                  return `${row.ev.start ?? 'Journée'}  ${title}`;
                                })
                                .join('   ·   ')
                        }
                        onFocused={scrollTo}
                        scrollHandle={handle}
                      />
                    );
                  })}
                  {rows.length === 0 ? <Text style={{ color: night.textMuted, fontSize: 26 }}>Journée libre pour tout le foyer.</Text> : null}
                </View>
              );
            })}

            <View style={{ marginTop: 48, gap: 16 }}>
              <Text style={{ color: night.text, fontSize: 40, fontWeight: '800' }}>Rappels à venir</Text>
              <Text style={{ color: night.textMuted, fontSize: 24 }}>Calculés sur cet écran. Aucune notification distante.</Text>
              {reminders.length === 0 ? (
                <Text style={{ color: night.textMuted, fontSize: 28 }}>Rien dans les deux prochains jours.</Text>
              ) : (
                reminders.map((item) => (
                  <TvFocusable key={item.id} label={item.title} hint={item.when} onFocused={scrollTo} scrollHandle={handle} />
                ))
              )}
            </View>
          </>
        )}
      </ScrollView>
    </TvScreen>
  );
}

function visibleTitle(s: ReturnType<typeof store.get>, viewer: ReturnType<typeof me>, event: CalEvent) {
  return eventVisibility(s, viewer, event) === 'full' ? event.title : 'Occupé';
}
