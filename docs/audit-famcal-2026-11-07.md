# Audit FamCal — 7 novembre 2026

Périmètre : dépôt `mohamadalhabib92/famcal`, branche `main` au commit `ad76ba25fa176f3844fbc571bd8c4e942a7a4f15`. Le correctif de quarantaine est le commit `20f72520d711c97e4cd37b14a3465506424e7ed2` sur `cursor/famcal-preservation-quarantine-536b`. La PR UX ouverte n’a pas été modifiée. RH Master est hors périmètre. Aucune requête Supabase, aucun secret, aucun envoi d’invitation, aucune écriture calendrier, aucune suppression de données réelles, aucun build EAS, aucune soumission, aucun déploiement.

## Diagnostic (5 lignes)

FamCal, sur `main`, est un agenda familial Expo / PWA entièrement local : la synchronisation multi-appareils, le calendrier hijri, Apple Calendrier et Apple Rappels ne sont pas implémentés. La garde « ne pas écrire avant une lecture réussie » protège déjà un JSON illisible, mais un document valide quoique futur ou mal formé pouvait être fusionné puis réécrit, et la déconnexion efface encore un document sain. Cette branche ajoute une seule fondation : quarantaine du blob d’origine et export des octets lus, sans prétendre restaurer une sauvegarde. Ici, `npm test` (10/10) et `tsc --noEmit` ont réussi ; aucun appareil, aucun backend et aucun projet Supabase n’ont été exercés. Le code seul ne garantit pas zéro perte : une répétition snapshot puis restauration sur un projet isolé reste obligatoire avant toute bascule, et la région `eu-west-1` n’apparaît nulle part dans la configuration.

## Méthode et PRs réelles

