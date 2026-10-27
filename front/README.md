# RoyaleStats — Front

Interface web de RoyaleStats : Vue 3, Vite, TypeScript, Pinia, Vue Router, Tailwind CSS 4 et shadcn-vue.

Les conventions (structure, design system, appels HTTP, responsive 800 × 600) sont dans [docs/GUIDELINES.md](../docs/GUIDELINES.md#front).

## Thème clair et sombre

Le bouton lune/soleil est disponible sur l'accueil, la connexion, l'inscription et le profil.
Au premier accès, le thème suit la préférence du système et ses changements. Un choix manuel est
conservé dans le navigateur (`royale_stats_theme`) et reste actif après navigation ou rechargement.
La préférence se synchronise aussi entre les onglets. Supprimer cette clé rétablit le suivi du système.

Le store `src/stores/theme.ts` gère le thème ; les couleurs des écrans reposent sur les variables
de `src/style.css`. Une initialisation dans `index.html` applique le thème avant le premier affichage.

## Lancer le front

En développement, avec rechargement à chaud. La stack Docker doit tourner pour fournir l'API (`docker compose up -d` à la racine) :

```bash
pnpm --filter front dev          # http://localhost:5173
```

Dans Docker, le front est compilé puis servi par nginx sur <http://localhost:8080> ; nginx relaie `/api/*` vers l'API Gateway (`nginx.conf`).

## Scripts

| Commande (depuis la racine)           | Rôle                                                         |
| ------------------------------------- | ------------------------------------------------------------ |
| `pnpm --filter front dev`             | Serveur de développement Vite                                |
| `pnpm --filter front build`           | Vérification des types puis build de production dans `dist/` |
| `pnpm --filter front preview`         | Sert le build de production en local                         |
| `pnpm --filter front type-check`      | Vérification des types avec `vue-tsc`                        |
| `pnpm --filter front lint`            | ESLint avec correction automatique                           |
| `pnpm --filter front test`            | Tests unitaires (Vitest)                                     |
| `pnpm --filter front test:watch`      | Tests unitaires en mode surveillance                         |
| `pnpm --filter front test:e2e`        | Tests de bout en bout (Playwright), stack Docker démarrée    |
| `pnpm --filter front storybook`       | Storybook (design system) sur <http://localhost:6006>        |
| `pnpm --filter front build-storybook` | Build statique de Storybook dans `storybook-static/`         |
| `pnpm --filter front format`          | Prettier sur `src/`                                          |

## Configuration

Le front appelle l'API avec des chemins relatifs (`/api/...`). En développement, le proxy de Vite (`vite.config.ts`) les relaie vers l'API Gateway ; dans Docker, c'est nginx (`nginx.conf`). Les deux modes se comportent donc de la même façon.

| Variable               | Rôle                                                                                                                          | Valeur par défaut       |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------- | ----------------------- |
| `API_GATEWAY_DEV_URL`  | Cible du proxy Vite en développement (lue au lancement de `pnpm dev`)                                                         | `http://localhost:3000` |
| `VITE_API_GATEWAY_URL` | Préfixe des URLs d'API dans `src/config/api.ts`, uniquement si le front et la Gateway sont servis sur des domaines différents | vide (chemins relatifs) |

Les variables préfixées par `VITE_` sont intégrées au code envoyé au navigateur : n'y mettez jamais de secret.

## Structure

```
src/
├── views/           # une vue par route
├── components/      # composants métier
│   └── ui/          # design system shadcn-vue (généré, ne pas modifier à la main)
├── services/        # appels HTTP (http.ts + un fichier par domaine)
├── stores/          # stores Pinia
├── config/api.ts    # URLs de l'API
├── router/          # routes et garde d'authentification
├── types/           # types TypeScript
├── stories/         # Storybook : atoms, molecules, organisms, templates, pages + mocks
└── style.css        # Tailwind et variables du thème
```

## Storybook

Storybook documente les composants selon l'Atomic Design (Atoms → Molecules → Organisms → Templates → Pages). Il ne dépend pas de la stack Docker : les appels API sont simulés story par story.

```bash
pnpm --filter front storybook    # http://localhost:6006
```

La page **Introduction** de Storybook explique l'organisation et le mock d'API ; les règles d'écriture sont dans [docs/GUIDELINES.md](../docs/GUIDELINES.md#storybook-et-atomic-design).

## Ajouter un composant du design system

```bash
cd front
pnpm dlx shadcn-vue@latest add <composant>    # par exemple : dialog, table, skeleton
```

## Outils conseillés

- VS Code avec l'extension [Vue (Official)](https://marketplace.visualstudio.com/items?itemName=Vue.volar), ou WebStorm.
- Extension navigateur [Vue.js devtools](https://devtools.vuejs.org/).
