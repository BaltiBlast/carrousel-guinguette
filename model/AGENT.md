# Instructions des mappers

## Périmètre

Ces instructions s’appliquent à tous les fichiers présents dans le dossier `model/` et dans ses sous-dossiers.

Les instructions du fichier `AGENTS.md` situé à la racine du projet restent applicables. Les présentes instructions précisent les règles propres aux mappers et aux interactions avec la base de données.

## Responsabilité du dossier

Le dossier `model/` constitue la couche d’accès aux données de l’application.

Les mappers doivent uniquement assurer les échanges entre l’application et la base de données MongoDB avec Mongoose.

Ils peuvent notamment :

- créer et utiliser les models Mongoose
- rechercher des documents
- créer des documents
- modifier des documents
- supprimer des documents
- construire des filtres MongoDB
- appliquer des projections
- appliquer des tris
- gérer les opérations atomiques nécessaires à l’accès aux données

Ils ne doivent pas contenir :

- de logique métier
- de règles métier
- de logique HTTP
- de rendu EJS
- de gestion de `req` ou `res`
- de traitements métier sur les données
- de décisions dépendant du contexte fonctionnel de l’application

Les traitements et les règles métier doivent rester dans les services des modules.

## Architecture

Le dossier doit respecter cette organisation :

```text
model/
├── core.mapper.js
├── index.mapper.js
├── nomDuDomaine.mapper.js
└── autreDomaine.mapper.js
```

Chaque domaine possédant des opérations propres en base de données doit disposer de son propre mapper.

Ne pas regrouper dans un même mapper des requêtes concernant plusieurs domaines indépendants.

## CoreMapper

Le fichier `core.mapper.js` est la classe commune à tous les mappers, à l’exception de `index.mapper.js`.

Il doit uniquement contenir les éléments partagés nécessaires au fonctionnement des mappers.

Il reçoit l’instance de Mongoose dans son constructeur et la rend disponible aux classes qui en héritent.

Ne pas ajouter de logique métier dans `CoreMapper`.

Une méthode ne doit être ajoutée à `CoreMapper` que lorsqu’elle est réellement générique et utile à plusieurs mappers.

## Mappers spécifiques

Chaque fichier `*.mapper.js`, à l’exception de `core.mapper.js` et `index.mapper.js`, doit :

- importer `CoreMapper`
- étendre la classe `CoreMapper`
- recevoir l’instance de Mongoose dans son constructeur
- appeler `super(mongoose)`
- initialiser son model Mongoose à partir du schema correspondant
- contenir uniquement les requêtes liées à son domaine
- exporter la classe par défaut

Exemple :

```js
import CoreMapper from "./core.mapper.js";
import userSchema from "../schemas/user.schema.js";

class User extends CoreMapper {
  constructor(mongoose) {
    super(mongoose);

    this.model = this.mongoose.models.User || this.mongoose.model("User", userSchema, "users");
  }
}

export default User;
```

Un mapper ne doit pas importer ou appeler :

- un controller
- une route
- un service
- un autre module métier

Un mapper peut utiliser un schema et les fonctionnalités de Mongoose nécessaires à ses requêtes.

## Méthodes des mappers

Chaque méthode doit représenter clairement une opération effectuée sur la base de données.

Utiliser des noms explicites comme :

```js
findUserById();
findUserByEmail();
findAllUsers();
createUser();
updateUserById();
deleteUserById();
```

Les méthodes doivent retourner le résultat de la requête Mongoose.

Elles ne doivent pas :

- décider de la réponse HTTP à envoyer
- transformer le résultat selon une règle métier
- construire un objet destiné directement à une vue
- envoyer un e-mail
- déclencher une action externe
- appliquer des règles d’autorisation
- décider du comportement fonctionnel de l’application

Les filtres, projections et tris nécessaires à la requête sont autorisés.

La normalisation et la transformation des données doivent être effectuées dans le service avant l’appel au mapper.

## Index des mappers

Le fichier `index.mapper.js` est le point d’entrée unique des mappers.

Il doit uniquement :

- importer l’instance de Mongoose
- importer les classes des mappers
- créer une instance de chaque mapper
- transmettre l’instance de Mongoose à chaque mapper
- exporter les instances créées

Exemple :

```js
import mongoose from "mongoose";

import Event from "./event.mapper.js";
import User from "./user.mapper.js";

export const EventMapper = new Event(mongoose);
export const UserMapper = new User(mongoose);
```

Le fichier `index.mapper.js` ne doit pas :

- contenir de requêtes MongoDB
- contenir de logique métier
- contenir de traitements de données
- créer de fonctions intermédiaires
- instancier directement des schemas en dehors des mappers concernés

Tous les mappers utilisés dans l’application doivent être exportés depuis ce fichier.

## Utilisation dans l’application

Les services doivent importer les instances depuis `index.mapper.js`.

```js
import { UserMapper } from "../../model/index.mapper.js";
```

Ne pas instancier directement un mapper dans un service.

Ne pas transmettre manuellement l’instance de Mongoose depuis un service.

Ne pas importer directement une classe de mapper dans un module métier.

Le flux attendu doit rester :

```text
routes
  → controllers
    → services
      → index.mapper.js
        → mapper spécifique
          → schema
            → MongoDB
```

## Modification d’un mapper existant

Avant de modifier ou créer un mapper :

- vérifier si une méthode existante répond déjà au besoin
- conserver les conventions de nommage existantes
- limiter les requêtes au domaine du mapper
- placer les traitements métier dans le service
- exporter toute nouvelle instance depuis `index.mapper.js`
- ne pas modifier les autres mappers sans rapport avec la tâche
- ne pas modifier un schema sans demande ou nécessité explicitement identifiée
