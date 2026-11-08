# FamCal — passe adverse conservation, 8 novembre 2026

Branche `cursor/famcal-preservation-quarantine-536b`. PR https://github.com/mohamadalhabib92/famcal/pull/3. Aucun merge, aucun build, aucun déploiement, aucune migration, aucune donnée réelle. Fixtures synthétiques seulement. Ce rapport ne promet pas zéro perte. Un test en mémoire n’est pas une sauvegarde utilisateur, ni une restauration sur appareil.

## SHA

| Repère | SHA | Rôle |
|---|---|---|
| `main` au moment de la passe | `ad76ba25fa176f3844fbc571bd8c4e942a7a4f15` | Dernier merge publié côté dépôt. Le workflow Pages ne part que sur un push de `main` ou un `workflow_dispatch` (`.github/workflows/pages.yml`). Cette branche ne le déclenche pas. |
| Tête annoncée et vérifiée avant correction | `b0936e69b0e2bbe98fc5d54895453f65bb1f150f` | 20 tests + `tsc` déjà verts. Logout non destructeur, quarantaine, confirmation d’événement et de membre. |
| Correction de cette passe | voir le commit qui ajoute ce fichier | Trois défauts prouvés, puis corrigés. |

## Défauts prouvés sur `b0936e69`

Les trois échecs ont été obtenus en lançant `npm test` avant modification de `src/kit/store.ts`. 22 tests passaient, 3 échouaient.

1. **Reset pendant une lecture lente, puis `removeItem` rejeté.** Le store passait `durable` à vrai et l’état mémoire à vide avant la fin du `removeItem`. Après le rejet, un `set` suivant écrivait un document sans les événements (`events: []`). Le blob synthétique `{ name: 'Famille Martin', events: [1, 2], extra: { keep: true } }` était donc remplaçable. Même famille de risque que le reset-avant-lecture suivi d’un `setItem` vide, vérifiée ici dans FamCal, sans reprendre une cause externe.

2. **Effacement confirmé (`EFFACER`) d’un JSON futur, `removeItem` rejeté.** Le blob `{"schemaVersion":2,"payload":"futur","events":[9]}` était encore sur la clé, puis le `set` suivant l’a remplacé par `{"schemaVersion":1,"events":[]}`. La quarantaine était levée avant de savoir si la suppression avait réussi.

3. **`setItem` refusé, puis relecture.** L’écriture `{ name: 'écrasé', events: [] }` était refusée et le disque gardait `{ name: 'Famille Martin', events: [4] }`. La mémoire restait l’état refusé. Un second `hydrate` ne relisait pas, donc la prochaine écriture acceptée aurait pu écraser le disque sain.

## Ce qui tenait déjà, sans correctif gratuit

- Relecture après un chargement réussi : la mémoire saine n’est pas remplacée par l’état vide.
- Déconnexion : aucun `removeItem`, même si `removeItem` est programmé pour rejeter. Les événements restent. La session seule est retirée.
- JSON illisible, `schemaVersion` différent de 1, forme incompatible, champs inconnus, annulation de suppression : les 20 tests de `b0936e69` restaient verts et le sont encore.
- Données d’enfants : aucun changement d’affichage. Le masque « Occupé » n’est pas relâché.

## Correctif borné

- `removeItem` n’est plus suivi d’un état « vide et durable » s’il rejette. Le disque est relu. S’il est lisible, la mémoire reprend ce document et rien n’est réécrit. S’il est futur ou illisible, la quarantaine est rétablie et `set` ne écrit pas.
- `setItem` rejeté : `durable` redevient faux. La relecture suivante reprend le disque et n’écrit pas l’état refusé.
- L’écran ne dit « données effacées » que si `forgetPersisted` a vraiment retiré la clé. Sinon : « Effacement non effectué ».
- Fichiers : `src/kit/store.ts`, `src/app/(tabs)/reglages.tsx` (une condition de toast). `reglages.tsx` reste en conflit potentiel avec la PR #2, comme `_layout.tsx` et `member/[id].tsx`. La branche UX n’a pas été modifiée.

## Résultats

- `npx tsc --noEmit` : exit 0.
- `npm test` : 25 tests, 0 échec, Node 22.23.4. Les 20 précédents sont inclus.
- Non exécuté : iPhone, iPad, Android, navigateur, VoiceOver, EAS, App Store, Play, GitHub Pages, Supabase, sauvegarde appareil, restauration, retour arrière sur un projet. Un navigateur jetable ou un `Map` en mémoire ne comptent pas comme sauvegarde utilisateur.

## Publication — conditions, pas un feu vert

Ne pas merger cette PR vers `main` dans cette étape. Un push sur `main` lance « Déployer la PWA sur GitHub Pages ». Ce n’est pas une preuve de sauvegarde, et la restauration sur appareil n’a pas été répétée.

Avant toute publication ou bascule :

- Répéter snapshot puis restauration sur une copie isolée, avec des fixtures, et comparer les octets des blobs en quarantaine. Ce rapport ne le fait pas.
- Ne pas traiter `eu-west-1` comme vérifié : aucun `supabase/` et aucun projet dans le dépôt.
- Garder la PR #2 non mergée tant que le conflit sur `reglages.tsx`, `_layout.tsx` et `member/[id].tsx` n’est pas résolu à la main.
- Ne pas afficher automatiquement le détail brut d’un enfant sans le consentement déjà codé.

## Axes (état inchangé sauf la conservation ci-dessus)

1. **Vision.** Agenda familial local. Pas le temps réel multi-appareils, pas le hijri, pas Apple Calendrier ni Rappels. Concurrents nommés dans l’audit du 7 novembre, sans prix repris.
2. **Manques.** Sync, import, tombstones, outbox. Pas ajoutés.
3. **UX iPad, web, RTL.** iPad déclaré, colonne plafonnée, pas de RTL. Non retesté.
4. **Accessibilité.** Inchangée. La PR #2, non mergée, porte le contraste.
5. **Architecture, tests, CI.** Store local `famcal@v1`. `npm test` n’est pas dans le workflow Pages, qui ne fait que `tsc` et le build web sur `main`.
6. **Performance.** Aucune mesure. Plafond de boot 8 s, toujours dans le code.
7. **Batterie.** Non mesurée.
8. **Sécurité.** Déconnexion non destructrice. Suppression d’événement et de membre confirmée. Effacement total seulement avec `EFFACER`, et seulement si le retrait de clé réussit.
9. **nLPD / RGPD.** Politique locale. Pas de traitement serveur à auditer. Région non prouvée.
10. **Linguistique.** Français en dur. Pas d’arabe ni de hijri.
11. **Pédagogie.** Non applicable.
12. **IA.** Placeholder serveur, aucun appel.
13. **Stores.** Brouillon, rien soumis ici.
14. **Croissance.** Aucun KPI mesuré. Ne pas en inventer.
15. **Synergies.** FamilyFit et RH Master hors de ce dépôt. Aucun code partagé modifié.

L’audit du 7 novembre reste `docs/audit-famcal-2026-11-07.md`. Il est mis à jour pour le décompte 25/25. Il ne remplace pas une répétition de restauration.
