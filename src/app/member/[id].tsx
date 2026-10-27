import React, { useState } from 'react';
import { Platform, View } from 'react-native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/kit/theme';
import { Badge, Banner, Button, Card, Chip, EmptyState, Field, Row, Screen, Section, T, ToggleRow, useToast } from '@/kit/ui';
import { DAYS_FR, isoDay } from '@/kit/format';
import { Avatar, BackHeader, ColorPicker, EventRow } from '@/components/common';
import { ROLES, addDays, canActFor, canManageFamily, guardiansOf, isMinor, me, mutate, occursOn, parseDay, removeMember, roleLabel, store, uidLink, wardsOf } from '@/state';

export default function MemberScreen() {
  const t = useTheme();
  const router = useRouter();
  const toast = useToast();
  const { id } = useLocalSearchParams<{ id: string }>();
  const s = store.use();
  const viewer = me(s);
  const m = s.members.find((x) => x.id === id);
  const [name, setName] = useState(m?.name ?? '');
  if (!m)
    return (
      <Screen header={<BackHeader title="Membre" />}>
        <EmptyState icon="person" title="Membre introuvable" />
      </Screen>
    );
  const editable = canActFor(s, viewer, m.id);
  const admin = canManageFamily(viewer);
  const tuteurs = s.members.filter((x) => x.role === 'tuteur' && !x.managed);
  const lastTuteur = m.role === 'tuteur' && tuteurs.length <= 1;
  const links = s.links.filter((l) => l.wardId === m.id);
  const guardians = guardiansOf(s, m.id);
  const wards = wardsOf(s, m.id);
  const myLink = links.find((l) => l.guardianId === viewer?.id);
  const today = isoDay(new Date());
  const upcoming = Array.from({ length: 14 }, (_, i) => addDays(today, i)).flatMap((d) =>
    s.events.filter((e) => e.memberIds.includes(m.id) && occursOn(e, d)).map((e) => ({ e, d })),
  );

  const update = (patch: Partial<typeof m>) => mutate((x) => ({ ...x, members: x.members.map((y) => (y.id === m.id ? { ...y, ...patch } : y)) }));
  const remove = () => {
    const ok = Platform.OS === 'web' ? ((globalThis as { confirm?: (q: string) => boolean }).confirm?.(`Retirer ${m.name} de la famille ? Ses liens de tutelle seront supprimés.`) ?? true) : true;
    if (!ok) return;
    removeMember(m.id);
    toast(`${m.name} retiré·e`, 'success');
    router.back();
  };

  return (
    <Screen header={<BackHeader title={m.name} subtitle={m.managed ? (m.kind === 'dependant' ? 'Profil géré · proche accompagné' : 'Profil géré · enfant') : roleLabel(m.role)} />}>
      <Row gap={12}>
        <Avatar m={m} size={56} />
        <View style={{ flex: 1, gap: 4 }}>
          <Row wrap gap={6}>
            {!m.managed ? <Badge label={roleLabel(m.role)} color={t.accent} /> : null}
            {m.managed ? <Badge label="Sans compte" icon="shield-checkmark" color={t.info} /> : null}
            {isMinor(m) ? <Badge label="Mineur" color={t.warning} /> : null}
          </Row>
          {m.email && (viewer?.id === m.id || admin) ? (
            <T v="small" muted>
              {m.email}
            </T>
          ) : null}
        </View>
      </Row>

      {editable ? (
        <Section title="Profil">
          <Field label="Prénom" value={name} onChangeText={setName} onBlur={() => name.trim() && update({ name: name.trim() })} />
          <ColorPicker value={m.color} onChange={(c) => update({ color: c })} />
          {m.managed ? (
            <Field
              label="Année de naissance (optionnel)"
              defaultValue={m.birthYear ? String(m.birthYear) : ''}
              keyboardType="number-pad"
              maxLength={4}
              onEndEditing={(e) => {
                const y = Number(e.nativeEvent.text);
                update({ birthYear: y >= 1900 && y <= new Date().getFullYear() ? y : undefined });
              }}
            />
          ) : null}
        </Section>
      ) : (
        <Banner kind="info" text="Lecture seule : vous ne gérez pas ce profil." />
      )}

      {admin && !m.managed ? (
        <Section title="Rôle">
          <Row wrap gap={6}>
            {ROLES.map((r) => (
              <Chip
                key={r.id}
                label={r.label}
                selected={m.role === r.id}
                onPress={() => {
                  if (lastTuteur && r.id !== 'tuteur') return toast('La famille doit garder au moins un tuteur.', 'error');
                  update({ role: r.id });
                }}
              />
            ))}
          </Row>
          <T v="small" muted>
            {ROLES.find((r) => r.id === m.role)?.desc}
          </T>
        </Section>
      ) : null}

      {m.managed ? (
        <Section title="Tutelle & confidentialité">
          <Card>
            <T v="small" muted>
              Tuteurs : {guardians.map((g) => g.name).join(', ') || 'aucun'}
            </T>
            {admin ? (
              <Row wrap gap={6}>
                {s.members
                  .filter((x) => !x.managed && x.role !== 'membre')
                  .map((g) => {
                    const linked = links.some((l) => l.guardianId === g.id);
                    return (
                      <Chip
                        key={g.id}
                        label={g.name}
                        color={g.color}
                        selected={linked}
                        onPress={() => {
                          if (linked && links.length <= 1) return toast('Un profil géré doit garder au moins un tuteur.', 'error');
                          mutate((x) => ({
                            ...x,
                            links: linked ? x.links.filter((l) => !(l.guardianId === g.id && l.wardId === m.id)) : [...x.links, uidLink(x, g.id, m.id)],
                          }));
                        }}
                      />
                    );
                  })}
              </Row>
            ) : null}
            {isMinor(m) ? (
              <>
                {links.map((l) => (
                  <T key={l.id} v="small">
                    {l.consentShare ? '✓' : '○'} {s.members.find((x) => x.id === l.guardianId)?.name} : {l.consentShare ? 'consent au partage' : 'pas de consentement'}
                  </T>
                ))}
                <ToggleRow
                  label="Partager les détails avec toute la famille"
                  sub={myLink ? 'Votre consentement de tuteur. Il faut l’accord de tous les tuteurs ; sinon les autres membres voient « Occupé ».' : 'Seuls les tuteurs de ce profil peuvent consentir.'}
                  value={!!myLink?.consentShare}
                  disabled={!myLink}
                  onChange={(v) => mutate((x) => ({ ...x, links: x.links.map((l) => (l.id === myLink?.id ? { ...l, consentShare: v } : l)) }))}
                />
              </>
            ) : (
              <T v="small" muted>
                Profil majeur ou proche accompagné : ses événements sont visibles par la famille.
              </T>
            )}
          </Card>
        </Section>
      ) : wards.length ? (
        <Section title="Tuteur de">
          <T>{wards.map((w) => w.name).join(', ')}</T>
        </Section>
      ) : null}

      <Section title="Prochains 14 jours">
        {upcoming.length === 0 ? (
          <EmptyState icon="calendar-clear" title="Rien de prévu" text={`Aucun événement pour ${m.name} dans les deux prochaines semaines.`} />
        ) : (
          upcoming.map(({ e, d }) => (
            <View key={e.id + d} style={{ gap: 4 }}>
              <T v="caption" muted style={{ textTransform: 'capitalize' }}>
                {DAYS_FR[parseDay(d).getDay()]} {parseDay(d).getDate()}
              </T>
              <EventRow ev={e} compact onPress={() => router.push({ pathname: '/event/[id]', params: { id: e.id } })} />
            </View>
          ))
        )}
      </Section>

      {!m.managed && m.id !== viewer?.id ? (
        <Button
          title={`Voir l’app comme ${m.name} (démo)`}
          icon="swap-horizontal"
          kind="secondary"
          onPress={() => {
            store.set((x) => ({ ...x, meId: m.id }));
            toast(`Point de vue : ${m.name} (${roleLabel(m.role)})`, 'info');
            router.replace('/agenda');
          }}
        />
      ) : null}
      {admin && m.id !== viewer?.id && !lastTuteur ? <Button title="Retirer de la famille" icon="person-remove" kind="danger" onPress={remove} /> : null}
    </Screen>
  );
}
