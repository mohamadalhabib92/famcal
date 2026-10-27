import React, { useState } from 'react';
import { View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/kit/theme';
import { Badge, Banner, Button, Card, Chip, EmptyState, Field, ListItem, Row, Screen, Section, Segmented, Sheet, T, useToast } from '@/kit/ui';
import { Avatar, ColorPicker, TabHeader } from '@/components/common';
import { ROLES, addManaged, canInvite, canManageFamily, guardiansOf, isMinor, me, nextColor, roleLabel, store, type ManagedKind } from '@/state';

export default function Famille() {
  const t = useTheme();
  const router = useRouter();
  const toast = useToast();
  const s = store.use();
  const viewer = me(s);
  const adults = s.members.filter((m) => !m.managed);
  const managed = s.members.filter((m) => m.managed);
  const pending = s.invites.filter((i) => !i.acceptedBy && !i.revoked && i.expiresAt > Date.now()).length;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState('');
  const [kind, setKind] = useState<ManagedKind>('enfant');
  const [year, setYear] = useState('');
  const [color, setColor] = useState(nextColor(s));
  const [guards, setGuards] = useState<string[]>(viewer ? [viewer.id] : []);
  const canAddManaged = viewer?.role === 'tuteur' || viewer?.role === 'parent';

  const add = () => {
    const y = year.trim() ? Number(year) : undefined;
    if (y !== undefined && (isNaN(y) || y < 1900 || y > new Date().getFullYear())) return toast('Année de naissance invalide', 'error');
    const g = viewer?.role === 'tuteur' ? guards : viewer ? [viewer.id] : [];
    if (g.length === 0) return toast('Choisissez au moins un tuteur', 'error');
    addManaged(name, kind, y, color, g);
    toast(`${name.trim()} ajouté·e`, 'success');
    setOpen(false);
    setName('');
    setYear('');
  };

  const open1 = (id: string) => router.push({ pathname: '/member/[id]', params: { id } });

  return (
    <Screen header={<TabHeader title="Famille" subtitle={`${s.members.length} membre${s.members.length > 1 ? 's' : ''} · vous êtes ${viewer ? roleLabel(viewer.role) : '—'}`} />}>
      <Row wrap gap={8}>
        {canInvite(viewer) ? <Button title={`Inviter${pending ? ` (${pending} en attente)` : ''}`} icon="person-add" onPress={() => router.push('/invite')} /> : null}
        {canAddManaged ? <Button title="Profil géré" icon="add" kind="secondary" onPress={() => (setColor(nextColor(s)), setOpen(true))} /> : null}
        <Button title="J’ai un code" icon="key" kind="ghost" onPress={() => router.push('/join')} />
      </Row>

      <Section title="Adultes avec compte">
        {adults.map((m) => (
          <ListItem key={m.id} title={m.id === viewer?.id ? `${m.name} (vous)` : m.name} sub={roleLabel(m.role)} right={<Avatar m={m} size={34} />} onPress={() => open1(m.id)} />
        ))}
      </Section>

      <Section title="Profils gérés — enfants & proches accompagnés">
        {managed.length === 0 ? (
          <EmptyState icon="happy" title="Aucun profil géré" text="Ajoutez un enfant ou un proche dépendant : pas de compte, pas d’e-mail, ses tuteurs gèrent son agenda." />
        ) : (
          managed.map((m) => {
            const gs = guardiansOf(s, m.id);
            const links = s.links.filter((l) => l.wardId === m.id);
            const consent = links.length > 0 && links.every((l) => l.consentShare);
            return (
              <Card key={m.id} onPress={() => open1(m.id)} a11y={`Profil de ${m.name}`}>
                <Row gap={10}>
                  <Avatar m={m} size={40} />
                  <View style={{ flex: 1 }}>
                    <T v="label">{m.name}</T>
                    <T v="small" muted>
                      {m.kind === 'dependant' ? 'Proche accompagné' : 'Enfant'}
                      {m.birthYear ? ` · ${new Date().getFullYear() - m.birthYear} ans` : ''} · Tuteur{gs.length > 1 ? 's' : ''} : {gs.map((g) => g.name).join(', ') || '—'}
                    </T>
                  </View>
                  {isMinor(m) ? <Badge label={consent ? 'Partage autorisé' : 'Détails privés'} icon={consent ? 'eye' : 'lock-closed'} color={consent ? t.success : t.textMuted} /> : null}
                </Row>
              </Card>
            );
          })
        )}
      </Section>

      <Section title="Rôles et permissions">
        <Card>
          {ROLES.map((r) => (
            <View key={r.id} style={{ gap: 2, paddingVertical: 4 }}>
              <T v="label">{r.label}</T>
              <T v="small" muted>
                {r.desc}
              </T>
            </View>
          ))}
          <T v="small" muted>
            Tutelle : un parent ou tuteur lié à un profil géré peut planifier pour lui et décider du partage de ses détails.
          </T>
        </Card>
        {!canManageFamily(viewer) ? <Banner kind="info" text="Seuls les tuteurs peuvent changer les rôles ou supprimer des membres." /> : null}
      </Section>

      <Sheet visible={open} onClose={() => setOpen(false)} title="Nouveau profil géré">
        <Segmented
          options={[
            { key: 'enfant', label: 'Enfant' },
            { key: 'dependant', label: 'Proche accompagné' },
          ]}
          value={kind}
          onChange={setKind}
        />
        <Field label="Prénom" value={name} onChangeText={setName} placeholder={kind === 'enfant' ? 'Léa' : 'Mamie Odette'} />
        <Field label="Année de naissance (optionnel)" value={year} onChangeText={setYear} keyboardType="number-pad" maxLength={4} hint="Sert uniquement à appliquer la protection des mineurs. Aucune date complète n’est demandée." />
        <ColorPicker value={color} onChange={setColor} />
        {viewer?.role === 'tuteur' ? (
          <>
            <T v="label" muted>
              Tuteurs (au moins un)
            </T>
            <Row wrap gap={6}>
              {adults
                .filter((a) => a.role !== 'membre')
                .map((a) => (
                  <Chip key={a.id} label={a.name} color={a.color} selected={guards.includes(a.id)} onPress={() => setGuards((g) => (g.includes(a.id) ? g.filter((x) => x !== a.id) : [...g, a.id]))} />
                ))}
            </Row>
          </>
        ) : (
          <T v="small" muted>
            Vous serez son tuteur.
          </T>
        )}
        <Button title="Ajouter" icon="checkmark" disabled={!name.trim()} onPress={add} full />
      </Sheet>
    </Screen>
  );
}
