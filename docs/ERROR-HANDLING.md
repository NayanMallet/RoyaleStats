# Gestion des erreurs

Comment RoyaleStats produit, transporte, affiche et journalise les erreurs, du service back à l'écran. Référence de l'Epic RST-32, mise en place par la Story RST-33.

En **développement**, les erreurs sont verbeuses pour déboguer. En **production**, elles sont offusquées : l'utilisateur voit un message compréhensible et un code incident, le détail complet reste dans les logs serveur.

## Contrat d'erreur

Toutes les erreurs des services et de l'API Gateway ont la même forme (type `ApiError` de `shared/src/types.ts`, schéma `ApiError` du Swagger) :

```json
{
  "error": "PlayerNotFound",
  "message": "Aucun joueur ne correspond à ce tag.",
  "statusCode": 404,
  "requestId": "6f1c9e2a-3b7d-4c1e-9a2f-1d2e3f4a5b6c",
  "details": {},
  "stack": "Error: …"
}
```

| Champ        | Contenu                                                                          |
| ------------ | -------------------------------------------------------------------------------- |
| `error`      | Code machine stable, en PascalCase : `ValidationError`, `PlayerNotFound`…        |
| `message`    | Texte affichable à l'utilisateur, en français                                    |
| `statusCode` | Code HTTP, identique au statut de la réponse                                     |
| `requestId`  | Toujours présent ; même valeur que le header `x-request-id` et que dans les logs |
| `details`    | En développement, ou pour donner les champs invalides d'une 400                  |
| `stack`      | En développement uniquement                                                      |

## Développement et production

Le mode suit `NODE_ENV` côté back et `import.meta.env.DEV` côté front.

|              | Développement                                   | Production                                                 |
| ------------ | ----------------------------------------------- | ---------------------------------------------------------- |
| Réponse 4xx  | message métier + `details`                      | message métier (+ `details` pour une 400)                  |
| Réponse 5xx  | message réel + `stack` + `details`              | « Une erreur interne est survenue. » + `requestId`         |
| Logs serveur | ligne lisible, niveau `debug`                   | une ligne JSON par événement, niveau `info`, stack incluse |
| Front        | panneau « Détails techniques » (message, stack) | message utilisateur + « Code incident : `requestId` »      |

En production, une réponse ne contient jamais de stack, de requête SQL, d'URL interne ni de clé API.

## Table HTTP → effet dans l'interface

| Code            | `error`                                              | Effet côté front (`describeApiError`)                                           |
| --------------- | ---------------------------------------------------- | ------------------------------------------------------------------------------- |
| 400             | `ValidationError`, `InvalidPlayerTag`                | message métier, sous le champ concerné quand il y en a un                       |
| 401             | `AuthenticationError`                                | session purgée ; sur une page privée, redirection vers `/login?redirect=<page>` |
| 403             | `Forbidden`                                          | « Action non autorisée. »                                                       |
| 404             | `NotFound`, `PlayerNotFound`, `RouteNotFound`…       | message métier, ou état « introuvable » dédié                                   |
| 409             | `ConflictError`                                      | message métier (« Un compte existe déjà avec cet email. »)                      |
| 429             | `RateLimited`                                        | « Trop de requêtes, réessayez dans quelques secondes. »                         |
| 500             | `InternalServerError`                                | « Une erreur interne est survenue. » + Réessayer + code incident                |
| 502 / 503 / 504 | `BadGateway`, `ServiceUnavailable`, `GatewayTimeout` | « Service momentanément indisponible » + Réessayer                              |
| réseau, délai   | `NetworkError` (front)                               | « Service injoignable » + Réessayer, au plus tard après 10 s                    |

## Côté back : lever une erreur

Les classes sont dans `shared` : `ValidationError` (400), `UnauthorizedError` (401), `ForbiddenError` (403), `NotFoundError` (404), `ConflictError` (409), `RateLimitedError` (429), `UpstreamError` (502, 503, 504) et `InternalServerError` (500).

