import React, { useState } from 'react';
import { View } from 'react-native';
import { Redirect, useRouter } from 'expo-router';
import { useTheme } from '@/kit/theme';
import { Badge, Banner, Button, Card, Field, Row, Screen, Segmented, T, Ionicons } from '@/kit/ui';
import { cloudReady } from '@/config';
import { requestOtp, store, validEmail, verifyOtp } from '@/state';

export default function Login() {
  const t = useTheme();
  const router = useRouter();
  const s = store.use();
  const [email, setEmail] = useState(s.pendingOtp?.email ?? '');
  const [code, setCode] = useState('');
  const [method, setMethod] = useState<'otp' | 'lien'>('otp');
  const [err, setErr] = useState<string | undefined>();
  if (s.session) return <Redirect href="/" />;
  const pending = s.pendingOtp;

  const send = () => {
    if (!validEmail(email)) return setErr('Adresse e-mail invalide.');
    setErr(undefined);
    requestOtp(email);
  };
  const verify = (m: 'otp' | 'lien') => {
    const e = verifyOtp(code, m);
    if (e) return setErr(e);
    router.replace('/');
  };

  return (
    <Screen>
      <View style={{ alignItems: 'center', gap: 8, paddingTop: 24 }}>
        <View style={{ width: 72, height: 72, borderRadius: 20, backgroundColor: t.primary, alignItems: 'center', justifyContent: 'center' }}>
          <Ionicons name="calendar" size={38} color="#FFFFFF" />
        </View>
        <T v="display" center>
          FamCal
        </T>
        <T muted center>
          Le calendrier partagé de toute la famille — enfants et proches accompagnés compris.
        </T>
      </View>

      <Card>
        <T v="h3">Connexion par e-mail</T>
        <Segmented
          options={[
            { key: 'otp', label: 'Code à 6 chiffres' },
            { key: 'lien', label: 'Lien magique' },
          ]}
          value={method}
          onChange={setMethod}
        />
        <Field label="Adresse e-mail" value={email} onChangeText={setEmail} keyboardType="email-address" autoCapitalize="none" autoComplete="email" placeholder="vous@exemple.fr" error={!pending ? err : undefined} />
        {!pending ? (
          <Button title={method === 'otp' ? 'Recevoir un code' : 'Recevoir un lien'} icon="mail" onPress={send} full />
        ) : (
          <View style={{ gap: 10 }}>
            <Banner
              kind="demo"
              title="Connexion simulée — Démo"
              text={
                method === 'otp'
                  ? `Aucun e-mail n’a été envoyé. Code de démonstration pour ${pending.email} : ${pending.code}`
                  : `Aucun e-mail n’a été envoyé. Le lien magique est simulé par le bouton ci-dessous (${pending.email}).`
              }
            />
            {method === 'otp' ? (
              <>
                <Field label="Code reçu" value={code} onChangeText={setCode} keyboardType="number-pad" maxLength={6} placeholder="123456" error={err} autoComplete="one-time-code" />
                <Button title="Valider le code" icon="checkmark-circle" onPress={() => verify('otp')} full />
              </>
            ) : (
              <Button title="Ouvrir le lien magique (démo)" icon="link" onPress={() => verify('lien')} full />
            )}
            <Button title="Changer d’adresse" kind="ghost" onPress={() => store.set((x) => ({ ...x, pendingOtp: null }))} />
          </View>
        )}
      </Card>

      <Card>
        <Row style={{ justifyContent: 'space-between' }}>
          <T v="label">Connexion par SMS</T>
          <Badge label="SMS non configuré" color={t.textMuted} icon="chatbubble-ellipses" />
        </Row>
        <T v="small" muted>
          Prévu en Phase 2 via un serveur (YOUR_TWILIO_ACCOUNT_SID, YOUR_TWILIO_AUTH_TOKEN, YOUR_TWILIO_FROM_NUMBER — jamais dans l’app).
        </T>
        <Button title="Recevoir un SMS" icon="chatbubble" kind="secondary" disabled onPress={() => undefined} />
      </Card>

      {!cloudReady() ? (
        <Banner
          kind="info"
          title="Mode local"
          text="Supabase n’est pas configuré : vos données restent sur cet appareil (hors ligne). La synchronisation multi-appareils nécessite la configuration."
          action={<Button small kind="secondary" title="Voir la configuration" icon="construct" onPress={() => router.push('/config')} />}
        />
      ) : null}
    </Screen>
  );
}
