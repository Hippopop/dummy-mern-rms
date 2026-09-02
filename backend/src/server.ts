import { createApp } from './app.js';
import { connectDatabase, registerShutdownHooks } from './config/database.js';
import { env } from './config/env.js';

async function bootstrap(): Promise<void> {
  await connectDatabase();
  createApp().listen(env.PORT, () => {
    console.log(`API listening on http://localhost:${env.PORT}/api/v1  [${env.NODE_ENV}]`);
  });
  registerShutdownHooks();
}

bootstrap().catch((err) => {
  console.error('Failed to start:', err instanceof Error ? err.message : err);
  process.exit(1);
});
