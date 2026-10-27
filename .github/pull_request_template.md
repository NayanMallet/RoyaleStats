## Ticket Jira

RST-

## Ce qui change

<!-- Résumé des modifications et raison du changement. -->

## Comment tester

1.
2.

## Captures d'écran

<!-- Obligatoire pour un changement d'interface : une capture standard et une à 800 × 600. -->

## Checklist

- [ ] La branche part de `develop` et la PR vise `develop`
- [ ] Les commits suivent la convention de [CONTRIBUTING.md](../.github/CONTRIBUTING.md#nommer-les-commits)
- [ ] Les critères d'acceptation du ticket sont vérifiés
- [ ] Les tests sont ajoutés ou mis à jour, et passent
- [ ] `pnpm lint`, `pnpm --filter front lint` et `pnpm --filter front type-check` passent
- [ ] `pnpm test` passe, et `pnpm --filter front test:e2e` pour un changement d'interface
- [ ] `docker compose up --build` démarre sans erreur
- [ ] La documentation est à jour (README, `docs/`, Swagger, `.env.example`) si nécessaire
- [ ] Aucun secret ni fichier `.env` n'est commité
