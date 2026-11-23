# Kaizen

Petites améliorations sur `release/next`. `main` n’est pas fusionné : il déploie le site.

## 2026-11-23

Les builds TestFlight 3 et 5 se terminaient par `SIGNAL 6`, exception native non rattrapée dans `performVoidMethodInvocation` (une méthode void du pont React Native). Les builds 7 et 8 n’ont pas encore ce signal. La piste au lancement est l’import du baril `expo-notifications` : son effet de bord `DevicePushTokenAutoRegistration` peut appeler `registerForRemoteNotifications`, une méthode void, alors que l’entitlement `aps-environment` est retiré.

### 1. Rappels et calendrier natifs

**Avant.** Cinq cents millisecondes après le premier rendu, `rescheduleNotifications` importait `expo-notifications` en entier, puis lisait ou demandait la permission et annulait les rappels programmés. L’import du calendrier du téléphone (`requestCalendarPermissionsAsync`) n’était pas entouré : une exception native fermait l’app.

**Après.** Les rappels n’importent que la permission et la programmation locales, jamais le jeton push. Rien n’est appelé tant que l’app n’est pas active, le module absent est ignoré, la permission est lue avant d’être demandée, et la programmation n’a lieu que si elle est accordée. Chaque appel est dans un `try/catch`. Le même filet entoure la lecture du calendrier du téléphone. Les rappels locaux restent en place. Aucune clé de stockage ne change.

**Fichiers.** `src/notifications/guard.ts`, `src/notifications/run.ts`, `src/calendar/device.ts`, `src/components/FamilyServices.tsx`.

**Tests.** `src/notifications/guard.test.ts`.

### 2. Un événement vu sur le second appareil

**Avant.** La synchro temps réel n’écoutait qu’une fois. Si le canal se fermait, le drapeau restait levé et le second téléphone gardait l’ancien agenda jusqu’à un geste qui réécrivait l’état local.

**Après.** Revenir au premier plan, ouvrir l’onglet Agenda, ou tirer l’agenda vers le bas rappelle `runBackgroundSync`. Un canal en erreur est retiré pour que la fois suivante puisse se réabonner. Sans Supabase configuré, l’appel ne contacte personne et n’écrit pas le document local.

**Fichiers.** `src/sync/backend.ts`, `src/components/FamilyServices.tsx`, `src/app/(tabs)/agenda.tsx`, `src/kit/ui.tsx`.

**Tests.** Le typecheck couvre les nouveaux paramètres. La synchro existante reste couverte par `src/sync/sync.test.ts`. Aucune migration hébergée.

### 3. Premier écran

**Avant.** La phrase « les agendas restent sur cet appareil » n’apparaissait qu’après la connexion, dans le bandeau.

**Après.** La connexion l’affiche sous le titre, avec le texte déjà traduit `localMode`. Le parcours, les données et la clé `famcal@v1` sont les mêmes.

**Fichiers.** `src/app/login.tsx`.

**Tests.** Aucun texte persisté. `npx tsc --noEmit` et `npm test`.
