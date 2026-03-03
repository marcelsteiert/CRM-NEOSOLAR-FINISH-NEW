import 'dotenv/config';
import { createApp } from './app.js';

const app = createApp();
const PORT = Number(process.env.PORT) || 3001;

// Audit logging
app.use((req, _res, next) => {
  const timestamp = new Date().toISOString();
  console.log(`[AUDIT] ${timestamp} | ${req.method} ${req.path}`);
  next();
});

app.listen(PORT, () => {
  console.log(`[SERVER] NeoSolar CRM Backend laeuft auf Port ${PORT}`);
});

export default app;
