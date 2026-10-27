# Installer RoyaleStats

## Prérequis

| Outil   | Version                                           | Installation                                  |
| ------- | ------------------------------------------------- | --------------------------------------------- |
| Node.js | 22 (fichier `.nvmrc`)                             | `nvm install && nvm use` à la racine du dépôt |
| pnpm    | 10.20.0 (champ `packageManager`)                  | `corepack enable` (fourni avec Node)          |
| Docker  | Docker Desktop récent, avec `docker compose` (v2) | <https://docs.docker.com/get-docker/>         |
| Git     | —                                                 | —                                             |

## 1. Créer sa clé API Clash Royale

L'API officielle exige une clé **liée à une adresse IP publique**. La clé d'un collègue ne fonctionnera donc pas chez vous : chacun crée la sienne.

1. Récupérez votre IP publique : `curl -s https://api.ipify.org`.
2. Créez un compte sur <https://developer.clashroyale.com>, puis ouvrez **My Account → Create New Key**.
3. Renseignez un nom, une description et, dans **Allowed IP addresses**, l'IP obtenue à l'étape 1.
4. Copiez le jeton généré : il ira dans `CLASH_ROYALE_API_KEY` à l'étape suivante.

Si votre IP change (autre réseau Wi-Fi, box redémarrée, réseau de l'école), l'API répond **403** : créez une nouvelle clé avec la nouvelle IP.

## 2. Installer

```bash
git clone https://github.com/NayanMallet/RoyaleStats.git
cd RoyaleStats
nvm use
corepack enable
pnpm install                  # installe tout le monorepo
pnpm --filter shared build    # à refaire après chaque modification de shared/
cp .env.example .env          # puis renseigner CLASH_ROYALE_API_KEY
```

Le fichier `.env` ne doit jamais être commité. Toute nouvelle variable doit être ajoutée à `.env.example`, avec un commentaire.

## 3. Lancer le projet

```bash
docker compose up --build          # toute la stack, logs au premier plan
docker compose up -d --build       # idem, en arrière-plan
docker compose logs -f user-service    # suivre les logs d'un service
docker compose up -d --build link-service   # reconstruire un seul service après modification
docker compose down                # tout arrêter
```

| Service              | Adresse                      |
| -------------------- | ---------------------------- |
| Front                | <http://localhost:8080>      |
| API Gateway          | <http://localhost:3000>      |
| Swagger              | <http://localhost:3000/docs> |
| public-api           | <http://localhost:3001>      |
| user-service         | <http://localhost:3002>      |
| item-service         | <http://localhost:3003>      |
| clash-data-service   | <http://localhost:3004>      |
| link-service         | <http://localhost:3005>      |
| meta-tracker-service | <http://localhost:3006>      |

Les bases SQLite sont créées au premier démarrage dans `data/<service>/database.sqlite`. Ce dossier n'est pas versionné.

## 4. Vérifier l'installation

```bash
docker compose ps --format "table {{.Service}}\t{{.Status}}"
```

- `user-service`, `item-service`, `clash-data-service`, `link-service` et `meta-tracker-service` doivent être **`(healthy)`** (comptez environ 20 secondes après le démarrage).
- `api-gateway`, `front` et `public-api` n'ont pas de healthcheck : ils doivent être `Up`.
- `curl -s localhost:3000/health` doit renvoyer `{"status":"ok",...}`.
- Sur <http://localhost:8080>, la recherche d'un tag de joueur (le vôtre, visible dans le jeu sous votre pseudo, ou un joueur du classement) doit afficher un profil : cela valide toute la chaîne jusqu'à l'API Clash Royale.

## 5. Développer le front avec rechargement à chaud

Laissez la stack Docker tourner pour l'API, puis :

```bash
pnpm --filter front dev       # http://localhost:5173
```

Le détail est dans [front/README.md](../front/README.md).

## Dépannage

| Symptôme                                                  | Cause probable                                           | Solution                                                                        |
| --------------------------------------------------------- | -------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Recherche de joueur en erreur, logs `Clash API error 403` | Clé absente, invalide ou IP différente de celle déclarée | Vérifier `CLASH_ROYALE_API_KEY` dans `.env` ; recréer la clé avec l'IP actuelle |
| `Cannot find module 'shared'`                             | Paquet `shared` non compilé                              | `pnpm --filter shared build`                                                    |
| `port is already allocated`                               | Un autre processus utilise le port                       | `lsof -i :3000` puis arrêter le processus, ou `docker compose down`             |
| Un service reste `unhealthy` ou redémarre en boucle       | Erreur au démarrage                                      | `docker compose logs <service> --tail=50`                                       |
| Erreur `better-sqlite3` / `NODE_MODULE_VERSION` en local  | Module natif compilé pour une autre version de Node      | `nvm use` puis `pnpm rebuild better-sqlite3`                                    |
| Repartir d'une base vide                                  | —                                                        | `docker compose down`, supprimer `data/<service>/database.sqlite`, relancer     |
| Une modification n'apparaît pas dans Docker               | Image non reconstruite                                   | `docker compose up -d --build <service>`                                        |
