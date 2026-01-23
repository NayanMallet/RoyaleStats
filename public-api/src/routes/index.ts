import { Router } from 'express';

const router = Router();

router.get('/', (req, res) => {
  res.json({
    message: 'Welcome to RoyaleStats Public API',
    version: '1.0.0',
    endpoints: {
      stats: '/stats',
      docs: '/docs',
      health: '/health',
    },
  });
});

router.get('/stats', (req, res) => {
  res.json({
    totalUsers: 0,
    totalBattlesAnalyzed: 0,
    metaLastUpdated: new Date().toISOString(),
  });
});

router.get('/docs', (req, res) => {
  res.json({
    apiDocumentation: 'RoyaleStats API Documentation',
    version: '1.0.0',
    services: {
      users: 'User authentication and management',
      items: 'Item management',
      clash: 'Clash Royale data integration',
      link: 'Account linking between users and Clash Royale players',
      meta: 'Meta analysis and deck recommendations',
    },
    gateway: 'All services are accessible via the API Gateway at /api/*',
  });
});

export default router;
