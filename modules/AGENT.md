# Instructions des modules

## Périmètre

Ces instructions s’appliquent à tous les fichiers présents dans le dossier `module/` et dans ses sous-dossiers.

Les instructions du fichier `AGENTS.md` situé à la racine du projet restent applicables. Les présentes instructions précisent les règles propres à l’architecture modulaire.

## Architecture

Le projet utilise une architecture modulaire orientée feature.

Chaque fonctionnalité métier doit être placée dans son propre dossier :

```text
module/
└── nomDuModule/
    ├── nomDuModule.routes.js
    ├── nomDuModule.controllers.js
    └── nomDuModule.services.js
```

Ne pas mélanger plusieurs fonctionnalités métier indépendantes dans un même module.

## Nommage

Les noms des fichiers doivent rester cohérents avec le nom du module.

Utiliser les suffixes suivants :

- `*.routes.js`
- `*.controllers.js`
- `*.services.js`

Respecter les conventions de nommage déjà utilisées dans les modules existants.

## Routes

Les fichiers `*.routes.js` doivent uniquement :

- créer un router Express
- déclarer les routes du module
- appliquer les middlewares nécessaires
- appeler les controllers du module
- exporter le router du module

Les controllers doivent être importés ainsi :

```js
import * as controller from "./nomDuModule.controllers.js";
```

Les routes ne doivent contenir aucune logique métier et ne doivent pas appeler directement les services lorsqu’un controller existe.

Le router exporté par chaque module doit être importé dans le fichier `router.js` situé à la racine du projet.

Les routes des modules ne doivent pas être déclarées directement dans `app.js`.

Lorsqu’un fichier de routes est importé, utiliser :

```js
import * as route from "./chemin/nomDuModule.routes.js";
```

## Controllers

Les fichiers `*.controllers.js` doivent uniquement :

- récupérer les données depuis `req`
- préparer les arguments nécessaires au service
- appeler les services du module
- gérer la réponse HTTP
- gérer les erreurs simples liées à la requête

Les services doivent être importés ainsi :

```js
import * as service from "./nomDuModule.services.js";
```

Les controllers ne doivent pas contenir la logique métier principale, les règles métier ou les traitements complexes de données.

## Services

Les fichiers `*.services.js` doivent contenir :

- la logique métier
- les règles métier du module
- les traitements et transformations de données
- les appels aux models lorsque nécessaire
- le rendu des vues EJS lorsque nécessaire

Les services doivent rester indépendants de la déclaration des routes Express.

Lorsqu’un service est importé, utiliser :

```js
import * as service from "./chemin/nomDuModule.services.js";
```

## Flux attendu

Le flux principal doit toujours rester :

```text
routes → controllers → services → models
```

Respecter les règles suivantes :

- une route appelle un controller
- un controller appelle un service
- un service peut appeler un model
- une route ne doit pas appeler directement un service lorsqu’un controller existe
- un controller ne doit pas appeler directement un model
- un model ne doit pas dépendre d’un controller ou d’une route

## Modification d’un module existant

Avant de modifier un module :

- examiner sa structure actuelle
- conserver ses conventions de nommage
- réutiliser les services existants lorsqu’ils répondent déjà au besoin
- éviter de déplacer des fichiers sans justification
- ne pas refactoriser les autres modules sans rapport avec la tâche demandée
- limiter les modifications au périmètre nécessaire
