# FamCal — fiche App Store (brouillon)

> Brouillon à recopier dans App Store Connect. Rien n'a été soumis.

| Champ | Valeur |
|---|---|
| Nom (≤ 30) | FamCal – Agenda familial (24 car.) |
| Sous-titre (≤ 30) | Agenda partagé et tutelle (25 car.) |
| Bundle ID | `ch.mohamadba.famcal` |
| SKU proposé | `famcal-ios-001` |
| Projet EAS | `8518b478-6bf6-4096-95b0-2b2d392c13f5` (compte habib548) |
| Version / build | 1.0.0 / numéro de build géré par EAS (remote, autoIncrement) |
| Langue principale | Français |
| Catégorie principale | Productivité (Productivity) |
| Catégorie secondaire | Style de vie (Lifestyle) |
| Prix | Gratuit |
| URL de confidentialité | https://mohamadalhabib92.github.io/famcal/privacy/ |
| URL d'assistance | https://mohamadalhabib92.github.io/famcal/support/ |
| URL marketing | https://mohamadalhabib92.github.io/famcal/ |
| Copyright | 2026 Mohamed El Habib Ba |
| Appareils | iPhone + iPad (supportsTablet) |
| Chiffrement | Aucun chiffrement non exempté (ITSAppUsesNonExemptEncryption = false) |

## Texte promotionnel (≤ 170)
L'agenda de toute la famille : enfants, proches accompagnés, rôles de tutelle, conflits signalés et export iCalendar.

## Mots-clés (≤ 100, séparés par des virgules)
`agenda,calendrier,famille,partagé,enfants,tutelle,planning,événements,conflits,ics` (82 car.)

## Description — FR
FamCal organise l'agenda de toute la famille.

• Vues Jour, Semaine et Mois, filtres colorés par membre.
• Création rapide d'un événement en 3 gestes.
• Conflits signalés automatiquement.
• Profils gérés pour les enfants et les proches accompagnés, avec liens de tutelle.
• Rôles Tuteur, Parent et Membre, avec des droits clairs.
• Confidentialité des mineurs : sans l'accord des tuteurs, les autres ne voient que « Occupé ».
• Invitations par code, export .ics vers Apple Calendrier, Google Agenda ou Outlook.
• Fonctionne hors ligne.

## Description — EN
FamCal is a family calendar: day/week/month views with per-member colour filters, 3-tap event creation, automatic conflict detection, managed profiles for children and assisted relatives with guardianship links, Guardian/Parent/Member roles, privacy for minors, invitation codes and .ics export. Works offline.

## Classification par âge
4+ — réponses au questionnaire : aucune violence, aucun contenu sexuel, pas de jeux d'argent, pas de navigation web non filtrée, pas de contenu médical, pas de messagerie entre utilisateurs.

## Confidentialité de l'app (étiquettes « nutrition »)
- **Collecte de données : « Nous ne collectons pas de données »** (Data Not Collected). Tout est stocké uniquement sur l'appareil et n'est transmis ni à l'éditeur ni à des tiers (au sens d'Apple, il n'y a donc pas de « collecte »).
- Suivi (tracking) : Non. Pas d'identifiant publicitaire.
- À revoir si un backend (Supabase, Stripe, API) est activé dans une version future.

Données stockées localement (pour information) :
- L'adresse e-mail que vous saisissez à la connexion (la connexion est simulée dans cette version : aucun e-mail n'est envoyé) ;
- Votre famille : prénoms des membres, éventuellement l'année de naissance des enfants, rôles et liens de tutelle ;
- Vos événements et invitations, vos réglages de consentement.

Autorisations :
- Aucune autorisation particulière. Le partage d'un code d'invitation passe par la feuille de partage du système, à votre initiative.

## Notes pour l'équipe de révision (App Review)
La connexion par e-mail est SIMULÉE dans cette version : saisissez n'importe quelle adresse (ex. review@example.com) ; le code à 6 chiffres s'affiche à l'écran avec la mention « Démo ». Aucun e-mail n'est envoyé. Vous pouvez aussi choisir « Explorer l'exemple » pour charger une famille fictive étiquetée Démo. La synchronisation entre appareils n'est pas encore active : tout reste sur l'appareil.

Contact révision : à compléter (prénom, nom, téléphone, e-mail de Mohamed). Compte de démonstration : non requis.

## Captures d'écran à fournir
- iPhone 6,9 pouces (1320 × 2868 ou 1290 × 2796) : 3 à 10 captures.
- iPad 13 pouces (2064 × 2752 ou 2048 × 2732) : 3 à 10 captures (obligatoire car l'app est disponible sur iPad).

## Risques de refus (App Review) et corrections
| Niveau | Risque | À faire avant soumission |
|---|---|---|
| Élevé | Nom : « FamCal: Gemeinsamer Kalender » existe déjà sur l'App Store suisse. | Utiliser le nom de vente « FamCal – Agenda familial » (le nom sous l'icône peut rester FamCal). |
| Élevé | 4.3 Spam : FamCal et FamilyFit sont deux agendas familiaux du même développeur. | Ne publier qu'une seule des deux sur l'App Store, ou bien les différencier nettement (FamilyFit = rituels et bien-être). |
| Moyen | 2.1 / 4.2 : une connexion simulée et une app « partagée » qui ne se synchronise pas entre appareils peuvent être jugées incomplètes. | Activer Supabase (connexion réelle + synchronisation) avant soumission, ou retirer l'écran de connexion et présenter l'app comme agenda sur un seul appareil. |
| Moyen | 5.1.1(v) : si des comptes réels sont créés, la suppression du compte dans l'app est obligatoire. | Ajouter « Supprimer mon compte » quand le backend sera activé. |