| Élément | Constat | Preuve |
|---|---|---|
| `main` | 5 commits. Dernier : merge de la PR #1. | `ad76ba25` (2026-11-03), parent `9890d0f8` |
| PR #1 | Mergée. Mode local, repli de démarrage, garde du stockage, tutelle. | https://github.com/mohamadalhabib92/famcal/pull/1 |
| PR #2 | Ouverte, non mergée, non écrasée. UX, mode sombre, accessibilité, clé séparée `famcal:vibrations@v1`. Ne touche pas `src/kit/store.ts` ni `src/state.ts`. | https://github.com/mohamadalhabib92/famcal/pull/2 — branche `ux/passe-plaisir-2026-11-04`, commits `097b1616` et `55a60ad6` |
| CI sur `main` | Le workflow Pages lance `tsc` et `npm run build:web`. Il ne lance pas `npm test`. Déclenché seulement sur `main`. | `.github/workflows/pages.yml:4-32`. Dernier succès observé : run `41575149927` (merge PR #1). |
| Config Supabase | Pas de dossier `supabase/`, pas de `config.toml`, pas de migrations. `.env` absent dans cet environnement. Les variables du dépôt sont des placeholders `YOUR_*`. | `.env.example:4-7`, `src/config.ts:3-19` |

La liste demandée compte plus de douze thèmes. Tous sont traités ci-dessous. La pédagogie est dite non applicable, avec la raison.

## Tableau impact / effort

Échelle 1–5 : 5 = le plus fort. L’effort est celui d’une suite bornée, pas un calendrier. Aucun chiffre d’usage réel n’existe dans le dépôt : l’impact est un jugement d’ingénierie sur la perte de données ou le rejet store, pas une mesure d’audience.

| Sujet | Impact | Effort | État sur `main` |
|---|---|---|---|
| Quarantaine JSON illisible / version future / forme incompatible, export des octets | 5 | 2 | Partiel avant cette branche (illisible seulement). Traité ici, sans UI. |
| Déconnexion et « Charger l’exemple » qui effacent sans confirmation native | 5 | 2 | Présent. Non modifié (la PR #2 touche déjà `reglages.tsx`). |
| Tombstones, outbox, conflits par événement avant tout temps réel | 5 | 4 | Absents. `BroadcastChannel` remplace tout le document. |
| Bascule Supabase (RLS, région, répétition snapshot/restore) | 5 | 5 | Bloquée : pas de projet dans le dépôt, région non vérifiable sans dashboard. |
| Sync Apple Calendrier / Rappels et hijri | 4 | 5 | Absents. Export `.ics` grégorien seulement. Décision produit avant code. |
| Fuseaux, date seule, récurrence qui traverse minuit | 3 | 2 | Bugs de modèle locaux. Non traités dans cette branche. |
| CI : lancer `npm test` hors de Pages | 3 | 1 | `npm test` existe, le workflow ne l’appelle pas. |
| Accessibilité (PR #2) | 3 | 1 | Non sur `main`. Branche UX à relire, pas à réécrire. |
| iPad / RTL / largeur | 2 | 3 | iPad déclaré. Mise en page téléphone élargie. Pas de RTL. |
| Invitation téléphone / e-mail réelle | 3 | 4 | Code local + feuille de partage. SMS et e-mail réels absents. |
| IA de saisie | 2 | 3 | Placeholder serveur uniquement. Aucun appel. |

## 1. Vision et concurrents nommés

Vision lue dans le dépôt : agenda familial partagé, profils gérés (enfant, proche accompagné), rôles tuteur / parent / membre, conflits, invitation par code, export iCalendar, hors ligne. Ce n’est pas FamilyFit (`README.md:3`, `store/ios-metadata.md:70-74`).

Le cahier de cette mission demande en plus : temps réel, chacun n’édite que ses événements, invitations téléphone ou e-mail, grégorien et hijri, synchro Apple Calendrier et Rappels. Écart factuel :

- Temps réel multi-appareils : annoncé Phase 2. Seul `BroadcastChannel` relie les onglets web du même appareil (`src/state.ts` sur `ad76ba25`, lignes 104-120).
- Édition : un tuteur édite tous les événements ; un parent édite les siens et ceux de ses pupilles ; un membre édite les siens (`canEditEvent`, `ad76ba25:src/state.ts:168-172`). Ce n’est pas « chacun uniquement les siens ».
- Invitation : code `XXXX-XXXX`, 7 jours, feuille de partage. Pas d’envoi e-mail ni SMS (`smsReady` retourne `false`, `src/config.ts:19-20`).
- Hijri : aucune occurrence dans le code produit. L’export force `CALSCALE:GREGORIAN` (`ad76ba25:src/state.ts:524`).
- Apple Calendrier / Rappels : pas de dépendance `expo-calendar` ni `expo-notifications` (`package.json`). Le réglage l’affiche « Phase 2 » (`src/app/(tabs)/reglages.tsx:74`).

Concurrents nommés, sources primaires ou pages produit. Les comparatifs de blogs 2026 se contredisent sur les prix ; aucun prix n’est repris comme fait ni comme baseline.

- Apple Calendrier : calendriers multiples, abonnement `.ics` en lecture, suppression ou désabonnement d’un calendrier. [Set up multiple calendars on iPhone](https://support.apple.com/guide/iphone/use-multiple-calendars-iph3d1110d4/ios), [Delete calendars and remove events](https://support.apple.com/en-us/102444).
- Hijri chez Apple : calendrier alternatif affiché à côté du grégorien, réglage d’affichage, pas un second jeu d’événements. [iPhone Calendar settings](https://support.apple.com/guide/iphone/change-calendar-settings-iphc37be2016/ios), [iCloud.com Hijri](https://support.apple.com/guide/icloud/customize-the-calendar-view-mm6b1a9ed4/icloud), [Mac lunar calendars](https://support.apple.com/guide/calendar/a-chinese-hebrew-islamic-lunar-calendar-icl263c22bef/mac).
- Google Calendar : partage d’un calendrier avec droits « voir » ou « modifier ». [Share your calendar](https://support.google.com/calendar/answer/37082).
- TimeTree, Cozi, FamilyWall : agendas familiaux du marché. Pages produit : [timetreeapp.com](https://timetreeapp.com/), [cozi.com](https://www.cozi.com/), [familywall.com](https://www.familywall.com/). Un comparatif secondaire décrit TimeTree comme calendrier partagé, Cozi comme organiseur (listes, repas), FamilyWall comme suite plus large, et signale que Cozi et FamilyWall ont le même propriétaire : [EpiHem, Cozi vs FamilyWall vs TimeTree](https://epihem.com/en/guides/cozi-vs-familywall-vs-timetree/). Ce blog n’est pas une mesure FamCal.
- La fiche App Store interne affirme qu’une app « FamCal: Gemeinsamer Kalender » existe déjà sur l’App Store suisse (`store/ios-metadata.md:73`). Cet audit n’a pas rouvert l’App Store pour le revérifier.

Wow déjà là, et seulement en local : conflits par chevauchement, « Occupé » sans consentement unanime des tuteurs, profils gérés sans e-mail. Manque pour la vision demandée : sync réelle, hijri, Calendrier/Rappels, invitation téléphone ou e-mail qui part vraiment, édition limitée au créateur si c’est le choix retenu.

## 2. Fonctions manquantes et fonctions marquantes

Marquant et présent : vues jour / semaine / mois, création courte, tutelle, export `.ics` qui masque un mineur en « Occupé » (`ad76ba25:src/state.ts:521-541`).

Manquant au regard du cahier : temps réel multi-appareils, téléphone, hijri, EventKit, rappels, import `.ics`, exception de récurrence, tombstone, file d’attente hors ligne, sauvegarde restaurable. Les drapeaux commentés `FEATURE_CUSTODY`, `FEATURE_EXPENSES`, `FEATURE_MESSAGES`, `FEATURE_SMS` sont à `false` ou non lus (`.env.example:14-17`). Les laisser éteints évite d’élargir le produit avant la préservation.

## 3. UX iPhone, iPad, web, RTL

`supportsTablet: true` (`app.json:17`). La colonne est plafonnée à 820 pt (`src/kit/ui.tsx:104`). Le mois compacte sous 520 pt de large (`src/app/(tabs)/agenda.tsx:94`). Il n’y a pas de disposition iPad spécifique (colonnes, Split View). Non testé sur iPad.

Web : PWA, `lang: fr` (`app.json:77`), `baseUrl: /famcal`. RTL : aucune utilisation de `I18nManager` ni de `writingDirection`. Les chevrons et le bouton flottant sont en coordonnées physiques sur `main` (`agenda.tsx` utilise `right` pour le bouton « + » ; la PR #2 propose `end`, non mergée). Un interface arabe n’est pas prévue.

## 4. Accessibilité

Sur `main` : rôles et libellés sur plusieurs boutons, cibles 44 pt sur `IconButton` (`src/kit/ui.tsx:243-255`), `accessibilityLiveRegion` sur les toasts (`src/kit/ui.tsx:552`). Des `numberOfLines` tronquent encore des titres (`agenda.tsx:202`, `ui.tsx:126`). Pas de test de contraste sur `main`. La PR #2 ajoute un test AA et un scan ; ce n’est pas le code de `main`, et cet audit ne l’a pas ré-exécuté. Lecteur d’écran, Dynamic Type et « Réduire les animations » : non vérifiés sur appareil.

## 5. Architecture, tests, CI

Architecture : Expo Router, un store AsyncStorage `famcal@v1`, modèle dans `src/state.ts`, UI dans `src/app`. Pas de couche sync. Le client n’est pas une frontière de sécurité (`README.md:85`).

Tests sur `main` avant cette branche : 4 cas de course à l’hydratation (`src/kit/store.persistence.test.ts`). Cette branche en ajoute 6. `npm test` ne fait pas partie du workflow Pages (`.github/workflows/pages.yml:27-29` lance `tsc` puis `build:web` seulement).

## 6. Performance

Aucune mesure. Plafond de démarrage codé à 8 s (`src/kit/ui.tsx:575`, `BOOT_CAP_MS`). Écriture locale débouncée de 150 ms (`src/kit/store.ts`, timer de `persist`). Mois = 42 cellules, pas de liste virtualisée à enjeu. Pas de budget, pas de trace, pas de percentile. Ne pas inventer un p95.

## 7. Batterie

Pas de localisation, pas de fetch au boot, pas de push (`README.md:23` et limites). Sur mobile, un écouteur NetInfo reste actif (`src/kit/net.tsx:23-26`). Coût batterie non mesuré. Ne pas le qualifier de « faible » sans instrument.

## 8. Sécurité et vie privée

- Données locales : e-mail saisi, prénoms, année de naissance facultative, événements, codes d’invitation. Politique : `public/privacy/index.html` (mise à jour affichée 27 octobre 2026) dit qu’aucun serveur FamCal ne reçoit ces données. C’est cohérent avec le code actuel tant que Supabase reste un placeholder.
- OTP simulé : le code à 6 chiffres est écrit dans le même blob et renvoyé à l’UI (`requestOtp`, `ad76ba25:src/state.ts:455-458`). Ce n’est pas une authentification.
- Déconnexion = `store.reset()` = `removeItem` (`ad76ba25:src/state.ts:447-449` et `store.ts:124-132`). Effacement réel d’un document lisible.
- Confirmation native absente : `confirm` retourne `true` hors web (`src/app/(tabs)/reglages.tsx:15`). Sur iPhone et Android, « Se déconnecter et effacer cet appareil » et « Charger l’exemple » partent sans dialogue. Même schéma pour supprimer un événement (`src/app/event/[id].tsx:30`) et retirer un membre.
- Sentry : désactivé si la valeur commence par `YOUR_` (`src/lib/crash.ts:8-9`). Aucun DSN dans le dépôt. S’il était configuré, le message d’erreur part vers l’hôte du DSN. Non testé.
- Clé `anon` : prévue publique, commentaire RLS (`src/config.ts:11`). Aucune politique RLS n’existe dans le dépôt. `user_metadata` n’est pas utilisé (rien à auditer). Pas de `service_role`.
- Manifeste iOS : `NSPrivacyCollectedDataTypes` vide, tracking false (`app.json:27-33`). À revoir avant tout backend, comme la fiche le dit déjà (`store/ios-metadata.md:48-51`).

## 9. nLPD et RGPD

La politique cite la nLPD et, « le cas échéant », le RGPD (`public/privacy/index.html`, section 8). Textes : [nLPD, Fedlex](https://www.fedlex.admin.ch/eli/cc/2022/491/fr), [RGPD, EUR-Lex 2016/679](https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32016R0679).

Constat code : pas de compte serveur, pas de registre de traitement, pas de liste de sous-traitants, pas de durée de rétention serveur, pas de suppression de compte distant (il n’y a pas de compte). Le bouton local efface l’appareil. Les mineurs : prénom et année, consentement des tuteurs, masquage « Occupé » y compris à l’export. Ce masquage est client : il ne protège pas un futur lecteur SQL.

`eu-west-1` (Irlande) est une région Supabase documentée ([Available regions](https://supabase.com/docs/guides/platform/regions)). Elle ne figure pas dans ce dépôt. Un placeholder d’URL ne prouve pas la résidence. Changer de région plus tard exige un nouveau projet ([Change Project Region](https://supabase.com/kb/troubleshooting/change-project-region-eWJo5Z)). Aucune requête de production n’a été faite. La compétence juridique (Suisse / UE / utilisateurs) reste une décision de Mohamed, pas un fait déduit du code.

## 10. Linguistique

Interface française en dur : mois, jours (`src/kit/format.ts:23-26`), chaînes dans les écrans. Pas de catalogue i18n. Semaine commencée le lundi (`weekStart`, `ad76ba25:src/state.ts:226-229`) alors que le tableau `DAYS_FR` commence le dimanche : les deux sont cohérents chacun de son côté (index JS vs lundi ISO). Pas d’arabe, pas de chiffres arabes-indic, pas de libellés hijri. La fiche store a un paragraphe anglais (`store/ios-metadata.md:42-43`).

## 11. Pédagogie

Non applicable. FamCal n’est pas un parcours d’apprentissage, pas de leçon, pas de progression scolaire. Les textes de tutelle expliquent un droit, ils ne constituent pas une pédagogie. Ne pas ajouter de couche « éducative » pour cocher la case.

## 12. IA : utilité, gardes, coût

`OPENAI_API_KEY` est un placeholder commenté, réservé serveur (`.env.example:23`). Aucun appel, aucun prompt, aucun plafond, aucun coût mesuré. Utile plus tard, seulement après préservation et sync : brouillon d’événement en langage naturel, confirmation humaine avant écriture, pas de prénom d’enfant dans le prompt, clé jamais dans `EXPO_PUBLIC_*`. Hors de cette branche.

## 13. Stores

Brouillon iOS : bundle `ch.mohamadba.famcal`, EAS project id présent dans `app.json` (identifiant de projet, pas une clé secrète), `eas.json` a un profil `submit.production` vide. « Rien n’a été soumis » (`store/ios-metadata.md:3`). Cet audit n’a pas lancé EAS. Risques déjà écrits dans la fiche : nom déjà pris (non revérifié ici), proximité avec FamilyFit, app « partagée » qui ne synchronise pas, captures iPad obligatoires parce que `supportsTablet` est vrai. Android : `versionCode` 1, pas de fiche Play dans le dépôt.

## 14. Croissance, éthique, KPI

Aucun analytics (`public/privacy/index.html`, section 4). Donc aucun KPI mesuré : pas de rétention, pas de crash rate, pas d’activation. Ne pas en inventer. Éthique déjà posée : famille d’exemple étiquetée Démo, minimisation mineurs, pas de pub. Avant une croissance : ne pas publier deux agendas quasi identiques (note FamilyFit), ne pas présenter la sync comme réelle, ne pas collecter une année de naissance sur un serveur sans mettre à jour la politique et le manifeste.

Cibles proposées plus bas : ce sont des seuils de test ou des conditions de bascule, pas des baselines produit.

## 15. Synergies

Même éditeur, FamilyFit est un autre dépôt : la fiche demande de ne pas les soumettre tous les deux tels quels (`store/ios-metadata.md:74`). Pas de code partagé dans ce repo. Les drapeaux custody / dépenses / messages sont éteints. RH Master n’est pas dans ce dépôt et n’a pas été ouvert. Une synchro calendrier commune n’existe pas encore ; la coller avant les tombstones copierait le problème de perte.

## Préservation : ce qui a été inspecté

| Chemin | Constat sur `ad76ba25` | Conséquence |
|---|---|---|
| Backup / restore | Pas de fonction. Export `.ics` uniquement, sans import. | Copie partielle, pas un snapshot du blob. |
| JSON illisible | `JSON.parse` en échec : retour sans `setItem` (`store.ts:108-111`). Pas d’export. `durable` reste faux. | Octets gardés si personne n’appelle `reset` pendant la lecture. Si `reset` part avant la fin de `getItem`, le `if (wipe)` des lignes 95-98 efface la clé avant même le `parse`. L’UI voit l’état vide. |
| `null`, tableau, nombre | Parse réussi. L’étalement d’un tableau ou d’un nombre n’est pas rejeté comme document. `null` s’étale en silence. | Un document « valide » mais inutilisable devient durable, puis la prochaine écriture remplace les octets. |
| Champs inconnus | Fusion superficielle `{...initial(), ...parsed}` (`store.ts:106`). Les clés de premier niveau suivent l’objet. `upsertEvent` réécrit l’événement édité avec l’étalement de `ev` (`state.ts:398`), donc les extras de cet événement suivent si l’appelant les passe. | Pas de version. Une forme future est traitée comme la forme actuelle. |
| Dates / fuseaux | Jour `YYYY-MM-DD` par date locale (`parseDay`, `state.ts:211-214`). `fmtDate` fait `new Date(chaine)` (`format.ts:30-32`) : une date seule est minuit UTC, donc la veille dans un fuseau négatif. L’écran détail mélange `T12:00` local et `fmtDate` (`event/[id].tsx:38`). | Décalage d’affichage possible. Non testé sur appareil. |
| Récurrence | `weekly` seulement, même jour de semaine local, pas d’exception (`state.ts:232-236`). L’ICS tronque la fin à 23:59 le même jour (`state.ts:530`). Pas de `TZID`. | Une garde tardive ou un voyage de fuseau perd la fin. Pas de série éditable occurrence par occurrence. |
| Tombstones | `deleteEvent` filtre le tableau (`state.ts:403`). | Une sync future ressuscite l’événement supprimé, ou perd la suppression. |
| Outbox / idempotence | Absents. `BroadcastChannel` : le document au `updatedAt` le plus grand remplace l’autre (`state.ts:116`). | Deux onglets qui éditent deux événements : un des deux edits disparaît. |
| Permissions / mineurs | Règles client ci-dessus. Année de naissance, pas de date complète. | À dupliquer en RLS avant Supabase. Le client ne suffit pas. |
| Suppression externe Calendrier / Rappels | Aucun lien EventKit. Supprimer dans Apple Calendrier un `.ics` importé ne revient pas dans FamCal, et l’inverse est faux aussi. | Pas de conséquence croisée aujourd’hui. Le jour où la sync existera, il faudra un tombstone avant d’écrire dans le calendrier système. Apple documente la suppression d’un événement ou le désabonnement d’un calendrier ([support 102444](https://support.apple.com/en-us/102444)). |
| Reset destructif | Voulu pour un document sain. Interdit par cette mission pour un blob illisible ou futur. | Voir l’implémentation. |

## Fondation implémentée (cette branche seulement)

Quarantaine, pas sauvegarde.

- JSON non parseable, valeur qui n’est pas un objet, `schemaVersion` présent et différent de 1, ou conteneurs FamCal du mauvais type (`members`, `events`, `invites`, `links`, `family`, `session`, `pendingOtp`, `prefs`) : la clé `famcal@v1` n’est ni réécrite ni supprimée, y compris si `reset` / « Se déconnecter » est appelé.
- `set` est ignoré tant que le blob est scellé, pour ne pas fabriquer une famille fantôme qui serait écrite plus tard.
- Un document sans `schemaVersion`, ou avec `schemaVersion: 1`, est relu. Les clés inconnues restent. Les objets connus manquants (par exemple `prefs.hidden`) sont complétés en mémoire. L’hydratation seule ne réécrit pas le disque.
- `exportPreservationEnvelope()` produit un JSON valide. `capturedOriginal` est la chaîne lue, caractère pour caractère. Le champ `interpreted` n’est présent que si le statut est `ready`. Le texte dit explicitement que ce n’est pas une sauvegarde restaurée ni une répétition snapshot/restore.
- Les 4 tests de course existants restent. Un document sain est toujours effacé par `reset` après lecture : comportement précédent, assumé, pas élargi.

Limites assumées de cette fondation : pas de bannière (l’UI de la PR #2 n’est pas touchée), donc un blob en quarantaine s’affiche comme un départ à vide alors que les octets sont gardés. Pas d’import de l’enveloppe. Pas de restauration. `signOut` efface toujours un document lisible. Le premier enregistrement après édition d’un document hérité peut ajouter `schemaVersion: 1` ; l’ancien lecteur de `main` conserve cette clé inconnue par étalement.

## Top 5 de la semaine

1. Garder cette quarantaine (cette PR) et ne pas la mélanger avec la PR #2.
2. Séparer « effacer cet appareil » de la déconnexion, et ne plus traiter `confirm()` comme vrai sur iOS/Android. Exiger l’export avant effacement. Ne pas le faire dans `reglages.tsx` tant que la PR #2 n’est pas mergée ou rebassée, pour éviter d’écraser sa branche.
3. Corriger le parse des dates `YYYY-MM-DD` sans passer par `Date.parse`, avec tests de fuseau. Ne pas ajouter le hijri dans le même geste : un calendrier alternatif est un champ de version, donc `schemaVersion` 2, qui devra rester en quarantaine pour cette app.
4. Brancher `npm test` sur un workflow qui ne déploie pas Pages.
5. Checklist propriétaire avant toute bascule : identifiant de projet, preuve de région, politiques RLS, snapshot, restauration sur projet vide isolé, comptage des événements. Pas de code Supabase tant que cette checklist n’a pas de pièces.

## 5 prompts d’implémentation

1. **Effacement explicite, sans toucher la branche `ux/passe-plaisir-2026-11-04`.** Après merge ou rebase de la PR #2, remplacer le `confirm` natif toujours vrai. `signOut` ne doit plus appeler `reset`. Ajouter une action séparée « Effacer les données de cet appareil » qui refuse de continuer si `preservation().status === 'quarantined'`, et qui n’efface un document `ready` qu’après un export d’enveloppe réussi dans la même action. Tests node : un reset de document sain efface ; un document `schemaVersion: 2` reste octet pour octet. Ne pas lancer EAS.

2. **Dates locales.** Introduire un parse `YYYY-MM-DD` et `HH:MM` qui n’utilise pas `new Date(isoDateOnly)`. Tester `2026-03-29` (DST Europe/Paris) et une date seule interprétée aujourd’hui via `fmtDate`. Ne pas changer la forme JSON des événements existants. Si un champ `timeZone` devient obligatoire, bumper `schemaVersion` et faire quarantaine des documents 2 dans l’app 1.

3. **Tombstones avant sync.** Ajouter `deletedAt` seulement derrière `schemaVersion: 2`, ou le garder hors du document v1. Interdire le remplacement du document entier dans `BroadcastChannel` : fusion par `id` d’événement, dernière `updatedAt` par événement, tombstone gagne sur une résurrection. Tests de deux éditions disjointes. Pas de Supabase dans ce prompt.

4. **Surface de quarantaine.** Petit bandeau si `preservationSnapshot().status === 'quarantined'`, plus bouton qui appelle `exportPreservationEnvelope` via `exportText`. Ne pas proposer « Restaurer ». Reprendre la PR #2 plutôt que réécrire `reglages.tsx` en parallèle.

5. **Répétition isolée, plus tard, par Mohamed.** Créer un projet Supabase vide dans la région choisie (ne pas deviner `eu-west-1`). Appliquer les migrations sur ce projet-là seulement. Charger un snapshot fixture, restaurer, comparer le nombre de familles, membres, événements et l’égalité des blobs quarantinés. Écrire le résultat dans un rapport sans clés. Tant que ce rapport n’existe pas, ne pas pointer l’app de production vers ce projet.

## Cibles proposées (aucune baseline inventée)

Il n’y a pas de mesure d’usage, de crash, de latence ou de perte en production dans le dépôt. Les lignes suivantes sont des seuils de revue, pas des chiffres observés chez des utilisateurs.

| Cible | Seuil proposé | Ce qui a été mesuré ici |
|---|---|---|
| Quarantaine | 0 `setItem` et 0 `removeItem` sur les fixtures illisible, version 2, forme incompatible et lecture en échec | `npm test` : 10 tests, 0 échec, le 2026-11-07, Node 22.23.4. Dont les 4 tests historiques. |
| Aller-retour des champs inconnus | `futureNote` et `events[0].extra` identiques après une écriture suivante | Même suite, cas « relit un document v1 ou hérité ». |
| Hydratation d’un document hérité | 0 écriture tant qu’il n’y a pas d’édition | Même cas : le disque reste la chaîne d’origine après `hydrate`. |
| Démarrage | Rester sous le plafond déjà codé de 8 s, sinon repli sans écriture | Plafond lu dans le code. Aucun temps réel mesuré. |
| Bascule serveur | Égalité des comptes d’événements et des octets quarantinés entre snapshot et restauration, sur projet vide | Non fait. Pas de pourcentage de perte historique à reporter. |
| Contraste | 4,5:1 texte et 3:1 icône lorsque la PR #2 sera sur `main` | Non mesuré sur `main` dans cet audit. |
| Store | 0 soumission tant que la sync annoncée n’existe pas ou que l’écran de connexion simulée est retiré | 0 soumission dans le dépôt. Ce n’est pas un KPI de croissance. |

## Testé ici / non testé

Testé : `npx tsc --noEmit` (exit 0) ; `npm test` (10/10) avec stockage en mémoire. Fixtures historiques inchangées dans leur attente (pas d’écriture avant lecture, reset d’un document sain, course reset/lecture).

Non testé : iPhone, iPad, Android, Safari, VoiceOver, TalkBack, Dynamic Type, RTL, batterie, performances, GitHub Pages, EAS, App Store, Play, Supabase (aucune requête), Sentry, envoi d’e-mail ou SMS, EventKit, import dans Apple Calendrier, restauration d’un snapshot, région `eu-west-1`. L’enveloppe n’a pas été ouverte dans l’UI : aucune fonction d’écran ne l’appelle.

## Bloqueurs de migration et pièces manquantes

Pièces que le code ne peut pas inventer, à fournir par Mohamed :

- Preuve du projet Supabase (référence, région réellement provisionnée). `eu-west-1` est une affirmation externe, absente du dépôt.
- Décision : région définitive avant création, car elle ne se change pas sur place.
- Politique de confidentialité et manifeste Apple mis à jour avant la première écriture serveur.
- Jeu de données fixture anonymisé pour la répétition snapshot/restore. Ne pas utiliser une famille réelle.
- Décision produit : « chacun ses événements » ou maintien tuteur/parent. Le code actuel est le second.
- Décision : hijri comme affichage (façon Apple) ou comme dates stockées. Le second exige une nouvelle version de document.
- Décision : sync Apple Calendrier bidirectionnelle ou export `.ics` seulement. La bidirectionnelle exige des tombstones et une règle si l’utilisateur supprime l’événement dans Calendrier.
- Compte Apple / Play, captures iPad, texte de revue : déjà listés comme brouillon, pas complétés (`store/ios-metadata.md:64-68`).
- La PR #2 doit être mergée ou explicitement fermée avant de rééditer les mêmes écrans.

Aucune clé, aucun DSN et aucune URL de projet ne figurent dans ce rapport.

## Sources

- Apple, calendriers multiples : https://support.apple.com/guide/iphone/use-multiple-calendars-iph3d1110d4/ios
- Apple, supprimer un calendrier ou un événement : https://support.apple.com/en-us/102444
- Apple, calendrier alternatif dont hijri (iPhone) : https://support.apple.com/guide/iphone/change-calendar-settings-iphc37be2016/ios
- Apple, hijri sur iCloud.com : https://support.apple.com/guide/icloud/customize-the-calendar-view-mm6b1a9ed4/icloud
- Apple, calendrier lunaire sur Mac : https://support.apple.com/guide/calendar/a-chinese-hebrew-islamic-lunar-calendar-icl263c22bef/mac
- Google, partager un calendrier : https://support.google.com/calendar/answer/37082
- TimeTree : https://timetreeapp.com/
- Cozi : https://www.cozi.com/
- FamilyWall : https://www.familywall.com/
- Comparatif secondaire (prix non repris) : https://epihem.com/en/guides/cozi-vs-familywall-vs-timetree/
- nLPD : https://www.fedlex.admin.ch/eli/cc/2022/491/fr
- RGPD : https://eur-lex.europa.eu/legal-content/FR/TXT/?uri=CELEX:32016R0679
- Supabase, régions (liste incluant `eu-west-1`) : https://supabase.com/docs/guides/platform/regions
- Supabase, la région ne se change pas sur le même projet : https://supabase.com/kb/troubleshooting/change-project-region-eWJo5Z
- Supabase, `config.toml` est local et ne fixe pas la région du projet hébergé : https://supabase.com/docs/guides/local-development/cli/config
