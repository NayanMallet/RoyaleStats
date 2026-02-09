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
    '/api/users': {
      get: {
        tags: ['Users'],
        summary: 'List users',
        responses: { '200': { description: 'List of users' } },
      },
    },
    '/api/users/register': {
      post: {
        tags: ['Users'],
        summary: 'Register',
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
        summary: 'Create user to Clash Royale player link',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'object',
                properties: {
                  userId: { type: 'integer' },
                  playerTag: { type: 'string', example: '#ABC123' },
                },
                required: ['userId', 'playerTag'],
              },
            },
          },
        },
        responses: {
          '201': { description: 'Link created' },
          '400': { description: 'Validation error' },
          '404': { description: 'Player not found' },
          '409': { description: 'Conflict (already linked)' },
        },
      },
    },
    '/api/link/{userId}': {
      parameters: [
        { in: 'path', name: 'userId', required: true, schema: { type: 'integer' } },
      ],
      get: {
        tags: ['Links'],
        summary: 'Get linked player by user id',
        responses: {
          '200': { description: 'Link info' },
          '404': { description: 'Not found' },
        },
      },
      delete: {
        tags: ['Links'],
        summary: 'Delete link by user id',
        responses: {
          '204': { description: 'Deleted' },
          '404': { description: 'Not found' },
        },
      },
    },

    // Clash Data (proxied without rewrite under /api/clash)
    '/api/clash/players/{playerTag}': {
      parameters: [
        { in: 'path', name: 'playerTag', required: true, schema: { type: 'string' }, description: 'Player tag with or without leading #' },
      ],
      get: {
        tags: ['Clash'],
        summary: 'Get player profile',
        responses: { '200': { description: 'Player profile' } },
      },
    },
    '/api/clash/players/{playerTag}/battles': {
      parameters: [
        { in: 'path', name: 'playerTag', required: true, schema: { type: 'string' } },
      ],
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
      parameters: [
        { in: 'path', name: 'clanTag', required: true, schema: { type: 'string' } },
      ],
      get: {
        tags: ['Clash'],
        summary: 'Get clan info',
        responses: { '200': { description: 'Clan info' } },
      },
    },
    '/api/clash/leaderboards': {
      get: {
        tags: ['Clash'],
        summary: 'Get leaderboards',
        responses: { '200': { description: 'Leaderboards' } },
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
        summary: 'Analyze a deck of cards',
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
                    description: 'Array of 8 card identifiers',
                  },
                },
                required: ['cards'],
              },
            },
          },
        },
        responses: { '200': { description: 'Deck analysis' } },
      },
    },
    '/api/meta/recommend/{playerTag}': {
      parameters: [
        { in: 'path', name: 'playerTag', required: true, schema: { type: 'string' } },
      ],
      get: {
        tags: ['Meta'],
        summary: 'Get recommendations for a player',
        responses: { '200': { description: 'Recommendations' } },
      },
    },
    '/api/meta/ingest/battles': {
      post: {
        tags: ['Meta'],
        summary: 'Ingest battle logs (internal)',
        requestBody: {
          required: true,
          content: {
            'application/json': {
              schema: {
                type: 'array',
                items: { type: 'object', additionalProperties: true },
              },
            },
          },
        },
        responses: { '202': { description: 'Accepted for processing' }, '200': { description: 'OK' } },
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
        { in: 'path', name: 'path', required: true, schema: { type: 'string' }, description: 'Arbitrary RoyaleAPI path, forwarded as-is' },
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
  },
};

export default openapiSpec;
