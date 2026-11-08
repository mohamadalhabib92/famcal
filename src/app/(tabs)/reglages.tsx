import React, { useState } from 'react';
import { Pressable, View } from 'react-native';
import { useRouter } from 'expo-router';
import { useTheme } from '@/kit/theme';
import { Badge, Banner, Button, Card, Chip, Field, ListItem, Row, Screen, Section, T, useToast } from '@/kit/ui';
import { fmtDateTime } from '@/kit/format';
import { exportText } from '@/kit/files';
import { useOnline } from '@/kit/net';
import { TabHeader } from '@/components/common';
import { cloudReady, smsReady } from '@/config';
import { isDevBuild, registerHiddenTap, useConfigAccess } from '@/lib/devAccess';
import { useOptionalUnavailable } from '@/lib/optional';
import { canManageFamily, eraseLocalData, me, mutate, realtimeLocal, replaceWithDemo, roleLabel, signOut, store, toICS } from '@/state';

export default function Reglages() {
  const t = useTheme();
  const router = useRouter();
  const toast = useToast();
  const online = useOnline();
  const s = store.use();
  const viewer = me(s);
  const diagnostic = useConfigAccess();
  const optionalDown = useOptionalUnavailable();
  const [fam, setFam] = useState(s.family?.name ?? '');
  const [demoOpen, setDemoOpen] = useState(false);
  const [demoPhrase, setDemoPhrase] = useState('');
  const [eraseOpen, setEraseOpen] = useState(false);
  const [erasePhrase, setErasePhrase] = useState('');
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
          <ListItem
            icon="cloud"
            title="Sync multi-appareils (Supabase)"
            sub={cloudReady() ? 'Configurée (branchement à venir)' : 'Non configurée — tout reste sur cet appareil'}
            right={!cloudReady() || optionalDown ? unavailable : undefined}
            onPress={diagnostic ? () => router.push('/config') : undefined}
          />
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
            <Button title="Charger l’exemple (Démo)" icon="flask" kind="ghost" onPress={() => setDemoOpen(true)} />
          ) : null}
        </Row>
        {demoOpen && !s.isDemo ? (
          <Card>
            <T v="small">
              Remplacer le calendrier lisible de cet appareil par la famille d’exemple. Écrivez EXEMPLE. Une confirmation automatique ne suffit pas. Si la copie est en quarantaine, elle n’est pas écrasée.
            </T>
            <Field label="Confirmation" value={demoPhrase} onChangeText={setDemoPhrase} autoCapitalize="characters" autoCorrect={false} placeholder="EXEMPLE" />
            <Button
              title="Remplacer par l’exemple"
              kind="secondary"
              onPress={() => {
                const result = replaceWithDemo(demoPhrase.trim());
                if (result === 'refused') {
                  toast('Remplacement refusé. Les données locales sont inchangées.', 'error');
                  return;
                }
                toast('Famille d’exemple chargée', 'info');
                setDemoOpen(false);
              }}
            />
          </Card>
        ) : null}
        <T v="small" muted>
          L’export respecte la confidentialité : les événements privés d’un mineur apparaissent comme « Occupé ».
        </T>
      </Section>

      <Section title="Confidentialité des mineurs">
        <Card>
          <T v="small">• Profils gérés : prénom et année de naissance facultative uniquement — ni e-mail, ni téléphone, ni photo.</T>
          <T v="small">• Sans le consentement de tous les tuteurs d’un enfant, les autres membres ne voient que « Occupé ». Le rôle Tuteur, les tuteurs liés et les participants voient le détail.</T>
          <T v="small">• Aucune donnée n’est envoyée à un serveur tant que la synchronisation n’est pas configurée.</T>
          <T v="small">• Aucun traceur publicitaire, aucune fonctionnalité de suivi d’activité physique.</T>
        </Card>
      </Section>

      <View style={{ gap: 8 }}>
        <Button
          title="Se déconnecter"
          icon="log-out"
          kind="secondary"
          onPress={() => {
            signOut().then(() => router.replace('/login'));
          }}
        />
        <T v="small" muted>
          La déconnexion retire seulement la session. Le calendrier local n’est pas effacé, y compris sur iPhone et Android.
        </T>
        <Button title="Effacer les données de cet appareil" icon="trash" kind="danger" onPress={() => setEraseOpen((open) => !open)} />
        {eraseOpen ? (
          <Card>
            <T v="small">
              Action distincte de la déconnexion. Elle supprime le calendrier de cet appareil, y compris une copie en quarantaine. Écrivez EFFACER. Cela ne restaure rien.
            </T>
            <Field label="Confirmation" value={erasePhrase} onChangeText={setErasePhrase} autoCapitalize="characters" autoCorrect={false} placeholder="EFFACER" />
            <Button
              title="Effacer définitivement"
              kind="danger"
              onPress={() => {
                eraseLocalData(erasePhrase.trim()).then((result) => {
                  if (result !== 'erased') {
                    toast('Effacement non effectué. Les données locales sont inchangées.', 'error');
                    return;
                  }
                  toast('Données locales effacées de cet appareil.', 'info');
                  router.replace('/login');
                });
              }}
            />
          </Card>
        ) : null}
        <Pressable
          accessibilityRole="text"
          accessibilityLabel={`FamCal 1.0.0, ${s.isDemo ? 'démo' : 'vos données'}`}
          onPress={() => {
            if (registerHiddenTap()) {
              toast('Diagnostic technique ouvert', 'info');
              router.push('/config');
            }
          }}
        >
          <T v="caption" muted center>
            FamCal 1.0.0 · données locales · {s.isDemo ? 'Démo / Échantillon' : 'vos données'}
          </T>
        </Pressable>
        {isDevBuild() ? <Button title="Diagnostic technique" kind="ghost" icon="construct" onPress={() => router.push('/config')} /> : null}
      </View>
      {s.isDemo ? <Banner kind="demo" title="Démo / Échantillon" text="La famille d’exemple (Camille, Karim, Yanis, Léa, Mamie Odette) est fictive." /> : null}
    </Screen>
  );
}
