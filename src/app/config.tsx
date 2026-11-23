import React from 'react';
import { View } from 'react-native';
import { useTheme } from '@/kit/theme';
import { Badge, Banner, Card, Row, Screen, T } from '@/kit/ui';
import { isConfigured, maskValue } from '@/kit/config';
import { BackHeader } from '@/components/common';
import { CONFIG, cloudReady } from '@/config';
import { useConfigAccess } from '@/lib/devAccess';

/** Diagnostic technique : __DEV__ ou geste caché (5 touches). Sinon, Mode local sans liste de variables. */
export default function ConfigScreen() {
  const allowed = useConfigAccess();
  const t = useTheme();
  const ready = cloudReady();
  if (!allowed) {
    return (
      <Screen header={<BackHeader title="Mode local" />}>
        <Banner kind="info" title="Mode local" text="Vos données restent sur cet appareil — synchronisation bientôt disponible. L’agenda, les membres, la création et l’export fonctionnent sans réseau." />
      </Screen>
    );
  }
  return (
    <Screen header={<BackHeader title={ready ? 'Configuration' : 'Configuration manquante'} />}>
      {ready ? (
        <Banner kind="success" text="Supabase est renseigné. Familycal envoie la file locale et récupère les agendas du foyer. Si le projet refuse la connexion, l’agenda local continue." />
      ) : (
        <Banner
          kind="warning"
          title="Synchronisation cloud non configurée"
          text="Familycal fonctionne en local : calendrier, membres, tutelle et invitations restent sur cet appareil. Pour la synchronisation entre les téléphones de la famille, renseignez Supabase dans .env puis relancez. La migration SQL du dépôt n’est pas appliquée toute seule."
        />
      )}
      {CONFIG.map((c) => (
        <Card key={c.name}>
          <Row style={{ justifyContent: 'space-between' }}>
            <View style={{ flex: 1 }}>
              <T v="mono">{c.name}</T>
              <T v="small" muted>
                {c.note}
              </T>
            </View>
            {c.phase ? <Badge label={c.phase} color={t.textMuted} /> : <Badge label={isConfigured(c.value) ? 'OK' : 'Manquant'} color={isConfigured(c.value) ? t.success : t.warning} />}
          </Row>
          <T v="mono" muted>
            {maskValue(c)}
          </T>
        </Card>
      ))}
      <T v="small" muted>
        Les secrets (Twilio auth token, clé service Supabase) ne doivent jamais être placés dans une variable EXPO_PUBLIC_* : ils seraient visibles dans l’app.
      </T>
    </Screen>
  );
}