```ts
import { NotFoundError, ValidationError } from 'shared';

export async function getPlayer(req: Request, res: Response) {
  if (!isValidTag(req.params.tag)) {
    throw new ValidationError('Tag de joueur invalide.', { code: 'InvalidPlayerTag' });
  }
  const player = await findPlayer(req.params.tag);
  if (!player) {
    throw new NotFoundError('Aucun joueur ne correspond à ce tag.', { code: 'PlayerNotFound' });
  }
  res.json(player);
}
```

- **Levez, n'écrivez pas la réponse** : Express 5 transmet les erreurs, synchrones ou asynchrones, au handler partagé. Pas de `try/catch` qui renvoie une 500 : il cache l'erreur réelle.
- **`message`** est lu par l'utilisateur : en français, sans détail technique. Le détail de diagnostic va dans `internalDetails` (développement uniquement), la cause d'origine dans `cause` (journalisée avec sa stack).
- **SQLite** : une `SqliteError` non attrapée est traduite par son code : `SQLITE_CONSTRAINT_UNIQUE` → 409, `NOT NULL` / `CHECK` → 400, `SQLITE_BUSY` → 503, le reste → 500.
- **Appel à un autre service** : transmettez l'identifiant avec `fetch(url, { headers: requestIdHeaders() })`, et traduisez un service injoignable en `UpstreamError(503)`, pas en 404.

Chaque `server.ts` branche les mêmes briques, dans cet ordre :

```ts
configureLogger({ service: 'user-service' });
installProcessHandlers(); // uncaughtException / unhandledRejection → log fatal, arrêt, Docker relance
app.use(requestIdMiddleware()); // x-request-id conservé ou créé
app.use(requestLoggerMiddleware()); // une ligne de log par requête
// … routes …
registerDebugRoutes(app); // GET /debug/crash, hors production
app.use(notFoundHandler());
app.use(createErrorHandler());
```

## Appels externes et délais maximaux

Chaque appel sortant a un délai maximal, plus court à chaque étage que l'étage du dessus : l'utilisateur reçoit toujours l'erreur du service qui a réellement attendu, jamais un chargement infini.

| Appel                                                    | Délai | Variable                   |
| -------------------------------------------------------- | ----- | -------------------------- |
| Front → Gateway (`services/http.ts`, `fetchWithTimeout`) | 10 s  | —                          |
| Gateway → services (proxy)                               | 10 s  | `GATEWAY_PROXY_TIMEOUT_MS` |
| Service → service (link-service, worker du meta-tracker) | 9 s   | `SERVICE_CALL_TIMEOUT_MS`  |
| clash-data-service → API Clash Royale                    | 8 s   | `CLASH_API_TIMEOUT_MS`     |

Les valeurs par défaut sont dans `shared/src/timeouts.ts`. Côté Clash Royale, les cas sont distingués par le code `error`, avec le même message public :

| Situation                                             | Réponse                                                                                 |
| ----------------------------------------------------- | --------------------------------------------------------------------------------------- |
| Clé API refusée (clé invalide ou liée à une autre IP) | 503 `ClashApiMisconfigured`, log `error` qui indique de vérifier `CLASH_ROYALE_API_KEY` |
| API injoignable ou en erreur                          | 503 / 502 `ClashApiUnavailable`                                                         |
| API trop lente                                        | 504 `ClashApiTimeout`                                                                   |
| Quota dépassé                                         | 429 `RateLimited`                                                                       |
| Joueur ou clan inconnu                                | 404 `PlayerNotFound`, `ClanNotFound`                                                    |

Pour un appel `fetch` vers un autre service : `signal: AbortSignal.timeout(timeoutFromEnv('SERVICE_CALL_TIMEOUT_MS', TIMEOUTS_MS.serviceCall))`, puis `isTimeoutError(error)` pour répondre 504 plutôt que 503.

## Côté front : afficher une erreur

`services/http.ts` transforme chaque échec en erreur typée : `ApiError` (`status`, `code`, `message`, `requestId`, `details`) quand l'API a répondu, `NetworkError` quand elle n'a pas répondu (réseau coupé, Gateway arrêtée, délai de 10 s dépassé).

