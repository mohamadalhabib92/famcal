import React, { useState } from 'react';
import { View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useTheme } from '@/kit/theme';
import { Banner, Button, Card, Chip, Field, Progress, Row, Screen, Segmented, T, useToast } from '@/kit/ui';
import { isoDay } from '@/kit/format';
import { MEMBER_COLORS } from '@/theme';
import { ColorPicker } from '@/components/common';
import { InviteCard } from '@/components/InviteCard';
import { acceptInvite, addDays, addManaged, createFamily, createInvite, loadDemo, store, upsertEvent, type Invite } from '@/state';

type Step = 'start' | 'create' | 'join' | 'invite' | 'event';

export default function Onboarding() {
  const t = useTheme();
  const router = useRouter();
  const toast = useToast();
  const s = store.use();
  const [step, setStep] = useState<Step>(s.family ? 'invite' : 'start');
  const [famName, setFamName] = useState('');
  const [myName, setMyName] = useState('');
  const [color, setColor] = useState(MEMBER_COLORS[0]);
  const [code, setCode] = useState('');
  const [err, setErr] = useState<string>();
  const [inv, setInv] = useState<Invite | null>(null);
  const [kid, setKid] = useState('');
  const [evTitle, setEvTitle] = useState('');
  const [evDay, setEvDay] = useState<0 | 1 | 2>(0);
  const [evTime, setEvTime] = useState('18:00');
  if (!s.session) return <Redirect href="/login" />;

  const n = step === 'create' || step === 'join' ? 1 : step === 'invite' ? 2 : step === 'event' ? 3 : 0;
  const finish = () => {
    store.set((x) => ({ ...x, onboarded: true }));
    router.replace('/agenda');
  };

  return (
    <Screen>
      <View style={{ gap: 6, paddingTop: 12 }}>
        <T v="h1">Bienvenue{myName ? `, ${myName}` : ''} 👋</T>
        <T muted>Trois étapes, moins de 2 minutes : créer la famille → inviter → premier événement.</T>
        <Progress value={n / 3} />
        <T v="caption" muted>
          Étape {Math.max(n, 1)} / 3
        </T>
      </View>

      {step === 'start' ? (
        <View style={{ gap: 12 }}>
          <Card onPress={() => setStep('create')} a11y="Créer ma famille">
            <T v="h3">Créer ma famille</T>
            <T v="small" muted>
              Vous en devenez tuteur (administrateur).
            </T>
          </Card>
          <Card onPress={() => setStep('join')} a11y="Rejoindre avec un code">
            <T v="h3">Rejoindre avec un code</T>
            <T v="small" muted>
              Un proche vous a envoyé un code ou un lien d’invitation.
            </T>
          </Card>
          <Card
            onPress={() => {
              loadDemo();
              router.replace('/agenda');
            }}
            a11y="Explorer la famille d’exemple"
          >
            <T v="h3">Explorer une famille d’exemple</T>
            <T v="small" muted>
              Démo / Échantillon : 5 membres fictifs, profils gérés, conflits. Effaçable à tout moment.
            </T>
          </Card>
        </View>
      ) : null}

      {step === 'create' ? (
        <Card>
          <Field label="Nom de la famille" value={famName} onChangeText={setFamName} placeholder="Famille Martin" autoFocus />
          <Field label="Votre prénom" value={myName} onChangeText={setMyName} placeholder="Camille" hint="Seul le prénom est demandé (minimisation des données)." />
          <T v="label" muted>
            Votre couleur
          </T>
          <ColorPicker value={color} onChange={setColor} />
          <Row gap={8}>
            <Button title="Retour" kind="ghost" onPress={() => setStep('start')} />
            <Button
              title="Créer la famille"
              icon="home"
              disabled={!famName.trim() || !myName.trim()}
              onPress={() => {
                createFamily(famName, myName, color);
                setStep('invite');
              }}
            />
          </Row>
        </Card>
      ) : null}

      {step === 'join' ? (
        <Card>
          <Field label="Code d’invitation" value={code} onChangeText={setCode} autoCapitalize="characters" placeholder="ABCD-EFGH" error={err} />
          <Field label="Votre prénom" value={myName} onChangeText={setMyName} />
          <ColorPicker value={color} onChange={setColor} />
          <Banner kind="info" text="Sans synchronisation cloud (Supabase non configuré), seules les invitations créées sur cet appareil peuvent être acceptées." />
          <Row gap={8}>
            <Button title="Retour" kind="ghost" onPress={() => setStep('start')} />
            <Button
              title="Accepter l’invitation"
              icon="checkmark-circle"
              disabled={!code.trim() || !myName.trim()}
              onPress={() => {
                const r = acceptInvite(code, myName, color, true);
                if (r.error) return setErr(r.error);
                finish();
              }}
            />
          </Row>
        </Card>
      ) : null}

      {step === 'invite' ? (
        <View style={{ gap: 12 }}>
          <Card>
            <T v="h3">Inviter un proche</T>
            <T v="small" muted>
              Un code à 8 caractères, valable 7 jours. La personne l’accepte explicitement et choisit son prénom.
            </T>
            {inv ? <InviteCard inv={inv} /> : <Button title="Créer une invitation (rôle Parent)" icon="person-add" onPress={() => setInv(createInvite('parent'))} />}
          </Card>
          <Card>
            <T v="h3">Ajouter un enfant (profil géré)</T>
            <T v="small" muted>
              Pas de compte ni d’e-mail : vous en êtes tuteur. Ses détails restent privés tant que vous ne consentez pas au partage.
            </T>
            <Row gap={8}>
              <View style={{ flex: 1 }}>
                <Field label="Prénom de l’enfant" value={kid} onChangeText={setKid} placeholder="Léa" />
              </View>
            </Row>
            <Button
              small
              kind="secondary"
              title="Ajouter"
              icon="add"
              disabled={!kid.trim()}
              onPress={() => {
                const st = store.get();
                addManaged(kid, 'enfant', undefined, MEMBER_COLORS[st.members.length % MEMBER_COLORS.length], st.meId ? [st.meId] : []);
                toast(`${kid.trim()} ajouté·e`, 'success');
                setKid('');
              }}
            />
          </Card>
          <Row gap={8}>
            <Button title="Passer" kind="ghost" onPress={() => setStep('event')} />
            <Button title="Continuer" icon="arrow-forward" onPress={() => setStep('event')} />
          </Row>
        </View>
      ) : null}

      {step === 'event' ? (
        <Card>
          <T v="h3">Premier événement</T>
          <Field label="Quoi ?" value={evTitle} onChangeText={setEvTitle} placeholder="Dîner en famille" autoFocus />
          <Segmented
            options={[
              { key: '0', label: 'Aujourd’hui' },
              { key: '1', label: 'Demain' },
              { key: '2', label: 'Après-demain' },
            ]}
            value={String(evDay) as '0' | '1' | '2'}
            onChange={(k) => setEvDay(Number(k) as 0 | 1 | 2)}
          />
          <Row wrap gap={6}>
            {['08:00', '12:00', '18:00', '19:30'].map((h) => (
              <Chip key={h} label={h} selected={evTime === h} onPress={() => setEvTime(h)} />
            ))}
          </Row>
          <Row gap={8}>
            <Button title="Plus tard" kind="ghost" onPress={finish} />
            <Button
              title="Créer et ouvrir l’agenda"
              icon="checkmark"
              disabled={!evTitle.trim()}
              onPress={() => {
                const st = store.get();
                upsertEvent({ title: evTitle.trim(), date: addDays(isoDay(new Date()), evDay), start: evTime, durationMin: 60, memberIds: st.members.map((m) => m.id), repeat: 'none' });
                finish();
              }}
            />
          </Row>
        </Card>
      ) : null}
      <View style={{ height: 8 }} />
      <T v="caption" muted center style={{ color: t.textMuted }}>
        Connecté·e : {s.session.email}
      </T>
    </Screen>
  );
}
