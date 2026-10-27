# Onboarding : rejoindre RoyaleStats

Ce parcours mène un nouvel arrivant de `git clone` à sa première pull request en deux jours. Cochez les cases au fur et à mesure ; en cas de blocage de plus de 30 minutes, demandez de l'aide (voir [Qui contacter](#qui-contacter)).

## Jour 1, matin — Accès et installation (≈ 2 h)

### Accès

- [ ] Accès en écriture au dépôt GitHub `NayanMallet/RoyaleStats`.
- [ ] Accès au projet Jira `RST` (consulter, créer et modifier des tickets).
- [ ] Accès au canal de discussion de l'équipe.

### Poste de travail

- [ ] [nvm](https://github.com/nvm-sh/nvm), puis Node 22 : `nvm install` à la racine du dépôt.
- [ ] pnpm : `corepack enable`.
- [ ] Docker Desktop.
- [ ] Éditeur : VS Code avec les extensions **Vue (Official)**, **ESLint**, **Prettier** et **Tailwind CSS IntelliSense**, ou WebStorm.
- [ ] Navigateur : extension **Vue.js devtools**.

### Installation

- [ ] Créer **sa propre** clé API Clash Royale, liée à son IP : [INSTALL.md §1](INSTALL.md#1-créer-sa-clé-api-clash-royale).
- [ ] Suivre [INSTALL.md](INSTALL.md) jusqu'à la section « Vérifier l'installation » incluse.
- [ ] Ouvrir <http://localhost:8080>, rechercher son propre tag (ou un joueur du classement) et un clan.
- [ ] Ouvrir le Swagger sur <http://localhost:3000/docs> et exécuter `GET /api/clash/cards` avec « Try it out ».

## Jour 1, après-midi — Comprendre le projet (≈ 2 h)

### À lire, dans cet ordre

- [ ] [README.md](../README.md) : vue d'ensemble.
- [ ] [ARCHITECTURE.md](ARCHITECTURE.md) : services, routes, données, limites connues.
- [ ] [PERSONAS.md](PERSONAS.md) : pour qui on développe, et la contrainte d'écran 800 × 600.
- [ ] [GUIDELINES.md](GUIDELINES.md) : conventions de code, design system, Definition of Done.
- [ ] [CONTRIBUTING.md](../.github/CONTRIBUTING.md) : branches, commits, pull requests.

### Suivre une requête de bout en bout

Recherchez un joueur sur le front, puis retrouvez chaque étape dans le code :

1. [ ] `front/src/views/HomeView.vue` : saisie du tag.
2. [ ] `front/src/services/clash.service.ts` : `fetchPlayer` appelle `/api/clash/players/:tag`.
3. [ ] `front/nginx.conf` : nginx relaie `/api/` vers la Gateway.
4. [ ] `api-gateway/src/server.ts` et `proxy.ts` : la Gateway transmet à `clash-data-service`.
5. [ ] `clash-data-service/src/controllers/clashController.ts` : lecture du cache, puis `clashRoyaleClient.ts` appelle l'API officielle.
6. [ ] Dans un terminal, `docker compose logs -f api-gateway clash-data-service`, relancez la recherche et observez les lignes `[PROXY]` et `Calling Clash Royale API`.

### Lexique Clash Royale

| Terme               | Signification                                                                                                  |
| ------------------- | -------------------------------------------------------------------------------------------------------------- |
| **Tag**             | Identifiant unique d'un joueur ou d'un clan, par exemple `#9YJUPU9LY`. Caractères possibles : `0289PYLQGRJCUV` |
| **Trophées**        | Score de classement du joueur ; ils augmentent avec les victoires                                              |
| **Arène**           | Palier atteint selon les trophées                                                                              |
| **Path of Legends** | Mode classé pour les meilleurs joueurs, avec son propre classement mondial                                     |
| **Deck**            | Ensemble de 8 cartes utilisé en combat                                                                         |
| **Élixir**          | Ressource dépensée pour jouer une carte ; le coût moyen du deck en découle                                     |
| **Battlelog**       | Historique des 25 derniers combats d'un joueur, fourni par l'API                                               |
| **Méta**            | Cartes et decks les plus joués et les plus efficaces à un moment donné                                         |
| **Clan**            | Groupe de 50 joueurs maximum, mené par un chef                                                                 |

## Jour 2 — Première contribution

- [ ] Dans Jira, prendre le ticket qui vous est assigné (label `stagiaire` pour un stage) et le passer « En cours ».
- [ ] Lire ses critères d'acceptation et poser ses questions **avant** de coder.
- [ ] Créer sa branche depuis `develop` :
  ```bash
  git checkout develop && git pull
  git checkout -b feature/RST-42-sujet-court
  ```
- [ ] Ouvrir une pull request **en brouillon** (_draft_) dès le premier commit, pour recevoir des retours tôt.
- [ ] Respecter le format de commit de [CONTRIBUTING.md](../.github/CONTRIBUTING.md#nommer-les-commits).
- [ ] Remplir le modèle de PR, avec captures d'écran à 800 × 600 pour tout changement d'interface.
- [ ] Demander une relecture, corriger, puis passer le ticket Jira en « À valider » avec la preuve.

## Qui contacter

| Sujet                                           | Interlocuteur     |
| ----------------------------------------------- | ----------------- |
| Architecture, revue de code, blocage technique  | Tech lead         |
| Front, design system                            | Développeur front |
| API, services, base de données                  | Développeur back  |
| Priorités, tickets Jira, critères d'acceptation | Chef de projet    |

Les noms correspondant à chaque rôle sont dans la section [Équipe du README](../README.md#équipe).
