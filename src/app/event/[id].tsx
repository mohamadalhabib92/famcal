import React from 'react';
import { Platform, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/kit/theme';
import { Badge, Banner, Button, Card, EmptyState, ListItem, Row, Screen, T, useToast } from '@/kit/ui';
import { DAYS_FR, fmtDate, fmtDateTime } from '@/kit/format';
import { Avatar, BackHeader, timeRange } from '@/components/common';
import { canEditEvent, conflictsOn, deleteEvent, eventVisibility, me, memberById, store } from '@/state';

export default function EventDetail() {
  const t = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = store.use();
  const ev = s.events.find((e) => e.id === id);
  const viewer = me(s);
  if (!ev)
    return (
      <Screen header={<BackHeader title="Événement" />}>
        <EmptyState icon="calendar-clear" title="Événement introuvable" text="Il a peut-être été supprimé." action={<Button title="Retour à l’agenda" onPress={() => router.replace('/agenda')} />} />
      </Screen>
    );
  const vis = eventVisibility(s, viewer, ev);
  const editable = canEditEvent(s, viewer, ev);
  const conflicts = conflictsOn(s, ev.date, ev);
  const creator = memberById(s, ev.createdBy);

  const remove = () => {
    const ok = Platform.OS === 'web' ? ((globalThis as { confirm?: (m: string) => boolean }).confirm?.(`Supprimer « ${ev.title} »${ev.repeat === 'weekly' ? ' et toutes ses répétitions' : ''} ?`) ?? true) : true;
    if (!ok) return;
    deleteEvent(ev.id);
    toast('Événement supprimé', 'success');
    router.back();
  };

  return (
    <Screen header={<BackHeader title={vis === 'full' ? ev.title : 'Occupé'} subtitle={`${DAYS_FR[new Date(ev.date + 'T12:00').getDay()]} ${fmtDate(ev.date)} · ${timeRange(ev)}`} />}>
      {vis === 'busy' ? (
        <Banner kind="info" title="Détails privés" text="Cet événement concerne un enfant dont les tuteurs n’ont pas consenti au partage des détails. Vous voyez seulement le créneau occupé." icon="lock-closed" />
      ) : null}
      {conflicts.length ? <Banner kind="warning" title="Conflit" text={conflicts.map((c) => `${eventVisibility(s, viewer, c) === 'full' ? c.title : 'Occupé'} · ${timeRange(c)}`).join('\n')} /> : null}
      <Card>
        <Row wrap gap={6}>
          {ev.repeat === 'weekly' ? <Badge label="Chaque semaine" icon="repeat" color={t.accent} /> : null}
          {ev.start === null ? <Badge label="Journée entière" icon="sunny" color={t.warning} /> : null}
        </Row>
        {vis === 'full' && ev.location ? <ListItem icon="location" title={ev.location} /> : null}
        {vis === 'full' && ev.notes ? (
          <T>
            {ev.notes}
          </T>
        ) : null}
        <T v="small" muted>
          Créé par {creator?.name ?? 'membre supprimé'} · modifié {fmtDateTime(ev.updatedAt)}
        </T>
      </Card>
      <T v="label" muted>
        Participants
      </T>
      {ev.memberIds.map((mid) => {
        const m = memberById(s, mid);
        if (!m) return null;
        return <ListItem key={mid} title={m.name} sub={m.managed ? 'Profil géré' : undefined} right={<Avatar m={m} size={30} />} onPress={() => router.push({ pathname: '/member/[id]', params: { id: mid } })} />;
      })}
      <View style={{ height: 8 }} />
      {editable ? (
        <Row gap={8}>
          <Button title="Modifier" icon="create" onPress={() => router.push({ pathname: '/event/edit', params: { id: ev.id } })} />
          <Button title="Supprimer" icon="trash" kind="danger" onPress={remove} />
        </Row>
      ) : (
        <Banner kind="info" text="Lecture seule : vous ne gérez pas tous les participants de cet événement." />
      )}
    </Screen>
  );
}
