import { Router } from 'express';
import { supabase } from '../lib/supabase.js';

const healthRouter = Router();

/**
 * GET /api/v1/health
 * Returns the current health status of the server.
 */
healthRouter.get('/', async (_req, res) => {
  let supabaseStatus = 'disconnected';
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    supabaseStatus = error ? 'error' : 'connected';
  } catch {
    supabaseStatus = 'error';
  }

  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '0.1.0',
    supabase: supabaseStatus,
  });
});

export default healthRouter;
