# Conventions de code

## Organisation du dépôt

Le dépôt est un monorepo pnpm. Chaque dossier listé dans `pnpm-workspace.yaml` est un paquet indépendant :

- `front` : interface Vue.js + shadcn-vue
- `api-gateway` : point d'entrée unique du front, porte aussi la documentation Swagger
- `user-service`, `link-service`, `clash-data-service`, `meta-tracker-service`, `item-service`, `public-api` : microservices
- `shared` : code commun aux services

Deux règles d'architecture :

- Le front ne parle qu'à l'API Gateway. Une nouvelle route de service doit être exposée dans la gateway et décrite dans sa spécification OpenAPI.
- Seul `clash-data-service` appelle l'API officielle Clash Royale. Les autres services passent par lui.

## Style et qualité du code

Avant de commiter, à la racine :

```bash
pnpm format   # Prettier sur tout le dépôt
pnpm lint     # ESLint
```

Et pour le front :

```bash
pnpm --filter front lint
pnpm --filter front type-check
```

Le style est fixé par `.prettierrc` : guillemets simples, point-virgule, virgules finales, 100 caractères par ligne, indentation de 2 espaces.

Ne mélangez pas reformatage et changement fonctionnel : un reformatage va dans un commit `style` à part.

## Tests

Le projet n'a pas encore de tests automatisés. Vérifiez vos changements à la main, et lancez `scripts/test-docker.sh` si vous touchez à Docker ou au démarrage d'un service.
