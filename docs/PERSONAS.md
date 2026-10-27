# Personas

Trois personas guident les choix produit de RoyaleStats : un persona propre au projet et deux personas imposés par le cahier des charges (écran 800 × 600, statistiques et gamification).

Chaque persona est relié au backlog Jira par un label. Le filtre suivant affiche tout le travail qu'ils induisent :

```jql
project = RST AND labels in (persona-mobile, persona-800x600, persona-gamification)
```

| Persona                                                                             | Label Jira             | Contrainte principale                                |
| ----------------------------------------------------------------------------------- | ---------------------- | ---------------------------------------------------- |
| [Karim, le chef de clan en mouvement](#karim-le-chef-de-clan-en-mouvement)          | `persona-mobile`       | Mobile, réseau instable, sessions de 2-3 minutes     |
| [Gérard, l'animateur sur écran cathodique](#gérard-lanimateur-sur-écran-cathodique) | `persona-800x600`      | Écran 800 × 600, lisibilité, peu d'aisance technique |
| [Sacha, le compétiteur accro aux stats](#sacha-le-compétiteur-accro-aux-stats)      | `persona-gamification` | Indicateurs fiables, progression, objectifs          |

---

## Karim, le chef de clan en mouvement

_Persona propre au projet._

|                         |                                                                              |
| ----------------------- | ---------------------------------------------------------------------------- |
| **Âge / métier**        | 29 ans, technicien d'intervention fibre, toujours en déplacement             |
| **Lieu**                | Périphérie de Toulouse, journées passées entre camionnette et chantiers      |
| **Équipement**          | Smartphone Android milieu de gamme (écran 393 × 851 px), 4G souvent instable |
| **Usage**               | 5 à 10 sessions courtes par jour, 2 à 3 minutes chacune, pendant les pauses  |
| **Profil Clash Royale** | Joue depuis 2017, 7 500 trophées, **chef d'un clan de 45 membres**           |
| **Aisance numérique**   | Bonne sur mobile, n'utilise presque jamais d'ordinateur                      |

> « J'ai trois minutes. Si ça charge dans le vide, je ferme et je reviens jamais. »

**Contexte.** Karim gère son clan comme une petite équipe : il surveille l'activité, repère les joueurs qui progressent et recrute avant chaque saison de guerre de clans. Il a lié son tag à RoyaleStats pour ouvrir son profil en un tap.

**Objectifs**

- Consulter son profil lié et celui d'un membre en moins de 10 secondes.
- Rechercher un clan adverse ou un candidat à partir d'un tag copié dans le chat du jeu.
- Partager un lien vers un profil dans le Discord du clan.

**Frustrations**

- Un chargement qui tourne indéfiniment quand le réseau coupe.
- Les messages techniques ou en anglais (« HTTP error 500 », « Player not found »).
- Devoir retaper un tag : `O` confondu avec `0`, `#` oublié.

**Scénario clé.** En pause sur un parking, Karim colle le tag d'un candidat et lance la recherche. Le réseau décroche. L'application affiche « Connexion perdue, réessaie » avec un bouton, puis le profil au retour du réseau, sans qu'il ait à retaper le tag.

**Exigences produit**

- Timeout de 10 s maximum sur les appels, puis message et bouton « Réessayer ».
- Distinction entre « tag invalide », « joueur introuvable » et « service indisponible ».
- Normalisation du tag saisi : majuscules, `#` facultatif, `O` → `0`.
- URL partageable `/?tag=XXXX`.

---

## Gérard, l'animateur sur écran cathodique

_Persona imposé : écran 800 × 600._

|                         |                                                                                                                                                                                                                       |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Âge / métier**        | 61 ans, retraité de la SNCF, **animateur bénévole** du club jeux vidéo d'un foyer rural                                                                                                                               |
| **Lieu**                | Salle commune du foyer, village du Gers                                                                                                                                                                               |
| **Équipement**          | PC de récupération (Windows 10, 4 Go de RAM, Firefox ESR), **écran cathodique 15 pouces en 800 × 600**. Surface utile estimée à **≈ 780 × 470 px** une fois la barre des tâches et l'interface du navigateur déduites |
| **Usage**               | Le mercredi après-midi, sessions de 30 à 60 minutes, écran souvent regardé à plusieurs                                                                                                                                |
| **Profil Clash Royale** | Joue peu ; connaît le jeu par les membres du club                                                                                                                                                                     |
| **Aisance numérique**   | Moyenne : suit une procédure, mais se bloque face à un message technique                                                                                                                                              |

> « Si je dois faire défiler de côté, c'est que ce n'est pas fait pour moi. »

**Contexte.** Gérard organise un petit tournoi interne chaque mois. Il utilise RoyaleStats sur le PC de la salle pour afficher les profils et les classements des participants, et pour vérifier les tags avant d'inscrire les joueurs.

**Objectifs**

- Afficher un profil complet (statistiques et deck de 8 cartes) sans défilement horizontal.
- Lire les informations à 1,5 m de l'écran, à plusieurs.
- Comprendre seul pourquoi une recherche échoue.

**Frustrations**

- Les sites qui coupent le contenu ou cachent des boutons hors de l'écran.
- Les textes gris clair et fins, illisibles sur un tube cathodique.
- Les fenêtres modales plus hautes que l'écran.

**Scénario clé.** Gérard saisit le tag d'un participant avec une faute. L'application affiche, dans la zone visible, « Ce tag n'existe pas » et le rappel illustré pour retrouver son tag. Il corrige et affiche le deck, lisible sans défilement.

**Exigences produit**

- Aucun défilement horizontal à **800 px de large** sur toutes les pages et sur les états d'erreur.
- À ≈ 780 px, Tailwind applique le breakpoint `md` (768 px) mais pas `lg` (1024 px) : la mise en page « tablette » doit être testée explicitement.
- Deck en 2 lignes de 4 cartes au minimum ; tableau des classements sans colonne coupée.
- Dialogues de 440 px de haut au maximum, contenu défilant, boutons toujours visibles.
- Texte courant ≥ 16 px, contraste ≥ 4,5:1, pas d'information disponible uniquement au survol.
- Erreurs affichées près du champ concerné, pas seulement dans une notification éphémère.
- Images chargées en différé (`loading="lazy"`) pour un PC lent.

---

## Sacha, le compétiteur accro aux stats

_Persona imposé : statistiques et gamification._

|                         |                                                                                                  |
| ----------------------- | ------------------------------------------------------------------------------------------------ |
| **Âge / métier**        | 20 ans, étudiant en BUT informatique                                                             |
| **Lieu**                | Toulouse, en colocation                                                                          |
| **Équipement**          | PC portable 1920 × 1080 et smartphone ; second écran pendant ses sessions de jeu                 |
| **Usage**               | Tous les jours, avant et après chaque session de ladder                                          |
| **Profil Clash Royale** | Joueur **Path of Legends**, vise le top 10 000 mondial, adapte son deck chaque semaine à la méta |
| **Aisance numérique**   | Très bonne : lit les graphiques, compare avec d'autres sites de statistiques                     |

> « Si je ne peux pas le mesurer, je ne peux pas l'améliorer. »

**Contexte.** Sacha veut objectiver sa progression. Il aime les chiffres, les séries et les objectifs : chaque session doit lui montrer s'il progresse. Il a lié son compte pour suivre son évolution.

**Objectifs**

- Voir son taux de victoire récent, sa série en cours et son évolution de trophées.
- Comparer son deck à la méta et savoir quelle carte changer.
- Se fixer un objectif (« 8 000 trophées ») et suivre sa progression.
- Débloquer des succès et les partager avec son clan.

**Frustrations**

- Un « score » sans explication ni taille d'échantillon.
- Un « 0 % » affiché alors qu'il n'y a simplement pas assez de données.
- Devoir tout recalculer à la main depuis l'historique de combats.

**Scénario clé.** Après 15 parties, Sacha ouvre son profil : « Série en cours : 4 victoires. Sur tes 25 derniers combats : 64 % de victoires (16/25). +142 trophées depuis hier. Objectif 8 000 : 87 %. » Le succès « En feu : 5 victoires d'affilée » est à une victoire.

**Exigences produit**

- Chaque indicateur affiche sa base de calcul (« sur 25 combats ») et un état « données insuffisantes » sous un seuil, jamais un 0 % trompeur.
- L'API officielle ne renvoie que les **25 derniers combats** d'un joueur : un historique plus long suppose de stocker des données côté serveur.
- Le score de deck est présenté comme un indicateur descriptif, pas comme une prédiction de victoire.
