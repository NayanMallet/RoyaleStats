# Storymap

La storymap organise le backlog selon le parcours de l'utilisateur. On la lit en deux sens :

- **De gauche à droite**, les **activités** : ce que l'utilisateur fait dans RoyaleStats, dans l'ordre où il le découvre.
- **De haut en bas**, les **tranches de livraison** : chaque tranche est un produit utilisable de bout en bout, plus riche que la précédente.

Chaque Story est rattachée dans Jira à la release de sa tranche (`MVP`, `R2 — Fiabilisation`, `R3 — Engagement`, onglet _Releases_ du projet) et porte le label correspondant (`release-mvp`, `release-r2`, `release-r3`). Quand un persona l'a fait naître, elle porte aussi le label de ce persona ([PERSONAS.md](PERSONAS.md)).

| Persona                               | Repère |
| ------------------------------------- | ------ |
| Karim, chef de clan sur mobile        | 📱     |
| Gérard, animateur sur écran 800 × 600 | 🖥️     |
| Sacha, compétiteur accro aux stats    | 🏆     |

## Parcours et étapes

| Activité   | 1. Rechercher                                      | 2. Consulter                    | 3. Avoir un compte                        | 4. Lier son profil                          | 5. Analyser la méta                    | 6. Progresser                           | 7. Comprendre une erreur                     |
| ---------- | -------------------------------------------------- | ------------------------------- | ----------------------------------------- | ------------------------------------------- | -------------------------------------- | --------------------------------------- | -------------------------------------------- |
| **Étapes** | Saisir un tag joueur ou clan ; corriger une saisie | Profil, deck, clan, classements | S'inscrire, se connecter, rester connecté | Associer son tag, le retrouver, le protéger | Cartes dominantes, analyse de son deck | Suivre sa forme, se fixer des objectifs | Savoir quoi faire quand quelque chose échoue |

## Tranches de livraison

### MVP — « Road to MVP »

Objectif : un produit recetté, robuste face aux erreurs et utilisable sur l'écran de Gérard. C'est la tranche du stage.

| 1. Rechercher                                                                                                          | 2. Consulter                                                                                                                                                             | 3. Avoir un compte                                                           | 4. Lier son profil                                                             | 5. Analyser la méta                                                         | 6. Progresser | 7. Comprendre une erreur                                                             |
| ---------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------------ | --------------------------------------------------------------------------- | ------------- | ------------------------------------------------------------------------------------ |
| [RST-41](https://pablopjl64.atlassian.net/browse/RST-41) Tag invalide, joueur introuvable, page 404 📱🖥️ _(stagiaire)_ | [RST-7](https://pablopjl64.atlassian.net/browse/RST-7) Recette de la consultation<br>[RST-46](https://pablopjl64.atlassian.net/browse/RST-46) Utilisable en 800 × 600 🖥️ | [RST-14](https://pablopjl64.atlassian.net/browse/RST-14) Recette des comptes | [RST-15](https://pablopjl64.atlassian.net/browse/RST-15) Recette de la liaison | [RST-23](https://pablopjl64.atlassian.net/browse/RST-23) Recette de la méta | —             | [RST-33](https://pablopjl64.atlassian.net/browse/RST-33) Socle d'erreurs DEV/PROD 📱 |

### R2 — Fiabilisation

Objectif : des appels API sûrs et explicites, des comptes et une liaison sécurisés, un premier retour sur la progression.

| 1. Rechercher                                                                            | 2. Consulter | 3. Avoir un compte                                                               | 4. Lier son profil                                                                         | 5. Analyser la méta | 6. Progresser                                                                       | 7. Comprendre une erreur |
| ---------------------------------------------------------------------------------------- | ------------ | -------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------- | ----------------------------------------------------------------------------------- | ------------------------ |
| [RST-11](https://pablopjl64.atlassian.net/browse/RST-11) Appels API fiables, timeouts 📱 | ↑ (RST-11)   | [RST-24](https://pablopjl64.atlassian.net/browse/RST-24) Sessions et validations | [RST-19](https://pablopjl64.atlassian.net/browse/RST-19) Liaison sécurisée et synchronisée | —                   | [RST-47](https://pablopjl64.atlassian.net/browse/RST-47) Forme récente du joueur 🏆 | ↑ (consomment RST-33)    |

### R3 — Engagement

Objectif : transformer la consultation en coaching, avec l'analyse de deck (la killer feature) et la gamification.

| 1. Rechercher | 2. Consulter | 3. Avoir un compte | 4. Lier son profil | 5. Analyser la méta                                                             | 6. Progresser                                                                   | 7. Comprendre une erreur |
| ------------- | ------------ | ------------------ | ------------------ | ------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- | ------------------------ |
| —             | —            | —                  | —                  | [RST-28](https://pablopjl64.atlassian.net/browse/RST-28) Analyse du deck actuel | [RST-48](https://pablopjl64.atlassian.net/browse/RST-48) Objectifs et succès 🏆 | —                        |

## Retrouver une tranche dans Jira

```jql
project = RST AND fixVersion = "MVP" ORDER BY priority DESC
project = RST AND fixVersion = "R2 — Fiabilisation" ORDER BY priority DESC
project = RST AND fixVersion = "R3 — Engagement" ORDER BY priority DESC
project = RST AND labels in (persona-mobile, persona-800x600, persona-gamification) ORDER BY key
```

Les Stories transverses d'Error Management sont regroupées dans l'Epic [RST-32](https://pablopjl64.atlassian.net/browse/RST-32).

## Faire vivre la storymap

- Une nouvelle Story se place sous une activité et dans une tranche : ajoutez-la au tableau, rattachez-la à la release correspondante dans Jira et posez le label `release-*`.
- Une Story qui change de tranche change de release, de label et de ligne, dans la même PR que la mise à jour de ce fichier.
- Si une activité reste vide dans le MVP, c'est un choix assumé : il doit pouvoir se justifier par les personas.
