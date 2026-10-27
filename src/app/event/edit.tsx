import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/kit/theme';
import { Banner, Button, Chip, Field, Row, Screen, Segmented, T, ToggleRow, useToast } from '@/kit/ui';
import { DAYS_FR, fmtDate, isoDay } from '@/kit/format';
import { BackHeader, nowHHMM } from '@/components/common';
import { actableMembers, addDays, canEditEvent, conflictsOn, me, memberById, parseDay, store, upsertEvent } from '@/state';

const DURS = [
  { key: '30', label: '30 min' },
  { key: '60', label: '1 h' },
  { key: '120', label: '2 h' },
  { key: '240', label: '½ journée' },
];

export default function EditEvent() {
  const t = useTheme();
  const router = useRouter();
  const toast = useToast();
  const p = useLocalSearchParams<{ id?: string; date?: string }>();
  const s = store.use();
  const viewer = me(s);
  const existing = p.id ? s.events.find((e) => e.id === p.id) : undefined;
  const today = isoDay(new Date());
  const allowed = actableMembers(s, viewer);

  const [title, setTitle] = useState(existing?.title ?? '');
  const [date, setDate] = useState(existing?.date ?? (typeof p.date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(p.date) ? p.date : today));
  const [allDay, setAllDay] = useState(existing ? existing.start === null : false);
  const [start, setStart] = useState(existing?.start ?? nowHHMM());
  const [dur, setDur] = useState(String(existing?.durationMin || 60));
  const [ids, setIds] = useState<string[]>(existing?.memberIds ?? (viewer ? [viewer.id] : []));
  const [location, setLocation] = useState(existing?.location ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [weekly, setWeekly] = useState(existing?.repeat === 'weekly');
  const [more, setMore] = useState(!!existing);
  const [err, setErr] = useState<string>();

  const validTime = /^([01]\d|2[0-3]):[0-5]\d$/.test(start);
  const validDate = /^\d{4}-\d{2}-\d{2}$/.test(date) && !isNaN(parseDay(date).getTime());
  const conflicts = useMemo(
    () => (validDate && validTime && !allDay ? conflictsOn(s, date, { id: existing?.id ?? '__new', start, durationMin: Number(dur) || 60, memberIds: ids }) : []),
    [s, date, start, dur, ids, allDay, validDate, validTime, existing?.id],
  );

  if (existing && !canEditEvent(s, viewer, existing))
    return (
      <Screen header={<BackHeader title="Modifier" />}>
        <Banner kind="warning" title="Modification non autorisée" text="Seuls le créateur, les tuteurs de la famille et les tuteurs de tous les participants peuvent modifier cet événement." />
      </Screen>
    );

  const save = () => {
    if (!title.trim()) return setErr('Donnez un titre à l’événement.');
    if (!validDate) return setErr('Date invalide (AAAA-MM-JJ).');
    if (!allDay && !validTime) return setErr('Heure invalide (HH:MM).');
    if (ids.length === 0) return setErr('Choisissez au moins un participant.');
    const id = upsertEvent({
      id: existing?.id,
      title: title.trim(),
      date,
      start: allDay ? null : start,
      durationMin: allDay ? 0 : Number(dur) || 60,
      memberIds: ids,
      location: location.trim() || undefined,
      notes: notes.trim() || undefined,
      repeat: weekly ? 'weekly' : 'none',
      until: existing?.until,
    });
    toast(existing ? 'Événement mis à jour' : 'Événement ajouté', 'success');
    if (id) router.back();
  };

  const dayChips = [0, 1, 2, 3, 4, 5, 6].map((n) => addDays(today, n));

  return (
    <Screen
      header={<BackHeader title={existing ? 'Modifier l’événement' : 'Nouvel événement'} />}
      footer={
        <View style={{ padding: 12 }}>
          <Button title={existing ? 'Enregistrer' : 'Ajouter à l’agenda'} icon="checkmark" onPress={save} full />
        </View>
      }
    >
      <Field label="Titre" value={title} onChangeText={(v) => (setTitle(v), setErr(undefined))} placeholder="Ex. Rendez-vous dentiste" autoFocus={!existing} returnKeyType="done" onSubmitEditing={save} error={err} />

      <T v="label" muted>
        Quand ? {fmtDate(date)}
      </T>
      <Row wrap gap={6}>
        {dayChips.map((d, i) => (
          <Chip key={d} label={i === 0 ? 'Aujourd’hui' : i === 1 ? 'Demain' : `${DAYS_FR[parseDay(d).getDay()].slice(0, 3)}. ${parseDay(d).getDate()}`} selected={date === d} onPress={() => setDate(d)} />
        ))}
      </Row>
      <ToggleRow label="Journée entière" value={allDay} onChange={setAllDay} />
      {!allDay ? (
        <>
          <Row gap={10}>
            <View style={{ flex: 1 }}>
              <Field label="Début (HH:MM)" value={start} onChangeText={setStart} placeholder="18:00" maxLength={5} error={validTime ? undefined : 'Format HH:MM'} />
            </View>
          </Row>
          <Segmented options={DURS} value={(DURS.some((d) => d.key === dur) ? dur : '60') as string} onChange={setDur} />
        </>
      ) : null}

      <T v="label" muted>
        Pour qui ?
      </T>
      <Row wrap gap={6}>
        {s.members.map((m) => {
          const can = allowed.some((a) => a.id === m.id);
          return (
            <Chip
              key={m.id}
              label={can ? m.name : `${m.name} 🔒`}
              color={m.color}
              selected={ids.includes(m.id)}
              onPress={() => {
                if (!can) return toast(`Vous ne pouvez pas planifier pour ${m.name} (rôle ou tutelle).`, 'info');
                setIds((x) => (x.includes(m.id) ? x.filter((y) => y !== m.id) : [...x, m.id]));
              }}
            />
          );
        })}
      </Row>

      {conflicts.length > 0 ? (
        <Banner
          kind="warning"
          title="Conflit détecté"
          text={conflicts.map((c) => `${c.title} (${c.start}) — ${c.memberIds.filter((x) => ids.includes(x)).map((x) => memberById(s, x)?.name).join(', ')}`).join('\n') + '\nVous pouvez enregistrer quand même.'}
        />
      ) : null}

      {more ? (
        <>
          <Field label="Lieu (optionnel)" value={location} onChangeText={setLocation} />
          <Field label="Notes (optionnel)" value={notes} onChangeText={setNotes} multiline hint="Évitez les informations médicales détaillées concernant un enfant." />
          <ToggleRow label="Répéter chaque semaine" sub={`Le ${DAYS_FR[parseDay(date).getDay()]}`} value={weekly} onChange={setWeekly} />
          <Field label="Date (AAAA-MM-JJ)" value={date} onChangeText={setDate} error={validDate ? undefined : 'Date invalide'} />
        </>
      ) : (
        <Button title="Plus d’options (lieu, notes, répétition)" kind="ghost" icon="options" onPress={() => setMore(true)} />
      )}
    </Screen>
  );
}