```ts
import { useApiError } from '@/composables/useApiError';

const { describe, notify } = useApiError();

try {
  await linkService.createLink(tag);
} catch (error) {
  notify(error); // toast avec le message de la table et le code incident
}

// ou en ligne, à la place du contenu :
loadError.value = describe(error); // <ErrorState v-bind="loadError" @retry="load" />
```

- **`ErrorState`** (Storybook : `Molecules/ErrorState`) affiche titre, message, code incident, bouton Réessayer et, en développement, les détails techniques. `MetaStats` l'utilise pour distinguer « erreur » de « aucune donnée ».
- **Session** (`lib/session.ts`) : une session se termine quand un appel envoyé avec le token répond 401, quand le token indique lui-même qu'il est expiré (vérifié au démarrage et à chaque navigation, sans appel réseau), ou quand un autre onglet se déconnecte. Le token, l'utilisateur et le tag lié sont alors effacés, un toast « Votre session a expiré » s'affiche et, sur une page privée, l'utilisateur est redirigé vers `/login?redirect=<page>` puis ramené sur sa page après connexion. Au démarrage, la session stockée est aussi vérifiée auprès de l'API (`GET /api/users/me`) ; une panne réseau la conserve. Une 401 sans token (mauvais mot de passe) reste une erreur de formulaire.
- **Crash d'un composant** : `ErrorBoundary` (autour de `<RouterView>` dans `App.vue`) affiche un écran de repli avec « Recharger » et « Retour à l'accueil ». Les erreurs restantes (`app.config.errorHandler`, `window` `error` et `unhandledrejection`) sont journalisées dans la console par `lib/errorReporting.ts`.

## Retrouver un incident à partir du code incident

1. L'utilisateur donne le code incident affiché (le `requestId`), ou on le lit dans le header `x-request-id` de la réponse (onglet Réseau des DevTools).
2. On cherche ce code dans les logs de toute la stack :

   ```bash
   docker compose logs | grep 6f1c9e2a-3b7d-4c1e-9a2f-1d2e3f4a5b6c
   ```

   La requête apparaît dans la Gateway puis dans chaque service traversé, avec la stack complète de l'erreur.

3. En production, les logs sont en JSON : `docker compose logs user-service --no-log-prefix | jq 'select(.requestId == "<code>")'`.

Le niveau de log se règle avec `LOG_LEVEL` (`debug`, `info`, `warn`, `error`, `fatal`) dans `.env`.

## Démonstration

Stack lancée (`docker compose up -d --build --wait`) :

| Démonstration          | Commande                                                                                                                                                    | Résultat attendu                                                           |
| ---------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| Contrat et 409 SQL     | `curl -i -X POST localhost:3000/api/users/register -H 'Content-Type: application/json' -d '{"name":"a","email":"a@a.fr","password":"secret12"}'`, deux fois | `409 ConflictError`, `requestId` = header `x-request-id`                   |
| Suivre une requête     | `docker compose logs api-gateway user-service \| grep <requestId>`                                                                                          | la requête dans les deux services                                          |
| Crash dans une requête | `curl localhost:3000/debug/crash` puis `curl localhost:3000/health`                                                                                         | 500 au contrat (stack en DEV), puis 200 : le service tourne toujours       |
| Crash hors requête     | `curl 'localhost:3000/debug/crash?mode=process'`                                                                                                            | log `FATAL`, arrêt du process, redémarrage par Docker en quelques secondes |
| Service arrêté         | `docker compose stop user-service && curl localhost:3000/api/users/me`                                                                                      | 503 `ServiceUnavailable`                                                   |
| Mode production        | `docker compose run --rm -e NODE_ENV=production -p 3999:3002 user-service`, puis `curl localhost:3999/debug/crash`                                          | 404 (route absente en production), logs en JSON                            |
| Erreur côté interface  | Storybook : `Organisms/MetaStats → ServerError`, `Organisms/ErrorBoundary → ViewCrashed`                                                                    | état d'erreur avec Réessayer ; écran de repli                              |

**Hors périmètre** : l'envoi des erreurs vers un service externe (Sentry ou équivalent) est une évolution possible ; aujourd'hui elles restent dans les logs Docker et la console du navigateur.
