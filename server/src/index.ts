import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import healthRouter from './routes/health.js';
import leadsRouter from './routes/leads.js';
import pipelinesRouter from './routes/pipelines.js';
import tagsRouter from './routes/tags.js';
import { errorHandler } from './middleware/errorHandler.js';

const app = express();
const PORT = Number(process.env.PORT) || 3001;

// ---------------------------------------------------------------------------
// CORS
// ---------------------------------------------------------------------------
app.use(
  cors({
    origin: 'http://localhost:5173',
    credentials: true,
  }),
);

// ---------------------------------------------------------------------------
// Body parsing (Express v5 built-in)
// ---------------------------------------------------------------------------
app.use(express.json());

// ---------------------------------------------------------------------------
// Audit logging middleware
// ---------------------------------------------------------------------------
app.use((req, _res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[AUDIT] ${timestamp} | ${req.method} ${req.path}`);
  next();
});

// ---------------------------------------------------------------------------
// Routes
// ---------------------------------------------------------------------------
app.use('/api/v1/health', healthRouter);
app.use('/api/v1/leads', leadsRouter);
app.use('/api/v1/pipelines', pipelinesRouter);
app.use('/api/v1/tags', tagsRouter);

// ---------------------------------------------------------------------------
// Centralized error handling (must be registered last)
// ---------------------------------------------------------------------------
app.use(errorHandler);

// ---------------------------------------------------------------------------
// Start server
// ---------------------------------------------------------------------------
app.listen(PORT, () => {
  console.log(`[SERVER] NeoSolar CRM Backend laeuft auf Port ${PORT}`);
});

export default app;
