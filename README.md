# FamCal

Calendrier familial partagé : membres, **profils gérés** (enfants, proches accompagnés), **tutelle** (tuteur / parent / membre), événements, conflits, invitations par code. Pas de fonctionnalités sportives (FamCal ≠ FamilyFit).

Recréée from scratch en **Expo (React Native + expo-router + TypeScript)** à partir de la spécification (`vibecode-deploy-prompts/07-famcal.md`), car le code source Vibecode d’origine n’était pas disponible. Elle tourne sur iOS, Android et le web, et s’exporte en **PWA installable** qui marche hors ligne.

> ℹ️ La famille d’exemple (Camille, Karim, Yanis, Léa, Mamie Odette) est **Démo / Échantillon** : elle est fictive et signalée comme telle dans l’interface. Elle n’est chargée que si vous la choisissez.

## Fonctionnalités (100 % locales, hors ligne)

| Domaine | Contenu |
|---|---|
| Connexion | E-mail uniquement, par code à 6 chiffres ou lien magique. Elle est **simulée** : aucun e-mail n’est envoyé et le code s’affiche à l’écran, avec le libellé « Démo ». Le SMS est affiché désactivé (« SMS non configuré », Phase 2). |
| Onboarding < 2 min | 1. Créer la famille. 2. Inviter (code) et ajouter un enfant. 3. Créer un premier événement. On peut aussi rejoindre avec un code ou explorer l’exemple. |
| Agenda | Vues **Jour / Semaine / Mois**. Navigation par période et retour à aujourd’hui. **Filtres colorés par membre**. Événements sur une journée entière et répétition hebdomadaire. États vides utiles. |
| Création rapide | **≤ 3 gestes** : bouton « + », saisie du titre, « Ajouter à l’agenda ». Par défaut : jour affiché, prochaine demi-heure, vous comme participant. |
| Conflits | Deux événements qui se chevauchent pour une même personne sont signalés : badge « Conflit », bandeau par période, alerte dès la saisie et case rouge en vue mois. |
| Membres & tutelle | Adultes avec rôle, profils gérés sans compte, liens de tutelle (`guardian_links`). Une famille garde toujours au moins un tuteur, et un profil géré au moins un tuteur. |
| Permissions | **Tuteur** : tout. **Parent** : lui-même et ses pupilles, et il peut inviter. **Membre** : ses propres événements uniquement. L’interface explique tout refus (🔒, lecture seule). |
| Confidentialité des mineurs | Minimisation : prénom et éventuellement l’année de naissance. Sans **consentement de tous les tuteurs**, les autres membres ne voient que « Occupé ». La règle vaut aussi pour l’export. |
| Invitations | Code `XXXX-XXXX` valable 7 jours, avec un lien `famcal://join?code=…` (ou l’URL web). Le partage passe par la feuille de partage du système. **L’acceptation est explicite**. L’invitation peut être révoquée et son statut est suivi. |
| Temps réel « doux » | Sur le web, les onglets ouverts sur le même appareil se synchronisent instantanément (BroadcastChannel). La sync multi-appareils relève de Supabase Realtime (Phase 2). |
| Robustesse | Délai d’attente au démarrage avec écran de repli (« Réessayer » / « Continuer hors ligne ») : jamais de chargement infini. Badge « Hors ligne — données en cache ». Badge « Service optionnel indisponible ». Écran « Configuration manquante ». |
| Export | Fichier iCalendar `.ics`, importable dans Google Agenda, Apple Calendrier ou Outlook. |
| Point de vue (démo) | Comme un seul appareil sert à tout le monde, on peut « voir l’app comme » un autre adulte. Cela permet de tester les rôles et la confidentialité. |

## Lancer en local

```bash
npm install
npx expo start          # i = iOS, a = Android, w = web
npm run typecheck       # tsc --noEmit
```

## Build web / PWA

```bash
npm run build:web       # expo export -p web + manifest, service worker, icônes
npm run serve:web       # http://localhost:8080/famcal/
```

Le dossier `dist/` contient :
- `manifest.webmanifest` ;
- `sw.js`, qui pré-cache l’app pour un usage hors ligne ;
- les icônes 192/512/maskable ;
- `404.html` pour le routage SPA ;
- `.nojekyll`.

## GitHub Pages

Le workflow `.github/workflows/pages.yml` construit `dist/` et le publie à chaque push sur `main`. Il faut activer **Settings → Pages → Source : GitHub Actions**.

Dans `app.json`, `expo.experiments.baseUrl` vaut `/famcal`. **Le dépôt doit donc s’appeler `famcal`** ; sinon, ajustez cette valeur.

## Configuration (placeholders)

Copiez `.env.example` en `.env`. Sans configuration, l’app reste entièrement utilisable en local.

| Variable | Usage | Où |
|---|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` = `YOUR_SUPABASE_URL` | sync cloud, e-mail OTP réel | app (public) |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` = `YOUR_SUPABASE_ANON_KEY` | clé « anon », protégée par RLS | app (public) |
| `TWILIO_ACCOUNT_SID` = `YOUR_TWILIO_ACCOUNT_SID` | SMS (Phase 2) | **serveur uniquement** |
| `TWILIO_AUTH_TOKEN` = `YOUR_TWILIO_AUTH_TOKEN` | SMS (Phase 2) | **serveur uniquement** |
| `TWILIO_FROM_NUMBER` = `YOUR_TWILIO_FROM_NUMBER` | SMS (Phase 2) | **serveur uniquement** |

Aucun secret ne doit être placé dans une variable `EXPO_PUBLIC_*` : elle est embarquée dans l’app.

## Modèle de données

Il est prévu pour Supabase. Chaque table porte `family_id`, ce qui permet une RLS stricte par famille.

- `families(id, name)`
- `members(id, family_id, name, color, role, managed, kind, birth_year, email?)`
- `guardian_links(id, family_id, guardian_id, ward_id, consent_share)`
- `events(id, family_id, title, date, start, duration_min, member_ids, location, notes, repeat, until, created_by, updated_at)`
- `invites(code, family_id, role, created_by, expires_at, accepted_by, revoked)`

Voir `src/state.ts`. Les règles de permission (`canActFor`, `canEditEvent`, `eventVisibility`) devront être **dupliquées en politiques RLS côté serveur**. Côté client, elles ne constituent pas une sécurité.

## Limites connues

- **Pas de backend** : les données restent sur l’appareil, et la déconnexion les efface (exportez-les d’abord en `.ics`).
- **Connexion simulée** : l’e-mail OTP réel demande Supabase Auth. Le SMS est en Phase 2 et passe par un serveur.
- **Invitations mono-appareil** : sans sync cloud, un code ne peut être accepté que sur l’appareil qui l’a créé.
- **Pas de notifications ni de rappels** : prévus en Phase 2 avec expo-notifications.
- **Récurrence limitée** à « chaque semaine » : on ne peut pas modifier une seule occurrence.
