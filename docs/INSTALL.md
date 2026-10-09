# Installer RoyaleStats

## Prérequis

- Node.js `^20.19.0` ou `>=22.12.0`
- pnpm `10.x`
- Docker et docker-compose
- Une clé d'API Clash Royale, à créer sur <https://developer.clashroyale.com>

## Installation

```bash
pnpm install                  # installe tout le monorepo
pnpm --filter shared build    # à refaire après chaque modification de shared/
cp .env.example .env          # puis renseigner CLASH_ROYALE_API_KEY
```

Le fichier `.env` ne doit jamais être commité. Toute nouvelle variable doit être ajoutée à `.env.example`.

## Lancer le projet

Toute la stack, avec Docker :

```bash
docker-compose up --build
```

Un seul paquet, sans Docker :

```bash
pnpm --filter <paquet> dev    # par exemple : pnpm --filter front dev
```

## Adresses

| Service              | Adresse                      |
| -------------------- | ---------------------------- |
| Front                | <http://localhost:8080>      |
| API Gateway          | <http://localhost:3000>      |
| Swagger              | <http://localhost:3000/docs> |
| public-api           | `3001`                       |
| user-service         | `3002`                       |
| item-service         | `3003`                       |
| clash-data-service   | `3004`                       |
| link-service         | `3005`                       |
| meta-tracker-service | `3006`                       |

## Vérifier l'installation

```bash
scripts/test-docker.sh
```

Le script construit les images, démarre la stack et contrôle les endpoints de santé de chaque service.
