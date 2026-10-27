import React, { useState } from 'react';
import { Platform, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/kit/theme';
import { Badge, Banner, Button, Card, Chip, Field, ListItem, Row, Screen, Section, T, useToast } from '@/kit/ui';
import { fmtDateTime } from '@/kit/format';
import { exportText } from '@/kit/files';
import { useOnline } from '@/kit/net';
import { TabHeader } from '@/components/common';
import { cloudReady, smsReady } from '@/config';
import { canManageFamily, loadDemo, me, mutate, realtimeLocal, roleLabel, signOut, store, toICS } from '@/state';

const confirm = (q: string) => (Platform.OS === 'web' ? ((globalThis as { confirm?: (m: string) => boolean }).confirm?.(q) ?? true) : true);

export default function Reglages() {
  const t = useTheme();
  const router = useRouter();
  const toast = useToast();
  const online = useOnline();
  const s = store.use();
  const viewer = me(s);
  const [fam, setFam] = useState(s.family?.name ?? '');
  const unavailable = <Badge label="Service optionnel indisponible" color={t.textMuted} icon="cloud-offline" />;

  return (
    <Screen header={<TabHeader title="Réglages" />}>
      <Section title="Compte">
        <Card>
          <T v="label">{s.session?.email}</T>
          <T v="small" muted>
            Connexion {s.session?.method === 'lien' ? 'par lien magique' : 'par code'} (simulée — démo) · {s.session ? fmtDateTime(s.session.at) : ''}
          </T>
          <T v="small" muted>
            Vous êtes : {viewer?.name} · {viewer ? roleLabel(viewer.role) : ''}
          </T>
        </Card>
        <T v="label" muted>
          Point de vue (démo mono-appareil)
        </T>
        <Row wrap gap={6}>
          {s.members
            .filter((m) => !m.managed)
            .map((m) => (
              <Chip key={m.id} label={`${m.name} · ${roleLabel(m.role)}`} color={m.color} selected={m.id === s.meId} onPress={() => (store.set((x) => ({ ...x, meId: m.id })), toast(`Point de vue : ${m.name}`, 'info'))} />
            ))}
        </Row>
        <T v="small" muted>
          Permet de tester les permissions (tuteur / parent / membre) et la confidentialité des mineurs. En mode cloud, chacun se connecte avec son propre e-mail.
        </T>
      </Section>

      {canManageFamily(viewer) ? (
        <Section title="Famille">
          <Field label="Nom de la famille" value={fam} onChangeText={setFam} onBlur={() => fam.trim() && mutate((x) => (x.family ? { ...x, family: { ...x.family, name: fam.trim() } } : x))} />
        </Section>
      ) : null}

      <Section title="Synchronisation & services">
        <Card>
          <ListItem icon={online ? 'wifi' : 'cloud-offline'} title={online ? 'En ligne' : 'Hors ligne — données en cache'} sub={`Dernière modification locale : ${fmtDateTime(s.updatedAt)}`} />
          <ListItem icon="albums" title="Temps réel entre onglets" sub={realtimeLocal() ? 'Actif : les autres onglets de ce navigateur se mettent à jour.' : 'Non disponible sur cette plateforme.'} />
          <ListItem icon="cloud" title="Sync multi-appareils (Supabase)" sub={cloudReady() ? 'Configurée (branchement Phase 2)' : 'Non configurée — tout reste sur cet appareil'} right={cloudReady() ? undefined : unavailable} onPress={() => router.push('/config')} />
          <ListItem icon="chatbubble-ellipses" title="SMS" sub="Phase 2, via serveur Twilio" right={smsReady() ? undefined : <Badge label="SMS non configuré" color={t.textMuted} />} />
          <ListItem icon="notifications" title="Rappels / notifications" sub="Phase 2 (expo-notifications)" right={<Badge label="Phase 2" color={t.textMuted} />} />
        </Card>
      </Section>

      <Section title="Données">
        <Row wrap gap={8}>
          <Button
            title="Exporter (.ics)"
            icon="download"
            kind="secondary"
            onPress={() => exportText(`famcal-${(s.family?.name ?? 'famille').replace(/\W+/g, '-').toLowerCase()}.ics`, toICS(s), 'text/calendar').then(() => toast('Calendrier exporté', 'success'))}
          />
          {!s.isDemo ? (
            <Button
              title="Charger l’exemple (Démo)"
              icon="flask"
              kind="ghost"
              onPress={() => {
                if (!confirm('Remplacer vos données locales par la famille d’exemple ?')) return;
                loadDemo();
                toast('Famille d’exemple chargée', 'info');
              }}
            />
          ) : null}
        </Row>
        <T v="small" muted>
          L’export respecte la confidentialité : les événements privés d’un mineur apparaissent comme « Occupé ».
        </T>
      </Section>

      <Section title="Confidentialité des mineurs">
        <Card>
          <T v="small">• Profils gérés : prénom et année de naissance facultative uniquement — ni e-mail, ni téléphone, ni photo.</T>
          <T v="small">• Les détails des événements d’un enfant ne sont visibles que de ses tuteurs et des participants, sauf consentement de tous ses tuteurs.</T>
          <T v="small">• Aucune donnée n’est envoyée à un serveur tant que la synchronisation n’est pas configurée.</T>
          <T v="small">• Aucun traceur publicitaire, aucune fonctionnalité de suivi d’activité physique.</T>
        </Card>
      </Section>

      <View style={{ gap: 8 }}>
        <Button
          title="Se déconnecter et effacer cet appareil"
          icon="log-out"
          kind="danger"
          onPress={() => {
            if (!confirm('Se déconnecter ? Les données locales de cet appareil seront effacées (exportez-les avant si besoin).')) return;
            signOut().then(() => router.replace('/login'));
          }}
        />
        <T v="caption" muted center>
          FamCal 1.0.0 · données locales · {s.isDemo ? 'Démo / Échantillon' : 'vos données'}
        </T>
      </View>
      {s.isDemo ? <Banner kind="demo" title="Démo / Échantillon" text="La famille d’exemple (Camille, Karim, Yanis, Léa, Mamie Odette) est fictive." /> : null}
    </Screen>
  );
}
