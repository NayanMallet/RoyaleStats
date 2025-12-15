
# Monorepo Setup with PNPM
```pnpm install```

# Build Shared Package
```pnpm --filter shared build```

# Docker Setup
```docker-compose up --build```

# Address to run the website
```localhost:8080```

# Documentation

##  **Contexte du projet**

Ce projet consiste à créer une plateforme web dédiée aux joueurs de Clash Royale. L’objectif est de permettre aux utilisateurs de consulter leurs statistiques en entrant leur identifiant (Supercell ID) et de lier leur compte Clash Royale à un compte utilisateur sur le site. Nous y ajoutons également une feature clé, le meta tracker qui va permettre aux joueurs de rester compétitif suivant les modifications apportées en jeu. Toute cette intégration avec l’API officielle de Clash Royale offre une expérience personnalisée et centralisée pour suivre ses performances.


## **Fonctionnalité principale**

La fonctionnalité clé est la **liaison entre un compte utilisateur et son profil Clash Royale**. Une fois connecté, l’utilisateur pourra accéder à ses informations de jeu (niveau, trophées, deck actuel) directement depuis le site. Cette liaison permet également d’activer des fonctionnalités avancées comme le suivi des decks et l’analyse personnalisée (meta tracker).


## **Killer Feature : Meta Tracker**

Le **Meta Tracker** analyse en continu les données des combats pour identifier la méta actuelle (decks les plus joués, cartes dominantes) et propose des recommandations personnalisées pour optimiser le deck du joueur.

- **Ce que ça apporte :**

  - Score de compatibilité méta pour le deck actuel.

  - Suggestions d’évolution (remplacements intelligents) pour contrer la méta. ??

  - Historique des tendances pour suivre l’évolution des decks et cartes.

Cette fonctionnalité transforme le site en **coach stratégique**, offrant aux joueurs un avantage compétitif en temps réel.


## 

### **Schéma de l'architecture des communications** 

<img width="8989" height="6182" alt="image" src="https://github.com/user-attachments/assets/fa972363-d0bb-4c04-b7ff-c1e5a474c2cb" />

### **Architecture du projet**

L’architecture repose sur une séparation entre le **Front** et le **Back**, avec une logique orientée services pour garantir modularité et évolutivité.

- **Front (Vue.js + ShadCN)** Le front-end est développé avec Vue.js pour offrir une interface réactive et ergonomique. Il communique avec l’API Gateway via des requêtes HTTP. Le rôle du front est d’afficher les données (statistiques, decks, méta) et de gérer l’interaction utilisateur (connexion, recherche par Supercell ID).

- **API Gateway (TypeScript)** L’API Gateway est le point d’entrée unique pour toutes les requêtes venant du front. Elle centralise la logique métier, applique les règles de sécurité (authentification, validation) et orchestre les appels vers les différents services internes (Users, Link). Ce design simplifie la communication.

- **User Service (TypeScript + SQLite)** Ce service gère l’authentification, la création et la gestion des comptes utilisateurs. Il stocke les informations dans une base SQLite, adaptée pour un projet léger et rapide à mettre en place. Il expose des endpoints REST pour la gestion des profils.

- **Link Service (TypeScript)** Ce service est responsable de la liaison entre un compte utilisateur et son identifiant Clash Royale (Supercell ID). Il vérifie la validité du tag avec l’api officielle de Clash royale grâce au clash data service et permet la mise à jour ou la suppression de cette liaison.

* **Clash data Service (TypeScript)** Ce service est responsable de toute la liaison avec l’api officielle de Clash Royale et permet de récupérer toutes les informations concernant un joueur grâce à son Supercell ID.

- **Meta tracker Service (TypeScript)** Il va analyser les données des combats pour identifier la méta actuelle (decks les plus joués, cartes dominantes) et propose des recommandations personnalisées pour optimiser le deck du joueur qui y fait appel.

- **Clash Royale API** L’API officielle fournit les données des joueurs, clans et combats. Elle est consommée uniquement par le backend via l’API Gateway pour sécuriser la clé API et contrôler les appels.


## **Répartition des différents services**

### **Link Service (Account Linking)**

- **Rôle :** Gérer la liaison entre le compte utilisateur (site) et le compte Clash Royale.

- **Fonctionnalités :**

  - Associer un **user\_id** avec un **player\_supercellID**.

  - Vérifier la validité du supercellID via l’API Clash Royale.

  - Permettre la mise à jour ou suppression du lien.

- **Endpoints possibles :**

  - `POST /link` → Associer un compte.

  - `GET /link/:userId` → Voir le compte lié.

  - `DELETE /link/:userId` → Supprimer la liaison.


### **User Service (Gestion des utilisateurs)**

