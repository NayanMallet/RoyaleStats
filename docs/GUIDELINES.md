# Conventions de code

Ce document fixe la façon d'écrire du code dans RoyaleStats. Le fonctionnement global est décrit dans [ARCHITECTURE.md](ARCHITECTURE.md), le circuit des branches et des PR dans [CONTRIBUTING.md](../.github/CONTRIBUTING.md).

## Organisation du dépôt

Le dépôt est un monorepo pnpm. Chaque dossier listé dans `pnpm-workspace.yaml` est un paquet indépendant :

- `front` : interface Vue 3 + shadcn-vue
- `api-gateway` : point d'entrée unique du front, porte aussi la documentation Swagger
- `user-service`, `link-service`, `clash-data-service`, `meta-tracker-service` : microservices du produit
- `item-service`, `public-api` : services hérités du TP microservices, hors périmètre produit
- `shared` : code commun aux services (types, logger, client HTTP, CORS)

Les règles d'architecture (le front ne parle qu'à la Gateway, seul `clash-data-service` appelle l'API Clash Royale, une base par service) sont détaillées dans [ARCHITECTURE.md](ARCHITECTURE.md#règles-darchitecture).

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

## Front

### Structure de `front/src`

| Dossier          | Contenu                                                        | Règle                                       |
| ---------------- | -------------------------------------------------------------- | ------------------------------------------- |
| `views/`         | Une vue par route (`HomeView.vue`, `ProfileView.vue`…)         | Déclarée dans `router/index.ts`             |
| `components/`    | Composants métier (`PlayerStats.vue`, `LinkPlayerDialog.vue`…) | Un composant = une responsabilité           |
| `components/ui/` | Composants du design system, **générés par shadcn-vue**        | Ne pas modifier à la main (voir ci-dessous) |
| `services/`      | Appels HTTP, un fichier par domaine (`*.service.ts`)           | Seul endroit où l'on appelle l'API          |
| `stores/`        | Stores Pinia (`auth.ts`)                                       | État partagé entre vues                     |
| `config/`        | URLs de l'API (`api.ts`)                                       | Aucune URL en dur ailleurs                  |
| `types/`         | Types TypeScript partagés du front                             | —                                           |
| `lib/utils.ts`   | Utilitaire `cn()` pour combiner des classes Tailwind           | —                                           |

### Composants

- Toujours `<script setup lang="ts">`. Props et événements typés : `defineProps<{ tag: string }>()`, `defineEmits<{ linked: [tag: string] }>()`.
- Fichiers en PascalCase (`LinkedPlayer.vue`), composables en camelCase préfixés par `use` (`usePlayer.ts`).
- Les textes affichés à l'utilisateur sont en français.

### Design system

Le design system repose sur **shadcn-vue** (style `new-york`, couleur de base `neutral`) et sur les variables CSS définies dans `src/style.css`.

- **Ajouter un composant** : depuis `front/`, `pnpm dlx shadcn-vue@latest add <composant>` (par exemple `dialog`, `table`, `skeleton`). Il est copié dans `components/ui/`.
- **Ne pas modifier `components/ui/` à la main** : pour adapter un composant, créez un composant métier qui l'enveloppe. Cela permet de régénérer `ui/` sans perdre de travail.
- **Couleurs** : utilisez les classes liées aux variables du thème (`bg-background`, `text-foreground`, `text-muted-foreground`, `bg-primary`, `text-destructive`, `border-border`…), pas de couleur en dur. Le code existant utilise encore des classes `slate-*` : migrez-les quand vous touchez au fichier.
- **Icônes** : `lucide-vue-next`. **Notifications** : `toast` de `vue-sonner`. **Formulaires** : `vee-validate` + `zod` avec les composants `ui/field`.

### Appels HTTP et état

- Un composant n'appelle jamais `fetch` directement : il passe par un `services/*.service.ts`, qui utilise `services/http.ts` et les URLs de `config/api.ts`. Une partie du code existant ne respecte pas encore cette règle (migration suivie dans la Story S2.2).
- L'état partagé (session, utilisateur, tag lié) vit dans un store Pinia. Le `localStorage` n'est lu et écrit que par les stores.

### Responsive et accessibilité

- Conception **mobile d'abord**, puis vérification à **800 × 600** (persona Gérard, voir [PERSONAS.md](PERSONAS.md)) : aucun défilement horizontal, boutons des dialogues toujours visibles. À cette largeur, Tailwind applique le breakpoint `md` (768 px) mais pas `lg` (1024 px).
- Texte courant de 16 px minimum, contraste WCAG AA (4,5:1), chaque champ a un `label`, chaque image un `alt`, aucune information disponible uniquement au survol.

## Back

### Structure d'un service

```
<service>/src/
├── server.ts        # création de l'app Express, middlewares, routes, gestion d'erreurs, démarrage
├── routes/          # déclaration des routes → controllers
├── controllers/     # lecture de la requête, validation, réponse HTTP
├── services/        # logique métier, appels aux autres services
├── middleware/      # authentification, etc.
└── database.ts      # initialisation SQLite et accès à la base
```

Pour le nouveau code, gardez le SQL dans `database.ts` ou `services/`, pas dans les controllers.

### Règles

- **SQL** : toujours des requêtes préparées avec paramètres (`db.prepare('… WHERE id = ?').get(id)`), jamais de concaténation de chaînes.
- **Validation** : vérifiez `req.body` et `req.params` à l'entrée du controller ; une entrée invalide renvoie **400**.
- **Erreurs** : réponse JSON au format `{ error, message, statusCode }` (type `ApiError` de `shared`), avec le bon code HTTP : 400, 401, 403, 404, 409, 500, 502. Ne renvoyez jamais de stack, de requête SQL ou d'URL interne au client. Ce contrat va évoluer avec l'Epic E5 (Error Management).
- **Logs** : uniquement `logger` de `shared`, jamais `console.log`. Ne journalisez jamais de mot de passe, de token ou de clé API.
- **Configuration** : lisez `process.env` ; une valeur par défaut est acceptable pour un port ou une URL, jamais pour un secret. Toute nouvelle variable va dans `.env.example`.

### Ajouter une route : checklist

1. Route, controller et logique dans le service concerné.
2. Si le préfixe est nouveau : proxy dans `api-gateway/src/proxy.ts` et `server.ts`.
3. Description dans `api-gateway/src/openapi.ts` (Swagger).
4. URL dans `front/src/config/api.ts` et fonction dans le `services/*.service.ts` correspondant.

## Tests

Le projet n'a pas encore de tests automatisés. La mise en place de **Vitest** (tests unitaires, front et back) et de **Playwright** (tests de bout en bout, dont un projet en 800 × 600) est en cours. En attendant, vérifiez vos changements à la main et décrivez vos vérifications dans la PR.

## Definition of Ready

Une Story peut entrer dans un sprint quand :

- elle a une description « En tant que… je veux… afin de… » ;
- ses critères d'acceptation sont testables ;
- ses sous-tâches FRONT et BACK sont créées et estimées ;
- elle n'est bloquée par aucun autre ticket non terminé.

## Definition of Done

Un ticket passe en « À valider » quand :

- tous les critères d'acceptation sont vérifiés ;
- les tests correspondants sont écrits et passent ;
- `pnpm lint`, `pnpm --filter front lint` et `pnpm --filter front type-check` passent ;
- la documentation concernée est à jour (README, `docs/`, Swagger, `.env.example`) ;
- la PR est relue et fusionnée dans `develop` ;
- une preuve (capture, requêtes, résultats de test) est jointe au ticket Jira.
