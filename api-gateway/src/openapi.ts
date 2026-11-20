// Comprehensive OpenAPI 3.0 spec for the RoyaleStats API Gateway
// This documents the public entrypoints that the gateway exposes and proxies to services.

const openapiSpec = {
  openapi: '3.0.3',
  info: {
    title: 'RoyaleStats API Gateway',
    version: '1.0.0',
    description:
      'Documentation for the RoyaleStats API Gateway. Endpoints are proxied to underlying microservices.',
    contact: {
      name: 'RoyaleStats',
    },
  },
  servers: [
    { url: '/', description: 'Same origin (recommended)' },
    { url: 'http://localhost:3000', description: 'Local dev via Docker/host' },
  ],
  tags: [
    { name: 'Gateway', description: 'API Gateway health and utilities' },
    { name: 'Users', description: 'User account operations' },
    { name: 'Links', description: 'Links operations' },
    { name: 'Clash', description: 'Clash data endpoints' },
    { name: 'Meta', description: 'Meta tracker endpoints' },
    { name: 'Public', description: 'Public API' },
    { name: 'RoyaleAPI', description: 'External RoyaleAPI passthrough (read-only)' },
  ],
  paths: {
    '/health': {
      get: {
        tags: ['Gateway'],
        summary: 'Health check',
        responses: {
          '200': { description: 'Service is healthy' },
        },
      },
    },

    // Users (proxied to user-service under /users)
    '/api/users/register': {
      post: {
        tags: ['Users'],
        summary: 'Register',
        description:
          'The email is stored trimmed and lower-cased. Invalid fields are listed in `details`, keyed by field.',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  name: { type: 'string', minLength: 1, maxLength: 50 },
                  email: { type: 'string', format: 'email', maxLength: 254 },
                  password: {
                    type: 'string',
                    format: 'password',
                    minLength: 8,
                    description: '8 characters minimum, 72 bytes maximum (bcrypt limit)',
                  },
                },
                required: ['name', 'email', 'password'],
              },
            },
          },
        },
        responses: {
          '201': { description: 'User created' },
          '400': { description: 'Bad request' },
        },
      },
    },
    '/api/users/login': {
      post: {
        tags: ['Users'],
        summary: 'Login',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', format: 'password' },
                },
                required: ['email', 'password'],
              },
            },
          },
        },
        responses: {
          '200': { description: 'Authenticated' },
          '401': { description: 'Invalid credentials' },
        },
      },
    },
    '/api/users/me': {
      get: {
        tags: ['Users'],
        summary: 'Get current user',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Current user profile' },
          '401': { description: 'Unauthorized' },
        },
      },
      put: {
        tags: ['Users'],
        summary: 'Update current user',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: false,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  email: { type: 'string', format: 'email' },
                  password: { type: 'string', format: 'password' },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Updated' },
          '401': { description: 'Unauthorized' },
        },
      },
      delete: {
        tags: ['Users'],
        summary: 'Delete current user',
        security: [{ bearerAuth: [] }],
        responses: {
          '204': { description: 'Deleted' },
          '401': { description: 'Unauthorized' },
        },
      },
    },

    // Links (proxied to link-service under /link)
    '/api/link': {
      post: {
        tags: ['Links'],
        summary: 'Link the Clash Royale player to the account of the token',
        description:
          'The account comes from the JWT. `userId` is optional and must match it, otherwise 403.',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  userId: {
                    type: 'integer',
                    description: 'Optional, must be the user of the token',
                  },
                  playerTag: { type: 'string', example: '#ABC123' },
                },
                required: ['playerTag'],
              },
            },
          },
        },
        responses: {
          '201': { description: 'Link created' },
          '400': { description: 'Validation error' },
          '401': { description: 'Missing or invalid token' },
          '403': { description: 'userId of another account' },
          '404': { description: 'Player not found' },
          '409': { description: 'Conflict (already linked)' },
          '503': { description: 'Clash Data Service unavailable' },
        },
      },
    },
    '/api/link/{userId}': {
      parameters: [{ in: 'path', name: 'userId', required: true, schema: { type: 'integer' } }],
      get: {
        tags: ['Links'],
        summary: 'Get the link of the authenticated user',
        security: [{ bearerAuth: [] }],
        responses: {
          '200': { description: 'Link info' },
          '401': { description: 'Missing or invalid token' },
          '403': { description: 'Link of another account' },
          '404': { description: 'Not found' },
        },
      },
      patch: {
        tags: ['Links'],
        summary: 'Update the social links (Twitter, Twitch) of the authenticated user',
        security: [{ bearerAuth: [] }],
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  twitter: {
                    type: 'string',
                    nullable: true,
                    example: 'karim_cr',
                    description: 'Handle: letters, digits and _, 50 max. Empty or null clears it.',
                  },
                  twitch: {
                    type: 'string',
                    nullable: true,
                    example: 'karimcr',
                    description: 'Handle: letters, digits and _, 50 max. Empty or null clears it.',
                  },
                },
              },
            },
          },
        },
        responses: {
          '200': { description: 'Link updated' },
          '400': { description: 'Invalid handle' },
          '401': { description: 'Missing or invalid token' },
          '403': { description: 'Link of another account' },
          '404': { description: 'Not found' },
        },
      },
      delete: {
        tags: ['Links'],
        summary: 'Delete the link of the authenticated user',
        security: [{ bearerAuth: [] }],
        responses: {
          '204': { description: 'Deleted' },
          '401': { description: 'Missing or invalid token' },
          '403': { description: 'Link of another account' },
          '404': { description: 'Not found' },
        },
      },
    },
    '/api/link/tag/{tag}': {
      parameters: [
        {
          in: 'path',
          name: 'tag',
          required: true,
          schema: { type: 'string' },
          description: 'Player tag, with or without leading # (URL-encoded)',
        },
      ],
      get: {
        tags: ['Links'],
        summary: 'Public social links of a Clash Royale player tag',
        description: 'Public route: player_tag, twitter, twitch and linked_at only, no account id.',
        responses: {
          '200': { description: 'Public link info' },
          '400': { description: 'Invalid tag' },
          '404': { description: 'No link for this tag' },
        },
      },
    },

    // Clash Data (proxied without rewrite under /api/clash)
    '/api/clash/players/{playerTag}': {
      parameters: [
        {
          in: 'path',
          name: 'playerTag',
          required: true,
          schema: { type: 'string' },
          description: 'Player tag with or without leading #',
        },
      ],
      get: {
        tags: ['Clash'],
        summary: 'Get player profile',
        responses: { '200': { description: 'Player profile' } },
      },
    },
    '/api/clash/players/{playerTag}/battles': {
      parameters: [{ in: 'path', name: 'playerTag', required: true, schema: { type: 'string' } }],
      get: {
        tags: ['Clash'],
        summary: 'Get recent battles for a player',
        responses: { '200': { description: 'Battle log' } },
      },
    },
    '/api/clash/cards': {
      get: {
        tags: ['Clash'],
        summary: 'List all cards',
        responses: { '200': { description: 'Cards' } },
      },
    },
    '/api/clash/clans/{clanTag}': {
      parameters: [{ in: 'path', name: 'clanTag', required: true, schema: { type: 'string' } }],
      get: {
        tags: ['Clash'],
        summary: 'Get clan info',
        responses: { '200': { description: 'Clan info' } },
      },
    },
    '/api/clash/leaderboards': {
      get: {
        tags: ['Clash'],
        summary: 'List season leaderboards (id and name)',
        responses: { '200': { description: 'Leaderboards list' } },
      },
    },
    '/api/clash/leaderboard/{leaderboardId}': {
      parameters: [
        { in: 'path', name: 'leaderboardId', required: true, schema: { type: 'integer' } },
        {
          in: 'query',
          name: 'limit',
          required: false,
          schema: { type: 'integer', minimum: 1, maximum: 200, default: 20 },
        },
      ],
      get: {
        tags: ['Clash'],
        summary: 'Get player rankings of a season leaderboard',
        responses: {
          '200': { description: 'Leaderboard rankings' },
          '400': { description: 'Invalid leaderboard id' },
          '404': { description: 'Leaderboard not found' },
        },
      },
    },
    '/api/clash/locations/global/pathoflegend/players': {
      get: {
        tags: ['Clash'],
        summary: 'Get Path of Legend player rankings (global)',
        responses: { '200': { description: 'Path of Legend standings' } },
      },
    },

    // Meta Tracker (proxied without rewrite under /api/meta)
    '/api/meta/snapshot': {
      get: {
        tags: ['Meta'],
        summary: 'Get current meta snapshot',
        responses: { '200': { description: 'Snapshot of meta' } },
      },
    },
    '/api/meta/analyze/deck': {
      post: {
        tags: ['Meta'],
        summary: 'Analyse any deck against the collected meta',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  cards: {
                    type: 'array',
                    items: { type: 'string' },
                    minItems: 8,
                    maxItems: 8,
                    uniqueItems: true,
                    description: '8 different card names',
                  },
                },
                required: ['cards'],
              },
            },
          },
        },
        responses: {
          '200': {
            description: 'Deck analysis',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/DeckAnalysis' } },
            },
          },
          '400': { description: 'Not 8 different card names' },
        },
      },
    },
    '/api/meta/players/{playerTag}/analysis': {
      parameters: [
        {
          in: 'path',
          name: 'playerTag',
          required: true,
          schema: { type: 'string' },
          description: 'Player tag, with or without leading # (URL-encoded)',
        },
      ],
      get: {
        tags: ['Meta'],
        summary: 'Analyse the current deck of a player',
        description:
          'The current deck comes from clash-data-service. A card is only rated with at least `minSample` usages in the sample; the deck win rate is weighted by usage and compared with the meta win rate of the same sample (top players, hence above 50 %). A card at least 2 points below the meta gets up to 3 alternatives with the same elixir cost and a win rate at least 2 points higher.',
        responses: {
          '200': {
            description: 'Deck analysis',
            content: {
              'application/json': { schema: { $ref: '#/components/schemas/DeckAnalysis' } },
            },
          },
          '400': { description: 'Invalid player tag (InvalidPlayerTag)' },
          '404': {
            description: 'Unknown player (PlayerNotFound) or no current deck (DeckNotFound)',
          },
          '503': { description: 'clash-data-service unavailable' },
        },
      },
    },
    '/api/meta/players/{playerTag}/ingest': {
      parameters: [
        {
          in: 'path',
          name: 'playerTag',
          required: true,
          schema: { type: 'string' },
          description: 'Player tag, with or without leading # (URL-encoded)',
        },
      ],
      post: {
        tags: ['Meta'],
        summary: "Add the player's recent battles to the meta",
        description:
          'The meta-service fetches the battle log from clash-data-service itself: no route accepts battles sent by a client. Battles already stored are counted in `duplicates`; battles that cannot be read from the player side in `skipped`. Calling it again is harmless.',
        responses: {
          '200': {
            description: 'Ingestion report',
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  properties: {
                    playerTag: { type: 'string', example: '#2PP8VJ9Q' },
                    ingested: { type: 'integer' },
                    duplicates: { type: 'integer' },
                    invalid: { type: 'integer' },
                    skipped: { type: 'integer' },
                  },
                },
              },
            },
          },
          '400': { description: 'Invalid player tag (InvalidPlayerTag)' },
          '404': { description: 'Unknown player (PlayerNotFound)' },
          '503': { description: 'clash-data-service unavailable' },
        },
      },
    },

    // Public API (proxied without rewrite under /api/public)
    '/api/public': {
      get: {
        tags: ['Public'],
        summary: 'Public API root',
        responses: { '200': { description: 'OK' } },
      },
    },
    '/api/public/stats': {
      get: {
        tags: ['Public'],
        summary: 'Public stats',
        responses: { '200': { description: 'Stats' } },
      },
    },
    '/api/public/docs': {
      get: {
        tags: ['Public'],
        summary: 'Public API documentation info',
        responses: { '200': { description: 'Docs' } },
      },
    },

    // RoyaleAPI passthrough (documented as generic path)
    '/api/royaleapi/{path}': {
      parameters: [
        {
          in: 'path',
          name: 'path',
          required: true,
          schema: { type: 'string' },
          description: 'Arbitrary RoyaleAPI path, forwarded as-is',
        },
      ],
      get: {
        tags: ['RoyaleAPI'],
        summary: 'Proxy GET to https://royaleapi.com/{path}',
        responses: { '200': { description: 'Response from RoyaleAPI' } },
      },
    },
  },
  components: {
    securitySchemes: {
      bearerAuth: {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
      },
    },
    headers: {
      RequestId: {
        description:
          'Request identifier, also present in the body of an error and in the logs of every service.',
        schema: { type: 'string', example: '6f1c9e2a-3b7d-4c1e-9a2f-1d2e3f4a5b6c' },
      },
    },
    schemas: {
      DeckAnalysis: {
        type: 'object',
        properties: {
          playerTag: { type: 'string', description: 'GET /players/{playerTag}/analysis only' },
          deck: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                name: { type: 'string' },
                elixirCost: { type: 'integer', nullable: true },
                usage: { type: 'integer' },
                wins: { type: 'integer' },
                winRate: {
                  type: 'number',
                  nullable: true,
                  description: 'null without enough data',
                },
                enoughData: { type: 'boolean' },
              },
            },
          },
          summary: {
            type: 'object',
            properties: {
              deckWinRate: { type: 'number', nullable: true },
              metaWinRate: { type: 'number', nullable: true },
              averageElixir: { type: 'number', nullable: true },
              cardsWithEnoughData: { type: 'integer' },
              confidence: { type: 'string', enum: ['high', 'medium', 'low'] },
              totalBattles: { type: 'integer' },
              minSample: { type: 'integer', example: 50 },
            },
          },
          suggestions: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                replace: { type: 'string' },
                winRate: { type: 'number' },
                reason: { type: 'string' },
                alternatives: {
                  type: 'array',
                  items: {
                    type: 'object',
                    properties: {
                      name: { type: 'string' },
                      elixirCost: { type: 'integer' },
                      winRate: { type: 'number' },
                      usage: { type: 'integer' },
                    },
                  },
                },
              },
            },
          },
        },
      },
      ApiError: {
        type: 'object',
        description:
          'Error contract shared by every service (docs/ERROR-HANDLING.md). In production a 5xx only carries a generic message and the requestId.',
        required: ['error', 'message', 'statusCode', 'requestId'],
        properties: {
          error: {
            type: 'string',
            description: 'Stable machine-readable code, in PascalCase.',
            example: 'PlayerNotFound',
          },
          message: {
            type: 'string',
            description: 'Message the user can read.',
            example: 'Aucun joueur ne correspond à ce tag.',
          },
          statusCode: { type: 'integer', example: 404 },
          requestId: {
            type: 'string',
            description: 'Same value as the x-request-id header.',
            example: '6f1c9e2a-3b7d-4c1e-9a2f-1d2e3f4a5b6c',
          },
          details: {
            description: 'Development only, or the invalid fields of a 400.',
          },
          stack: { type: 'string', description: 'Development only.' },
        },
      },
    },
    responses: {
      Error: {
        description:
          'Error: 400 ValidationError, 401 AuthenticationError, 403 Forbidden, 404 NotFound, 409 ConflictError, 429 RateLimited, 500 InternalServerError, 502/503/504 BadGateway, ServiceUnavailable, GatewayTimeout.',
        headers: { 'x-request-id': { $ref: '#/components/headers/RequestId' } },
        content: { 'application/json': { schema: { $ref: '#/components/schemas/ApiError' } } },
      },
    },
  },
};

// Every operation can fail with the error contract: document it once for all of them.
for (const pathItem of Object.values(openapiSpec.paths) as Record<string, any>[]) {
  for (const operation of Object.values(pathItem)) {
    if (operation && typeof operation === 'object' && 'responses' in operation) {
      operation.responses.default ??= { $ref: '#/components/responses/Error' };
    }
  }
}

export default openapiSpec;