- **Rôle :** Gérer l’authentification, la création et la gestion des comptes utilisateurs sur le site.

- **Fonctionnalités :**

  - Inscription et connexion des utilisateurs.

  - Gestion des sessions (JWT sécurisés).

  - Stockage des informations de profil (supercell ID, préférences).

  - Possibilité de modifier ou supprimer son compte.

* **Endpoints possibles :**

  - `POST /auth/register` → Créer un compte utilisateur.

  - `POST /auth/login` → Se connecter.

  - `GET /auth/me` → Récupérer les infos du compte connecté.

  - `PUT /auth/me` → Mettre à jour les infos du compte.

  - `DELETE /auth/me` → Supprimer le compte.


### 

### **BDD**
<img width="325" height="312" alt="Untitled-5" src="https://github.com/user-attachments/assets/30128f60-1220-4363-9cf4-52b3c98e7102" />


### **Clash Data Service (TypeScript)**

- **Rôle :** Agir comme une passerelle centralisée et intelligente vers l'API officielle de Clash Royale. Il abstrait la complexité de l'API tierce pour le reste de l'application et gère les contraintes techniques (rate limiting, caching).

- **Fonctionnalités :**

  - **Récupération des données Joueur :** Obtention des détails du profil (trophées, arène, deck actuel, cartes favorites) via le Tag joueur (dérivé du Supercell ID).

  - **Historique des Combats :** Extraction et normalisation des journaux de combat (Battle Logs) pour alimenter le Meta Tracker.

  - **Base de données Cartes :** Maintien d'un référentiel à jour de toutes les cartes du jeu (stats, images, élixir).

  - **Gestion du Caching :** Implémentation d'un cache (ex: Redis) pour réduire les appels à l'API officielle et améliorer la latence.

- **Endpoints possibles :**

  - `GET /player/:playerTag` → Récupérer le profil complet et les stats d'un joueur.

  - `GET /player/:playerTag/battles` → Récupérer l'historique récent des combats d'un joueur.

  - `GET /cards` → Récupérer la liste statique de toutes les cartes du jeu (pour l'affichage frontend).

  - `GET /player/:playerTag/chests` → (Optionnel) Voir le cycle des prochains coffres.


### **Meta Tracker Service (TypeScript)**

- **Rôle :** Cerveau analytique de l'application. Il ingère les données brutes pour en extraire des tendances (la "Méta") et fournit un moteur de recommandation algorithmique pour les joueurs.

- **Fonctionnalités :**

  - **Analyse de la Méta :** Agrégation des données de combats (reçues du Clash Data Service) pour calculer les taux de victoire (win rate) et d'utilisation des cartes et des decks.

  - **Identification des Archétypes :** Détection automatique des decks populaires (ex: "Log Bait", "Beatdown") basés sur les combinaisons de cartes fréquentes.

  - **Moteur de Recommandation :** Comparaison du deck d'un utilisateur avec les données de la méta pour suggérer des remplacements de cartes (ex: "Remplace le Sorcier par le Mousquetaire pour augmenter ton win rate de 5%").

  - **Score de Deck :** Attribution d'une note de viabilité à un deck donné selon la méta actuelle.

- **Endpoints possibles :**

  - `GET /meta/snapshot` → Obtenir un résumé de la méta actuelle (Top 10 decks, Top 10 cartes).

  - `POST /analyze/deck` → Envoyer une liste de 8 cartes et recevoir une analyse statistique (score, forces, faiblesses).

  - `GET /recommend/:playerTag` → Obtenir des suggestions personnalisées basées sur le deck actuel du joueur et ses niveaux de cartes.

  - `POST /ingest/battles` → (Interne) Endpoint pour recevoir les logs de combats en masse depuis le Clash Data Service pour l'analyse.


## **Choix des technologies**

- **TypeScript pour le backend** Nous avons choisi TypeScript pour le backend afin de bénéficier d’un typage statique robuste et d’une meilleure maintenabilité du code. Cela réduit les erreurs, facilite la collaboration et améliore la qualité globale du projet. TypeScript est parfaitement adapté pour construire des API fiables et évolutives.

- **Vue.js (avec ShadCN en ui kit) pour le frontend** Vue.js offre une approche réactive et performante pour le développement d’interfaces utilisateur. Associé à **ShadCN**, un UI kit moderne basé sur TailwindCSS, nous pouvons créer des composants élégants, cohérents et accessibles rapidement, tout en gardant une grande flexibilité pour le design.

- **SQLite pour la base de données** SQLite est léger, simple à configurer et idéal pour un projet qui démarre sans infrastructure complexe. Il permet un stockage local efficace et peut évoluer vers une solution plus robuste (PostgreSQL) si nécessaire. Son intégration avec TypeScript via l’ORM Prisma facilite la gestion des données.



