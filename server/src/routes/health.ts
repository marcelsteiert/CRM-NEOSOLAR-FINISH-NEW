import { Router } from 'express';

const healthRouter = Router();

/**
 * GET /api/v1/health
 * Returns the current health status of the server.
 */
healthRouter.get('/', (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
  });
});

export default healthRouter;
