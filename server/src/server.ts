import { createApp } from './app';
import { connectDatabase } from './config/db';
import { env } from './config/env';
import { logger } from './utils/logger';

async function main() {
  await connectDatabase();

  const app = createApp();

  const server = app.listen(env.port, () => {
    logger.info(`VaultPay API listening on port ${env.port}`, { env: env.nodeEnv });
  });

  const shutdown = (signal: string) => {
    logger.info(`Received ${signal}, shutting down gracefully`);
    server.close(() => {
      logger.info('HTTP server closed');
      process.exit(0);
    });
    // Force-exit if graceful shutdown hangs.
    setTimeout(() => process.exit(1), 10_000).unref();
  };

  process.on('SIGTERM', () => shutdown('SIGTERM'));
  process.on('SIGINT', () => shutdown('SIGINT'));

  process.on('unhandledRejection', (reason) => {
    logger.error('Unhandled promise rejection', { reason: String(reason) });
  });
  process.on('uncaughtException', (err) => {
    logger.error('Uncaught exception — shutting down', { error: err.message });
    process.exit(1);
  });
}

main().catch((err) => {
  logger.error('Fatal error during startup', { error: err instanceof Error ? err.message : String(err) });
  process.exit(1);
});
