import React, { useState } from 'react';
import { useRouter } from 'expo-router';
import { Banner, Button, Chip, EmptyState, Field, Row, Screen, Section, T, useToast } from '@/kit/ui';
import { BackHeader } from '@/components/common';
import { InviteCard } from '@/components/InviteCard';
import { ROLES, canInvite, createInvite, me, store, type Role } from '@/state';

export default function InviteScreen() {
  const router = useRouter();
  const toast = useToast();
  const s = store.use();
  const viewer = me(s);
  const [role, setRole] = useState<Role>('parent');
  const [label, setLabel] = useState('');
  if (!canInvite(viewer))
    return (
      <Screen header={<BackHeader title="Invitations" />}>
        <Banner kind="warning" title="Réservé aux tuteurs et parents" text="Demandez à un tuteur de la famille de vous transmettre un code." />
      </Screen>
    );
  const roles = ROLES.filter((r) => viewer?.role === 'tuteur' || r.id !== 'tuteur');
  return (
    <Screen header={<BackHeader title="Invitations" subtitle={s.family?.name} />}>
      <Section title="Nouvelle invitation">
        <Row wrap gap={6}>
          {roles.map((r) => (
            <Chip key={r.id} label={r.label} selected={role === r.id} onPress={() => setRole(r.id)} />
          ))}
        </Row>
        <T v="small" muted>
          {ROLES.find((r) => r.id === role)?.desc}
        </T>
        <Field label="Pour qui ? (mémo, optionnel)" value={label} onChangeText={setLabel} placeholder="Tata Sofia" />
        <Button
          title="Créer le code"
          icon="key"
          onPress={() => {
            const inv = createInvite(role, label);
            if (inv) toast(`Code ${inv.code} créé`, 'success');
            setLabel('');
          }}
        />
        <Banner kind="info" text="Le partage passe par la feuille de partage de votre appareil : vous choisissez l’app et le destinataire. FamCal n’envoie rien lui-même." />
      </Section>
      <Section title="Invitations" action={<Button small kind="ghost" title="Accepter un code" icon="enter" onPress={() => router.push('/join')} />}>
        {s.invites.length === 0 ? <EmptyState icon="mail-open" title="Aucune invitation" text="Créez un code pour inviter un adulte à rejoindre la famille." /> : s.invites.map((i) => <InviteCard key={i.code} inv={i} canRevoke={viewer?.role === 'tuteur' || i.createdBy === viewer?.id} />)}
      </Section>
    </Screen>
  );
}
