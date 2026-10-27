import React, { useState } from 'react';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useTheme } from '@/kit/theme';
import { Banner, Button, Card, Field, Screen, T, ToggleRow, useToast } from '@/kit/ui';
import { fmtDate } from '@/kit/format';
import { BackHeader, ColorPicker } from '@/components/common';
import { acceptInvite, findInvite, memberById, nextColor, roleLabel, store } from '@/state';

/** Acceptation explicite d'une invitation (lien famcal://join?code=… ou saisie). */
export default function Join() {
  const t = useTheme();
  const router = useRouter();
  const toast = useToast();
  const p = useLocalSearchParams<{ code?: string }>();
  const s = store.use();
  const [code, setCode] = useState(typeof p.code === 'string' ? p.code : '');
  const [name, setName] = useState('');
  const [color, setColor] = useState(nextColor(s));
  const [switchView, setSwitchView] = useState(true);
  const [err, setErr] = useState<string>();
  const found = code.trim().length >= 8 ? findInvite(code) : {};

  if (!s.session)
    return (
      <Screen header={<BackHeader title="Rejoindre une famille" />}>
        <Banner kind="info" text="Connectez-vous d’abord par e-mail, puis rouvrez le lien d’invitation." action={<Button small title="Se connecter" onPress={() => router.replace('/login')} />} />
      </Screen>
    );

  return (
    <Screen header={<BackHeader title="Rejoindre une famille" />}>
      <Field label="Code d’invitation" value={code} onChangeText={(v) => (setCode(v), setErr(undefined))} autoCapitalize="characters" placeholder="ABCD-EFGH" error={err ?? found.error} />
      {found.invite ? (
        <Card accent={t.success}>
          <T v="h3">Invitation valide</T>
          <T>
            Famille « {s.family?.name} » · rôle {roleLabel(found.invite.role)} · invité·e par {memberById(s, found.invite.createdBy)?.name ?? '—'} · expire le {fmtDate(found.invite.expiresAt, false)}
          </T>
          <T v="small" muted>
            En acceptant, vous verrez le calendrier familial selon votre rôle. Vous pourrez quitter la famille à tout moment (demandez à un tuteur).
          </T>
          <Field label="Votre prénom" value={name} onChangeText={setName} />
          <ColorPicker value={color} onChange={setColor} />
          <ToggleRow label="Utiliser ce profil sur cet appareil (démo mono-appareil)" sub="Sans sync cloud, l’invité et l’invitant partagent cet appareil." value={switchView} onChange={setSwitchView} />
          <Button
            title="J’accepte et je rejoins"
            icon="checkmark-circle"
            disabled={!name.trim()}
            onPress={() => {
              const r = acceptInvite(code, name, color, switchView);
              if (r.error) return setErr(r.error);
              store.set((x) => ({ ...x, onboarded: true }));
              toast('Bienvenue dans la famille !', 'success');
              router.replace('/agenda');
            }}
            full
          />
        </Card>
      ) : null}
      {!s.family ? <Banner kind="info" text="Aucune famille sur cet appareil : la synchronisation cloud (Supabase, non configurée) est nécessaire pour rejoindre depuis un autre appareil." /> : null}
    </Screen>
  );
}
