# Familycal — système visuel

Le même langage s’applique au téléphone et à la tablette, en clair et en sombre. Les écrans passent par `src/kit/ui.tsx` : changer un token change les cartes, les boutons et les états vides ensemble.

## Couleur

Deux palettes, `warm` et `night`, dans `src/theme.ts`. Le réglage Apparence vaut Système, Clair ou Sombre. Le corail reste la marque. Le fond de bouton est `primaryInk` et le libellé `primaryText` : le couple vise un contraste WCAG AA de 4,5:1, de même que le texte sur le fond et sur les cartes. Les pastilles de membre gardent les couleurs déjà enregistrées ; le nom à côté est écrit avec la couleur de texte, pas avec la pastille.

| Jeton | Clair | Sombre |
|---|---|---|
| Fond | `#FBF6F0` | `#14110F` |
| Carte | `#FFFFFF` | `#211C18` |
| Texte | `#2A2019` | `#F7F2EB` |
| Texte secondaire | `#6F6052` | `#D2C3B4` |
| Bouton | `#B85227` / blanc | `#F3D7C8` / `#2A160F` |

## Typographie

Une seule échelle, composant `T` :

| Variante | Taille | Graisse | Usage |
|---|---|---|---|
| display | 32 | 800 | Nom de l’app |
| h1 | 24 | 800 | Titre d’écran |
| h2 | 19 | 700 | Titre de carte |
| h3 | 16 | 700 | Sous-titre |
| body | 15 | 400 | Texte |
| small | 13 | 400 | Aide |
| label / caption | 12 / 11,5 | 700 / 600 | Sections |

## Espacement, rayons, ombres

Échelle de 4 : 4, 8, 12, 16, 24, 32, 48 (`space`). Les cartes ont un rayon de 20, les boutons de 16, les pastilles sont des pilules. L’ombre est douce (flou 16, opacité 8 % en clair). Sur une largeur d’au moins 768, le contenu est centré jusqu’à 1040 px avec une marge de 24.

## Mouvement et toucher

Les pressions réduisent légèrement l’échelle (0,98). Si le système demande de réduire les animations, l’échelle ne bouge pas, le squelette de démarrage ne pulse pas, et la feuille s’ouvre sans glissement. Les durées sont 120, 200 et 320 ms. Une vibration courte accompagne les actions importantes sur iOS et Android ; elle est coupée dans Réglages et n’existe pas sur le web.

## États

Un écran vide a une pastille, un titre, une phrase et une action. L’accueil explique les trois étapes sans écran de chargement infini. Les bandeaux (hors ligne, mode local, copie en quarantaine) restent au-dessus du contenu.

## Icônes

Ionicons, taille 18 dans les boutons et 20 dans les bandeaux, toujours accompagnées d’un texte.
