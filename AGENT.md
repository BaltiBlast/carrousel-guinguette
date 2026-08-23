# Consignes du projet

## Méthode de travail

- Travailler sur le site section par section.
- Discuter de chaque section et valider son approche avant de l’implémenter.
- Ne pas créer, modifier ou supprimer de code sans autorisation explicite.
- Ne modifier que les fichiers nécessaires à la tâche validée.
- Conserver les éléments déjà présents dans le projet, notamment les photographies du dossier `assets/`.

## Stack

Le projet utilise :

- Node.js
- Express
- EJS
- CSS sur mesure

Le projet utilise les ES Modules.

Utiliser :

- import
- export
- Les accents de la langue Française pour les textes en Front uniquement
- Uniquement ce que Tailwind propose pour la mise en forme côté client
- Le kebab-case pour la nomination des fichiers

Ne pas utiliser CommonJS :

- require
- module.exports

## Instructions spécifiques aux dossiers

Avant de créer ou modifier un fichier, vérifier si le dossier concerné ou l’un de ses dossiers parents contient un fichier `AGENTS.md` spécifique.

Lorsqu’un fichier `AGENTS.md` spécifique existe :

- appliquer les règles globales du présent fichier
- appliquer également les règles spécifiques du dossier
- considérer les règles les plus proches du fichier modifié comme prioritaires en cas de contradiction

Lorsqu’une tâche concerne plusieurs dossiers, consulter les instructions propres à chacun d’eux.

## Routing

Le fichier \*.routes.js de chaque module doit être importé dans le fichier router.js à la racine du projet.

Le fichier router.js regroupe tous les routers de tous les modules.

Les routes des modules ne doivent pas être déclarées directement dans app.js.

Chaque fichier \*.routes.js doit :

- créer un router Express
- déclarer les routes du module
- appeler les controllers du module
- exporter le router du module

## Dépendances

Le projet utilise npm.

Ne pas installer, supprimer ou remplacer de package sans demande explicite.

Ne pas modifier package.json ou package-lock.json sans demande explicite.

Avant de proposer une nouvelle dépendance :

- vérifier si une dépendance existante peut déjà répondre au besoin
- expliquer pourquoi la nouvelle dépendance serait utile
- attendre validation avant modification

## Conventions

Garder les noms de fichiers cohérents avec le nom du module.

Ne pas mélanger plusieurs features dans un même module.

Ne pas déplacer l’architecture existante sans expliquer pourquoi.

Respecter l’organisation existante du projet avant de proposer une refactorisation.

Avant d’ajouter une nouvelle logique, toujours vérifier si une fonction générique existante peut être réutilisée afin d’éviter les duplications et d’optimiser le code.

## Organisation du CSS

Le CSS doit être structuré et rester facile à maintenir.

Structure de référence :

```text
css/
├── index.css
├── reset.css
├── global.css
├── components/
├── layouts/
└── pages/
```

- `css/index.css` est le point d’entrée des styles. Il importe les autres feuilles CSS.
- `css/global.css` contient les fondations partagées par toute la page.
- `css/components/` contient les composants visuels autonomes et réutilisables, comme les boutons ou les cartes d’événements.
- `css/layouts/` contient les grandes structures communes au site, comme la navigation, le pied de page ou une grille partagée.
- `css/pages/` contient les compositions et sections propres à une page donnée.
- Les nouveaux fichiers CSS seront ajoutés progressivement, uniquement lorsqu’une section ou un ensemble cohérent de composants le justifie.
- Éviter de créer trop de petits fichiers prématurément.
- Une mise en page utilisée sur une seule page doit rester dans le fichier de cette page.
- Un élément utilisé sur plusieurs pages doit être extrait dans `components/`.
- Une structure majeure commune à plusieurs pages doit être placée dans `layouts/`.
- Ne pas créer un fichier séparé pour quelques règles isolées si leur regroupement dans un fichier de page ou de composant reste plus cohérent.
- Le nombre de fichiers source n’est pas un problème tant que chaque fichier possède une responsabilité claire et facilite la maintenance.
- Si le nombre d’imports devient important, prévoir une étape de build afin de regrouper et minifier le CSS pour la production, sans sacrifier l’organisation des sources.

## Styles globaux et design tokens

Le fichier `global.css` doit centraliser dans `:root` les valeurs récurrentes et structurantes :

- couleurs ;
- familles et tailles de polices ;
- espacements ;
- marges et paddings communs ;
- largeur du conteneur principal ;
- rayons de bordure ;
- ombres ;
- transitions ;
- autres valeurs partagées utiles.

Ces variables doivent servir à uniformiser l’interface et à éviter la répétition de valeurs arbitraires. Il ne faut cependant pas créer une variable pour chaque valeur ponctuelle : une variable est pertinente lorsqu’elle porte une décision graphique ou qu’elle est réutilisée.

## Classes réutilisables

- Avant toute implémentation CSS, toujours consulter les variables définies dans `:root`, les styles globaux et les classes partagées existantes afin de réutiliser ce qui est déjà disponible lorsque cela répond au besoin.
- Ne pas recréer sous un autre nom une valeur, une classe ou un comportement déjà présent dans les ressources globales.
- Lorsqu’une mise en page en cours d’implémentation correspond à une mise en page déjà réalisée ailleurs dans le projet, généraliser la règle ou la classe existante pour couvrir les différents usages, plutôt que de dupliquer les styles.
- Une généralisation doit rester cohérente et lisible : elle ne doit pas regrouper artificiellement des éléments dont les comportements sont réellement différents.
- Créer des classes communes lorsque plusieurs éléments ont réellement besoin du même comportement ou du même style.
- Favoriser les classes transversales utiles, comme un conteneur de mise en page ou un bouton partagé.
- Ne pas anticiper une grande collection de classes utilitaires sans besoin concret.
- Extraire un style vers une classe réutilisable lorsque la répétition apparaît pendant l’implémentation.
- Conserver les styles propres à une section ou à un composant lorsqu’ils ne sont pas partagés ailleurs.

## Responsive design

- Chaque section doit être conçue pour fonctionner sur ordinateur, tablette et mobile.
- Préférer les unités relatives et les solutions CSS fluides lorsque cela est pertinent.
- Utiliser des media queries uniquement lorsque la mise en page nécessite un changement de comportement explicite.
- Vérifier chaque section aux différentes largeurs avant de passer à la suivante.

## HTML sémantique et SEO

- Toujours choisir des balises HTML dont le sens sémantique correspond au contenu mis en place.
- Favoriser notamment les éléments structurants appropriés comme `header`, `nav`, `main`, `section`, `article`, `aside`, `footer`, ainsi que des niveaux de titres cohérents.
- Ne pas utiliser un élément uniquement pour son apparence lorsque son sens ne correspond pas au contenu ; la présentation doit rester sous la responsabilité du CSS.
- Optimiser les contenus pour le référencement naturel sans nuire à leur clarté ni multiplier artificiellement les mots-clés.
- Employer des titres descriptifs, une hiérarchie logique, des textes utiles et des libellés de liens compréhensibles hors contexte.
- Renseigner des métadonnées pertinentes et fournir des textes alternatifs adaptés aux images porteuses d’information.
- Préserver l’accessibilité, la lisibilité et l’intention éditoriale dans toute optimisation SEO.

## Principe général

Commencer avec le minimum nécessaire, puis faire évoluer l’architecture CSS en fonction des besoins réels du site. La cohérence, la lisibilité et la maintenabilité priment sur la multiplication des abstractions.
