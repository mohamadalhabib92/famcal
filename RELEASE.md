# Familycal — branche `release/next`

`main` déploie le site web (GitHub Pages, workflow « Déployer la PWA »). **Ne pas fusionner `release/next` dans `main` sans un accord explicite.** Cette branche est la ligne iPhone / TestFlight. Elle ne change pas le bundle `ch.mohamadba.famcal`, la signature, ni les entitlements.

## D’où viennent les builds

Le dernier préparatif iOS est la branche ouverte `cursor/familycal-agenda-sync-9437` (pull request #4), qui contient déjà `cursor/famcal-preservation-quarantine-536b` (pull request #3). Le build EAS `a9fb03be` (commit `0f88ce3`) partait de cette ligne et échouait à la signature parce que le profil de `ch.mohamadba.famcal` n’a pas la capacité Push. Le correctif déjà sur cette ligne retire `aps-environment`. `release/next` reprend cette tête. Aucun build n’est lancé par la CI ni par ce document.

La branche `ux/passe-plaisir-2026-11-04` (pull request #2) n’est pas intégrée : elle diverge de `main` et entre en conflit avec la quarantaine du stockage (`reglages`, édition d’événement, kit). Le mode sombre, le contraste et le retour tactile vivent déjà dans les préférences du document `famcal@v1`.

## CI

À chaque push et à chaque pull request, `.github/workflows/ci.yml` lance `npm run typecheck`, `npm test`, puis `npx expo export --platform web`. L’export reste dans le runner. Il n’est pas publié, et il n’appelle pas EAS.

Le déploiement web reste réservé au push sur `main`.

## Envoyer un build TestFlight

À faire par le propriétaire, sur une machine déjà autorisée chez Expo et Apple. Rien ici ne stocke de secret, ne soumet l’app, ni ne modifie le profil de signature.

1. Vérifier que la CI de `release/next` est verte.
2. Se placer sur `release/next` (pas sur `main`).
3. iPhone, profil déjà dans `eas.json` :

   ```bash
   npx eas build --platform ios --profile production
   ```

   `autoIncrement` augmente le numéro de build côté Expo. Le `buildNumber` du fichier `app.json` reste `1` dans git. Ne pas ajouter de capacité Push : les rappels locaux n’ont pas besoin d’`aps-environment`.

4. Quand le binaire est prêt, l’envoyer vers TestFlight avec le profil de soumission existant :

   ```bash
   npx eas submit --platform ios --profile production
   ```

5. Apple TV est un autre profil, `production-tv` (`EXPO_TV=1`, build `2`, slug `famcal-tv`). Ce n’est pas le build iPhone. Le lancer seulement après avoir créé le projet Expo TV et renseigné `FAMCAL_TV_EAS_PROJECT_ID` dans l’environnement de build, pas dans git.

Ne pas lancer ces commandes depuis la CI. Ne pas appliquer de migration Supabase pour un build.
